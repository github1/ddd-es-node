import {
  DecoratedEntityRepository,
  DecoratedEventBus,
  EntityEvent,
  EventsByStream,
  EntityEventUser,
  EntityRepository,
  EventBus,
  EventDispatcher,
  eventDispatcherWithModifiers,
  EventModifier,
  EventModifiers,
  EventStore,
  EventStoreSeeded,
  EventStoreWriter
} from '../core';
import {LocalEventBus} from './local-event-bus';
import * as eventstore from 'eventstore';
import {resolveInstanceFromJson} from './type-deserializer';
import * as fs from 'fs';
import * as path from 'path';

module EventStoreLib {
  export type EventStoreType = {
    init : Function;
    getEventStream : Function;
    getEvents : Function;
  };
  export type EventStoreTypeFactory = (options? : Object) => EventStoreType;
  export type Stream = {
    addEvent : Function;
    addEvents : Function;
    commit : Function;
    events : Event[];
    eventsToDispatch : Event[];
  };
  export type EventPayload = {
    uuid : string;
    streamId : string;
    name : string;
  };
  export type Event = {
    name : string;
    streamId : string;
    aggregateId : string;
    payload : EventPayload;
  };
}

const ES_CONFIG_PATH : string = path.resolve(process.env.ES_CONFIG || './es-config.js');
//  tslint:disable-next-line:non-literal-require non-literal-fs-path no-var-requires no-unsafe-any
const esConfig : {} = fs.existsSync(ES_CONFIG_PATH) ? require(ES_CONFIG_PATH) : {};
let getEsRes : Function;
// tslint:disable:promise-must-complete
const getEs : Promise<EventStoreLib.EventStoreType> = new Promise<EventStoreLib.EventStoreType>((resolve : Function) => {
  getEsRes = resolve;
});
const es : EventStoreLib.EventStoreType = ((<EventStoreLib.EventStoreTypeFactory>eventstore)(esConfig));
es.init((err : Error) => {
  if (err) {
    // fatal
    throw err;
  } else {
    getEsRes(es);
  }
});

const hydrateEventStream = (events : EventStoreLib.Event[]): Promise<EventStoreLib.EventPayload[]> => {
  return Promise.all((events || [])
    .map((event : EventStoreLib.Event) => {
      return new Promise<EventStoreLib.EventPayload>((resolve : Function, reject : (err : Error) => void) => {
        if (!event.payload)
        console.log(event, event.payload);
        event.payload.streamId = event.streamId || event.aggregateId;
        if (esConfig.hasOwnProperty('type')) {
          // ensure types are restored after deserialization
          (<Promise<EventStoreLib.EventPayload>>resolveInstanceFromJson(event.payload))
            .then((resolved : EventStoreLib.EventPayload) => {
              resolve(resolved);
            })
            .catch(reject);
        } else {
          resolve({
            uuid: event.payload.uuid,
            name: event.payload.name,
            streamId: event.streamId || event.aggregateId,
            payload: event.payload
          });
        }
      });
    }));
};

interface EsContextClosed {
  eventBus : EventBus;
  eventStore : EventStore;
  eventDispatcher : EventDispatcher;
  entityRepository : EntityRepository;
}

class EsContext implements EsContextClosed {
  public readonly eventBus : EventBus;
  public readonly eventDispatcher : EventDispatcher;
  public readonly entityRepository : EntityRepository;
  constructor(public readonly eventStore : EventStore,
              private readonly eventStoreWriter? : EventStoreWriter,
              private readonly modifiers : EventModifiers = {},
              seededEvents : EventsByStream = {}) {
    this.eventStore = Object.keys(seededEvents).length === 0 ? eventStore : new EventStoreSeeded(eventStore, seededEvents);
    this.eventStoreWriter = this.eventStoreWriter || this.eventStore as any as EventStoreWriter;
    this.eventBus = new DecoratedEventBus(new LocalEventBus(this.eventStore));
    this.eventDispatcher = eventDispatcherWithModifiers(
      createEventDispatcher(this.eventStoreWriter, this.eventBus), this.modifiers);
    this.entityRepository = new DecoratedEntityRepository(this.eventDispatcher, this.eventStore);
  }

  public withModifier(id: string, modifier: EventModifier): EsContext {
    return new EsContext(this.eventStore, this.eventStoreWriter, {
      ...(this.modifiers),
      [id]: modifier
    });
  }

  public withUser(user : EntityEventUser) : EsContext {
    return this
      .withModifier('user', event => event.user = user)
  }

  public atTime(timestamp : number) : EsContext {
    return this
      .withModifier('timestamp', event => event.timestamp = timestamp);
  }

  public withEvents(eventsByStream: EventsByStream): EsContext {
    return new EsContext(this.eventStore, this.eventStoreWriter, {}, eventsByStream);
  }

}

class EventStoreLibEventStore implements EventStore, EventStoreWriter {
  public replay(id : string, handler : (event : EntityEvent, isReplaying? : boolean) => void) : Promise<void> {
    return getEs
      .then((es : EventStoreLib.EventStoreType) => {
        return new Promise((resolve : () => void, reject : (error : Error) => void) => {
          es.getEventStream(id, (err : Error, stream : EventStoreLib.Stream) => {
            if (err) {
              reject(err);
            } else {
              this.doReplay(stream.events, handler)
                .then(() => resolve())
                .catch(reject);
            }
          });
        });
      })
      .then(() => {
        // void
      });
  }

  public replayAll(handler : (event : EntityEvent, isReplaying? : boolean) => void) : Promise<void> {
    return getEs
      .then((es : EventStoreLib.EventStoreType) => {
        return new Promise((resolve : () => void, reject : (err : Error) => void) => {
          es.getEvents(0, (err : Error, events : EventStoreLib.Event[]) => {
            if (err) {
              reject(err);
            } else {
              this.doReplay(events, handler)
                .then(() => resolve())
                .catch(reject);
            }
          });
        });
      })
      .then(() => {
        // void
      });
  }

  private doReplay(events : EventStoreLib.Event[], handler : (event : EntityEvent, isReplaying? : boolean) => void) : Promise<void> {
    return hydrateEventStream(events)
      .then((results : EventStoreLib.EventPayload[]) => {
        for (let i = 0, il = results.length; i < il; i++) {
          const entityEvent: EntityEvent = results[i] as EntityEvent;
          handler(entityEvent, true);
        }
      });
  }

  public write(...events : EntityEvent[]) : Promise<EntityEvent[]> {
    const groupedByStreamId = events.reduce((groupedByStreamId, event) => {
      groupedByStreamId[event.streamId] = groupedByStreamId[event.streamId] || [];
      groupedByStreamId[event.streamId].push(event);
      return groupedByStreamId;
    }, {});
    return Promise.all(Object.keys(groupedByStreamId)
      .map((streamId) => {
        const events = groupedByStreamId[streamId];
        return new Promise((resolve, reject) => {
          es.getEventStream(streamId, (err : Error, stream : EventStoreLib.Stream) => {
            if (err) {
              resolve();
            } else {
              stream.addEvents(events);
              stream.commit((err : Error, stream : EventStoreLib.Stream) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(stream.eventsToDispatch);
                }
              });
            }
          });
        });
      }))
      .then((events: EntityEvent[][]) => {
        return [].concat(...events);
      });
  }
}

function createEventDispatcher(eventStoreWriter: EventStoreWriter, eventBus: EventBus): EventDispatcher {
  return async (streamId : string, ...events : EntityEvent[]) : Promise<void> => {
    const written: EventStoreLib.Event[] = (await eventStoreWriter.write(...events.map(event => {
      event.streamId = streamId;
      return event;
    }))) as any;
    const hydratedEvents = await hydrateEventStream(written);
    for (const hydratedEvent of hydratedEvents) {
      eventBus.emit(hydratedEvent);
    }
  };
}

export const defaultEsContext : EsContext = new EsContext(
  new EventStoreLibEventStore());
