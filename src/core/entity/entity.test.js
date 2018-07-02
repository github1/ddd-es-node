import {
  BaseEntityRepository,
  Entity
} from './index';
import { EntityEvent } from './../event';

class TestEvent extends EntityEvent {
}

class TestEntity extends Entity {
  constructor(id) {
    super(id, (self, event) => {
      self.lastEventReceived = event;
    });
  }

  doSomething() {
    this.dispatch(this.id, new TestEvent());
  }
}

class TestEntitySuperclass extends Entity {
  constructor(id, eventHandler) {
    super(id, (self, event) => {
      self.lastEventReceivedFromSuperclass = event;
    }, eventHandler);
  }
}

class TestEntitySubclass extends TestEntitySuperclass {
  constructor(id) {
    super(id, (self, event) => {
      self.lastEventReceivedFromSubclass = event;
    });
  }
}

describe('BaseEntityRepository', () => {

  describe('when loading an entity', () => {
    let repo;
    let events = [];
    beforeEach(() => {
      const dispatcher = (id, event) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(event);
          }, 1);
        });
      };
      const store = {
        replay: (id, handler, done) => {
          Promise.all(events.map(event => new Promise(resolve => {
            handler(event, true);
            resolve();
          }))).then(() => {
            done();
          });
        }
      };
      repo = new BaseEntityRepository(dispatcher, store);
    });
    afterEach(() => {
      while (events.length > 0) {
        events.pop();
      }
    });
    it('dispatches the event after an operation is executed', () => {
      return repo.load(TestEntity, '123').then((entity) => {
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
    describe('when events are stored for the entity', () => {
      beforeEach(() => {
        events.push({
          uuid: '3dff623a-7373-11e8-adc0-fa7ae01bbebc',
          name: 'TestEvent',
          timestamp: 0,
          typeNameMetaData: 'TestEvent',
          streamId: '123'
        });
      });
      it('applies the events to the entity', () => {
        return repo.load(TestEntity, '123').then((entity) => {
          expect(entity.lastEventReceived.uuid).toBe('3dff623a-7373-11e8-adc0-fa7ae01bbebc');
        });
      });
      describe('when the entity is a subclass', () => {
        it('applies the events the parent handler and child handler', () => {
          repo.load(TestEntitySubclass, '123').then((entity) => {
            expect(entity.lastEventReceivedFromSuperclass.uuid).toBe('3dff623a-7373-11e8-adc0-fa7ae01bbebc');
            expect(entity.lastEventReceivedFromSubclass.uuid).toBe('3dff623a-7373-11e8-adc0-fa7ae01bbebc');
          });
        });
      });
    });
  });

});