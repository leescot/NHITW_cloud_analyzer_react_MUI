// 現行 chrome.storage.sync 扁平鍵快照(重構前行為基準,54 鍵)
// 抄自 settingsManager.js loadAllSettings 的 sync.get 預設物件(2026-07-04)
export const EXPECTED_STORAGE_KEYS = [
  // western (13)
  'simplifyMedicineName', 'showGenericName', 'showDiagnosis', 'showATC5Name',
  'medicationCopyFormat', 'separateShortTermMeds', 'showExternalDrugImage',
  'enableMedicationCustomCopyFormat', 'enableMedicationCopyAll', 'medicationCopyAllOrder',
  'drugSeparator', 'customMedicationHeaderCopyFormat', 'customMedicationDrugCopyFormat',
  // atc5 (3)
  'enableATC5Colors', 'atc5Groups', 'atc5ColorGroups',
  // chinese (4)
  'chineseMedShowDiagnosis', 'chineseMedShowEffectName', 'chineseMedDoseFormat', 'chineseMedCopyFormat',
  // lab (14)
  'displayLabFormat', 'showLabUnit', 'showLabReference', 'enableLabAbbrev',
  'highlightAbnormalLab', 'copyLabFormat', 'enableLabChooseCopy', 'labChooseCopyItems',
  'enableLabCustomCopyFormat', 'enableLabCopyAll', 'labCopyAllOrder', 'itemSeparator',
  'customLabHeaderCopyFormat', 'customLabItemCopyFormat',
  // overview (7)
  'medicationTrackingDays', 'labTrackingDays', 'imageTrackingDays', 'focusedLabTests', 'focusedImageTests',
  'labFocusOverlay', 'imageFocusOverlay',
  // general (10)
  'autoOpenPage', 'titleTextSize', 'contentTextSize', 'noteTextSize', 'floatingIconPosition',
  'alwaysOpenOverviewTab', 'useColorfulTabs', 'enableCKMTab', 'enableNephroReport', 'enableCKMScreening',
  // cloud (3)
  'fetchAdultHealthCheck', 'fetchCancerScreening', 'fetchHbcvdata',
].sort();

// 巢狀鍵(section.key)→ storage 鍵的歷史改名(其餘同名)
export const RENAMED_KEY_MAP = {
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
