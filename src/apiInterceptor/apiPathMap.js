import { CORE_API_ENTRIES, DEV_API_ENTRIES } from '../dataTypes/registry.js';

export const API_PATH_MAP = new Map([
  // 已遷入 src/dataTypes/coreTypes.js 的核心型別(遷移中,依序搬入)
  ...CORE_API_ENTRIES,
  ["medDays", "imue0120/imue0120s01/pres-med-day"],
  ["patientsummary", "imue2000/imue2000s01/get-summary"],
  ["adultHealthCheck", "imue0140/imue0140s01/hpa-data"],
  ["cancerScreening", "imue0150/imue0150s01/hpa-data"],
  ["hbcvdata", "imue0180/imue0180s01/hbcv-data"],
  ["chronicMed", "imue0008/imue0008s05/get-data"],
  // 開發者補抓型別(devFetchAll 才抓);由 src/dataTypes/ 描述檔衍生。
  ...DEV_API_ENTRIES,
]);
