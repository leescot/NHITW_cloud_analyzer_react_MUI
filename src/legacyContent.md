這個程式的執行流程主要分為三個關鍵部分：用戶識別(UserID)取得、授權令牌(Token)獲取和資料擷取。

## 用戶識別(UserID)流程

從 `initialize()` 開始，透過 `tokenUtils.getPatientId()` 直接從 JWT token 的 `UserID` 欄位取得病患身分證號。

Token 儲存在 `sessionStorage` key `"token"` 中，由 NHI 頁面登入流程（`verify3cards`）寫入。
解碼方式為標準 JWT Base64 + UTF-8 解碼（支援中文姓名等欄位）。

識別格式為 `patient_{UserID}`（如 `patient_A123456789`）。

## 授權令牌(Token)獲取流程

1. `tokenUtils.getRawToken()` 從 `sessionStorage.getItem('token')` 直接讀取
2. `tokenUtils.getAuthToken()` 加上 `Bearer ` 前綴，供 API 呼叫使用
3. `tokenUtils.getApiHeaders()` 組合完整的 HTTP headers（Authorization + Accept + X-Requested-With）
4. `tokenUtils.isTokenExpired()` 檢查 JWT `exp` 欄位判斷是否過期

不再使用 XHR header 攔截、script 標籤掃描或 localStorage fallback。

## 授權檢查流程

授權清單直接從 JWT payload 的 `Permission` 欄位解析（逗號分隔的節點 ID），不再呼叫 `master-menu` API。

`getAuthorizedDataTypes()` 透過 `NODE_TO_DATA_TYPE` 對照表將節點 ID 轉換為資料類型。
只有授權的資料類型才會發出 API 請求。

特例：`chronicMed` 永遠嘗試抓取，無資料時 API 回空集合，無副作用。

## 資料擷取流程

1. `fetchAllDataTypes()` 為主要入口：
   - 從 JWT 取得 token 和授權清單
   - 將資料類型分為常規類（medication, labdata, chinesemed 等）和特殊類（adultHealthCheck, cancerScreening, hbcvdata, labdraw）
   - 特殊類會額外檢查 `chrome.storage.sync` 中的使用者設定（如 `fetchAdultHealthCheck`）
   - 使用 `Promise.all` 併發請求所有授權的資料類型
2. `fetchSingleDataType()` 處理單一資料類型：
   - 從 `API_PATH_MAP` 查出 API 路徑
   - 構建完整 URL（含 `cli_datetime` 和 `insert_log` 參數）
   - 使用 `fetch()` 發送 GET 請求（`credentials: "include"`, `cache: "no-store"`）
   - 回應經 `normalizeResponseData()` 標準化為 `{ rObject: [...] }` 格式
   - 包含 race condition 防護：比對 `requestPatientId` 與 `lastPatientId`，病患已切換則丟棄
3. 資料儲存：
   - 更新 `window.lastIntercepted*Data` 全域變數（供 React UI 讀取）
   - 所有資料抓完後統一寫入 `localStorage('NHITW_DATA')`（跨擴充功能共享）
   - 透過 `chrome.runtime.sendMessage({ action: 'setBadge' })` 通知 background 設定 badge

## 病患切換偵測

採用雙重偵測機制：

1. **按鈕點擊（即時）**：`watchPatientSwitchButtons()` 監聯 NHI 頁面的「請換卡再按我」和「請掃描再按我」連結。按下後以 500ms 間隔密集輪詢 token，偵測到新 UserID 後立即抓取。
2. **Token 輪詢（兜底）**：`startTokenPolling()` 每 1.5 秒檢查 JWT `UserID` 是否變化，防止按鈕偵測失效。

## URL 變化偵測

`observeUrlChanges()` 每秒輪詢 `window.location.href`：
- 導航到登入頁 → 清除所有資料
- 導航到目標頁 → 啟動 token polling、掛載按鈕監聽、觸發資料抓取

## background.js 角色

精簡為只處理 content script 無法直接呼叫的 Chrome API：
- `chrome.action.openPopup()` — 開啟 popup
- `chrome.action.setBadgeText/Color()` — 設定 badge
- `chrome.tabs.onUpdated` — 偵測導航到登入頁時清除 badge

不再處理 webRequest 監聽、資料儲存或 session 管理。

## JWT Permission 節點對應表

JWT payload 的 `Permission` 欄位（等同 masterMenu API 的 `prsnAuth`）：

| 節點ID | 群組 | 名稱 | 對應資料類型 | API 端點 |
|--------|------|------|------------|---------|
| 1.1 | 摘要 | 病人資訊 | patientsummary | /imu/api/imue2000/imue2000s01/get-summary |
| 1.2 | 摘要 | B、C型肝炎專區 | hbcvdata | /imu/api/imue0180/imue0180s01/hbcv-data |
| 1.3 | 摘要 | 特殊給付限制 | — | — |
| 2.1 | 西醫用藥 | 用藥紀錄 | medication | /imu/api/imue0008/imue0008s02/get-data |
| 2.2 | 西醫用藥 | 特定管制用藥 | — | — |
| 2.3 | 西醫用藥 | 慢性處方箋 | chronicMed* | /imu/api/imue0008/imue0008s05/get-data |
| 2.4 | 西醫用藥 | 門診藥品餘藥日數 | medDays | /imu/api/imue0120/imue0120s01/pres-med-day |
| 3.1 | 中醫醫療 | 用藥紀錄 | chinesemed | /imu/api/imue0090/imue0090s02/get-data |
| 3.2 | 中醫醫療 | 針傷治療 | — | 目前未啟用 |
| 3.3 | 中醫醫療 | 特定疾病門診加強照護 | — | 目前未啟用 |
| 4.1 | 牙科處置紀錄 | 牙科處置紀錄項目 | — | — |
| 5.1 | 過敏紀錄 | 過敏紀錄 | allergy | /imu/api/imue0040/imue0040s02/get-data |
| 6.1 | 檢查與檢驗 | 檢查檢驗結果 | labdata | /imu/api/imue0060/imue0060s02/get-data |
| 6.1 | 檢查與檢驗 | 檢查檢驗結果-圖形化查詢 | labdraw | /imu/api/imue0060/imue0060s03/get-data |
| 6.2 | 檢查與檢驗 | 影像及病理 | imaging | /imu/api/imue0130/imue0130s02/get-data |
| 6.3 | 檢查與檢驗 | 成人預防保健 | adultHealthCheck | /imu/api/imue0140/imue0140s01/hpa-data |
| 6.4 | 檢查與檢驗 | 四癌篩檢結果 | cancerScreening | /imu/api/imue0150/imue0150s01/hpa-data |
| 6.5 | 檢查與檢驗 | 檢查檢驗紀錄 | — | — |
| 7.1 | 手術紀錄 | 手術紀錄項目 | surgery | /imu/api/imue0020/imue0020s02/get-data |
| 8.1 | 出院病摘 | 出院病歷摘要 | discharge | /imu/api/imue0070/imue0070s02/get-data |
| 9.1 | 復健醫療 | 復健醫療紀錄 | — | 目前未啟用 |
| 10.1 | 特材紀錄 | 特材紀錄 | — | — |

> *chronicMed 在授權檢查中直接加入 `authorized` 集合，繞過 Permission 節點檢查。
> 原因：Permission 只列出「有授權且有資料」的節點，但部分病患即使在 NHI 頁面可進入
> IMUE0008S05 也不會在 Permission 出現 2.3；無慢箋資料時 API 自然回空集合，無副作用。

## 特殊資料類型的設定控制

adultHealthCheck、cancerScreening、hbcvdata 可透過 `chrome.storage.sync` 設定控制是否抓取：
- `fetchAdultHealthCheck`（預設 true）
- `fetchCancerScreening`（預設 true）
- `fetchHbcvdata`（預設 true）

使用者可在 PopupSettings 中開關這些選項。

## 慢性處方箋 (chronicMed) 支援

- 端點：`/imu/api/imue0008/imue0008s05/get-data`（NHI 頁面 `IMUE0008S05`）
- 每次抓取時主動 fetch，不依賴授權節點檢查
- 該 API 回應與其他端點不同，**沒有 `rObject` 欄位**，而是回傳 `{ chrDataN: [...], chrDataY: [...] }`：
  - `chrDataN`：`overdue === "N"`（**效期內**處方箋）
  - `chrDataY`：`overdue === "Y"`（**已逾期**處方箋）
- 於 `normalizeResponseData` 中以「整包包成 `rObject: [data]`」處理；下游存取為 `window.lastInterceptedChronicMedData.rObject[0].chrDataN` / `.chrDataY`
- **已整合進「西藥」(MedicationList) 與「西藥表格」(MedicationTable)** — 處理邏輯與顯示規則請見 `src/utils/medicationProcessor.js` 內的 helper 區塊（`parseChronicMedCycles` / `mergeChronicMedIntoGroups`）以及下方「慢箋資料 schema 與 cycle 偵測規則」一節。

## 慢箋資料 schema 與 cycle 偵測規則

`chronicMed.rObject[0].chrDataN` / `chrDataY` 內每個 record 都帶 **`sort_code`** 欄位，是 NHI 沒有對外文件化但實作必須使用的關鍵欄位：

| sort_code | 含意 | 重要欄位 | 出現於 NHI 頁面 |
|---|---|---|---|
| `1` | 原處方 visit 事件 | `treat_t`（就診時間）；`func_seq_no=4 位數`；`hosp_id` 是開立醫院 | 就醫資料 |
| `2` | 慢箋註記（metadata） | `chr_days`（慢箋總處方日份）；`rel_date ≈ func_date` | 「慢箋總處方日份」欄 |
| `3` | 續領紀錄 | `chr_num`（連續處方可調劑次數）；`func_seq_no=IC02/IC03/...`（本次調劑序號）；`rel_date` 是實際領藥日；`hosp_abbr` 是領藥**藥局**（非開立醫院） | 「慢性病連續處方箋領藥日」、「本次調劑序號」欄 |

**NHI 官方定義**（取自 IMUE0008S05 頁面說明）：
> 同醫事機構、同就醫序號及同就醫日期之慢性病連續處方箋用藥品項視為同一張慢性病連續處方箋。

**Cycle key 取 `(orig_func_seq_no, func_date)` — 不含 hosp_id**

因為 `sort_code=3` (續領) 紀錄的 `hosp_id` 是「領藥藥局」而非開立醫事機構，加入 `hosp_id` 會把原處方端（sort=1/2）與藥局端（sort=3）切成兩個假 cycle。實務上 `orig_func_seq_no + func_date` 已足夠識別一張慢箋（同位病患同天不太可能在兩家醫院都拿到同一個 4 位數就醫序號）。

**`M`（連續處方可調劑次數）推導順序**：

1. 任一 `sort_code=3` 紀錄的 `chr_num` 欄
2. 任一紀錄的 `chr_days` 欄 ÷ `order_drug_day`（**注意：實際資料中 `chr_days` 可能出現在 sort=2 或 sort=3，不只 sort=2**；不同 patient 資料格式不一致）
3. 都拿不到 → 進入「效期內判定」分支

**「效期內」分支**（M 拿不到時的處理）：

- `records[0].overdue === "N"`（即在 `chrDataN` 分區）→ emit pickup，`chronicTotal=null`，UI 顯示紅色 `[慢箋:效期內]` Chip 表示「已開立慢箋但尚未進入續領週期」
- `records[0].overdue === "Y"`（在 `chrDataY` 但無 metadata，例如只領一次後就改回診）→ **整 cycle 跳過**，**不掛任何標記**

**`N`（本次第幾次調劑）推導**：

- `sort_code=1` → N = 1（原處方）
- `sort_code=3` → 由 `func_seq_no` 字串解析（`IC02` → 2、`IC03` → 3）
- `sort_code=2` → 純 metadata，**不產生 pickup**

**合併進 medication 顯示的規則**（`mergeChronicMedIntoGroups`）：

- 原處方 pickup (`sort_code=1`) → 先在已分群的 medication.rObject 中尋找 `(date, hosp_abbr, drugcode)` 相同的紀錄；命中則掛 `chronicSeq`/`chronicTotal`，**不重複新增列**；未命中則合成 drug 紀錄放進醫院的「門診」visit group
- 續領 pickup (`sort_code=3`) → medication.rObject 沒有藥局領藥紀錄，必然合成；放進「藥局」visit group 並標 `isChronicSynthesized=true`（此 group 的 header 會渲染 `[慢箋續領]` Chip）

**UI 渲染**（皆使用 MUI Chip）：

| 條件 | 顯示 | Chip 顏色 |
|---|---|---|
| `chronicTotal != null` | `慢箋:N/M` | `secondary`（紫色） |
| `chronicTotal == null` | `慢箋:效期內` | `error`（紅色） |
| Group 內所有 drug `isChronicSynthesized` | header 加 `慢箋續領` | `secondary`（紫色） |
