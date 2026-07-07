# 開發者完整抓取 — 交班文件(進度 + 下一階段)

> 2026-07-07 撰寫。對應 spec `2026-07-07-developer-mode-full-fetch-design-v2.md`。
> 用途:換 session／換機器接手時,快速掌握「做到哪、還沒驗什麼、下一步做什麼」。

## 1. 目前進度(已完成並 commit)

分支 `dev-techdebt-features`,領先 `origin/dev-techdebt-features` **2 個 commit(尚未 push)**:

| commit | 內容 |
|---|---|
| `f339f2f` | 文件:spec v2 定案(+ 舊 v1 標記為已取代) |
| `9a10537` | 功能:開發者完整抓取模式 + 11 型別補抓(registry pilot)+ 本交班文件 |

### 程式碼變更(16 檔,+390/−20)

- **新增 `src/dataTypes/`**(輕量 registry pilot,DOC/07 方向一落地):
  - `devTypes.js` — 11 個補抓型別的單一描述來源(key/node/apiPath/shape)。
  - `registry.js` — 衍生 `DEV_KEYS` / `DEV_API_ENTRIES` / `DEV_SHAPE_ENTRIES` / `DEV_NODE_TO_TYPES`。
- **附加併入既有接點**(不改 14 舊型別分散登記):`apiPathMap.js`、`permissionMap.js`、
  `responseNormalizer.js`(TYPE_SHAPE)、`store/dataStore.js`(DATA_TYPES + `'permission'`)。
- **閘門**:`authorization.shouldFetchSpecialData` 加第三參數 `devFetchAll`(預設 false,向後相容);
  `apiInterceptor/index.js#fetchAllDataTypes` 讀 `chrome.storage.local.devFetchAll`、加 `devTypes` 批次、
  寫 `dataStore.setData('permission', { nodes, dataTypes })`。
- **下載 / round-trip**:`messageHandlers.js#getPatientData` 自動含 11 型別(掃 `API_PATH_MAP`)+ 顯式補
  `permission`(null 時由 JWT 派生);`localDataHandler.js` 的 `LOCAL_KEY_TO_STORE_TYPE` 補
  `labdraw`/`permission`/11 型別。
- **UI**:`components/settings/LoadDataTab.jsx`(開發 tab)最上方新增「完整抓取模式」Switch +
  「立即重新抓取」Button + `dataTypeMap` 中文標籤。

### 11 個型別與回應形狀(已對 `.test_data/api_data/` 樣本驗證)

| key | 節點 | 端點 | shape |
|---|---|---|---|
| `specialPayment` | 1.3 | imue0190s01/lftp-data | recordAsSingle(三分表物件) |
| `controlledMed` | 2.2 | imue0009s02/get-data | rows |
| `controlledMedSummary` | 2.2 | imue0009s03/get-data | dataAsRows(裸陣列) |
| `acupuncture` | 3.2 | imue0160s02/get-data | rows |
| `chineseMedCare` | 3.3 | imue0170s02/get-data | rows |
| `chineseMedCareSummary` | 3.3 | imue0170s03/get-data | dataAsRows |
| `dental` | 4.1 | imue0030s02/get-data | rows |
| `labRecord` | 6.5 | imue0010s02/get-data | rows |
| `rehabilitation` | 9.1 | imue0080s02/get-data | rows |
| `rehabilitationSummary` | 9.1 | imue0080s03/get-data | dataAsRows |
| `specialMaterial` | 10.1 | imue0200s02/get-data | rows |

## 2. 已驗證 vs 未驗證

**已驗證(自動化,本機綠):**
- `npm test` → **280 passed**(含新增:registry 衍生、devFetchAll 閘門、三形狀正規化、round-trip 匯入)。
- `npm run type-check` → exit 0。
- `npm run build` → exit 0(dist 產出正常)。
- 改動檔案 `eslint` → 0 error(既有 79 error 為 `.claude/`(gitignore) 與 `scripts/build.js`/`tests/serve.js`
  的 node-globals 環境問題,與本次無關,已 stash 對照確認)。

**尚未驗證(需真實瀏覽器 + NHI 登入 session,無法在 CI/headless 跑):**
- 擴充功能實際載入後,開發 tab 的 Switch 讀寫 `chrome.storage.local.devFetchAll` 是否正常。
- 開啟「完整抓取模式」→「立即重新抓取」後,11 個端點是否真的被打、回應形狀是否如樣本
  (展示版部分欄位為空,正式帳號資料可能揭露新形狀差異)。
- 下載 JSON 是否含 11 型別 key + `permission`,且 round-trip 匯入可重播。
- 授權不足的帳號:未授權節點的型別 API 回拒絕時,`createEmptyDataResult` 佔位是否無副作用。

## 3. 下一階段計畫

### 3.1 立即:實機驗證(接手第一件事)

在真實瀏覽器對 `medcloud2.nhi.gov.tw` 頁面實測(需維護者登入 session):

1. `npm run build` → 於 Chrome「載入未封裝項目」指向 `dist/`。
2. 進入健保雲端頁面,開 popup →(七連點解鎖開發者模式)→「開發」tab。
3. 開「完整抓取模式」→ 按「立即重新抓取」→ 開 DevTools Network 確認 11 端點被打。
4. 按「下載 JSON 資料檔」→ 檢查檔案含 11 型別(有授權者有資料)+ 頂層 `permission`。
5. 關「完整抓取模式」再抓一次 → 確認**只**抓原本那批(11 端點不再被打),一般 loading 不變。
6. 把步驟 4 的 JSON 於「匯入本地 JSON」載回 → 確認 dataStore/顯示可重播(round-trip)。
7. 個案 JSON **不入版控**(存 `.test_data/`);任何要入版控的 fixture 一律合成假資料。

**若實測發現新回應形狀**:在 `src/dataTypes/devTypes.js` 對應型別補/改 `shape`(既有 normalizer
已涵蓋 rows/dataAsRows/recordAsSingle/rowsOrSingle/dataAsSingle;真需新形狀才在
`responseNormalizer.js` 的 `SHAPE_NORMALIZERS` 加),補對應測試後再動。

### 3.2 收尾(實測通過後)

- push 分支;若要合併,依專案慣例走 PR(CI: lint/test/build)。
- **版號 bump**(`package.json` version + 相關同步點,參照近期 commit `fb1f786` 的作法)。
- 視需要更新 DOC:`DOC/06`(已含端點)、`DOC/07`「執行順序」把「開發者模式完整抓取」由
  「阻擋中」移到已完成;`DOC/04` 若有相關追蹤項一併更新。

### 3.3 後續延伸(本次刻意不做,留待日後)

- imue0050 特定凝血因子(無專屬授權節點)、出院病摘全文 show-xml(逐筆 POST/HTML)、
  AI 影像彙整(跨網域 60 秒 token)—— 見 spec v2 §3「不做」。
- 新型別目前**只進下載 JSON,不進 `NHITW_DATA`**。日後若做出功能要跨擴充功能讀取,因命名已統一,
  加進 `store/nhitwExport.js#buildShareData` 是一行(見 spec v2 §7 與「命名解凍」決策)。
- registry pilot 驗證順手後,可依 DOC/07 方向一把舊 14 型別逐一遷入(characterization 先行,一型別一 commit)。

## 4. 接手須知 / 陷阱

- `devFetchAll` 存 `chrome.storage.local`,**刻意不進** `settingsSchema`/`storage.sync`——
  不跨機同步、不污染設定契約與 `tests/fixtures/storageKeys.js` 快照。改這點前先想清楚。
- `permission` 型別無 `rObject`,`getPatientData#hasAnyData` 只認 `rObject`,故「只有授權清單、
  無醫療資料」不會誤觸發下載——動 hasAnyData 邏輯時保留此性質。
- `NODE_TO_DATA_TYPE` 的值是**型別陣列**;2.2/3.3/9.1 各對兩型別(明細+彙總),
  由 `DEV_NODE_TO_TYPES` 的 group-by-node 產生。新增節點若與既有重疊需改為 merge(目前不重疊,直接 spread)。
- 本機 `npm run lint` 的 79 個 error 是**既有環境問題**(node-globals),非本次引入;
  驗收以「改動檔案 eslint 乾淨 + 280 測試綠」為準。
