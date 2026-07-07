import { describe, it, assert } from 'vitest';
import { sanitizeOverlay, resolveCodeSet, migrateLegacyFocusList, diffToOverlay, buildCodeMatcher } from '../src/utils/codeSetResolver.js';

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

describe('migrateLegacyFocusList', () => {
  const BUILTIN2 = [
    { id: 'mri', label: 'MRI', codes: ['33085B', '33084B'], enabled: true,  order: 0 },
    { id: 'ct',  label: 'CT',  codes: ['33072B', '33070B'], enabled: true,  order: 1 },
    { id: 'cxr', label: 'CXR', codes: ['32001C'],           enabled: false, order: 2 },
  ];
  it('非陣列 → null(不遷移)', () => {
    assert.isNull(migrateLegacyFocusList(null, BUILTIN2));
    assert.isNull(migrateLegacyFocusList({}, BUILTIN2));
  });
  it('與內建完全一致 → 空 overlay(遷移完成標記,resolve 後等同內建)', () => {
    const legacy = [
      { orderCode: '33085B,33084B', displayName: 'MRI', enabled: true },
      { orderCode: '33072B,33070B', displayName: 'CT',  enabled: true },
      { orderCode: '32001C',        displayName: 'CXR', enabled: false },
    ];
    const overlay = migrateLegacyFocusList(legacy, BUILTIN2);
    assert.deepEqual(overlay, { overrides: {}, additions: [], removals: [] });
    assert.deepEqual(resolveCodeSet(BUILTIN2, overlay), BUILTIN2);
  });
  it('使用者改過 enabled/順序/名稱 → 記為 overrides;未知碼 → addition', () => {
    const legacy = [
      { orderCode: '32001C',        displayName: '胸部X光', enabled: true },   // 改名+啟用+提到第0位
      { orderCode: '33085B,33084B', displayName: 'MRI',     enabled: true },
      { orderCode: '99999X',        displayName: '自訂',     enabled: true },   // 內建沒有
    ];
    const overlay = migrateLegacyFocusList(legacy, BUILTIN2);
    assert.deepEqual(overlay.overrides.cxr, { enabled: true, order: 0, label: '胸部X光' });
    assert.deepEqual(overlay.overrides.mri, { order: 1 });
    assert.isUndefined(overlay.overrides.ct); // legacy 沒列 ct → 不動(內建升級項自動出現的語意)
    assert.deepEqual(overlay.additions, [
      { id: 'legacy:99999X', label: '自訂', codes: ['99999X'], enabled: true, order: 2 },
    ]);
  });
  it('壞 entry(無 orderCode)跳過', () => {
    const overlay = migrateLegacyFocusList([{ displayName: 'x' }, null, 'junk'], BUILTIN2);
    assert.deepEqual(overlay, { overrides: {}, additions: [], removals: [] });
  });
});

describe('diffToOverlay', () => {
  const BUILTIN3 = [
    { id: 'a', label: 'A', codes: ['01C'], enabled: true,  order: 0 },
    { id: 'b', label: 'B', codes: ['02C'], enabled: true,  order: 1 },
  ];
  it('無改動 → 空 overlay', () => {
    assert.deepEqual(diffToOverlay(BUILTIN3, BUILTIN3), { overrides: {}, additions: [], removals: [] });
  });
  it('改欄位/換順序/加項 → 對應 delta;round-trip 經 resolveCodeSet 還原工作清單', () => {
    const working = [
      { id: 'b', label: 'B', codes: ['02C'], enabled: false, order: 1 },                  // 提到第0位+停用
      { id: 'catalog:09C', label: 'X', codes: ['09C'], enabled: true, order: 99 },        // 加入項(order 以 index 為準)
      { id: 'a', label: 'A2', codes: ['01C'], enabled: true, order: 0 },                  // 改名+移到第2位
    ];
    const overlay = diffToOverlay(BUILTIN3, working);
    assert.deepEqual(overlay.overrides, {
      b: { enabled: false, order: 0 },
      a: { label: 'A2', order: 2 },
    });
    assert.deepEqual(overlay.additions, [
      { id: 'catalog:09C', label: 'X', codes: ['09C'], enabled: true, order: 1 },
    ]);
    assert.deepEqual(
      resolveCodeSet(BUILTIN3, overlay).map(i => i.id),
      ['b', 'catalog:09C', 'a']
    );
  });
});

describe('buildCodeMatcher', () => {
  const RESOLVED = [
    { id: 'mri', label: 'MRI', codes: ['33085B', '33084B'], enabled: true,  order: 0 },
    { id: 'cbc', label: 'CBC', codes: ['08011C', '08003C'], enabled: true,  order: 1 },
    { id: 'cxr', label: 'CXR', codes: ['32001C'],           enabled: false, order: 2 },
  ];
  it('codes = 啟用項展平(停用項不入);itemForCode 回對應項', () => {
    const m = buildCodeMatcher(RESOLVED);
    assert.deepEqual(m.codes, ['33085B', '33084B', '08011C', '08003C']);
    assert.equal(m.itemForCode('08003C').id, 'cbc');   // alias 第二碼也命中同一項
    assert.equal(m.itemForCode('33084B').id, 'mri');
    assert.isNull(m.itemForCode('32001C'));            // 停用
    assert.isNull(m.itemForCode('99999X'));            // 未知
  });
  it('同碼被兩項使用 → 先到先贏(order 排序後前者)', () => {
    const dup = [
      { id: 'x', label: 'X', codes: ['19009C'], enabled: true, order: 0 },
      { id: 'y', label: 'Y', codes: ['19009C'], enabled: true, order: 1 },
    ];
    const m = buildCodeMatcher(dup);
    assert.deepEqual(m.codes, ['19009C']);
    assert.equal(m.itemForCode('19009C').id, 'x');
  });
});
