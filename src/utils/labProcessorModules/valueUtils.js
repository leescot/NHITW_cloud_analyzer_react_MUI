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

  // 使用 Map 來處理不同的邊界條件
  const statusChecks = new Map([
    // 有上下限
    [() => min !== null && max !== null, () => {
      if (numValue < min) return "low";
      if (numValue > max) return "high";
      return "normal";
    }],
    // 只有下限
    [() => min !== null && max === null, () => numValue < min ? "low" : "normal"],
    // 只有上限
    [() => min === null && max !== null, () => numValue > max ? "high" : "normal"],
    // 預設情況 (不應該達到這裡，因為前面已經處理了所有情況)
    [() => true, () => "normal"]
  ]);

  // 尋找符合條件的檢查函數並執行
  for (const [condition, statusFn] of statusChecks) {
    if (condition()) {
      return statusFn();
    }
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