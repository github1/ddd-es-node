import {
  defaultEsContext,
  Dispatcher,
  EntityEvent,
  User,
  onEvent
} from './';

class EsEvent extends EntityEvent {
  constructor(public description : string, timestamp? : number) {
    super();
    if (timestamp !== undefined) {
      this.timestamp = timestamp;
    }
  }
}

class EsTestEntity {
  public dispatch : Dispatcher;
  public receivedEvents : EntityEvent[] = [];
  public user : User;

  constructor(readonly id : string) {
  }

  public doSomething() {
    this.dispatch(new EsEvent('didSomething'));
  }

  @onEvent
  public handle(event : EntityEvent) {
    this.receivedEvents.push(event);
  }

  public get lastEvent() {
    return this.receivedEvents[this.receivedEvents.length - 1];
  }
}

describe('es-main', () => {
  it('loads entities', async () => {
    const {entityRepository} = defaultEsContext;
    const entity : EsTestEntity = await entityRepository.load(EsTestEntity, '123');
    entity.doSomething();
    expect(entity.lastEvent.name).toBe('EsEvent');
    await delay(100);
    const again : EsTestEntity = await entityRepository.load(EsTestEntity, '123');
    expect(again.lastEvent.name).toBe('EsEvent');
    const another : EsTestEntity = await entityRepository.load(EsTestEntity, '223');
    expect(another.lastEvent).toBeUndefined();
    another.doSomething();
    expect(another.lastEvent.name).toBe('EsEvent');
  });
  it('can modify events', async () => {
    const {entityRepository} = defaultEsContext
      .withUser({id: 'foo'})
      .atTime(12312);
    const entity : EsTestEntity = await entityRepository.load(EsTestEntity, '323');
    expect(entity.user.id).toBe('foo');
    entity.doSomething();
    expect(entity.lastEvent.user.id).toBe('foo');
    expect(entity.lastEvent.timestamp).toEqual(12312);
  });
  it('can seed events before', async () => {
    let {entityRepository} = defaultEsContext
      .withEvents({'423': [new EsEvent('seeded1')]});
    const entity : EsTestEntity = await entityRepository.load(EsTestEntity, '423');
    entity.doSomething();
    expect(entity.receivedEvents.length).toBe(2);
    expect((entity.receivedEvents[0] as EsEvent).description).toBe('seeded1');
    expect((entity.lastEvent as EsEvent).description).toBe('didSomething');
  });
  it('can seed events after', async () => {

    // Store an event
    let {entityRepository} = defaultEsContext
      .atTime(1000);
    let entity : EsTestEntity = await entityRepository.load(EsTestEntity, '523');
    entity.doSomething();

    // Load entity again with seeded event in past and future (timestamp should govern order)
    entityRepository = defaultEsContext
      .withEvents({
        '523': [new EsEvent('seeded-in-future-2', 1002),
          new EsEvent('seeded-in-future', 1001),
          new EsEvent('seeded-in-past', 999),
          new EsEvent('seeded-same', 1000)]
      })
      .entityRepository;
    entity = await entityRepository.load(EsTestEntity, '523');
    expect(entity.receivedEvents.length).toBe(5);
    expect((entity.receivedEvents[0] as EsEvent).description).toBe('seeded-in-past');
    expect((entity.receivedEvents[1] as EsEvent).description).toBe('seeded-same');
    expect((entity.receivedEvents[2] as EsEvent).description).toBe('didSomething');
    expect((entity.receivedEvents[3] as EsEvent).description).toBe('seeded-in-future');
    expect((entity.lastEvent as EsEvent).description).toBe('seeded-in-future-2');
  });
  it('does not mutate modifiers of the parent context', async () => {
    let {eventDispatcher: er1, eventStore: es1} = defaultEsContext
      .atTime(1000);
    let {eventDispatcher: er2, eventStore: es2} = defaultEsContext;
    await er1('dnm123', new EsEvent('evt1'));
    await es1.replay('dnm123', (evt) => {
      expect(evt.timestamp).toEqual(1000);
    });
    await er2('dnm223', new EsEvent('evt2'));
    await es2.replay('dnm223', (evt) => {
      expect(evt.timestamp).not.toEqual(1000);
    });
  });
  it('it inherits modifiers from the parent context', async () => {
    let {eventDispatcher: er1, eventStore: es1} = defaultEsContext
      .atTime(1000).withUser({id: 'theUser'});
    await er1('iim123', new EsEvent('evt1'));
    await es1.replay('iim123', (evt) => {
      expect(evt.timestamp).toEqual(1000);
      expect(evt.user.id).toBe('theUser');
    });
  });
  it('it inherits seeded events from the parent context', async () => {
    let {eventStore: es1} = defaultEsContext
      .withEvents({iis123: [new EsEvent('fromParent')]})
      .withEvents({iis123: [new EsEvent('fromChild')]});
    const events = [];
    await es1.replay('iis123', (evt) => {
      events.push(evt);
    });
    expect(events.length).toBe(2);
  });
});

const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));
