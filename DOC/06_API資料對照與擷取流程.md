> 本文件記錄 apiInterceptor 的執行流程與慢箋資料 schema;檔案原名 legacyContent.md。

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
   - 寫入 `dataStore`（src/store/dataStore.js,單一真實來源,供 React UI 讀取）
   - 所有資料抓完後統一寫入 `localStorage('NHITW_DATA')`（跨擴充功能共享）
   - 透過 `chrome.runtime.sendMessage({ action: 'setBadge' })` 通知 background 設定 badge

## 下載 JSON 資料檔(與 NHITW_DATA 的差異)

擴充功能有兩個格式、用途都不同的 JSON 輸出,容易混淆:

| | NHITW_DATA | 下載 JSON 資料檔 |
|---|---|---|
| 產生時機 | 每次抓取/匯入完成後自動寫入 | 使用者按「下載 JSON 資料檔」按鈕才產生 |
| 儲存位置 | `localStorage`(供同頁面其他 extension 讀取) | 使用者本機檔案(下載 `.json`) |
| 產生程式 | `buildShareData()`(`src/store/nhitwExport.js`) | `getPatientData` handler(`src/apiInterceptor/messageHandlers.js`) |
| 讀回程式 | 無(本擴充功能不會讀回自己寫的 NHITW_DATA,純粹給其他 extension 讀) | `processLocalData()`(`src/localDataHandler.js`,「匯入本地 JSON」功能) |
| 文件 | `02_NHITW_DATA_對外契約.md`(17 個 key,凍結前) | 本節 |

兩者都以 `dataStore` 為讀取來源,但頂層結構、key 命名規則不同,**不可互換或假設格式相容**。

### 下載 JSON 頂層欄位

`chrome.runtime.onMessage` 的 `"getPatientData"` action 組出以下結構,`JSON.stringify(patientData, null, 2)` 後觸發瀏覽器下載,檔名 `<yyyyMMdd_HHmm>_<遮罩身分證號>.json`(僅檔名遮罩身分證號,**JSON 內容本身仍含完整 PII**):

| 欄位 | 型別/來源 | 說明 |
|---|---|---|
| `UserName` / `UserID` / `UserSex` / `UserBirthday` | JWT payload | 病患基本資料 |
| `ClientTime` | `new Date().toISOString()` | **下載當下**的時間,不是抓取時間 |
| 各資料型別 key | `dataStore.getData(dataType)` | 見下段,共 25 個(14 核心 + 11 開發者補抓) |
| `masterMenu` | `dataStore.getData('masterMenu')` | 抓取流程從不寫入(該情境下為 `null`);本地匯入路徑 2026-07-07 起可寫入,匯入後再下載會帶出非 `null` 值(詳見 `02_NHITW_DATA_對外契約.md` masterMenu 列) |
| `permission` | `{ nodes, dataTypes }` | 優先取抓取時寫入 `dataStore` 的授權清單;只下載、未重抓過(值為 `null`)時由目前 JWT 現場派生,確保下載檔一定有值 |

資料型別 key 來自 `API_PATH_MAP`(`src/dataTypes/registry.js` 的 `CORE_API_ENTRIES` + `DEV_API_ENTRIES`,即 14 核心型別 + 11 開發者補抓型別)的全部 key,逐一經 `CORE_EXPORT_KEY.get(dataType) ?? dataType` 轉換對外名稱——只有核心型別的 `labdata`/`patientsummary` 有別名(輸出 `lab`/`patientSummary`,與 NHITW_DATA 相同),其餘型別(含全部開發者補抓型別)key 與內部 store key 同名。未授權或未抓取的型別,值為 `null`(與 NHITW_DATA 相同的「未載入 = `null`」約定)。

開發者補抓型別 key:`specialPayment`、`controlledMed`、`controlledMedSummary`、`acupuncture`、`chineseMedCare`、`chineseMedCareSummary`、`dental`、`labRecord`、`rehabilitation`、`rehabilitationSummary`、`specialMaterial`。只有「開發者完整抓取模式」(`devFetchAll`)開啟且該節點有授權時才會抓到實際資料,否則 key 仍存在但值為 `null`。

只有 `dataStore` 內任一型別有實際資料(`rObject` 為非空陣列)時才會觸發下載;`permission` 本身不影響此判斷,避免「只有授權清單、沒有醫療資料」時仍誤觸發下載。

### 匯入本地 JSON 讀回(`LOCAL_KEY_TO_STORE_TYPE`)

「匯入本地 JSON」由 `processLocalData()` 依 `src/localDataHandler.js` 的 `LOCAL_KEY_TO_STORE_TYPE` 對照表,逐一把下載 JSON 的頂層 key 寫回對應的 `dataStore` 型別:

- 核心型別由描述檔衍生(`CORE_DATA_TYPES` 的 `exportKey ?? key`),即 `lab`→`labdata`、`patientSummary`→`patientsummary`,其餘核心型別 key 原樣對應
- `masterMenu`、`permission` 為手寫條目
- 開發者補抓型別一律 `[key, key]`

### 2026-07-07 round-trip 修復(commit `55af520`)

修復前:`getPatientData` 只把 `labdata` 別名為 `lab`,病摘輸出的 key 是小寫 `patientsummary`;但 `LOCAL_KEY_TO_STORE_TYPE` 只認駝峰 `patientSummary`,且無 `masterMenu` 條目。結果:用舊版擴充功能下載的 JSON 重新匯入時,「病摘」與「masterMenu」會被靜默丟棄(不報錯,資料就是消失)。

修復後:

- 下載鍵改由 `CORE_EXPORT_KEY`(`src/dataTypes/registry.js`)衍生,病摘下載鍵改為駝峰 `patientSummary`,與 NHITW_DATA 一致
- `LOCAL_KEY_TO_STORE_TYPE` 補上小寫 `patientsummary` 相容 alias(讀舊檔用)與 `masterMenu` 條目
- 新舊下載檔皆可完整 round-trip:新檔(`patientSummary`)靠對照表新條目讀回,舊檔(2026-07 前下載,小寫 `patientsummary`)靠新增的相容 alias 讀回,不受影響

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
| 1.3 | 摘要 | 特殊給付限制 | —(未介接) | /imu/api/imue0190/imue0190s01/lftp-data |
| 2.1 | 西醫用藥 | 用藥紀錄 | medication | /imu/api/imue0008/imue0008s02/get-data |
| 2.2 | 西醫用藥 | 特定管制用藥(關懷名單) | —(未介接) | /imu/api/imue0009/imue0009s02/get-data |
| 2.3 | 西醫用藥 | 慢性處方箋 | chronicMed* | /imu/api/imue0008/imue0008s05/get-data |
| 2.4 | 西醫用藥 | 門診藥品餘藥日數 | medDays | /imu/api/imue0120/imue0120s01/pres-med-day |
| 3.1 | 中醫醫療 | 用藥紀錄 | chinesemed | /imu/api/imue0090/imue0090s02/get-data |
| 3.2 | 中醫醫療 | 針傷治療 | —(未介接) | /imu/api/imue0160/imue0160s02/get-data |
| 3.3 | 中醫醫療 | 特定疾病門診加強照護 | —(未介接) | /imu/api/imue0170/imue0170s02/get-data |
| 4.1 | 牙科處置紀錄 | 牙科處置紀錄項目 | —(未介接) | /imu/api/imue0030/imue0030s02/get-data |
| 5.1 | 過敏紀錄 | 過敏紀錄 | allergy | /imu/api/imue0040/imue0040s02/get-data |
| 6.1 | 檢查與檢驗 | 檢查檢驗結果 | labdata | /imu/api/imue0060/imue0060s02/get-data |
| 6.1 | 檢查與檢驗 | 檢查檢驗結果-圖形化查詢 | labdraw | /imu/api/imue0060/imue0060s03/get-data |
| 6.2 | 檢查與檢驗 | 影像及病理 | imaging | /imu/api/imue0130/imue0130s02/get-data |
| 6.3 | 檢查與檢驗 | 成人預防保健 | adultHealthCheck | /imu/api/imue0140/imue0140s01/hpa-data |
| 6.4 | 檢查與檢驗 | 四癌篩檢結果 | cancerScreening | /imu/api/imue0150/imue0150s01/hpa-data |
| 6.5 | 檢查與檢驗 | 檢查檢驗紀錄 | —(未介接) | /imu/api/imue0010/imue0010s02/get-data |
| 7.1 | 手術紀錄 | 手術紀錄項目 | surgery | /imu/api/imue0020/imue0020s02/get-data |
| 8.1 | 出院病摘 | 出院病歷摘要 | discharge | /imu/api/imue0070/imue0070s02/get-data |
| 9.1 | 復健醫療 | 復健醫療紀錄 | —(未介接) | /imu/api/imue0080/imue0080s02/get-data |
| 10.1 | 特材紀錄 | 特材紀錄 | —(未介接) | /imu/api/imue0200/imue0200s02/get-data |
| —** | 西醫用藥 | 特定凝血因子用藥 | —(未介接) | /imu/api/imue0050/imue0050s02/get-data |

> *chronicMed 在授權檢查中直接加入 `authorized` 集合，繞過 Permission 節點檢查。
> 原因：Permission 只列出「有授權且有資料」的節點，但部分病患即使在 NHI 頁面可進入
> IMUE0008S05 也不會在 Permission 出現 2.3；無慢箋資料時 API 自然回空集合，無副作用。
>
> **「特定凝血因子用藥」是西醫用藥群組下的獨立頁籤（IMUE0050），但 masterMenu 的節點清單
> （1.1–10.1 共 21 個）沒有對應的獨立節點 ID，推測附屬於 2.2 或 2.1 授權。

## 未介接頁籤的 API 端點細節（2026-07 展示版實測）

以下資料以「健保雲端系統2.0展示版」（模擬資料，全節點授權）逐頁點擊、由 DevTools network 實測取得。
所有 `get-data` 類端點與既有 14 型別相同，接受 `cli_datetime`、`insert_log` query 參數，
回應為 `{ log2time, robject }`（**原始 JSON 鍵是小寫 `robject`**——既有 14 型別的原始回應同樣是小寫，
`responseNormalizer.js` 以 `data.rObject || data.robject` 相容處理後統一輸出大寫 `rObject`）。

### 頁面代號對照（URL: /imu/IMUE1000/<頁面代號>）

| 頁面代號 | 頁籤 | 主資料端點 |
|---|---|---|
| IMUE0190 | 摘要\特殊給付限制 | imue0190s01/lftp-data |
| IMUE0009 | 西醫用藥\特定管制用藥(關懷名單) | imue0009s02/get-data |
| IMUE0050 | 西醫用藥\特定凝血因子用藥 | imue0050s02/get-data |
| IMUE0160 | 中醫醫療\針傷治療 | imue0160s02/get-data |
| IMUE0170 | 中醫醫療\特定疾病門診加強照護 | imue0170s02/get-data |
| IMUE0030 | 牙科處置紀錄 | imue0030s02/get-data |
| IMUE0010 | 檢查與檢驗\檢查檢驗紀錄 | imue0010s02/get-data |
| IMUE0080 | 復健醫療 | imue0080s02/get-data |
| IMUE0200 | 特材紀錄 | imue0200s02/get-data |

### 各端點回應結構與觀察欄位（附網站對應中文標頭）

以下每個端點列出 JSON 欄位 → 網站頁面表格上對應的中文標頭。標頭以展示版實測擷取；
標「（推測）」者為該欄位在展示資料的預設檢視中無資料列可對照、由既有頁面同名欄位或語意推得。
每個端點的實測 sample record 存於 `.test_data/` 下同名 JSON（含模擬病患資料，已 gitignore 不進版控，僅供本機欄位對照參考）。

共通欄位語意（多數 get-data 端點皆有）：
- `hosp` / `hosp_id` / `hosp_abbr` → **來源**（頁面「來源」欄合併顯示「院所簡稱＋門診/住診＋院所代碼」；`hosp` 原始值以 `;` 分隔如 `臺北虛擬診;門診;3501200000`）
- `icd_code` + `icd_cname` → **主診斷**（標頭同格顯示中文診斷名＋ICD 代碼）
- `fee_ym` → **費用年月**；`func_date` → **就醫日期**
- `order_qty` → **醫令總量／數量**；`r` → 前端列序（rownum，非病患資料，無標頭）

各端點特有欄位：

- **1.3 特殊給付限制** `imue0190s01/lftp-data`：`robject` **不是陣列**而是物件
  `{ medical_service: [], drugs: [], special_material: [] }`（頁面分三張表：醫療服務／藥品／特殊材料，
  三分區共用同一組欄位）。若要介接需走類似 `recordAsSingle` 的正規化（整包包成一元素），不能當一般列陣列。
  欄位對照：`data_type`→分區別（1醫療服務／2藥品／3特殊材料，內部用無標頭）、`func_date`→**就醫日期**、
  來源三欄→**來源**、`icd_*`→**主診斷**、`order_code`→**醫令代碼／藥品代碼／特材代碼**、
  `cure_cname`→**醫令名稱／藥品名稱／特材名稱**、`order_qty`→**藥品用量**（藥品分區）、
  `order_drug_day`→**給藥日數**（藥品分區）、`pdt_model`→**產品型號/規格**（特材分區）、
  `cure_path`+`cure_path_name`→**診療部位**（特材分區）、`data_source`→**資料來源**、`drug_atc7_code`→無標頭。
- **2.2 特定管制用藥** 頁面同時有「彙總」與「明細」兩張表：
  - `imue0009s02/get-data`（**明細**）：`treat_d`→**就醫日期**、`treat_t`→**就醫時間**、
    `drug_rel_code_ename`+`drug_ing_code`→**成分名稱(成分代碼)**、來源→**來源**、`drug_qty`→**總劑量(mg)**、
    `drug_ddd_qty`→**總DDD數**、`memo`→**備註**、`fee_ym`→就醫年月（明細表未顯）。
  - `imue0009s03/get-data`（**彙總**，無 query 參數）：回應是**裸陣列**（無 `robject` 包裝）。
    `drug_rel_code_ename`+`drug_ing_code`→**成分名稱(成分代碼)**、`fee_ym`→**就醫年月**、`hosp_times`→**就醫次數**、
    `hosp_units`→**就醫院所數**、`drug_qty`→**總劑量(mg)**、`drug_ddd_qty`→**總DDD數**、`code_cname`→**備註**。
- **特定凝血因子用藥** `imue0050s02/get-data`（明細；展示版預設日期範圍內無資料列，以下標頭為推測）：
  `drug_atc3_name`→**ATC3名稱**、`drug_atc5_code`→**ATC5代碼**、`drug_atc5_name`→**ATC5名稱**、
  `drug_ing_code`+`drug_ing_name`→**成分名稱(成分代碼)**、`drug_code`→**藥品代碼**、`drug_ename`→**藥品名稱**、
  `drug_date`→**就醫/調劑日期**、`cure_e_date`→**用藥迄日**、`drug_std_qty`→**藥品規格量**、`drug_fre`→**用法用量**、
  `day`→**給藥日數**、`order_qty`→**藥品用量**、`func_seq_no`→**就醫序號**、`chr_hosp_id`+`chr_hosp_abbr`→慢箋原處方機構、
  `icd_*`→**主診斷**、`fee_ym`→**費用年月**（以上多沿用「西藥/用藥紀錄」頁確認之標頭）。
  另有 `imue0050s03/get-data?txt_functype=0` 與 `imue0050s03/get-sum-dot?txt_functype=0`（彙總／點數合計）。
- **3.2 針傷治療** `imue0160s02/get-data`：`func_date`→**就醫日期**、來源→**來源**、`icd_*`→**主診斷**、
  `order_code`→**醫令代碼**、`cure_cname`→**醫令項目**、`diagtreat`→**診療項目**、`diagtreat_code`→診療代碼（未顯）、
  `fee_ym`→**費用年月**。
- **3.3 特定疾病門診加強照護** `imue0170s02/get-data`：欄位同 3.2，另加 `case_date`→**收案日期**、
  `close_date`→**結案日期**、`close_rsn_cname`→**結案原因**。
  另有 `imue0170s03/get-data`（裸陣列，展示資料為空）。
- **4.1 牙科處置** `imue0030s02/get-data`：來源→**來源**、`icd_*`→**主診斷**、`order_code`→**醫令代碼**、
  `order_ename`→**醫令名稱**、`cure_path`+`cure_path_name`→**診療部位**、`exe_s_date`→**執行時間-起**、
  `exe_e_date`→**執行時間-迄**、`order_qty`→**醫令總量**、`fee_ym`→費用年月、
  影像相關欄（`ctmri_mark`/`read_pos`/`ipl_case_seq_no`/`file_type`/`file_qty`/`ord_mark`）→**影像查詢／影像品質通報**兩欄。
- **6.5 檢查檢驗紀錄** `imue0010s02/get-data`：來源→**來源**、`fee_ym`→**費用年月**、
  `func_type`+`func_type_name`→**就醫科別**、`icd_*`→**主診斷**、`exam_type`→**檢查項目**、`order_code`→**醫令代碼**、
  `order_ename`→**醫令名稱**、`cure_path`→**診療部位**、`exe_s_date`→**執行時間-起**、`exe_e_date`→**執行時間-迄**、
  `order_qty`→**醫令總量**、`func_date`→**就醫日期**、`child_birthday`+`child_mark`→**新生兒依附註記**。
  （與 6.1「檢查檢驗結果」不同：6.5 是「醫令開立紀錄」清單，無檢驗數值。）
- **9.1 復健醫療** 頁面有「彙總」與「明細」兩張表：
  - `imue0080s02/get-data`（**明細**）：`func_date`→**就醫日期**、來源→**來源**、`icd_*`→**主診斷**、
    `cure_type`→**治療類別**、`cure_grade`→**強度**、`cure_path`+`cure_path_name`→**診療部位**、`order_qty`→**醫令數量**、
    `exe_s_date`→**執行日期-起**、`exe_e_date`→**執行日期-迄**、`cure_e_date`→**治療結束日期**、`fee_ym`→費用年月。
  - `imue0080s03/get-data?txt_functype=&txt_hosp=...`（**彙總**，依復健治療種類的次數統計，頁面標頭：
    **復健治療種類／執行次數／簡單／中度／中度複雜／複雜**；欄位 `type, cureType1, cureType4, cureType6, cureType7`）。
- **10.1 特材紀錄** `imue0200s02/get-data`：來源→**來源**、`icd_*`→**主診斷**、`order_code`→**特材代碼**、
  `met_c_name`+`met_e_name`→**特材名稱**、`met_type`→特材類別（未顯為標頭）、`doh_license_no`→**許可證字號**、
  `cure_path`→**診療部位**、`pdt_model`→**產品型號/規格**、`func_date`→**就醫日期**、`order_qty`→數量、
  `fee_ym`→費用年月、`data_source`→**資料來源**。

### 各頁附屬輔助端點（非病患資料，介接時可忽略）

每個頁籤載入時另會呼叫該模組的 s01 輔助端點，供篩選器下拉選單與列印欄位設定用：
`prn-cols`（列印欄位）為各頁共有；其他如 `imue0008s01` 的 `med-name`/`ing-name`/`atc3-name`、
`imue0030s01`/`imue0010s01` 的 `drug-code`、`imue0010s01` 的 `exam-type`、`imue0200s01` 的 `met-code`。
另 `imue0008s02/drug-e-notify`（用藥安全提示）於進入西醫用藥頁時呼叫。

## AI 影像報告彙整（影像及病理 IMUE0130，跨網域第三方檢視系統）

「影像及病理」頁（IMUE0130）搜尋欄旁的「AI影像報告匯整」按鈕**不是頁內 API**，而是跳轉到
一個獨立的第三方檢視系統（`lcr-tp.nhi.gov.tw`），靠短效 JWT 換取授權。與現有 14 型別的
抓取管線是完全不同的路徑，**目前擴充功能未介接、也難以直接介接**（見下方限制）。

### 觸發流程（在 IMUE0130 頁面內）

按鈕本身是無文字、只有 `title="AI影像報告匯整"` 的空 `<a href="#">`（Vue 元件，`data-v-17c53144`）。
點擊後依序：

1. `GET /imu/api/imue0130/imue0130s01/check-lung` → 回**純文字** `Y`（判斷此病患有無 AI 肺癌影像報告，`Y` 才可點）
2. `GET /imu/api/imue0130/imue0130s01/get-lung-cancer` → 回**一整條 URL 字串**（非 JSON），形如
   `https://lcr-tp.nhi.gov.tw/reports/view?token=<JWT>`
3. `window.open(url, "NHIShowLUNG")` 開新分頁載入該 URL

兩端點都吃標準授權 header（`Authorization: Bearer <sessionStorage token>`），與現有型別同一套。

### token 性質（關鍵限制）

`get-lung-cancer` 回傳 URL 內的 `token` 是**獨立簽發的 RS256 JWT**，與 medcloud session token 不同：

- `iss: https://auth.cohesion.internal/url-issuer`、`aud: viewer-app`、`typ: report-url`
- payload 帶 `pid`（病患雜湊）、`dob`（生日）、`hospId`、`prsnId`、`clientIp`
- **`exp - nbf = 60 秒**——效期僅一分鐘，且綁定 `clientIp`。此 URL 為一次性短效；過期或換裝置/IP
  開啟即被擋（實測複製 URL 到新分頁重載，直接顯示「未經授權的訪問」）。

### 第三方檢視系統（lcr-tp.nhi.gov.tw）

開啟的是獨立 React SPA（標題「影像報告摘要彙整檢視系統」，`/lung` 路由，用 cornerstone.js 顯示醫療影像）：

- 進站時從 URL query 取 `viewerToken`，解 JWT 拿 `pid`/`dob`/`exp`；之後所有 API 改用**這顆 viewerToken**
  當 `Authorization: Bearer`（不再依賴 medcloud session），收到 401 就跳 `/expired`
- API base 為其自身 origin（bundle 內 `Ta=""`，即 `https://lcr-tp.nhi.gov.tw`），主要端點：
  - `/api/digestsummary?patientId=<pid>&birthday=<dob>` — AI 彙整摘要主資料（JSON）
  - `/api/DigestSummary/hospital?hospitalId=` — 院所名稱
  - `/api/DigestSummary/key-images?patientId=&birthday=` — 關鍵影像
  - `/api/NhiPatientImage/studies/{study}/series[/{series}/images]` — 影像序列／切片清單
  - `/api/PacsViewer/GetUrl/{...}`、`/api/registration/get-target-instance` — PACS 檢視器 URL 與目標影像定位

### 對本專案的意涵

**基本上無法納入現有抓取管線**，原因：

1. 資料在 `lcr-tp.nhi.gov.tw`，非 medcloud origin，屬 `public/manifest.json` host permission 未涵蓋的網域。
2. viewerToken 效期僅 60 秒且綁 IP，無法預抓或快取。
3. 內容是 AI 影像彙整 + PACS 影像（cornerstone 醫療影像），型態與現有 14 種文字/表格資料差異大。

若要「把 AI 影像彙整摘要文字抓進來」，最小可行做法：`imaging` 抓完後若 `check-lung` 回 `Y`，
即打 `get-lung-cancer` 取 URL、解出 token，於 60 秒內以該 token 呼叫
`https://lcr-tp.nhi.gov.tw/api/digestsummary?patientId=<pid>&birthday=<dob>` 拿摘要 JSON——
但需在 `public/manifest.json` host permissions 增加 `https://lcr-tp.nhi.gov.tw/*`。

## 出院病摘全文（IMUE0070「開啟此筆病摘」→ show-xml）

出院病摘列表（`imue0070s02/get-data`，即 discharge 型別）**只含摘要欄位**；每筆右側「開啟此筆病摘」
按鈕點下去才會另外 POST 取回**該筆病摘的完整 HTML 全文**。這條 detail 端點目前擴充功能未介接。

### 觸發流程

按鈕是 `<a class="bluebtn pointer" data-id="<base>␟ShowXml">開啟此筆病摘</a>`
（`data-id` 以 **U+241F␟**（單位分隔符）把 base 與 apiName token `ShowXml` 分隔）。點擊 handler：

1. 把 `{ fileName: "<base>@<timestamp>", apiName: "imue0070" }` 寫入 `sessionStorage["ShowXml"]`
2. `window.open("/imu/IMUE1000/ShowXml", "NHIShow")` 開新分頁

`base` 實例：`1131217333355@3501200000@2EDEBACB75D9FA547F2018E13E695AF1@20250922@0`
（`@` 分隔，推測為 流水號 @ hosp_id @ 病患AES id @ 出院日期(yyyyMMdd) @ index）；
`fileName` 是 base 再接一段 client 端產生的時間戳（`@2026070516200447475` 形式）。

### ShowXml 頁面取資料

`/imu/IMUE1000/ShowXml` 載入後讀 `sessionStorage["ShowXml"]`（**讀後即清除，變回 null**），然後：

- `POST /imu/api/imue0070/imue0070s01/show-xml`
- Header：`Authorization: Bearer <sessionStorage token>`、`Content-Type: application/json`
- Body：`{ "fileName": "<fileName>" }`（實測多帶 `apiName` 也可，回應相同；只有 `fileName` 為必要）
- 回應：`{ "html": "<...整段病摘 HTML...>" }`——內容是 HL7 CDA（`xmlns:IMM="urn:hl7-org:v3"`）
  轉出的一整塊 HTML table，頁面直接 render

實測 fileName 內的 timestamp 對後端**不敏感**（用先前擷取的舊 timestamp 重打仍回 200 + 正確 html），
研判 timestamp 僅供防快取／log，實際取檔靠前面的 base。

### 對本專案的意涵

現有 `discharge` 只抓 `imue0070s02/get-data`（摘要列表）。若要納入「病摘全文」，需對每筆列表紀錄
的 `data-id`（或等價欄位）逐筆 POST `imue0070s01/show-xml` 取回 HTML——屬同 origin（medcloud），
授權沿用現有 session token，故技術上可行（不像 AI 影像那樣跨網域）。但回應是整塊 HTML 而非結構化
欄位，若要在 overlay UI 呈現需另做 HTML 淨化／樣式處理。

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
- 於 `normalizeResponseData` 中以「整包包成 `rObject: [data]`」處理；下游存取為 `dataStore.getData('chronicMed').rObject[0].chrDataN` / `.chrDataY`
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
