import {assert} from './lib/chai.js';

import {medicationProcessor} from './src/utils/medicationProcessor.js';

describe('utils/medicationProcessor', function () {
  describe('.processMedDaysData', function () {
    it('should return [] for invalid input: undefined', async function () {
      const input = undefined;
      const expected = [];
      assert.deepEqual(await medicationProcessor.processMedicationData(input), expected);
    });

    it('should return [] for invalid input: null', async function () {
      const input = null;
      const expected = [];
      assert.deepEqual(await medicationProcessor.processMedicationData(input), expected);
    });

    it('should return [] for invalid input: no .rObject', async function () {
      const input = {};
      const expected = [];
      assert.deepEqual(await medicationProcessor.processMedicationData(input), expected);
    });

    it('should return [] for invalid input: .rObject is not an Array', async function () {
      const input = {
        rObject: null,
      };
      const expected = [];
      assert.deepEqual(await medicationProcessor.processMedicationData(input), expected);
    });
  });
});
