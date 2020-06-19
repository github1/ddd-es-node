import {EntityEvent} from './entity-event';

export type EventDispatcher = (streamId : string, ...events : EntityEvent[]) => Promise<void>;

export type Dispatcher = (event : EntityEvent) => void;

export interface EventModifier {
  (event : any) : any | undefined;
}

export interface EventModifiers {
 [key : string] : EventModifier
}

export function eventDispatcherWithModifiers(eventDispatcher : EventDispatcher, modifiers : EventModifiers) : EventDispatcher {
  if (!modifiers || Object.keys(modifiers).length === 0) {
    return eventDispatcher;
  }
  return (streamId : string, ...events : EntityEvent[]) : Promise<void> => {
    const modifierKeys = Object.keys(modifiers);
    for (const event of events) {
      for (const modifierKey of modifierKeys) {
        modifiers[modifierKey](event);
      }
    }
    return eventDispatcher(streamId, ...events);
  };
}
