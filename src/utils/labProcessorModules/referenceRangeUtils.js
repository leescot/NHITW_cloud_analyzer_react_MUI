// 參考範圍處理相關函數

// Helper function to check if a reference range is of the form [0.000][0.000]
const isZeroReferenceRange = (referenceStr) => {
  if (!referenceStr) return false;
  
  // Match exactly [0.000][0.000] pattern or variations with different decimal places
  return /\[0*\.?0*\]\[0*\.?0*\]/.test(referenceStr);
};

// Comprehensive reference range parser that handles multiple formats
const parseReferenceRange = (referenceStr) => {
  if (!referenceStr) return null;
  
  // 清理字串
  const cleanStr = referenceStr.trim();
  
  // Case 7: 特殊情況 - [0][0] 或 [0.000][0.000]
  // 移到最前面檢查，確保優先處理這種情況
  if (isZeroReferenceRange(cleanStr)) {
    return null;  // 返回 null 表示不需要進行異常值判斷
  }
  
  // Case 1: 參考值寫在同一個中括號內，格式如 [7~25]
  const singleBracketMatch = cleanStr.match(/\[(\d*\.?\d+)~(\d*\.?\d+)\]/);
  if (singleBracketMatch) {
    const min = parseFloat(singleBracketMatch[1]);
    const max = parseFloat(singleBracketMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max };
    }
  }

  // Case 2: 參考值分別寫在兩個中括號內，格式如 [150][400]
  const doubleBracketMatch = cleanStr.match(/\[(\d*\.?\d+)\]\[(\d*\.?\d+)\]/);
  if (doubleBracketMatch) {
    const min = parseFloat(doubleBracketMatch[1]);
    const max = parseFloat(doubleBracketMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max };
    }
  }

  // Case 3: 特殊情況 - 只有下限，格式如 [60.0][]
  const lowerBoundMatch = cleanStr.match(/\[(\d*\.?\d+)\]\[.*?\]/);
  if (lowerBoundMatch) {
    const min = parseFloat(lowerBoundMatch[1]);
    if (!isNaN(min)) {
      return { min, max: null };
    }
  }

  // Case 4: 特殊情況 - 只有單一值，格式如 [60.0]
  const singleValueMatch = cleanStr.match(/\[(\d*\.?\d+)\]/);
  if (singleValueMatch) {
    const value = parseFloat(singleValueMatch[1]);
    if (!isNaN(value)) {
      return { min: value, max: null };
    }
  }

  // Case 5: 特殊情況 - 無參考值或特殊標記，格式如 [無][]
  if (cleanStr.includes('[無]') || cleanStr === '[0][]') {
    return null;
  }

  // Case 6: 特殊情況 - 定性檢驗，格式如 [0][9999]
  if (cleanStr.match(/\[0\]\[9999\]/)) {
    return null;  // 定性檢驗不需要判斷異常值
  }
  
  return null;
};

export {
  isZeroReferenceRange,
  parseReferenceRange
}; 