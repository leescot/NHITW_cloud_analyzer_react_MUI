# 交班文件:架構優化階段 1+2+3+4+5(2026-07-02 起,2026-07-03 更新)

> 用途:重啟對話 / context compact 後接手工作的完整狀態快照。
> 相關文件:規格 `specs/2026-07-02-architecture-analysis.md`、計畫 `plans/2026-07-02-refactor-phase1-2.md`、`plans/2026-07-02-refactor-phase3-datastore.md`、`plans/2026-07-02-refactor-phase4-floatingicon.md`、`plans/2026-07-03-refactor-phase5.md`(各含逐 task 進度與後續追蹤清單)

## 目前狀態(TL;DR)

- **階段 1+2 已完成**並 squash merge 回 `feature-CKM`(commit `0ea940a`)。
- **階段 3 已完成**,在分支 `refactor-phase3`(13 commits,head `b50056b`),**尚未 merge、尚未 push**。
- **階段 4 已完成**,在分支 **`refactor-phase4`**(疊在 `refactor-phase3` 上),**尚未 merge、尚未 push**。
- **階段 5 已完成**,在分支 **`refactor-phase5`**(疊在 `refactor-phase4` 上),**尚未 merge、尚未 push**。
- 階段 4 驗證:Vitest **152/152 全綠**(19 檔)、build 成功、ESLint 未新增問題;`FloatingIcon.jsx` 925 → 349 行。
- 階段 5 驗證:Vitest **189/189 全綠**(22 檔)、build 成功、全 repo ESLint 由 2,118 降到 1,373。
- **未完成項:階段 2、3、4、5 的手動煙霧測試**(清單見下方、phase3 計畫文件 Task 7 Step 3、phase4 計畫文件 Task 8 Step 3、phase5 計畫文件 Task 7「階段 5 手動煙霧測試清單」),通過後依序 squash merge 回 `feature-CKM`(各階段可一起 squash 或分次,由維護者決定),再考慮 push / release。
- **⚠️ 下游 extension 需適配**:`NHITW_DATA` 已統一為單一格式(`patientSummary` 駝峰、timestamp 最前),原本讀 `patientsummary`(小寫)的消費端要改 key。

## 階段 3 摘要(dataStore)

- `src/store/dataStore.js`:醫療資料單一真實來源(setData/getData/clearAll/subscribe);15 個 `window.lastIntercepted*` 全域與 `DATA_VAR_MAP` 完全移除。
- `src/store/nhitwExport.js`:`NHITW_DATA` 跨 extension 交換契約(**對外契約,改 key 前必須同步消費端**),兩條寫入路徑(主動抓取/本地匯入)統一格式,測試鎖定 key 順序與 null 語意。
- localDataHandler 13 段複製 handler → 資料驅動迴圈;順帶修復「清除本地資料後 chronicMed 殘留」既存 bug。
- `dataStore.subscribe` 目前無消費者(保留給未來 React 細粒度整合;現行通知仍走 `dataFetchCompleted` 事件,階段 4 亦維持此決策)。
- CLAUDE.md 與 `src/legacyContent.md` 的過時架構描述(webRequest 攔截、window 全域)已改寫為現況。

## 階段 4 摘要(FloatingIcon 拆解)

- `FloatingIcon.jsx` 925 → 349 行:狀態與副作用拆進三個 `src/hooks/`:`useUserInfo`(使用者資訊,dialog 開啟時讀 token,失敗 fallback 本地匯入)、`useNhiDataState`(14 個醫療資料 state + `handleData` 載入管線,維持 `dataFetchCompleted` 事件觸發而非改用 `dataStore.subscribe`——一次批次抓取會觸發 14 次逐型別通知,事件是批次後單發語意正確)、`useSettingsState`(設定 state + 三種 chrome listener:settings/messages/dataFetchCompletion)。
- `src/components/MainDialogHeader.jsx`(約 290 行):Tabs 導覽列與 CKD/CT/MRI/過敏/手術/出院狀態指示器,自 FloatingIcon 逐字搬出。
- **`nhiDataRef` 模式**:`useSettingsState` 需要 `useNhiDataState` 的 reprocess setters,但 `useNhiDataState` 需要 `useSettingsState` 的 `appSettingsRef`——循環相依。解法是 `appSettingsRef` 留在 FloatingIcon 建立、分別傳入兩個 hook,`nhiDataRef` 於 render 時指派 `.current` 供 listener 經 ref 讀最新值,延續階段 2 的 stale-closure 修復模式(`openRef`/`appSettingsRef`),勿改回直接閉包引用。
- 死碼清理:`localDataHandler.js` 404 → 255 行(移除未用的 default export 物件與 `window.lastProcessedMedicationData`);`legacyContent.js` 移除無讀取者的 `window.nhiDataBeingFetched`,`fetchNHI_Data`/`getSessionData` 保留但加註解說明為開發者 console 手動除錯用、無程式碼依賴。
- `tests/settingsManager.test.js` 新增,鎖定 `handleDataFetchCompletedSettingsChange` 的 store 讀取與 reprocess callback 路徑。
- 驗證:Vitest 19 檔 / 152 測試全綠,build 成功,ESLint 未新增問題。

## 階段 5 摘要(bug 修復 + copyFormat 編輯器合併 + 側通道收斂)

1. **真 bug 修復**:LabData「複製全部」引用不存在的 `setSnackbarMessage`/`setSnackbarOpen`(no-undef,執行時 ReferenceError)——Snackbar 狀態改由 `useCopyLabData` hook 統一管理;FloatingIcon 從未真正使用過的死 snackbar state/JSX 一併移除。
2. **死碼清理**:刪除三個死檔(`Overview_AdultHealthCheck.jsx`、`Overview_CancerScreening.jsx`、`Overview_hbcvdata.jsx`,均已被 `Overview_IntegratedHealthData` 取代)、`getLocalDataStatus`、`LineSpacingWrapper.jsx`、`saveCurrentSettings`;settingsManager bulk lab 設定路徑補上遺漏的 `labCopyAllOrder`;全 repo `no-undef` 歸零。
3. **`dataManager.js` 宣告式化**:`handleAllData` 的 12 段 Map-of-objects 樣板改為單一 `PROCESSOR_REGISTRY` 陣列 + 一個迴圈,行為不變(含 patientSummary 大小寫 fallback、safeSetter 行為、處理順序);新增顯示型資料型別現在只需加一筆註冊表項目。順手移除 hbcvdata 的除錯殘留 console 輸出。
4. **`medicationFormatSettings` window 側通道移除**:`processMedicationData(raw, chronicMed, formatSettings)` 新增第三參數,由呼叫端(dataManager)一律傳入;`formatSettings` 為 `null` 時內部 fallback 讀 `chrome.storage.sync`(相容既有呼叫者)。移除的不只是讀寫對稱性問題——`groupInfo` 順帶補上三個先前遺漏帶入的欄位(根因修復,非僅搬家)。`localDataHandler` 的 `getBackup` 相關機制隨之移除。
5. **copyFormat 編輯器合併**:`medicationCopyFormat/` 與 `labCopyFormat/` 兩套近乎複製的自訂複製格式編輯器(合計 ~3,498 行)合併為單一 config 驅動模組 `src/components/tabs/copyFormat/`(通用四檔 `FormatElementsPanel.jsx`/`useFormatEditorState.js`/`FormatPreview.jsx`/`dragDropHandlers.js` + 差異注入 `medicationConfig.jsx`/`labConfig.jsx`),舊兩目錄整個刪除,淨減約 1,693 行。拖曳視覺回饋的 CSS 也一併補齊(scoped 在 `#nhi-floating-root` 下,不外溢)。過程中確認 10 個既有 `chrome.storage` key 名稱維持不變(既有使用者已存的自訂格式不受影響)。
6. **驗證**:Vitest 22 檔 / 189 測試全綠;全 repo ESLint 問題數由 2,118 降到 1,373(移除死碼與 no-undef 的直接效果,非新規則)。

## 已完成內容

### 階段 1:測試安全網 + 清理
- `npm test` = Vitest headless(node + jsdom);舊瀏覽器 Mocha harness 已刪除;手動測試流程改名 `npm run test:manual`。
- `src/utils/logger.js` 的 `debugLog`:預設靜默,console 執行 `localStorage.setItem('nhitw_debug','1')` 後重新整理開啟。183 個 `console.log` 已收斂(改 debugLog 或刪除);ESLint `no-console` 規則已啟用(allow warn/error)。
- 死碼移除:`vite.extension.config.js`、FloatingIcon 註解 import。
- `src/utils/ageUtils.js`:民國年生日→年齡計算單一來源(含測試)。

### 階段 2:SettingsContext
- `src/contexts/SettingsContext.jsx`:`SettingsProvider` + `useGeneralDisplaySettings()` / `useAppSettings()`;無 Provider 時回傳 DEFAULT_SETTINGS 對應值(popup 安全)。
- Provider 掛在 `FloatingIcon.jsx`;38+ 元件改用 hook,約 200 處 `generalDisplaySettings` prop 傳遞已全數移除(僅剩 Provider 一處)。
- **修復 stale closure bug**:FloatingIcon 掛載 listener 改讀 `openRef` / `appSettingsRef`,popup 觸發「開啟自訂格式編輯器」不再需要重新整理。
- popup 樹(`PopupSettings.jsx`)維持自有 state,不使用此 context(獨立 React root)。
- 例外:`CKMSummaryBar` 仍以 `gds` prop 接收顯示設定(它真的在用,留待後續遷移)。

## 待辦(依優先序)

### 1. 手動煙霧測試(阻擋 push/release 的唯一項目)
`npm run test:manual` → Chrome 載入 `dist/` → 開 `http://localhost:5173/`:
1. **stale closure 修復**:popup 開啟「藥物自訂複製格式」→ 從 popup 觸發「開啟自訂格式編輯器」→ dialog 應第一次就跳到進階 tab(不需重新整理)
2. **文字大小即時更新**:dialog 開著時在 popup 調整內容文字大小,各 tab 文字即時變化
3. **CKM Overview 卡片**:其他檢驗、影像卡片文字大小正常
4. **本地 JSON 匯入**:上傳 `tests/test_data/Fake_Data_250402.json`,病患姓名/性別/年齡正確
5. **debugLog**:console 預設無輸出;設 flag 重新整理後出現

通過後:把計畫文件驗收清單最後一格打勾、Task 15 Step 3 打勾。

#### 階段 5 專屬清單(在 refactor-phase5 分支上,merge 前執行;完整清單見 `plans/2026-07-03-refactor-phase5.md` Task 7)
1. 檢驗 tab「複製全部」→ 有 Snackbar 提示、剪貼簿正確(bug 修復驗證)
2. 西藥自訂複製格式編輯器完整操作:拖曳(視覺回饋)、增刪元素、ICD 元素加入、預覽、儲存、重置;**確認之前儲存的自訂格式載入不變**
3. 檢驗自訂複製格式編輯器完整操作:同上 +「加入基本日期組合」按鈕
4. 西藥列表複製(單一 visit + 複製全部)以自訂格式輸出正確(側通道移除驗證——這條最重要)
5. 本地匯入後再複製,自訂格式仍生效

### 2. 審查累積的既存問題(非本次引入,可開新 task)
1. ~~`LabData.jsx:219-293`「複製全部」引用不存在的 `setSnackbarMessage`/`setSnackbarOpen` → 潛在 ReferenceError~~ **已於階段 5 修復**(Snackbar 統一經 `useCopyLabData` hook)
2. `userInfoUtils.js` 有與 `ageUtils` 近似的年齡計算(比較邏輯用 Date rollover 後的值,非純複製),值得整併
3. ~~`Overview_AdultHealthCheck / CancerScreening / hbcvdata` 三檔為死碼(被 `Overview_IntegratedHealthData` 取代),可刪~~ **已於階段 5 刪除**
4. `CKMSummaryBar` 遷移到 hook 後,可一併移除 `CKMData.jsx:289` 與 `Overview.jsx:93` 的 `gds={...}`
5. debug log 含病患身分證號(`legacyContent.js` 病患切換 log),可考慮遮罩
6. `FloatingIcon.handleData` 內 `userInfo` 仍有既存 stale read(僅多餘 re-render,無正確性問題)
7. ~~`LineSpacingWrapper.jsx` 無人使用(死碼);其 fallback 引用不存在的 `lineSpacingHeight` 設定鍵~~ **已於階段 5 刪除**

### 3. 階段 3 煙霧測試(在 refactor-phase3 分支上,merge 前執行)
依 `plans/2026-07-02-refactor-phase3-datastore.md` Task 7 Step 3,重點:
1. 真實環境完整抓取(全部 tab 正常)——最高風險,真實 API 回應形狀只有實測能驗
2. 慢箋合併(藥局續領 group、`慢箋:N/M` / `效期內` Chip)
3. 病患切換(兩條偵測路徑,資料完全重置)
4. 本地匯入 → 清除 → 再抓取
5. `NHITW_DATA` 新格式檢查 + **下游 extension 改讀 `patientSummary` 後實測**

### 4. 階段 6+ 候選項目(已盤點,尚未規畫)
階段 1-5 審查累積的清理目標與規格順序表的後續項目:
- JSDoc typedef / 漸進 TypeScript(選配),至少給 processor 輸出定型別
- `CKMSummaryBar` 遷移到 `SettingsContext` hook(目前仍以 `gds` prop 接收顯示設定,見上方「審查累積的既存問題」#4)
- `userInfoUtils.js` 與 `ageUtils.js` 年齡計算邏輯整併(近似但非純複製,比較邏輯用 Date rollover 後的值)
- 階段 5 審查累積追蹤清單(詳見 phase5 計畫文件「審查累積追蹤項目」節):`medicationConfig.jsx`/`labConfig.jsx` 的 elementButton/customTextField 重複約 60 行,可抽共用 util(選配);`settingsManager.js` 的 settingType map 無 `'western'` 條目屬既存設計(西藥設定走 `chrome.storage.onChanged` 傳播),非 bug,記錄以免誤判
- `NHITW_DATA`(page localStorage 跨 extension 交換契約)大小上限監控——目前無上限檢查,病患資料量成長後需留意

## 接手必知(環境與慣例)

- **CLAUDE.md 是 gitignored**:對它的更新只存在本機磁碟,不進版控。目前磁碟版已同步(Vitest 指令、SettingsContext 段落、階段 4 的 UI structure/hooks 段落、階段 5 的 copyFormat/formatSettings 參數/PROCESSOR_REGISTRY 段落)。
- **D: 是 subst 磁碟**(映射到 `C:\Users\mchnurse\DiskD`):`vitest.config.js` 的 `resolve.preserveSymlinks: true` 就是為此,**不要移除**。偶發 Rollup 快取路徑錯誤(訊息含 DiskD)→ `rm -rf dist node_modules/.vite` 重建即可。
- **stash 警告**:stash list 有一個舊的 `feature-copydata-content` stash(GitHub Desktop 建立),**不要 pop**——它會對 package.json / manifest.json 造成衝突。本次工作中曾誤 pop 過一次,已用 `git reset --hard` 復原,stash 本身完整保留。
- **npm scripts**:`npm test`(Vitest)/ `npm run test:watch` / `npm run test:manual`(build TEST 模式 + server)/ `npm run build`。
- **lint 基準**:repo 有約 2,160 個既存 stylistic lint 問題(trailing spaces 等),與本次重構無關;驗證標準是「不新增」,不是「全綠」。
- 工作流程慣例:specs/ 放設計、plans/ 放實作計畫(checkbox 追蹤)、commit message 繁體中文。

## Git 快照(2026-07-03 更新)

```
refactor-phase5(目前所在,疊在 refactor-phase4 上,8 commits:a28248a…3936626,未 merge、未 push)
└─ 階段 5:LabData snackbar bug 修復 + 死碼清理 + dataManager 宣告式化 + medicationFormatSettings 側通道移除 + copyFormat 編輯器合併 + 文件

refactor-phase4(疊在 refactor-phase3 上,10 commits:a1a8ef3…e236e79,未 merge、未 push)
└─ 階段 4:useUserInfo/useNhiDataState/useSettingsState + MainDialogHeader + 死碼清理 + 文件

refactor-phase3(13 commits:85cb0b3…b50056b,未 merge、未 push)
└─ 階段 3:dataStore + nhitwExport + 遷移 + window 全域移除 + 文件

feature-CKM(領先 origin 23 commit,未 push)
├─ 5799484 文件:新增階段 1+2 交班文件
└─ 0ea940a 架構優化階段 1+2 squash commit(102 檔,+1,879/−26,246)

refactor-phase1-2(保留,16 commits:b612caf…2b8e15c)
```

流程慣例:煙霧測試通過 → `refactor-phase3`、`refactor-phase4`、`refactor-phase5` 依序(或合併)squash merge 回 `feature-CKM`(保留分支、不 push;各階段可一起 squash 或分次,由維護者決定)。
