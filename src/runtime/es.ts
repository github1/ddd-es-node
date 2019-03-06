import {
  BaseEntityRepository,
  EntityEvent,
  EntityRepository,
  EventBus,
  EventStore
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

const hydrateEventStream = (events : EventStoreLib.Event[]) => {
  return Promise.all((events || []).map((event : EventStoreLib.Event) => {
    return new Promise((resolve : Function) => {
      event.payload.streamId = event.streamId || event.aggregateId;
      if (esConfig.hasOwnProperty('type')) {
        // ensure types are restored after deserialization
        (<Promise<EventStoreLib.EventPayload>>resolveInstanceFromJson(event.payload))
          .then((resolved : EventStoreLib.EventPayload) => {
            resolve({
              name: event.payload.name,
              streamId: event.streamId || event.aggregateId,
              payload: resolved
            });
          })
          .catch((error : Error) => {
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
    getEs
      .then((es : EventStoreLib.EventStoreType) => {
        es.getEventStream(id, (err : Error, stream : EventStoreLib.Stream) => {
          if (err) {
            console.log(err);
          } else {
            hydrateEventStream(stream.events)
              .then((results : EventStoreLib.Event[]) => {
                results.forEach((event : EventStoreLib.Event) => {
                  handler(<EntityEvent>event.payload, true);
                });
                if (done) {
                  done();
                }
              })
              .catch((err : Error) => {
                throw err;
              });
          }
        });
      })
      .catch((err : Error) => {
        throw err;
      });
  }

  public replayAll(handler : (event : EntityEvent, isReplaying? : boolean) => void, done? : () => void) : void {
    // tslint:disable:no-floating-promises
    getEs
      .then((es : EventStoreLib.EventStoreType) => {
        es.getEvents(0, (err : Error, events : EventStoreLib.Event[]) => {
          if (err) {
            throw err;
          } else {
            hydrateEventStream(events)
              .then((results : EventStoreLib.Event[]) => {
                results.forEach((event : EventStoreLib.Event) => {
                  handler(<EntityEvent>event.payload, true);
                });
                if (done) {
                  done();
                }
              })
              .catch((err : Error) => {
                throw err;
              });
          }
        });
      })
      .catch((err : Error) => {
        throw err;
      });
  }
}

export const eventStore : EventStore = new EventStoreLibEventStore();

export const eventBus : EventBus = new LocalEventBus(eventStore);

function eventDispatcher(streamId : string, events : EntityEvent[]) : Promise<void> {
  return new Promise<void>((resolve : Function) => {
    getEs.then((es : EventStoreLib.EventStoreType) => {
      es.getEventStream(streamId, (err : Error, stream : EventStoreLib.Stream) => {
        if (err) {
          console.log(err);
          resolve();
        } else {
          stream.addEvents(events);
          stream.commit((err : Error, stream : EventStoreLib.Stream) => {
            if (err) {
              console.log(err);
              resolve();
            } else {
              hydrateEventStream(stream.eventsToDispatch)
                .then((events : EventStoreLib.Event[]) => {
                  events.forEach((event : EventStoreLib.Event) => {
                    eventBus.emit(event.payload);
                  });
                  resolve();
                })
                .catch((err : Error) => {
                  console.error(err);
                  resolve();
                });
            }
          });
        }
      });
    });
  });
}

export const entityRepository : EntityRepository = new BaseEntityRepository(eventDispatcher, eventStore);
