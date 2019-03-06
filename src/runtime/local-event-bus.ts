import {
  EntityEvent,
  EventBus,
  EventBusSubscription,
  EventStore
} from '../core';
import * as events from 'events';

export class LocalEventBusSubscription implements EventBusSubscription {
  constructor(private readonly emitter : events.EventEmitter,
              private readonly listener : (event : EntityEvent) => void) {
    this.emitter = emitter;
    this.listener = listener;
  }

  public unsubscribe() : void {
    this.emitter.removeListener('event', this.listener);
  }
}

export class LocalEventBus implements EventBus {

  private readonly emitter : events.EventEmitter;

  constructor(private readonly eventStore : EventStore) {
    this.eventStore = eventStore;
    this.emitter = new events.EventEmitter();
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
