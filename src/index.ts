import { Clock, EventUUID } from './core';

export * from './core';

export {
  eventBus,
  entityRepository,
  eventStore
} from './runtime';

export const testMode = (value : boolean) => {
  if (value === undefined ? true : value) {
    Clock.freeze();
    EventUUID.freezeUUID();
  } else {
    Clock.unfreeze();
    EventUUID.unfreezeUUID();
  }
};
