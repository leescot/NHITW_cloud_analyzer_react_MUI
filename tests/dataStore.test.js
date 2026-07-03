import { describe, it, assert, beforeEach, vi } from 'vitest';

import { dataStore, DATA_TYPES } from '../src/store/dataStore.js';

describe('store/dataStore', function () {
  beforeEach(() => {
    dataStore.clearAll();
  });

  it('DATA_TYPES 涵蓋全部 15 種資料型別', function () {
    assert.deepEqual(DATA_TYPES, [
      'medication', 'labdata', 'labdraw', 'chinesemed', 'imaging',
      'allergy', 'surgery', 'discharge', 'medDays', 'patientsummary',
      'adultHealthCheck', 'cancerScreening', 'hbcvdata', 'chronicMed',
      'masterMenu',
    ]);
  });

  it('已知型別未設值時回傳 null(對齊 window 變數初始化為 null 的語意)', function () {
    assert.isNull(dataStore.getData('medication'));
  });

  it('未知型別回傳 undefined(對齊從未宣告的 window 變數,JSON.stringify 會省略)', function () {
    assert.isUndefined(dataStore.getData('rehabilitation'));
  });

  it('setData 後 getData 回傳同一參考', function () {
    const data = { rObject: [{ a: 1 }] };
    dataStore.setData('medication', data);
    assert.strictEqual(dataStore.getData('medication'), data);
  });

  it('clearAll 將所有已知型別重設為 null', function () {
    dataStore.setData('medication', { rObject: [1] });
    dataStore.setData('masterMenu', { rObject: [2] });
    dataStore.clearAll();
    assert.isNull(dataStore.getData('medication'));
    assert.isNull(dataStore.getData('masterMenu'));
  });

  it('subscribe 在 setData 時收到 (type, data),unsubscribe 後不再收到', function () {
    const listener = vi.fn();
    const unsubscribe = dataStore.subscribe(listener);

    const data = { rObject: [] };
    dataStore.setData('labdata', data);
    assert.deepEqual(listener.mock.calls, [['labdata', data]]);

    unsubscribe();
    dataStore.setData('labdata', { rObject: [1] });
    assert.equal(listener.mock.calls.length, 1);
  });

  it('subscribe 在 clearAll 時對每個已知型別各收到一次 (type, null)', function () {
    const listener = vi.fn();
    dataStore.subscribe(listener);
    dataStore.clearAll();
    assert.equal(listener.mock.calls.length, DATA_TYPES.length);
    assert.deepEqual(listener.mock.calls[0], [DATA_TYPES[0], null]);
  });

  it('某個 listener 拋錯不影響其他 listener', function () {
    const bad = vi.fn(() => { throw new Error('boom'); });
    const good = vi.fn();
    dataStore.subscribe(bad);
    dataStore.subscribe(good);
    dataStore.setData('imaging', { rObject: [] });
    assert.equal(good.mock.calls.length, 1);
  });

  it('setData 未知型別時 console.warn 但仍儲存(防 typo)', function () {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    dataStore.setData('labData', { rObject: [] }); // 大小寫錯誤的 typo
    assert.equal(warnSpy.mock.calls.length, 1);
    assert.isDefined(dataStore.getData('labData'));
    warnSpy.mockRestore();
  });
});
