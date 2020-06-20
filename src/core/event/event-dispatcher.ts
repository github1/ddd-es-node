import {EntityEvent} from './entity-event';
import {Modifiers} from '../';

export type EventDispatcher = (streamId : string, ...events : EntityEvent[]) => Promise<void>;

export type Dispatcher = (event : EntityEvent) => void;

export function eventDispatcherWithModifiers(eventDispatcher : EventDispatcher, modifiers : Modifiers) : EventDispatcher {
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
