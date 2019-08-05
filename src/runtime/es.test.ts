import {
  EntityEvent,
  onEvent,
  Dispatcher
} from '../core';
import { entityRepository } from './';

class EsEvent extends EntityEvent {
}

class EsTestEntity {
  public dispatch: Dispatcher;
  public lastEvent: EntityEvent;
  constructor(readonly id : string) {
  }
  public doSomething() {
    this.dispatch(new EsEvent());
  }
  @onEvent
  public handle(event : EntityEvent) {
    this.lastEvent = event;
  }
}

describe('es', () => {
  it('loads entities', async () => {
    expect.assertions(4);
    const entity: EsTestEntity = await entityRepository.load(EsTestEntity, '123');
    entity.doSomething();
    expect(entity.lastEvent.name).toBe('EsEvent');
    await delay(100);
    const again: EsTestEntity = await entityRepository.load(EsTestEntity, '123');
    expect(again.lastEvent.name).toBe('EsEvent');
    const another: EsTestEntity = await entityRepository.load(EsTestEntity, '456');
    expect(another.lastEvent).toBeUndefined();
    another.doSomething();
    expect(another.lastEvent.name).toBe('EsEvent');
  });
});

const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));
