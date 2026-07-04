// settingsSchema.js
// 設定的單一事實來源(single source of truth)。
// 新增設定時只需在 defaultSettings.js 對應 section 加一行,storage 鍵自動同名;
// 「不要」再往 LEGACY_STORAGE_KEYS 加新項目——那是歷史改名的封存表。
import { DEFAULT_SETTINGS } from './defaultSettings';

// 歷史遺留:巢狀鍵(section.key)→ chrome.storage 扁平鍵的改名對照
const LEGACY_STORAGE_KEYS = {
  'atc5.enableColors': 'enableATC5Colors',
  'atc5.groups': 'atc5Groups',
  'atc5.colorGroups': 'atc5ColorGroups',
  'chinese.showDiagnosis': 'chineseMedShowDiagnosis',
  'chinese.showEffectName': 'chineseMedShowEffectName',
  'chinese.doseFormat': 'chineseMedDoseFormat',
  'chinese.copyFormat': 'chineseMedCopyFormat',
  'lab.showUnit': 'showLabUnit',
  'lab.showReference': 'showLabReference',
  'lab.highlightAbnormal': 'highlightAbnormalLab',
};

// 舊版讀取時,這些鍵若在 storage 存了 falsy 值會退回預設(保留該行為)
const FALSY_FALLBACK_KEYS = new Set([
  'western.medicationCopyAllOrder',
  'lab.labCopyAllOrder',
  'lab.itemSeparator',
  'overview.focusedLabTests',
  'overview.focusedImageTests',
]);

export const SETTINGS_SCHEMA = Object.entries(DEFAULT_SETTINGS).flatMap(
  ([section, sectionDefaults]) =>
    Object.entries(sectionDefaults).map(([key, defaultValue]) => ({
      section,
      key,
      storageKey: LEGACY_STORAGE_KEYS[`${section}.${key}`] ?? key,
      defaultValue,
      falsyFallback: FALSY_FALLBACK_KEYS.has(`${section}.${key}`),
    }))
);

/** 全部設定的扁平預設物件(給 chrome.storage.sync.get) */
export const buildStorageDefaults = () =>
  Object.fromEntries(SETTINGS_SCHEMA.map(e => [e.storageKey, e.defaultValue]));

const resolveValue = (entry, flat) => {
  const value = flat[entry.storageKey];
  return entry.falsyFallback ? (value || entry.defaultValue) : value;
};

/** 從扁平物件取出單一 section 的巢狀設定 */
export const sectionFromFlat = (section, flat) =>
  Object.fromEntries(
    SETTINGS_SCHEMA.filter(e => e.section === section).map(e => [e.key, resolveValue(e, flat)])
  );

/** 扁平物件 → 依 DEFAULT_SETTINGS 分 section 的巢狀結構 */
export const structureFromFlat = (flat) =>
  Object.fromEntries(
    Object.keys(DEFAULT_SETTINGS).map(section => [section, sectionFromFlat(section, flat)])
  );

/** 單一 section 的扁平預設物件(給設定 UI 元件的 sync.get) */
export const storageDefaultsForSection = (section) =>
  Object.fromEntries(
    SETTINGS_SCHEMA.filter(e => e.section === section).map(e => [e.storageKey, e.defaultValue])
  );
