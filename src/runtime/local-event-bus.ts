import {
  EntityEvent,
  EventBus,
  EventBusSubscription,
  EventStore
} from '../core';
import * as events from 'events';

export class LocalEventBusSubscription implements EventBusSubscription {
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
    if (options && options['replay']) {
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
