// testMode.js - 測試模式相關功能

/**
 * 確保測試數據被正確加載到全局變量中
 * 這個函數會從 Chrome 的 storage 中獲取所有測試數據，並設置到對應的全局變量中
 */
export function ensureTestDataLoaded() {
  console.log("檢查測試數據是否已正確加載");
  
  // 從 storage 中獲取所有測試數據
  chrome.storage.local.get([
    'medicationData', 
    'labData', 
    'chinesemedData', 
    'imagingData',
    'allergyData',
    'surgeryData',
    'dischargeData',
    'medDaysData',
    'patientSummaryData'
  ], (data) => {
    console.log("從 storage 獲取的所有測試數據:", Object.keys(data));
    
    // 設置到全局變數
    if (data.medicationData) {
      window.lastInterceptedMedicationData = data.medicationData;
      console.log("設置藥歷測試數據:", 
        Array.isArray(data.medicationData) ? data.medicationData.length : 
        (data.medicationData.rObject ? data.medicationData.rObject.length : "無數據"));
    }
    
    if (data.labData) {
      window.lastInterceptedLabData = data.labData;
      console.log("設置檢驗測試數據:", 
        Array.isArray(data.labData) ? data.labData.length : 
        (data.labData.rObject ? data.labData.rObject.length : "無數據"));
    }
    
    if (data.chinesemedData) {
      window.lastInterceptedChineseMedData = data.chinesemedData;
      console.log("設置中醫用藥測試數據:", 
        Array.isArray(data.chinesemedData) ? data.chinesemedData.length : 
        (data.chinesemedData.rObject ? data.chinesemedData.rObject.length : "無數據"));
    }
    
    if (data.imagingData) {
      window.lastInterceptedImagingData = data.imagingData;
      console.log("設置影像測試數據:", 
        Array.isArray(data.imagingData) ? data.imagingData.length : 
        (data.imagingData.rObject ? data.imagingData.rObject.length : "無數據"));
    }
    
    if (data.allergyData) {
      window.lastInterceptedAllergyData = data.allergyData;
      console.log("設置過敏測試數據:", 
        Array.isArray(data.allergyData) ? data.allergyData.length : 
        (data.allergyData.rObject ? data.allergyData.rObject.length : "無數據"));
    }
    
    if (data.surgeryData) {
      window.lastInterceptedSurgeryData = data.surgeryData;
      console.log("設置手術測試數據:", 
        Array.isArray(data.surgeryData) ? data.surgeryData.length : 
        (data.surgeryData.rObject ? data.surgeryData.rObject.length : "無數據"));
    }
    
    if (data.dischargeData) {
      window.lastInterceptedDischargeData = data.dischargeData;
      console.log("設置出院測試數據:", 
        Array.isArray(data.dischargeData) ? data.dischargeData.length : 
        (data.dischargeData.rObject ? data.dischargeData.rObject.length : "無數據"));
    }
    
    if (data.medDaysData) {
      window.lastInterceptedMedDaysData = data.medDaysData;
      console.log("設置用藥天數測試數據:", 
        Array.isArray(data.medDaysData) ? data.medDaysData.length : 
        (data.medDaysData.rObject ? data.medDaysData.rObject.length : "無數據"));
    }

    if (data.patientSummaryData) {
      window.lastInterceptedPatientSummaryData = data.patientSummaryData;
      console.log("設置病患摘要測試數據:", 
        Array.isArray(data.patientSummaryData) ? data.patientSummaryData.length : 
        (data.patientSummaryData.rObject ? data.patientSummaryData.rObject.length : 
        (data.patientSummaryData.robject ? data.patientSummaryData.robject.length : "無數據")));
    }
    
    // 觸發數據處理完成事件
    window.dispatchEvent(new CustomEvent('dataFetchCompleted', { detail: null }));
    console.log("已觸發 dataFetchCompleted 事件");
    
    // 通知 background.js 更新數據狀態
    chrome.runtime.sendMessage({ action: "updateDataStatus" }, (response) => {
      console.log("數據狀態更新回應:", response);
    });
    
    // 顯示通知
    showTestDataNotification("已成功載入測試數據，請重新整理頁面以顯示");
  });
}

/**
 * 顯示測試數據載入通知
 * @param {string} message - 通知訊息
 */
function showTestDataNotification(message) {
  // 檢查是否支援通知 API
  if (!("Notification" in window)) {
    console.log("此瀏覽器不支援通知");
    return;
  }

  // 檢查通知權限
  if (Notification.permission === "granted") {
    // 已獲得權限，顯示通知
    new Notification("健保雲端資料擷取器", {
      body: message,
      icon: chrome.runtime.getURL("images/icon128.png")
    });
  } else if (Notification.permission !== "denied") {
    // 請求權限
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("健保雲端資料擷取器", {
          body: message,
          icon: chrome.runtime.getURL("images/icon128.png")
        });
      }
    });
  }
}

/**
 * 處理測試數據載入消息
 * 當 background.js 發送測試數據載入消息時，調用此函數
 * @param {Object} message - 消息對象
 */
export function handleTestDataMessage(message) {
  if (message.action === "testDataLoaded") {
    console.log("收到測試數據載入消息:", message);
    ensureTestDataLoaded();
    return true;
  }
  
  if (message.action === "testDataTypeLoaded") {
    console.log("收到特定類型測試數據載入消息:", message);
    // 從 storage 中獲取特定類型的測試數據
    chrome.storage.local.get([message.storageKey], (data) => {
      if (data[message.storageKey]) {
        // 根據數據類型設置對應的全局變量
        switch(message.dataType) {
          case 'medication':
            window.lastInterceptedMedicationData = data[message.storageKey];
            break;
          case 'lab':
            window.lastInterceptedLabData = data[message.storageKey];
            break;
          case 'chinesemed':
            window.lastInterceptedChineseMedData = data[message.storageKey];
            break;
          case 'imaging':
            window.lastInterceptedImagingData = data[message.storageKey];
            break;
          case 'allergy':
            window.lastInterceptedAllergyData = data[message.storageKey];
            break;
          case 'surgery':
            window.lastInterceptedSurgeryData = data[message.storageKey];
            break;
          case 'discharge':
            window.lastInterceptedDischargeData = data[message.storageKey];
            break;
          case 'medDays':
            window.lastInterceptedMedDaysData = data[message.storageKey];
            break;
          case 'patientSummary':
            window.lastInterceptedPatientSummaryData = data[message.storageKey];
            break;
        }
        
        // 觸發數據處理完成事件
        window.dispatchEvent(new CustomEvent('dataFetchCompleted', { detail: null }));
        console.log(`已載入 ${message.dataType} 測試數據並觸發事件`);
        
        // 通知 background.js 更新數據狀態
        chrome.runtime.sendMessage({ action: "updateDataStatus" }, (response) => {
          console.log("數據狀態更新回應:", response);
        });
      }
    });
    return true;
  }
  
  return false;
}
