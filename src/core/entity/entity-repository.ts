import {Entity} from './entity';
import {
  EntityEvent,
  EventDispatcher,
  EventStore
} from '../event';
import {Modifiers} from '../';

// tslint:disable
export class ChainInterceptorPromise<T> extends Promise<T> {

  constructor(private readonly promise : Promise<T>,
              private readonly afterChain? : Function) {
    super((resolve : Function) => {
      resolve();
    });
    this.promise = promise;
    this.afterChain = afterChain;
  }

  // @ts-ignore
  public then(a : any) : ChainInterceptorPromise<T> {
    return new ChainInterceptorPromise<T>(this.promise.then(a).then((a) => {
      return this.afterChain(a).then(() => {
        return a;
      });
    }), this.afterChain);
  }

  // @ts-ignore
  public catch(a : any) : ChainInterceptorPromise<T> {
    return <ChainInterceptorPromise<T>>this.promise.catch(a);
  }
}

// tslint:enable

export interface EntityRepository {
  load<T>(construct : new(...arg : any[]) => T, id : string, ...additional : any[]) : Promise<T>;
}

function processResult(result: any, eventsToDispatch: EntityEvent[]) {
  const asArray = result ? (Array.isArray(result) ? result : [result]) : [];
  for (const item of asArray) {
    if (item instanceof EntityEvent || EntityEvent.IS_LIKE_EVENT(item)) {
      eventsToDispatch.push(item as EntityEvent);
    }
  }
  return result;
}

export const loadWithInstance = <T>(
  id : string,
  entity : Entity,
  eventDispatcher : EventDispatcher,
  eventStore : EventStore) : Promise<T> => {
  const eventsToDispatch : EntityEvent[] = [];
  let chainComplete = false;
  return new ChainInterceptorPromise(new Promise((resolve : Function, reject : (error : Error) => void) => {
    const streamId : string = id;
    entity.init((event : EntityEvent) : void => {
      event.streamId = streamId;
      entity.apply(event);
      if (chainComplete) {
        eventDispatcher(id, event)
          .catch((err : Error) => {
            throw err;
          });
      } else {
        eventsToDispatch.push(event);
      }
    });
    eventStore.replay(
      id,
      (event : EntityEvent) : void => {
        entity.apply(event);
      })
      .then(() => {
        const handler = {
          // tslint:disable-next-line:no-reserved-keywords
          get(target: any, propKey: string) {
            const origMethod = target[propKey];
            if (!/^(dispatch|get.*)$/i.test(propKey) && typeof origMethod === 'function') {
              return function (...args: any[]) {
                // tslint:disable-next-line:no-invalid-this
                const result = origMethod.apply(this, args);
                if (result && typeof result.then === 'function') {
                  return result.then((result: any) => processResult(result, eventsToDispatch));
                }
                return processResult(result, eventsToDispatch);
              };
            }
            return origMethod;
          }
        };
        resolve(new Proxy(entity, handler));
      })
      .catch((err : Error) => {
        reject(err);
      });
  }), () => {
    chainComplete = true;
    if (eventsToDispatch.length === 0) {
      let hasTimedOut = false;
      const checkForEventsTimeout = setTimeout(() => {
        hasTimedOut = true;
      }, 5000);
      const checkForEventsInterval = setInterval(async () => {
        const flushTo : EntityEvent[] = [];
        while (eventsToDispatch.length > 0) {
          flushTo.push(eventsToDispatch.shift());
        }
        if (flushTo.length > 0 || hasTimedOut) {
          clearTimeout(checkForEventsTimeout);
          clearInterval(checkForEventsInterval);
        }
        await eventDispatcher(id, ...flushTo);
      }, 1);
      return Promise.resolve();
    } else {
      const flushTo : EntityEvent[] = [];
      while (eventsToDispatch.length > 0) {
        flushTo.push(eventsToDispatch.shift());
      }
      return eventDispatcher(id, ...flushTo);
    }
  }) as Promise<T>;
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

export class EntityRepositoryWithModifiers implements EntityRepository {
  constructor(private readonly entityRepository : EntityRepository, private readonly modifiers : Modifiers) {
  }
  public async load<T>(construct : new(...arg : any[]) => T, id : string, ...additional : any[]) : Promise<T> {
    const inst : T = await this.entityRepository.load(construct, id, ...additional);
    Object
      .keys(this.modifiers)
      .forEach((key: string) => this.modifiers[key](inst));
    return inst;
  }

}
