# 程式架構分析與優化建議

> 日期：2026-07-02
> 狀態：分析完成，尚未動工
> 分支：feature-CKM
> 範圍：全專案架構體檢（不含個別功能的正確性 review）

## 總結

專案骨架比預期健康：已有 processor pattern（每種醫療資料一個 `src/utils/*Processor.js`）、`dataManager.js` 統一調度、`settingsManager.js` 單一設定入口、`labProcessorModules/` 拆分先例，且 processor 層有單元測試（`tests/test_*.js`）。

真正的架構債集中在三處：**資料流用 `window.*` 全域變數當資料層**、**React 層完全沒有 Context 導致大規模 prop drilling**、**幾個超大檔案（god component 與整組重複的模組）**。

### 規模數據（2026-07-02 快照）

- src 共 130 個檔案、約 29,400 行
- 最大檔案：`Overview_ImportantMedications.jsx` 987 行、`FloatingIcon.jsx` 948 行、`medicationProcessor.js` 873 行
- `generalDisplaySettings` 出現 **351 次、42 個檔案**（prop drilling 指標）
- `window.*` 賦值約 50 處
- `console.log` 183 處
- `createContext` / `useContext` 使用數：**0**

## 主要問題（依嚴重度排序）

### 1. `window.*` 全域變數是實質上的資料層

- `legacyContent.js:18-32` 與 `localDataHandler.js:143-203` 寫入 15+ 個 `window.lastIntercepted*Data`
- `dataManager.collectDataSources()`（`src/utils/dataManager.js:219-239`）再從 window 讀回
- 連純資料處理層 `medicationProcessor.js:500-516` 也在寫 window 全域變數（`medicationFormatSettings`、`customMedicationHeaderCopyFormat` 等）
- 資料更新靠自訂 DOM event（`dataFetchCompleted`）通知，而非訂閱機制

**影響**：無型別、無法追蹤誰讀誰寫、測試必須 mock window、跨模組耦合隱形化。

**建議方向**：建立 `src/store/dataStore.js`（純 JS pub-sub 即可，不需引入 zustand/Redux），收攏所有攔截資料，提供 `get / set / subscribe`。React 端以 `useNhiData(type)` hook 訂閱。過渡期保留 window alias 相容層，逐步移除。

### 2. 沒有 React Context，settings 靠 prop drilling

`appSettings` 與 `generalDisplaySettings` 從 `FloatingIcon` 手動傳到第三、四層（`MedicationItem`、`LabItemDisplay` 等）。每新增一個設定需要改：`defaultSettings.js` → `settingsManager.js` → `FloatingIcon.jsx` → 沿途每一層中間元件。

**建議方向**：新增 `SettingsContext`（涵蓋 `appSettings` + `generalDisplaySettings`），提供 `useSettings()` / `useGeneralDisplaySettings()` hooks。改動機械性高、風險低，是**投報率最高的一項**。

### 3. `FloatingIcon.jsx` 是 948 行的 god component，且有 stale closure bug

同時負責：18 個 `useState`、settings 載入、三種 listener、tab 導覽 UI、狀態指示器、使用者資訊解析。

**實際 bug**：`FloatingIcon.jsx:171-327` 的 useEffect 依賴陣列是 `[]`，但 `listenForMessages` callback 內讀取 `open`（244、250 附近）與 `appSettings`（244、256、266 行）——這些永遠是**掛載當下**的值。「切換到自訂格式 tab」訊息的啟用判斷用的是初始設定，不是當前設定。

**重複邏輯**：ROC 生日轉年齡在同檔案出現兩次（371-380 行、421-431 行），`localDataHandler` 的 fallback userInfo 組裝也重複，應抽成 util。

**建議方向**：拆成
- `FloatingIcon`（icon + dialog 開關）
- `MainDialog`（tabs 容器與內容）
- `useNhiDataState`（資料狀態 hook）
- `useMessageBridge`（訊息監聽 hook，用 ref 或正確 deps 修掉 stale closure）

### 4. 複製格式編輯器整組重複

`src/components/tabs/medicationCopyFormat/` 與 `labCopyFormat/` 是近乎複製的兩套，五個同名檔案：

| 檔案 | medication | lab | 相似度 |
|------|-----------|-----|--------|
| FormatElementsPanel.jsx | 723 行 | 810 行 | 約 60-70% 相同 |
| useFormatEditorState.js | 383 行 | 320 行 | 高 |
| FormatPreview.jsx | 270 行 | 213 行 | 高 |
| dragDropHandlers.js / formatEditorConfig.js | — | — | 高 |

改一個 bug 要改兩邊。

**建議方向**：合併為 generic 的 `copyFormatEditor/`，差異部分（可用元素清單、預覽渲染）抽成 config 注入，沿用現有 `formatEditorConfig.js` 的思路。

### 5. 其他較小的問題

- **`dataManager.js` 樣板重複**：`handleAllData` 內 12 個 processor 的 `process` 寫法幾乎相同，Map-of-objects 沒有帶來價值。可改成宣告式註冊表 `[{ key, processor, setterName, needsSettings }]`，新增資料型別從「改三處」變成「加一行」。
- **183 個 `console.log`** 散落 src，含 `dataManager` 熱路徑上的 debug log（如 hbcvdata 處理，184-197 行）。建議做 `debugLog` util，由設定或 build flag 控制。
- **`legacyContent.js` 名不符實**：它是核心的 API 攔截層（550 行），不是 legacy。建議改名（如 `apiInterceptor.js`）並模組化，避免後人不敢碰。
- **測試只能在瀏覽器跑**：現有 Mocha 測試需開 `http://localhost:5173/test.html` 手動執行。processor 都是純函數，適合遷移到 Vitest headless，即可上 CI。
- **死碼**：`vite.extension.config.js`（CLAUDE.md 已註明未使用）、`FloatingIcon.jsx` 內大量註解掉的 import。
- **無型別**：資料結構（processor 輸出、settings shape）完全無型別描述，新功能只能靠通靈或讀 code。

## 建議的優化順序

前提：這是臨床在用的工具，採**漸進式重構**，每一步可獨立出貨。先建安全網再動核心。

| 階段 | 內容 | 規模 | 風險 |
|------|------|------|------|
| 1 | 安全網 + 清理：現有測試遷移 Vitest headless、清 console.log、刪死碼 | 小 | 低 |
| 2 | `SettingsContext` 消除 prop drilling，順手修 FloatingIcon stale closure | 中 | 低 |
| 3 | `dataStore` 取代 window 全域，資料流變成可測的單向流 | 中大 | 中 |
| 4 | 拆 `FloatingIcon`（2、3 完成後自然瘦身，再拆容易） | 中 | 中 |
| 5 | 合併 copyFormat 編輯器、dataManager 宣告式化 | 中 | 低 |
| 6 | （選配）JSDoc typedef 或漸進 TypeScript，至少給 processor 輸出定型別 | 中 | 低 |

**不建議**：整案重寫、引入大型狀態管理框架（Redux 等）。此 app 的資料流是「一次載入、多分頁展示」，輕量 store + Context 已足夠。
