import {
  BaseEntityRepository,
  Entity,
  EntityRepository
} from './index';
import {
  EntityEvent,
  EventDispatcher
} from '../event';
import {
  clearMemoryEvents,
  createMemoryEventDispatcher,
  memoryEventStore
} from '../../runtime/in-memory';

class TestEvent extends EntityEvent {
}

class TestEntity extends Entity {
  public lastEventReceived : EntityEvent;

  constructor(id : string, public anotherArg : string) {
    super(id, (self : TestEntity, event : EntityEvent) => {
      self.lastEventReceived = event;
    });
  }

  public doSomething() {
    this.dispatch(new TestEvent());
  }
}

class TestEntitySuperclass extends Entity {
  public lastEventReceivedFromSuperclass : EntityEvent;

  constructor(id : string, eventHandler) {
    super(id, (self : TestEntitySuperclass, event : EntityEvent) => {
      self.lastEventReceivedFromSuperclass = event;
    }, eventHandler);
  }
}

class TestEntitySubclass extends TestEntitySuperclass {
  public lastEventReceivedFromSubclass : EntityEvent;

  constructor(id : string) {
    super(id, (self : TestEntitySubclass, event : EntityEvent) => {
      self.lastEventReceivedFromSubclass = event;
    });
  }
}

describe('BaseEntityRepository', () => {

  describe('when loading an entity', () => {
    let repo : EntityRepository;
    let dispatcher : EventDispatcher;
    beforeEach(() => {
      dispatcher = createMemoryEventDispatcher();
      repo = new BaseEntityRepository(dispatcher, memoryEventStore);
    });
    afterEach(() => {
      clearMemoryEvents();
    });
    it('dispatches the event after an operation is executed', () => {
      return repo.load(TestEntity, '123').then((entity : TestEntity) => {
        entity.doSomething();
        return 'loaded_entity';
      }).then((value) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve('arbitrary_async_call_' + value);
          }, 1);
        });
      }).then((value) => {
        return 'events_dispatched_from_' + value;
      }).then((value) => {
        expect(value).toEqual('events_dispatched_from_arbitrary_async_call_loaded_entity');
      });
    });
    describe('when an error is thrown', () => {
      it('it can be captured with a catch on the promise', () => {
        return repo.load(TestEntity, '123').then(() => {
          throw new Error('someError');
        }).catch((err) => {
          return err;
        }).then((err) => {
          expect(err.message).toEqual('someError');
        });
      });
    });
    it('can be loaded with multiple arguments', () => {
      return repo.load(TestEntity, '123', 'anotherVal').then((entity : TestEntity) => {
        expect(entity.anotherArg).toBe('anotherVal');
      });
    });
    describe('when events are stored for the entity', () => {
      beforeEach(() => {
        return dispatcher('123', {
          uuid: '3dff623a-7373-11e8-adc0-fa7ae01bbebc',
          name: 'TestEvent',
          timestamp: 0,
          typeNameMetaData: 'TestEvent',
          streamId: '123'
        });
      });
      it('applies the events to the entity', () => {
        return repo.load(TestEntity, '123').then((entity : TestEntity) => {
          expect(entity.lastEventReceived.uuid).toBe('3dff623a-7373-11e8-adc0-fa7ae01bbebc');
        });
      });
      describe('when the entity is a subclass', () => {
        it('applies the events the parent handler and child handler', () => {
          repo.load(TestEntitySubclass, '123').then((entity : TestEntitySubclass) => {
            expect(entity.lastEventReceivedFromSuperclass.uuid).toBe('3dff623a-7373-11e8-adc0-fa7ae01bbebc');
            expect(entity.lastEventReceivedFromSubclass.uuid).toBe('3dff623a-7373-11e8-adc0-fa7ae01bbebc');
          });
        });
      });
    });
  });

});
