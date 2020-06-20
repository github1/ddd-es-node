import {
  onEvent,
  subscribe,
} from './';
import {Entity, EntityRepository} from '../entity';
import {
  EntityEvent,
  EventDispatcher,
  MemoryEventStore
} from '../event';
import {EsContext} from '../..';

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

  constructor(id : string, public anotherArg : string) {
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
  let repo : EntityRepository;
  let dispatcher : EventDispatcher;
  let memoryEventStore : MemoryEventStore;
  let anEvent : EntityEvent = {
    uuid: '3dff623a-7373-11e8-adc0-fa7ae01bbebc',
    name: 'TestEvent',
    timestamp: 0,
    typeNameMetaData: 'EntityEvent',
    streamId: '123'
  };
  beforeEach(() => {
    memoryEventStore = new MemoryEventStore();
    const esContext = new EsContext(memoryEventStore);
    dispatcher = esContext.eventDispatcher;
    repo = esContext.entityRepository;
    return dispatcher('123', anEvent);
  });
  afterEach(() => {
    TestEventSubscriber.reset();
    memoryEventStore.clearMemoryEvents();
  });
  it('loads decorated types with additional constructor args', async () => {
    expect.assertions(1);
    const entity = await repo.load(TestEntity, '123', 'someVal');
    expect(entity.anotherArg).toBe('someVal');
  });
  it('loads types which extend Entity directly', async () => {
    const entity = await repo.load(ExtendsFromEntity, '123');
    expect(entity).toBeDefined();
    expect(entity).toBeInstanceOf(ExtendsFromEntity);
  });
  it('registers event subscribers', async () => {
    expect.assertions(3);
    expect(TestEventSubscriber.lastEventReceivedFromSubscriber.uuid).toBe(anEvent.uuid);
    const anotherEvent : EntityEvent = JSON.parse(JSON.stringify(anEvent));
    anotherEvent.uuid = 'd31f6c88-415a-11e9-b210-d663bd873d93';
    await dispatcher('123', anotherEvent);
    expect(TestEventSubscriber.eventReceivedCount).toBe(2);
    expect(TestEventSubscriber.lastEventReceivedFromSubscriber.uuid).toBe(anotherEvent.uuid);
  });
});
