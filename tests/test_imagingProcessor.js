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

    it('should treat a pathology record with only path_diag_1 as having a report', function () {
      const input = {
        rObject: [{
          assay_tp_cname: '病理組織檢查',
          order_code: '25004C',
          order_name: '第四級外科病理 ;(Surgical pathology Level IV)',
          real_inspect_date: '2026/01/01',
          path_diag_1: 'Fake organ, biopsy, fake diagnosis.',
        }],
      };
      const result = imagingProcessor.processImagingData(input);
      assert.lengthOf(result.withReport, 1);
      assert.lengthOf(result.withoutReport, 0);
      assert.equal(result.withReport[0].inspectResult, 'Fake organ, biopsy, fake diagnosis.');
      assert.equal(result.withReport[0].assay_tp_cname, '病理組織檢查');
    });
  });

  describe('.combineReportFields', function () {
    it('should combine report fields in order', function () {
      const input = {
        inspect_result: 'A',
        path_diag_1: 'B',
        path_diag_2: 'C',
        path_diag_3: 'D',
      };
      assert.equal(imagingProcessor.combineReportFields(input), 'ABCD');
    });

    it('should return an empty string when no report field is filled', function () {
      assert.equal(imagingProcessor.combineReportFields({}), '');
    });
  });
});
