# 階段 5:bug 修復 + copyFormat 編輯器合併 + 側通道收斂 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修掉追蹤清單的真 bug 與死碼,把兩套近乎複製的自訂複製格式編輯器(合計 ~3,500 行)合併為單一 config 驅動模組,並將 `window.medicationFormatSettings` 側通道收進 settings 參數。

**Architecture:** 先修 bug/清死碼(低風險快贏),再做兩個大項:(a) copyFormat 合併——以 `medicationCopyFormat/` 為基準建 `src/components/tabs/copyFormat/` 通用模組,差異(元素清單、預覽渲染、設定 key)由 config 注入,兩個舊目錄改為薄包裝或直接替換;(b) medicationFormatSettings 側通道——`medicationProcessor` 10+ 處 `window.*` 讀寫改為經 settings 參數傳遞(processor 測試是安全網)。維持既有慣例:TDD 可測部分、逐字搬移 UI、每 task 兩階段審查。

**分支:** `refactor-phase5`(疊在 refactor-phase4 上)
**基準:** 21 檔 / 156 測試綠;copyFormat 兩目錄合計 3,498 行。
**每 Task 通用驗證:** `npx vitest run` 全綠 + `npm run build` + eslint 不新增。
**環境:** PowerShell 5.1 無 `&&`;DiskD Rollup 快取錯誤→清 dist/node_modules/.vite;commit 繁中;lint 標準=不新增。

---

### Task 1: LabData snackbar 真 bug 修復

**Files:** Modify `src/components/tabs/LabData.jsx`、`src/components/FloatingIcon.jsx`

- [x] LabData.jsx 的「複製全部」路徑(~行 219-293)引用不存在的 `setSnackbarMessage`/`setSnackbarOpen`(no-undef,執行時 ReferenceError)。**先讀檔理解意圖**:應是要顯示「已複製」提示。修法:LabData 自己宣告 snackbar state + `<Snackbar>`(參考其他 tab 若有既有模式;若無,在 LabData 內新增 useState + MUI Snackbar,行為=顯示訊息 2 秒)。
- [x] FloatingIcon 的死 snackbar state(`snackbarOpen/snackbarMessage` 從未被設為 true/有值)與 `<Snackbar>` JSX 一併移除(它就是這個 bug 的殘骸)。
- [x] 驗證:`npx eslint src 2>&1 | grep no-undef` → 只剩 useFormatEditorState 的 2 處(下個 task 處理);vitest/build 綠。手動煙霧點:檢驗 tab 按「複製全部」→ 出現提示、剪貼簿有內容。
- [x] Commit:「修復:檢驗複製全部的 ReferenceError,Snackbar 移入 LabData」

### Task 2: 死碼與小項清理

**Files:** Delete `src/components/tabs/Overview_AdultHealthCheck.jsx`、`Overview_CancerScreening.jsx`、`Overview_hbcvdata.jsx`;Modify `src/localDataHandler.js`、`src/components/utils/LineSpacingWrapper.jsx`(視調查結果)、`src/utils/settingsManager.js`、`tests/settingsManager.test.js`

- [x] 刪三個死的 Overview_* 檔(先 grep import 確認只有 `CloudDataSettings.md` 文件提及;`Overview_IntegratedHealthData` 已取代)。
- [x] 刪 `getLocalDataStatus`(localDataHandler,無呼叫者;先 grep 確認)。
- [x] `LineSpacingWrapper.jsx`:grep 確認仍無人 import → 刪檔;若有人用了,只修 `lineSpacingHeight` 死鍵。
- [x] settingsManager bulk lab 路徑補 `labCopyAllOrder`(行 ~264-278 的 newLabSettings 加 `labCopyAllOrder: event.detail.allSettings.labCopyAllOrder || 'newToOld'`),並把 `tests/settingsManager.test.js` 的 `assert.notProperty(...'labCopyAllOrder')` 改為斷言存在(該測試當初就標注是鎖定現狀)。
- [x] useFormatEditorState 的 2 處 no-undef(`formatType`/`setSavedFormatType`)——讀碼判斷:死路徑刪除或補宣告,如實回報。
- [x] 驗證:`npx eslint src 2>&1 | grep -c no-undef` → 0;vitest/build 綠。
- [x] Commit:「清理:死檔移除、labCopyAllOrder 補漏、no-undef 歸零」

### Task 3: dataManager 宣告式化

**Files:** Modify `src/utils/dataManager.js`、`tests/dataManager.test.js`

- [x] `handleAllData` 的 12 段 Map-of-objects 樣板改為註冊表:`[{ sourceKey, processor: fn, setterName, resultKey, needsSettings?, hasRObjectGuard? }]` + 單一迴圈。**行為完全不變**(含 patientSummary 大小寫 fallback、safeSetter 行為、處理順序)。先讀現檔;medication 是 async 且帶 chronicMed 第二參數——註冊表需支援。
- [x] 補 `handleAllData` 測試 2-3 個(store 塞 medication+chronicMed → setters 收到處理結果;缺 setter 時 safeSetter 寫 window 的既有行為)。
- [x] Commit:「重構:dataManager 資料處理改為宣告式註冊表」

### Task 4: medicationFormatSettings 側通道收斂

**Files:** Modify `src/utils/medicationProcessor.js`、`src/utils/medicationCopyFormatter.js`、`src/localDataHandler.js`(`setGlobalMedicationFormatSettings`/`loadCustomFormatSettings` 一帶)

- [x] **先盤點**:grep `medicationFormatSettings|customMedicationHeaderCopyFormat|customMedicationDrugCopyFormat|customDrugSeparator` 全部讀寫點,畫出流向再動手(報告列出)。
- [x] 目標:processor/formatter 一律從呼叫端傳入的 settings 參數取值;`processMedicationData` 內部的 `chrome.storage.sync.get` + window 快取邏輯(~行 454-533)整段以「呼叫端已傳入 settings」取代——注意 `processMedicationData(raw, chronicMed)` 目前**不收** settings,需加第三參數並更新兩個呼叫端(dataManager、useNhiDataState 經 dataManager)+ 測試呼叫端。
- [x] localDataHandler 的 `setGlobalMedicationFormatSettings` 若因此無用即刪。
- [x] 既有 `tests/test_medicationProcessor.js` 是安全網;為新參數補 1-2 個測試(自訂格式設定經參數生效)。
- [x] **風險最高的 task**:若盤點後發現 popup 端(MedicationSettings 等)也依賴這些 window 值跨 context 傳遞,STOP 回報再決定(popup 與 content 是不同 world,window 本來就不互通——若真有依賴反而是既存 bug)。
- [x] Commit:「重構:藥物自訂格式設定改經參數傳遞,移除 window 側通道」

### Task 5: copyFormat 通用模組建立

**Files:** Create `src/components/tabs/copyFormat/`(FormatElementsPanel.jsx、useFormatEditorState.js、FormatPreview.jsx、dragDropHandlers.js)

- [x] 以 `medicationCopyFormat/` 版本為基準逐檔建立通用版,所有 med/lab 差異點抽成 `config` prop/參數:元素定義清單、預設格式、chrome.storage key 名、預覽渲染函數、文案。**先做兩目錄逐檔 diff**,把差異點完整列進報告,config 介面涵蓋全部差異——不確定的差異寧可多開 config 欄位,不可默默取捨行為。
- [x] `useFormatEditorState` 可用 renderHook 測:以 med config 與 lab config 各跑載入/更新/重設路徑(chrome stub 已有)。
- [x] 此 task 只**新增**通用模組+測試,不動舊目錄(舊的還在用,build 不變)。
- [x] Commit:「新增 copyFormat 通用編輯器模組(config 驅動)」

### Task 6: 兩編輯器切換到通用模組

**Files:** Modify `src/components/tabs/MedicationCustomFormatEditor.jsx`、`LabCustomFormatEditor.jsx`;建立 `copyFormat/medicationConfig.js`、`labConfig.js`;Delete 舊 `medicationCopyFormat/`、`labCopyFormat/` 兩目錄

- [x] 兩個 editor 檔改 import 通用模組 + 對應 config;確認 props/行為不變(編輯器 UI 靠煙霧測試,搬移原則=行為零變)。
- [x] 刪兩個舊目錄(grep 確認無其他 import)。
- [x] 驗證:vitest/build/eslint;`wc -l src/components/tabs/copyFormat` 報告淨減行數(預期 3,498 → ~1,900)。
- [x] Commit:「copyFormat 編輯器切換至通用模組,移除兩套複製實作」

### Task 7: 文件更新

- [x] CLAUDE.md(磁碟):copyFormat 說明、medicationFormatSettings 移除後的設定流說明。
- [x] spec 狀態行加階段 5;本計畫勾選;交班文件 TL;DR/Git 快照/煙霧清單更新(重點:兩個編輯器完整操作一輪、藥物自訂格式複製實測、檢驗複製全部含 Snackbar)。
- [x] Commit:「文件更新:階段 5 完成狀態與追蹤清單」

#### 階段 5 手動煙霧測試清單(維護者執行,通過後勾選)

1. [ ] 檢驗 tab「複製全部」→ 有 Snackbar 提示、剪貼簿正確(bug 修復驗證)
2. [ ] 西藥自訂複製格式編輯器完整操作:拖曳(視覺回饋)、增刪元素、ICD 元素加入、預覽、儲存、重置;**確認之前儲存的自訂格式載入不變**
3. [ ] 檢驗自訂複製格式編輯器完整操作:同上 +「加入基本日期組合」按鈕
4. [ ] 西藥列表複製(單一 visit + 複製全部)以自訂格式輸出正確(側通道移除驗證——這條最重要)
5. [ ] 本地匯入後再複製,自訂格式仍生效

---

## 驗收清單
- [x] 檢驗「複製全部」不再 ReferenceError,有提示;`no-undef` 全 repo 歸零
- [x] 死檔/死函數移除;labCopyAllOrder 補漏並更新測試
- [x] dataManager 宣告式化,行為不變且有測試
- [x] medicationProcessor 無任何 window.* 讀寫
- [x] copyFormat 單一實作(~淨減 1,500 行),useFormatEditorState 有雙 config 測試
- [x] 全套測試綠、build 綠、eslint 不新增
- [ ] 手動煙霧測試(編輯器操作、複製功能實測)通過

## 審查累積追蹤項目

- `medicationConfig.jsx` / `labConfig.jsx` 的 elementButton / customTextField 相關程式碼有 ~60 行重複,可抽共用 util(選配,非阻擋項)。
- `settingsManager.js` 的 settingType map 沒有 `'western'` 條目——西藥設定改走 `chrome.storage.onChanged` 傳播,這是既存設計而非 bug,記錄以免後續審查誤判為漏補。
