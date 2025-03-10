// 資料格式化相關函數
import { getAbbreviation } from './abbreviationUtils.js';
import { normalizeValue, getValueStatus } from './valueUtils.js';
import { parseReferenceRange, isZeroReferenceRange } from './referenceRangeUtils.js';
import { checkIfAbnormal } from './valueUtils.js';
import { hasCustomReferenceRange, getCustomReferenceRange } from './customReferenceRanges.js';

// 格式化單筆檢驗資料
const formatLabData = (lab) => {
  // 處理參考值範圍
  const consultValue = parseReferenceRange(lab.consult_value);
  
  // 檢查是否有自定義參考範圍
  let referenceMin, referenceMax;
  if (hasCustomReferenceRange(lab.order_code)) {
    // 使用自定義參考範圍
    const customRange = getCustomReferenceRange(lab.order_code);
    referenceMin = customRange.min;
    referenceMax = customRange.max;
    // 記錄原始參考值，以便除錯
    lab._originalConsultValue = lab.consult_value;
    lab._originalReferenceMin = consultValue ? consultValue.min : null;
    lab._originalReferenceMax = consultValue ? consultValue.max : null;
    lab._usingCustomRange = true;
  } else {
    // 使用原始參考值
    referenceMin = consultValue ? consultValue.min : null;
    referenceMax = consultValue ? consultValue.max : null;
    lab._usingCustomRange = false;
  }
  
  // 判斷值的狀態 (normal, high, low)
  let valueStatus = "normal";
  // Skip abnormal marking for labs with [0.000][0.000] reference range
  if (!isZeroReferenceRange(lab.consult_value) || lab._usingCustomRange) {
    valueStatus = getValueStatus(
      lab.assay_value,
      referenceMin !== null ? parseFloat(referenceMin) : null,
      referenceMax !== null ? parseFloat(referenceMax) : null
    );
  }
  
  // 為了保持向後兼容
  const isAbnormal = valueStatus !== "normal";
  
  // 獲取縮寫名稱 - 傳入 itemName
  const abbrName = getAbbreviation(lab.order_code, lab.unit_data, lab.assay_item_name);
  // 標準化值
  const normalizedValue = normalizeValue(lab.assay_value);

  return {
    itemName: lab.assay_item_name,
    value: normalizedValue,  // 使用標準化後的值
    unit: lab.unit_data,
    consultValue: consultValue,
    referenceMin: referenceMin,  // 參考值下限 (可能是自定義的)
    referenceMax: referenceMax,  // 參考值上限 (可能是自定義的)
    type: lab.assay_tp_cname,
    orderName: lab.order_name,
    orderCode: lab.order_code || '',
    isAbnormal: isAbnormal,      // 保留為向後兼容
    valueStatus: valueStatus,    // 新增詳細狀態 (normal, high, low)
    abbrName: abbrName,          // 縮寫屬性
    _usingCustomRange: lab._usingCustomRange || false, // 是否使用自定義參考範圍
    _originalReferenceMin: lab._originalReferenceMin,   // 原始參考值下限 (僅當使用自定義參考範圍時)
    _originalReferenceMax: lab._originalReferenceMax    // 原始參考值上限 (僅當使用自定義參考範圍時)
  };
};

export {
  formatLabData
}; 