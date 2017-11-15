import {
  Clock,
  testMode,
  uuid
} from '../src/index';

describe('index', () => {

  describe('when testMode is enabled', () => {
    beforeEach(() => {
      testMode(true);
    });
    it('freezes the clock', () => {
      expect(Clock.now()).toEqual(0);
    });
    it('uses freezes the uuid', () => {
      expect(uuid()).toEqual(uuid());
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
      expect(uuid()).not.toEqual(uuid());
    });
  });

});
