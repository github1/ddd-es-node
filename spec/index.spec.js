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
    it('uses incremental uuids', () => {
      expect(uuid()).toEqual('0');
      expect(uuid()).toEqual('1');
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
      console.log(uuid());
      expect(uuid()).toMatch(/[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/);
    });
  });

});
