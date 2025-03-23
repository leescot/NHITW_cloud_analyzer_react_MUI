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
  
  // 獲取縮寫名稱 - 傳入 itemName
  const abbrName = getAbbreviation(lab.order_code, lab.unit_data, lab.assay_item_name);
  
  // 檢查是否有多個數值
  let normalizedValue;
  let valueStatus = "normal";
  let isAbnormal = false;
  let hasMultipleValues = false;
  let valueRange = null;
  
  if (lab._multiValueData && lab._multiValueData.values && lab._multiValueData.values.length > 1) {
    hasMultipleValues = true;
    
    // 將字符串數值轉換為數字以進行計算
    const numericValues = lab._multiValueData.values.map(val => {
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    }).filter(val => val !== null);
    
    if (numericValues.length > 0) {
      // 如果有有效數字，計算其範圍
      const minValue = Math.min(...numericValues);
      const maxValue = Math.max(...numericValues);
      
      valueRange = {
        min: minValue,
        max: maxValue,
        timePoints: lab._multiValueData.timePoints || []
      };
      
      // 合併數值為範圍形式
      if (minValue === maxValue) {
        normalizedValue = `${minValue}`;
      } else {
        normalizedValue = `${minValue}-${maxValue}`;
      }
      
      // 判斷值的狀態 (normal, high, low)
      // 如果最大値超出上限或最小値低於下限，則標記為異常
      if (!isZeroReferenceRange(lab.consult_value) || lab._usingCustomRange) {
        if (referenceMax !== null && maxValue > parseFloat(referenceMax)) {
          valueStatus = "high";
          isAbnormal = true;
        } else if (referenceMin !== null && minValue < parseFloat(referenceMin)) {
          valueStatus = "low";
          isAbnormal = true;
        }
      }
    } else {
      // 如果沒有有效數字，使用原始值的連接
      normalizedValue = lab._multiValueData.values.join(", ");
    }
  } else {
    // 單一值的情況
    normalizedValue = normalizeValue(lab.assay_value);
    
    // 判斷值的狀態 (normal, high, low)
    // Skip abnormal marking for labs with [0.000][0.000] reference range
    if (!isZeroReferenceRange(lab.consult_value) || lab._usingCustomRange) {
      valueStatus = getValueStatus(
        lab.assay_value,
        referenceMin !== null ? parseFloat(referenceMin) : null,
        referenceMax !== null ? parseFloat(referenceMax) : null
      );
    }
    
    // 為了保持向後兼容
    isAbnormal = valueStatus !== "normal";
  }

  return {
    itemName: lab.assay_item_name,
    value: normalizedValue,  // 範圍形式的值（如 "10-15"）或單一標準化值
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
    hasMultipleValues: hasMultipleValues,  // 標記是否有多個數值
    valueRange: valueRange,      // 數值範圍資訊，包含最小值、最大值和時間點
    _usingCustomRange: lab._usingCustomRange || false, // 是否使用自定義參考範圍
    _originalReferenceMin: lab._originalReferenceMin,   // 原始參考值下限 (僅當使用自定義參考範圍時)
    _originalReferenceMax: lab._originalReferenceMax    // 原始參考值上限 (僅當使用自定義參考範圍時)
  };
};

export {
  formatLabData
}; 