// 數值標準化和檢查相關函數

// 標準化數值 - 去除尾部的零
const normalizeValue = (value) => {
  if (!value || typeof value !== 'string') return value;
  
  // 處理數值格式（去除尾部的零）
  if (/^\d+(\.\d+)?$/.test(value)) {
    // 先將字符串轉為浮點數，再轉回字符串，可以去除尾部的0
    const floatVal = parseFloat(value);
    return isNaN(floatVal) ? value : String(floatVal);
  }
  
  // 非數值格式原樣返回
  return value;
};

// 檢查值的狀態：正常、偏高或偏低
const getValueStatus = (value, min, max) => {
  if ((min === null && max === null) || !value) return "normal";
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return "normal";
  
  // 處理不同情況
  if (min !== null && max !== null) {
    // 有上下限
    if (numValue < min) return "low";
    if (numValue > max) return "high";
    return "normal";
  } else if (min !== null) {
    // 只有下限
    return numValue < min ? "low" : "normal";
  } else if (max !== null) {
    // 只有上限
    return numValue > max ? "high" : "normal";
  }
  
  return "normal";
};

// 保留舊的函數名稱作為兼容，但使用新邏輯
const checkIfAbnormal = (value, consultValue) => {
  if (!consultValue || !value) return false;
  
  const status = getValueStatus(
    value, 
    consultValue.min !== null ? parseFloat(consultValue.min) : null, 
    consultValue.max !== null ? parseFloat(consultValue.max) : null
  );
  
  return status !== "normal";
};

export {
  normalizeValue,
  checkIfAbnormal,
  getValueStatus
}; 