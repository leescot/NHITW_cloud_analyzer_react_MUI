# 階段 6：processor 輸出型別化 + legacyContent 改名模組化 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax.

**Goal:** 完成架構優化路線圖最後一階段：(A) 為所有 processor 輸出加 JSDoc `@typedef` 型別並建立可執行的 `type-check` 安全網；(B) 把名不符實的 `src/legacyContent.js`（499 行、核心 API 攔截層）改名為 `apiInterceptor` 並拆出可測模組。

**Architecture:** 兩部分、先低風險後中風險。Part A 先做（純新增，不改行為）：新增 `src/types/processors.js` 集中 `@typedef`，加 `jsconfig.json` + `typescript` devDep + `type-check` script，逐一 processor 的主方法加 `@returns`。Part B 後做：把 `legacyContent.js` 的乾淨接縫（path map、權限、normalization、message handlers）抽成 `src/apiInterceptor/` 下模組並補 Vitest 測試，主檔改名 `src/apiInterceptor/index.js` 保留 init/orchestration/patient-switch 狀態機，更新唯一引用點 `contentScript.jsx` 與文件。行為逐字保留，靠 build + Vitest（processor 測試 + 新增 normalizer/authorization 測試）當安全網。

**Tech Stack:** React + MUI、esbuild（content/background 打包）、**Vitest headless（`npm test`）**、TypeScript 僅作 `tsc --noEmit` 型別檢查（不編譯、無 runtime 影響）。

**慣例：** UI 字串/註解/commit 用繁體中文。每個 processor 已有 Vitest 測試（`tests/test_*.js`）作為 Part B 的行為安全網。

**分支：** `refactor-phase6`（已建立，自 refactor-phase5）。工作樹有 maintainer 的版本號 bump（package.json / manifest.json）未提交——**不要**動它們，所有 commit 以明確路徑 `git add`。

---

## 事實速查（來自程式碼探勘）

- `legacyContent.js`：499 行、**零 export**、side-effect 模組。唯一引用：`src/contentScript.jsx:24` 的 `import("./legacyContent.js")`（純副作用動態 import，無綁定）。`public/manifest.json`、`scripts/`、`vite*/vitest.config` **皆無**直接引用檔名。
- 接縫：`API_PATH_MAP`（21-36，14 項 Map）、`NODE_TO_DATA_TYPE`（38-52，13 項物件）、頁面判斷（91-109）、患者切換輪詢狀態機（56-59,113-192，含 module-level `let`）、授權（196-226：`getAuthorizedDataTypes`/`shouldFetchSpecialData`）、fetch 編排+normalize（230-363：`fetchAllDataTypes`/`fetchSingleDataType`/`normalizeResponseData`）、資料助手（367-381）、訊息處理（385-489：`setupMessageListeners`，最大 ~104 行）、`initialize`（61-87）、debug hooks（493-499）。
- 唯一寫入 `dataStore` 的路徑：`fetchSingleDataType` 內 `dataStore.setData(...)`（~332）與 `createEmptyDataResult`（~375）。完成後 dispatch `window` CustomEvent `"dataFetchCompleted"`。
- 安全 TODO：debug log 於 ~126 印出病患身分證號，應遮罩。
- 型別工具現況：**無** jsconfig/tsconfig、**無** typescript 依賴、**無** checkJs/type-check script、**無** `.d.ts`。全庫僅一個 `@typedef` 先例：`src/components/tabs/copyFormat/useFormatEditorState.js:10-16`（`@typedef {Object} FormatEditorConfig` + `@property`）。`npx tsc` 目前可用（5.9.3）。
- processor 輸出分兩類：**陣列**（medication[Promise]、lab、allergy、surgery、discharge、chineseMed、medDays、patientSummary）與**物件**（imaging `{withReport,withoutReport}`、cancerScreening、adultHealthCheck、hbcvdata）。

---

# PART A — Processor 輸出型別化

### Task 1: 型別工具 + 集中 typedef 模組

**Files:**
- Create: `jsconfig.json`
- Create: `src/types/processors.js`
- Modify: `package.json`（devDep + script）

- [x] **Step 1.1: 新增 `typescript` devDependency 與 type-check script**

在 `package.json` 的 `scripts` 加入（放在 `lint` 附近）：
```json
    "type-check": "tsc -p jsconfig.json --noEmit"
```
（實作時改用 `-p jsconfig.json` 明確指定設定檔，行為與純 `tsc --noEmit` 相同，僅避免依賴 tsc 對 jsconfig.json 的隱式探索。）
在 `devDependencies` 加入（版本對齊現有可用的 5.x）：
```json
    "typescript": "^5.9.3"
```
執行 `npm install`（若 typescript 已在 node_modules 則為 no-op）。

- [x] **Step 1.2: 新增 `jsconfig.json`**

全域 `checkJs:false`（型別僅供編輯器 intellisense 與 `import('...').Type` 解析）；逐檔用 `// @ts-check` 才啟用檢查，避免對從未型別化的大檔一次爆出海量錯誤。
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "checkJs": false,
    "allowJs": true,
    "noEmit": true,
    "strict": false,
    "skipLibCheck": true,
    "jsx": "preserve"
  },
  "include": ["src/**/*.js", "src/**/*.jsx", "tests/**/*.js"],
  "exclude": ["node_modules", "dist"]
}
```

- [x] **Step 1.3: 建立 `src/types/processors.js`（集中 typedef）**

此檔 `// @ts-check` 乾淨（純 typedef + 空 export）。依探勘的實際輸出形狀撰寫：

```js
// @ts-check
// Processor 輸出型別定義（JSDoc typedef，供編輯器與 tsc --noEmit 使用）
// 各 processor 主方法以 @returns {import('../types/processors.js').Xxx} 引用。

/**
 * @typedef {Object} MedicationItem
 * @property {string} name
 * @property {string} ingredient
 * @property {string} dosage        總量
 * @property {string} perDosage     每次劑量，或 'SPECIAL'
 * @property {string} frequency
 * @property {string} days
 * @property {string} atc_code
 * @property {string} atc_name
 * @property {number} drug_left
 * @property {string} drugcode
 */
/**
 * @typedef {Object} MedicationGroup
 * @property {string} date
 * @property {string} hosp
 * @property {string} visitType
 * @property {string} icd_code
 * @property {string} icd_name
 * @property {MedicationItem[]} medications
 */

/**
 * @typedef {Object} LabItem
 * @property {string} itemName
 * @property {string} value                 正規化後，可能為 "min-max" 區間字串
 * @property {string} unit
 * @property {boolean} hasMultipleValues
 * @property {{min:number,max:number,timePoints:any[]}|null} valueRange
 * @property {string} type
 * @property {string} orderName
 * @property {string} orderCode
 * @property {object|null} consultValue
 * @property {string|number|null} referenceMin
 * @property {string|number|null} referenceMax
 * @property {string} formattedReference
 * @property {boolean} isAbnormal
 * @property {'normal'|'high'|'low'} valueStatus
 * @property {string} abbrName
 * @property {string} assayMethod
 */
/**
 * @typedef {Object} LabGroup
 * @property {string} date
 * @property {string} hosp
 * @property {string} icd_code
 * @property {string} icd_name
 * @property {LabItem[]} labs
 */

/**
 * @typedef {Object} AllergyItem
 * @property {string} date
 * @property {string} drugName
 * @property {string} symptoms
 * @property {string} severity
 * @property {string} hospital
 */

/**
 * @typedef {Object} SurgeryItem
 * @property {string} date
 * @property {string} hospital
 * @property {string} diagnosis
 * @property {string} orderCode
 */

/**
 * @typedef {Object} DischargeItem
 * @property {string} in_date
 * @property {string} out_date
 * @property {string} date
 * @property {string} hospital
 * @property {string} hosp
 * @property {string} icd_code
 * @property {string} icd_cname
 * @property {string} [mds_file]
 * @property {string} [mds_pdf_file]
 */

/**
 * @typedef {Object} ImagingItem
 * @property {string} date
 * @property {string} hosp
 * @property {string} orderName
 * @property {string} orderCode
 * @property {string} [inspectResult]
 * @property {boolean} [hasReport]
 */
/**
 * @typedef {Object} ImagingResult
 * @property {ImagingItem[]} withReport
 * @property {ImagingItem[]} withoutReport
 */

/**
 * @typedef {Object} MedDaysItem
 * @property {string} drugName
 * @property {number} remainingDays
 * @property {string} expiryDate
 */

/**
 * @typedef {Object} PatientSummaryItem
 * @property {string} id
 * @property {string} text
 * @property {string} [iconImage]
 * @property {string} originalText
 */

/**
 * @typedef {Object} ChineseMedGroup
 * @property {string} date
 * @property {string} hosp
 * @property {string} [visitType]
 * @property {string} [icd_code]
 * @property {string} [icd_name]
 * @property {object[]} medications
 */

// 以下三型別為 API 原樣透傳（passthrough），結構依健保回傳而定
/** @typedef {object|null} CancerScreeningResult */
/** @typedef {object|null} AdultHealthCheckResult */
/** @typedef {object|null} HbcvResult */

export {};
```

- [x] **Step 1.4: 驗證**

Run: `npm run type-check`
Expected: 通過（0 errors）——此時只有 `src/types/processors.js` 與既有 `useFormatEditorState.js` 帶 `// @ts-check`，其餘 checkJs:false。

Run: `npm run build` → 成功
Run: `npm test` → 既有測試全綠（未新增測試，僅確認無破壞）

- [x] **Step 1.5: Commit**

```bash
git add jsconfig.json src/types/processors.js package.json package-lock.json
git commit -m "chore: 建立 processor 輸出 typedef 與 tsc --noEmit 型別檢查安全網"
```
（若 `package-lock.json` 無變更則不加。**勿** `git add -A`，避免帶入 maintainer 版本 bump。）

---

### Task 2: 各 processor 主方法加 `@returns` 型別註記

**Files（各加 JSDoc 註記於主方法上方，不改邏輯）:**
- `src/utils/medicationProcessor.js`（`processMedicationData` → `Promise<MedicationGroup[]>`）
- `src/utils/labProcessorModules/index.js`（`processLabData` → `LabGroup[]`）
- `src/utils/allergyProcessor.js`（`AllergyItem[]`）
- `src/utils/surgeryProcessor.js`（`SurgeryItem[]`）
- `src/utils/dischargeProcessor.js`（`DischargeItem[]`）
- `src/utils/imagingProcessor.js`（`ImagingResult`）
- `src/utils/chineseMedProcessor.js`（`ChineseMedGroup[]`）
- `src/utils/medDaysProcessor.js`（`MedDaysItem[]`）
- `src/utils/patientSummaryProcessor.js`（`PatientSummaryItem[]`）
- `src/utils/cancerScreeningProcessor.js`（`CancerScreeningResult`）
- `src/utils/adultHealthCheckProcessor.js`（`AdultHealthCheckResult`）
- `src/utils/hbcvdataProcessor.js`（`HbcvResult`）

- [x] **Step 2.1: 為每個主方法加 `@returns`**

範例（medicationProcessor.js，主方法 `processMedicationData` 上方）：
```js
  /**
   * @param {object} data 健保 medication API 原始回應（含 rObject）
   * @param {object} [rawChronicMed] 慢箋原始資料
   * @param {object|null} [formatSettings] 自訂複製格式設定
   * @returns {Promise<import('../types/processors.js').MedicationGroup[]>}
   */
  async processMedicationData(data, rawChronicMed, formatSettings) {
```

範例（labProcessorModules/index.js，`processLabData`；相對路徑多一層 → `../../types/...`）：
```js
  /**
   * @param {object} labData
   * @param {object} [settings]
   * @returns {import('../../types/processors.js').LabGroup[]}
   */
  processLabData(labData, settings = {}) {
```

其餘 10 個 processor 依相同格式加 `@returns {import('../types/processors.js').<Type>}`（`src/utils/*` 相對路徑為 `../types/processors.js`；`labProcessorModules/` 深一層為 `../../types/processors.js`）。**只加 JSDoc，不改任何邏輯，不加 `// @ts-check`**（避免大檔爆錯；本步驟目的是文件化契約 + 編輯器 intellisense）。

- [x] **Step 2.2: 驗證**

Run: `npm run type-check` → 通過（checkJs:false，僅解析 typedef 引用不報錯）
Run: `npm run build` → 成功
Run: `npm test` → 全綠

- [x] **Step 2.3: Commit**

```bash
git add src/utils/medicationProcessor.js src/utils/labProcessorModules/index.js src/utils/allergyProcessor.js src/utils/surgeryProcessor.js src/utils/dischargeProcessor.js src/utils/imagingProcessor.js src/utils/chineseMedProcessor.js src/utils/medDaysProcessor.js src/utils/patientSummaryProcessor.js src/utils/cancerScreeningProcessor.js src/utils/adultHealthCheckProcessor.js src/utils/hbcvdataProcessor.js
git commit -m "docs: 為各 processor 主方法標註輸出型別 @returns"
```

---

# PART B — legacyContent → apiInterceptor 改名模組化

> 原則：行為逐字保留。抽出的函數整段搬移，呼叫端改為 import。純函數補 Vitest 測試當安全網。每步 `npm run build` + `npm test`。

### Task 3: 抽出純設定模組（path map / permission map）

**Files:**
- Create: `src/apiInterceptor/apiPathMap.js`
- Create: `src/apiInterceptor/permissionMap.js`
- Modify: `src/legacyContent.js`

- [x] **Step 3.1:** 建立 `src/apiInterceptor/apiPathMap.js`，把 `legacyContent.js` 的 `API_PATH_MAP`（14 項）整段搬過來並 `export`。

- [x] **Step 3.2:** 建立 `src/apiInterceptor/permissionMap.js`，把 `NODE_TO_DATA_TYPE`（13 項）整段搬過來並 `export`。

- [x] **Step 3.3:** `legacyContent.js` 移除原定義，改 `import { API_PATH_MAP } from './apiInterceptor/apiPathMap.js';` 與 `import { NODE_TO_DATA_TYPE } from './apiInterceptor/permissionMap.js';`。

- [x] **Step 3.4:** `npm run build` → 成功；`npm test` → 全綠。Commit：
```bash
git add src/apiInterceptor/apiPathMap.js src/apiInterceptor/permissionMap.js src/legacyContent.js
git commit -m "refactor: 抽出 API_PATH_MAP 與 NODE_TO_DATA_TYPE 為獨立模組"
```

---

### Task 4: 抽出 responseNormalizer（純函數）+ Vitest 測試

**Files:**
- Create: `src/apiInterceptor/responseNormalizer.js`
- Create: `tests/test_responseNormalizer.js`
- Modify: `src/legacyContent.js`

- [x] **Step 4.1:** 建立 `src/apiInterceptor/responseNormalizer.js`，把 `normalizeResponseData(data, dataType)`（~343-363）整段搬出並 `export`（保持純函數，無 side effect）。

- [x] **Step 4.2:** `legacyContent.js` 改 `import { normalizeResponseData } from './apiInterceptor/responseNormalizer.js';`，移除原定義。

- [x] **Step 4.3:** 建立 `tests/test_responseNormalizer.js`（Vitest），涵蓋各分支：一般型別包成 `{rObject:[...]}`、已是 `{rObject}` 的透傳、空/null 輸入、物件型別（imaging/cancerScreening 等）走的分支。實作前先讀 `responseNormalizer.js` 確認每個 `dataType` 分支的實際行為，逐一斷言。範本：
```js
import { describe, it, assert } from 'vitest';
import { normalizeResponseData } from '../src/apiInterceptor/responseNormalizer.js';

describe('apiInterceptor/responseNormalizer', () => {
  it('wraps array-bearing responses into {rObject}', () => {
    // 依實際分支補齊輸入/輸出斷言
  });
  it('handles null / empty input without throwing', () => {
    assert.doesNotThrow(() => normalizeResponseData(null, 'medication'));
  });
});
```

- [x] **Step 4.4:** `npm test`（新測試綠）；`npm run build` → 成功。Commit：
```bash
git add src/apiInterceptor/responseNormalizer.js tests/test_responseNormalizer.js src/legacyContent.js
git commit -m "refactor: 抽出 responseNormalizer 為純模組並補 Vitest 測試"
```

---

### Task 5: 抽出授權邏輯 + Vitest 測試

**Files:**
- Create: `src/apiInterceptor/authorization.js`
- Create: `tests/test_authorization.js`
- Modify: `src/legacyContent.js`

- [x] **Step 5.1:** 先讀 `legacyContent.js` 的 `getAuthorizedDataTypes`（~196-207）、`shouldFetchSpecialData`（~208-226）與其相依（`getPermissions`、`DEFAULT_SETTINGS.cloud`）。把兩函數改寫為**純函數**移入 `authorization.js`：
  - `getAuthorizedDataTypes(permissions)` → 依 `NODE_TO_DATA_TYPE`（import）計算授權型別 Set，永遠強加 `'chronicMed'`。
  - `shouldFetchSpecialData(dataType, cloudSettings)` → 依傳入的 cloud 設定物件回傳 boolean。
  - 若原函數直接讀 `getPermissions()` / `chrome.storage`，把「取得 permissions / settings」留在 `legacyContent.js` 呼叫端，只把「純計算」搬進 authorization.js（可測）。

- [x] **Step 5.2:** `legacyContent.js` 改 import 這兩個純函數，呼叫端補上傳入 `getPermissions()` 結果與 cloud 設定。

- [x] **Step 5.3:** 建立 `tests/test_authorization.js`（Vitest）：給定 permissions 陣列 → 斷言授權型別集合正確、`chronicMed` 恆在；`shouldFetchSpecialData` 對開/關設定回傳正確。

- [x] **Step 5.4:** `npm test` + `npm run build`。Commit：
```bash
git add src/apiInterceptor/authorization.js tests/test_authorization.js src/legacyContent.js
git commit -m "refactor: 抽出授權計算為純模組並補 Vitest 測試"
```

---

### Task 6: 抽出訊息處理器

**Files:**
- Create: `src/apiInterceptor/messageHandlers.js`
- Modify: `src/legacyContent.js`

- [x] **Step 6.1:** 把 `setupMessageListeners`（~385-489）整段移入 `messageHandlers.js`，改為 `export function setupMessageListeners(deps)`，`deps` 為它用到的外部函數/值（如 `fetchAllDataTypes`、`clearAllData`、開 dashboard、取得 patient data 等）以物件注入。先讀該函數，列出它引用的所有外部符號 → 全部納入 `deps`。

- [x] **Step 6.2:** `legacyContent.js` 於 `initialize()` 內改 `setupMessageListeners({ fetchAllDataTypes, clearAllData, ... })` 傳入相依。

- [x] **Step 6.3:** `npm run build` + `npm test`。Commit：
```bash
git add src/apiInterceptor/messageHandlers.js src/legacyContent.js
git commit -m "refactor: 抽出擴充訊息處理器為獨立模組（依賴注入）"
```

---

### Task 7: 主檔改名 apiInterceptor + 更新引用 + 遮罩病患 ID

**Files:**
- Rename: `src/legacyContent.js` → `src/apiInterceptor/index.js`
- Modify: `src/contentScript.jsx`
- Modify: `DOC/Structure.md`

- [x] **Step 7.1:** `git mv src/legacyContent.js src/apiInterceptor/index.js`。調整檔內對同層新模組的相對 import（原 `./apiInterceptor/xxx.js` → 同資料夾後改為 `./xxx.js`；對 `src/` 其他模組如 `dataStore`、`nhitwExport`、`config/*` 的相對路徑由 `./` / `../` 調整為正確層級 `../`）。

- [x] **Step 7.2:** `src/contentScript.jsx:24` 的動態 import 由 `import("./legacyContent.js")` 改為 `import("./apiInterceptor/index.js")`。

- [x] **Step 7.3:** 遮罩病患 ID debug log（原 ~126）：把印出完整身分證號改為遮罩（保留頭尾、中間以 `****`，或只印長度/雜湊）。例：`id.slice(0,3) + '****' + id.slice(-1)`。

- [x] **Step 7.4:** `DOC/Structure.md:47` 的 `legacyContent.js - 舊版內容腳本功能的實現` 改為 `apiInterceptor/ - 健保 API 攔截與資料抓取層（前身 legacyContent.js）`。

- [x] **Step 7.5:** 全庫搜尋確認無殘留 `legacyContent` 參照於 `src/`（`git grep -n legacyContent -- src/`；`legacyContent.md` 為 chronicMed schema 文件，檔名保留或一併更名視內容而定——若僅內容不含程式引用則保留）。

- [x] **Step 7.6:** `npm run build` → 成功；`npm test` → 全綠；`npm run type-check` → 通過。Commit：
```bash
git add src/apiInterceptor/index.js src/contentScript.jsx DOC/Structure.md
git commit -m "refactor: legacyContent.js 更名為 apiInterceptor 並遮罩病患 ID log"
```

---

### Task 8: 文件更新與最終驗證

**Files:**
- Modify: `docs/superpowers/specs/2026-07-02-architecture-analysis.md`
- Modify: `docs/superpowers/plans/2026-07-03-refactor-phase6.md`（本檔勾選）
- Modify: 交班文件（若存在 `docs/superpowers/*refactor-handoff*.md`）

- [x] **Step 8.1:** `architecture-analysis.md`：狀態行改為「階段 1-6 已實作」；「其他」節的 `legacyContent.js 名不符實」項標記為已完成（階段 6）；優化順序表階段 6 標記完成。

- [x] **Step 8.2:** 交班/handoff 文件（若有）更新 Git 快照與 TL;DR，加入階段 6 完成、legacyContent→apiInterceptor、型別安全網。

- [x] **Step 8.3:** 本計畫所有 checkbox 勾選。

- [x] **Step 8.4: 最終驗證（全跑一輪）**
```
npm run type-check   # 通過
npm test             # 全綠（含新增 normalizer / authorization 測試）
npm run build        # 成功
```

- [x] **Step 8.5: 手動煙霧清單(維護者驗證後於 2026-07-03 指示合併)**
  1. 載入 `dist/` 為未封裝擴充，開 medcloud2 頁面，確認資料自動抓取、浮動視窗顯示各分頁（攔截層改名後行為不變）。
  2. 切換病患一次，確認舊資料清空、新資料載入（patient-switch 狀態機未受抽模組影響）。
  3. popup 手動抓取 / 清除資料 / 開 dashboard（訊息處理器抽出後功能正常）。
  4. console 不再出現完整病患身分證號（遮罩生效）。

- [x] **Step 8.6: Commit**
```bash
git add docs/superpowers/specs/2026-07-02-architecture-analysis.md docs/superpowers/plans/2026-07-03-refactor-phase6.md
git commit -m "文件更新：階段 6 完成狀態（型別安全網 + apiInterceptor 改名模組化）"
```

- [ ] **Step 8.7:** 使用 superpowers:finishing-a-development-branch 決定 refactor-phase6 的整併方式。

---

## Self-Review 紀錄

- **路線圖覆蓋：** 階段 6「processor 輸出定型別」→ Part A（Task 1-2）；「legacyContent 改名模組化」→ Part B（Task 3-7）；文件 → Task 8。
- **風險控管：** Part A 純新增不改行為；Part B 逐字搬移 + build/Vitest 每步驗證，純函數（normalizer/authorization）補測試。patient-switch 狀態機與 fetch 編排保留在主檔，不強拆高耦合狀態。
- **型別策略：** 全域 `checkJs:false` + 逐檔 `// @ts-check` 僅用於 `src/types/processors.js`，processor 主方法只加 `@returns` 文件化，避免大檔型別爆錯——符合「至少給 processor 輸出定型別」的最小可行目標，同時提供可執行的 `type-check` 安全網。
- **引用一致：** 改名唯一程式引用點為 `contentScript.jsx:24`（動態 import 字串），manifest 不含檔名，風險低。
- **勿污染版本 bump：** 所有 commit 明確列路徑 `git add`，不使用 `git add -A`。
