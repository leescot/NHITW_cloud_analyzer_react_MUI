import {assert} from './lib/chai.js';

import {imagingProcessor} from './src/utils/imagingProcessor.js';

describe('utils/imagingProcessor', function () {
  describe('.processImagingData', function () {
    const defaultValue = { withReport: [], withoutReport: [] };

    it('should return default object for invalid input: undefined', function () {
      const input = undefined;
      const expected = defaultValue;
      assert.deepEqual(imagingProcessor.processImagingData(input), expected);
    });

    it('should return default object for invalid input: null', function () {
      const input = null;
      const expected = defaultValue;
      assert.deepEqual(imagingProcessor.processImagingData(input), expected);
    });

    it('should return default object for invalid input: no .rObject', function () {
      const input = {};
      const expected = defaultValue;
      assert.deepEqual(imagingProcessor.processImagingData(input), expected);
    });

    it('should return default object for invalid input: .rObject is not an Array', function () {
      const input = {
        rObject: null,
      };
      const expected = defaultValue;
      assert.deepEqual(imagingProcessor.processImagingData(input), expected);
    });
  });
});
