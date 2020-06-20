import {MemoryEventStore} from '.';

describe('memory-event-store', () => {
  it('read/writes from memory', () => {
    const arr = [];
    const mem = new MemoryEventStore(arr);
    mem.write({
      uuid: '123',
      streamId: '223',
      name: 'FooEvent',
      typeNameMetaData: 'FooEvent',
      timestamp: 0
    });
    expect(arr.length).toEqual(1);
  });
});
