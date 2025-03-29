// 自定義檢驗項目參考範圍配置
// 這個機制允許為特定檢驗項目覆蓋原始的參考範圍

/**
 * 自定義參考範圍映射表
 * 格式: {
 *   orderCode: {
 *     min: number | null, // 最小值，如果沒有下限則為 null
 *     max: number | null, // 最大值，如果沒有上限則為 null
 *     description: string  // 描述，方便維護
 *   }
 * }
 */
const customReferenceRanges = {
  // 總膽固醇
  "09001C": {
    min: 0,
    max: 200,
    description: "總膽固醇 >200 mg/dL 為異常(高)"
  },
  // 三酸甘油脂
  "09004C": {
    min: 0,
    max: 150,
    description: "三酸甘油脂 >150 mg/dL 為異常(高)"
  },
  // 高密度脂蛋白膽固醇
  "09043C": {
    min: 40,
    max: null, // 無上限，越高越好
    description: "高密度脂蛋白膽固醇 <40 mg/dL 為異常(低)"
  },
  // 低密度脂蛋白膽固醇
  "09044C": {
    min: 0,
    max: 100,
    description: "低密度脂蛋白膽固醇 >100 mg/dL 為異常(高)"
  },
  "12015C": {
    min: 0,
    max: 1,
    description: "CRP >1 為異常(高)"
  }
};

/**
 * 檢查檢驗項目是否有自定義參考範圍
 * @param {string} orderCode - 檢驗項目代碼
 * @returns {boolean} - 是否有自定義參考範圍
 */
const hasCustomReferenceRange = (orderCode) => {
  return customReferenceRanges.hasOwnProperty(orderCode);
};

/**
 * 獲取檢驗項目的自定義參考範圍
 * @param {string} orderCode - 檢驗項目代碼
 * @returns {Object|null} - 參考範圍對象，如果沒有則返回 null
 */
const getCustomReferenceRange = (orderCode) => {
  if (hasCustomReferenceRange(orderCode)) {
    return customReferenceRanges[orderCode];
  }
  return null;
};

export {
  customReferenceRanges,
  hasCustomReferenceRange,
  getCustomReferenceRange
};