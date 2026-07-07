// src/utils/settingsBackup.js
// 設定備份(匯出/匯入)純函數層。不碰 chrome API,方便單元測試。
// 格式契約與相容策略見 docs/superpowers/specs/2026-07-07-settings-backup-design.md:
// 「加鍵不 bump version」——新增設定鍵靠 SETTINGS_SCHEMA 白名單天然相容
// (舊檔缺鍵回預設、新檔未知鍵忽略);version 只在信封結構破壞性改變時才升。
import { SETTINGS_SCHEMA, buildStorageDefaults } from '../config/settingsSchema';

export const SETTINGS_EXPORT_FORMAT = 'nhitw-settings';
export const SETTINGS_EXPORT_VERSION = 1;

// 匯出物件:settings 為 SETTINGS_SCHEMA 白名單的扁平 storageKey(缺值補預設)。
export const buildSettingsExport = (flatSettings, exportedAt) => ({
  format: SETTINGS_EXPORT_FORMAT,
  version: SETTINGS_EXPORT_VERSION,
  exportedAt,
  settings: Object.fromEntries(
    SETTINGS_SCHEMA.map((e) => [e.storageKey, flatSettings[e.storageKey] ?? e.defaultValue])
  ),
});

// 陣列型預設值用 Array.isArray 判斷(typeof 陣列是 'object',擋不住字串以外的錯型別)
const matchesType = (value, defaultValue) =>
  Array.isArray(defaultValue) ? Array.isArray(value) : typeof value === typeof defaultValue;

// 全量還原:從 buildStorageDefaults() 出發,檔內通過驗證的鍵覆蓋,回傳完整 52 鍵。
// 未知鍵(可能來自較新版本)與型別不符鍵忽略,記入 warnings、不阻擋匯入。
export const parseSettingsImport = (json) => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { ok: false, error: '不是有效的設定檔(內容不是物件)' };
  }
  if (json.format !== SETTINGS_EXPORT_FORMAT) {
    return { ok: false, error: '不是本擴充功能的設定檔(format 標記不符)' };
  }
  if (!Number.isInteger(json.version) || json.version < 1) {
    return { ok: false, error: '設定檔的 version 欄位無效' };
  }
  if (json.version > SETTINGS_EXPORT_VERSION) {
    return { ok: false, error: '設定檔來自較新版本的擴充功能,請先更新擴充功能後再匯入' };
  }
  if (!json.settings || typeof json.settings !== 'object' || Array.isArray(json.settings)) {
    return { ok: false, error: '設定檔缺少 settings 內容' };
  }

  const byStorageKey = new Map(SETTINGS_SCHEMA.map((e) => [e.storageKey, e]));
  const settings = buildStorageDefaults();
  const warnings = [];
  let unknownCount = 0;
  const mismatched = [];
  for (const [key, value] of Object.entries(json.settings)) {
    const entry = byStorageKey.get(key);
    if (!entry) {
      unknownCount += 1;
      continue;
    }
    if (!matchesType(value, entry.defaultValue)) {
      mismatched.push(key);
      continue;
    }
    settings[key] = value;
  }
  if (unknownCount > 0) {
    warnings.push(`忽略 ${unknownCount} 個未知設定(可能來自較新版本)`);
  }
  if (mismatched.length > 0) {
    warnings.push(`${mismatched.length} 個設定型別不符,已改用預設值:${mismatched.join('、')}`);
  }
  return { ok: true, settings, warnings };
};
