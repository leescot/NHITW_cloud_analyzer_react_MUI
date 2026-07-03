# 架構優化階段 1+2 實作計畫(Vitest 遷移 + 清理 + SettingsContext)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 headless 測試安全網(Vitest)、清除死碼與 debug log,然後以 SettingsContext 消除 `generalDisplaySettings` 的 prop drilling,並修復 FloatingIcon 的 stale closure bug。

**Architecture:** 階段 1 先把現有 11 個瀏覽器 Mocha 測試檔遷移到 Vitest(node + jsdom),建立可在 CI 跑的安全網;再建 `debugLog` util 收斂 183 個 `console.log`。階段 2 新增 `src/contexts/SettingsContext.jsx`,Provider 掛在 FloatingIcon(dialog 樹的根),各元件改用 `useGeneralDisplaySettings()` hook,最後一次性移除所有 prop 傳遞。popup 是獨立 React root(`PopupSettings.jsx` 自有 state),**不在遷移範圍**;hook 在無 Provider 時回傳預設值,保證安全。

**Tech Stack:** Vitest 3 + jsdom + @testing-library/react(renderHook)、React 19 Context、既有 esbuild/vite 建置不變。

**規格文件:** `docs/superpowers/specs/2026-07-02-architecture-analysis.md`
**分支:** `refactor-phase1-2`(已建立,基於 feature-CKM)

> **進度(2026-07-02):** 15 個 task 全數完成,每個 task 皆通過 spec 審查 + 品質審查兩階段;另依最終整體審查補了一個收尾 commit(移除 CKM 卡片死的 `gds` prop 傳遞)。自動化驗證:Vitest 125 測試全綠、build 成功、ESLint 相對基準淨減 94 個問題(no-console / rules-of-hooks / 新增 no-undef 均為 0)。已 squash merge 回 `feature-CKM`;手動煙霧測試(Task 15 Step 3)尚待人工執行。
>
> **審查發現的既存問題(後續追蹤,非本計畫引入):**
> 1. `LabData.jsx` 複製全部路徑引用不存在的 `setSnackbarMessage`(潛在 ReferenceError)
> 2. `userInfoUtils.js` 有與 `ageUtils` 近似的年齡計算,值得整併
> 3. `Overview_AdultHealthCheck / CancerScreening / hbcvdata` 三檔為死碼(已被 IntegratedHealthData 取代)
> 4. `CKMSummaryBar` 是唯一仍以 `gds` prop 接收顯示設定的元件(實際有使用,可後續遷移)
> 5. debug log 含病患身分證號(已改為 opt-in,可考慮遮罩)
> 6. `handleData` 內 `userInfo` 仍有既存 stale read(僅造成多餘 re-render,無正確性問題)

**每個 Task 完成後的通用驗證:** `npm run build` 成功 + `npx vitest run` 全綠(Task 1 之後)。

---

## 背景知識(worker 必讀)

1. **測試現況:** `tests/test_*.js` 共 11 檔,全部以 `import {assert} from './lib/chai.js';` 開頭,從 `./src/utils/X.js` import 被測模組(由 `tests/serve.js` 把 `/src/` 映射到репо的 `../src/`)。測試檔內**沒有** mocha 特有語法(無 `this.timeout`、無 `before/beforeEach`),遷移純粹是改 import。
2. **`npm run test` 目前是「手動測試流程」**(build + 起 server),不是 unit test runner。本計畫把它改名 `test:manual`,`npm test` 改為 `vitest run`。
3. **popup 與 dialog 是兩個 React root:** `src/popup.jsx` → `PopupSettings.jsx`(自有 `generalDisplaySettings` state);`src/contentScript.jsx` → `FloatingIcon.jsx`。SettingsProvider 只掛 FloatingIcon 樹。`TypographySizeWrapper`/`LineSpacingWrapper` 只在 dialog 樹使用(已驗證 settings/ 與 PopupSettings 沒有 import 它們)。
4. **`src/utils/tabColorUtils.js` 是純函數**,以參數接收 `generalDisplaySettings`,**不改**,呼叫端從 hook 取值傳入即可。
5. UI 字串、註解、commit message 用繁體中文。

---

### Task 1: Vitest 基礎建設

**Files:**
- Modify: `package.json`(devDependencies、scripts)
- Create: `vitest.config.js`
- Create: `tests/vitest.setup.js`
- Modify: `tests/test_allergyProcessor.js`(先遷移一檔驗證 runner)

- [x] **Step 1: 安裝依賴**

```bash
npm install -D vitest jsdom @testing-library/react
```

- [x] **Step 2: 建立 `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/vitest.setup.js'],
    include: ['tests/test_*.js', 'tests/*.test.{js,jsx}'],
  },
});
```

- [x] **Step 3: 建立 `tests/vitest.setup.js`(stub chrome API)**

```js
// 提供最小 chrome API stub,讓引用 chrome.* 的模組(如 medicationProcessor)可在 node 環境載入執行
if (!globalThis.chrome) {
  globalThis.chrome = {
    storage: {
      sync: {
        get: (defaults, cb) => cb?.(typeof defaults === 'object' && defaults !== null ? { ...defaults } : {}),
        set: (_items, cb) => cb?.(),
      },
      local: {
        get: (_defaults, cb) => cb?.({}),
        set: (_items, cb) => cb?.(),
      },
      onChanged: { addListener: () => {}, removeListener: () => {} },
    },
    runtime: {
      sendMessage: () => {},
      onMessage: { addListener: () => {}, removeListener: () => {} },
    },
  };
}
```

- [x] **Step 4: 更新 `package.json` scripts**

把:

```json
    "test": "vite build && node scripts/build.js --test && node tests/serve.js",
```

改為:

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "test:manual": "vite build && node scripts/build.js --test && node tests/serve.js",
```

- [x] **Step 5: 遷移第一個測試檔驗證 runner**

`tests/test_allergyProcessor.js` 開頭兩行 import:

```js
import {assert} from './lib/chai.js';

import {allergyProcessor} from './src/utils/allergyProcessor.js';
```

改為:

```js
import { describe, it, assert } from 'vitest';

import { allergyProcessor } from '../src/utils/allergyProcessor.js';
```

- [x] **Step 6: 執行並確認通過**

Run: `npx vitest run tests/test_allergyProcessor.js`
Expected: 4 tests passed(注意:此時其餘 test_*.js 仍是舊 import,vitest include 會掃到而失敗,所以只跑單檔)

- [x] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.js tests/vitest.setup.js tests/test_allergyProcessor.js
git commit -m "測試基礎建設:引入 Vitest headless 測試環境"
```

---

### Task 2: 遷移其餘 10 個測試檔、移除 Mocha 瀏覽器 harness

**Files:**
- Modify: 下表 10 個測試檔(改法與 Task 1 Step 5 完全相同的兩行 import 模式)
- Delete: `tests/test.html`、`tests/test.js`、`tests/lib/`(chai.js、mocha.js、mocha.css)
- Modify: `eslint.config.js`(tests 區塊移除 mocha globals)
- Modify: `tests/README.md`

- [x] **Step 1: 逐檔改 import(模式一律相同)**

每檔第一行 `import {assert} from './lib/chai.js';` → `import { describe, it, assert } from 'vitest';`,且 `from './src/…'` → `from '../src/…'`:

| 檔案 | 被測模組 import 改為 |
|------|---------------------|
| `tests/test_chineseMedProcessor.js` | `'../src/utils/chineseMedProcessor.js'` |
| `tests/test_ckmUtils.js` | `'../src/utils/ckmUtils.js'` |
| `tests/test_dischargeProcessor.js` | `'../src/utils/dischargeProcessor.js'` |
| `tests/test_imagingProcessor.js` | `'../src/utils/imagingProcessor.js'` |
| `tests/test_labProcessor.js` | `'../src/utils/labProcessor.js'` |
| `tests/test_medDaysProcessor.js` | `'../src/utils/medDaysProcessor.js'` |
| `tests/test_medicationProcessor.js` | `'../src/utils/medicationProcessor.js'` |
| `tests/test_patientSummaryProcessor.js` | `'../src/utils/patientSummaryProcessor.js'` |
| `tests/test_screeningIndicators.js` | `'../src/utils/screeningIndicators.js'` |
| `tests/test_surgeryProcessor.js` | `'../src/utils/surgeryProcessor.js'` |

- [x] **Step 2: 全量執行**

Run: `npx vitest run`
Expected: 11 個檔案全部通過。若個別測試因環境差異失敗(例如依賴瀏覽器行為),先如實記錄失敗內容再修——不可用 skip 掩蓋。

- [x] **Step 3: 刪除 Mocha harness**

```bash
git rm tests/test.html tests/test.js tests/lib/chai.js tests/lib/mocha.js tests/lib/mocha.css
```

注意:**保留** `tests/index.html` 與 `tests/serve.js`(手動測試流程仍在用)、`tests/test_data/`。

- [x] **Step 4: 更新 `eslint.config.js` tests 區塊**

把:

```js
  {
    files: [
      'tests/**/*.js',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
      },
    },
  },
```

改為(describe/it 現在是顯式 import,不需 mocha globals;ignores 中的 `tests/lib/**/*.js` 一併移除,因目錄已刪):

```js
  {
    files: [
      'tests/**/*.js',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
```

同時把檔案頂部 `ignores` 陣列中的 `'tests/lib/**/*.js',` 這行刪除。

- [x] **Step 5: 改寫 `tests/README.md`** 為以下內容:

````markdown
# 測試

## 單元測試(Vitest)

```bash
npm test          # 跑全部單元測試
npm run test:watch  # watch 模式
npx vitest run tests/test_labProcessor.js  # 跑單檔
```

測試檔:`tests/test_*.js`(processor 純函數測試)、`tests/*.test.{js,jsx}`(util 與 React hook 測試)。
chrome API 的最小 stub 在 `tests/vitest.setup.js`。

## 手動測試(瀏覽器)

```bash
npm run test:manual
```

以 TEST 模式建置擴充功能到 `dist/`(host permissions 加入 localhost)並起本機 server。
Chrome 載入 `dist/` 未封裝擴充功能後,開 `http://localhost:5173/`,
用 popup 的「載入本地資料」上傳 `tests/test_data/` 內的 JSON 進行手動驗證。
````

- [x] **Step 6: 執行 lint 與測試確認全綠**

Run: `npx eslint && npx vitest run`
Expected: 皆無錯誤

- [x] **Step 7: Commit**

```bash
git add -A tests eslint.config.js
git commit -m "測試遷移:11 個測試檔改用 Vitest,移除瀏覽器 Mocha harness"
```

---

### Task 3: 死碼清理

**Files:**
- Delete: `vite.extension.config.js`
- Modify: `src/components/FloatingIcon.jsx`(刪註解掉的 import)
- Modify: `CLAUDE.md`、`DOC/Structure.md`

- [x] **Step 1: 刪除未使用的 build config**

```bash
git rm vite.extension.config.js
```

(已驗證:除文件外無任何程式引用它)

- [x] **Step 2: 刪除 `FloatingIcon.jsx` 中註解掉的 import 與註解塊**

刪除以下各行(依目前檔案內容):

```jsx
// import CloseIcon from "@mui/icons-material/Close";
// import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
// import ContentCopyIcon from "@mui/icons-material/ContentCopy";
// import VisibilityIcon from '@mui/icons-material/Visibility';
// import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
// 刪除未使用的組件和函數,或移動到實際使用它們的地方
// ImagingTable, getLabStatusColor, getLabValueColor
```

- [x] **Step 3: 更新 `CLAUDE.md`**

(a) Build pipeline 段落,把:

```
`vite.extension.config.js` exists but is not used by the npm scripts — the active path is `scripts/build.js`.
```

改為:

```
The active bundling path for content/background is `scripts/build.js`.
```

(b) Common commands 段落,把:

```
npm run test             # build in TEST mode (adds http://localhost/* to manifest), then `node tests/serve.js` — open http://localhost:5173/test.html for unit tests, http://localhost:5173/ for manual testing
```

改為:

```
npm test                 # Vitest 單元測試(headless,node + jsdom)
npm run test:watch       # Vitest watch 模式
npm run test:manual      # build in TEST mode (adds http://localhost/* to manifest), then `node tests/serve.js` — open http://localhost:5173/ for manual testing
```

(c) 同段落下方 Manual extension testing flow 的敘述,把 `npm run test` 全部改成 `npm run test:manual`,並把「Unit tests run in-browser via Mocha at `/test.html`; there is no headless test runner. To run a single processor's tests, open `/test.html` and use Mocha's UI filter, or temporarily comment imports in `tests/test.js`.」改為「Unit tests run headless via Vitest (`npm test`); run a single file with `npx vitest run tests/test_<name>.js`.」

(d) `DOC/Structure.md`:找到提及 `vite.extension.config.js` 的行,刪除該行(或該項目)。

- [x] **Step 4: 驗證 build 不受影響**

Run: `npm run build && npx vitest run`
Expected: 皆成功

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "清理:移除未使用的 vite.extension.config.js 與註解掉的死碼,更新文件"
```

---

### Task 4: debugLog util(TDD)

**Files:**
- Create: `src/utils/logger.js`
- Test: `tests/logger.test.js`

- [x] **Step 1: 先寫失敗測試 `tests/logger.test.js`**

```js
import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';

import { debugLog, _resetDebugCache } from '../src/utils/logger.js';

describe('utils/logger', function () {
  let logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    _resetDebugCache();
    localStorage.removeItem('nhitw_debug');
  });

  afterEach(() => {
    logSpy.mockRestore();
    localStorage.removeItem('nhitw_debug');
    _resetDebugCache();
  });

  it('預設(無 debug flag)不輸出', function () {
    debugLog('hello');
    assert.equal(logSpy.mock.calls.length, 0);
  });

  it('localStorage nhitw_debug=1 時輸出', function () {
    localStorage.setItem('nhitw_debug', '1');
    _resetDebugCache();
    debugLog('hello', 123);
    assert.equal(logSpy.mock.calls.length, 1);
    assert.deepEqual(logSpy.mock.calls[0], ['hello', 123]);
  });

  it('localStorage 不可用時安全地不輸出(不拋錯)', function () {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      get() { throw new Error('unavailable'); },
      configurable: true,
    });
    _resetDebugCache();
    assert.doesNotThrow(() => debugLog('hello'));
    Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true });
  });
});
```

- [x] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/logger.test.js`
Expected: FAIL(找不到 `../src/utils/logger.js`)

- [x] **Step 3: 實作 `src/utils/logger.js`**

```js
// logger.js
// 統一的 debug 輸出。預設靜默;在 console 執行
// localStorage.setItem('nhitw_debug', '1') 後重新整理即可開啟現場除錯。
// console.error / console.warn 不經過此模組,照常直接使用。

let cachedEnabled = null;

const isDebugEnabled = () => {
  if (cachedEnabled === null) {
    try {
      cachedEnabled = globalThis.localStorage?.getItem('nhitw_debug') === '1';
    } catch {
      // service worker 等無 localStorage 的環境
      cachedEnabled = false;
    }
  }
  return cachedEnabled;
};

// 測試用:重設快取
export const _resetDebugCache = () => {
  cachedEnabled = null;
};

export const debugLog = (...args) => {
  if (isDebugEnabled()) {
    console.log(...args);
  }
};
```

- [x] **Step 4: 執行確認通過**

Run: `npx vitest run tests/logger.test.js`
Expected: 3 tests passed

- [x] **Step 5: Commit**

```bash
git add src/utils/logger.js tests/logger.test.js
git commit -m "新增 debugLog util:以 localStorage flag 控制的除錯輸出"
```

---

### Task 5: console.log 清理 — src/utils

**Files(含 console.log 的 utils 檔,括號為數量):**
`medicationCopyFormatter.js`(17)、`medicationProcessor.js`(15)、`settingsHelper.js`(10)、`settingsManager.js`(9)、`labCopyFormatter.js`(9)、`dataManager.js`(5)、`labProcessorModules/formattingUtils.js`(4)、`patientSummaryProcessor.js`(3)、`hbcvdataProcessor.js`(3)、`surgeryProcessor.js`(2)、`medDaysProcessor.js`(2)、`imagingProcessor.js`(2)、`dischargeProcessor.js`(2)、`ckmProcessor.js`(2)、`allergyProcessor.js`(2)、`labProcessorModules/index.js`(1)、`labProcessorModules/deduplicationUtils.js`(1)、`dashboardProcessor.js`(1)、`chineseMedProcessor.js`(1)

**轉換規則(三選一,逐行判斷):**
1. **已註解的 `// console.log(...)` 行 → 整行刪除**(含 medicationProcessor.js 529-533 這類多行註解塊)。
2. **debug 訊息(輸出中間狀態、"Processing X"、變數傾印)→ 改用 `debugLog`**:檔案頂部加 `import { debugLog } from './logger';`(labProcessorModules 內為 `'../logger'`),`console.log(` 改為 `debugLog(`。
3. **`console.error` / `console.warn` 一律保留不動。**

- [x] **Step 1: 逐檔套用轉換規則**(上列 19 檔)

- [x] **Step 2: 驗證**

Run: `grep -rn "console\.log" src/utils --include="*.js" | grep -v logger.js`
Expected: 無輸出

Run: `npx vitest run && npm run build`
Expected: 全綠(processor 測試可即時抓到誤刪邏輯)

- [x] **Step 3: Commit**

```bash
git add src/utils
git commit -m "清理:src/utils 的 console.log 改用 debugLog 或刪除"
```

---

### Task 6: console.log 清理 — src 頂層

**Files:** `src/localDataHandler.js`(10)、`src/App.jsx`(5)、`src/legacyContent.js`(4)、`src/contentScript.jsx`(4)

轉換規則同 Task 5。import 路徑:`import { debugLog } from './utils/logger';`

- [x] **Step 1: 逐檔套用轉換規則**

- [x] **Step 2: 驗證**

Run: `grep -rn "console\.log" src/*.js src/*.jsx`
Expected: 無輸出

Run: `npm run build`
Expected: 成功(legacyContent/contentScript 走 esbuild,確認 IIFE bundle 沒問題)

- [x] **Step 3: Commit**

```bash
git add src/localDataHandler.js src/App.jsx src/legacyContent.js src/contentScript.jsx
git commit -m "清理:src 頂層的 console.log 改用 debugLog 或刪除"
```

---

### Task 7: console.log 清理 — src/components + 啟用 ESLint no-console

**Files(含 console.log 的元件檔):**
`tabs/Overview_LabTests.jsx`(19)、`tabs/LabCustomFormatEditor.jsx`(10)、`tabs/Overview_hbcvdata.jsx`(4)、`tabs/Overview.jsx`(4)、`tabs/labCopyFormat/FormatElementsPanel.jsx`(4)、`tabs/lab/LabCopyFeatures.jsx`(4)、`settings/MedicationSettings.jsx`(4)、`tabs/Overview_ImportantMedications.jsx`(3)、`tabs/MedicationCustomFormatEditor.jsx`(3)、`tabs/medicationCopyFormat/useFormatEditorState.js`(3)、`tabs/labCopyFormat/useFormatEditorState.js`(3)、`settings/LabSettings.jsx`(2)、`PopupSettings.jsx`(2)、`tabs/LabTableView.jsx`(1)、`tabs/labCopyFormat/FormatPreview.jsx`(1)、`tabs/lab/LabItemDisplay.jsx`(1)、`settings/AdvancedSettings.jsx`(1)

轉換規則同 Task 5。import 路徑依深度:`components/` 下為 `'../utils/logger'`,`components/tabs/` 下為 `'../../utils/logger'`,`components/tabs/lab/` 等為 `'../../../utils/logger'`。

- [x] **Step 1: 逐檔套用轉換規則**

- [x] **Step 2: 在 `eslint.config.js` 啟用 no-console**

在 src 檔案區塊(`files: ['src/**/*.{js,jsx}', 'public/**/*.js']` 那塊)的 `rules` 中加入:

```js
      'no-console': ['error', { allow: ['warn', 'error'] }],
```

`src/utils/logger.js` 本身需要 `console.log`,在該檔的 `console.log(...args)` 行上方加:

```js
    // eslint-disable-next-line no-console
```

- [x] **Step 3: 驗證**

Run: `npx eslint`
Expected: 無錯誤(有漏網的 console.log 會在此暴露,逐一處理)

Run: `grep -rn "console\.log" src --include="*.js" --include="*.jsx" | grep -v logger.js`
Expected: 無輸出

Run: `npx vitest run && npm run build`
Expected: 全綠

- [x] **Step 4: Commit**

```bash
git add src/components eslint.config.js src/utils/logger.js
git commit -m "清理:src/components 的 console.log 收斂,啟用 ESLint no-console 規則"
```

---

### Task 8: ROC 生日年齡計算 util(TDD)+ FloatingIcon 去重複

**Files:**
- Create: `src/utils/ageUtils.js`
- Test: `tests/ageUtils.test.js`
- Modify: `src/components/FloatingIcon.jsx`(兩處重複邏輯改呼叫 util)

- [x] **Step 1: 先寫失敗測試 `tests/ageUtils.test.js`**

```js
import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';

import { calculateAgeFromROCBirthday, buildUserInfoFromLocal } from '../src/utils/ageUtils.js';

describe('utils/ageUtils', function () {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  describe('.calculateAgeFromROCBirthday', function () {
    // '0790115' = 民國79年1月15日 = 1990-01-15
    it('今年生日已過 → 足歲', function () {
      vi.setSystemTime(new Date(2026, 6, 2)); // 2026-07-02
      assert.equal(calculateAgeFromROCBirthday('0790115'), 36);
    });

    it('今年生日未到(月份未到)→ 少一歲', function () {
      vi.setSystemTime(new Date(2026, 0, 10)); // 2026-01-10
      assert.equal(calculateAgeFromROCBirthday('0790115'), 35);
    });

    it('當月但日期未到 → 少一歲', function () {
      vi.setSystemTime(new Date(2026, 0, 14)); // 2026-01-14
      assert.equal(calculateAgeFromROCBirthday('0790115'), 35);
    });

    it('生日當天 → 足歲', function () {
      vi.setSystemTime(new Date(2026, 0, 15)); // 2026-01-15
      assert.equal(calculateAgeFromROCBirthday('0790115'), 36);
    });

    it('無效輸入回傳 null', function () {
      assert.isNull(calculateAgeFromROCBirthday(null));
      assert.isNull(calculateAgeFromROCBirthday(undefined));
      assert.isNull(calculateAgeFromROCBirthday(''));
      assert.isNull(calculateAgeFromROCBirthday('123'));      // 長度不是 7
      assert.isNull(calculateAgeFromROCBirthday('abcdefg')); // 非數字
    });
  });

  describe('.buildUserInfoFromLocal', function () {
    it('組出含年齡的 userInfo', function () {
      vi.setSystemTime(new Date(2026, 6, 2));
      const local = { name: '王小明', userId: 'A123456789', gender: 'M', birthday: '0790115' };
      assert.deepEqual(buildUserInfoFromLocal(local), {
        name: '王小明',
        userId: 'A123456789',
        gender: 'M',
        birthday: '0790115',
        age: 36,
      });
    });

    it('null 輸入回傳 null', function () {
      assert.isNull(buildUserInfoFromLocal(null));
    });
  });
});
```

- [x] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/ageUtils.test.js`
Expected: FAIL(模組不存在)

- [x] **Step 3: 實作 `src/utils/ageUtils.js`**

```js
// ageUtils.js
// 民國年生日字串(YYYMMDD,7 碼)相關計算

/**
 * 由民國年生日字串計算足歲年齡
 * @param {string} rocBirthday - 7 碼民國年生日,如 '0790115'
 * @returns {number|null} 足歲;無效輸入回傳 null
 */
export const calculateAgeFromROCBirthday = (rocBirthday) => {
  if (!rocBirthday || typeof rocBirthday !== 'string' || rocBirthday.length !== 7) return null;
  const rocYear = parseInt(rocBirthday.substring(0, 3), 10);
  const month = parseInt(rocBirthday.substring(3, 5), 10);
  const day = parseInt(rocBirthday.substring(5, 7), 10);
  if (Number.isNaN(rocYear) || Number.isNaN(month) || Number.isNaN(day)) return null;

  const birthDate = new Date(rocYear + 1911, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day)
  ) {
    age--;
  }
  return age;
};

/**
 * 由本地 JSON 匯入的使用者資料組出 userInfo 物件
 * @param {Object|null} local - window._localUserInfo 的內容
 * @returns {Object|null}
 */
export const buildUserInfoFromLocal = (local) => {
  if (!local) return null;
  return {
    name: local.name,
    userId: local.userId,
    gender: local.gender,
    birthday: local.birthday,
    age: calculateAgeFromROCBirthday(local.birthday),
  };
};
```

- [x] **Step 4: 執行確認通過**

Run: `npx vitest run tests/ageUtils.test.js`
Expected: 7 tests passed

- [x] **Step 5: FloatingIcon 兩處重複改用 util**

`src/components/FloatingIcon.jsx` 加 import:

```jsx
import { buildUserInfoFromLocal } from "../utils/ageUtils";
```

(a) `handleData` 尾端(「本地 JSON 匯入時重新取得使用者資訊」區塊),把整段:

```jsx
    if (!userInfo && window._localUserInfo) {
      const local = window._localUserInfo;
      let age = null;
      if (local.birthday && local.birthday.length === 7) {
        const rocYear = parseInt(local.birthday.substring(0, 3), 10);
        const month = parseInt(local.birthday.substring(3, 5), 10);
        const day = parseInt(local.birthday.substring(5, 7), 10);
        const birthDate = new Date(rocYear + 1911, month - 1, day);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--;
      }
      setUserInfo({ name: local.name, userId: local.userId, gender: local.gender, birthday: local.birthday, age });
    }
```

改為:

```jsx
    if (!userInfo && window._localUserInfo) {
      setUserInfo(buildUserInfoFromLocal(window._localUserInfo));
    }
```

(b) `useEffect([open])` 內(dialog 開啟時取使用者資訊),把:

```jsx
      let info = extractUserInfoFromToken();
      // Fallback: 本地 JSON 匯入的使用者資訊
      if (!info && window._localUserInfo) {
        const local = window._localUserInfo;
        let age = null;
        if (local.birthday && local.birthday.length === 7) {
          const rocYear = parseInt(local.birthday.substring(0, 3), 10);
          const month = parseInt(local.birthday.substring(3, 5), 10);
          const day = parseInt(local.birthday.substring(5, 7), 10);
          const birthDate = new Date(rocYear + 1911, month - 1, day);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--;
        }
        info = { name: local.name, userId: local.userId, gender: local.gender, birthday: local.birthday, age };
      }
      setUserInfo(info);
```

改為:

```jsx
      let info = extractUserInfoFromToken();
      // Fallback: 本地 JSON 匯入的使用者資訊
      if (!info && window._localUserInfo) {
        info = buildUserInfoFromLocal(window._localUserInfo);
      }
      setUserInfo(info);
```

- [x] **Step 6: 驗證與 Commit**

Run: `npx vitest run && npm run build`
Expected: 全綠

```bash
git add src/utils/ageUtils.js tests/ageUtils.test.js src/components/FloatingIcon.jsx
git commit -m "重構:民國年年齡計算抽出 ageUtils,消除 FloatingIcon 重複邏輯"
```

---

### Task 9: SettingsContext + hooks(TDD)

**Files:**
- Create: `src/contexts/SettingsContext.jsx`
- Test: `tests/SettingsContext.test.jsx`

- [x] **Step 1: 先寫失敗測試 `tests/SettingsContext.test.jsx`**

```jsx
import { describe, it, assert } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';

import {
  SettingsProvider,
  useAppSettings,
  useGeneralDisplaySettings,
} from '../src/contexts/SettingsContext.jsx';
import { DEFAULT_SETTINGS } from '../src/config/defaultSettings.js';

describe('contexts/SettingsContext', function () {
  it('useGeneralDisplaySettings 無 Provider 時回傳預設值', function () {
    const { result } = renderHook(() => useGeneralDisplaySettings());
    assert.deepEqual(result.current, DEFAULT_SETTINGS.general);
  });

  it('useGeneralDisplaySettings 回傳 Provider 提供的值', function () {
    const provided = { ...DEFAULT_SETTINGS.general, contentTextSize: 'large' };
    const wrapper = ({ children }) => (
      <SettingsProvider appSettings={{}} generalDisplaySettings={provided}>
        {children}
      </SettingsProvider>
    );
    const { result } = renderHook(() => useGeneralDisplaySettings(), { wrapper });
    assert.equal(result.current.contentTextSize, 'large');
  });

  it('useAppSettings 回傳 Provider 提供的值', function () {
    const provided = { western: { showDiagnosis: true } };
    const wrapper = ({ children }) => (
      <SettingsProvider appSettings={provided} generalDisplaySettings={DEFAULT_SETTINGS.general}>
        {children}
      </SettingsProvider>
    );
    const { result } = renderHook(() => useAppSettings(), { wrapper });
    assert.deepEqual(result.current, provided);
  });

  it('useAppSettings 無 Provider 時回傳預設 shape(含 western/lab/general 等)', function () {
    const { result } = renderHook(() => useAppSettings());
    assert.isObject(result.current.western);
    assert.isObject(result.current.lab);
  });
});
```

- [x] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/SettingsContext.test.jsx`
Expected: FAIL(模組不存在)

- [x] **Step 3: 實作 `src/contexts/SettingsContext.jsx`**

```jsx
// SettingsContext.jsx
// 提供 appSettings 與 generalDisplaySettings 給 FloatingIcon 樹下所有元件,
// 取代逐層 prop 傳遞。popup 是獨立 React root、自有設定 state,不掛此 Provider;
// hooks 在無 Provider 時回傳 DEFAULT_SETTINGS 對應值,確保任何環境下皆安全。
import React, { createContext, useContext, useMemo } from 'react';

import { DEFAULT_SETTINGS } from '../config/defaultSettings';

const FALLBACK_APP_SETTINGS = {
  western: DEFAULT_SETTINGS.western,
  atc5: DEFAULT_SETTINGS.atc5,
  chinese: DEFAULT_SETTINGS.chinese,
  lab: DEFAULT_SETTINGS.lab,
  overview: DEFAULT_SETTINGS.overview,
  display: DEFAULT_SETTINGS.display,
  cloud: DEFAULT_SETTINGS.cloud,
};

const SettingsContext = createContext(null);

export const SettingsProvider = ({ appSettings, generalDisplaySettings, children }) => {
  const value = useMemo(
    () => ({ appSettings, generalDisplaySettings }),
    [appSettings, generalDisplaySettings]
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useAppSettings = () => {
  return useContext(SettingsContext)?.appSettings ?? FALLBACK_APP_SETTINGS;
};

export const useGeneralDisplaySettings = () => {
  return useContext(SettingsContext)?.generalDisplaySettings ?? DEFAULT_SETTINGS.general;
};
```

注意:若 `DEFAULT_SETTINGS` 沒有 `display` 或 `cloud` 屬性,對應行改為空物件 `{}`(先開 `src/config/defaultSettings.js` 確認)。

- [x] **Step 4: 執行確認通過**

Run: `npx vitest run tests/SettingsContext.test.jsx`
Expected: 4 tests passed

- [x] **Step 5: Commit**

```bash
git add src/contexts/SettingsContext.jsx tests/SettingsContext.test.jsx
git commit -m "新增 SettingsContext:集中提供 appSettings 與 generalDisplaySettings"
```

---

### Task 10: FloatingIcon 掛 Provider + 修復 stale closure bug

**Files:**
- Modify: `src/components/FloatingIcon.jsx`

**背景:** 掛載用的 `useEffect(..., [])` 內註冊的 message listener 讀取 `open` 與 `appSettings`,但閉包捕捉的是初始 render 的值(stale closure)。`handleData` 同樣把閉包中的 `appSettings` 傳給 `handleAllData`。修法:以 ref 保存最新值,listener 一律讀 ref。

- [x] **Step 1: 加 import**

```jsx
import React, { useState, useEffect, useRef } from "react";
import { SettingsProvider } from "../contexts/SettingsContext";
```

- [x] **Step 2: 在 state 宣告區之後(`snackbarOpen` 宣告附近)加入 ref 與同步 effect**

```jsx
  // 以 ref 保存最新值,供掛載時註冊的 listener 讀取(修復 stale closure)
  const openRef = useRef(open);
  const appSettingsRef = useRef(appSettings);
  useEffect(() => {
    openRef.current = open;
    appSettingsRef.current = appSettings;
  });
```

- [x] **Step 3: 掛載 effect 內的 listener 改讀 ref**

在 `listenForMessages` 的 callback 內(四個 `message.action` 分支):
- 所有 `if (!open) {` → `if (!openRef.current) {`(共 4 處)
- `appSettings.western.enableMedicationCustomCopyFormat` → `appSettingsRef.current.western.enableMedicationCustomCopyFormat`(共 2 處)
- `appSettings.lab.enableLabCustomCopyFormat` → `appSettingsRef.current.lab.enableLabCustomCopyFormat`(共 2 處)

在 `listenForDataFetchCompletion` 的 callback 內:
- `handleDataFetchCompletedSettingsChange(event, appSettings, setAppSettings, callbacks)` → `handleDataFetchCompletedSettingsChange(event, appSettingsRef.current, setAppSettings, callbacks)`

- [x] **Step 4: `handleData` 改讀 ref**

```jsx
    const results = await handleAllData(dataSources, appSettings, setters);
```

改為:

```jsx
    const results = await handleAllData(dataSources, appSettingsRef.current, setters);
```

- [x] **Step 5: 以 SettingsProvider 包住整個 return**

把 return 的最外層 fragment `<>` / `</>`:

```jsx
  return (
    <>
      <IconButton ...>
      ...
    </>
  );
```

改為:

```jsx
  return (
    <SettingsProvider appSettings={appSettings} generalDisplaySettings={generalDisplaySettings}>
      <IconButton ...>
      ...
    </SettingsProvider>
  );
```

- [x] **Step 6: 驗證**

Run: `npx vitest run && npm run build && npx eslint src/components/FloatingIcon.jsx`
Expected: 全綠

- [x] **Step 7: Commit**

```bash
git add src/components/FloatingIcon.jsx
git commit -m "修復 FloatingIcon stale closure,並掛上 SettingsProvider"
```

---

## 元件遷移共用配方(Task 11–13 適用)

對每個目標檔案:

1. 加 import(路徑依檔案深度調整):
   - `src/components/utils/` 與 `src/components/tabs/` → `import { useGeneralDisplaySettings } from "../../contexts/SettingsContext";`
   - `src/components/tabs/lab/`、`tabs/medication/`、`tabs/ckm/` → `import { useGeneralDisplaySettings } from "../../../contexts/SettingsContext";`
2. 從元件的 props 解構中**移除** `generalDisplaySettings`(含預設值寫法如 `generalDisplaySettings = {}`)。
3. 在元件函數體開頭加:`const generalDisplaySettings = useGeneralDisplaySettings();`
4. **此階段不要動 JSX 中往子元件傳的 `generalDisplaySettings={...}`**——留給 Task 14 一次清除(子元件改用 hook 後,多餘的 prop 無害)。
5. 若一個檔案 export 多個元件(如 `LayoutComponents.jsx`),每個接收此 prop 的元件都套用步驟 2–3。
6. 若元件把 `generalDisplaySettings` 傳給純函數(如 `getTabColor(generalDisplaySettings, ...)`),不需改呼叫方式——hook 取得的值直接傳入。

每批完成後驗證:`npm run build && npx eslint <該批檔案>` 全綠。

---

### Task 11: 遷移批次 A — 共用 wrappers + tabs 頂層(15 檔)

**Files(Modify,依共用配方):**
- `src/components/utils/TypographySizeWrapper.jsx`
- `src/components/utils/LineSpacingWrapper.jsx`
- `src/components/tabs/Overview.jsx`
- `src/components/tabs/MedicationList.jsx`
- `src/components/tabs/MedicationTable.jsx`
- `src/components/tabs/ChineseMedicine.jsx`
- `src/components/tabs/LabData.jsx`
- `src/components/tabs/LabTableView.jsx`
- `src/components/tabs/ImagingData.jsx`
- `src/components/tabs/MedDaysData.jsx`
- `src/components/tabs/Instructions.jsx`
- `src/components/tabs/AdvancedSettings.jsx`
- `src/components/tabs/CKMData.jsx`
- `src/components/tabs/MedicationCustomFormatEditor.jsx`
- `src/components/tabs/LabCustomFormatEditor.jsx`

- [x] **Step 1: 對上列 15 檔逐一套用共用配方**

範例(`MedicationList.jsx`,其餘檔案同模式):

```jsx
// 修改前
const MedicationList = ({ groupedMedications, settings, copyFormat, generalDisplaySettings }) => {
```

```jsx
// 修改後
import { useGeneralDisplaySettings } from "../../contexts/SettingsContext";
// ...
const MedicationList = ({ groupedMedications, settings, copyFormat }) => {
  const generalDisplaySettings = useGeneralDisplaySettings();
```

- [x] **Step 2: 驗證**

Run: `npm run build && npx eslint src/components/tabs src/components/utils`
Expected: 全綠

- [x] **Step 3: Commit**

```bash
git add src/components/tabs src/components/utils
git commit -m "SettingsContext 遷移(批次A):tabs 頂層元件與文字包裝元件改用 hook"
```

---

### Task 12: 遷移批次 B — Overview_* 卡片(12 檔)

**Files(Modify,依共用配方,import 路徑為 `"../../contexts/SettingsContext"`):**
- `src/components/tabs/Overview_AdultHealthCheck.jsx`
- `src/components/tabs/Overview_AllergyRecords.jsx`
- `src/components/tabs/Overview_CancerScreening.jsx`
- `src/components/tabs/Overview_DischargeRecords.jsx`
- `src/components/tabs/Overview_hbcvdata.jsx`
- `src/components/tabs/Overview_ImagingTests.jsx`
- `src/components/tabs/Overview_ImportantMedications.jsx`
- `src/components/tabs/Overview_IntegratedHealthData.jsx`
- `src/components/tabs/Overview_LabTests.jsx`
- `src/components/tabs/Overview_PatientSummary.jsx`
- `src/components/tabs/Overview_RecentDiagnosis.jsx`
- `src/components/tabs/Overview_SurgeryRecords.jsx`

- [x] **Step 1: 對上列 12 檔逐一套用共用配方**

- [x] **Step 2: 驗證**

Run: `npm run build && npx eslint src/components/tabs`
Expected: 全綠

- [x] **Step 3: Commit**

```bash
git add src/components/tabs
git commit -m "SettingsContext 遷移(批次B):Overview 各區塊卡片改用 hook"
```

---

### Task 13: 遷移批次 C — lab/、medication/、ckm/ 子目錄(11 檔)

**Files(Modify,依共用配方,import 路徑為 `"../../../contexts/SettingsContext"`):**
- `src/components/tabs/lab/LabHeader.jsx`
- `src/components/tabs/lab/LabItemDisplay.jsx`
- `src/components/tabs/lab/LabSearch.jsx`
- `src/components/tabs/lab/LayoutComponents.jsx`(多元件檔,逐一處理)
- `src/components/tabs/lab/TypeBasedLayout.jsx`
- `src/components/tabs/medication/MedicationFilters.jsx`
- `src/components/tabs/medication/MedicationGroup.jsx`
- `src/components/tabs/medication/MedicationItem.jsx`
- `src/components/tabs/medication/MedicationTermGroups.jsx`
- `src/components/tabs/ckm/CKMExtraLabCard.jsx`
- `src/components/tabs/ckm/CKMImagingCard.jsx`

- [x] **Step 1: 對上列 11 檔逐一套用共用配方**

- [x] **Step 2: 驗證**

Run: `npm run build && npx eslint src/components/tabs`
Expected: 全綠

- [x] **Step 3: Commit**

```bash
git add src/components/tabs
git commit -m "SettingsContext 遷移(批次C):lab/medication/ckm 子元件改用 hook"
```

---

### Task 14: 移除所有 generalDisplaySettings prop 傳遞(final sweep)

**Files:** `src/components/` 下所有在 JSX 以 `generalDisplaySettings={...}` 傳 prop 的檔案。

- [x] **Step 1: 找出所有傳遞點**

Run: `grep -rn "generalDisplaySettings={" src/components --include="*.jsx"`

- [x] **Step 2: 逐一刪除該 prop**

刪除每個 `generalDisplaySettings={generalDisplaySettings}`(或其他右值)的 JSX 屬性。**唯一保留:** `FloatingIcon.jsx` 中 `<SettingsProvider ... generalDisplaySettings={generalDisplaySettings}>` 這一處。

- [x] **Step 3: FloatingIcon 內原本只為了往下傳而保留的解構/變數不動**(`generalDisplaySettings` 是它的 state,仍用於 Provider 與自身的指示器區塊)。

- [x] **Step 4: 驗證**

Run: `grep -rn "generalDisplaySettings={" src/components --include="*.jsx"`
Expected: 只剩 `FloatingIcon.jsx` 的 SettingsProvider 一行

Run: `grep -rln "generalDisplaySettings" src/components --include="*.jsx" | sort`
Expected: 出現的檔案裡,`generalDisplaySettings` 只以「hook 呼叫結果的 local 變數」形式存在(抽查 2–3 檔確認),`PopupSettings.jsx` 維持自有 state 不動

Run: `npx vitest run && npm run build && npx eslint`
Expected: 全綠

- [x] **Step 5: Commit**

```bash
git add src/components
git commit -m "SettingsContext 遷移收尾:移除 generalDisplaySettings 的逐層 prop 傳遞"
```

---

### Task 15: 文件更新與手動煙霧測試

**Files:**
- Modify: `CLAUDE.md`(架構段落)
- Modify: `docs/superpowers/specs/2026-07-02-architecture-analysis.md`(標記完成項)

- [x] **Step 1: CLAUDE.md 的 Settings 段落補充 Context**

在 `### Settings` 段落末尾加:

```markdown
In-page components under `FloatingIcon` read `generalDisplaySettings` (and `appSettings`) via `src/contexts/SettingsContext.jsx` hooks (`useGeneralDisplaySettings` / `useAppSettings`) instead of prop drilling. The provider is mounted in `FloatingIcon.jsx`; the popup tree (`PopupSettings.jsx`) has its own state and does not use this context.
```

- [x] **Step 2: 規格文件狀態更新**

`docs/superpowers/specs/2026-07-02-architecture-analysis.md` 開頭的 `> 狀態:` 改為 `分析完成;階段 1、2 已實作(見 plans/2026-07-02-refactor-phase1-2.md)`。

- [ ] **Step 3: 手動煙霧測試(需人工確認)**

```bash
npm run test:manual
```

1. Chrome 開發者模式載入 `dist/`。
2. 開 `http://localhost:5173/`,用 popup「載入本地資料」上傳 `tests/test_data/Fake_Data_250402.json`。
3. 開啟浮動圖示 dialog,確認:各 tab(西藥/中藥/檢驗/影像/餘藥)資料正常顯示。
4. popup 中調整「內容文字大小」設定,確認 dialog 內文字即時變化(Context 生效的關鍵驗證)。
5. 開啟「藥物自訂複製格式」設定後,從 popup 觸發「開啟自訂格式編輯器」,確認 dialog 能切到進階 tab(stale closure 修復的關鍵驗證——修復前需重新整理才會生效)。
6. Console 確認沒有 debug 輸出;執行 `localStorage.setItem('nhitw_debug','1')` 並重新整理,確認 debug 輸出出現。

- [x] **Step 4: Commit**

```bash
git add CLAUDE.md docs
git commit -m "文件更新:測試流程與 SettingsContext 架構說明"
```

---

## 驗收清單(對照規格)

- [x] `npm test` headless 跑過原 11 個測試檔 + 新增的 logger/ageUtils/SettingsContext 測試
- [x] 瀏覽器 Mocha harness 移除,`npm run test:manual` 手動流程保留
- [x] `src` 內無裸 `console.log`(ESLint no-console 把關),`debugLog` 可由 localStorage flag 開啟
- [x] `vite.extension.config.js` 與 FloatingIcon 註解死碼移除
- [x] `generalDisplaySettings` prop drilling 消除(僅剩 Provider、popup 自有 state、純函數參數)
- [x] FloatingIcon stale closure 修復(訊息切換 tab 依據當前設定)
- [x] ROC 年齡計算單一來源(`ageUtils.js`)
- [ ] `npm run build` 產出可載入的擴充功能,手動煙霧測試通過(build 已驗證成功;煙霧測試待人工執行)
