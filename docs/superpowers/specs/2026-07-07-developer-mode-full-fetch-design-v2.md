# 開發者模式完整抓取 + 資料 round-trip 設計 v2

> 2026-07-07 brainstorming 定案。**修訂** `2026-07-05-developer-mode-full-fetch-design.md`（方案 A）。
> 前一版的唯一阻擋——「DOC/06 缺 8 個節點的 API 端點」——已由 commit `96aeaaa`（補齊未介接頁籤 API）解除。
> 本版依補齊後的實測樣本（`.test_data/api_data/`，永不進版控）定案抓取範圍、型別命名與正規化形狀，
> 並納入本輪三項新決策：全部 UI 收進「開發」tab、輕量 registry pilot、`NHITW_DATA` 命名解凍。

## 1. 背景與目標

收集完整個案資料供日後功能開發參考。現況缺口：

1. 特殊型別（adultHealthCheck/cancerScreening/hbcvdata/labdraw）在雲端設定關閉時不抓，下載的 JSON 不完整。
2. JWT `Permission`（等同 masterMenu API 的 `prsnAuth`）沒有存進下載 JSON。
3. 下載 JSON 含 `labdraw`，但本地匯入 `LOCAL_KEY_TO_STORE_TYPE` 沒有它，round-trip 不完整。
4. DOC/06 已補齊 8 個授權節點的 API 端點，但這批資料目前一般使用者不抓，下載 JSON 缺這些參考資料。

**成功標準**：開發者打開「完整抓取模式」開關 → 立即重新抓取 → 一鍵下載 JSON，即得到「所有可抓端點」的完整個案資料；
本地匯入可完整重播（round-trip）。一般使用者**不受影響**、不增加任何 API loading（新端點預設不抓）。

## 2. 三項本輪新決策（相對 v1）

1. **UI 全在「開發」tab**（不動「設定」tab）。「開發」tab（`LoadDataTab`，僅 `developerMode===true` 顯示）已有「下載 JSON」「匯入本地 JSON」，本版只在其最上方新增一個開發者控制區塊。（v1 原規畫放「設定」tab 底部，本版依使用者澄清改置「開發」tab。）
2. **輕量 registry pilot**：新的補抓型別以「資料型別描述檔」單一來源實作（DOC/07 方向一 pilot），只含這批新型別，14 個舊型別維持原分散登記並存。
3. **`NHITW_DATA` 命名解凍**：`NHITW_DATA` 目前**無任何外部消費者**，故解除 DOC/07「key 只增不改」鐵律——命名以最適切為準，**待有實際消費者後再凍結**。直接影響：新型別全系統只用**一個** camelCase 名字（不再製造 store／download／契約三名漂移的 `exportKey` 別名）。

## 3. 範圍

**做：**

- 「開發」tab 新增 `devFetchAll`（「完整抓取模式」）開關 + 「立即重新抓取」按鈕
- `devFetchAll` 為單一閘門，同時控制：
  - 特殊型別（健檢/癌篩/hbcv/labdraw）**無視雲端設定開關**照抓
  - 新節點型別（下表 11 個）**僅開啟時才抓**（否則整批跳過，省 API 呼叫）
- 11 個新補抓型別以 registry 描述檔實作，衍生進既有接點
- JWT 授權寫入 `dataStore('permission')` 並隨下載 JSON 輸出（頂層 `permission` key）
- 本地匯入補 `labdraw`、`permission` 與 11 個新型別（round-trip 完整）

**不做：**

- `imue0050` 特定凝血因子用藥（masterMenu 無專屬授權節點）
- 出院病摘全文 `imue0070s01/show-xml`（需逐筆 POST、回應是 HTML 非結構化）
- AI 影像報告彙整（跨網域 `lcr-tp.nhi.gov.tw`、60 秒短效 token）
- 新型別進 `NHITW_DATA`（`buildShareData`）——只進「下載 JSON」，理由見 §7
- 新型別的 UI 顯示 / processor（等日後功能開發）
- 授權檢查繞過（JWT 沒授權的型別，API 端會拒絕，嘗試無意義）
- masterMenu 抓取（JWT 已涵蓋 `prsnAuth`，槽位維持 null）

## 4. 抓取範圍與型別命名（一次定終身）

樣本（`.test_data/api_data/`）已驗證三種回應形狀，**全部命中既有 `responseNormalizer` 的 shape，不需新增 normalizer**：

- `rows` → 既有 `'rows'`（`robject` 是列陣列）
- 裸陣列（無 robject 包裝，如 `imue0009s03`）→ 既有 `'dataAsRows'`（直接吃 `data` 本體）
- 三分表物件（`imue0190` 的 `{medical_service, drugs, special_material}`）→ 既有 `'recordAsSingle'`（把整個 robject 物件包成一元素陣列）

| key（camelCase，全系統唯一名） | 節點 | 端點 | shape |
|---|---|---|---|
| `specialPayment` | 1.3 | `imue0190/imue0190s01/lftp-data` | `recordAsSingle` |
| `controlledMed` | 2.2 | `imue0009/imue0009s02/get-data` | `rows` |
| `controlledMedSummary` | 2.2 | `imue0009/imue0009s03/get-data` | `dataAsRows` |
| `acupuncture` | 3.2 | `imue0160/imue0160s02/get-data` | `rows` |
| `chineseMedCare` | 3.3 | `imue0170/imue0170s02/get-data` | `rows` |
| `chineseMedCareSummary` | 3.3 | `imue0170/imue0170s03/get-data` | `dataAsRows` |
| `dental` | 4.1 | `imue0030/imue0030s02/get-data` | `rows` |
| `labRecord` | 6.5 | `imue0010/imue0010s02/get-data` | `rows` |
| `rehabilitation` | 9.1 | `imue0080/imue0080s02/get-data` | `rows` |
| `rehabilitationSummary` | 9.1 | `imue0080/imue0080s03/get-data` | `dataAsRows` |
| `specialMaterial` | 10.1 | `imue0200/imue0200s02/get-data` | `rows` |

> 命名注意：`acupuncture`/`rehabilitation` 等曾在舊格式出現過又移除，重用前確認下游無殘留假設（本版下游全新，無殘留）。
> `controlledMed` 與 v1 草案（`chineseMedCare` 對應 3.3 等）一致；彙總副表一律 `<主型別>Summary`。

## 5. 輕量 registry pilot（描述檔 + 衍生）

新增目錄 `src/dataTypes/`（DOC/07 方向一 pilot 落點，只含這批新型別）：

```js
// src/dataTypes/devTypes.js — 開發者補抓型別的單一描述來源
// shape 省略 = 'rows'（既有 responseNormalizer 預設）
export const DEV_DATA_TYPES = [
  { key: 'specialPayment',        node: '1.3',  apiPath: 'imue0190/imue0190s01/lftp-data', shape: 'recordAsSingle' },
  { key: 'controlledMed',         node: '2.2',  apiPath: 'imue0009/imue0009s02/get-data' },
  { key: 'controlledMedSummary',  node: '2.2',  apiPath: 'imue0009/imue0009s03/get-data', shape: 'dataAsRows' },
  { key: 'acupuncture',           node: '3.2',  apiPath: 'imue0160/imue0160s02/get-data' },
  { key: 'chineseMedCare',        node: '3.3',  apiPath: 'imue0170/imue0170s02/get-data' },
  { key: 'chineseMedCareSummary', node: '3.3',  apiPath: 'imue0170/imue0170s03/get-data', shape: 'dataAsRows' },
  { key: 'dental',                node: '4.1',  apiPath: 'imue0030/imue0030s02/get-data' },
  { key: 'labRecord',             node: '6.5',  apiPath: 'imue0010/imue0010s02/get-data' },
  { key: 'rehabilitation',        node: '9.1',  apiPath: 'imue0080/imue0080s02/get-data' },
  { key: 'rehabilitationSummary', node: '9.1',  apiPath: 'imue0080/imue0080s03/get-data', shape: 'dataAsRows' },
  { key: 'specialMaterial',       node: '10.1', apiPath: 'imue0200/imue0200s02/get-data' },
];
```

```js
// src/dataTypes/registry.js — 由描述檔衍生既有接點需要的片段
import { DEV_DATA_TYPES } from './devTypes';

export const DEV_KEYS = DEV_DATA_TYPES.map(t => t.key);

// → 併入 apiPathMap.js 的 API_PATH_MAP
export const DEV_API_ENTRIES = DEV_DATA_TYPES.map(t => [t.key, t.apiPath]);

// → 併入 responseNormalizer.js 的 TYPE_SHAPE（只有非預設 shape 的才登記）
export const DEV_SHAPE_ENTRIES = DEV_DATA_TYPES.filter(t => t.shape).map(t => [t.key, t.shape]);

// → 併入 permissionMap.js 的 NODE_TO_DATA_TYPE
//   NODE_TO_DATA_TYPE 的值是「型別陣列」（如 '6.1': ['labdata','labdraw']），
//   而 2.2/3.3/9.1 各對兩型別（明細+彙總），故需先 group by node 再輸出陣列值。
export const DEV_NODE_TO_TYPES = DEV_DATA_TYPES.reduce((acc, t) => {
  (acc[t.node] ??= []).push(t.key);
  return acc;
}, {});
```

**既有接點改為「附加」衍生片段（不改既有 14 型別的登記）：**

| 檔案 | 改法 |
|---|---|
| `apiInterceptor/apiPathMap.js` | `new Map([...現有 14 條, ...DEV_API_ENTRIES])` |
| `apiInterceptor/permissionMap.js` | 把 `DEV_NODE_TO_TYPES` 併入 `NODE_TO_DATA_TYPE`（object spread；本批新節點與既有節點不重疊，直接展開即可） |
| `store/dataStore.js` `DATA_TYPES` | `[...現有, ...DEV_KEYS, 'permission']`（`permission` 見 §6，非 apiPath 型別，直接列） |
| `apiInterceptor/responseNormalizer.js` `TYPE_SHAPE` | `new Map([...現有, ...DEV_SHAPE_ENTRIES])` |
| `apiInterceptor/index.js` | 新增 `devTypes` 批次，見 §6 |

## 6. 抓取管線與 `permission`（content script）

### 6.1 `devFetchAll` 閘門

`src/apiInterceptor/index.js#fetchAllDataTypes`：

1. 抓取前讀 `chrome.storage.local.devFetchAll`（boolean，預設 false）。
2. `regularTypes`（現有 10 型）→ 不變，永遠依授權抓。
3. `specialTypes`（現有 4 型）→ `shouldFetchSpecialData(type, cloudSettings, devFetchAll)` 加**第三參數**：
   `devFetchAll === true` 時視為該抓（無視 cloudSettings）；未傳/false 時行為與現況完全一致。
4. **`devTypes`（`DEV_KEYS` 的 11 型）→ 只有 `devFetchAll === true` 才進批次，且仍需 `authorized.has(key)`。**
   失敗以既有 `createEmptyDataResult` 佔位。

`authorization.js#shouldFetchSpecialData` 改簽名（純函數、可單元測試）：

```js
export function shouldFetchSpecialData(dataType, cloudSettings, devFetchAll = false) {
  const key = SPECIAL_DATA_TYPE_SETTING_KEYS[dataType];
  if (!key) return true;          // 非特殊型別恆 true（行為不變）
  if (devFetchAll) return true;   // 完整抓取模式無視雲端開關
  return Boolean(cloudSettings && cloudSettings[key]);
}
```

### 6.2 `permission` 型別

- `dataStore.DATA_TYPES` 新增 `'permission'`（非 apiPath 型別，不走 registry）。
- `fetchAllDataTypes` 算出 `authorized` 後：
  `dataStore.setData('permission', { nodes: string[], dataTypes: string[] })`
  （`nodes` = `getPermissions()` 的原始節點 ID 陣列；`dataTypes` = `getAuthorizedDataTypes` 換算後的型別清單）。
  一般模式也寫入（成本為零，資料本來就在 JWT 內）。

## 7. 資料流：下載 JSON 與 round-trip

有**兩條獨立匯出路徑**，本版新型別只走「下載 JSON」：

- **路徑一 `NHITW_DATA`（`store/nhitwExport.js#buildShareData`）**：給其他擴充功能跨程式讀取的共享 blob。
  本版新型別**不進**此路徑。理由：（a）blob 有 4MB 告警門檻（DOC/04 #4），塞入無人讀的資料只增體積；
  （b）`buildShareData` 語意是「給功能/其他程式讀的資料」，這批目前無讀者。因命名已統一，
  日後真要進契約是一行、且安全。
- **路徑二「下載 JSON」（`messageHandlers.js#getPatientData`）**：開發者存檔用，
  以 `for (dataType of API_PATH_MAP.keys())` 逐型別輸出——**新型別加進 `apiPathMap` 即自動含入**。

### 7.1 下載（`getPatientData`）

- 迴圈 `API_PATH_MAP.keys()` 自動含 11 新型別（key = dataType，無別名；註：既有 `labdata`→`lab` 的別名維持不動）。
- **顯式**補頂層 `permission` key，值取 `dataStore.getData('permission')`；
  為 null 時（只下載、未重抓的情境）由 `getTokenPayload()` 現場派生 `{ nodes, dataTypes }`。
- `hasAnyData` 只認 `rObject`；`permission`（`{nodes,dataTypes}`，無 `rObject`）天然不影響「有資料」判斷——
  避免「只有授權清單、沒有醫療資料」時仍觸發下載。

### 7.2 匯入（`localDataHandler.js#LOCAL_KEY_TO_STORE_TYPE`）

- 補 `['labdraw', 'labdraw']`、`['permission', 'permission']`，及 11 個新型別 `[key, key]`（名字統一）。
- `LoadDataTab.jsx#dataTypeMap`：補中文標籤（labdraw→檢驗圖形化、permission→授權清單、
  specialPayment→特殊給付限制、controlledMed→特定管制用藥…等 11 型別 + 副表）。

## 8. UI：「開發」tab 的開發者控制區塊

`src/components/settings/LoadDataTab.jsx` 最上方新增一個 `Paper`：

- **Switch「完整抓取模式（含未介接 API）」** → 讀寫 `chrome.storage.local.devFetchAll`（預設 false）。
  **不進 `settingsSchema`／`chrome.storage.sync`**——開發工具非使用者設定，不同步到其他機器、
  不污染設定契約與 `tests/fixtures/storageKeys.js` 快照。
- **Button「立即重新抓取」** → 對當前分頁送既有 `manualFetchData` 訊息；
  非 NHI 頁面或通訊失敗時顯示錯誤 snackbar（仿既有下載/匯入的錯誤處理）。
- 說明文字：標明會多抓約 11 個端點、較慢，僅供開發參考。
- 既有「下載 JSON」「匯入本地 JSON」區塊不動。

操作流程：開開關 → 立即重新抓取（content script 此時讀到 `devFetchAll=true`，多抓 dev 型別）→ 下載 JSON（自動含新型別）。

> 「開發」tab 本身的顯示條件（`developerMode`、七連點解鎖、`chrome.storage.local.developerMode`）維持現況（`PopupSettings.jsx`），本版不改。

## 9. 測試計畫（TDD，先紅後綠）

- `shouldFetchSpecialData`：第三參數 `devFetchAll` true 時無視 cloudSettings；未傳/false 時行為不變（characterization 先補既有兩參數行為）。
- registry 衍生：`DEV_API_ENTRIES` / `DEV_SHAPE_ENTRIES` / `DEV_NODE_TO_TYPES`（含 2.2/3.3/9.1 一節點多型別的 group-by-node）結構正確。
- `normalizeResponseData`：`rows` / `dataAsRows` / `recordAsSingle` 三形狀對**合成假資料**輸出正確 `{ rObject: [...] }`（特別驗 `imue0190` 物件三分表 → 一元素、`imue0009s03` 裸陣列 → 原陣列）。
- `getPatientData`：下載內容含 `permission`（dataStore 有值／由 JWT 派生兩情境）與 11 新型別 key；`hasAnyData` 不受 permission 影響。
- `localDataHandler`：匯入含 `labdraw`/`permission`/新型別的 JSON 後 dataStore 有值、`loadedTypes` 標籤正確；不含時不影響既有型別（characterization）。
- UI（`LoadDataTab`）：Switch 讀寫 `chrome.storage.local.devFetchAll`；「立即重新抓取」在非 NHI 分頁顯示錯誤 snackbar。
- 個案資料驗證用 `.test_data/api_data/`（**絕不入版控**，已在 `.gitignore`）；入版控 fixture 一律合成假資料。

## 10. 風險與注意

- `chrome.storage.local` 在 content script 與 popup 是同一擴充功能 storage，讀寫一致。
- 新端點回應形狀已由 `.test_data/api_data/` 樣本驗證對應到既有三個 normalizer，但展示版樣本部分欄位為空——實作時仍以「非陣列一律收斂為空陣列」的既有防呆為底線。
- `devFetchAll` 開啟後一次批次多約 11 個 API 呼叫，僅開發者手動觸發，不影響一般使用者。
- `permission` 進 `dataStore.DATA_TYPES` 後 `clearAll` 會一併重設，符合「病患切換清空」語意。

## 11. 與 v1 的差異摘要（供對照）

| 項目 | v1（2026-07-05） | v2（本版） |
|---|---|---|
| UI 位置 | 「設定」tab 底部新增 `DeveloperSettings` | 「開發」tab（`LoadDataTab`）最上方新增區塊 |
| 新型別實作 | 分散登記（apiPathMap/permissionMap 逐檔一行） | 輕量 registry pilot（`src/dataTypes/` 描述檔衍生） |
| 抓取範圍 | 8 節點型別 | 8 節點型別 + 3 彙總副表（共 11） |
| `NHITW_DATA` 契約 | 「只增不改」凍結，新型別不進契約 | 契約解凍（無外部消費者），新型別仍只進下載 JSON（理由改為 blob 體積/無讀者） |
| 命名 | 預留 `exportKey` 一次定終身 | 全系統單一 camelCase 名，不製造別名 |
