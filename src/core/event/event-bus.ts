import { EntityEvent } from './entity-event';

export interface EventBusSubscription {
  unsubscribe() : void;
}

export interface EventBus {
  subscribe(listener : (event : EntityEvent, isReplaying? : boolean) => void,
            options? : { [key:string]: string | boolean }) : EventBusSubscription;
  emit(event : {}) : void;
}
