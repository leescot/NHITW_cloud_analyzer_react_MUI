/**
 * 藥物分類群組設定
 * 定義各種藥物分類及相關常數
 */

// 定義 ATC5 藥物分類群組
export const DEFAULT_ATC5_GROUPS = {
  NSAID: ['M01AA', 'M01AB', 'M01AC', 'M01AE', 'M01AG', 'M01AH'],
  ACEI: ['C09AA', 'C09BA', 'C09BB', 'C09BX'],
  ARB: ['C09CA', 'C09DA', 'C09DB', 'C09DX'],
  STATIN: ['C10AA', 'C10BA', 'C10BX'],
  SGLT2: ['A10BK', 'A10BD15', 'A10BD16', 'A10BD19', 'A10BD20', 'A10BD21', 'A10BD25', 'A10BD27', 'A10BD29', 'A10BD30'],
  GLP1: ['A10BJ', 'A10AE54', 'A10AE56'],
  抗凝: ['B01A'],
};

// 定義藥物分類的顏色群組
export const DEFAULT_ATC5_COLOR_GROUPS = {
  red: ['抗凝','NSAID'],
  orange: ['ARB','ACEI','STATIN'],
  green: ['SGLT2','GLP1'],
}; 