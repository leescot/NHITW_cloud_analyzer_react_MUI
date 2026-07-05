# 開發者模式完整抓取 + 資料 round-trip 設計

> 2026-07-05 brainstorming 定案(方案 A)。
> **實作前置條件:`DOC/06_API資料對照與擷取流程.md`「JWT Permission 節點對應表」中
> 尚缺 API 端點的節點(1.3/2.2/3.2/3.3/4.1/6.5/9.1/10.1)由維護者補齊後才動工**,
> 補齊結果決定「補抓清單」的最終範圍與新型別命名(見 §6)。

## 1. 背景與目標

收集完整個案資料供日後功能開發參考。現況缺口:

1. 特殊型別(adultHealthCheck/cancerScreening/hbcvdata/labdraw)在雲端設定關閉時不抓,
   下載的 JSON 不完整。
2. JWT `Permission`(等同 masterMenu API 的 `prsnAuth`)沒有存進下載 JSON。
3. 下載 JSON 含 `labdraw`,但本地匯入 `LOCAL_KEY_TO_STORE_TYPE` 沒有它,round-trip 不完整。
4. 對應表中多個授權節點(牙科、復健、特材等)的 API 端點未知,無法抓取參考資料
   (待維護者補齊端點後納入)。

**成功標準**:開發者模式下,一鍵抓齊所有可抓的資料 → 下載 JSON → 本地匯入可完整重播,
所有資料的讀取變數名稱在本次定案(exportKey 一次定終身,DOC/07 命名規則)。

## 2. 範圍

**做:**
- popup「設定」tab 新增開發者專用區塊(不開新 tab)
- `devFetchAll` 旗標:開啟時特殊型別無視雲端設定開關抓取
- JWT 授權資訊寫入 dataStore 並隨下載 JSON 輸出(`permission` key)
- 本地匯入補 `labdraw` 與 `permission`(現在沒有功能讀它們,變數先就位)
- (端點補齊後)新節點型別的抓取,僅 `devFetchAll` 開啟時抓

**不做:**
- masterMenu 抓取(JWT 已涵蓋 `prsnAuth`,槽位維持 null)
- `NHITW_DATA` 對外契約變更(`permission` 不進 `buildShareData`;要用時再走契約變更政策)
- 新資料的 UI 顯示 / processor(等日後功能開發)
- 授權檢查繞過(JWT 沒授權的型別,API 端會拒絕,嘗試無意義)

## 3. UI:DeveloperSettings 區塊

新增 `src/components/settings/DeveloperSettings.jsx`,掛在「設定」tab 最底部
(`AdvancedSettings` 之後),**僅 `developerMode === true` 時渲染**
(沿用既有七連點解鎖機制,`chrome.storage.local.developerMode`)。內容:

- **Switch「完整抓取模式」**:讀寫 `chrome.storage.local.devFetchAll`(boolean,預設 false)。
  不進 `settingsSchema`/`chrome.storage.sync`——開發工具非使用者設定,
  不同步到其他機器、不污染設定契約與 `tests/fixtures/storageKeys.js` 快照。
- **Button「立即重新抓取」**:對當前分頁發既有 `manualFetchData` 訊息;
  非 NHI 頁面或通訊失敗時顯示錯誤 snackbar(仿 `LoadDataTab` 的錯誤處理)。
- 說明文字:標明開發用途與抓取範圍。

## 4. 抓取管線(content script)

`src/apiInterceptor/index.js#fetchAllDataTypes`:

1. 特殊型別判斷處併同讀取 `chrome.storage.local.devFetchAll`;
   為 true 時 `shouldFetchSpecialData` 結果視為 true(無視 cloudSettings)。
   實作偏好:在 `authorization.js` 加一個純函數(如
   `shouldFetchSpecialData(dataType, cloudSettings, devFetchAll)` 第三參數,
   或包一層 override),保持可單元測試。
2. 解析 JWT 授權後寫入
   `dataStore.setData('permission', { nodes: string[], dataTypes: string[] })`
   (原始權限節點 ID 陣列 + `getAuthorizedDataTypes` 換算後的型別清單)。
   一般模式也寫入(成本為零,資料本來就在 JWT 內)。
3. (端點補齊後)新節點型別:加入 `API_PATH_MAP` 與 dataStore `DATA_TYPES`,
   **僅 `devFetchAll === true` 時抓取**,失敗以既有 `createEmptyDataResult` 佔位。

## 5. 資料流與變數名稱定案

- `dataStore.DATA_TYPES` 新增 `'permission'`。
- 下載 JSON(`messageHandlers.js#getPatientData`)新增頂層 key **`permission`**,
  值取自 `dataStore.getData('permission')`,為 null 時現場由 `getTokenPayload()` 派生
  (確保只下載、未重抓的情境也有值)。
- 本地匯入(`localDataHandler.js#LOCAL_KEY_TO_STORE_TYPE`)新增
  `['labdraw', 'labdraw']` 與 `['permission', 'permission']`;
  `LoadDataTab.jsx#dataTypeMap` 補中文標籤(labdraw→檢驗圖形化、permission→授權清單)。
- `hasAnyData` 判斷(只認 `rObject`)不把 `permission` 算進「有資料」——
  避免「只有授權清單、沒有醫療資料」時仍觸發下載。

## 6. 待端點補齊後的新型別命名(草案,實作時定案)

| 節點 | 名稱 | 預留 key(camelCase,一次定終身) |
|------|------|-------------------------------|
| 1.3 | 特殊給付限制 | `specialPayment` |
| 2.2 | 特定管制用藥 | `controlledMed` |
| 3.2 | 針傷治療 | `acupuncture`(注意:舊格式曾有此 key 已移除,重用前確認下游無殘留假設) |
| 3.3 | 特定疾病門診加強照護 | `chineseMedCare` |
| 4.1 | 牙科處置紀錄 | `dental` |
| 6.5 | 檢查檢驗紀錄 | `labRecord` |
| 9.1 | 復健醫療紀錄 | `rehabilitation`(同 3.2 注意事項) |
| 10.1 | 特材紀錄 | `specialMaterial` |

每個新型別走 DOC/03「新增資料型別」清單的前半(dataStore/apiPathMap/permissionMap/
interceptor),**不做** UI/processor/`buildShareData`(維持契約不變)。

## 7. 測試計畫(TDD,先紅後綠)

- `shouldFetchSpecialData`:devFetchAll 開啟時無視 cloudSettings;關閉時行為不變
  (characterization 先補)。
- `getPatientData`:下載內容含 `permission`(dataStore 有值/由 JWT 派生兩情境);
  `hasAnyData` 不受 permission 影響。
- `localDataHandler`:匯入含 `labdraw`/`permission` 的 JSON 後 dataStore 有值、
  loadedTypes 標籤正確;不含時不影響既有型別(characterization)。
- `DeveloperSettings`:developerMode 關閉時不渲染;Switch 讀寫 storage.local。
- 個案資料驗證用 `.test_data/json`(**絕不入版控**),入版控 fixture 一律合成假資料。

## 8. 風險與注意

- `chrome.storage.local` 在 content script 與 popup 是同一擴充功能 storage,讀寫一致。
- 特殊型別補抓後資料會進 `NHITW_DATA`(既有 key,契約本來就有),下游本就需 null 檢查,無新風險。
- 新端點的回應形狀未知,可能需要 `responseNormalizer.js` 補正規化——實作時逐一驗證。
