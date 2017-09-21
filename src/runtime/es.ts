import {
  BaseEntityRepository,
  EntityRepository,
  EntityEvent,
  EventStore,
  EventBus,
  EventBusSubscription
} from '../core/entity';
import * as eventstore from 'eventstore';
import * as events from 'events';
import { resolveInstanceFromJson } from './type_deserializer';

module EventStoreLib {
  export type EventStoreType = {
    init: Function,
    getEventStream : Function,
    getEvents : Function
  };
  export type EventStoreTypeFactory = (options?: Object) => EventStoreType;
  export type Stream = { addEvent : Function, addEvents : Function, commit : Function, events : Event[], eventsToDispatch : Event[] };
  export type EventPayload = { streamId : string, name : string };
  export type Event = { name : string, streamId : string, aggregateId: string, payload : EventPayload };
}

class LocalEventBusSubscription implements EventBusSubscription {
  private emitter : events.EventEmitter;
  private listener : (event : EntityEvent) => void;
  constructor(emitter : events.EventEmitter, listener : (event : EntityEvent) => void) {
    this.emitter = emitter;
    this.listener = listener;
  }
  public unsubscribe() : void {
    this.emitter.removeListener('event', this.listener);
  }
}

export class LocalEventBus implements EventBus {

  private eventStore : EventStore;
  private emitter : events.EventEmitter = new events.EventEmitter();

  constructor(eventStore : EventStore) {
    this.eventStore = eventStore;
  }

  public subscribe(listener : (event : EntityEvent, isReplaying? : boolean) => void,
                   options? : { [key:string]: string | boolean }) : EventBusSubscription {
    if(options && options['replay']) {
      this.eventStore.replayAll(listener);
    }
    const emitterListener : (event : EntityEvent, isReplaying? : boolean) => void = (event : EntityEvent) : void => {
      listener(event, false);
    };
    this.emitter.on('event', emitterListener);
    return new LocalEventBusSubscription(this.emitter, emitterListener);
  }

  public emit(event : EntityEvent) : void {
    this.emitter.emit('event', event);
  }
}

const USE_DYNAMO_DB : boolean = !(/false/i.test((process.env.USE_DYNAMO_DB || 'false')));

const esCongig : Object = USE_DYNAMO_DB ? {
  type:'dynamodb',
  useUndispatchedEventsTable: false
} : {};
const es : EventStoreLib.EventStoreType = ((<EventStoreLib.EventStoreTypeFactory>eventstore)(esCongig));
es.init();

const hydrateEventStream = (events : EventStoreLib.Event[]) => {
  return Promise.all((events||[]).map((event : EventStoreLib.Event) => {
    return new Promise((resolve : Function) => {
      event.payload.streamId = event.streamId || event.aggregateId;
      if(USE_DYNAMO_DB) {
        // ensure types are restored after deserialization
        (<Promise<EventStoreLib.EventPayload>> resolveInstanceFromJson(event.payload))
          .then((resolved : EventStoreLib.EventPayload) => {
            resolve({
              name: event.payload.name,
              streamId: event.streamId || event.aggregateId,
              payload: resolved
            });
          }).catch((error : Error) => {
          console.error(error);
        });
      } else {
        resolve({
          name: event.payload.name,
          streamId: event.streamId || event.aggregateId,
          payload: event.payload
        });
      }
    });
  }));
};

export class EventStoreLibEventStore implements EventStore {
  public replay(id : string, handler : (event : EntityEvent, isReplaying? : boolean) => void, done? : () => void) : void {
    es.getEventStream(id, (err : Error, stream : EventStoreLib.Stream) => {
      if (err) {
        console.log(err);
      } else {
        hydrateEventStream(stream.events).then((results : EventStoreLib.Event[]) => {
          results.forEach((event : EventStoreLib.Event) => {
            handler(<EntityEvent> event.payload, true);
          });
          if (done) {
            done();
          }
        }).catch((err : Error) => {
          console.error(err);
        });
      }
    });
  }

  public replayAll(handler : (event : EntityEvent, isReplaying? : boolean) => void, done? : () => void) : void {
    es.getEvents(0, (err : Error, events : EventStoreLib.Event[]) => {
      if (err) {
        console.log(err);
      } else {
        hydrateEventStream(events).then((results : EventStoreLib.Event[]) => {
          results.forEach((event : EventStoreLib.Event) => {
            handler(<EntityEvent> event.payload, true);
          });
          if(done) {
            done();
          }
        }).catch((err : Error) => {
          console.error(err);
        });
      }
    });
  }
}

export const eventStore : EventStore = new EventStoreLibEventStore();

export const eventBus : EventBus = new LocalEventBus(eventStore);

function eventDispatcher(streamId : string, events : EntityEvent[]) : Promise<void> {
  return new Promise<void>((resolve : Function) => {
    es.getEventStream(streamId, (err : Error, stream : EventStoreLib.Stream) => {
      if (err) {
        console.log(err);
        resolve();
      } else {
        stream.addEvents(events);
        stream.commit((err : Error, stream : EventStoreLib.Stream) => {
          if(err) {
            console.log(err);
            resolve();
          } else {
            hydrateEventStream(stream.eventsToDispatch).then((events : EventStoreLib.Event[]) => {
              events.forEach((event : EventStoreLib.Event) => {
                eventBus.emit(event.payload);
              });
              resolve();
            }).catch((err : Error) => {
              console.error(err);
              resolve();
            });
          }
        });
      }
    });
  });
}

export const entityRepository : EntityRepository = new BaseEntityRepository(eventDispatcher, eventStore);
