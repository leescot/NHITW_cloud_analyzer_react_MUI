import { CORE_API_ENTRIES, DEV_API_ENTRIES } from '../dataTypes/registry.js';

export const API_PATH_MAP = new Map([
  // 核心型別與開發者補抓型別皆由 src/dataTypes/ 描述檔衍生
  ...CORE_API_ENTRIES,
  ...DEV_API_ENTRIES,
]);
