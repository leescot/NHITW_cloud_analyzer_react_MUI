import { describe, it, assert, beforeEach } from 'vitest';
import { runCodeSetMigrations } from '../src/utils/codeSetMigration.js';

// 以可觀察的 in-memory store 覆蓋 vitest.setup.js 的 chrome stub
let store, setCalls;
beforeEach(() => {
  store = {};
  setCalls = [];
  globalThis.chrome.storage.sync.get = (defaults, cb) => {
    const base = Array.isArray(defaults)
      ? Object.fromEntries(defaults.map(k => [k, undefined]))
      : { ...defaults };
    cb({ ...base, ...store });
  };
  globalThis.chrome.storage.sync.set = (items, cb) => {
    setCalls.push(items);
    Object.assign(store, items);
    cb?.();
  };
});

describe('runCodeSetMigrations', () => {
  it('舊鍵有值且新鍵空 → 寫入 overlay;再跑一次不再寫(冪等)', async () => {
    store.focusedLabTests = [
      { orderCode: '09002C', displayName: 'BUN', enabled: false }, // 內建 bun 預設 enabled:true → 產生 override
    ];
    const written = await runCodeSetMigrations();
    assert.hasAllKeys(written, ['labFocusOverlay']);
    assert.deepEqual(written.labFocusOverlay.overrides.bun, { enabled: false, order: 0 });
    assert.equal(setCalls.length, 1);

    const second = await runCodeSetMigrations();
    assert.deepEqual(second, {});
    assert.equal(setCalls.length, 1); // 沒有第二次寫入
  });
  it('兩個舊鍵都有值 → 一次 set 寫兩鍵', async () => {
    store.focusedLabTests = [{ orderCode: '09002C', displayName: 'BUN', enabled: true }];
    store.focusedImageTests = [{ orderCode: '32001C', displayName: 'CXR', enabled: true }];
    const written = await runCodeSetMigrations();
    assert.hasAllKeys(written, ['labFocusOverlay', 'imageFocusOverlay']);
    assert.equal(setCalls.length, 1);
  });
  it('舊鍵不存在 → 不寫入(新安裝使用者)', async () => {
    const written = await runCodeSetMigrations();
    assert.deepEqual(written, {});
    assert.equal(setCalls.length, 0);
  });
  it('舊鍵是垃圾(非陣列)→ 不寫入不炸', async () => {
    store.focusedLabTests = 'garbage';
    const written = await runCodeSetMigrations();
    assert.deepEqual(written, {});
  });
});
