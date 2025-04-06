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

  // 使用 Set 代替數組以提高查詢效率
  const targetCodes = new Set(["09001C", "09004C", "09044C", "09043C", "12015C"]);

  return isMennoniteHospital && targetCodes.has(orderCode);
};

// 使用 Map 來處理 HDL 膽固醇 (09043C) 參考值的特殊情況
const hdlReferenceValues = new Map([
  ["40", { value: 40, display: ">40" }],
  ["50", { value: 50, display: ">50" }]
]);

// Special handler for HDL cholesterol (09043C) reference values
const processHDLReferenceRange = (referenceStr) => {
  if (!referenceStr) return null;

  // 使用 Map 查找而不是多個 if-else
  for (const [key, { value }] of hdlReferenceValues.entries()) {
    if (referenceStr.includes(key)) {
      return { min: value, max: null }; // For HDL, we want it HIGHER than the lower limit
    }
  }

  return null; // If no matching value found, let the regular parser handle it
};

// Format HDL reference range specifically
const formatHDLReferenceRange = (referenceStr) => {
  if (!referenceStr) return '';

  // 使用 Map 查找而不是多個 if-else
  for (const [key, { display }] of hdlReferenceValues.entries()) {
    if (referenceStr.includes(key)) {
      return display; // Return the display format (">40" or ">50")
    }
  }

  return ''; // If no matching value found, no reference value
};

// 定義參考範圍解析策略的 Map
const referenceRangeStrategies = new Map([
  // 策略 1: 檢查是否需要使用自定義參考範圍
  ["customRange", (cleanStr, orderCode, hosp) => {
    if (shouldUseCustomRange(orderCode, hosp)) {
      return getCustomReferenceRange(orderCode);
    }
    return null;
  }],
  
  // 策略 2: 特殊處理 HDL 膽固醇 (09043C)
  ["hdlCholesterol", (cleanStr, orderCode) => {
    if (orderCode === "09043C") {
      return processHDLReferenceRange(cleanStr);
    }
    return null;
  }],
  
  // 策略 3: 特殊情況 - [0][0] 或 [0.000][0.000]
  ["zeroRange", (cleanStr) => {
    if (isZeroReferenceRange(cleanStr)) {
      return null;  // 返回 null 表示不需要進行異常值判斷
    }
    return null;
  }],
  
  // 策略 4: 特殊情況: [無][無] 格式
  ["noValueRange", (cleanStr) => {
    if (cleanStr === '[無][無]') {
      return null;  // 返回 null 表示不需要顯示參考值
    }
    return null;
  }],
  
  // 策略 5: 特殊情況: [<140 mg/dl][] 格式 - 單括號中含有單位和小於符號
  ["singleBracketLessThan", (cleanStr) => {
    const singleBracketLessThanMatch = cleanStr.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]\[\]/);
    if (singleBracketLessThanMatch) {
      const maxValue = parseFloat(singleBracketLessThanMatch[1]);
      if (!isNaN(maxValue)) {
        return { min: null, max: maxValue };
      }
    }
    return null;
  }],
  
  // 策略 6: 特殊情況: [無][＜XX] 或 [無][<XX] 格式
  ["specialNoMin", (cleanStr) => {
    const specialNoMinPattern = /\[(無|NA|-|)\]\[(＜|<)?(\d*\.?\d+)\]/;
    const specialMatch = cleanStr.match(specialNoMinPattern);
    if (specialMatch) {
      const maxValue = specialMatch[3];
      if (maxValue) {
        return { min: null, max: parseFloat(maxValue) };
      }
    }
    return null;
  }],
  
  // 策略 7: 參考值寫在同一個中括號內，格式如 [7~25] 或 [7~52][]
  ["singleBracketRange", (cleanStr) => {
    const singleBracketMatch = cleanStr.match(/\[(\d*\.?\d+)~(\d*\.?\d+)\](\[\])?/);
    if (singleBracketMatch) {
      const min = cleanNumericValue(singleBracketMatch[1]);
      const max = cleanNumericValue(singleBracketMatch[2]);
      if (!isNaN(min) && !isNaN(max)) {
        return { min, max };
      }
    }
    return null;
  }],
  
  // 策略 8: 參考值分別寫在兩個中括號內，格式如 [150][400] 或 [7.000][52.000]
  ["doubleBracketRange", (cleanStr) => {
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
    return null;
  }],
  
  // 策略 9: 直接處理 [<140 mg/dl] 格式 (單一括號含小於符號)
  ["directLessThan", (cleanStr) => {
    const directLessThanMatch = cleanStr.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]/);
    if (directLessThanMatch) {
      const maxValue = parseFloat(directLessThanMatch[1]);
      if (!isNaN(maxValue)) {
        return { min: null, max: maxValue };
      }
    }
    return null;
  }],
  
  // 策略 10: 特殊情況 - 只有單一值，格式如 [60.0]
  ["singleValue", (cleanStr) => {
    const singleValueMatch = cleanStr.match(/\[(\d*\.?\d+)\]/);
    if (singleValueMatch) {
      const value = cleanNumericValue(singleValueMatch[1]);
      if (!isNaN(value)) {
        return { min: value, max: null };
      }
    }
    return null;
  }],
  
  // 策略 11: 特殊情況 - 無參考值或特殊標記，格式如 [無][]
  ["noReference", (cleanStr) => {
    if (cleanStr.includes('[無]') || cleanStr === '[0][]') {
      return null;
    }
    return null;
  }],
  
  // 策略 12: 特殊情況 - 定性檢驗，格式如 [0][9999]
  ["qualitativeTest", (cleanStr) => {
    if (cleanStr.match(/\[0\]\[9999\]/)) {
      return null;  // 定性檢驗不需要判斷異常值
    }
    return null;
  }]
]);

// Comprehensive reference range parser that handles multiple formats
const parseReferenceRange = (referenceStr, orderCode = null, hosp = null) => {
  if (!referenceStr) return null;

  // 清理字串
  const cleanStr = referenceStr.trim();

  // 按順序嘗試每個策略
  for (const [_, strategy] of referenceRangeStrategies) {
    const result = strategy(cleanStr, orderCode, hosp);
    if (result !== null) {
      return result;
    }
  }

  return null;
};

// 格式化規則 Map
const displayFormatStrategies = new Map([
  // 自定義參考範圍
  ["customRange", (referenceStr, orderCode, hosp) => {
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
    return null;
  }],
  
  // HDL 膽固醇特殊處理
  ["hdlCholesterol", (referenceStr, orderCode) => {
    if (orderCode === "09043C") {
      return formatHDLReferenceRange(referenceStr);
    }
    return null;
  }],
  
  // 零參考值
  ["zeroRange", (cleanStr) => {
    if (isZeroReferenceRange(cleanStr)) {
      return '';
    }
    return null;
  }],
  
  // [無][無] 格式
  ["noValueRange", (cleanStr) => {
    if (cleanStr === '[無][無]') {
      return '';
    }
    return null;
  }],
  
  // [<140 mg/dl][] 格式
  ["singleBracketLessThan", (cleanStr) => {
    const singleBracketLessThanMatch = cleanStr.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]\[\]/);
    if (singleBracketLessThanMatch) {
      const maxValue = singleBracketLessThanMatch[1];
      if (maxValue) {
        return `<${maxValue}`;
      }
    }
    return null;
  }],
  
  // [<140 mg/dl] 格式
  ["directLessThan", (cleanStr) => {
    const directLessThanMatch = cleanStr.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]/);
    if (directLessThanMatch) {
      const maxValue = directLessThanMatch[1];
      if (maxValue) {
        return `<${maxValue}`;
      }
    }
    return null;
  }],
  
  // [無][＜XX] 或 [無][<XX] 格式
  ["specialNoMin", (cleanStr) => {
    const specialNoMinPattern = /\[(無|NA|-|)\]\[(＜|<)?(\d*\.?\d+)\]/;
    const specialMatch = cleanStr.match(specialNoMinPattern);
    if (specialMatch) {
      const maxValue = specialMatch[3];
      if (maxValue) {
        return `<${maxValue}`;
      }
    }
    return null;
  }]
]);

// 格式化參考範圍用於顯示
const formatReferenceRangeForDisplay = (referenceStr, orderCode = null, hosp = null) => {
  if (!referenceStr) return '';

  // 清理字串
  const cleanStr = referenceStr.trim();
  
  // 按順序嘗試每個格式化策略
  for (const [_, strategy] of displayFormatStrategies) {
    const result = strategy(cleanStr, orderCode, hosp);
    if (result !== null) {
      return result;
    }
  }

  // 解析參考範圍
  const parsed = parseReferenceRange(cleanStr, orderCode, hosp);

  // 如果參考範圍為 null，檢查是否為特殊格式並返回原始字串
  if (!parsed) {
    // 特殊格式檢查 Map
    const specialFormats = new Map([
      [/\[無\]/, ''],
      [/\[0\]\[\]/, ''],
      [/\[0\]\[9999\]/, ''],
      [/\[無\]\[無\]/, '']
    ]);

    for (const [pattern, result] of specialFormats) {
      if (pattern.test(cleanStr)) {
        return result;
      }
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

  // 定義特殊格式處理策略的 Map
  const displayTextStrategies = new Map([
    // HDL 膽固醇特殊處理
    ["hdlCholesterol", () => {
      if (orderCode === "09043C") {
        return formatHDLReferenceRange(referenceStr);
      }
      return null;
    }],
    
    // [無][無] 格式
    ["noValueRange", () => {
      if (referenceStr.trim() === '[無][無]') {
        return '';
      }
      return null;
    }],
    
    // [<140 mg/dl][] 格式
    ["singleBracketLessThan", () => {
      const singleBracketLessThanMatch = referenceStr?.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]\[\]/);
      if (singleBracketLessThanMatch) {
        const maxValue = singleBracketLessThanMatch[1];
        if (maxValue) {
          return `<${maxValue}`;
        }
      }
      return null;
    }],
    
    // [<140 mg/dl] 格式
    ["directLessThan", () => {
      const directLessThanMatch = referenceStr?.match(/\[<\s*(\d*\.?\d+)(?:\s*\w+\/?\w*)?\]/);
      if (directLessThanMatch) {
        const maxValue = directLessThanMatch[1];
        if (maxValue) {
          return `<${maxValue}`;
        }
      }
      return null;
    }],
    
    // [無][＜XX] 或 [無][<XX] 格式
    ["specialNoMin", () => {
      const specialNoMinPattern = /\[(無|NA|-|)\]\[(＜|<)?(\d*\.?\d+)\]/;
      const specialMatch = referenceStr?.match(specialNoMinPattern);
      if (specialMatch) {
        const maxValue = specialMatch[3];
        if (maxValue) {
          return `<${maxValue}`;
        }
      }
      return null;
    }]
  ]);

  // 按順序嘗試每個格式化策略
  for (const [_, strategy] of displayTextStrategies) {
    const result = strategy();
    if (result !== null) {
      return result;
    }
  }

  // 1. 嘗試從原始字串格式化
  const formatted = formatReferenceRangeForDisplay(referenceStr, orderCode, hosp);
  if (formatted) {
    return formatted;
  }

  // 2. 檢查特殊格式
  // 匹配 [無][數字] 或 [NA][數字] 或 [-][數字] 或 [][<數字]
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