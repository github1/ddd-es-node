import {EntityEvent} from './entity-event';

export interface EventBusSubscriptionOptions {
  replay? : boolean;
}

export interface EventBusSubscription {
  unsubscribe() : void;
}

export interface EventBus {
  subscribe(listener : (event : EntityEvent, isReplaying? : boolean) => void,
            options? : EventBusSubscriptionOptions) : EventBusSubscription;

  emit(event : {}) : void;
}
