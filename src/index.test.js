import {
  Clock,
  testMode,
  EventUUID
} from '../src/index';

describe('index', () => {

  describe('when testMode is enabled', () => {
    [() => testMode(true), () => testMode()].forEach(before => {
      beforeEach(before);
      it('freezes the clock', () => {
        expect(Clock.now()).toEqual(0);
      });
      it('uses freezes the uuid', () => {
        expect(EventUUID.uuid()).toEqual(EventUUID.uuid());
      });
    });
  });

  describe('when testMode is not enabled', () => {
    beforeEach(() => {
      testMode(false);
    });
    it('unfreezes the clock', () => {
      expect(Clock.now()).toBeGreaterThan(0);
    });
    it('uses random uuids', () => {
      expect(EventUUID.uuid()).not.toEqual(EventUUID.uuid());
    });
  });

});
