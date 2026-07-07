import { describe, it, assert } from 'vitest';
import { sanitizeOverlay, resolveCodeSet } from '../src/utils/codeSetResolver.js';

const BUILTIN = [
  { id: 'a', label: 'A', codes: ['01C'], enabled: true,  order: 0 },
  { id: 'b', label: 'B', codes: ['02C'], enabled: true,  order: 1 },
  { id: 'c', label: 'C', codes: ['03C'], enabled: false, order: 2 },
];

describe('sanitizeOverlay', () => {
  it('null/undefined → null(合法:用內建)', () => {
    assert.isNull(sanitizeOverlay(null));
    assert.isNull(sanitizeOverlay(undefined));
  });
  it('非物件(陣列/字串/數字)→ null', () => {
    assert.isNull(sanitizeOverlay([]));
    assert.isNull(sanitizeOverlay('x'));
    assert.isNull(sanitizeOverlay(42));
  });
  it('壞欄位逐項丟棄:override 未知欄位剔除、addition 缺 codes 剔除、removals 非字串剔除', () => {
    const safe = sanitizeOverlay({
      overrides: { a: { enabled: false, evil: 'x', codes: ['99C'] }, b: 'junk' },
      additions: [
        { id: 'x', label: 'X', codes: ['09C'], enabled: true, order: 3 },
        { id: 'bad', label: 'Bad', codes: [], enabled: true, order: 4 },
        'junk',
      ],
      removals: ['x', 42, null],
    });
    assert.deepEqual(safe.overrides, { a: { enabled: false } }); // codes 不可覆寫
    assert.deepEqual(safe.additions.map(i => i.id), ['x']);
    assert.deepEqual(safe.removals, ['x']);
  });
});

describe('resolveCodeSet', () => {
  it('overlay null → 內建原樣(依 order 排序)', () => {
    assert.deepEqual(resolveCodeSet(BUILTIN, null), BUILTIN);
  });
  it('overrides 套用:enabled/label/order', () => {
    const out = resolveCodeSet(BUILTIN, {
      overrides: { a: { enabled: false }, c: { label: 'C改', order: 0 } },
      additions: [], removals: [],
    });
    // c 的 order 改 0,a 保持 0 → 排序穩定性不苛求,驗集合語意
    const byId = Object.fromEntries(out.map(i => [i.id, i]));
    assert.isFalse(byId.a.enabled);
    assert.equal(byId.c.label, 'C改');
    assert.equal(byId.c.order, 0);
    assert.deepEqual(byId.a.codes, ['01C']); // codes 不可被 override
  });
  it('additions 併入並參與排序;removals 濾掉同 id 的 addition', () => {
    const overlay = {
      overrides: {},
      additions: [
        { id: 'catalog:09C', label: 'X', codes: ['09C'], enabled: true, order: 1 },
        { id: 'catalog:08C', label: 'Y', codes: ['08C'], enabled: true, order: 5 },
      ],
      removals: ['catalog:08C'],
    };
    const out = resolveCodeSet(BUILTIN, overlay);
    assert.deepEqual(out.map(i => i.id), ['a', 'catalog:09C', 'b', 'c']);
  });
  it('整份 overlay 是垃圾 → 等同 null(不炸)', () => {
    assert.deepEqual(resolveCodeSet(BUILTIN, 'garbage'), BUILTIN);
  });
});
