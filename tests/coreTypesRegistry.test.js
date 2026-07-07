// tests/coreTypesRegistry.test.js
import { describe, it, assert } from 'vitest';

import { CORE_DATA_TYPES } from '../src/dataTypes/coreTypes.js';
import { DEV_DATA_TYPES } from '../src/dataTypes/devTypes.js';
import {
  CORE_KEYS, CORE_API_ENTRIES, CORE_SHAPE_ENTRIES, CORE_NODE_TO_TYPES,
  CORE_REGULAR_KEYS, CORE_SPECIAL_KEYS, CORE_SETTING_KEYS,
  DEV_NODE_TO_TYPES,
} from '../src/dataTypes/registry.js';

// 內容正確性由 tests/coreTypesMigration.characterization.test.js 鎖定
// (API_PATH_MAP 等最終值),本檔只驗描述檔欄位合法性與 CORE/DEV 不衝突。

describe('dataTypes/coreTypes + registry 不變量', function () {
  const KNOWN_SHAPES = new Set(['rows', 'rowsOrSingle', 'dataAsRows', 'dataAsSingle', 'recordAsSingle']);
  const ALLOWED_EXPORT_ALIAS = new Set(['labdata', 'patientsummary']); // 僅有的 2 個歷史別名,封存不擴充

  it('每個型別都有 key/node/apiPath;選填欄位值合法', function () {
    for (const t of CORE_DATA_TYPES) {
      assert.isString(t.key, `${t.key} key`);
      assert.isString(t.node, `${t.key} node`);
      assert.isString(t.apiPath, `${t.key} apiPath`);
      if (t.shape) assert.isTrue(KNOWN_SHAPES.has(t.shape), `${t.key} shape=${t.shape}`);
      if (t.fetchGroup) assert.strictEqual(t.fetchGroup, 'special', `${t.key} fetchGroup`);
      if (t.cloudSettingKey) assert.match(t.cloudSettingKey, /^fetch[A-Z]/, `${t.key} cloudSettingKey`);
      if (t.exportKey) assert.isTrue(ALLOWED_EXPORT_ALIAS.has(t.key), `${t.key} 不得新增 exportKey 別名`);
      if (t.cloudSettingKey) assert.strictEqual(t.fetchGroup, 'special', `${t.key} 有開關必為 special`);
    }
  });

  it('CORE + DEV 的 key 全域唯一', function () {
    const keys = [...CORE_DATA_TYPES, ...DEV_DATA_TYPES].map(t => t.key);
    assert.strictEqual(new Set(keys).size, keys.length);
  });

  it('CORE 與 DEV 的授權節點不重疊(spread 併入不可靜默覆蓋)', function () {
    for (const node of Object.keys(CORE_NODE_TO_TYPES)) {
      assert.isUndefined(DEV_NODE_TO_TYPES[node], `節點 ${node} 同時出現在 CORE 與 DEV`);
    }
  });

  it('衍生片段對齊描述檔', function () {
    assert.deepEqual(CORE_KEYS, CORE_DATA_TYPES.map(t => t.key));
    assert.deepEqual(CORE_API_ENTRIES, CORE_DATA_TYPES.map(t => [t.key, t.apiPath]));
    assert.deepEqual(CORE_SHAPE_ENTRIES, CORE_DATA_TYPES.filter(t => t.shape).map(t => [t.key, t.shape]));
  });

  it('抓取分流衍生對齊現行 index.js 的手寫清單', function () {
    assert.deepEqual(CORE_REGULAR_KEYS, [
      'medication', 'labdata', 'chinesemed', 'imaging',
      'allergy', 'surgery', 'discharge', 'medDays',
      'patientsummary', 'chronicMed',
    ]);
    // 衍生序為描述檔序(labdraw 在前);與舊手寫序的差異見 Step 3 說明
    assert.deepEqual(CORE_SPECIAL_KEYS, ['labdraw', 'adultHealthCheck', 'cancerScreening', 'hbcvdata']);
    assert.deepEqual(CORE_SETTING_KEYS, {
      adultHealthCheck: 'fetchAdultHealthCheck',
      cancerScreening: 'fetchCancerScreening',
      hbcvdata: 'fetchHbcvdata',
    });
  });
});
