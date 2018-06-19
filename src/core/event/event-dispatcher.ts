import { EntityEvent } from './entity-event';

export type EventDispatcher = (streamId : string, events : EntityEvent[]) => Promise<void>;

export type VoidEventDispatcher = (streamId : string, event : EntityEvent) => void;
