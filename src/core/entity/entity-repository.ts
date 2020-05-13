import {Entity} from './entity';
import {
  EntityEvent,
  EventDispatcher,
  EventStore
} from '../event';

// tslint:disable
export class ChainInterceptorPromise<T> extends Promise<T> {
  private readonly promise : Promise<T>;
  private readonly afterChain : Function;

  constructor(promise : Promise<T>, afterChain? : Function) {
    super((resolve : Function) => {
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
    return <ChainInterceptorPromise<T>>this.promise.catch(a);
  }
}

// tslint:enable

export interface EntityRepository {
  load<T>(construct : { new(...arg : any[]) }, id : string, ...additional : any[]) : Promise<T>;
}

export const loadWithInstance = <T>(
  id : string,
  entity : Entity,
  eventDispatcher : EventDispatcher,
  eventStore : EventStore) : Promise<T> => {
  const eventsToDispatch : EntityEvent[] = [];
  return new ChainInterceptorPromise(new Promise((resolve : Function, reject : (error : Error) => void) => {
    const streamId : string = id;
    entity.init((event : EntityEvent) : void => {
      event.streamId = streamId;
      eventsToDispatch.push(event);
      entity.apply(event);
    });
    eventStore.replay(
      id,
      (event : EntityEvent) : void => {
        entity.apply(event);
      })
      .then(() => {
        resolve(entity);
      })
      .catch((err : Error) => {
        reject(err);
      });
  }), () => {
    if (eventsToDispatch.length === 0) {
      return Promise.resolve();
    } else {
      const flushTo : EntityEvent[] = [];
      while (eventsToDispatch.length > 0) {
        flushTo.push(eventsToDispatch.shift());
      }
      return eventDispatcher(id, ...flushTo);
    }
  });
};

export class BaseEntityRepository implements EntityRepository {

  constructor(private readonly eventDispatcher : EventDispatcher,
              private readonly eventStore : EventStore) {
  }

  public load<T>(construct : { new(...arg : any[]) }, id : string, ...additional : any[]) : Promise<T> {
    return loadWithInstance(
      id,
      <Entity>new construct(id, ...additional),
      this.eventDispatcher,
      this.eventStore);
  }

}
