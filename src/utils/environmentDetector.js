// environmentDetector.js - 環境檢測工具

/**
 * 檢測當前運行環境
 * @returns {Object} 包含環境類型的對象
 */
export function detectEnvironment() {
  const isRealEnvironment = window.location.href.includes("medcloud2.nhi.gov.tw");
  const isTestEnvironment = window.location.href.includes("nhitw-mock-api.vercel.app") || 
                           window.location.href.includes("localhost");
  
  return {
    isRealEnvironment,
    isTestEnvironment,
    environmentType: isRealEnvironment ? "real" : (isTestEnvironment ? "test" : "unknown")
  };
}

/**
 * 初始化全局變數
 */
export function initGlobalVariables() {
  // 確保所有全局變數都已定義
  if (typeof window.lastInterceptedMedicationData === 'undefined') {
    window.lastInterceptedMedicationData = null;
  }
  
  if (typeof window.lastInterceptedLabData === 'undefined') {
    window.lastInterceptedLabData = null;
  }
  
  if (typeof window.lastInterceptedChineseMedData === 'undefined') {
    window.lastInterceptedChineseMedData = null;
  }
  
  if (typeof window.lastInterceptedImagingData === 'undefined') {
    window.lastInterceptedImagingData = null;
  }
  
  if (typeof window.lastInterceptedAllergyData === 'undefined') {
    window.lastInterceptedAllergyData = null;
  }
  
  if (typeof window.lastInterceptedSurgeryData === 'undefined') {
    window.lastInterceptedSurgeryData = null;
  }
  
  if (typeof window.lastInterceptedDischargeData === 'undefined') {
    window.lastInterceptedDischargeData = null;
  }
  
  if (typeof window.lastInterceptedMedDaysData === 'undefined') {
    window.lastInterceptedMedDaysData = null;
  }
  
  if (typeof window.lastInterceptedPatientSummaryData === 'undefined') {
    window.lastInterceptedPatientSummaryData = null;
  }
}
