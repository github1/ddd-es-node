// tslint:disable:no-any no-unsafe-any
import {
  Entity,
  EntityRepository,
  loadWithInstance
} from '../entity';
import {
  EntityEvent,
  EventBus,
  EventBusSubscription,
  EventBusSubscriptionOptions,
  EventDispatcher,
  EventStore
} from '../event';
// tslint:disable-next-line:no-import-side-effect
import 'reflect-metadata';

const METADATA_ON_EVENT : string = 'ddd-es-node:onEvent';

const index : { [key : string] : any } = {};

interface Subscriber {
  subscribeTo(eventBus: EventBus);
}

interface OnEventMetadata {
  methodName : string | symbol;
  superclasses? : any[];
}

let decoratedEventBusInstance: EventBus;
const subscribers: Subscriber[] = [];

export const subscribe = (options : EventBusSubscriptionOptions = {}) => {
  // tslint:disable-next-line:no-function-expression
  return function (
    target : any,
    propertyKey : string | symbol) {
    index[target.constructor.name] = index[target.constructor.name] || {};
    const subscriber : Subscriber = {
      subscribeTo: (eventBus : EventBus) => {
        const inst : any = new target.constructor();
        eventBus.subscribe(inst[propertyKey].bind(inst), options);
      }
    };
    if (decoratedEventBusInstance) {
      subscriber.subscribeTo(decoratedEventBusInstance);
    } else {
      subscribers.push(subscriber);
    }
  };
};

export function onEvent(
  target : any,
  propertyKey : string | symbol) {
  index[target.constructor.name] = index[target.constructor.name] || {};
  const superclasses : any[] = [];
  let superclassCstor : any = Object.getPrototypeOf(target).constructor;
  let superclass : any = superclassCstor;
  while (superclass.name !== 'Object') {
    superclasses.push(superclass);
    superclassCstor = Object.getPrototypeOf(superclassCstor.prototype).constructor;
    superclass = superclassCstor;
  }
  const metadata : OnEventMetadata = {
    methodName: propertyKey,
    superclasses: superclasses
  };
  Reflect.defineMetadata(
    METADATA_ON_EVENT, metadata,
    index[target.constructor.name]
  );
}

export class WrapperEntity extends Entity {
  constructor(
    public id : string,
    delegate : any,
    appliers : ((target : any, event : EntityEvent) => void)[]) {
    super(id, (self : WrapperEntity, event : EntityEvent) => {
      appliers.forEach((applier : (target : any, event : EntityEvent) => void) => {
        applier.call(delegate, event);
      });
    });
  }
}

export class DecoratedEntityRepository implements EntityRepository {

  constructor(private readonly eventDispatcher : EventDispatcher,
              private readonly eventStore : EventStore) {
  }

  public load(construct : { new(...arg: any[]) }, id : string, ...additionalConstArgs : any[]) : Promise<any> {
    const delegate : any = new construct(id, ...additionalConstArgs);
    if (index[construct.name]) {
      const onEventMetadata : OnEventMetadata = Reflect.getMetadata(METADATA_ON_EVENT, index[construct.name]);
      const appliers : ((target : any, event : EntityEvent) => void)[] = [];
      appliers.push(delegate[onEventMetadata.methodName]);
      for (const superclass of onEventMetadata.superclasses) {
        const onEventMetadata : OnEventMetadata = Reflect.getMetadata(METADATA_ON_EVENT, index[superclass.name]);
        if (onEventMetadata) {
          appliers.push(superclass.prototype[onEventMetadata.methodName]);
        }
      }
      const wrapper : WrapperEntity = new WrapperEntity(id, delegate, appliers);
      return loadWithInstance(id, wrapper, this.eventDispatcher, this.eventStore)
        .then(() => {
          delegate.dispatch = wrapper['dispatch'];
          return delegate;
        });
    } else {
      return loadWithInstance(id, delegate, this.eventDispatcher, this.eventStore);
    }
  }
}

export class DecoratedEventBus implements EventBus {
  constructor(private readonly eventBus : EventBus) {
    decoratedEventBusInstance = this;
    for(const subscriber of subscribers) {
      subscriber.subscribeTo(this);
    }
  }

  public subscribe(listener : (event : EntityEvent, isReplaying? : boolean) => void,
                   options? : EventBusSubscriptionOptions) : EventBusSubscription {
    return this.eventBus.subscribe(listener, options);
  }

  public emit(event : {}) : void {
    return this.eventBus.emit(event);
  }
}
