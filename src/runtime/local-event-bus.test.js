import {LocalEventBus} from './local-event-bus';

describe('LocalEventBus', () => {
  let store;
  let bus;
  beforeEach(() => {
    store = {
      replayAll: jest.fn()
    };
    bus = new LocalEventBus(store);
  });
  it('emits events to subscribers', () => {
    expect.assertions(1);
    const promise = new Promise((resolve) => {
      bus.subscribe((event) => {
        resolve(event);
      });
    });
    bus.emit({name: 'test-event'});
    return promise
      .then(event => {
        expect(event).toEqual({name: 'test-event'});
      });
  });
  it('can unsubscribe', () => {
    const subscription = bus.subscribe(() => {});
    subscription.unsubscribe();
    bus.emit({name: 'test-event'});
  });
  it('can replay events for subscribers', () => {
    const subscriber = () => {};
    bus.subscribe(subscriber, { replay: true });
    expect(store.replayAll).toHaveBeenCalledWith(subscriber);
  });
});
