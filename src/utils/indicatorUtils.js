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
  
  if (gfrValue >= 30 && gfrValue < 60) {
    return 3;
  } else if (gfrValue >= 15 && gfrValue < 30) {
    return 4;
  } else if (gfrValue < 15) {
    return 5;
  }
  
  return null; // No CKD or data not available
};

// 檢查是否有 90 天內的 CT 檢查
export const hasRecentCTScan = (imagingData) => {
  if (!imagingData || (!imagingData.withReport && !imagingData.withoutReport)) {
    return false;
  }
  
  const ctOrderCodes = ['33072B', '33070B'];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  // 檢查有報告的影像
  const hasCtInReports = imagingData.withReport.some(item => {
    const scanDate = new Date(item.date);
    return ctOrderCodes.includes(item.order_code) && scanDate >= ninetyDaysAgo;
  });
  
  // 檢查無報告的影像
  const hasCtInPending = imagingData.withoutReport.some(item => {
    const scanDate = new Date(item.date);
    return ctOrderCodes.includes(item.order_code) && scanDate >= ninetyDaysAgo;
  });
  
  return hasCtInReports || hasCtInPending;
};

// 檢查是否有 90 天內的 MRI 檢查
export const hasRecentMRIScan = (imagingData) => {
  if (!imagingData || (!imagingData.withReport && !imagingData.withoutReport)) {
    return false;
  }
  
  const mriOrderCodes = ['33085B', '33084B'];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  // 檢查有報告的影像
  const hasMriInReports = imagingData.withReport.some(item => {
    const scanDate = new Date(item.date);
    return mriOrderCodes.includes(item.order_code) && scanDate >= ninetyDaysAgo;
  });
  
  // 檢查無報告的影像
  const hasMriInPending = imagingData.withoutReport.some(item => {
    const scanDate = new Date(item.date);
    return mriOrderCodes.includes(item.order_code) && scanDate >= ninetyDaysAgo;
  });
  
  return hasMriInReports || hasMriInPending;
}; 