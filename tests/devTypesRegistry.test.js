import { describe, it, assert } from 'vitest';

import { DEV_DATA_TYPES } from '../src/dataTypes/devTypes.js';
import {
  DEV_KEYS,
  DEV_API_ENTRIES,
  DEV_SHAPE_ENTRIES,
  DEV_NODE_TO_TYPES,
} from '../src/dataTypes/registry.js';

describe('dataTypes/devTypes + registry', function () {
  describe('DEV_DATA_TYPES 描述檔完整性', function () {
    it('每個型別都有 key/node/apiPath', function () {
      for (const t of DEV_DATA_TYPES) {
        assert.isString(t.key, `${t.key} key`);
        assert.isString(t.node, `${t.key} node`);
        assert.isString(t.apiPath, `${t.key} apiPath`);
      }
    });

    it('key 唯一(全系統唯一名,不製造別名)', function () {
      const keys = DEV_DATA_TYPES.map(t => t.key);
      assert.strictEqual(new Set(keys).size, keys.length);
    });

    it('key 一律 camelCase(不含底線/連字號/大寫開頭)', function () {
      for (const t of DEV_DATA_TYPES) {
        assert.match(t.key, /^[a-z][a-zA-Z]*$/, t.key);
      }
    });

    it('shape 若存在,必為 responseNormalizer 認得的既有 shape', function () {
      const KNOWN = new Set(['rows', 'rowsOrSingle', 'dataAsRows', 'dataAsSingle', 'recordAsSingle']);
      for (const t of DEV_DATA_TYPES) {
        if (t.shape) assert.isTrue(KNOWN.has(t.shape), `${t.key} shape=${t.shape}`);
      }
    });
  });

  describe('衍生片段', function () {
    it('DEV_KEYS 對齊描述檔順序與內容', function () {
      assert.deepEqual(DEV_KEYS, DEV_DATA_TYPES.map(t => t.key));
    });

    it('DEV_API_ENTRIES 為 [key, apiPath] 條目', function () {
      assert.deepEqual(
        DEV_API_ENTRIES,
        DEV_DATA_TYPES.map(t => [t.key, t.apiPath])
      );
      // 抽驗一筆
      assert.deepEqual(
        DEV_API_ENTRIES.find(([k]) => k === 'dental'),
        ['dental', 'imue0030/imue0030s02/get-data']
      );
    });

    it('DEV_SHAPE_ENTRIES 只含非預設 shape 的型別', function () {
      const map = new Map(DEV_SHAPE_ENTRIES);
      assert.strictEqual(map.get('specialPayment'), 'recordAsSingle');
      assert.strictEqual(map.get('controlledMedSummary'), 'dataAsRows');
      // 預設 'rows' 的型別不應出現
      assert.isFalse(map.has('dental'));
      assert.isFalse(map.has('controlledMed'));
    });

    it('DEV_NODE_TO_TYPES 對多型別節點 group by node(2.2/3.3/9.1 各兩型別)', function () {
      assert.deepEqual(DEV_NODE_TO_TYPES['2.2'], ['controlledMed', 'controlledMedSummary']);
      assert.deepEqual(DEV_NODE_TO_TYPES['3.3'], ['chineseMedCare', 'chineseMedCareSummary']);
      assert.deepEqual(DEV_NODE_TO_TYPES['9.1'], ['rehabilitation', 'rehabilitationSummary']);
      // 單型別節點是長度 1 陣列
      assert.deepEqual(DEV_NODE_TO_TYPES['4.1'], ['dental']);
      assert.deepEqual(DEV_NODE_TO_TYPES['1.3'], ['specialPayment']);
    });

    it('DEV_NODE_TO_TYPES 不與既有 14 型別節點衝突(不含 2.1/6.1 等)', function () {
      const existingNodes = ['1.1', '1.2', '2.1', '2.3', '2.4', '3.1', '5.1', '6.1', '6.2', '6.3', '6.4', '7.1', '8.1'];
      for (const n of existingNodes) {
        assert.isUndefined(DEV_NODE_TO_TYPES[n], `節點 ${n} 不應被 dev registry 佔用`);
      }
    });
  });
});
