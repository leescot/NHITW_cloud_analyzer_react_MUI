# 設定系統(Settings)

## 單一事實來源

所有設定的預設值定義於 `src/config/defaultSettings.js`(巢狀結構,依 section 分組:
western / atc5 / chinese / lab / overview / general / cloud)。

`src/config/settingsSchema.js` 由它自動衍生,提供:

- `SETTINGS_SCHEMA`:54 個設定項的完整描述(section、巢狀鍵、storage 扁平鍵、預設值)
- `buildStorageDefaults()`:給 `chrome.storage.sync.get` 的全量扁平預設物件
- `structureFromFlat(flat)` / `sectionFromFlat(section, flat)`:扁平 → 巢狀的映射
  (`settingsManager.loadAllSettings` 與各設定變更 handler 使用)
- `storageDefaultsForSection(section)`:單一 section 的扁平預設
  (各設定 UI 元件的 `sync.get` 與 state 初始值使用)

行為由 `tests/settingsSchema.test.js` 與 `tests/settingsManager.test.js` 的
characterization 測試鎖定(52 鍵快照存於 `tests/fixtures/storageKeys.js`)。

## 新增一個設定的 SOP

1. `src/config/defaultSettings.js`:在對應 section 加一行預設值。
   storage 鍵自動與巢狀鍵同名,**勿**加入 `LEGACY_STORAGE_KEYS`。
2. 對應的設定 UI 元件:加控制項,寫入用
   `settingsHelper.handleSettingChange(鍵名, 值, ...)`。
3. 消費端:從 `useSettingsState` / `SettingsContext` 讀取
   `appSettings.<section>.<鍵名>`。

過去需要改 5–7 個檔案(issue #68 第 3 點的批評),現在僅上述三處(其中第 1 步只有一行)。

## 歷史改名鍵

`chinese.doseFormat` ↔ storage 的 `chineseMedDoseFormat` 等 10 個改名封存於
`settingsSchema.js` 的 `LEGACY_STORAGE_KEYS`,為既有使用者的 storage 資料相容而保留,
不再新增項目。

## falsy 退回行為

`medicationCopyAllOrder`、`labCopyAllOrder`、`itemSeparator`、`focusedLabTests`、
`focusedImageTests` 五鍵在 storage 存有 falsy 值時退回預設值(沿襲舊版
`loadAllSettings` 的 `||` 行為,封存於 schema 的 `FALSY_FALLBACK_KEYS`)。

## CodeSet overlay(總覽關注清單)

`labFocusOverlay`/`imageFocusOverlay` 兩鍵(overview section,預設 `null`)存
總覽關注檢驗/影像清單的**使用者差異**(overlay delta);內建基底在
`src/config/labTests.js`/`imageTests.js` 的 `*_FOCUS_BUILTIN`,合成邏輯在
`src/utils/codeSetResolver.js`(純函數)。設計契約見
`docs/superpowers/specs/2026-07-07-codeset-pilot-design.md`,重點:

- `null` = 無自訂(用內建);**不適用 falsy 退回**(null 是合法值)。
- 舊鍵 `focusedLabTests`/`focusedImageTests` 保留不動(可回滾),由
  `runCodeSetMigrations()` 一次性冪等遷移(loadAllSettings 與編輯器開啟時觸發)。
- 兩鍵依「加鍵不 bump version」契約自動納入設定備份。
- 編輯 UI:`src/components/settings/CodeSetEditor.jsx`(通用,吃
  `src/config/codeSets.js` 宣告;新增代碼集 = 加一份宣告)。

## 設定備份(匯出/匯入)

popup 設定 tab 尾端的「設定備份」區塊(`src/components/settings/SettingsBackup.jsx`,
純邏輯在 `src/utils/settingsBackup.js`)。格式契約與相容策略見
`docs/superpowers/specs/2026-07-07-settings-backup-design.md`,重點:

- 匯出檔信封 `{ format: 'nhitw-settings', version: 1, exportedAt, settings }`,
  `settings` 為 SETTINGS_SCHEMA 的 54 個扁平 storageKey(歷史改名鍵原樣)。
- 匯入為**全量還原**:檔內鍵覆蓋、schema 內缺鍵重設為預設;寫回是一次
  `chrome.storage.sync.set` 完整 52 鍵。
- **加鍵不 bump version**:新增設定鍵後,舊檔匯入缺鍵回預設、新檔匯入未知鍵
  忽略 + 警告;`version` 只在信封結構破壞性改變時才升(屆時匯入拒絕並提示更新)。
- `developerMode`/`devFetchAll`(`storage.local` 開發旗標)不進備份。
- 匯入後 popup 各區塊需重開視窗才顯示新值(各區塊只在 mount 時讀 storage);
  頁面端由 `settingsManager` 的 `storage.onChanged` 自動刷新。
