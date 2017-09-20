import { v4 } from 'uuid';
import { Clock } from './clock';

export class EntityEvent {
  public streamId : string;
  public typeNameMetaData: string;
  public name : string;
  public timestamp : number;

  constructor() {
    this.typeNameMetaData = this.constructor.name;
    this.name = this.typeNameMetaData;
    this.timestamp = Clock.now();
  }
}

export type EventDispatcher = (streamId : string, events : EntityEvent[]) => Promise<void>;

export type VoidEventDispatcher = (streamId : string, event : EntityEvent) => void;

export type EventHandler = (entity : Entity, event : EntityEvent) => void;

export interface EventStore {
  replay(id : string, handler : (event : EntityEvent, isReplaying? : boolean) => void, done? : () => void) : void;
  replayAll(handler : (event : EntityEvent, isReplaying? : boolean) => void, done? : () => void) : void;
}

export interface EventBusSubscription {
  unsubscribe() : void;
}

export interface EventBus {
  subscribe(listener : (event : EntityEvent, isReplaying? : boolean) => void,
            options? : { [key:string]: string | boolean }) : EventBusSubscription;
  emit(event : {}) : void;
}

export interface EntityRepository {
  load(construct : {new(arg : string)}, id : string) : Promise<Entity>;
}

/* tslint:disable */
export class ChainInterceptorPromise<T> extends Promise<T> {
  private promise : Promise<T>;
  private afterChain : Function;

  constructor(promise : Promise<T>, afterChain? : Function) {
    super((resolve : Function)=> {
      resolve();
    });
    this.promise = promise;
    this.afterChain = afterChain || function () {
      };
  }

  public then(a : any) : ChainInterceptorPromise<T> {
    return new ChainInterceptorPromise<T>(this.promise.then(a).then((a) => {
      return this.afterChain(a).then(() => Promise.resolve(a));
    }), this.afterChain);
  }

  public catch(a : any) : ChainInterceptorPromise<T> {
    return <ChainInterceptorPromise<T>> this.promise.catch(a);
  }
}
/* tslint:enable */

export class BaseEntityRepository implements EntityRepository {

  private eventDispatcher : EventDispatcher;
  private eventStore : EventStore;

  constructor(eventDispatcher : EventDispatcher, eventStore : EventStore) {
    this.eventDispatcher = eventDispatcher;
    this.eventStore = eventStore;
  }

  public load(construct : {new(arg : string)}, id : string) : Promise<Entity> {
    const eventsToDispatch : EntityEvent[] = [];
    return new ChainInterceptorPromise(new Promise((resolve : Function) => {
      const entity : Entity = (<Entity> new construct(id));
      entity.init((streamId : string, event : EntityEvent) : void => {
        event.streamId = streamId;
        eventsToDispatch.push(event);
        entity.apply(event);
      });
      this.eventStore.replay(
        id,
        (event : EntityEvent) : void => {
          entity.apply(event);
        },
        () : void => {
          resolve(entity);
        });
    }), () => {
      if (eventsToDispatch.length === 0) {
        return Promise.resolve();
      } else {
        const flushTo : EntityEvent[] = [];
        while (eventsToDispatch.length > 0) {
          flushTo.push(eventsToDispatch.shift());
        }
        return this.eventDispatcher(id, flushTo);
      }
    });
  }

}

export class EventProcessor {
  private handler : EventHandler;

  public apply(newHandler : EventHandler) : EventProcessor {
    const parentHandler : EventHandler = this.handler;
    let handlerToSet : EventHandler = newHandler;
    if (parentHandler) {
      handlerToSet = (entity : Entity, event : EntityEvent) : void => {
        newHandler(entity, event);
        parentHandler(entity, event);
      };
    }
    this.handler = handlerToSet;
    return this;
  }

  public accept(entity : Entity, event : EntityEvent) : void {
    this.handler(entity, event);
  }
}

export class Entity {
  protected id : string;
  protected config : EventProcessor;
  protected dispatch : VoidEventDispatcher;

  constructor(id : string,
              config : EventProcessor) {
    this.id = id;
    this.config = config;
  }

  public static CONFIG(newHandler : EventHandler) : EventProcessor {
    return new EventProcessor().apply(newHandler);
  }

  public init(dispatch : VoidEventDispatcher) : void {
    this.dispatch = dispatch;
  }

  public apply(event : EntityEvent) : void {
    this.config.accept(this, event);
  }

}

let incrementalUUID : boolean = false;
let uidCount : number = 0;

export const useIncrementalUUID = (value : boolean) => {
  incrementalUUID = value;
};

export const uuid = () : string => {
  return incrementalUUID ? `${uidCount++}` : v4();
};
