import { CORE_NODE_TO_TYPES, DEV_NODE_TO_TYPES } from '../dataTypes/registry.js';

export const NODE_TO_DATA_TYPE = {
  // 已遷入 src/dataTypes/coreTypes.js 的核心型別(遷移中,依序搬入)
  ...CORE_NODE_TO_TYPES,
  '1.2': ['hbcvdata'],
  '2.3': ['chronicMed'],
  // 開發者補抓型別的授權節點(1.3/2.2/3.2/3.3/4.1/6.5/9.1/10.1);
  // 由 src/dataTypes/ 描述檔衍生。與上方既有節點不重疊。
  ...DEV_NODE_TO_TYPES,
};
