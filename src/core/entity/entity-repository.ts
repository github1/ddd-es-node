import { Entity } from './entity';
import {
  EntityEvent,
  EventDispatcher,
  EventStore
} from './../event';

/* tslint:disable */
export class ChainInterceptorPromise<T> extends Promise<T> {
  private promise : Promise<T>;
  private afterChain : Function;

  constructor(promise : Promise<T>, afterChain? : Function) {
    super((resolve : Function)=> {
      resolve();
    });
    this.promise = promise;
    this.afterChain = afterChain;
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

export interface EntityRepository {
  load(construct : {new(arg : string)}, id : string) : Promise<Entity>;
}

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
