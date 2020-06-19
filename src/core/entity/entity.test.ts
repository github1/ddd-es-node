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
  memoryEvents,
  memoryEventStore
} from '../../runtime/in-memory';

class TestEvent extends EntityEvent {
}

class TestEntity extends Entity {
  public lastEventReceived : EntityEvent;

  constructor(id : string, public anotherArg : string) {
    super(id, (self : TestEntity, event : EntityEvent) => {
      self.lastEventReceived = event;
      if (self.id === 'errorInEventHandler') {
        throw new Error(self.id);
      }
    });
    if (id === 'errorInConstructor') {
      throw new Error(id);
    }
  }

  public doSomething() {
    this.dispatch(new TestEvent());
  }

  public doSomethingReturnsEvent() {
    return new TestEvent();
  }

  public doSomethingReturnsEvents() {
    return [new TestEvent(), {
      uuid: '12345eventLike',
      typeNameMetaData: 'TestEvent',
      name: 'TestEvent'
    }];
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
    it('dispatches the event after an operation is executed', async () => {
      const entity = await repo.load(TestEntity, '123');
      entity.doSomething();
      await delay(20);
      expect(memoryEvents.length).toBe(1);
      expect(memoryEvents[0]).toBeInstanceOf(TestEvent);
    });
    it('dispatches the an event returned from a entity function', async () => {
      const entity = await repo.load(TestEntity, '123');
      entity.doSomethingReturnsEvent();
      await delay(20);
      expect(memoryEvents.length).toBe(1);
      expect(memoryEvents[0]).toBeInstanceOf(TestEvent);
    });
    it('dispatches the an array of events returned from a entity function', async () => {
      const entity = await repo.load(TestEntity, '123');
      entity.doSomethingReturnsEvents();
      await delay(20);
      expect(memoryEvents.length).toBe(2);
      expect(memoryEvents[0]).toBeInstanceOf(TestEvent);
      expect(memoryEvents[1].typeNameMetaData).toBe('TestEvent');
    });
    describe('when an error is thrown', () => {
      it('receives errors from the constructor', async () => {
        expect.assertions(1);
        try {
          await repo.load(TestEntity, 'errorInConstructor');
        } catch (err) {
          expect(err.message).toBe('errorInConstructor');
        }
      });
      it('receives errors from the constructor event handler', async () => {
        expect.assertions(1);
        try {
          const entity = await repo.load(TestEntity, 'errorInEventHandler');
          entity.doSomething();
          await repo.load(TestEntity, 'errorInEventHandler');
        } catch (err) {
          expect(err.message).toBe('errorInEventHandler');
        }
      });
    });
    it('can be loaded with multiple arguments', async () => {
      const entity = await repo.load(TestEntity, '123', 'anotherVal');
      expect(entity.anotherArg).toBe('anotherVal');
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
      it('applies the events to the entity', async () => {
        const entity = await repo.load(TestEntity, '123');
        expect(entity.lastEventReceived.uuid).toBe('3dff623a-7373-11e8-adc0-fa7ae01bbebc');
      });
      describe('when the entity is a subclass', () => {
        it('applies the events the parent handler and child handler', async () => {
          const entity = await repo.load(TestEntitySubclass, '123');
          expect(entity.lastEventReceivedFromSuperclass.uuid).toBe('3dff623a-7373-11e8-adc0-fa7ae01bbebc');
          expect(entity.lastEventReceivedFromSubclass.uuid).toBe('3dff623a-7373-11e8-adc0-fa7ae01bbebc');
        });
      });
    });
  });

});

const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));
