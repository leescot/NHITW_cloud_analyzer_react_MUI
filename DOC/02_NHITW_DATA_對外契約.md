# NHITW_DATA 對外契約

> 給下游 chrome extension 開發者:如何從本擴充功能讀取已抓取的健保雲端資料。
> 以 `src/store/nhitwExport.js` 原始碼為準,任何與程式碼不一致之處以程式碼為準。

## 這是什麼

本擴充功能(NHITW_cloud_analyzer)在 `medcloud2.nhi.gov.tw` 頁面主動抓取健保雲端 API 資料後,除了寫入自己的 `dataStore` 供內部 UI 使用外,還會把同一份原始資料以統一格式寫進**該頁面的 page `localStorage`**(`window.localStorage`,同源、isolated world 內可見),讓同一頁面上安裝的**其他** chrome extension 可以讀取,不需要重複實作抓取邏輯。這是目前唯一的跨擴充功能資料交換管道。

**這是一份對外契約:變更 key 名稱或既有 key 的語意前,必須同步調整所有消費端 extension。**

## 儲存位置與寫入方式

- **localStorage key**:`NHITW_DATA`
- **寫入函數**:`writeShareDataToLocalStorage(shareData)`(`src/store/nhitwExport.js`)
  ```js
  localStorage.setItem('NHITW_DATA', JSON.stringify(shareData));
  window.dispatchEvent(new Event('storage'));
  ```
- 寫入失敗時只 `console.error`,不拋出、不中斷主流程(對齊「分享失敗不可影響核心功能」的既有行為)。

## 完整格式

`buildShareData(timestamp = Date.now())` 回傳的物件依序含 16 個 key(**timestamp 必為第一個 key**):

| # | key | 型別/來源 | 說明 |
|---|---|---|---|
| 1 | `timestamp` | `number` | `Date.now()`,呼叫 `buildShareData` 當下的毫秒時間戳,**永遠是第一個 key** |
| 2 | `medication` | `dataStore.getData('medication')` | 西藥,原始正規化回應 `{ rObject: [...] }` |
| 3 | `lab` | `dataStore.getData('labdata')` | 檢驗,對外改名為 `lab`(內部 store key 是 `labdata`) |
| 4 | `labdraw` | `dataStore.getData('labdraw')` | 檢驗圖形化查詢資料 |
| 5 | `chinesemed` | `dataStore.getData('chinesemed')` | 中藥 |
| 6 | `imaging` | `dataStore.getData('imaging')` | 影像及病理 |
| 7 | `allergy` | `dataStore.getData('allergy')` | 過敏紀錄 |
| 8 | `surgery` | `dataStore.getData('surgery')` | 手術紀錄 |
| 9 | `discharge` | `dataStore.getData('discharge')` | 出院病摘 |
| 10 | `medDays` | `dataStore.getData('medDays')` | 門診藥品餘藥日數 |
| 11 | `patientSummary` | `dataStore.getData('patientsummary')` | **駝峰命名**(對外 `patientSummary`,內部 store key 是全小寫 `patientsummary`) |
| 12 | `masterMenu` | `dataStore.getData('masterMenu')` | 目前抓取流程未主動寫入此型別(見下方「已知落差」) |
| 13 | `adultHealthCheck` | `dataStore.getData('adultHealthCheck')` | 成人預防保健 |
| 14 | `cancerScreening` | `dataStore.getData('cancerScreening')` | 四癌篩檢 |
| 15 | `hbcvdata` | `dataStore.getData('hbcvdata')` | B、C 型肝炎專區 |
| 16 | `chronicMed` | `dataStore.getData('chronicMed')` | 慢性處方箋,原始 schema `{ rObject: [{ chrDataN, chrDataY }] }`(非一般型別的 `rObject` 陣列;細節見 `src/apiInterceptor/README.md`) |

### 內容規則

- 每個資料型別 key 的值,就是 `dataStore` 內對應型別的**原始正規化 API 回應**(`{ rObject: [...] }` 形狀,由 `apiInterceptor/responseNormalizer.js` 正規化;非 processor 加工後的 UI 結構)。消費端要自己解析 `rObject`,不能假設拿到的是渲染用的分組結構。
- **未載入(尚未抓取或已被清空)的型別,值為 `null`**(對齊 `dataStore.clearAll()`/初始狀態,型別未寫入即回傳 `null`)。消費端讀取前務必做 null 檢查。
- 病患切換或頁面重新抓取後,`NHITW_DATA` 會被整包覆寫(非合併),消費端每次讀取都應視為「當下病患的完整快照」。

## 合成 storage 事件機制

`localStorage.setItem` 之後緊接著 `window.dispatchEvent(new Event('storage'))`。

- 原生瀏覽器 `storage` 事件**只會**在「其他 tab/window 修改了同源 localStorage」時觸發,同一個 window 內呼叫 `setItem` 不會讓自己收到原生 `storage` 事件。因此這裡手動 `dispatchEvent` 一個同名的合成事件,讓**同一頁面**(isolated world 內,包含其他已注入該頁的 content script)可以用標準 `window.addEventListener('storage', ...)` 監聽到「資料已更新」。
- **這個合成事件沒有 payload**(標準 `StorageEvent` 才有 `key`/`newValue` 等欄位,`new Event('storage')` 只是普通 Event)。消費端收到通知後,要自己 `localStorage.getItem('NHITW_DATA')` 再 `JSON.parse`,不能依賴事件物件帶資料。
- **無 replay 語意**:此事件只在寫入當下觸發一次。若消費端的 content script 是在寫入之後才注入/才掛上 listener,會錯過這次通知,必須自己在初始化時主動讀一次 `localStorage.getItem('NHITW_DATA')` 做冷啟動讀取,不能只靠監聽事件。

## 寫入時機

`writeShareDataToLocalStorage(buildShareData())` 目前有**兩條呼叫路徑**,行為與格式完全一致:

1. **主動批次抓取完成後**:`src/apiInterceptor/index.js#fetchAllDataTypes` 內,`Promise.all([...regularPromises, ...specialPromises])` 全部完成(不論個別型別成功/授權不足/發生錯誤,都會有對應的 `createEmptyDataResult` 佔位)之後呼叫 `saveToLocalStorage()`。
2. **本地 JSON 匯入完成後**:`src/localDataHandler.js` 的 `processLocalData` 把上傳 JSON 內各型別資料寫入 `dataStore` 後,同樣觸發寫出(與抓取路徑共用 `dataStore` → `nhitwExport` 這條寫入管線,兩種來源的 `NHITW_DATA` 格式完全相同)。

病患切換或清除資料(`dataStore.clearAll()`)當下**不會**立即重寫 `NHITW_DATA`(舊資料可能短暫殘留在 localStorage,直到下一次成功抓取/匯入完成才覆寫)——消費端若需要嚴格對應「當前頁面病患」,應自行比對 `patientSummary` 或其他可識別欄位,不要只信任「有值就是最新」。

## 變更政策

- **禁止**在不通知消費端的情況下改變 key 名稱、`timestamp` 的位置語意、或既有型別「未載入 = `null`」的約定。
- 新增資料型別時(見 `03_開發與維護指南.md` 的「新增資料型別」清單),同步在 `buildShareData` 加一個 key,並更新本文件的表格。
- 若必須做 breaking change(例如整批改名),應在 commit message 與(若有)CHANGELOG 中明確標註,並考慮短期內新舊 key 併存的過渡期。
