# CodeSet Pilot(labFocus/imageFocus)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 總覽關注檢驗/影像清單改為 CodeSet overlay 模型:通用 CodeSetEditor、一對多代碼(alias)、目錄加入、還原預設,並一次性遷移既有使用者資料。

**Architecture:** 內建清單(config)為基底,使用者自訂只存 delta(overlay)到兩個新 sync 鍵;純函數 resolver 合成最終清單,消費端以「展平 codes」方式比對(alias 天然生效);通用編輯器依 `codeSets.js` 宣告渲染。Spec:`docs/superpowers/specs/2026-07-07-codeset-pilot-design.md`。

**Tech Stack:** React 18 + MUI(Chrome extension popup)、chrome.storage.sync、vitest + @testing-library/react(jsdom)。

## Global Constraints

- `chrome.storage.sync` 配額:單鍵 8KB/總量 100KB;overlay 只存 delta。
- `.test_data/` 為真實個資:**絕不 commit、不衍生 fixture**;入版控測資一律合成。
- resolver 全純函數,vitest headless 可跑;先 characterization 後重構。
- 基準:`npm test` 302 綠(+新增測試);`npm run build` exit 0。
- 設定備份契約「**加鍵不 bump version**」:新鍵自動入備份,信封 `version: 1` 不動。
- 舊鍵 `focusedLabTests`/`focusedImageTests` **保留不動**(可回滾);其 falsy 退回語意不變。
- commit 訊息前綴:`功能:/測試:/重構:/修復:/文件:/工具:`。
- 分支:直接在 `dev-techdebt-features` 上做。

## 已查證的資料事實(alias 預設組內容依據,2026-07-07 以 146 份真實測資掃描)

- **CBC**:`08011C`(全套血液檢查I);DOC/07 明載 alias 組 `['08011C','08003C']`。
- **CRP/hs-CRP**:同碼 `12015C`(hs-CRP 是其下 itemName 變體)→ **不需 alias 組**。
- **Cr/CCr**:同碼 `09015C`(`estimated Ccr(MDRD)` 是其下 itemName)→ 既有內建特殊處理已涵蓋,**不需 alias 組**。
- **尿蛋白**:UPCR/UACR 跨碼(`09040C`/`09016C`/`12111C`/院所自訂 `Y00002`)但同碼下有非目標項目,orderCode 層 alias 會誤抓 → **留待後續**(需 itemName 過濾能力)。
- 結論:alias 預設組初版只收 **CBC 一組**;此結論在 Task 11 補記回 spec。
- **檢驗目錄來源**:`.test_data/reference/kmuh_lab_reference_20260707.json`(KMUH 公開檢驗目錄,719 筆,**非個資**;檔案本身 gitignored,但衍生的健保醫令碼+名稱清單為公開標準資料,可進 config)。**同一檢驗會因分屬多科/檢體變體而重覆多列**(如 GPT 三列、glucose 四列)——目錄**以 order_code 去重**(比對只認 orderCode,科別不影響),每碼取最簡短名稱為代表標籤、手挑常用碼標籤優先;排除內建碼與逗號串組合套餐碼 → **301 筆** + 手挑補漏。

---

### Task 1: 內建資料 config(builtin/目錄/alias 組/宣告檔)

**Files:**
- Modify: `src/config/labTests.js`(檔尾新增)
- Modify: `src/config/imageTests.js`(檔尾新增)
- Create: `src/config/codeSetCatalog.js`
- Create: `src/config/codeSets.js`
- Test: `tests/codeSets.test.js`

**Interfaces:**
- Consumes: 無(純資料)。
- Produces: `LAB_FOCUS_BUILTIN`/`IMAGE_FOCUS_BUILTIN`(item 形狀 `{ id, label, codes: string[], enabled, order }`)、`LAB_CATALOG`/`IMAGE_CATALOG`(`{ code, label }`)、`LAB_ALIAS_PRESETS`(`{ id, label, codes }`)、`CODE_SETS`/`getCodeSet(id)`(宣告 `{ id, shape, title, builtin, catalog, aliasPresets, storageKey, legacyStorageKey }`)。

- [ ] **Step 1: 寫失敗測試**

```js
// tests/codeSets.test.js
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/codeSets.test.js`
Expected: FAIL(`codeSets.js` 不存在)

- [ ] **Step 3: 實作資料檔**

`src/config/labTests.js` 檔尾新增(舊匯出 `DEFAULT_LAB_TESTS`/`DEFAULT_LAB_COPY_ITEMS` 不動):

```js
/**
 * LAB_FOCUS_SPECIAL_CODES - 需要特殊處理的檢驗代碼(內容同 OverviewSettings 的 SPECIAL_LAB_CODES,Task 10 刪原處)
 * '-' 結尾者為前綴匹配(08011C- 涵蓋 CBC 全部偽代碼子項)。
 */
export const LAB_FOCUS_SPECIAL_CODES = ['09015C', '09040C', '12111C', '08011C-'];

/**
 * LAB_FOCUS_BUILTIN - labFocus 代碼集的內建基底(CodeSet 新模型)
 * 與 DEFAULT_LAB_TESTS 等價(tests/codeSets.test.js 鎖定);使用者自訂存 overlay delta。
 */
export const LAB_FOCUS_BUILTIN = [
  { id: 'wbc',      label: 'WBC',      codes: ['08011C-WBC'],      enabled: false, order: 0 },
  { id: 'hb',       label: 'Hb',       codes: ['08011C-Hb'],       enabled: true,  order: 1 },
  { id: 'platelet', label: 'Platelet', codes: ['08011C-Platelet'], enabled: false, order: 2 },
  { id: 'bun',      label: 'BUN',      codes: ['09002C'],          enabled: true,  order: 3 },
  { id: 'cr-gfr',   label: 'Cr & GFR', codes: ['09015C'],          enabled: true,  order: 4 },
  { id: 'upcr',     label: 'UPCR',     codes: ['09040C'],          enabled: true,  order: 5 },
  { id: 'uacr',     label: 'UACR',     codes: ['12111C'],          enabled: true,  order: 6 },
  { id: 'alb',      label: 'Alb',      codes: ['09038C'],          enabled: true,  order: 7 },
  { id: 'glucose',  label: 'Glucose',  codes: ['09005C'],          enabled: true,  order: 8 },
  { id: 'hba1c',    label: 'HbA1c',    codes: ['09006C'],          enabled: true,  order: 9 },
  { id: 'chol',     label: 'Chol',     codes: ['09001C'],          enabled: true,  order: 10 },
  { id: 'tg',       label: 'TG',       codes: ['09004C'],          enabled: true,  order: 11 },
  { id: 'hdl',      label: 'HDL',      codes: ['09043C'],          enabled: true,  order: 12 },
  { id: 'ldl',      label: 'LDL',      codes: ['09044C'],          enabled: true,  order: 13 },
  { id: 'na',       label: 'Na',       codes: ['09021C'],          enabled: true,  order: 14 },
  { id: 'k',        label: 'K',        codes: ['09022C'],          enabled: true,  order: 15 },
  { id: 'ca',       label: 'Ca',       codes: ['09011C'],          enabled: false, order: 16 },
  { id: 'p',        label: 'P',        codes: ['09012C'],          enabled: false, order: 17 },
  { id: 'ua',       label: 'U.A',      codes: ['09013C'],          enabled: true,  order: 18 },
  { id: 'got',      label: 'GOT',      codes: ['09025C'],          enabled: true,  order: 19 },
  { id: 'gpt',      label: 'GPT',      codes: ['09026C'],          enabled: true,  order: 20 },
  { id: 'alkp',     label: 'Alk-P',    codes: ['09027C'],          enabled: false, order: 21 },
  { id: 'bil-t',    label: 'Bil(T)',   codes: ['09029C'],          enabled: false, order: 22 },
  { id: 'bil-d',    label: 'Bil(D)',   codes: ['09030C'],          enabled: false, order: 23 },
  { id: 'r-gt',     label: 'r-GT',     codes: ['09031C'],          enabled: false, order: 24 },
];
```

注意:`DEFAULT_LAB_TESTS` 的順序是 WBC, Hb, Platelet, BUN, Cr & GFR, UPCR, UACR, Alb, Glucose, HbA1c, Chol, TG, HDL, LDL, Na, K, Ca, P, U.A, GOT, GPT, Alk-P, Bil(T), Bil(D), r-GT——上表逐項對齊,等價性由測試鎖定。

`src/config/imageTests.js` 檔尾新增:

```js
/**
 * IMAGE_FOCUS_BUILTIN - imageFocus 代碼集的內建基底(CodeSet 新模型)
 * 舊 DEFAULT_IMAGE_TESTS 的逗號串代碼正式拆為 codes 陣列(一對多 alias)。
 */
export const IMAGE_FOCUS_BUILTIN = [
  { id: 'mri',          label: '磁振造影(MRI)', codes: ['33085B', '33084B'], enabled: true,  order: 0 },
  { id: 'ct',           label: '電腦斷層(CT)',  codes: ['33072B', '33070B'], enabled: true,  order: 1 },
  { id: 'abd-echo',     label: '腹部超音波',    codes: ['19009C', '19001C'], enabled: true,  order: 2 },
  { id: 'other-echo',   label: '其他超音波',    codes: ['19009C'],           enabled: true,  order: 3 },
  { id: 'cardiac-echo', label: '心臟超音波',    codes: ['18006C'],           enabled: true,  order: 4 },
  { id: 'egd',          label: '胃鏡',          codes: ['28016C'],           enabled: true,  order: 5 },
  { id: 'cxr',          label: 'CXR',           codes: ['32001C'],           enabled: false, order: 6 },
  { id: 'ekg',          label: 'EKG',           codes: ['18001C'],           enabled: false, order: 7 },
];
```

Create `src/config/codeSetCatalog.js` ——**LAB_CATALOG 由一次性腳本生成**。KMUH 表同一檢驗因分屬多科/檢體變體會重覆多列(GPT 三列、glucose 四列),故**以 order_code 去重**、每碼取最簡短名稱為代表標籤(手挑常用碼標籤優先);排除內建碼與逗號串組合套餐碼。在 repo 根目錄執行:

```bash
python3 - <<'PYEOF'
import json, re

REF = '.test_data/reference/kmuh_lab_reference_20260707.json'
# LAB_FOCUS_BUILTIN 的純醫令碼(偽代碼 08011C-* 不會過 regex,列純碼 08011C 即可)
BUILTIN = {
    '08011C',
    '09002C', '09015C', '09040C', '12111C', '09038C', '09005C', '09006C',
    '09001C', '09004C', '09043C', '09044C', '09021C', '09022C', '09011C',
    '09012C', '09013C', '09025C', '09026C', '09027C', '09029C', '09030C', '09031C',
}
# 手挑常用碼:標籤較簡潔,優先蓋過 KMUH 名稱;也補 KMUH 表沒有的常用碼(如 Fe)
CURATED = {
    '09016C': 'Cr(Urine)', '09020C': 'Fe', '09023C': 'Cl', '09032C': 'CPK',
    '09033C': 'LDH', '09035C': 'TIBC', '09046B': 'Mg', '09064C': 'Lipase',
    '09071C': 'CK-MB', '12015C': 'CRP', '12116C': 'Ferritin',
    '09099C': 'Troponin I', '08005C': 'ESR', '08133B': 'Cystatin C', '12007C': 'AFP',
}

rows = json.load(open(REF))['rObject']
names_by_code = {}
for r in rows:
    c = (r.get('order_code') or '').strip()
    # 只收標準單碼(5 位數字+A/B/C);排除逗號串組合套餐與內建碼
    if not re.fullmatch(r'\d{5}[A-C]', c) or c in BUILTIN:
        continue
    label = re.sub(r'\s+', ' ', (r.get('order_english_name') or r.get('order_name') or '').strip())
    if label:
        names_by_code.setdefault(c, []).append(label)

# 每碼取最簡短名稱為代表標籤;手挑標籤優先
catalog = {c: min(ns, key=len) for c, ns in names_by_code.items()}
catalog.update(CURATED)

def js(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")

lines = [f"  {{ code: '{c}', label: '{js(catalog[c])}' }}," for c in sorted(catalog)]
body = '\n'.join(lines)

content = f"""/**
 * 代碼集目錄(catalog)與 alias 預設組
 *
 * - LAB_CATALOG:一對一常用檢驗項目,使用者從編輯器篩選加入(pilot 不開放自由輸入代碼)。
 *   來源:KMUH 公開檢驗目錄(www.kmuh.org.tw/Web/KMULab,2026-07-07 快照),
 *   以 order_code 去重(同檢驗跨科/檢體變體只取一,標籤取最簡短名稱)+
 *   專案手挑常用碼(標籤優先)。公開標準醫令碼,非個資。
 *   再生方式見 docs/superpowers/plans/2026-07-07-codeset-pilot.md Task 1;手動加行亦可。
 * - alias 預設組:專案維護的已知一對多代碼組合(2026-07-07 測資查證:
 *   CRP/hs-CRP 與 Cr/CCr 為同碼多 itemName 不需 alias;尿蛋白跨碼但有
 *   itemName 歧義留待後續;初版僅 CBC)。
 */
export const LAB_CATALOG = [
{body}
];

export const IMAGE_CATALOG = [
  {{ code: '32011C', label: '脊椎X光' }},
  {{ code: '32006C', label: 'KUB' }},
  {{ code: '19005C', label: '其他超音波(19005C)' }},
  {{ code: '18007C', label: '心臟都卜勒血流圖' }},
  {{ code: '32018C', label: '下肢骨關節X光' }},
];

export const LAB_ALIAS_PRESETS = [
  {{ id: 'alias:cbc', label: 'CBC', codes: ['08011C', '08003C'] }},
];

export const IMAGE_ALIAS_PRESETS = [];
"""
open('src/config/codeSetCatalog.js', 'w').write(content)
print(f'寫入 {len(catalog)} 筆 LAB_CATALOG')
PYEOF
```

Expected: `寫入 30X 筆 LAB_CATALOG`(KMUH 去重 301 + 手挑補漏,聯集約 300 出頭)。生成後**檢視檔案**確認格式正確(引號跳脫、無亂碼),並抽查 `09026C` 不在目錄(內建 GPT)、`09033C → LDH`(手挑標籤生效)。生成的檔案即以下靜態內容(IMAGE_CATALOG 等後段固定):

```js
export const IMAGE_CATALOG = [
  { code: '32011C', label: '脊椎X光' },
  { code: '32006C', label: 'KUB' },
  { code: '19005C', label: '其他超音波(19005C)' },
  { code: '18007C', label: '心臟都卜勒血流圖' },
  { code: '32018C', label: '下肢骨關節X光' },
];

export const LAB_ALIAS_PRESETS = [
  { id: 'alias:cbc', label: 'CBC', codes: ['08011C', '08003C'] },
];

export const IMAGE_ALIAS_PRESETS = [];
```

Create `src/config/codeSets.js`:

```js
// 代碼集宣告(DOC/07 方向五)。通用編輯器與 resolver 都吃這份宣告;
// 未來收斂 labChooseCopyItems/atc5 = 再加一份宣告,不再複製編輯 UI。
import { LAB_FOCUS_BUILTIN } from './labTests';
import { IMAGE_FOCUS_BUILTIN } from './imageTests';
import {
  LAB_CATALOG, IMAGE_CATALOG, LAB_ALIAS_PRESETS, IMAGE_ALIAS_PRESETS,
} from './codeSetCatalog';

export const CODE_SETS = [
  {
    id: 'labFocus',
    shape: 'list',
    title: '關注檢驗清單設定',
    builtin: LAB_FOCUS_BUILTIN,
    catalog: LAB_CATALOG,
    aliasPresets: LAB_ALIAS_PRESETS,
    storageKey: 'labFocusOverlay',
    legacyStorageKey: 'focusedLabTests',
  },
  {
    id: 'imageFocus',
    shape: 'list',
    title: '關注影像清單設定',
    builtin: IMAGE_FOCUS_BUILTIN,
    catalog: IMAGE_CATALOG,
    aliasPresets: IMAGE_ALIAS_PRESETS,
    storageKey: 'imageFocusOverlay',
    legacyStorageKey: 'focusedImageTests',
  },
];

export const getCodeSet = (id) => CODE_SETS.find(cs => cs.id === id);
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/codeSets.test.js`
Expected: PASS(6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/config/labTests.js src/config/imageTests.js src/config/codeSetCatalog.js src/config/codeSets.js tests/codeSets.test.js
git commit -m "功能:CodeSet 內建資料與宣告檔(builtin、KMUH 去重目錄約 300 筆、CBC alias 組)"
```

---

### Task 2: Characterization 測試(總覽兩消費端現狀鎖定)

**Files:**
- Test: `tests/overviewFocus.characterization.test.jsx`

**Interfaces:**
- Consumes: 現有 `Overview_LabTests`/`Overview_ImagingTests` 元件(重構前行為)。
- Produces: 行為基準——Task 7/8 重構後此檔**必須原樣保持綠**(允許的唯一例外見 Task 7 Step 3 註記)。

**重點**:`overviewSettings` 同時給齊新舊兩種形態(`focusedLabTests`+`labFocusOverlay: null`),重構前元件讀舊鍵、重構後讀新鍵,斷言不變。合成資料,不用 `.test_data`。

- [ ] **Step 1: 寫 characterization 測試(現狀應直接通過)**

```jsx
// tests/overviewFocus.characterization.test.jsx
// 總覽關注檢驗/影像比對行為基準(CodeSet 重構前鎖定;重構後必須原樣保持綠)。
// overviewSettings 同時提供新舊兩種設定形態:重構前讀 focusedLabTests/focusedImageTests,
// 重構後讀 labFocusOverlay/imageFocusOverlay(null = 用內建預設,兩者等價)。
import { describe, it, assert } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import Overview_LabTests from '../src/components/tabs/Overview_LabTests.jsx';
import Overview_ImagingTests from '../src/components/tabs/Overview_ImagingTests.jsx';
import { SettingsProvider } from '../src/contexts/SettingsContext.jsx';
import { DEFAULT_LAB_TESTS } from '../src/config/labTests.js';
import { DEFAULT_IMAGE_TESTS } from '../src/config/imageTests.js';

function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

const overviewSettings = {
  labTrackingDays: 90,
  imageTrackingDays: 90,
  focusedLabTests: DEFAULT_LAB_TESTS,
  focusedImageTests: DEFAULT_IMAGE_TESTS,
  labFocusOverlay: null,
  imageFocusOverlay: null,
};

const labGroups = () => [{
  date: daysAgo(3),
  labs: [
    // CBC 子項:資料端 orderCode 是 08011C,靠 orderName 含 CBC + itemName 判子項(偽代碼 08011C-Hb)
    { orderCode: '08011C', orderName: 'CBC-I(WBC,RBC,HB,HCT,PLATELET COUNT,MCV,MCH,MCHC)', itemName: 'Hb', value: '13.5', unit: 'g/dL' },
    // 09015C 三分:無 GFR 字樣 → Cr;assayMethod 健保署計算 → eGFR(健保署)
    { orderCode: '09015C', itemName: 'Creatinine', value: '1.08', unit: 'mg/dL' },
    { orderCode: '09015C', itemName: 'GFR', assayMethod: '健保署計算', value: '85.2' },
    // 09040C:itemName 含 UPCR 才顯示
    { orderCode: '09040C', itemName: 'Urine protein/Creatinine ratio(UPCR)', value: '150.7' },
    // 標準碼
    { orderCode: '09002C', itemName: 'BUN', value: '23.4', unit: 'mg/dL' },
    // 預設停用(Ca)→ 不顯示
    { orderCode: '09011C', itemName: 'Ca', value: '9.87' },
    // 不在清單(Cl)→ 不顯示
    { orderCode: '09023C', itemName: 'Cl', value: '104.3' },
  ],
}];

describe('Overview 關注清單 characterization(重構行為基準)', () => {
  it('關注檢驗:CBC 子項/09015C 三分/UPCR 過濾/標準碼/停用與未列碼', () => {
    const { container } = render(
      <SettingsProvider>
        <Overview_LabTests
          groupedLabs={labGroups()}
          overviewSettings={overviewSettings}
          labSettings={{ highlightAbnormalLab: true }}
        />
      </SettingsProvider>
    );
    const text = container.textContent;
    assert.include(text, 'Hb');
    assert.include(text, '13.5');
    assert.include(text, '1.08');           // Cr
    assert.include(text, 'eGFR(健保署)');
    assert.include(text, '85.2');
    assert.include(text, 'UPCR');
    assert.include(text, '150.7');
    assert.include(text, 'BUN');
    assert.include(text, '23.4');
    assert.notInclude(text, '9.87');        // Ca 預設停用
    assert.notInclude(text, '104.3');       // 09023C 不在清單
  });

  it('關注影像:啟用碼(MRI)顯示、停用碼(CXR)隱藏', () => {
    const imagingData = {
      withReport: [
        { date: daysAgo(5), order_code: '33084B', orderName: '磁振造影檢查', inspectResult: 'Imaging findings: no acute lesion' },
      ],
      withoutReport: [
        { date: daysAgo(6), order_code: '32001C', orderName: '胸腔檢查' },
      ],
    };
    const { container } = render(
      <Overview_ImagingTests imagingData={imagingData} overviewSettings={overviewSettings} />
    );
    const text = container.textContent;
    assert.include(text, '磁振造影檢查');
    assert.notInclude(text, '胸腔檢查');
  });
});
```

- [ ] **Step 2: 跑測試——若有斷言不合現狀,修斷言不修元件**

Run: `npx vitest run tests/overviewFocus.characterization.test.jsx`
Expected: PASS(2 tests)。若 FAIL:這是 characterization——以實際渲染輸出為準修正**斷言**(例如某欄位實際不渲染 value),絕不改元件。可用 `console.log(container.textContent)` 檢視實際輸出後校準。

- [ ] **Step 3: 全量測試確認無迴歸**

Run: `npm test`
Expected: 全綠(302 基準 + Task 1/2 新增,零 fail)

- [ ] **Step 4: Commit**

```bash
git add tests/overviewFocus.characterization.test.jsx
git commit -m "測試:總覽關注檢驗/影像比對行為基準(CodeSet 重構前 characterization)"
```

---

### Task 3: resolver 純函數(sanitizeOverlay + resolveCodeSet)

**Files:**
- Create: `src/utils/codeSetResolver.js`
- Test: `tests/codeSetResolver.test.js`

**Interfaces:**
- Consumes: 無(純函數;builtin 形狀同 Task 1)。
- Produces:
  - `sanitizeOverlay(raw)` → `null` | `{ overrides: {[id]: {label?, enabled?, order?}}, additions: Item[], removals: string[] }`(壞結構→`null`+warn;壞欄位逐項丟棄)
  - `resolveCodeSet(builtin, overlay)` → `Item[]`(套 overrides、併 additions、濾 removals、依 order 升冪)

- [ ] **Step 1: 寫失敗測試**

```js
// tests/codeSetResolver.test.js
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/codeSetResolver.test.js`
Expected: FAIL(模組不存在)

- [ ] **Step 3: 實作**

```js
// src/utils/codeSetResolver.js
// CodeSet 純函數層(DOC/07 方向五):overlay 合成、遷移、diff。
// 不碰 chrome API——vitest headless 直測;storage 讀寫在 codeSetMigration.js 與 UI 層。

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const isValidItem = (it) =>
  isPlainObject(it) &&
  typeof it.id === 'string' && it.id !== '' &&
  typeof it.label === 'string' &&
  Array.isArray(it.codes) && it.codes.length > 0 &&
  it.codes.every(c => typeof c === 'string' && c !== '') &&
  typeof it.enabled === 'boolean' &&
  typeof it.order === 'number';

/** 防禦性解析 overlay:壞結構整份視同 null(用內建),壞欄位逐項丟棄。 */
export const sanitizeOverlay = (raw) => {
  if (raw == null) return null;
  if (!isPlainObject(raw)) {
    console.warn('[codeSet] overlay 結構不合法,改用內建預設', raw);
    return null;
  }
  const overrides = {};
  if (isPlainObject(raw.overrides)) {
    for (const [id, patch] of Object.entries(raw.overrides)) {
      if (!isPlainObject(patch)) continue;
      const clean = {};
      if (typeof patch.label === 'string' && patch.label !== '') clean.label = patch.label;
      if (typeof patch.enabled === 'boolean') clean.enabled = patch.enabled;
      if (typeof patch.order === 'number') clean.order = patch.order;
      if (Object.keys(clean).length > 0) overrides[id] = clean;
    }
  }
  const additions = Array.isArray(raw.additions)
    ? raw.additions.filter(isValidItem).map(it => ({
        id: it.id, label: it.label, codes: [...it.codes], enabled: it.enabled, order: it.order,
      }))
    : [];
  const removals = Array.isArray(raw.removals)
    ? raw.removals.filter(r => typeof r === 'string')
    : [];
  return { overrides, additions, removals };
};

/** 內建基底 + overlay delta → 最終清單(依 order 升冪)。 */
export const resolveCodeSet = (builtin, overlay) => {
  const safe = sanitizeOverlay(overlay);
  const overrides = safe?.overrides ?? {};
  const removals = new Set(safe?.removals ?? []);
  const base = builtin.map(item => ({ ...item, ...(overrides[item.id] ?? {}) }));
  const additions = (safe?.additions ?? []).filter(a => !removals.has(a.id));
  return [...base, ...additions].sort((a, b) => a.order - b.order);
};
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/codeSetResolver.test.js`
Expected: PASS(7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/codeSetResolver.js tests/codeSetResolver.test.js
git commit -m "功能:codeSetResolver 純函數(sanitizeOverlay/resolveCodeSet)"
```

---

### Task 4: resolver 純函數(migrateLegacyFocusList + diffToOverlay)

**Files:**
- Modify: `src/utils/codeSetResolver.js`(檔尾新增)
- Test: `tests/codeSetResolver.test.js`(新增 describe)

**Interfaces:**
- Consumes: Task 3 的 `isPlainObject`(檔內)、item 形狀。
- Produces:
  - `migrateLegacyFocusList(legacy, builtin)` → overlay | `null`(legacy 非陣列)。以「codes 集合相等」對回內建 id;對不上→addition(`id: 'legacy:<orderCode>'`);**空 diff 也回傳空 overlay 物件**(= 已遷移標記,冪等)。
  - `diffToOverlay(builtin, workingList)` → overlay。workingList 的 index 即 order;與內建同 id 者只記差異欄位。

- [ ] **Step 1: 寫失敗測試(附加到 tests/codeSetResolver.test.js)**

```js
import { migrateLegacyFocusList, diffToOverlay } from '../src/utils/codeSetResolver.js';

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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/codeSetResolver.test.js`
Expected: FAIL(函數未定義)

- [ ] **Step 3: 實作(codeSetResolver.js 檔尾新增)**

```js
/**
 * 舊 focusedLabTests/focusedImageTests 全量陣列 → overlay(一次性遷移)。
 * 以「codes 集合相等」對回內建項(舊影像逗號串拆陣列比對);對不上者轉 addition。
 * 與內建無差異也回傳空 overlay 物件——寫入後新鍵非 null 即「已遷移」標記(冪等)。
 */
export const migrateLegacyFocusList = (legacy, builtin) => {
  if (!Array.isArray(legacy)) return null;
  const codesKey = (codes) => [...codes].sort().join(',');
  const byCodes = new Map(builtin.map(item => [codesKey(item.codes), item]));
  const overrides = {};
  const additions = [];
  legacy.forEach((entry, index) => {
    if (!isPlainObject(entry) || typeof entry.orderCode !== 'string' || entry.orderCode === '') return;
    const codes = entry.orderCode.split(',').map(c => c.trim()).filter(Boolean);
    const match = byCodes.get(codesKey(codes));
    const enabled = !!entry.enabled;
    const label = typeof entry.displayName === 'string' && entry.displayName !== '' ? entry.displayName : null;
    if (match) {
      const patch = {};
      if (enabled !== match.enabled) patch.enabled = enabled;
      if (index !== match.order) patch.order = index;
      if (label !== null && label !== match.label) patch.label = label;
      if (Object.keys(patch).length > 0) overrides[match.id] = patch;
    } else {
      additions.push({
        id: `legacy:${entry.orderCode}`,
        label: label ?? entry.orderCode,
        codes,
        enabled,
        order: index,
      });
    }
  });
  return { overrides, additions, removals: [] };
};

/**
 * 編輯器工作清單(全量、依顯示順序)→ overlay delta。
 * workingList 的 index 即有效 order;內建項只記與基底不同的欄位。
 */
export const diffToOverlay = (builtin, workingList) => {
  const builtinById = new Map(builtin.map(item => [item.id, item]));
  const overrides = {};
  const additions = [];
  workingList.forEach((item, index) => {
    const base = builtinById.get(item.id);
    if (base) {
      const patch = {};
      if (item.label !== base.label) patch.label = item.label;
      if (item.enabled !== base.enabled) patch.enabled = item.enabled;
      if (index !== base.order) patch.order = index;
      if (Object.keys(patch).length > 0) overrides[item.id] = patch;
    } else {
      additions.push({ id: item.id, label: item.label, codes: [...item.codes], enabled: item.enabled, order: index });
    }
  });
  return { overrides, additions, removals: [] };
};
```

註:`removals` 欄位保留於格式並由 `resolveCodeSet` 尊重(向前相容),但編輯器移除加入項=直接不寫入 additions,故 diff 端恆產空陣列。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/codeSetResolver.test.js`
Expected: PASS(13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/codeSetResolver.js tests/codeSetResolver.test.js
git commit -m "功能:codeSetResolver 遷移與 diff(migrateLegacyFocusList/diffToOverlay)"
```

---

### Task 5: buildCodeMatcher + 設定 schema 兩新鍵(fixture 52→54)

**Files:**
- Modify: `src/utils/codeSetResolver.js`(檔尾新增)
- Modify: `src/config/defaultSettings.js`(overview section)
- Modify: `tests/fixtures/storageKeys.js`
- Test: `tests/codeSetResolver.test.js`(新增 describe)

**Interfaces:**
- Consumes: Task 3 的 resolved item 形狀。
- Produces:
  - `buildCodeMatcher(resolvedList)` → `{ codes: string[], itemForCode(code) }`:啟用項的 codes 展平(去重,先到先贏);消費端沿用既有 `targetOrderCodes.includes(...)` 型比對,alias 天然生效。
  - storage 新鍵 `labFocusOverlay`/`imageFocusOverlay`(預設 `null`,section `overview`),經 settingsSchema 自動流入 `appSettings.overview.*` 與設定備份。

- [ ] **Step 1: 寫失敗測試(附加到 tests/codeSetResolver.test.js)**

```js
import { buildCodeMatcher } from '../src/utils/codeSetResolver.js';

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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/codeSetResolver.test.js`
Expected: FAIL(buildCodeMatcher 未定義)

- [ ] **Step 3: 實作 buildCodeMatcher(codeSetResolver.js 檔尾新增)**

```js
/**
 * 啟用項的代碼展平 + 反查。消費端沿用既有「codes 陣列 includes」型比對:
 * - 精確碼與 alias:展平後自然涵蓋(任一 code 命中即該項命中)
 * - 08011C- 偽代碼:留在展平集合,由消費端既有 CBC 判讀特例處理
 * - 影像多代碼:builtin 已是陣列,不再有逗號串
 */
export const buildCodeMatcher = (resolvedList) => {
  const itemByCode = new Map();
  resolvedList
    .filter(item => item.enabled)
    .forEach(item => {
      item.codes.forEach(code => {
        if (!itemByCode.has(code)) itemByCode.set(code, item);
      });
    });
  return {
    codes: [...itemByCode.keys()],
    itemForCode: (code) => itemByCode.get(code) ?? null,
  };
};
```

- [ ] **Step 4: defaultSettings 加兩鍵**

`src/config/defaultSettings.js` 的 `overview` section(99 行起)改為:

```js
  overview: {
    medicationTrackingDays: 100,
    labTrackingDays: 180,
    imageTrackingDays: 180,
    focusedLabTests: DEFAULT_LAB_TESTS,
    focusedImageTests: DEFAULT_IMAGE_TESTS,
    // CodeSet overlay(null = 無自訂,用內建;spec 2026-07-07-codeset-pilot-design.md)
    labFocusOverlay: null,
    imageFocusOverlay: null,
  },
```

- [ ] **Step 5: 更新 storageKeys fixture(52→54)**

`tests/fixtures/storageKeys.js`:
1. 首行註解 `52 鍵` 改 `54 鍵`。
2. overview 區塊註解 `// overview (5)` 改 `// overview (7)`,並在 `'focusedLabTests', 'focusedImageTests',` 之後加一行:

```js
  'labFocusOverlay', 'imageFocusOverlay',
```

注意:fixture 陣列結尾是 `].sort()`(自排序),所以兩鍵放在 overview 區塊即可,分區只為可讀性。同步把 `tests/settingsSchema.test.js:14` 與 `tests/settingsBackup.test.js:19,69` 測名中的 `52 鍵` 字樣改 `54 鍵`。

- [ ] **Step 6: 全量測試(schema/備份 round-trip 隨 fixture 自動涵蓋新鍵)**

Run: `npm test`
Expected: 全綠。`settingsBackup` 既有測試以 `SETTINGS_SCHEMA` 驅動,新鍵自動參與匯出/匯入 round-trip 驗證。

- [ ] **Step 7: Commit**

```bash
git add src/utils/codeSetResolver.js src/config/defaultSettings.js tests/fixtures/storageKeys.js tests/settingsSchema.test.js tests/settingsBackup.test.js tests/codeSetResolver.test.js
git commit -m "功能:buildCodeMatcher + overlay 兩新鍵入 schema(52→54,自動入設定備份)"
```

---

### Task 6: 遷移執行點(codeSetMigration.js + settingsManager 接線)

**Files:**
- Create: `src/utils/codeSetMigration.js`
- Modify: `src/utils/settingsManager.js:12-16`(loadAllSettings)
- Test: `tests/codeSetMigration.test.js`

**Interfaces:**
- Consumes: `CODE_SETS`(Task 1)、`migrateLegacyFocusList`(Task 4)、`chrome.storage.sync`。
- Produces: `runCodeSetMigrations()` → Promise<object>(本次寫入的鍵值;無事可做回 `{}`)。冪等:新鍵非 null 就跳過。呼叫點:`loadAllSettings`(頁面端)與 `CodeSetEditor` 開啟時(Task 8,popup 端)。

- [ ] **Step 1: 寫失敗測試**

```js
// tests/codeSetMigration.test.js
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/codeSetMigration.test.js`
Expected: FAIL(模組不存在)

- [ ] **Step 3: 實作**

```js
// src/utils/codeSetMigration.js
// 舊 focusedLabTests/focusedImageTests → overlay 的一次性遷移(冪等)。
// 舊鍵保留不動(可回滾、舊版降級不炸);新鍵非 null 即視為已遷移。
import { CODE_SETS } from '../config/codeSets';
import { migrateLegacyFocusList } from './codeSetResolver';

export const runCodeSetMigrations = () => new Promise((resolve) => {
  const keys = CODE_SETS.flatMap(cs => [cs.storageKey, cs.legacyStorageKey]);
  chrome.storage.sync.get(keys, (items) => {
    const updates = {};
    CODE_SETS.forEach(cs => {
      if (items[cs.storageKey] != null) return; // 已遷移(或使用者已有 overlay)
      const legacy = items[cs.legacyStorageKey];
      if (!Array.isArray(legacy) || legacy.length === 0) return; // 新安裝或垃圾:不動
      const overlay = migrateLegacyFocusList(legacy, cs.builtin);
      if (overlay) updates[cs.storageKey] = overlay;
    });
    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates, () => resolve(updates));
    } else {
      resolve(updates);
    }
  });
});
```

`src/utils/settingsManager.js` 的 `loadAllSettings`(12 行)改為(import 區加 `import { runCodeSetMigrations } from './codeSetMigration';`):

```js
export const loadAllSettings = async () => {
  await runCodeSetMigrations(); // CodeSet 一次性遷移(冪等;已遷移時只是一次 get)
  return new Promise((resolve) => {
    chrome.storage.sync.get(buildStorageDefaults(), (items) => {
      resolve(structureFromFlat(items));
    });
  });
};
```

- [ ] **Step 4: 跑測試確認通過 + 全量**

Run: `npx vitest run tests/codeSetMigration.test.js && npm test`
Expected: 新檔 4 綠;全量全綠(settingsManager 測試不受影響——stub 的 get 對未知鍵回 defaults)

- [ ] **Step 5: Commit**

```bash
git add src/utils/codeSetMigration.js src/utils/settingsManager.js tests/codeSetMigration.test.js
git commit -m "功能:CodeSet 一次性冪等遷移(runCodeSetMigrations,接入 loadAllSettings)"
```

---

### Task 7: Overview_LabTests 切換到 resolver(characterization 保持綠)

**Files:**
- Modify: `src/components/tabs/Overview_LabTests.jsx:17,31,120-154`

**Interfaces:**
- Consumes: `resolveCodeSet`/`buildCodeMatcher`(Task 3/5)、`LAB_FOCUS_BUILTIN`/`LAB_FOCUS_SPECIAL_CODES`(Task 1)、`overviewSettings.labFocusOverlay`。
- Produces: 無新介面(內部重構)。`labTestsConfig`/`targetOrderCodes`/`orderCodeToName` 形狀不變,下游(CBC 掃描、special handlers、CKM 追加)零改動。

- [ ] **Step 1: 改 import(17 行)**

```js
// 舊:
import { FALLBACK_LAB_TESTS, SPECIAL_LAB_CODES } from '../settings/OverviewSettings';
// 新:
import { LAB_FOCUS_BUILTIN, LAB_FOCUS_SPECIAL_CODES } from '../../config/labTests';
import { resolveCodeSet, buildCodeMatcher } from '../../utils/codeSetResolver';
```

- [ ] **Step 2: 換掉 labTestsConfig 建構(120-145 行的 IIFE)**

```js
          // CodeSet:內建基底 + 使用者 overlay → 展平 codes(alias 任一碼命中即該項命中)。
          // null/壞 overlay 由 resolver 退回內建預設,原 FALLBACK 分支不再需要。
          const matcher = buildCodeMatcher(
            resolveCodeSet(LAB_FOCUS_BUILTIN, overviewSettings.labFocusOverlay ?? null)
          );
          const labTestsConfig = matcher.codes.map(code => {
            const isSpecial = LAB_FOCUS_SPECIAL_CODES.some(sc =>
              code === sc || (sc.endsWith('-') && code.startsWith(sc))
            );
            return {
              orderCode: code,
              displayName: isSpecial ? 'Special' : matcher.itemForCode(code).label,
            };
          });
```

其後的 `orderCodeToName`(147-151)、`targetOrderCodes`(154)、CBC 掃描、special handlers、CKM 段**全部原樣不動**(它們只認 `labTestsConfig` 的形狀)。

**行為變化(有意,記入 commit 訊息)**:settings 未載入時的 fallback 從 5 項 `FALLBACK_LAB_TESTS` 變為內建預設啟用項(17 項)——此路徑僅出現在設定載入前的瞬間渲染。

- [ ] **Step 3: 跑 characterization + 全量**

Run: `npx vitest run tests/overviewFocus.characterization.test.jsx && npm test`
Expected: characterization 2 綠(斷言零修改);全量全綠

- [ ] **Step 4: Commit**

```bash
git add src/components/tabs/Overview_LabTests.jsx
git commit -m "重構:Overview_LabTests 改吃 CodeSet resolver(alias 展平;fallback 改內建預設)"
```

---

### Task 8: Overview_ImagingTests 切換到 resolver

**Files:**
- Modify: `src/components/tabs/Overview_ImagingTests.jsx:32,175-179`

**Interfaces:**
- Consumes: 同 Task 7(imageFocus 側)。
- Produces: 無新介面。`enabledOrderCodes` 形狀不變(string[]),下游 `test.order_code.includes(code)` 比對不動。

- [ ] **Step 1: 改 import(32 行)**

```js
// 舊:
import { DEFAULT_IMAGE_TESTS } from '../../config/imageTests';
// 新:
import { IMAGE_FOCUS_BUILTIN } from '../../config/imageTests';
import { resolveCodeSet, buildCodeMatcher } from '../../utils/codeSetResolver';
```

同時把元件參數預設值 `overviewSettings = { imageTrackingDays: 90, focusedImageTests: DEFAULT_IMAGE_TESTS }`(86 行)改為 `overviewSettings = { imageTrackingDays: 90 }`(overlay 缺值由 resolver 退內建)。

- [ ] **Step 2: 換掉 enabledOrderCodes(175-179 行)**

```js
    // CodeSet:啟用項 codes 展平(逗號串已在 builtin 拆為陣列)
    const enabledOrderCodes = buildCodeMatcher(
      resolveCodeSet(IMAGE_FOCUS_BUILTIN, overviewSettings.imageFocusOverlay ?? null)
    ).codes;
```

- [ ] **Step 3: 跑 characterization + 全量**

Run: `npx vitest run tests/overviewFocus.characterization.test.jsx && npm test`
Expected: 全綠(斷言零修改)

- [ ] **Step 4: Commit**

```bash
git add src/components/tabs/Overview_ImagingTests.jsx
git commit -m "重構:Overview_ImagingTests 改吃 CodeSet resolver(刪逗號串 split)"
```

---

### Task 9: CodeSetEditor 通用編輯器元件

**Files:**
- Create: `src/components/settings/CodeSetEditor.jsx`
- Test: `tests/codeSetEditor.test.jsx`

**Interfaces:**
- Consumes: `getCodeSet(id)`(Task 1)、`resolveCodeSet`/`diffToOverlay`(Task 3/4)、`runCodeSetMigrations`(Task 6)、`chrome.storage.sync`。
- Produces: `<CodeSetEditor codeSetId open onClose />`。保存時寫 `{ [storageKey]: overlay }` 並發 `settingChanged` 訊息;「全部還原」寫 `null`。

- [ ] **Step 1: 寫失敗測試**

```jsx
// tests/codeSetEditor.test.jsx
import { describe, it, assert, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import CodeSetEditor from '../src/components/settings/CodeSetEditor.jsx';

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
  globalThis.chrome.tabs = {
    query: (_q, cb) => cb([]),
    sendMessage: () => {},
  };
});

describe('CodeSetEditor(labFocus)', () => {
  it('開啟時渲染內建清單(依 order),代碼以小字顯示', async () => {
    const { findByText, getByText } = render(
      <CodeSetEditor codeSetId="labFocus" open onClose={() => {}} />
    );
    await findByText('Hb');            // 內建項 label
    getByText('BUN');
    getByText('09002C');               // 代碼小字
  });

  it('切換啟用+保存 → 寫入 overlay delta 並關閉', async () => {
    let closed = false;
    const { findByText, getAllByRole, getByRole } = render(
      <CodeSetEditor codeSetId="labFocus" open onClose={() => { closed = true; }} />
    );
    await findByText('Hb');
    // 第一個 checkbox 是 WBC(內建停用)→ 勾選改啟用
    fireEvent.click(getAllByRole('checkbox')[0]);
    fireEvent.click(getByRole('button', { name: '保存' }));
    await waitFor(() => assert.isTrue(closed));
    assert.equal(setCalls.length, 1);
    assert.deepEqual(setCalls[0].labFocusOverlay.overrides.wbc, { enabled: true });
    assert.deepEqual(setCalls[0].labFocusOverlay.additions, []);
  });

  it('從目錄加入一對一項、從 alias 組加入 CBC → 保存進 additions', async () => {
    const { findByText, getByText, getByRole } = render(
      <CodeSetEditor codeSetId="labFocus" open onClose={() => {}} />
    );
    await findByText('Hb');
    fireEvent.click(getByRole('button', { name: '從常用項目加入' }));
    fireEvent.click(getByText('CRP'));          // 目錄項:點擊即加入
    fireEvent.click(getByText('CBC'));          // alias 組:點擊即加入
    fireEvent.click(getByRole('button', { name: '保存' }));
    await waitFor(() => assert.equal(setCalls.length, 1));
    const adds = setCalls[0].labFocusOverlay.additions;
    assert.deepEqual(adds.map(a => a.id), ['catalog:12015C', 'alias:cbc']);
    assert.deepEqual(adds[1].codes, ['08011C', '08003C']);
  });

  it('全部還原預設:二次確認後寫 null', async () => {
    store.labFocusOverlay = { overrides: { wbc: { enabled: true } }, additions: [], removals: [] };
    const { findByText, getByRole } = render(
      <CodeSetEditor codeSetId="labFocus" open onClose={() => {}} />
    );
    await findByText('Hb');
    fireEvent.click(getByRole('button', { name: '全部還原預設' }));
    fireEvent.click(getByRole('button', { name: '確認還原' }));
    await waitFor(() => assert.equal(setCalls.length, 1));
    assert.isNull(setCalls[0].labFocusOverlay);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/codeSetEditor.test.jsx`
Expected: FAIL(元件不存在)

- [ ] **Step 3: 實作元件**

```jsx
// src/components/settings/CodeSetEditor.jsx
// 通用代碼集編輯器(DOC/07 方向五 pilot):依 codeSets.js 宣告渲染 list shape。
// temp state(workingList)→ 保存時 diffToOverlay 寫回;取消不落地。
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Checkbox, IconButton, TextField, Box, Divider, Collapse, Alert,
} from '@mui/material';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';

import { getCodeSet } from '../../config/codeSets';
import { resolveCodeSet, diffToOverlay } from '../../utils/codeSetResolver';
import { runCodeSetMigrations } from '../../utils/codeSetMigration';

const notifyPage = (setting, value) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'settingChanged',
        settingType: 'overview',
        setting,
        value,
      });
    }
  });
};

const CodeSetEditor = ({ codeSetId, open, onClose }) => {
  const codeSet = getCodeSet(codeSetId);
  const [workingList, setWorkingList] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!open || !codeSet) return;
    runCodeSetMigrations().then(() => {
      chrome.storage.sync.get({ [codeSet.storageKey]: null }, (items) => {
        setWorkingList(resolveCodeSet(codeSet.builtin, items[codeSet.storageKey]));
      });
    });
    setShowPicker(false);
    setFilter('');
    setEditingId(null);
    setConfirmReset(false);
  }, [open, codeSetId]);

  if (!codeSet) return null;

  const builtinIds = new Set(codeSet.builtin.map(i => i.id));
  const inListIds = new Set(workingList.map(i => i.id));
  const availableCatalog = codeSet.catalog.filter(e =>
    !inListIds.has(`catalog:${e.code}`) &&
    (filter === '' || e.label.toLowerCase().includes(filter.toLowerCase()) || e.code.includes(filter))
  );
  const availablePresets = codeSet.aliasPresets.filter(p => !inListIds.has(p.id));

  const toggle = (id) =>
    setWorkingList(list => list.map(i => (i.id === id ? { ...i, enabled: !i.enabled } : i)));
  const move = (index, delta) =>
    setWorkingList(list => {
      const j = index + delta;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  const removeItem = (id) => setWorkingList(list => list.filter(i => i.id !== id));
  const addCatalogEntry = (entry) =>
    setWorkingList(list => [...list, {
      id: `catalog:${entry.code}`, label: entry.label, codes: [entry.code], enabled: true, order: list.length,
    }]);
  const addAliasPreset = (preset) =>
    setWorkingList(list => [...list, { ...preset, codes: [...preset.codes], enabled: true, order: list.length }]);

  const startRename = (item) => { setEditingId(item.id); setEditingLabel(item.label); };
  const commitRename = () => {
    if (editingId && editingLabel.trim() !== '') {
      const label = editingLabel.trim();
      setWorkingList(list => list.map(i => (i.id === editingId ? { ...i, label } : i)));
    }
    setEditingId(null);
  };

  const handleSave = () => {
    const overlay = diffToOverlay(codeSet.builtin, workingList);
    chrome.storage.sync.set({ [codeSet.storageKey]: overlay }, () => {
      notifyPage(codeSet.storageKey, overlay);
      onClose();
    });
  };
  const handleResetAll = () => {
    chrome.storage.sync.set({ [codeSet.storageKey]: null }, () => {
      notifyPage(codeSet.storageKey, null);
      onClose();
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{codeSet.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          勾選要顯示的項目,箭頭調整順序;點項目名稱可改名。「加入的項目」可刪除,內建項目僅能停用。
        </Typography>
        <List dense sx={{ width: '100%' }}>
          {workingList.map((item, index) => (
            <ListItem key={item.id} divider>
              <ListItemIcon>
                <Checkbox edge="start" checked={item.enabled} onChange={() => toggle(item.id)} />
              </ListItemIcon>
              {editingId === item.id ? (
                <TextField
                  size="small" autoFocus value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); }}
                />
              ) : (
                <ListItemText
                  primary={item.label}
                  secondary={item.codes.join(', ')}
                  onClick={() => startRename(item)}
                  sx={{ cursor: 'pointer' }}
                />
              )}
              <ListItemSecondaryAction>
                <IconButton edge="end" size="small" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowCircleUpIcon fontSize="small" />
                </IconButton>
                <IconButton edge="end" size="small" onClick={() => move(index, 1)} disabled={index === workingList.length - 1}>
                  <ArrowCircleDownIcon fontSize="small" />
                </IconButton>
                {!builtinIds.has(item.id) && (
                  <IconButton edge="end" size="small" color="error" onClick={() => removeItem(item.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        <Button startIcon={<PlaylistAddIcon />} onClick={() => setShowPicker(v => !v)} sx={{ mt: 1 }}>
          從常用項目加入
        </Button>
        <Collapse in={showPicker}>
          <Box sx={{ mt: 1 }}>
            <TextField
              size="small" fullWidth placeholder="輸入名稱或代碼過濾"
              value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ mb: 1 }}
            />
            {availablePresets.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary">一對多代碼組(跨院所 alias)</Typography>
                <List dense>
                  {availablePresets.map(p => (
                    <ListItem key={p.id} onClick={() => addAliasPreset(p)} sx={{ cursor: 'pointer' }}>
                      <ListItemText primary={p.label} secondary={p.codes.join(', ')} />
                    </ListItem>
                  ))}
                </List>
                <Divider />
              </>
            )}
            <List dense>
              {availableCatalog.map(e => (
                <ListItem key={e.code} onClick={() => addCatalogEntry(e)} sx={{ cursor: 'pointer' }}>
                  <ListItemText primary={e.label} secondary={e.code} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Collapse>

        {confirmReset && (
          <Alert
            severity="warning" sx={{ mt: 1 }}
            action={<Button color="inherit" size="small" onClick={handleResetAll}>確認還原</Button>}
          >
            將清除此清單的全部自訂(啟停、排序、改名、加入項),還原為出廠預設。
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button color="secondary" sx={{ mr: 'auto' }} onClick={() => setConfirmReset(true)}>
          全部還原預設
        </Button>
        <Button variant="contained" onClick={handleSave}>保存</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CodeSetEditor;
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/codeSetEditor.test.jsx`
Expected: PASS(4 tests)。若 MUI 結構造成 query 失敗,以實際 DOM 校準測試 query(getByRole/within),不改元件行為。

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/CodeSetEditor.jsx tests/codeSetEditor.test.jsx
git commit -m "功能:通用 CodeSetEditor(啟停/排序/改名/目錄與 alias 組加入/還原預設)"
```

---

### Task 10: OverviewSettings 接線 + 舊 dialog 與舊常數清理

**Files:**
- Modify: `src/components/settings/OverviewSettings.jsx`(大幅瘦身)

**Interfaces:**
- Consumes: `<CodeSetEditor>`(Task 9)。
- Produces: 兩顆既有按鈕改開 CodeSetEditor。**刪除**:`FALLBACK_LAB_TESTS`、`SPECIAL_LAB_CODES`、`FALLBACK_IMAGE_TESTS`、`resetLabTestsToDefault`、`resetImageTestsToDefault`(repo 內已無其他使用者——Task 7 已把 Overview_LabTests 的 import 移走)、兩個舊 dialog 與其全部 state/handler。

- [ ] **Step 1: 確認舊匯出已無使用者**

Run: `grep -rn "FALLBACK_LAB_TESTS\|SPECIAL_LAB_CODES\|FALLBACK_IMAGE_TESTS\|resetLabTestsToDefault\|resetImageTestsToDefault" src --include="*.js*" | grep -v "settings/OverviewSettings.jsx"`
Expected: 無輸出(若有,先修正該使用端再繼續)

- [ ] **Step 2: 重寫 OverviewSettings.jsx**

保留:三個追蹤天數 TextField 與其 handler、`storageDefaultsForSection('overview')` 載入、Accordion 外殼、兩顆按鈕(文案不變)。移除:上述舊常數/函數/dialog/`focusedLabTests`/`focusedImageTests`/`tempLabTests`/`tempImageTests` 等 state 與 handler、不再使用的 MUI import(List/Checkbox/Dialog 系列等)。新增:

```jsx
import CodeSetEditor from './CodeSetEditor';
// 元件內:
const [editorId, setEditorId] = useState(null);
// 兩顆按鈕 onClick 改為:
//   關注檢驗清單設定 → onClick={() => setEditorId('labFocus')}
//   關注影像清單設定 → onClick={() => setEditorId('imageFocus')}
// AccordionDetails 尾端(原兩個 Dialog 的位置)改為:
{editorId && (
  <CodeSetEditor codeSetId={editorId} open onClose={() => setEditorId(null)} />
)}
```

- [ ] **Step 3: 全量測試 + build**

Run: `npm test && npm run build`
Expected: 全綠;build exit 0(確認無殘留 import 斷鏈)

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/OverviewSettings.jsx
git commit -m "重構:OverviewSettings 接 CodeSetEditor,刪兩舊 dialog 與 FALLBACK/SPECIAL 舊常數"
```

---

### Task 11: 文件同步 + 全量驗證

**Files:**
- Modify: `DOC/Settings.md`(falsy 段後新增 CodeSet 段)
- Modify: `DOC/07_擴充藍圖.md`(執行順序表 CodeSet 行打勾)
- Modify: `docs/superpowers/specs/2026-07-07-codeset-pilot-design.md`(alias 查證補記)

**Interfaces:** 無(文件)。

- [ ] **Step 1: DOC/Settings.md 新增段落(「設定備份」段之前)**

```markdown
## CodeSet overlay(總覽關注清單)

`labFocusOverlay`/`imageFocusOverlay` 兩鍵(overview section,預設 `null`)存
總覽關注檢驗/影像清單的**使用者差異**(overlay delta);內建基底在
`src/config/labTests.js`/`imageTests.js` 的 `*_FOCUS_BUILTIN`,合成邏輯在
`src/utils/codeSetResolver.js`(純函數)。設計契約見
`docs/superpowers/specs/2026-07-07-codeset-pilot-design.md`,重點:

- `null` = 無自訂(用內建);**不適用 falsy 退回**(null 是合法值)。
- 舊鍵 `focusedLabTests`/`focusedImageTests` 保留不動(可回滾),由
  `runCodeSetMigrations()` 一次性冪等遷移(loadAllSettings 與編輯器開啟時觸發)。
- 兩鍵依「加鍵不 bump version」契約自動納入設定備份。
- 編輯 UI:`src/components/settings/CodeSetEditor.jsx`(通用,吃
  `src/config/codeSets.js` 宣告;新增代碼集 = 加一份宣告)。
```

- [ ] **Step 2: DOC/07 執行順序表更新**

「**下一步:CodeSet pilot(issue #64/#66/#67)**」行改為 `~~CodeSet pilot~~ ✅`,內容尾端補:`(2026-07-07 完成:overlay 兩 sync 鍵 + 通用 CodeSetEditor + 一次性遷移;alias 查證:CRP/hs-CRP 與 Cr/CCr 同碼免 alias、尿蛋白留待 itemName 過濾,初版 alias 組僅 CBC。spec 2026-07-07-codeset-pilot-design.md)`。

- [ ] **Step 3: spec 補記(「不做」清單後新增小節)**

```markdown
## 實作時補記(2026-07-07,146 份真實測資查證)

alias 預設組初版僅 CBC(`08011C`/`08003C`):CRP/hs-CRP 同碼 `12015C`、
Cr/CCr 同碼 `09015C`(皆為 itemName 變體,免 alias);尿蛋白(UPCR/UACR)
跨碼(`09040C`/`09016C`/`Y00002` 等)但同碼下有非目標項目,orderCode 層
alias 會誤抓,留待「itemName 過濾」能力(CodeSet 成熟後階段)。

檢驗目錄(LAB_CATALOG)來源改為 KMUH 公開檢驗目錄快照
(`.test_data/reference/kmuh_lab_reference_20260707.json`,非個資),
以 order_code 去重約 301 筆 + 手挑常用碼聯集(取代 spec 原「abbreviationUtils
28 碼衍生」的初版方案,涵蓋面大幅擴大;手挑標籤優先)。注意:KMUH 表同一
檢驗因分屬多科(work_dept)/檢體變體會重覆多列(GPT 曾同時掛生化與腎功能
實驗室),去重以 order_code 為單位、標籤取最簡短名稱——比對只認 orderCode,
科別歸屬不影響功能。
```

- [ ] **Step 4: 全量驗證**

Run: `npm test && npm run build`
Expected: 全綠;build exit 0

- [ ] **Step 5: Commit**

```bash
git add DOC/Settings.md DOC/07_擴充藍圖.md docs/superpowers/specs/2026-07-07-codeset-pilot-design.md
git commit -m "文件:CodeSet pilot 完成(Settings.md overlay 段、DOC/07 順序表、spec alias 查證補記)"
```

---

## 收尾(計畫外,人工)

- 實機驗證(需 NHI 登入):編輯器加入 CBC alias 組後,他院所 `08003C` 資料應出現在關注檢驗;舊使用者升級後自訂不丟失。
- `superpowers:finishing-a-development-branch` 流程決定 merge/push。
- `.test_data/continue.md` 交接檔更新(gitignored)。
