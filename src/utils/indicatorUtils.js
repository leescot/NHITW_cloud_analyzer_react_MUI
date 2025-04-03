// 從患者摘要資料中提取 GFR 值
export const extractGFRValue = (patientSummaryData) => {
  if (!patientSummaryData || patientSummaryData.length === 0) return null;

  // Search through all summary items
  for (const item of patientSummaryData) {
    if (!item.originalText) continue;

    // Look for the GFR text pattern
    const gfrPattern = /最近一筆eGFR值為\[(\d+)\]/;
    const match = item.originalText.match(gfrPattern);

    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  return null;
};

// 根據 GFR 值確定 CKD 階段
export const getCKDStage = (gfrValue) => {
  if (gfrValue === null) return null;

  // 使用 Map 定義 GFR 範圍與對應的 CKD 階段
  const ckdStageMap = new Map([
    [(value) => value >= 30 && value < 60, 3],
    [(value) => value >= 15 && value < 30, 4],
    [(value) => value < 15, 5]
  ]);

  // 尋找匹配的 CKD 階段
  for (const [condition, stage] of ckdStageMap) {
    if (condition(gfrValue)) {
      return stage;
    }
  }

  return null; // 沒有 CKD 或數據不可用
};

// 檢查是否有 90 天內的影像檢查的通用函數
const hasRecentScan = (imagingData, orderCodes) => {
  if (!imagingData || (!imagingData.withReport && !imagingData.withoutReport)) {
    return false;
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // 檢查有報告的影像
  const hasInReports = imagingData.withReport.some(item => {
    const scanDate = new Date(item.date);
    return orderCodes.includes(item.order_code) && scanDate >= ninetyDaysAgo;
  });

  // 檢查無報告的影像
  const hasInPending = imagingData.withoutReport.some(item => {
    const scanDate = new Date(item.date);
    return orderCodes.includes(item.order_code) && scanDate >= ninetyDaysAgo;
  });

  return hasInReports || hasInPending;
};

// 檢查是否有 90 天內的 CT 檢查
export const hasRecentCTScan = (imagingData) => {
  const ctOrderCodes = ['33072B', '33070B'];
  return hasRecentScan(imagingData, ctOrderCodes);
};

// 檢查是否有 90 天內的 MRI 檢查
export const hasRecentMRIScan = (imagingData) => {
  const mriOrderCodes = ['33085B', '33084B'];
  return hasRecentScan(imagingData, mriOrderCodes);
};