# 階段 4:拆解 FloatingIcon + 死碼清理 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 925 行的 FloatingIcon god component 拆成「三個自訂 hook + 精簡的組合元件 + 抽出的 tab 導覽列」,並清除階段 3 盤點的死碼。

**Architecture:** 資料層(dataStore)已在階段 3 穩定,本階段拆 UI 層。三個 hook 各管一個關注點:`useUserInfo`(使用者資訊)、`useNhiDataState`(15 個資料 state + handleData + dataFetchCompleted 監聽)、`useSettingsState`(設定載入 + chrome listeners + 訊息處理)。**維持 `dataFetchCompleted` 事件為觸發機制**——不改用 `dataStore.subscribe`,因為 store 是逐型別通知,一次批次抓取會觸發 14 次重處理;事件是批次後單發,語意正確(此決策記錄於 hook 註解,subscribe 保留給未來需要細粒度更新的場景)。JSX 部分抽出 `MainDialogHeader`(Tabs + 狀態指示器,約 290 行)。死碼清理先行(localDataHandler 死 export、window debug hooks),降低後續搬移時的干擾。

**Tech Stack:** React 19 hooks、Vitest + @testing-library/react(renderHook)、無新依賴。

**分支:** `refactor-phase4`(疊在 refactor-phase3 上)
**基準:** 17 檔 / 142 測試綠;FloatingIcon.jsx 925 行;localDataHandler.js 404 行。

**每 Task 通用驗證:** `npx vitest run` 全綠 + `npm run build` 成功 + 該檔 eslint 不新增錯誤。

---

## 背景知識(worker 必讀)

- **FloatingIcon 現況結構**(行號為 2026-07-02 快照):121-161 共 21 個 useState;164-170 openRef/appSettingsRef(stale closure 修復,**必須保留此模式**);176-336 掛載 effect(設定初始化、三種 listener);338-380 handleData(collectDataSources → handleAllData → CKM → local userInfo);382-385 `[appSettings.lab]` effect;388-410 window.openFloatingIconDialog effect;412-421 userInfo `[open]` effect;423 起 handlers 與 JSX。
- **環境**:PowerShell 5.1 無 `&&`;DiskD Rollup 快取錯誤→ `rm -rf dist node_modules/.vite`;lint 標準=不新增;commit 繁體中文。
- **UI 無自動化測試**:hook 可用 renderHook 測,JSX 搬移靠 build+lint+審查。搬移原則:**逐字搬,不改邏輯**;發現可改善處記錄在報告,不動手。
- `contentScript.jsx` 以 dynamic import 載入 localDataHandler,使用的是**頂層 named exports**(`processLocalData`、`clearLocalData`),不是 default export(審查已證實)。

---

### Task 1: localDataHandler 死碼移除

**Files:** Modify `src/localDataHandler.js`(404 行 → 約 260 行)

- [x] Step 1: 確認 default export 物件(~行 268-403,`export const localDataHandler = {...}` 與 `export default localDataHandler`)在 src 內無人使用:`grep -rn "localDataHandler.processJsonData\|localDataHandler.detectDataType\|from './localDataHandler'\|import(\"./localDataHandler" src` — contentScript 的 dynamic import 用 namespace named exports;若發現 default 用法,STOP 回報。
- [x] Step 2: 刪除整個 `localDataHandler` 物件(含其內的 processJsonData、detectDataType 等方法)與 `export default` 行。
- [x] Step 3: 刪除 `window.lastProcessedMedicationData` 相關:clearLocalData 的 `globalVarsToReset` 現在只剩這一項——整個 Map 與重置迴圈一併刪除(store 已由 `dataStore.clearAll()` 清)。
- [x] Step 4: 驗證 `grep -n "lastProcessedMedicationData\|processJsonData\|detectDataType" src -r` → 零;vitest 142 綠;build 綠;`grep -c "processJsonData" dist/content.js` → 0。
- [x] Step 5: Commit `清理:移除 localDataHandler 死碼(未使用的 default export 與 lastProcessedMedicationData)`

### Task 2: legacyContent debug hooks 處置

**Files:** Modify `src/legacyContent.js`

- [x] Step 1: 確認三者在 src 無讀取者:`grep -rn "nhiDataBeingFetched\|fetchNHI_Data\|getSessionData" src --include="*.js" --include="*.jsx"` → 只剩 legacyContent 的寫入/定義。
- [x] Step 2: 移除 `window.nhiDataBeingFetched = true/false` 兩行(fetchAllDataTypes 內,無任何讀取者)。
- [x] Step 3: `window.fetchNHI_Data` / `window.getSessionData` **保留**,在其上方加註解:`// 開發者 console 手動除錯用 hook(isolated world 內,頁面與其他 extension 不可見);無程式碼讀取,勿依賴`。
- [x] Step 4: 驗證 + Commit `清理:移除無讀取者的 nhiDataBeingFetched,標註 debug hooks`

### Task 3: useUserInfo hook(TDD)

**Files:** Create `src/hooks/useUserInfo.js`、`tests/useUserInfo.test.jsx`;Modify `src/components/FloatingIcon.jsx`

介面:

```js
// useUserInfo.js — 使用者資訊:dialog 開啟時從 JWT token 取,失敗時 fallback 本地匯入資訊
import { useState, useEffect } from 'react';
import { extractUserInfoFromToken } from '../utils/userInfoUtils';
import { buildUserInfoFromLocal } from '../utils/ageUtils';

export function useUserInfo(open) {
  const [userInfo, setUserInfo] = useState(null);
  useEffect(() => {
    if (open) {
      let info = extractUserInfoFromToken();
      if (!info && window._localUserInfo) {
        info = buildUserInfoFromLocal(window._localUserInfo);
      }
      setUserInfo(info);
    }
  }, [open]);
  return { userInfo, setUserInfo };
}
```

- [x] Step 1: 先寫失敗測試(renderHook;stub `window._localUserInfo`;token 路徑因 sessionStorage 無 token 自然回 null → 驗證 fallback 與 open=false 不觸發)。範例斷言:open=true 且 `window._localUserInfo={name:'測',userId:'A1',gender:'M',birthday:'0790115'}` → `result.current.userInfo.name === '測'`;open=false → userInfo 為 null。
- [x] Step 2: red → 實作 → green。
- [x] Step 3: FloatingIcon 改用:刪除 `const [userInfo, setUserInfo] = useState(null)` 與 412-421 的 `[open]` effect,改 `const { userInfo, setUserInfo } = useUserInfo(open);`(handleData 內的 local-userInfo fallback 呼叫 setUserInfo 不變)。
- [x] Step 4: 驗證(vitest 全綠、build、FloatingIcon eslint 基準比較)+ Commit `重構:使用者資訊抽出 useUserInfo hook`

### Task 4: useNhiDataState hook

**Files:** Create `src/hooks/useNhiDataState.js`;Modify `src/components/FloatingIcon.jsx`

把 15 個資料 state(groupedMedications、groupedLabs、groupedChineseMeds、imagingData、allergyData、surgeryData、dischargeData、medDaysData、dashboardData、adultHealthCheckData、cancerScreeningData、hbcvData、ckmData、patientSummaryData——**不含 userInfo/settings/UI state**)、`handleData`、`[appSettings.lab]` 初始載入 effect 搬進 hook。

介面(hook 註解需說明「維持 dataFetchCompleted 事件觸發、不用 store.subscribe」的批次理由):

```js
export function useNhiDataState({ appSettingsRef, userInfo, setUserInfo }) {
  // ...15 個 useState(自 FloatingIcon 逐字搬入)
  const handleData = async () => { /* 自 FloatingIcon 逐字搬入,引用改為本 hook 的 setter */ };
  useEffect(() => { handleData(); }, [appSettingsRef.current?.lab]); // 見 Step 2 注意事項
  return {
    groupedMedications, groupedLabs, groupedChineseMeds, imagingData,
    allergyData, surgeryData, dischargeData, medDaysData, dashboardData,
    adultHealthCheckData, cancerScreeningData, hbcvData, ckmData,
    patientSummaryData,
    handleData, // 供 dataFetchCompleted listener(暫留在 FloatingIcon)呼叫
    setGroupedMedications, setGroupedLabs, setGroupedChineseMeds, // 供 settings reprocess 呼叫
  };
}
```

- [x] Step 1: 建 hook,15 個 state + handleData + CKM 處理逐字搬入。
- [x] Step 2: **初始載入 effect 注意**:原為 `useEffect(() => { handleData(); }, [appSettings.lab])`。hook 只拿到 ref,`appSettingsRef.current?.lab` 作依賴**不會**在 settings 變更時重跑(ref 變更不觸發 render)——但原行為中 lab 設定變更會經 settings listener 的 reprocess 路徑處理,此 effect 實際只負責「掛載時初次載入」+「appSettings state 更新造成的 re-render 時再跑」。**保守作法**:hook 另收 `labSettings` 參數(FloatingIcon 傳 `appSettings.lab`),effect 依賴 `[labSettings]`,行為與原版完全一致。採用此作法。
- [x] Step 3: FloatingIcon 刪除對應 state/handleData/effect,改解構 hook 回傳;dataFetchCompleted listener 中的 `handleData()` 呼叫與 `handleDataFetchCompletedSettingsChange` callbacks(reprocess setters)改用 hook 回傳的函數。**注意 stale closure**:掛載 effect(`[]`)內引用的 `handleData` 是首次 render 的版本,其內部經 setter(state setter 恆穩定)與 `appSettingsRef`/`dataStore` 取值,無 stale 資料問題——與現行為相同;在報告中確認此推理。
- [x] Step 4: 驗證(vitest、build、eslint 基準、手動核對 diff 為純搬移)+ Commit `重構:NHI 資料狀態抽出 useNhiDataState hook`

### Task 5: useSettingsState hook

**Files:** Create `src/hooks/useSettingsState.js`;Modify `src/components/FloatingIcon.jsx`

把 appSettings/generalDisplaySettings state、initializeSettings、`listenForSettingsChanges`/`listenForMessages`/`listenForDataFetchCompletion` 三個 listener 的掛載 effect、openRef/appSettingsRef 同步搬進 hook。

介面:

```js
export function useSettingsState({ open, setOpen, setTabValue, advancedTabIndex, nhiData }) {
  // nhiData = useNhiDataState 的回傳(需 handleData 與三個 reprocess setter)
  // 回傳 { appSettings, setAppSettings, generalDisplaySettings, appSettingsRef }
}
```

- [x] Step 1: 逐字搬移(含訊息處理的四個 action 分支、openRef 讀取模式)。openRef 由 hook 內建(收 `open` 參數同步)。
- [x] Step 2: 相依順序:FloatingIcon 中 `useSettingsState` 需要 `nhiData`,`useNhiDataState` 需要 `appSettingsRef`——**循環**。解法:appSettingsRef 在 FloatingIcon 建立(保持現狀的 ref 宣告),分別傳入兩個 hook;useSettingsState 負責同步 `appSettingsRef.current = appSettings`。介面調整為 `useSettingsState({ open, setOpen, setTabValue, advancedTabIndex, appSettingsRef, nhiData })`。
- [x] Step 3: FloatingIcon 刪除搬走的 ~160 行,驗證(vitest、build、eslint 基準)。
- [x] Step 4: Commit `重構:設定狀態與監聽器抽出 useSettingsState hook`

### Task 6: MainDialogHeader 抽出 + FloatingIcon 收尾

**Files:** Create `src/components/MainDialogHeader.jsx`;Modify `src/components/FloatingIcon.jsx`

- [x] Step 1: 把 DialogTitle 內整塊(使用者資訊列、Tabs 與 8 個 Tab、狀態指示器區)抽成 `<MainDialogHeader>`。Props:`tabValue, onTabChange, onOverviewClick, userInfo, counts(={medications, chineseMeds, labs, imaging, medDays}), imagingData, allergyData, surgeryData, dischargeData, patientSummaryData, showAdvancedTab`。generalDisplaySettings 用 context hook(既有模式)。內部沿用 getTabColor/CKD 指示器等現有 import。
- [x] Step 2: FloatingIcon 檢查最終狀態:目標 <350 行(hooks 組合 + Dialog 外殼 + TabPanels + Snackbar)。**若 snackbar state 無人使用**(setSnackbarOpen/Message 從未被呼叫——grep 確認,這可能是 LabData no-undef bug 的殘骸),回報但保留(修復屬 LabData bug 的 scope,不在本計畫)。
- [x] Step 3: 驗證(vitest、build、eslint、`wc -l`)+ Commit `重構:抽出 MainDialogHeader,FloatingIcon 瘦身完成`

### Task 7: settingsManager 測試補強

**Files:** Create `tests/settingsManager.test.js`

- [x] Step 1: 測 `handleDataFetchCompletedSettingsChange` 的 store 讀取路徑:dataStore 塞入 labdata/chinesemed/medication → 建立 mock callbacks(vi.fn)與 currentSettings → 對 settingType='labsettings'(allSettings 與單一設定兩種 event)、'chinesemed'、'overview' 各驗證:updateCallback 收到正確合併設定、reprocess callback 收到 store 的資料。約 4-6 個測試。chrome.storage 已有 stub(vitest.setup.js)。
- [x] Step 2: red 確認(對「callbacks 收到 store 資料」的斷言,在未塞 store 時應 fail)→ green。
- [x] Step 3: Commit `測試:settingsManager 設定變更 reprocess 路徑補強`

### Task 8: 文件更新

**Files:** CLAUDE.md(磁碟)、spec、本計畫勾選、交班文件

- [x] Step 1: CLAUDE.md「UI structure」段落改寫:FloatingIcon 為組合根(hooks: useUserInfo/useNhiDataState/useSettingsState 於 `src/hooks/`,tab 導覽在 `MainDialogHeader.jsx`),不再是「owns essentially all in-page state」。
- [x] Step 2: spec 狀態行加「階段 4」;本計畫勾選(煙霧測試除外);交班文件 TL;DR 與 Git 快照更新。
- [ ] Step 3: 手動煙霧測試清單(保持未勾):
  1. dialog 開啟、全部 tab 正常(hooks 組合驗證)
  2. popup 觸發「開啟自訂格式編輯器」跳進階 tab(useSettingsState 訊息分支 + nhiDataRef)
  3. popup 改檢驗顯示格式,檢驗 tab 即時重處理(settings listener reprocess 經 nhiDataRef)
  4. 本地 JSON 匯入:userInfo 顯示(useUserInfo)、資料入 tab、清除後重置
  5. 病患切換資料重置
  6. CKD/CT/MRI/過敏/手術/出院 指示器正常(MainDialogHeader)
- [x] Step 4: Commit `文件更新:階段 4 FloatingIcon 拆解說明`

---

## 驗收清單

- [x] FloatingIcon.jsx < 350 行;hooks 各自單一職責;無邏輯變更(純搬移)
- [x] localDataHandler 死碼與 lastProcessedMedicationData 移除;debug hooks 已標註
- [x] useUserInfo 有測試;settingsManager reprocess 路徑有測試
- [x] 全套測試綠、build 綠、eslint 不新增
- [x] stale-closure ref 模式保留且推理經審查確認
- [ ] 手動煙霧測試通過

## 審查累積追蹤項目

- `getLocalDataStatus` 無呼叫者(既存死碼)
- settingsManager bulk lab 設定路徑漏 `labCopyAllOrder`(潛在不一致,`tests/settingsManager.test.js` 已以 `notProperty` 鎖定現狀)
- `useUserInfo` 與 `handleData` 的 `buildUserInfoFromLocal` fallback 重複(候選整併)
- FloatingIcon 死 snackbar state(LabData bug 殘骸,修復屬 LabData scope)
