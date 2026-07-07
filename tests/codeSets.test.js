import { describe, it, assert } from 'vitest';
import { CODE_SETS, getCodeSet } from '../src/config/codeSets.js';

describe('codeSets 宣告與內建資料結構', () => {
  it('宣告齊全:labFocus/imageFocus 各欄位型別正確', () => {
    assert.deepEqual(CODE_SETS.map(cs => cs.id), ['labFocus', 'imageFocus']);
    for (const cs of CODE_SETS) {
      assert.equal(cs.shape, 'list');
      assert.isString(cs.title);
      assert.isArray(cs.builtin);
      assert.isArray(cs.catalog);
      assert.isArray(cs.aliasPresets);
      assert.match(cs.storageKey, /Overlay$/);
      assert.isString(cs.legacyStorageKey);
    }
    assert.equal(getCodeSet('labFocus').storageKey, 'labFocusOverlay');
    assert.isUndefined(getCodeSet('nope'));
  });

  it('內建項目:id 唯一、codes 非空字串陣列、order 連續', () => {
    for (const cs of CODE_SETS) {
      const ids = cs.builtin.map(i => i.id);
      assert.equal(new Set(ids).size, ids.length, `${cs.id} id 重複`);
      cs.builtin.forEach((item, idx) => {
        assert.isString(item.label);
        assert.isArray(item.codes);
        assert.isAbove(item.codes.length, 0);
        item.codes.forEach(c => assert.isString(c));
        assert.isBoolean(item.enabled);
        assert.equal(item.order, idx, `${cs.id}/${item.id} order 不連續`);
      });
    }
  });

  it('labFocus 內建與舊 DEFAULT_LAB_TESTS 等價(碼與啟用狀態)', async () => {
    const { DEFAULT_LAB_TESTS } = await import('../src/config/labTests.js');
    const labFocus = getCodeSet('labFocus');
    assert.deepEqual(
      labFocus.builtin.map(i => ({ code: i.codes.join(','), enabled: i.enabled })),
      DEFAULT_LAB_TESTS.map(t => ({ code: t.orderCode, enabled: t.enabled }))
    );
  });

  it('imageFocus 內建與舊 DEFAULT_IMAGE_TESTS 等價(逗號串拆成 codes)', async () => {
    const { DEFAULT_IMAGE_TESTS } = await import('../src/config/imageTests.js');
    const imageFocus = getCodeSet('imageFocus');
    assert.deepEqual(
      imageFocus.builtin.map(i => ({ code: i.codes.join(','), enabled: i.enabled })),
      DEFAULT_IMAGE_TESTS.map(t => ({ code: t.orderCode, enabled: t.enabled }))
    );
  });

  it('目錄與 alias 組:code 不與內建重複且唯一、alias 組 id 有 alias: 前綴', () => {
    for (const cs of CODE_SETS) {
      const builtinCodes = new Set(cs.builtin.flatMap(i => i.codes));
      const catalogCodes = cs.catalog.map(e => e.code);
      assert.equal(new Set(catalogCodes).size, catalogCodes.length, `${cs.id} 目錄 code 重複`);
      cs.catalog.forEach(e => {
        assert.isString(e.code);
        assert.isString(e.label);
        assert.isAbove(e.label.length, 0);
        assert.isFalse(builtinCodes.has(e.code), `${cs.id} 目錄 ${e.code} 已在內建`);
      });
      cs.aliasPresets.forEach(p => {
        assert.match(p.id, /^alias:/);
        assert.isArray(p.codes);
        assert.isAbove(p.codes.length, 1, 'alias 組必須一對多');
      });
    }
  });

  it('LAB_CATALOG 為 KMUH 去重 + 手挑聯集(生成腳本有跑:至少 250 筆)', () => {
    assert.isAbove(getCodeSet('labFocus').catalog.length, 250);
  });
});
