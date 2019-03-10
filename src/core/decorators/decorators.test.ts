import {
  DecoratedEntityRepository,
  DecoratedEventBus,
  onEvent,
  subscribe,
} from './';
import {Entity} from '../entity';
import {
  EntityEvent,
  EventDispatcher
} from '../event';
import {LocalEventBus} from '../../runtime/local-event-bus';
import {
  clearMemoryEvents,
  createMemoryEventDispatcher,
  memoryEventStore
} from '../../runtime/in-memory';

class TestEntitySuperClass {

  public lastEventReceivedFromSuperclass : EntityEvent;

  constructor(public id : string) {
  }

  @onEvent
  public handler(event : EntityEvent) {
    this.lastEventReceivedFromSuperclass = event;
  }

}

class TestEntity extends TestEntitySuperClass {

  public lastEventReceivedFromSubclass : EntityEvent;

  constructor(id : string) {
    super(id)
  }

  @onEvent
  public handler(event : EntityEvent) {
    this.lastEventReceivedFromSubclass = event;
  }

}

class TestEventSubscriber {
  public static lastEventReceivedFromSubscriber : EntityEvent;
  public static eventReceivedCount : number = 0;

  public static reset() {
    TestEventSubscriber.lastEventReceivedFromSubscriber = undefined;
    TestEventSubscriber.eventReceivedCount = 0;
  }

  @subscribe({replay: true})
  public handler(event : EntityEvent) {
    TestEventSubscriber.eventReceivedCount++;
    TestEventSubscriber.lastEventReceivedFromSubscriber = event;
  }
}

class ExtendsFromEntity extends Entity {
  constructor(id) {
    super(id, (self : ExtendsFromEntity, event : EntityEvent) => {
    });
  }
}

describe('decorators', () => {
  let repo : DecoratedEntityRepository;
  let dispatcher : EventDispatcher;
  let anEvent : EntityEvent = {
    uuid: '3dff623a-7373-11e8-adc0-fa7ae01bbebc',
    name: 'TestEvent',
    timestamp: 0,
    typeNameMetaData: 'TestEvent',
    streamId: '123'
  };
  beforeEach(() => {
    dispatcher = createMemoryEventDispatcher(new DecoratedEventBus(new LocalEventBus(memoryEventStore)));
    repo = new DecoratedEntityRepository(dispatcher, memoryEventStore);
    return dispatcher('123', anEvent);
  });
  afterEach(() => {
    TestEventSubscriber.reset();
    clearMemoryEvents();
  });
  it('loads decorated types', () => {
    expect.assertions(3);
    return repo
      .load(TestEntity, '123')
      .then((entity : TestEntity) => {
        expect(entity.id).toBe('123');
        expect(entity.lastEventReceivedFromSubclass).toBeDefined();
        expect(entity.lastEventReceivedFromSuperclass).toBeDefined();
      });
  });
  it('loads types which extend Entity directly', () => {
    return repo.load(ExtendsFromEntity, '123')
      .then((entity: ExtendsFromEntity) => {
        expect(entity).toBeDefined();
      });
  });
  it('registers event subscribers', () => {
    expect.assertions(3);
    expect(TestEventSubscriber.lastEventReceivedFromSubscriber.uuid).toBe(anEvent.uuid);
    const anotherEvent : EntityEvent = JSON.parse(JSON.stringify(anEvent));
    anotherEvent.uuid = 'd31f6c88-415a-11e9-b210-d663bd873d93';
    return dispatcher('123', anotherEvent)
      .then(() => {
        expect(TestEventSubscriber.eventReceivedCount).toBe(2);
        expect(TestEventSubscriber.lastEventReceivedFromSubscriber.uuid).toBe(anotherEvent.uuid);
      });
  });
});
