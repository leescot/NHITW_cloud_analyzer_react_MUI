// background.js
// 監聽藥歷 API 請求

// Modify currentSessionData to include new data types
let currentSessionData = {
  medicationData: null,
  labData: null,
  chinesemedData: null,
  imagingData: null,
  allergyData: null,     // New
  surgeryData: null,     // New
  dischargeData: null,   // New
  medDaysData: null,     // New
  patientSummaryData: null, // Patient summary data
  token: null,
  currentUserSession: null
};

// 定義 API 端點和對應的數據類型
const API_ENDPOINTS = {
  allergy: "medcloud2.nhi.gov.tw/imu/api/imue0040/imue0040s02/get-data",
  surgery: "medcloud2.nhi.gov.tw/imu/api/imue0020/imue0020s02/get-data",
  discharge: "medcloud2.nhi.gov.tw/imu/api/imue0070/imue0070s02/get-data",
  medDays: "medcloud2.nhi.gov.tw/imu/api/imue0120/imue0120s01/pres-med-day",
  patientSummary: "medcloud2.nhi.gov.tw/imu/api/imue2000/imue2000s01/get-summary",  // New endpoint
  chinesemed: "medcloud2.nhi.gov.tw/imu/api/imue0090/imue0090s02/get-data",
  imaging: "medcloud2.nhi.gov.tw/imu/api/imue0130/imue0130s02/get-data",
  medication: "medcloud2.nhi.gov.tw/imu/api/imue0008/imue0008s02/get-data",
  labdata: "medcloud2.nhi.gov.tw/imu/api/imue0060/imue0060s02/get-data"
};

// Add listeners for all API endpoints
Object.entries(API_ENDPOINTS).forEach(([type, endpoint]) => {
  chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
      if (details.method === "GET" && details.url.includes(endpoint)) {
        // console.log(`Detected ${type} API request:`, details.url);
        chrome.tabs.sendMessage(details.tabId, {
          action: "apiCallDetected",
          url: details.url,
          type: type
        });
      }
      return { cancel: false };
    },
    { urls: [`https://${endpoint}*`] },
    ["requestBody"]
  );

  chrome.webRequest.onCompleted.addListener(
    function(details) {
      if (details.method === "GET" && details.url.includes(endpoint)) {
        // console.log(`Completed ${type} API request:`, details.url);
        chrome.tabs.sendMessage(details.tabId, {
          action: "apiCallCompleted",
          url: details.url,
          statusCode: details.statusCode,
          type: type
        });
      }
    },
    { urls: [`https://${endpoint}*`] },
    ["responseHeaders"]
  );
});

// 數據類型與對應的 storage 鍵值映射
const DATA_TYPE_TO_STORAGE_KEY = {
  'medication': 'medicationData',
  'labdata': 'labData',
  'chinesemed': 'chinesemedData',
  'imaging': 'imagingData',
  'allergy': 'allergyData',
  'surgery': 'surgeryData',
  'discharge': 'dischargeData',
  'medDays': 'medDaysData',
  'patientSummary': 'patientSummaryData'
};

// 動作與處理函數的映射
const ACTION_HANDLERS = new Map([
  ['openPopup', (message, sender, sendResponse) => {
    chrome.action.openPopup();
    sendResponse({ status: "received" });
  }],
  
  ['userSessionChanged', (message, sender, sendResponse) => {
    // console.log("User session changed, resetting temporary data");
    // 重設當前會話數據
    Object.keys(currentSessionData).forEach(key => {
      currentSessionData[key] = null;
    });
    currentSessionData.currentUserSession = message.userSession;

    // 從 storage 中移除數據
    chrome.storage.local.remove(Object.values(DATA_TYPE_TO_STORAGE_KEY), function() {
      // console.log("Storage data cleared due to user session change");
      chrome.action.setBadgeText({ text: "" });
    });

    sendResponse({ status: "session_reset" });
  }],
  
  ['clearSessionData', (message, sender, sendResponse) => {
    // console.log("Clearing session data");
    // 重設當前會話數據
    Object.keys(currentSessionData).forEach(key => {
      currentSessionData[key] = null;
    });
    sendResponse({ status: "cleared" });
  }],
  
  ['getSessionData', (message, sender, sendResponse) => {
    // console.log("Background script received request for session data");
    sendResponse({
      status: "success",
      data: currentSessionData
    });
  }],
  
  ['getDataStatus', (message, sender, sendResponse) => {
    // 擷取存儲的所有數據狀態
    chrome.storage.local.get(Object.values(DATA_TYPE_TO_STORAGE_KEY), (result) => {
      // console.log("STORAGE DATA DEBUG:", result);
      const dataStatus = {};

      // 處理所有數據類型
      const processDataType = (typeKey, storageKey) => {
        const dataObj = result[storageKey];
        // 處理大小寫不一致的情況
        const records = dataObj?.rObject || dataObj?.robject;
        
        if (records && Array.isArray(records)) {
          dataStatus[typeKey] = {
            status: 'fetched',
            count: records.length
          };
        } else {
          dataStatus[typeKey] = { status: 'none', count: 0 };
        }
      };

      // 映射數據類型到 UI 顯示名稱
      const displayNameMap = {
        'medication': 'medication',
        'labdata': 'labData',
        'chinesemed': 'chineseMed',
        'imaging': 'imaging',
        'allergy': 'allergy',
        'surgery': 'surgery',
        'discharge': 'discharge',
        'medDays': 'medDays',
        'patientSummary': 'patientSummary'
      };

      // 處理每個數據類型
      Object.entries(DATA_TYPE_TO_STORAGE_KEY).forEach(([type, storageKey]) => {
        const displayName = displayNameMap[type] || type;
        processDataType(displayName, storageKey);
      });

      sendResponse({ dataStatus });
    });
    return true; // 保持消息通道開放以進行異步響應
  }],
  
  // 使用通用處理函數處理所有數據保存操作
  ['saveMedicationData', saveDataHandler('medication')],
  ['saveLabData', saveDataHandler('labdata')],
  ['saveChineseMedData', saveDataHandler('chinesemed')],
  ['saveImagingData', saveDataHandler('imaging')],
  ['saveAllergyData', saveDataHandler('allergy')],
  ['saveSurgeryData', saveDataHandler('surgery')],
  ['saveDischargeData', saveDataHandler('discharge')],
  ['saveMedDaysData', saveDataHandler('medDays')],
  ['savePatientSummaryData', saveDataHandler('patientSummary')],
  
  ['saveToken', (message, sender, sendResponse) => {
    // console.log("Background script received token to save");
    currentSessionData.token = message.token;
    currentSessionData.currentUserSession = message.userSession || currentSessionData.currentUserSession;
    sendResponse({ status: "token_saved" });
  }]
]);

// 通用數據保存處理函數
function saveDataHandler(type) {
  return function(message, sender, sendResponse) {
    const storageKey = DATA_TYPE_TO_STORAGE_KEY[type];
    if (!storageKey) {
      sendResponse({
        status: "error",
        error: `Invalid data type: ${type}`
      });
      return;
    }

    // console.log(`Background script received ${type} data to save`);
    
    // 更新當前會話數據
    currentSessionData[storageKey] = message.data;
    currentSessionData.currentUserSession = message.userSession || currentSessionData.currentUserSession;

    // 保存到 storage
    const storageObj = {
      [storageKey]: message.data,
      currentUserSession: message.userSession || currentSessionData.currentUserSession
    };

    chrome.storage.local.set(storageObj, function() {
      // console.log(`${type} data saved to storage`);
      chrome.action.setBadgeText({ text: "✓" });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

      if (message.data && message.data.rObject && Array.isArray(message.data.rObject)) {
        sendResponse({
          status: "saved",
          recordCount: message.data.rObject.length
        });
      } else {
        sendResponse({
          status: "saved",
          recordCount: 0,
          error: "Invalid data format"
        });
      }
    });
  };
}

// 監聽來自 content script 的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 檢查是否有會話變更
  if (message.userSession && message.userSession !== currentSessionData.currentUserSession) {
    // console.log("User session changed, resetting temporary data");
    // 重設當前會話數據
    Object.keys(currentSessionData).forEach(key => {
      currentSessionData[key] = null;
    });
    currentSessionData.currentUserSession = message.userSession;
  }

  // 查找並執行對應的處理函數
  const handler = ACTION_HANDLERS.get(message.action);
  if (handler) {
    handler(message, sender, sendResponse);
    return true; // 保持消息通道開放以進行異步響應
  }

  sendResponse({ status: "received" });
  return true;
});

// 監聽登出事件（例如通過偵測特定頁面變化）
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && (
      changeInfo.url.includes('medcloud2.nhi.gov.tw/imu/login') ||
      changeInfo.url.includes('medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0001'))) {
    console.log("Detected navigation to login page, clearing session data");

    // 重設當前會話數據
    Object.keys(currentSessionData).forEach(key => {
      currentSessionData[key] = null;
    });

    // 從 storage 中移除數據
    chrome.storage.local.remove(['medicationData', 'labData', 'currentUserSession'], function() {
      console.log("Storage data cleared due to logout");
      chrome.action.setBadgeText({ text: "" });
    });
  }
});

// 通用數據保存函數
function saveDataToStorage(type, data, userSession) {
  const storageKey = DATA_TYPE_TO_STORAGE_KEY[type.toLowerCase()] || type + 'Data';

  // 更新會話數據
  currentSessionData[storageKey] = data;
  currentSessionData.currentUserSession = userSession || currentSessionData.currentUserSession;

  // 創建 storage 對象
  const storageObj = {
    [storageKey]: data,
    currentUserSession: userSession || currentSessionData.currentUserSession
  };

  // console.log(`Saving ${type} data to storage with key ${storageKey}:`,
  //   data?.rObject ? `${data.rObject.length} records` : 'No records or invalid format');

  return new Promise((resolve) => {
    chrome.storage.local.set(storageObj, function() {
      // console.log(`${type} data saved to storage with key ${storageKey}`);
      chrome.action.setBadgeText({ text: "✓" });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

      const recordCount = (data?.rObject && Array.isArray(data.rObject)) ? data.rObject.length : 0;

      resolve({
        status: "saved",
        recordCount: recordCount,
        error: recordCount ? null : "Zero records or invalid format"
      });
    });
  });
}