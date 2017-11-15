import {
  Clock
} from './core/clock';

import {
  freezeUUID,
  unfreezeUUID
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
  freezeUUID,
  unfreezeUUID
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
    freezeUUID();
  } else {
    Clock.unfreeze();
    unfreezeUUID();
  }
};
