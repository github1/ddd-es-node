import {
  EntityEvent,
  EventStore,
  EventStoreWriter
} from '.';

export class MemoryEventStore implements EventStore, EventStoreWriter {
  constructor(public readonly memoryEvents : EntityEvent[] = []) {
  }
  public clearMemoryEvents() {
    while(this.memoryEvents.length > 0) {
      this.memoryEvents.pop();
    }
  }
  public replay(id : string, handler : (event : EntityEvent, isReplaying? : boolean) => void) : Promise<void> {
    return Promise
      .all(this.memoryEvents
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
      .all(this.memoryEvents
        .map((event : EntityEvent) => new Promise((resolve: () => void) => {
          handler(event, true);
          resolve();
        })))
      .then(() => {
        // void
      });
  }

  public write(...events : EntityEvent[]) : Promise<EntityEvent[]> {
    this.memoryEvents.push(...events);
    return Promise.resolve(events);
  }
}
