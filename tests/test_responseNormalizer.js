import { describe, it, assert } from 'vitest';

import { normalizeResponseData } from '../src/apiInterceptor/responseNormalizer.js';

describe('apiInterceptor/responseNormalizer', function () {
  describe('.normalizeResponseData — default branch (array-bearing types e.g. labdata/imaging/allergy)', function () {
    it('passes an already-array rObject through unchanged', function () {
      const input = { rObject: [1, 2, 3] };
      const expected = { rObject: [1, 2, 3] };
      assert.deepEqual(normalizeResponseData(input, 'labdata'), expected);
    });

    it('falls back to lowercase .robject when .rObject is absent', function () {
      const input = { robject: [9] };
      const expected = { rObject: [9] };
      assert.deepEqual(normalizeResponseData(input, 'imaging'), expected);
    });

    it('collapses a non-array rObject to an empty array', function () {
      const input = { rObject: { a: 1 } };
      const expected = { rObject: [] };
      assert.deepEqual(normalizeResponseData(input, 'labdata'), expected);
    });

    it('returns rObject: [] when neither rObject nor robject exist', function () {
      const input = {};
      const expected = { rObject: [] };
      assert.deepEqual(normalizeResponseData(input, 'allergy'), expected);
    });
  });

  describe('.normalizeResponseData — medDays / labdraw (wraps the whole `data` param, not recordsArray)', function () {
    it('passes an already-array `data` through unchanged for medDays', function () {
      const input = [1, 2, 3];
      const expected = { rObject: [1, 2, 3] };
      assert.deepEqual(normalizeResponseData(input, 'medDays'), expected);
    });

    it('wraps a non-array `data` object into a single-element array for medDays', function () {
      const input = { foo: 1 };
      const expected = { rObject: [{ foo: 1 }] };
      assert.deepEqual(normalizeResponseData(input, 'medDays'), expected);
    });

    it('wraps a non-array `data` object into a single-element array for labdraw', function () {
      const input = ['a'];
      const expected = { rObject: ['a'] };
      assert.deepEqual(normalizeResponseData(input, 'labdraw'), expected);
    });
  });

  describe('.normalizeResponseData — patientsummary', function () {
    it('passes an already-array rObject through unchanged', function () {
      const input = { rObject: [1, 2] };
      const expected = { rObject: [1, 2] };
      assert.deepEqual(normalizeResponseData(input, 'patientsummary'), expected);
    });

    it('wraps a single (non-array, truthy) rObject into a one-element array', function () {
      const input = { rObject: { a: 1 } };
      const expected = { rObject: [{ a: 1 }] };
      assert.deepEqual(normalizeResponseData(input, 'patientsummary'), expected);
    });

    it('returns rObject: [] when rObject is null', function () {
      const input = { rObject: null };
      const expected = { rObject: [] };
      assert.deepEqual(normalizeResponseData(input, 'patientsummary'), expected);
    });
  });

  describe('.normalizeResponseData — chronicMed (always wraps the entire `data` param as a single element)', function () {
    it('wraps the whole raw data object, even though it already has an rObject key', function () {
      const input = { rObject: [1] };
      const expected = { rObject: [{ rObject: [1] }] };
      assert.deepEqual(normalizeResponseData(input, 'chronicMed'), expected);
    });
  });

  describe('.normalizeResponseData — object-returning types (adultHealthCheck / cancerScreening / hbcvdata)', function () {
    it('wraps an array-shaped rObject as a single element (not spread)', function () {
      const input = { rObject: [1, 2] };
      const expected = { rObject: [[1, 2]] };
      assert.deepEqual(normalizeResponseData(input, 'adultHealthCheck'), expected);
    });

    it('wraps an object-shaped rObject as a single element', function () {
      const input = { rObject: { a: 1 } };
      const expected = { rObject: [{ a: 1 }] };
      assert.deepEqual(normalizeResponseData(input, 'adultHealthCheck'), expected);
    });

    it('returns rObject: [] when rObject is absent', function () {
      const input = {};
      const expected = { rObject: [] };
      assert.deepEqual(normalizeResponseData(input, 'adultHealthCheck'), expected);
    });

    it('falls back to lowercase .robject for cancerScreening', function () {
      const input = { robject: { b: 2 } };
      const expected = { rObject: [{ b: 2 }] };
      assert.deepEqual(normalizeResponseData(input, 'cancerScreening'), expected);
    });

    it('treats a falsy (0) rObject as absent for hbcvdata', function () {
      const input = { rObject: 0 };
      const expected = { rObject: [] };
      assert.deepEqual(normalizeResponseData(input, 'hbcvdata'), expected);
    });
  });

  describe('.normalizeResponseData — 開發者補抓型別的 TYPE_SHAPE 衍生對照(spec v2 §5)', function () {
    it('specialPayment(三分表物件)走 recordAsSingle:整個 robject 物件包成一元素', function () {
      const tables = { medical_service: [1], drugs: [2], special_material: [3] };
      const input = { robject: tables };
      assert.deepEqual(normalizeResponseData(input, 'specialPayment'), { rObject: [tables] });
    });

    it('controlledMedSummary(裸陣列)走 dataAsRows:回應本體即列陣列,原樣輸出', function () {
      const input = [{ a: 1 }, { a: 2 }];
      assert.deepEqual(normalizeResponseData(input, 'controlledMedSummary'), { rObject: [{ a: 1 }, { a: 2 }] });
    });

    it('dental(未登記 shape)走預設 rows', function () {
      const input = { robject: [{ x: 1 }] };
      assert.deepEqual(normalizeResponseData(input, 'dental'), { rObject: [{ x: 1 }] });
    });

    // 2026-07-08 正式環境實測(.test_data/json_allapi 27 檔):imue0080s03 回應是
    // { log2time, robject: [...] } 物件,非 spec v2 推測的裸陣列;誤登記 dataAsRows
    // 會把整個 envelope 包成一筆假紀錄。正確走預設 rows(相容小寫 robject)。
    it('rehabilitationSummary(正式環境 {log2time, robject} 物件)走預設 rows:取出內層列', function () {
      const rows = [
        { type: '1', cureType1: '0', cureType4: '0', cureType6: '0', cureType7: '0' },
        { type: '2', cureType1: '0', cureType4: '0', cureType6: '0', cureType7: '0' },
      ];
      const input = { log2time: '2026-07-08T13:55:28.621328+08:00', robject: rows };
      assert.deepEqual(normalizeResponseData(input, 'rehabilitationSummary'), { rObject: rows });
    });
  });

  describe('.normalizeResponseData — null/undefined input', function () {
    it('throws when data is null, because .rObject is read unconditionally before branching', function () {
      assert.throws(() => normalizeResponseData(null, 'medication'));
    });

    it('throws when data is undefined, because .rObject is read unconditionally before branching', function () {
      assert.throws(() => normalizeResponseData(undefined, 'medication'));
    });

    it('does not throw for an empty object input and returns rObject: []', function () {
      assert.doesNotThrow(() => normalizeResponseData({}, 'medication'));
      assert.deepEqual(normalizeResponseData({}, 'medication'), { rObject: [] });
    });
  });
});
