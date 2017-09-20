import {
  BaseEntityRepository,
  EntityEvent,
  Entity
} from '../../src/core/entity';

class TestEvent extends EntityEvent {
}

class TestEntity extends Entity {
  constructor(id) {
    super(id, Entity.CONFIG(() => {
    }));
  }
  doSomething() {
    this.dispatch(this.id, new TestEvent());
  }
}

describe('BaseEntityRepository', () => {

  describe('when loading an entity', () => {
    let repo;
    beforeEach(() => {
      const dispatcher = (id, event) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(event);
          }, 25);
        });
      };
      const store = {
        replay: (id, handler, done) => {
          setTimeout(() => {
            done();
          }, 25);
        }
      };
      repo = new BaseEntityRepository(dispatcher, store);
    });
    it('dispatches the event after an operation is executed', () => {
      return repo.load(TestEntity, '123').then((entity) => {
        entity.doSomething();
        return 'loaded_entity';
      }).then((value) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve('arbitrary_async_call_' + value);
          }, 25);
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
  });

});
