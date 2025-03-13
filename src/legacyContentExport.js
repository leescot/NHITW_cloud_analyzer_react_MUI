// legacyContentExport.js - 導出 legacyContent.js 的功能

// 導入測試模式模組
import * as testMode from './modules/testMode.js';
// 導入環境檢測工具
import { detectEnvironment, initGlobalVariables } from './utils/environmentDetector.js';

// 初始化函數
export function initLegacyContent() {
  console.log("初始化舊版內容腳本");
  
  // 檢測當前環境
  const { isRealEnvironment, isTestEnvironment, environmentType } = detectEnvironment();
  console.log(`當前環境類型: ${environmentType}`);
  
  // 初始化全局變數
  initGlobalVariables();
  
  // 在真實環境中，直接執行初始化
  if (isRealEnvironment) {
    console.log("在真實環境中初始化");
    // 直接嘗試執行 initialize 函數（如果存在）
    if (typeof window.initialize === 'function') {
      window.initialize();
    } else {
      console.log("找不到 initialize 函數，嘗試直接載入 legacyContent.js");
      // 這裡不需要做什麼，因為 contentScript.jsx 已經處理了載入 legacyContent.js
    }
  } 
  // 在測試環境中，檢查開發模式並載入測試數據
  else if (isTestEnvironment) {
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
  }
  
  // 設置事件監聽器
  setupEventListeners();
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
    
    // 檢查是否有測試數據
    const hasTestData = checkForTestData();
    
    if (hasTestData) {
      console.log("檢測到測試數據，開始更新 UI");
      updateUIWithTestData();
    } else {
      console.log("沒有檢測到測試數據");
    }
  });
}

/**
 * 檢查是否有測試數據
 * @returns {boolean} - 是否有測試數據
 */
function checkForTestData() {
  return !!(
    window.lastInterceptedMedicationData || 
    window.lastInterceptedLabData || 
    window.lastInterceptedChineseMedData || 
    window.lastInterceptedImagingData ||
    window.lastInterceptedAllergyData ||
    window.lastInterceptedSurgeryData ||
    window.lastInterceptedDischargeData ||
    window.lastInterceptedMedDaysData ||
    window.lastInterceptedPatientSummaryData
  );
}

/**
 * 使用測試數據更新 UI
 */
function updateUIWithTestData() {
  // 創建一個自定義事件，通知頁面上的組件更新 UI
  const updateEvent = new CustomEvent('updateUIWithTestData', {
    detail: {
      medicationData: window.lastInterceptedMedicationData,
      labData: window.lastInterceptedLabData,
      chineseMedData: window.lastInterceptedChineseMedData,
      imagingData: window.lastInterceptedImagingData,
      allergyData: window.lastInterceptedAllergyData,
      surgeryData: window.lastInterceptedSurgeryData,
      dischargeData: window.lastInterceptedDischargeData,
      medDaysData: window.lastInterceptedMedDaysData,
      patientSummaryData: window.lastInterceptedPatientSummaryData
    }
  });
  
  // 觸發事件
  window.dispatchEvent(updateEvent);
  console.log("已觸發 UI 更新事件");
  
  // 嘗試直接更新頁面上的元素
  setTimeout(() => {
    try {
      // 查找頁面上可能存在的數據容器並更新
      updateDataContainers();
    } catch (error) {
      console.error("直接更新 UI 元素時出錯:", error);
    }
  }, 100);
}

/**
 * 更新頁面上的數據容器
 */
function updateDataContainers() {
  // 查找頁面上的數據容器
  const containers = document.querySelectorAll('[data-container-type]');
  
  if (containers.length === 0) {
    console.log("找不到數據容器，可能需要創建新的容器");
    // 如果需要，可以在這裡添加創建新容器的邏輯
  }
  
  // 遍歷所有容器並更新
  containers.forEach(container => {
    const containerType = container.getAttribute('data-container-type');
    let data = null;
    
    // 根據容器類型獲取對應的數據
    switch (containerType) {
      case 'medication':
        data = window.lastInterceptedMedicationData;
        break;
      case 'lab':
        data = window.lastInterceptedLabData;
        break;
      case 'chinesemed':
        data = window.lastInterceptedChineseMedData;
        break;
      case 'imaging':
        data = window.lastInterceptedImagingData;
        break;
      case 'allergy':
        data = window.lastInterceptedAllergyData;
        break;
      case 'surgery':
        data = window.lastInterceptedSurgeryData;
        break;
      case 'discharge':
        data = window.lastInterceptedDischargeData;
        break;
      case 'medDays':
        data = window.lastInterceptedMedDaysData;
        break;
      case 'patientSummary':
        data = window.lastInterceptedPatientSummaryData;
        break;
    }
    
    // 如果有數據，更新容器
    if (data) {
      console.log(`更新 ${containerType} 容器的數據`);
      // 觸發容器的更新方法或事件
      container.dispatchEvent(new CustomEvent('updateData', { detail: data }));
    }
  });
}

// 導出其他可能需要的函數
export { testMode, checkForTestData, updateUIWithTestData };
