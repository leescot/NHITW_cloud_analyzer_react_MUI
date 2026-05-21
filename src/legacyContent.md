這個程式的執行流程主要分為三個關鍵部分：用戶識別(UserID)取得、授權令牌(Token)獲取和資料擷取。

## 用戶識別(UserID)流程

1. 從`initialize()`開始，調用`checkAndInitUserSession()`
2. `extractUserInfo()`會嘗試多種方式獲取用戶ID:
   - 從JWT令牌解析UserID (優先)
   - 從URL參數提取patientId
   - 從DOM元素獲取病患資訊
   - 最後使用時間戳作為備用

識別格式會以`patient_{ID}`、`token_{prefix}`、`dom_{text}`或`session_{timestamp}`存儲。

**更新**: 新增使用者資訊快取機制，設定5秒內不重複提取令牌，減少系統負擔。

## 授權令牌(Token)獲取流程

1. `captureXhrRequestHeaders()`監聽所有XHR請求頭，捕獲Authorization頭部
2. `extractAuthorizationToken()`嘗試多種方式獲取令牌:
   - 使用已捕獲的請求頭中的Authorization (優先)
   - 從sessionStorage獲取(健保系統實際使用方式)
   - 從頁面script標籤中查找
   - 從localStorage獲取(最後嘗試)
3. `validateToken()`驗證JWT令牌有效性
4. `saveToken()`儲存令牌並通知背景腳本

## 資料擷取流程

1. `setupMonitoring()`設置XHR和fetch監聽，劫持網路請求
2. 檢測符合特定API路徑的請求(藥歷、檢驗資料、中醫用藥等多種類型)
3. `fetchAllDataTypes()`同時啟動所有資料類型的抓取:
   - 先獲取主選單(masterMenu)資料來判斷使用者有權限的資料類型
   - 過濾並只獲取有授權的資料類型
   - 使用`Promise.all`併發請求所有資料
   - 每種類型透過`enhancedFetchData()`單獨獲取
4. `enhancedFetchData()`處理單一資料類型:
   - 構建API URL
   - 添加授權令牌和必要請求頭
   - 發送請求並處理返回資料
   - 實作重試機制
5. `saveData()`保存獲取到的資料:
   - 更新全局變數(如`lastInterceptedMedicationData`)
   - 發送資料給background script儲存

**更新**: 新增去抖動機制，確保短時間內不重複清除資料(2秒冷卻時間)。

## Master Menu 節點對應表

masterMenu API 回傳的節點ID對應到健保雲端系統的各個頁面和資料類型：

| 節點ID | 群組 | 名稱 | 對應資料類型 | API 端點 |
|--------|------|------|------------|---------|
| 1.1 | 摘要 | 病人資訊 | patientSummary | /imu/api/imue2000/imue2000s01/get-summary |
| 1.2 | 摘要 | B、C型肝炎專區 | hbcvdata | /imu/api/imue0180/imue0180s01/hbcv-data |
| 1.3 | 摘要 | 特殊給付限制 | - | - |
| 2.1 | 西醫用藥 | 用藥紀錄 | medication | /imu/api/imue0008/imue0008s02/get-data |
| 2.2 | 西醫用藥 | 特定管制用藥 | - | - |
| 2.3 | 西醫用藥 | 慢性處方箋 | chronicMed* | /imu/api/imue0008/imue0008s05/get-data |
| 2.4 | 西醫用藥 | 門診藥品餘藥日數 | medDays | /imu/api/imue0120/imue0120s01/pres-med-day |

> *chronicMed 在 `isDataTypeAuthorized` 中直接 `return true`，繞過 masterMenu 的 `prsnAuth` 檢查。
> 原因：`prsnAuth` 只列出「有授權且有資料」的節點，但部分病患即使在 NHI 頁面可進入
> `IMUE0008S05` 也不會在 `prsnAuth` 出現 `2.3`；無慢箋資料時 API 自然回空集合，
> 無副作用。
| 3.1 | 中醫醫療 | 用藥紀錄 | chinesemed | /imu/api/imue0090/imue0090s02/get-data |
| 3.2 | 中醫醫療 | 針傷治療 | acupuncture | /imu/api/imue0160/imue0160s02/get-data |
| 3.3 | 中醫醫療 | 特定疾病門診加強照護 | specialChineseMedCare | /imu/api/imue0170/imue0170s02/get-data |
| 4.1 | 牙科處置紀錄 | 牙科處置紀錄項目 | - | - |
| 5.1 | 過敏紀錄 | 過敏紀錄 | allergy | /imu/api/imue0040/imue0040s02/get-data |
| 6.1 | 檢查與檢驗 | 檢查檢驗結果 | labdata | /imu/api/imue0060/imue0060s02/get-data |
| 6.1 | 檢查與檢驗 | 檢查檢驗結果-圖形化查詢 | labdraw | /imu/api/imue0060/imue0060s03/get-data |
| 6.2 | 檢查與檢驗 | 影像及病理 | imaging | /imu/api/imue0130/imue0130s02/get-data |
| 6.3 | 檢查與檢驗 | 成人預防保健 | adultHealthCheck | /imu/api/imue0140/imue0140s01/hpa-data |
| 6.4 | 檢查與檢驗 | 四癌篩檢結果 | cancerScreening | /imu/api/imue0150/imue0150s01/hpa-data |
| 6.5 | 檢查與檢驗 | 檢查檢驗紀錄 | - | - |
| 7.1 | 手術紀錄 | 手術紀錄項目 | surgery | /imu/api/imue0020/imue0020s02/get-data |
| 8.1 | 出院病摘 | 出院病歷摘要 | discharge | /imu/api/imue0070/imue0070s02/get-data |
| 9.1 | 復健醫療 | 復健醫療紀錄 | rehabilitation | /imu/api/imue0080/imue0080s02/get-data |
| 10.1 | 特材紀錄 | 特材紀錄 | - | - |

masterMenu API 回傳的 "prsnAuth" 陣列包含目前使用者有權限存取且有資料的節點。只有在該陣列中的節點才應該被抓取。

## 資料抓取流程與權限檢查

抓取資料時的處理流程：

1. 首先抓取 masterMenu 資料 (/imu/api/imue1000/imue1000s02/master-menu)
2. 從 masterMenu 的 prsnAuth 陣列中檢查使用者有權限存取的節點
3. 只針對有授權的節點發送資料請求，未授權的節點則傳回空集合
4. 若 masterMenu 抓取失敗，則預設嘗試抓取所有資料類型

此方式能大幅減少不必要的API請求，提高應用效能。

## 新增功能與改進

1. **擴充資料類型**：新增對復健治療(rehabilitation)、針灸治療(acupuncture)和特殊中醫處置(specialChineseMedCare)的支援。

2. **批次資料抓取控制**：
   - 追蹤進行中的批次抓取，避免重複請求
   - 使用 `isBatchFetchInProgress` 標記，防止短時間內重複啟動抓取

3. **資料清除優化**：
   - 避免短時間內多次清除資料(添加冷卻期)
   - 批次抓取進行中不執行清除

4. **URL變更監控**：
   - 新增 `observeUrlChanges()` 監控URL變化
   - URL變更時重置用戶資訊快取，確保頁面變更後重新提取

5. **用戶資訊快取**：
   - 添加 `cachedUserInfo` 和 `lastUserInfoExtractTime` 以減少重複提取
   - 設置 5 秒的快取期限，優化效能

6. **自動開啟控制**：
   - 支援 `autoOpenPage` 設定，自動打開浮動圖標對話框
   - 設定值儲存在 chrome.storage.sync

7. **設定變更監聽**：
   - 新增對設定變更的監聽，包括西醫用藥和中醫用藥相關設定
   - 主動觸發UI更新顯示

8. **直接下載功能**：
   - 添加 `getPatientData` 處理程序
   - 支援直接在瀏覽器下載完整病人資料

9. **開發模式**：
   - 新增 `setupDevMode()` 支援測試資料載入與清除
   - 提供便於開發測試的模式

10. **慢性處方箋 (chronicMed) 支援**：
    - 端點：`/imu/api/imue0008/imue0008s05/get-data` (NHI 頁面 `IMUE0008S05`)
    - 已加入 `fetchAllDataTypes` 常規 `dataTypes` 陣列，每次抓取時主動 fetch
    - 授權檢查：對 chronicMed 直接 `return true` 略過 masterMenu 檢查（見上方節點表格註釋）
    - 該 API 回應與其他端點不同，**沒有 `rObject` 欄位**，而是回傳 `{ chrDataN: [...], chrDataY: [...] }`：
      - `chrDataN`：`overdue === "N"`（**效期內**處方箋）
      - `chrDataY`：`overdue === "Y"`（**已逾期**處方箋）
    - 於 `enhancedFetchData` 的標準化路徑中，與 `masterMenu` 共用「整包包成 `rObject: [data]`」的處理；下游存取為 `window.lastInterceptedChronicMedData.rObject[0].chrDataN` / `.chrDataY`
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
