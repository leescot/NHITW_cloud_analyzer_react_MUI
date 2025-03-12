// legacyContentExport.js - 導出 legacyContent.js 的功能

// 導入測試模式模組
import * as testMode from './modules/testMode.js';

// 初始化函數
export function initLegacyContent() {
  console.log("初始化舊版內容腳本");
  
  // 檢查是否為測試模式
  chrome.storage.sync.get(['devMode'], (result) => {
    const devMode = result.devMode || false;
    console.log("當前開發模式狀態:", devMode);
    
    if (devMode) {
      console.log("在開發模式下，嘗試載入測試數據");
      // 使用測試模式模組的 ensureTestDataLoaded 函數
      testMode.ensureTestDataLoaded();
    }
  });
  
  // 設置事件監聽器
  setupEventListeners();
  
  // 初始化全局變數
  initGlobalVariables();
}

// 設置事件監聽器
function setupEventListeners() {
  console.log("設置事件監聽器");
  
  // 監聽數據處理完成事件
  window.addEventListener('dataFetchCompleted', (event) => {
    console.log("數據處理完成事件被觸發:", event.detail);
    
    // 通知 background.js 更新數據狀態
    chrome.runtime.sendMessage({ action: "updateDataStatus" }, (response) => {
      console.log("數據狀態更新回應:", response);
    });
  });
  
  // 監聽數據狀態更新事件
  window.addEventListener('dataStatusUpdated', () => {
    console.log("數據狀態已更新，準備更新 UI");
    // 在這裡添加更新 UI 的邏輯
  });
}

// 初始化全局變數
function initGlobalVariables() {
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

// 導出其他可能需要的函數
export { testMode };
