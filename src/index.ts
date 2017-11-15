import {
  Clock
} from './core/clock';

import {
  useIncrementalUUID
} from './core/entity';

export {
  Entity,
  EntityRepository,
  EntityEvent,
  EventBus,
  EventBusSubscription,
  EventDispatcher,
  EventHandler,
  EventProcessor,
  EventStore,
  BaseEntityRepository,
  uuid
} from './core/entity';

export {
  useIncrementalUUID
};

export {
  Clock
};

export {
  eventBus,
  entityRepository,
  eventStore
} from './runtime/es';

export const testMode = (value : boolean) => {
  if (value === undefined ? true : value) {
    Clock.freeze();
    useIncrementalUUID(true);
  } else {
    Clock.unfreeze();
    useIncrementalUUID(false);
  }
};
