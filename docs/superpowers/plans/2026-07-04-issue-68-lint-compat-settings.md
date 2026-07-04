# Issue #68 四點意見處理 Implementation Plan

> **狀態:已全數完成(2026-07-04)**。實際執行紀錄與計畫的差異:Task 3+4 合併為單一 commit(變更互相交織);CI 兩次紅燈修正(package-lock.json 在 .gitignore 改用 npm install;UTC runner 暴露既有時區脆弱測試,CI 明訂 TZ=Asia/Taipei);esbuild(scripts/build.js)的 target 一併對齊 chrome109。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在單一 branch `issue-68-quality` 上依序解決 issue #68 的四點:lint 清零+CI gate、minimum_chrome_version+build target、settings schema 化(先測試後重構)、並以「先測試後重構」紀律執行第 3 點。

**Architecture:** 前半(Task 1–6)是機械式清理與設定補強,每個 commit 各自隔離(規則調整、自動修復、手動修復、CI、相容性)。後半(Task 7–10)是 settings DRY 重構:先對舊程式寫 characterization 測試鎖行為,再建 `settingsSchema.js` 單一事實來源,最後讓 `settingsManager` 與各設定 UI 元件都從 schema 衍生。

**Tech Stack:** ESLint 9 (flat config) + @stylistic、Vitest 4 + jsdom、Vite 6 (esbuild target)、Chrome MV3 extension、GitHub Actions。

## Global Constraints

- 全程在 branch `issue-68-quality` 工作,**完成前絕不 merge 回 main**(使用者明確要求)。
- 每個 commit 前必須:`npm test`(目前 22 檔 189 測試)全綠、`npm run build` 成功。
- Task 7 之後(重構區)額外要求:既有測試檔**只能加測試,不能改既有斷言**;重構 commit 不得混入行為變更(唯一例外:Task 10 修正 UI 預設值矛盾,該 commit 訊息必須明確標註為 bug fix)。
- lint 目標:**0 errors**;warnings(react-refresh 15 + exhaustive-deps 8)保留不擋(修 exhaustive-deps 可能改變行為,violates 第 4 點紀律,另案處理)。
- `minimum_chrome_version` 定為 `"109"`(MV3 常見底線,Danny 在 issue 中提及的版本)。
- Commit message 為繁體中文,結尾附 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。

## 現況數據(2026-07-04 實測,main @ 944f790)

- `npm run lint`:1357 problems(1333 errors / 24 warnings),585 errors 可 `--fix`。
- 錯誤分佈:react/prop-types 567、@stylistic/no-trailing-spaces 392、no-unused-vars 157、@stylistic/key-spacing 109、space-infix-ops 38、space-before-function-paren 25、react/jsx-key 17、comma-spacing 13、no-useless-escape 4、其餘個位數。
- `npm run type-check`:綠。
- `public/manifest.json`:無 `minimum_chrome_version`;`vite.config.js`:無 `build.target`。
- chrome.storage 扁平鍵共 **52 個**(western 13、atc5 3、chinese 4、lab 14、overview 5、general 10、cloud 3)。
- 已發現的預設值矛盾(Task 10 要修):
  - `GeneralDisplaySettings.jsx:33-42`:`titleTextSize/contentTextSize: 'medium'`(正確為 `'small'`)、`floatingIconPosition: 'top-right'`(正確為 `'middle-right'`);state 初始值 `useColorfulTabs: false`(正確為 `true`)。
  - `PopupSettings.jsx:262-269`:`useColorfulTabs: false`(正確為 `true`)、`titleTextSize/contentTextSize: 'medium'`、`floatingIconPosition: 'top-right'`。

---

### Task 1: 開 branch + ESLint 規則校準

**Files:**
- Modify: `eslint.config.js`

**Interfaces:**
- Produces: 校準後的 lint 規則集,後續所有 task 的 `npm run lint` 都以此為準。

- [ ] **Step 1: 開 branch**

```bash
git checkout -b issue-68-quality
```

- [ ] **Step 2: 修改 eslint.config.js**

在 react 區塊的 `rules`(`'no-console'` 那一組)加入兩條規則。修改 `eslint.config.js` 第 73–83 行的 rules 區塊:

```js
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      // JS 專案未使用 PropTypes,型別由 jsconfig + tsc (npm run type-check) 把關
      'react/prop-types': 'off',
      // 允許以 _ 前綴標示刻意未用的參數;catch(e) 未用 e 不報錯
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
```

注意:`no-unused-vars` 也要在**第一個 config 區塊**(全域 rules,約第 25–48 行)加同樣設定,否則 tests/、scripts/ 不受 argsIgnorePattern 保護:

```js
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
```

- [ ] **Step 3: 驗證錯誤數下降**

```bash
npm run lint 2>&1 | tail -3
```

Expected: 總數從 1357 降至約 700 以下(prop-types 567 消失,no-unused-vars 部分消失)。記下實際數字。

- [ ] **Step 4: 跑測試確認無影響**

```bash
npm test && npm run build
```

Expected: 189 tests PASS、build 成功。

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js
git commit -m "lint:校準規則——關閉 react/prop-types(JS 專案由 tsc 把關)、no-unused-vars 允許 _ 前綴參數

回應 issue #68 第 1 點。規則取捨依 PR #36 的原則:不適合的規則明確關閉並註記理由。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `lint:fix` 自動修復(獨立的純機械 commit)

**Files:**
- Modify: 大量 src/、tests/ 檔案(僅空白、引號、逗號等 stylistic 修正)

- [ ] **Step 1: 執行自動修復**

```bash
npm run lint:fix 2>&1 | tail -3
```

- [ ] **Step 2: 驗證行為不變**

```bash
npm test && npm run build && npm run type-check
```

Expected: 189 tests PASS、build 綠、type-check 綠。

- [ ] **Step 3: 檢查 diff 只含空白/標點層級變更**

```bash
git diff --stat | tail -3
git diff -w --stat | tail -3
```

Expected: `git diff -w --stat`(忽略空白)的變更量遠小於 `git diff --stat`。若 `-w` 仍顯示大量變更,逐檔檢視確認只是引號/分號/逗號。

- [ ] **Step 4: Commit(整包單獨一個 commit,方便 reviewer 跳過)**

```bash
git add -A
git commit -m "lint:eslint --fix 自動修復(純格式,無行為變更)

單獨成一個 commit 以隔離格式雜訊,回應 issue #68 第 1 點「大量 diff 應最優先、一次處理」。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 手動清理 no-unused-vars

**Files:**
- Modify: 依 lint 輸出逐檔(約 100+ 處未用 import/變數)

- [ ] **Step 1: 列出所有違規點**

```bash
npm run lint 2>&1 | grep -B5 "no-unused-vars" | grep -E "^/|no-unused-vars" > /tmp/unused.txt 2>/dev/null || npm run lint 2>&1 | grep -E "^/Users|no-unused-vars"
```

- [ ] **Step 2: 逐檔修復,決策規則**

- 未用的 `import` → 直接刪除該 import。
- 未用的區域變數/解構 → 刪除;若解構是為了「取剩餘」(`const { a, ...rest } = obj` 且 a 未用)→ 改 `_a`。
- 函數參數未用但位置必要(如 event handler 的第一參數)→ 前綴 `_`。
- **不確定是否為死碼時**(例如被字串引用、動態呼叫)→ 先 `grep -rn "名稱" src/` 確認零引用再刪。

- [ ] **Step 3: 驗證**

```bash
npm run lint 2>&1 | grep -c "no-unused-vars"
npm test && npm run build
```

Expected: `0`;tests PASS。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "lint:清除未使用的 import 與變數(no-unused-vars 歸零)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 手動清理 jsx-key 與其餘 errors → lint 0 errors

**Files:**
- Modify: 依 lint 輸出(react/jsx-key 17 處、no-useless-escape 4、no-prototype-builtins 1、no-irregular-whitespace 1、殘餘 stylistic)

- [ ] **Step 1: 修 react/jsx-key(17 處)**

列出位置:

```bash
npm run lint 2>&1 | grep -B8 "jsx-key" | grep -E "^/|jsx-key"
```

修復模式——`.map()` 產生的 JSX 加上穩定 key。優先用資料的唯一識別(id、代碼、名稱),**只有在清單保證不重排時**才允許 index:

```jsx
// Before
{items.map((item) => <Chip label={item.name} />)}
// After
{items.map((item) => <Chip key={item.name} label={item.name} />)}
```

- [ ] **Step 2: 修其餘 errors**

- `no-useless-escape`(4):刪除正規表達式中不必要的 `\`(逐一確認 regex 行為不變,可在 node REPL 驗證新舊 pattern 對同一字串結果相同)。
- `no-prototype-builtins`(1):`obj.hasOwnProperty(k)` → `Object.prototype.hasOwnProperty.call(obj, k)`。
- `no-irregular-whitespace`(1):把不可見的全形/特殊空白換成一般空白。
- 殘餘 `@stylistic/*`:依訊息修。

- [ ] **Step 3: 驗證 0 errors**

```bash
npm run lint 2>&1 | tail -3
npm test && npm run build && npm run type-check
```

Expected: `✖ 23 problems (0 errors, 23 warnings)` 或更少 warnings;全部綠。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "lint:errors 歸零——補 jsx key、修 regex escape 等殘餘問題

npm run lint 自此 0 errors(warnings 保留:react-refresh 15、exhaustive-deps 8,後者修復涉及行為需另案)。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: GitHub Actions CI gate

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: push/PR 時自動跑 lint + type-check + test + build,lint 有 error 即 fail。

- [ ] **Step 1: 建立 workflow**

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: Commit 並 push branch 觸發驗證**

```bash
git add .github/workflows/ci.yml
git commit -m "ci:新增 GitHub Actions——lint/type-check/test/build 全綠才過

回應 issue #68 第 1 點「搭配 workflow 在 PR 時自動執行測試」。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push -u origin issue-68-quality
```

- [ ] **Step 3: 確認 Actions 綠燈**

```bash
gh run watch --repo leescot/NHITW_cloud_analyzer_react_MUI $(gh run list --branch issue-68-quality --limit 1 --json databaseId -q '.[0].databaseId')
```

Expected: conclusion SUCCESS。若失敗,讀 log 修到綠。

---

### Task 6: minimum_chrome_version + Vite build target

**Files:**
- Modify: `public/manifest.json`
- Modify: `vite.config.js`

- [ ] **Step 1: manifest 加最低版本**

`public/manifest.json` 在 `"manifest_version": 3,` 之後加一行:

```json
  "manifest_version": 3,
  "minimum_chrome_version": "109",
```

- [ ] **Step 2: vite.config.js 設 build target**

```js
  build: {
    outDir: 'dist',
    target: 'chrome109',
    rollupOptions: {
```

- [ ] **Step 3: 驗證 build 與 dist manifest**

```bash
npm run build && grep minimum_chrome_version dist/manifest.json && npm test
```

Expected: build 成功、grep 印出 `"minimum_chrome_version": "109",`、tests PASS。
(scripts/build.js 是直接複製 public/manifest.json 到 dist,所以會帶上;`--test` 變體用 import 修改 manifest 物件,新欄位同樣保留。)

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json vite.config.js
git commit -m "相容性:manifest 宣告 minimum_chrome_version 109、vite build target 設 chrome109

回應 issue #68 第 2 點:語法層相容由 esbuild target 保證;runtime API 跨版本驗證需真機測試,於 issue 回覆中另述。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: loadAllSettings characterization 測試(重構前,鎖舊行為)

**Files:**
- Create: `tests/fixtures/storageKeys.js`
- Modify: `tests/settingsManager.test.js`(只加測試,不動既有內容)

**Interfaces:**
- Produces: `EXPECTED_STORAGE_KEYS`(52 個扁平鍵名的排序陣列)、`RENAMED_KEY_MAP`(nested→storage 改名對照),Task 8 的 schema 測試會 import 同一份 fixture。

- [ ] **Step 1: 建立 fixture(52 鍵快照,抄自現行 settingsManager.js:16-81 的 sync.get 物件)**

```js
// tests/fixtures/storageKeys.js
// 現行 chrome.storage.sync 扁平鍵快照(重構前行為基準,52 鍵)
export const EXPECTED_STORAGE_KEYS = [
  // western (13)
  'simplifyMedicineName', 'showGenericName', 'showDiagnosis', 'showATC5Name',
  'medicationCopyFormat', 'separateShortTermMeds', 'showExternalDrugImage',
  'enableMedicationCustomCopyFormat', 'enableMedicationCopyAll', 'medicationCopyAllOrder',
  'drugSeparator', 'customMedicationHeaderCopyFormat', 'customMedicationDrugCopyFormat',
  // atc5 (3)
  'enableATC5Colors', 'atc5Groups', 'atc5ColorGroups',
  // chinese (4)
  'chineseMedShowDiagnosis', 'chineseMedShowEffectName', 'chineseMedDoseFormat', 'chineseMedCopyFormat',
  // lab (14)
  'displayLabFormat', 'showLabUnit', 'showLabReference', 'enableLabAbbrev',
  'highlightAbnormalLab', 'copyLabFormat', 'enableLabChooseCopy', 'labChooseCopyItems',
  'enableLabCustomCopyFormat', 'enableLabCopyAll', 'labCopyAllOrder', 'itemSeparator',
  'customLabHeaderCopyFormat', 'customLabItemCopyFormat',
  // overview (5)
  'medicationTrackingDays', 'labTrackingDays', 'imageTrackingDays', 'focusedLabTests', 'focusedImageTests',
  // general (10)
  'autoOpenPage', 'titleTextSize', 'contentTextSize', 'noteTextSize', 'floatingIconPosition',
  'alwaysOpenOverviewTab', 'useColorfulTabs', 'enableCKMTab', 'enableNephroReport', 'enableCKMScreening',
  // cloud (3)
  'fetchAdultHealthCheck', 'fetchCancerScreening', 'fetchHbcvdata',
].sort();

// 巢狀鍵 → storage 鍵的歷史改名(其餘同名)
export const RENAMED_KEY_MAP = {
  'atc5.enableColors': 'enableATC5Colors',
  'atc5.groups': 'atc5Groups',
  'atc5.colorGroups': 'atc5ColorGroups',
  'chinese.showDiagnosis': 'chineseMedShowDiagnosis',
  'chinese.showEffectName': 'chineseMedShowEffectName',
  'chinese.doseFormat': 'chineseMedDoseFormat',
  'chinese.copyFormat': 'chineseMedCopyFormat',
  'lab.showUnit': 'showLabUnit',
  'lab.showReference': 'showLabReference',
  'lab.highlightAbnormal': 'highlightAbnormalLab',
};
```

- [ ] **Step 2: 在 tests/settingsManager.test.js 追加 describe 區塊(檔尾)**

```js
import { loadAllSettings } from '../src/utils/settingsManager.js';
import { EXPECTED_STORAGE_KEYS } from './fixtures/storageKeys.js';

// 暫時替換 chrome.storage.sync.get,回傳 defaults 疊上 overrides
const withSyncGetStub = async (overrides, fn) => {
  const original = chrome.storage.sync.get;
  let requestedDefaults;
  chrome.storage.sync.get = (defaults, cb) => {
    requestedDefaults = defaults;
    cb({ ...defaults, ...overrides });
  };
  try {
    return { result: await fn(), requestedDefaults };
  } finally {
    chrome.storage.sync.get = original;
  }
};

describe('utils/settingsManager.loadAllSettings(characterization,重構前行為基準)', function () {
  it('向 chrome.storage.sync.get 要求的扁平預設鍵 = 52 鍵快照', async function () {
    const { requestedDefaults } = await withSyncGetStub({}, loadAllSettings);
    assert.deepEqual(Object.keys(requestedDefaults).sort(), EXPECTED_STORAGE_KEYS);
  });

  it('storage 全空(回傳 defaults)時,輸出各 section 與 DEFAULT_SETTINGS 等值', async function () {
    const { result } = await withSyncGetStub({}, loadAllSettings);
    assert.deepEqual(result.western, DEFAULT_SETTINGS.western);
    assert.deepEqual(result.atc5, DEFAULT_SETTINGS.atc5);
    assert.deepEqual(result.chinese, DEFAULT_SETTINGS.chinese);
    assert.deepEqual(result.lab, DEFAULT_SETTINGS.lab);
    assert.deepEqual(result.overview, DEFAULT_SETTINGS.overview);
    assert.deepEqual(result.general, DEFAULT_SETTINGS.general);
    assert.deepEqual(result.cloud, DEFAULT_SETTINGS.cloud);
  });

  it('storage 覆寫值會映射到巢狀結構(含歷史改名鍵)', async function () {
    const { result } = await withSyncGetStub({
      chineseMedDoseFormat: 'perTime',
      showLabUnit: true,
      enableATC5Colors: false,
      highlightAbnormalLab: false,
      showDiagnosis: false,           // western 的同名鍵
      enableCKMScreening: true,
    }, loadAllSettings);
    assert.equal(result.chinese.doseFormat, 'perTime');
    assert.equal(result.lab.showUnit, true);
    assert.equal(result.atc5.enableColors, false);
    assert.equal(result.lab.highlightAbnormal, false);
    assert.equal(result.western.showDiagnosis, false);
    assert.equal(result.general.enableCKMScreening, true);
  });

  it('falsy 覆寫時的退回行為:medicationCopyAllOrder/labCopyAllOrder/itemSeparator/focusedLabTests/focusedImageTests 退回預設,其餘 falsy 保留', async function () {
    const { result } = await withSyncGetStub({
      medicationCopyAllOrder: '',
      labCopyAllOrder: '',
      itemSeparator: '',
      focusedLabTests: null,
      focusedImageTests: null,
      drugSeparator: '',              // 舊程式「不」退回
      autoOpenPage: false,
    }, loadAllSettings);
    assert.equal(result.western.medicationCopyAllOrder, 'newToOld');
    assert.equal(result.lab.labCopyAllOrder, 'newToOld');
    assert.equal(result.lab.itemSeparator, ',');
    assert.deepEqual(result.overview.focusedLabTests, DEFAULT_SETTINGS.overview.focusedLabTests);
    assert.deepEqual(result.overview.focusedImageTests, DEFAULT_SETTINGS.overview.focusedImageTests);
    assert.equal(result.western.drugSeparator, '');
    assert.equal(result.general.autoOpenPage, false);
  });
});
```

- [ ] **Step 3: 跑測試——必須直接全綠(這是對「舊程式」的行為描述)**

```bash
npm test -- tests/settingsManager.test.js
```

Expected: PASS。若有紅,代表對舊行為的理解錯誤 → 修**測試**使其符合舊程式實際行為(絕不改 src)。

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/storageKeys.js tests/settingsManager.test.js
git commit -m "測試:loadAllSettings characterization 測試,重構前鎖定 52 鍵與映射行為

回應 issue #68 第 4 點:先在舊框架下寫測試,再重構。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: settingsSchema.js 單一事實來源(TDD)

**Files:**
- Create: `src/config/settingsSchema.js`
- Create: `tests/settingsSchema.test.js`

**Interfaces:**
- Consumes: `DEFAULT_SETTINGS`(config/defaultSettings.js,維持原樣不動)、Task 7 的 fixtures。
- Produces(Task 9、10 依賴,簽名如下):
  - `SETTINGS_SCHEMA`: `Array<{section: string, key: string, storageKey: string, defaultValue: any, falsyFallback: boolean}>`
  - `buildStorageDefaults(): Record<string, any>` — 52 鍵扁平預設物件(給 sync.get)
  - `structureFromFlat(flat: Record<string, any>): Record<string, Record<string, any>>` — 扁平→巢狀全部 sections
  - `sectionFromFlat(section: string, flat: Record<string, any>): Record<string, any>` — 扁平→單一 section
  - `storageDefaultsForSection(section: string): Record<string, any>` — 單一 section 的扁平預設(給 UI 元件 sync.get)

- [ ] **Step 1: 先寫失敗測試**

```js
// tests/settingsSchema.test.js
import { describe, it, assert } from 'vitest';

import {
  SETTINGS_SCHEMA,
  buildStorageDefaults,
  structureFromFlat,
  sectionFromFlat,
  storageDefaultsForSection,
} from '../src/config/settingsSchema.js';
import { DEFAULT_SETTINGS } from '../src/config/defaultSettings.js';
import { EXPECTED_STORAGE_KEYS, RENAMED_KEY_MAP } from './fixtures/storageKeys.js';

describe('config/settingsSchema', function () {
  it('schema 涵蓋 DEFAULT_SETTINGS 全部鍵,storage 鍵與 52 鍵快照一致', function () {
    assert.deepEqual(Object.keys(buildStorageDefaults()).sort(), EXPECTED_STORAGE_KEYS);
  });

  it('storageKey 不重複(不同 section 的同名巢狀鍵靠改名表區分)', function () {
    const keys = SETTINGS_SCHEMA.map(e => e.storageKey);
    assert.equal(new Set(keys).size, keys.length);
  });

  it('歷史改名鍵依 RENAMED_KEY_MAP 映射,其餘 storage 鍵 = 巢狀鍵名', function () {
    for (const entry of SETTINGS_SCHEMA) {
      const expected = RENAMED_KEY_MAP[`${entry.section}.${entry.key}`] ?? entry.key;
      assert.equal(entry.storageKey, expected, `${entry.section}.${entry.key}`);
    }
  });

  it('buildStorageDefaults 的每個值 === DEFAULT_SETTINGS 對應值(同一參考,非複本)', function () {
    const flat = buildStorageDefaults();
    for (const entry of SETTINGS_SCHEMA) {
      assert.strictEqual(flat[entry.storageKey], DEFAULT_SETTINGS[entry.section][entry.key]);
    }
  });

  it('structureFromFlat(預設扁平) 與 DEFAULT_SETTINGS 深度相等', function () {
    assert.deepEqual(structureFromFlat(buildStorageDefaults()), DEFAULT_SETTINGS);
  });

  it('structureFromFlat 覆寫值映射到正確 section(含改名鍵與跨 section 同名鍵)', function () {
    const flat = { ...buildStorageDefaults(), chineseMedDoseFormat: 'perTime', showDiagnosis: false };
    const nested = structureFromFlat(flat);
    assert.equal(nested.chinese.doseFormat, 'perTime');
    assert.equal(nested.western.showDiagnosis, false);
    assert.equal(nested.chinese.showDiagnosis, DEFAULT_SETTINGS.chinese.showDiagnosis);
  });

  it('falsyFallback 鍵在 falsy 值時退回預設,其餘 falsy 保留(對齊舊 loadAllSettings 行為)', function () {
    const flat = {
      ...buildStorageDefaults(),
      medicationCopyAllOrder: '', labCopyAllOrder: '', itemSeparator: '',
      focusedLabTests: null, focusedImageTests: null,
      drugSeparator: '', autoOpenPage: false,
    };
    const nested = structureFromFlat(flat);
    assert.equal(nested.western.medicationCopyAllOrder, 'newToOld');
    assert.equal(nested.lab.labCopyAllOrder, 'newToOld');
    assert.equal(nested.lab.itemSeparator, ',');
    assert.deepEqual(nested.overview.focusedLabTests, DEFAULT_SETTINGS.overview.focusedLabTests);
    assert.deepEqual(nested.overview.focusedImageTests, DEFAULT_SETTINGS.overview.focusedImageTests);
    assert.equal(nested.western.drugSeparator, '');
    assert.equal(nested.general.autoOpenPage, false);
  });

  it('sectionFromFlat 只回傳該 section 的巢狀鍵', function () {
    const flat = { ...buildStorageDefaults(), chineseMedShowEffectName: true };
    const chinese = sectionFromFlat('chinese', flat);
    assert.deepEqual(Object.keys(chinese).sort(), Object.keys(DEFAULT_SETTINGS.chinese).sort());
    assert.equal(chinese.showEffectName, true);
  });

  it('storageDefaultsForSection 回傳該 section 的扁平預設(UI 元件用)', function () {
    const generalDefaults = storageDefaultsForSection('general');
    assert.deepEqual(generalDefaults, {
      autoOpenPage: false, titleTextSize: 'small', contentTextSize: 'small',
      noteTextSize: 'small', floatingIconPosition: 'middle-right',
      alwaysOpenOverviewTab: true, useColorfulTabs: true,
      enableCKMTab: false, enableNephroReport: false, enableCKMScreening: false,
    });
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
npm test -- tests/settingsSchema.test.js
```

Expected: FAIL — `Cannot find module '../src/config/settingsSchema.js'`(或匯出不存在)。

- [ ] **Step 3: 實作 settingsSchema.js**

```js
// src/config/settingsSchema.js
// 設定的單一事實來源(single source of truth)。
// 新增設定時只需改 defaultSettings.js 一處;storage 鍵自動同名。
// 「不要」再往 LEGACY_STORAGE_KEYS 加新項目——那是歷史改名的封存表。
import { DEFAULT_SETTINGS } from './defaultSettings';

// 歷史遺留:巢狀鍵(section.key)→ chrome.storage 扁平鍵的改名對照
const LEGACY_STORAGE_KEYS = {
  'atc5.enableColors': 'enableATC5Colors',
  'atc5.groups': 'atc5Groups',
  'atc5.colorGroups': 'atc5ColorGroups',
  'chinese.showDiagnosis': 'chineseMedShowDiagnosis',
  'chinese.showEffectName': 'chineseMedShowEffectName',
  'chinese.doseFormat': 'chineseMedDoseFormat',
  'chinese.copyFormat': 'chineseMedCopyFormat',
  'lab.showUnit': 'showLabUnit',
  'lab.showReference': 'showLabReference',
  'lab.highlightAbnormal': 'highlightAbnormalLab',
};

// 舊版讀取時,這些鍵若在 storage 存了 falsy 值會退回預設(保留該行為)
const FALSY_FALLBACK_KEYS = new Set([
  'western.medicationCopyAllOrder',
  'lab.labCopyAllOrder',
  'lab.itemSeparator',
  'overview.focusedLabTests',
  'overview.focusedImageTests',
]);

export const SETTINGS_SCHEMA = Object.entries(DEFAULT_SETTINGS).flatMap(
  ([section, sectionDefaults]) =>
    Object.entries(sectionDefaults).map(([key, defaultValue]) => ({
      section,
      key,
      storageKey: LEGACY_STORAGE_KEYS[`${section}.${key}`] ?? key,
      defaultValue,
      falsyFallback: FALSY_FALLBACK_KEYS.has(`${section}.${key}`),
    }))
);

export const buildStorageDefaults = () =>
  Object.fromEntries(SETTINGS_SCHEMA.map(e => [e.storageKey, e.defaultValue]));

const resolveValue = (entry, flat) => {
  const value = flat[entry.storageKey];
  return entry.falsyFallback ? (value || entry.defaultValue) : value;
};

export const sectionFromFlat = (section, flat) =>
  Object.fromEntries(
    SETTINGS_SCHEMA.filter(e => e.section === section).map(e => [e.key, resolveValue(e, flat)])
  );

export const structureFromFlat = (flat) =>
  Object.fromEntries(
    Object.keys(DEFAULT_SETTINGS).map(section => [section, sectionFromFlat(section, flat)])
  );

export const storageDefaultsForSection = (section) =>
  Object.fromEntries(
    SETTINGS_SCHEMA.filter(e => e.section === section).map(e => [e.storageKey, e.defaultValue])
  );
```

- [ ] **Step 4: 跑測試確認通過**

```bash
npm test -- tests/settingsSchema.test.js && npm test
```

Expected: 新測試 PASS,全套件 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/config/settingsSchema.js tests/settingsSchema.test.js
git commit -m "設定:新增 settingsSchema 單一事實來源(由 DEFAULT_SETTINGS 自動衍生 52 個 storage 鍵)

回應 issue #68 第 3 點。歷史改名鍵封存於 LEGACY_STORAGE_KEYS;新增設定僅需改 defaultSettings.js 一處。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: settingsManager 改用 schema(純重構,測試不動)

**Files:**
- Modify: `src/utils/settingsManager.js`

**Interfaces:**
- Consumes: Task 8 的 `buildStorageDefaults` / `structureFromFlat` / `sectionFromFlat`。
- Produces: `loadAllSettings` / `handleDataFetchCompletedSettingsChange` 對外簽名與行為完全不變。

- [ ] **Step 1: 改寫 loadAllSettings(settingsManager.js:14-156 → 約 10 行)**

```js
import { DEFAULT_SETTINGS } from "../config/defaultSettings";
import { buildStorageDefaults, structureFromFlat, sectionFromFlat } from "../config/settingsSchema";
import { debugLog } from "./logger";
import { dataStore } from "../store/dataStore";

/**
 * 從 Chrome storage 加載所有設置
 * @returns {Promise<Object>} 所有設置(依 DEFAULT_SETTINGS 的巢狀結構)
 */
export const loadAllSettings = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(buildStorageDefaults(), (items) => {
      resolve(structureFromFlat(items));
    });
  });
};
```

同時刪除不再使用的 `DEFAULT_LAB_TESTS` / `DEFAULT_IMAGE_TESTS` import(fallback 已由 schema 的 falsyFallback 處理)。`DEFAULT_SETTINGS` import 若 handlers 改寫後無人用也一併刪除。

- [ ] **Step 2: 改寫各 handler 的 allSettings 分支(單一設定分支與特殊處理保持原樣)**

`handleChineseMedSettingsChange` 開頭:

```js
const handleChineseMedSettingsChange = (event, currentSettings, updateCallback, callbacks) => {
  if (event.detail.allSettings) {
    const newChineseMedSettings = sectionFromFlat('chinese', event.detail.allSettings);
    // ...(updateCallback 與 reprocess 邏輯不變)
```

`handleLabSettingsChange` 的 allSettings 分支:

```js
  if (event.detail.allSettings) {
    const newLabSettings = sectionFromFlat('lab', event.detail.allSettings);
    // ...(其餘不變;displayLabFormat / itemSeparator 單一設定特殊處理原樣保留)
```

`handleOverviewSettingsChange` 的 allSettings 分支:

```js
    const newOverviewSettings = sectionFromFlat('overview', event.detail.allSettings);
```

`handleCloudDataSettingsChange` 的 allSettings 分支:

```js
    const newCloudSettings = sectionFromFlat('cloud', event.detail.allSettings);
```

`handleGeneralDisplaySettingsChange` 的 allSettings 分支:

```js
    updateGeneralDisplaySettings(sectionFromFlat('general', event.detail.allSettings));
```

- [ ] **Step 3: 全套件測試(既有 settingsManager 測試 + Task 7 characterization 一字未改,必須全綠)**

```bash
npm test && npm run build && npm run lint && npm run type-check
```

Expected: 全綠。任何紅 → 修 src(不是修測試)。

- [ ] **Step 4: Commit**

```bash
git add src/utils/settingsManager.js
git commit -m "重構:settingsManager 改由 settingsSchema 衍生(530→約 300 行),行為由既有測試鎖定

loadAllSettings 的 52 鍵手寫對映與 5 個 handler 的欄位列舉全部改為 schema 衍生。
characterization 測試(Task 7)與既有 handler 測試一字未改、全綠,證明為純重構。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: 設定 UI 元件消除重複預設值(含矛盾修正,標註為 bug fix)

**Files:**
- Modify: `src/components/settings/GeneralDisplaySettings.jsx:22-52`
- Modify: `src/components/PopupSettings.jsx:262-269`
- Modify: `src/components/settings/OverviewSettings.jsx:148-153`
- Modify: `src/components/settings/CloudDataSettings.jsx:26-30`
- Modify: `src/components/tabs/AdvancedSettings.jsx:34-41`

**Interfaces:**
- Consumes: `storageDefaultsForSection(section)`(Task 8)。

**行為變更聲明(commit 訊息必須寫明):** 這些元件目前硬寫的預設值與 `defaultSettings.js` 矛盾(GeneralDisplaySettings 的 `'medium'`/`'top-right'`、PopupSettings 的 `useColorfulTabs: false` 等)。矛盾只在「使用者從未儲存過該設定」時影響 UI 初始顯示;統一改為以 `defaultSettings.js` 為準是**修正錯誤**,不是行為保留。

- [ ] **Step 1: GeneralDisplaySettings.jsx**

state 初始值與 sync.get 預設全部改由 schema:

```jsx
import { storageDefaultsForSection } from '../../config/settingsSchema';

const GENERAL_DEFAULTS = storageDefaultsForSection('general');

const GeneralDisplaySettings = () => {
  const [autoOpenPage, setAutoOpenPage] = useState(GENERAL_DEFAULTS.autoOpenPage);
  const [titleTextSize, setTitleTextSize] = useState(GENERAL_DEFAULTS.titleTextSize);
  const [contentTextSize, setContentTextSize] = useState(GENERAL_DEFAULTS.contentTextSize);
  const [noteTextSize, setNoteTextSize] = useState(GENERAL_DEFAULTS.noteTextSize);
  const [floatingIconPosition, setFloatingIconPosition] = useState(GENERAL_DEFAULTS.floatingIconPosition);
  const [alwaysOpenOverviewTab, setAlwaysOpenOverviewTab] = useState(GENERAL_DEFAULTS.alwaysOpenOverviewTab);
  const [useColorfulTabs, setUseColorfulTabs] = useState(GENERAL_DEFAULTS.useColorfulTabs);
  const [enableCKMTab, setEnableCKMTab] = useState(GENERAL_DEFAULTS.enableCKMTab);

  useEffect(() => {
    chrome.storage.sync.get(GENERAL_DEFAULTS, (items) => {
      // ...(既有的 setXxx 呼叫不變)
```

(sync.get 會多帶 `enableNephroReport`/`enableCKMScreening` 兩鍵,callback 未使用、無影響。)

- [ ] **Step 2: PopupSettings.jsx:262-269**

```jsx
import { storageDefaultsForSection } from '../config/settingsSchema';
// ...
    chrome.storage.sync.get(storageDefaultsForSection('general'), (items) => {
      setGeneralDisplaySettings(items);
    });
```

(items 會多帶 3 個 general 鍵進 state,消費端以鍵名取值、無影響;修正了 `useColorfulTabs: false` 等錯誤預設。)

- [ ] **Step 3: OverviewSettings.jsx:148-153、CloudDataSettings.jsx:26-30、tabs/AdvancedSettings.jsx:34-41**

同一模式:

```jsx
// OverviewSettings.jsx(import 路徑 ../../config/settingsSchema)
    chrome.storage.sync.get(storageDefaultsForSection('overview'), (items) => {

// CloudDataSettings.jsx(原本手列 DEFAULT_SETTINGS.cloud.* 三行)
    chrome.storage.sync.get(storageDefaultsForSection('cloud'), (items) => {

// tabs/AdvancedSettings.jsx(僅取一鍵,保持單鍵請求但預設值改引用 schema)
import { storageDefaultsForSection } from '../../config/settingsSchema';
const LAB_DEFAULTS = storageDefaultsForSection('lab');
// ...
    chrome.storage.sync.get(
      { enableLabCustomCopyFormat: LAB_DEFAULTS.enableLabCustomCopyFormat },
      (items) => { setEnableLabCustomFormat(items.enableLabCustomCopyFormat); }
    );
```

各檔案改完後刪除不再使用的 import(如 CloudDataSettings 的 `DEFAULT_SETTINGS`、OverviewSettings 的 `DEFAULT_LAB_TESTS`/`DEFAULT_IMAGE_TESTS` 若僅剩 sync.get 使用)。**注意**:OverviewSettings 檔內其他地方(如 `useState(DEFAULT_IMAGE_TESTS)`)若仍引用則保留 import。

- [ ] **Step 4: 驗證**

```bash
npm test && npm run build && npm run lint && npm run type-check
```

Expected: 全綠。

- [ ] **Step 5: 手動煙霧測試(load dist/ 到 Chrome)**

以全新 profile(或清除 extension storage)載入 `dist/`,開啟 popup 與設定頁,確認:未儲存任何設定時,UI 初始顯示 = defaultSettings.js 的值(彩色頁籤開、字級 small、懸浮圖示 middle-right)。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "設定:UI 元件預設值改由 settingsSchema 衍生,修正與 defaultSettings 矛盾的硬寫值

含行為修正(僅影響從未儲存過設定的使用者的初始顯示):
- GeneralDisplaySettings/PopupSettings:titleTextSize/contentTextSize 'medium'→'small'、
  floatingIconPosition 'top-right'→'middle-right'、useColorfulTabs false→true
自此新增設定只需:defaultSettings.js 一行 + 對應 UI 控制項。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: 文件收尾 + 最終驗證

**Files:**
- Modify: `DOC/Structure.md`(若有 settings 相關段落則更新;無則略過)
- Create: `DOC/Settings.md`

- [ ] **Step 1: 撰寫新增設定 SOP 文件**

```markdown
# 設定系統(Settings)

## 單一事實來源

所有設定的預設值定義於 `src/config/defaultSettings.js`(巢狀結構,依 section 分組)。
`src/config/settingsSchema.js` 由它自動衍生:

- 52 個 chrome.storage.sync 扁平鍵(含歷史改名對照 LEGACY_STORAGE_KEYS)
- `loadAllSettings` 的讀取與巢狀化
- 各設定 UI 元件的 sync.get 預設物件(`storageDefaultsForSection`)

## 新增一個設定的 SOP

1. `src/config/defaultSettings.js`:在對應 section 加一行預設值(storage 鍵自動同名,勿加入 LEGACY_STORAGE_KEYS)。
2. 對應的設定 UI 元件:加控制項,寫入用 `settingsHelper.handleSettingChange(鍵名, 值, ...)`。
3. 消費端:從 `useSettingsState` / `SettingsContext` 讀取 `appSettings.<section>.<鍵名>`。

過去需要改 5–7 個檔案(issue #68 第 3 點),現在僅上述三處(其中 1 是一行)。

## 歷史改名鍵

`chinese.doseFormat` ↔ storage 的 `chineseMedDoseFormat` 等 10 個改名封存於
`settingsSchema.js` 的 `LEGACY_STORAGE_KEYS`,為既有使用者資料相容而保留,不再新增。
```

- [ ] **Step 2: 最終全面驗證**

```bash
npm run lint && npm run type-check && npm test && npm run build
git log --oneline main..HEAD
```

Expected: lint 0 errors、type-check 綠、測試全綠(> 200)、build 成功;commit 歷史依 Task 順序整齊。

- [ ] **Step 3: Commit + push**

```bash
git add DOC/
git commit -m "文件:新增設定系統 SOP(單一事實來源與新增設定流程)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

- [ ] **Step 4: 確認 CI 綠燈**

```bash
gh run list --branch issue-68-quality --limit 1
```

Expected: SUCCESS。**不開 PR、不 merge**——留給使用者確認。

---

## 未納入本 branch 的項目(於 issue #68 回覆中說明)

- **exhaustive-deps 8 個 warnings**:修復會改變 effect 觸發時機,依第 4 點紀律需先有對應行為測試,另案處理。
- **真機跨版本瀏覽器測試(Chrome 109 實測)**:本 branch 以 esbuild `target: 'chrome109'` 保證語法層;runtime API 驗證需真機/舊版 headless 環境,建議後續評估 Playwright。
- **background script / 套件環境測試**:Danny 第 2 點的進階建議,涉及測試架構重規劃,另案。
