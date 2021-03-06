import {
  EntityEvent,
  EventsByStream
} from './entity-event';

export interface EventStore {
  replay(id : string, handler : (event : EntityEvent, isReplaying? : boolean) => void) : Promise<void>;

  replayAll(handler : (event : EntityEvent, isReplaying? : boolean) => void) : Promise<void>;
}

export interface EventStoreWriter {
  write(...events : EntityEvent[]) : Promise<EntityEvent[]>;
}

export class EventStoreSeeded implements EventStore {
  constructor(private readonly eventStore : EventStore, private readonly seededEvents : EventsByStream = {}) {
    Object.keys(seededEvents)
      .forEach((streamId : string) => {
        (seededEvents[streamId] || [])
          .sort((a : EntityEvent, b : EntityEvent) => a.timestamp - b.timestamp);
      });
  }

  public async replay(id : string, handler : (event : EntityEvent, isReplaying? : boolean) => void) : Promise<void> {
    const seededEventsArr = this.seededEvents[id].slice();
    await this.eventStore.replay(id, (event : EntityEvent, isReplaying? : boolean) : void => {
      this.handlerWrapper(seededEventsArr, event, isReplaying, handler);
    });
    while (seededEventsArr.length > 0) {
      handler(seededEventsArr.shift(), true);
    }
  }

  public async replayAll(handler : (event : EntityEvent, isReplaying? : boolean) => void) : Promise<void> {
    const allEvents = Object.keys(this.seededEvents)
      .reduce((all : EntityEvent[], streamId : string) => {
        all.push(...(this.seededEvents[streamId].slice()));
        return all;
      }, []);
    await this.eventStore.replayAll((event : EntityEvent, isReplaying? : boolean) : void => {
      this.handlerWrapper(allEvents, event, isReplaying, handler);
    });
    while (allEvents.length > 0) {
      handler(allEvents.shift(), true);
    }
  }

  private handlerWrapper(seededEventsArr : EntityEvent[],
                         event : EntityEvent,
                         isReplaying : boolean,
                         handler : (event : EntityEvent, isReplaying? : boolean) => void) {
    while (seededEventsArr && seededEventsArr.length > 0
    && event.timestamp >= seededEventsArr[0].timestamp) {
      handler(seededEventsArr.shift(), true);
    }
    handler(event, isReplaying);
  }
}
