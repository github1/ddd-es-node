import { EntityEvent } from './entity-event';

export interface EventStore {
  replay(id : string, handler : (event : EntityEvent, isReplaying? : boolean) => void, done? : () => void) : void;
  replayAll(handler : (event : EntityEvent, isReplaying? : boolean) => void, done? : () => void) : void;
}
