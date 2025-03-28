// 參考範圍處理相關函數
import { getCustomReferenceRange } from './customReferenceRanges.js';

// Helper function to check if a reference range is of the form [0.000][0.000]
const isZeroReferenceRange = (referenceStr) => {
  if (!referenceStr) return false;

  // Match exactly [0.000][0.000] pattern or variations with different decimal places
  return /\[0*\.?0*\]\[0*\.?0*\]/.test(referenceStr);
};

// Clean numeric values by removing unnecessary decimal zeros
const cleanNumericValue = (value) => {
  if (typeof value === 'string') {
    // Convert to float and back to string to remove trailing zeros
    return parseFloat(value);
  }
  return value;
};

// 檢查是否需要使用自定義參考範圍
const shouldUseCustomRange = (orderCode, hosp) => {
  if (!orderCode || !hosp) return false;

  // 檢查特定醫院 - 門諾
  const isMennoniteHospital = hosp.includes("門諾");

  // 檢查特定代碼
  const targetCodes = ["09001C", "09004C", "09044C", "09043C", "12015C"];

  return isMennoniteHospital && targetCodes.includes(orderCode);
};

// Special handler for HDL cholesterol (09043C) reference values
const processHDLReferenceRange = (referenceStr) => {
  if (!referenceStr) return null;

  // Check if the reference contains "40"
  if (referenceStr.includes("40")) {
    return { min: 40, max: null }; // For HDL, we want it HIGHER than the lower limit
  }
  // If no "40" but has "50"
  else if (referenceStr.includes("50")) {
    return { min: 50, max: null }; // For HDL, we want it HIGHER than the lower limit
  }

  return null; // If neither 40 nor 50 found, let the regular parser handle it
};

// Format HDL reference range specifically
const formatHDLReferenceRange = (referenceStr) => {
  if (!referenceStr) return '';

  // Check if the reference contains "40"
  if (referenceStr.includes("40")) {
    return ">40"; // For HDL, the reference is "greater than 40"
  }
  // If no "40" but has "50"
  else if (referenceStr.includes("50")) {
    return ">50"; // For HDL, the reference is "greater than 50"
  }

  return ''; // If neither 40 nor 50 found, no reference value
};

// Comprehensive reference range parser that handles multiple formats
const parseReferenceRange = (referenceStr, orderCode = null, hosp = null) => {
  // 檢查是否需要使用自定義參考範圍
  if (shouldUseCustomRange(orderCode, hosp)) {
    return getCustomReferenceRange(orderCode);
  }

  if (!referenceStr) return null;

  // Special handling for HDL cholesterol (09043C)
  if (orderCode === "09043C") {
    const hdlResult = processHDLReferenceRange(referenceStr);
    if (hdlResult) return hdlResult;
  }

  // 清理字串
  const cleanStr = referenceStr.trim();

  // Case: 特殊情況 - [0][0] 或 [0.000][0.000]
  if (isZeroReferenceRange(cleanStr)) {
    return null;  // 返回 null 表示不需要進行異常值判斷
  }

  // 特殊情況: [無][無] 格式
  if (cleanStr === '[無][無]') {
    return null;  // 返回 null 表示不需要顯示參考值
  }

  // 特殊情況: [<140 mg/dl][] 格式 - 單括號中含有單位和小於符號
  const singleBracketLessThanMatch = cleanStr.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]\[\]/);
  if (singleBracketLessThanMatch) {
    const maxValue = parseFloat(singleBracketLessThanMatch[1]);
    if (!isNaN(maxValue)) {
      return { min: null, max: maxValue };
    }
  }

  // 特殊情況: [無][＜XX] 或 [無][<XX] 格式
  const specialNoMinPattern = /\[(無|NA|-|)\]\[(＜|<)?(\d*\.?\d+)\]/;
  const specialMatch = cleanStr.match(specialNoMinPattern);
  if (specialMatch) {
    const maxValue = specialMatch[3];
    if (maxValue) {
      return { min: null, max: parseFloat(maxValue) };
    }
  }

  // Case: 參考值寫在同一個中括號內，格式如 [7~25] 或 [7~52][]
  const singleBracketMatch = cleanStr.match(/\[(\d*\.?\d+)~(\d*\.?\d+)\](\[\])?/);
  if (singleBracketMatch) {
    const min = cleanNumericValue(singleBracketMatch[1]);
    const max = cleanNumericValue(singleBracketMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max };
    }
  }

  // Case: 參考值分別寫在兩個中括號內，格式如 [150][400] 或 [7.000][52.000]
  const doubleBracketMatch = cleanStr.match(/\[([^[\]]*)\]\[([^[\]]*)\]/);
  if (doubleBracketMatch) {
    const firstBracket = doubleBracketMatch[1].trim();
    const secondBracket = doubleBracketMatch[2].trim();

    // 處理上限值
    let max = null;
    if (secondBracket && secondBracket !== '') {
      // Handle cases like "<40" or "＜40"
      if (secondBracket.includes('＜') || secondBracket.includes('<')) {
        // 提取數字部分，去除所有非數字字符
        const numericPart = secondBracket.replace(/[^0-9.]/g, '');
        if (numericPart) {
          max = cleanNumericValue(numericPart);
        }
      } else {
        // Regular numeric value
        const numMatch = secondBracket.match(/(\d*\.?\d+)/);
        if (numMatch) {
          max = cleanNumericValue(numMatch[0]);
        }
      }
    }

    // 處理下限值
    let min = null;
    // 如果第一個括號有小於符號，這實際上是上限值，不是下限值
    if (firstBracket && (firstBracket.includes('＜') || firstBracket.includes('<'))) {
      const numericPart = firstBracket.replace(/[^0-9.]/g, '');
      if (numericPart) {
        max = cleanNumericValue(numericPart);
        min = null; // 確保min為null，因為這是上限值
      }
    }
    // 否則作為正常下限處理
    else if (firstBracket && !['無', 'NA', '-', ''].includes(firstBracket)) {
      const numMatch = firstBracket.match(/(\d*\.?\d+)/);
      if (numMatch) {
        min = cleanNumericValue(numMatch[0]);
      }
    }

    // If we have at least one valid bound, return the reference range
    if (min !== null || max !== null) {
      return { min, max };
    }
  }

  // Case: 直接處理 [<140 mg/dl] 格式 (單一括號含小於符號)
  const directLessThanMatch = cleanStr.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]/);
  if (directLessThanMatch) {
    const maxValue = parseFloat(directLessThanMatch[1]);
    if (!isNaN(maxValue)) {
      return { min: null, max: maxValue };
    }
  }

  // Case: 特殊情況 - 只有單一值，格式如 [60.0]
  const singleValueMatch = cleanStr.match(/\[(\d*\.?\d+)\]/);
  if (singleValueMatch) {
    const value = cleanNumericValue(singleValueMatch[1]);
    if (!isNaN(value)) {
      return { min: value, max: null };
    }
  }

  // Case: 特殊情況 - 無參考值或特殊標記，格式如 [無][]
  if (cleanStr.includes('[無]') || cleanStr === '[0][]') {
    return null;
  }

  // Case: 特殊情況 - 定性檢驗，格式如 [0][9999]
  if (cleanStr.match(/\[0\]\[9999\]/)) {
    return null;  // 定性檢驗不需要判斷異常值
  }

  return null;
};

// 格式化參考範圍用於顯示
const formatReferenceRangeForDisplay = (referenceStr, orderCode = null, hosp = null) => {
  // 檢查是否需要使用自定義參考範圍
  if (shouldUseCustomRange(orderCode, hosp)) {
    const customRange = getCustomReferenceRange(orderCode);
    if (customRange) {
      if (customRange.min !== null && customRange.max !== null) {
        return `${customRange.min}-${customRange.max}`;
      } else if (customRange.min !== null) {
        return `>${customRange.min}`;
      } else if (customRange.max !== null) {
        return `<${customRange.max}`;
      }
    }
  }

  if (!referenceStr) return '';

  // Special handling for HDL cholesterol (09043C)
  if (orderCode === "09043C") {
    const hdlResult = formatHDLReferenceRange(referenceStr);
    if (hdlResult) return hdlResult;
  }

  // 清理字串
  const cleanStr = referenceStr.trim();

  // 檢查是否為零參考值
  if (isZeroReferenceRange(cleanStr)) {
    return '';
  }

  // 特殊情況: [無][無] 格式
  if (cleanStr === '[無][無]') {
    return '';  // 返回空字串表示不需要顯示參考值
  }

  // 特殊處理 [<140 mg/dl][] 格式
  const singleBracketLessThanMatch = cleanStr.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]\[\]/);
  if (singleBracketLessThanMatch) {
    const maxValue = singleBracketLessThanMatch[1];
    if (maxValue) {
      return `<${maxValue}`;
    }
  }

  // 直接處理 [<140 mg/dl] 格式
  const directLessThanMatch = cleanStr.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]/);
  if (directLessThanMatch) {
    const maxValue = directLessThanMatch[1];
    if (maxValue) {
      return `<${maxValue}`;
    }
  }

  // 特殊處理 [無][＜XX] 或 [無][<XX] 格式
  const specialNoMinPattern = /\[(無|NA|-|)\]\[(＜|<)?(\d*\.?\d+)\]/;
  const specialMatch = cleanStr.match(specialNoMinPattern);
  if (specialMatch) {
    const maxValue = specialMatch[3];
    if (maxValue) {
      return `<${maxValue}`;
    }
  }

  // 解析參考範圍
  const parsed = parseReferenceRange(cleanStr, orderCode, hosp);

  // 如果參考範圍為 null，檢查是否為特殊格式並返回原始字串
  if (!parsed) {
    if (cleanStr.includes('[無]') || cleanStr === '[0][]' || cleanStr.match(/\[0\]\[9999\]/) || cleanStr === '[無][無]') {
      return '';
    }
    // 如果無法解析但原始字串非空，返回清理過的原始字串
    if (cleanStr) {
      return cleanStr.replace(/[\[\]]/g, '');
    }
    return '';
  }

  // 格式化參考範圍
  const { min, max } = parsed;

  if (min !== null && max !== null) {
    return `${min}-${max}`;
  } else if (min !== null) {
    return `>${min}`;
  } else if (max !== null) {
    return `<${max}`;
  }

  // 如果都沒解析出來，返回原始字串
  return cleanStr.replace(/[\[\]]/g, '');
};

// 從原始格式和解析後的參考範圍獲取顯示文本
const getReferenceRangeDisplayText = (referenceStr, orderCode = null, hosp = null) => {
  if (!referenceStr) return '';

  // Special handling for HDL cholesterol (09043C)
  if (orderCode === "09043C") {
    const hdlResult = formatHDLReferenceRange(referenceStr);
    if (hdlResult) return hdlResult;
  }

  // 特殊情況: [無][無] 格式
  if (referenceStr.trim() === '[無][無]') {
    return '';  // 返回空字串表示不需要顯示參考值
  }

  // 特殊處理 [<140 mg/dl][] 格式
  const singleBracketLessThanMatch = referenceStr?.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]\[\]/);
  if (singleBracketLessThanMatch) {
    const maxValue = singleBracketLessThanMatch[1];
    if (maxValue) {
      return `<${maxValue}`;
    }
  }

  // 直接處理 [<140 mg/dl] 格式
  const directLessThanMatch = referenceStr?.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]/);
  if (directLessThanMatch) {
    const maxValue = directLessThanMatch[1];
    if (maxValue) {
      return `<${maxValue}`;
    }
  }

  // 特殊處理 [無][＜XX] 或 [無][<XX] 格式
  const specialNoMinPattern = /\[(無|NA|-|)\]\[(＜|<)?(\d*\.?\d+)\]/;
  const specialMatch = referenceStr?.match(specialNoMinPattern);
  if (specialMatch) {
    const maxValue = specialMatch[3];
    if (maxValue) {
      return `<${maxValue}`;
    }
  }

  // 1. 嘗試從原始字串格式化
  const formatted = formatReferenceRangeForDisplay(referenceStr, orderCode, hosp);

  if (formatted) {
    return formatted;
  }

  // 2. 檢查特殊格式
  // 匹配 [無][數字] 或 [NA][數字] 或 [-][數字] 或 [][<數字]
  // 使用更寬鬆的正則表達式來匹配各種格式
  const generalSpecialMatch = referenceStr?.match(/\[([^[\]]*)\]\[([^[\]]*)\]/);

  if (generalSpecialMatch) {
    const firstBracket = generalSpecialMatch[1].trim();
    const secondBracket = generalSpecialMatch[2].trim();

    // 如果兩個括號都是 "無"，返回空字串
    if (firstBracket === '無' && secondBracket === '無') {
      return '';
    }

    const upperValue = secondBracket;

    // 處理上限值
    if (upperValue) {
      // 直接檢查是否包含中文或英文「小於」符號
      if (upperValue.includes('＜') || upperValue.includes('<')) {
        // 擷取數字部分，去除所有非數字字符
        const numericPart = upperValue.replace(/[^0-9.]/g, '');
        if (numericPart) {
          return `<${numericPart}`;
        }
      }

      // 如果沒有「小於」符號，但是有[無][數字]格式，默認為「小於」
      const numMatch = upperValue.match(/(\d*\.?\d+)/);

      if (numMatch) {
        return `<${numMatch[0]}`;
      }
    }
  }

  // 3. 如果沒有成功解析，返回清理過的原始字串或空字串
  return referenceStr ? referenceStr.replace(/[\[\]]/g, '') : '';
};

export {
  isZeroReferenceRange,
  parseReferenceRange,
  formatReferenceRangeForDisplay,
  getReferenceRangeDisplayText
};