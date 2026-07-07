import { DEV_NODE_TO_TYPES } from '../dataTypes/registry.js';

export const NODE_TO_DATA_TYPE = {
  '1.1': ['patientsummary'],
  '1.2': ['hbcvdata'],
  '2.1': ['medication'],
  '2.3': ['chronicMed'],
  '2.4': ['medDays'],
  '3.1': ['chinesemed'],
  '5.1': ['allergy'],
  '6.1': ['labdata', 'labdraw'],
  '6.2': ['imaging'],
  '6.3': ['adultHealthCheck'],
  '6.4': ['cancerScreening'],
  '7.1': ['surgery'],
  '8.1': ['discharge'],
  // 開發者補抓型別的授權節點(1.3/2.2/3.2/3.3/4.1/6.5/9.1/10.1);
  // 由 src/dataTypes/ 描述檔衍生。與上方既有節點不重疊。
  ...DEV_NODE_TO_TYPES,
};
