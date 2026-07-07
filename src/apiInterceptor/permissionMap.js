import { CORE_NODE_TO_TYPES, DEV_NODE_TO_TYPES } from '../dataTypes/registry.js';

export const NODE_TO_DATA_TYPE = {
  // 核心型別與開發者補抓型別的授權節點皆由 src/dataTypes/ 描述檔衍生
  ...CORE_NODE_TO_TYPES,
  ...DEV_NODE_TO_TYPES,
};
