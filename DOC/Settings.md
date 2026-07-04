# 設定系統(Settings)

## 單一事實來源

所有設定的預設值定義於 `src/config/defaultSettings.js`(巢狀結構,依 section 分組:
western / atc5 / chinese / lab / overview / general / cloud)。

`src/config/settingsSchema.js` 由它自動衍生,提供:

- `SETTINGS_SCHEMA`:52 個設定項的完整描述(section、巢狀鍵、storage 扁平鍵、預設值)
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
