import {assert} from './lib/chai.js';

import {surgeryProcessor} from './src/utils/surgeryProcessor.js';

describe('utils/surgeryProcessor', function () {
  describe('.processSurgeryData', function () {
    it('should return [] for invalid input: undefined', function () {
      const input = undefined;
      const expected = [];
      assert.deepEqual(surgeryProcessor.processSurgeryData(input), expected);
    });

    it('should return [] for invalid input: null', function () {
      const input = null;
      const expected = [];
      assert.deepEqual(surgeryProcessor.processSurgeryData(input), expected);
    });

    it('should return [] for invalid input: no .rObject', function () {
      const input = {};
      const expected = [];
      assert.deepEqual(surgeryProcessor.processSurgeryData(input), expected);
    });

    it('should return [] for invalid input: .rObject is not an Array', function () {
      const input = {
        rObject: null,
      };
      const expected = [];
      assert.deepEqual(surgeryProcessor.processSurgeryData(input), expected);
    });
  });
});
