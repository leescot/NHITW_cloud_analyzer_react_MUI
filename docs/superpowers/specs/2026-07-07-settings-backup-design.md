# 使用者設定匯出/匯入(設定備份)— 設計

> 2026-07-07 brainstorming 定案。目標:讓使用者把全部擴充功能設定匯出成 JSON 檔、
> 並從檔案還原,用於跨瀏覽器/跨帳號轉移、重灌備份、與同事分享設定。

## 決策摘要

| 決策點 | 定案 |
|---|---|
| 匯入語意 | **全量還原**:檔案視為完整快照,檔內有的鍵覆蓋、schema 內缺的鍵重設為預設值 |
| 匯出範圍 | **settingsSchema 全部 52 個 `chrome.storage.sync` 鍵**(含 cloud 抓取開關);`developerMode`/`devFetchAll` 屬 `storage.local` 開發旗標,一律不進匯出檔 |
| UI 落點 | popup **設定 tab 尾端**(`<AdvancedSettings />` 之後)獨立「設定備份」區塊 |
| 檔案格式 | **扁平 storageKey**(與 `chrome.storage.sync` 真相零轉換),信封含 format/version/exportedAt |
| 相容策略 | **加鍵不 bump version**;version 只在信封結構破壞性改變時才升(見「版本與相容」) |

## 匯出檔格式(v1)

```json
{
  "format": "nhitw-settings",
  "version": 1,
  "exportedAt": "2026-07-07T14:30:00.000Z",
  "settings": {
    "simplifyMedicineName": true,
    "enableATC5Colors": true,
    "atc5Groups": ["..."],
    "displayLabFormat": "byType",
    "fetchAdultHealthCheck": false
  }
}
```

- `settings` 內是 `SETTINGS_SCHEMA` 的 **storageKey**(含 `enableATC5Colors` 等歷史改名鍵,
  以 storage 實際鍵名原樣進出),值為當下 `chrome.storage.sync` 的值(缺值以預設補齊)。
- 檔名:`NHITW_settings_YYYYMMDD_HHMM.json`。

## 版本與相容(向後相容是格式契約的一部分)

未來功能會持續新增設定鍵(例:規畫中的「總覽檢查使用者自訂項目」)。相容規則:

1. **新增/移除設定鍵不動 `version`。** 相容性由 schema 白名單天然保證:
   - 舊檔 → 新版:檔內缺的新鍵重設為預設(全量還原語意,本來就如此)。
   - 新檔 → 舊版:舊版 schema 不認得的鍵**忽略並記 warning**,其餘照常匯入。
2. **`version` 只在信封結構破壞性改變時 bump**(例如改動 `format`/`settings` 欄位語意)。
   匯入遇到 `version` 大於自身支援值 → 拒絕並提示「請更新擴充功能後再匯入」。
3. 未來若有 `storage.local` 的大型清單設定(CodeSet,DOC/07 方向五)要納入備份,
   以**新增頂層欄位**(如 `settingsLocal`)擴充——舊版依規則 1 忽略未知頂層欄位,不動 v1 信封。

## 架構(兩個新檔,零改既有邏輯)

### 1. `src/utils/settingsBackup.js` — 純函數層(不碰 chrome API,可單測)

- `buildSettingsExport(flatSettings, exportedAt)` → 匯出物件。
  以 `SETTINGS_SCHEMA` 白名單挑鍵;`flatSettings` 由呼叫端以
  `chrome.storage.sync.get(buildStorageDefaults())` 取得(缺值已補預設)。
- `parseSettingsImport(json)` → `{ ok: true, settings, warnings } | { ok: false, error }`
  - 驗 `format === 'nhitw-settings'`;`version` 非正整數或 > 1 → `ok: false`。
  - **全量還原**:從 `buildStorageDefaults()` 出發,檔內通過驗證的鍵覆蓋上去,
    回傳完整 52 鍵物件(呼叫端整包 `sync.set`,結果可預測、與當下狀態無關)。
  - 驗證:鍵不在 schema → 忽略 + warning(「未知設定 X 個(可能來自較新版本)」);
    型別不符(對照 `defaultValue` 的 `typeof`,陣列用 `Array.isArray`)→ 該鍵用預設 + warning。
  - warnings 為字串陣列,不阻擋匯入。

### 2. `src/components/settings/SettingsBackup.jsx` — UI 區塊

掛載:`PopupSettings.jsx` 設定 tab(index 0)內容尾端,`<AdvancedSettings />` 之後。

- **匯出設定**:`sync.get(buildStorageDefaults())` → `buildSettingsExport` →
  Blob + `URL.createObjectURL` 下載(比照 `messageHandlers.js` 下載 JSON 的既有作法)。
- **匯入設定**:隱藏 `<input type="file" accept=".json">` → `JSON.parse`(失敗 → 錯誤訊息)→
  `parseSettingsImport` → **確認 dialog**(明示「將以檔案內容完整覆蓋所有設定,
  檔內未包含的項目將重設為預設值」)→ 確認後 `chrome.storage.sync.set(settings)` →
  成功訊息(含 warnings 摘要,若有)。
- UI 樣式對齊既有 settings 區塊慣例(MUI,標題 + 兩個按鈕 + Alert 訊息)。

## 資料流與刷新

匯入 `sync.set` 後,既有的 `chrome.storage.onChanged` 監聽
(`PopupSettings.jsx`、`utils/settingsManager.js`、`App.jsx`)自動刷新 popup 與頁面內 UI,
**不新增任何通知機制**。

## 錯誤處理

| 情況 | 行為 |
|---|---|
| JSON parse 失敗 / `format` 不符 / `version` 過新 | 顯示錯誤,**一個鍵都不寫入** |
| 未知鍵 / 型別不符 | 忽略該鍵(型別不符者回預設),warning 計數顯示,不阻擋 |
| `chrome.storage.sync.set` 失敗(quota 等) | 顯示錯誤訊息(runtime.lastError) |

## 測試(vitest,針對純函數層)

- 匯出:含全部 52 鍵、白名單外的輸入鍵不外洩、信封欄位齊全。
- round-trip:export → parseSettingsImport 還原出相同 settings(恆等)。
- 相容:未知鍵忽略 + warning;缺鍵回預設;型別不符回預設 + warning;
  `version: 2` 拒絕;`format` 錯拒絕;非物件輸入拒絕。
- 歷史改名鍵(`enableATC5Colors`/`atc5Groups`/`chineseMedCopyFormat` 等)以 storageKey 原樣進出。
- UI 元件不做自動化測試(popup 元件無既有測試慣例);實機驗證代替。

## 明確不做(YAGNI)

- 部分合併匯入模式(分享部分設定屬 DOC/07 方向五 CodeSet 的範圍)。
- 跨版本 migration 邏輯(`version` 欄位是未來 hook,現在只有拒絕過新)。
- 匯出至剪貼簿、雲端同步以外的自動備份排程。
- `storage.local` 開發旗標的備份。
