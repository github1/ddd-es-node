import {
  EntityEvent,
  EventBus,
  EventDispatcher,
  EventStore
} from '../core';

export const memoryEvents = [];

export const clearMemoryEvents = () => {
  while (memoryEvents.length > 0) {
    memoryEvents.pop();
  }
};

export const createMemoryEventDispatcher = (eventBus? : EventBus) : EventDispatcher =>
  (streamId : string, ...events : EntityEvent[]) : Promise<void> => {
    return new Promise<void>((resolve : () => void) => {
      setTimeout(() => {
        for (const evt of events) {
          memoryEvents.push(evt);
          if (eventBus) {
            eventBus.emit(evt);
          }
        }
        resolve();
      }, 1);
    });
  };

class MemoryEventStore implements EventStore {
  public replay(id : string, handler : (event : EntityEvent, isReplaying? : boolean) => void) : Promise<void> {
    return Promise
      .all(memoryEvents
        .map((event: EntityEvent) => new Promise((resolve: () => void) => {
          if (event.streamId === id) {
            handler(event, true);
          }
          resolve();
        })))
      .then(() => {
        // void
      });
  }

  public replayAll(handler : (event : EntityEvent, isReplaying? : boolean) => void) : Promise<void> {
    return Promise
      .all(memoryEvents
        .map((event : EntityEvent) => new Promise((resolve: () => void) => {
          handler(event, true);
          resolve();
        })))
      .then(() => {
        // void
      });
  }
}

export const memoryEventStore : EventStore = new MemoryEventStore();
