// background.js
// 監聽藥歷 API 請求

// 添加開發模式設定
let devMode = false;
let currentTestDataId = '';
// 根據環境使用不同的 API 端點
let vercelApiBaseUrl = 'http://localhost:3000/api';

// 初始化時獲取設定
chrome.storage.sync.get(['devMode', 'currentTestDataId', 'useLocalApi'], (result) => {
  devMode = result.devMode || false;
  currentTestDataId = result.currentTestDataId || '';
  // 如果設定為使用本地 API，則使用 localhost，否則使用 Vercel 部署的 API
  vercelApiBaseUrl = result.useLocalApi ? 'http://localhost:3000/api' : 'https://nhitw-mock-api.vercel.app/api';
  console.log('初始化開發模式設定:', devMode, currentTestDataId, '使用 API:', vercelApiBaseUrl);
});

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

const API_ENDPOINTS = {
  allergy: "medcloud2.nhi.gov.tw/imu/api/imue0040/imue0040s02/get-data",
  surgery: "medcloud2.nhi.gov.tw/imu/api/imue0020/imue0020s02/get-data",
  discharge: "medcloud2.nhi.gov.tw/imu/api/imue0070/imue0070s02/get-data",
  medDays: "medcloud2.nhi.gov.tw/imu/api/imue0120/imue0120s01/pres-med-day",
  patientSummary: "medcloud2.nhi.gov.tw/imu/api/imue2000/imue2000s01/get-summary"  // New endpoint
};

// 添加開發模式 API 端點
const DEV_API_ENDPOINTS = {
  medication: "nhitw-mock-api.vercel.app/api/data/current?type=medication",
  labdata: "nhitw-mock-api.vercel.app/api/data/current?type=labdata",
  chinesemed: "nhitw-mock-api.vercel.app/api/data/current?type=chinesemed",
  imaging: "nhitw-mock-api.vercel.app/api/data/current?type=imaging",
  allergy: "nhitw-mock-api.vercel.app/api/data/current?type=allergy",
  surgery: "nhitw-mock-api.vercel.app/api/data/current?type=surgery",
  discharge: "nhitw-mock-api.vercel.app/api/data/current?type=discharge",
  medDays: "nhitw-mock-api.vercel.app/api/data/current?type=medDays",
  patientSummary: "nhitw-mock-api.vercel.app/api/data/current?type=patientSummary"
};

// 獲取當前使用的 API 端點
function getApiEndpoint(type) {
  if (devMode) {
    return DEV_API_ENDPOINTS[type] || API_ENDPOINTS[type];
  }
  return API_ENDPOINTS[type];
}

// Add listeners for new endpoints
Object.entries(API_ENDPOINTS).forEach(([type, endpoint]) => {
  chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
      if (details.method === "GET" && details.url.includes(endpoint)) {
        console.log(`Detected ${type} API request:`, details.url);
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
        console.log(`Completed ${type} API request:`, details.url);
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


chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.method === "GET" && 
        details.url.includes("medcloud2.nhi.gov.tw/imu/api/imue0090/imue0090s02/get-data")) {
      // console.log("Detected Chinese medicine API request:", details.url);
      chrome.tabs.sendMessage(details.tabId, {
        action: "apiCallDetected",
        url: details.url,
        type: "chinesemed"
      });
    }
    return { cancel: false };
  },
  { urls: ["https://medcloud2.nhi.gov.tw/imu/api/imue0090/imue0090s02/get-data*"] },
  ["requestBody"]
);

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.method === "GET" && 
        details.url.includes("medcloud2.nhi.gov.tw/imu/api/imue0130/imue0130s02/get-data")) {
      // console.log("Detected imaging API request:", details.url);
      chrome.tabs.sendMessage(details.tabId, {
        action: "apiCallDetected",
        url: details.url,
        type: "imaging"
      });
    }
    return { cancel: false };
  },
  { urls: ["https://medcloud2.nhi.gov.tw/imu/api/imue0130/imue0130s02/get-data*"] },
  ["requestBody"]
);

// Add completion listeners for new APIs
chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.method === "GET" && 
        details.url.includes("medcloud2.nhi.gov.tw/imu/api/imue0090/imue0090s02/get-data")) {
      // console.log("Completed Chinese medicine API request:", details.url);
      chrome.tabs.sendMessage(details.tabId, {
        action: "apiCallCompleted",
        url: details.url,
        statusCode: details.statusCode,
        type: "chinesemed"
      });
    }
  },
  { urls: ["https://medcloud2.nhi.gov.tw/imu/api/imue0090/imue0090s02/get-data*"] },
  ["responseHeaders"]
);

chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.method === "GET" && 
        details.url.includes("medcloud2.nhi.gov.tw/imu/api/imue0130/imue0130s02/get-data")) {
      // console.log("Completed imaging API request:", details.url);
      chrome.tabs.sendMessage(details.tabId, {
        action: "apiCallCompleted",
        url: details.url,
        statusCode: details.statusCode,
        type: "imaging"
      });
    }
  },
  { urls: ["https://medcloud2.nhi.gov.tw/imu/api/imue0130/imue0130s02/get-data*"] },
  ["responseHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.method === "GET" && 
        details.url.includes("medcloud2.nhi.gov.tw/imu/api/imue0008/imue0008s02/get-data")) {
      // console.log("Detected medication history API request:", details.url);
      chrome.tabs.sendMessage(details.tabId, {
        action: "apiCallDetected",
        url: details.url,
        type: "medication"
      });
    }
    return { cancel: false };
  },
  { urls: ["https://medcloud2.nhi.gov.tw/imu/api/imue0008/imue0008s02/get-data*"] },
  ["requestBody"]
);

// 監聽檢驗資料 API 請求
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.method === "GET" && 
        details.url.includes("medcloud2.nhi.gov.tw/imu/api/imue0060/imue0060s02/get-data")) {
      // console.log("Detected lab data API request:", details.url);
      chrome.tabs.sendMessage(details.tabId, {
        action: "apiCallDetected",
        url: details.url,
        type: "labdata"
      });
    }
    return { cancel: false };
  },
  { urls: ["https://medcloud2.nhi.gov.tw/imu/api/imue0060/imue0060s02/get-data*"] },
  ["requestBody"]
);

// 監聽藥歷 API 請求完成
chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.method === "GET" && 
        details.url.includes("medcloud2.nhi.gov.tw/imu/api/imue0008/imue0008s02/get-data")) {
      // console.log("Completed medication history API request:", details.url, "Status:", details.statusCode);
      
      chrome.tabs.sendMessage(details.tabId, {
        action: "apiCallCompleted",
        url: details.url,
        statusCode: details.statusCode,
        type: "medication"
      });
    }
  },
  { urls: ["https://medcloud2.nhi.gov.tw/imu/api/imue0008/imue0008s02/get-data*"] },
  ["responseHeaders"]
);

// 監聽檢驗資料 API 請求完成
chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.method === "GET" && 
        details.url.includes("medcloud2.nhi.gov.tw/imu/api/imue0060/imue0060s02/get-data")) {
      // console.log("Completed lab data API request:", details.url, "Status:", details.statusCode);
      
      chrome.tabs.sendMessage(details.tabId, {
        action: "apiCallCompleted",
        url: details.url,
        statusCode: details.statusCode,
        type: "labdata"
      });
    }
  },
  { urls: ["https://medcloud2.nhi.gov.tw/imu/api/imue0060/imue0060s02/get-data*"] },
  ["responseHeaders"]
);

// Monitor patient summary API requests
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.method === "GET" && 
        details.url.includes("medcloud2.nhi.gov.tw/imu/api/imue2000/imue2000s01/get-summary")) {
      // console.log("Detected patient summary API request:", details.url);
      chrome.tabs.sendMessage(details.tabId, {
        action: "apiCallDetected",
        url: details.url,
        type: "patientSummary"
      });
    }
    return { cancel: false };
  },
  { urls: ["https://medcloud2.nhi.gov.tw/imu/api/imue2000/imue2000s01/get-summary*"] },
  ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.method === "GET" && 
        details.url.includes("medcloud2.nhi.gov.tw/imu/api/imue2000/imue2000s01/get-summary")) {
      // console.log("Completed patient summary API request:", details.url);
      chrome.tabs.sendMessage(details.tabId, {
        action: "apiCallCompleted",
        url: details.url,
        statusCode: details.statusCode,
        type: "patientSummary"
      });
    }
  },
  { urls: ["https://medcloud2.nhi.gov.tw/imu/api/imue2000/imue2000s01/get-summary*"] },
  ["responseHeaders"]
);

// 監聽來自 content script 的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 處理開發模式設定更新
    if (message.action === "updateDevMode") {
      devMode = message.value;
      chrome.storage.sync.set({ devMode: message.value });
      console.log(`開發模式已${message.value ? '啟用' : '禁用'}`);
      sendResponse({ status: "success" });
      return true;
    }
    
    // 處理 API 來源更新
    if (message.action === "updateApiSource") {
      const useLocalApi = message.value;
      vercelApiBaseUrl = useLocalApi ? 'http://localhost:3000/api' : 'https://nhitw-mock-api.vercel.app/api';
      console.log(`API 來源已更新為: ${vercelApiBaseUrl}`);
      sendResponse({ status: "success" });
      return true;
    }
    
    // 處理測試數據列表請求
    if (message.action === "fetchTestDataList") {
      fetch(`${vercelApiBaseUrl}/data/list`)
        .then(res => res.json())
        .then(data => {
          sendResponse({ status: "success", data: data });
        })
        .catch(err => {
          console.error('獲取測試數據列表失敗:', err);
          sendResponse({ status: "error", error: err.message });
        });
      return true;
    }
    
    // 處理 popup 數據狀態更新
    if (message.action === "updatePopupDataStatus") {
      // 向所有打開的 popup 發送消息，通知它們更新數據狀態
      chrome.runtime.sendMessage({ action: "refreshDataStatus" });
      sendResponse({ status: "success" });
      return true;
    }
    
    // 處理測試數據 ID 更新
    if (message.action === "updateTestDataId") {
      currentTestDataId = message.value;
      chrome.storage.sync.set({ currentTestDataId: message.value });
      console.log("測試數據 ID 已更新:", message.value);
      sendResponse({ status: "test_data_id_updated" });
      return true;
    }
    
    // 處理測試模式下的數據載入請求
    if (message.action === "loadTestData") {
      if (devMode && currentTestDataId) {
        console.log("正在載入測試數據...");
        
        // 定義所有可能的數據類型及其對應的存儲鍵
        const dataTypes = {
          'medication': 'medicationData',
          'labdata': 'labData',
          'lab': 'labData',
          'chinesemed': 'chinesemedData',
          'imaging': 'imagingData',
          'allergy': 'allergyData',
          'surgery': 'surgeryData',
          'discharge': 'dischargeData',
          'medDays': 'medDaysData',
          'patientSummary': 'patientSummaryData'
        };
        
        // 構建請求 URL，請求所有數據類型
        const requestUrl = `${vercelApiBaseUrl}/data/${currentTestDataId}`;
        
        // 發送請求到 Vercel API 獲取測試數據
        fetch(requestUrl)
          .then(res => {
            if (!res.ok) {
              throw new Error(`API 請求失敗: ${res.status} ${res.statusText}`);
            }
            return res.json();
          })
          .then(data => {
            console.log("測試數據載入成功:", data);
            const loadedDataTypes = [];
            
            // 處理各種數據類型
            Object.entries(dataTypes).forEach(([apiKey, storageKey]) => {
              if (data[apiKey]) {
                currentSessionData[storageKey] = data[apiKey];
                chrome.storage.local.set({ [storageKey]: data[apiKey] });
                loadedDataTypes.push(apiKey);
                console.log(`已載入 ${apiKey} 數據`);
              }
            });
            
            // 如果沒有載入任何數據，拋出錯誤
            if (loadedDataTypes.length === 0) {
              throw new Error('沒有找到任何可用的測試數據');
            }
            
            chrome.action.setBadgeText({ text: "✓" });
            chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
            
            // 通知所有標籤頁更新數據
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach(tab => {
                if (tab.url && (tab.url.includes('nhi.gov.tw') || tab.url.includes('localhost'))) {
                  console.log(`嘗試向標籤頁 ${tab.id} 發送測試數據載入消息`);
                  chrome.tabs.sendMessage(tab.id, { 
                    action: "testDataLoaded",
                    dataTypes: loadedDataTypes
                  }).catch(err => console.log(`無法傳送訊息到標籤頁 ${tab.id}:`, err));
                }
              });
            });
            
            // 顯示通知
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'images/icon128.png',
              title: '測試數據已載入',
              message: `已成功載入 ${loadedDataTypes.length} 種測試數據`,
              buttons: [
                { title: '確定' }
              ],
              priority: 2
            });
            
            sendResponse({ 
              status: "test_data_loaded", 
              dataTypes: loadedDataTypes
            });
          })
          .catch(err => {
            console.error("測試數據載入失敗:", err);
            chrome.action.setBadgeText({ text: "!" });
            chrome.action.setBadgeBackgroundColor({ color: "#F44336" });
            
            sendResponse({ 
              status: "error", 
              error: err.message 
            });
          });
        
        return true;
      } else {
        sendResponse({ 
          status: "error", 
          error: "開發模式未啟用或未選擇測試數據" 
        });
        return true;
      }
    }
    
    // 處理獲取特定類型測試數據的請求
    if (message.action === "getTestData" && message.dataType) {
      if (devMode && currentTestDataId) {
        console.log(`正在獲取 ${message.dataType} 測試數據...`);
        
        // 構建請求 URL，只請求特定類型的數據
        const requestUrl = `${vercelApiBaseUrl}/data/current?type=${message.dataType}&id=${currentTestDataId}`;
        
        fetch(requestUrl)
          .then(res => {
            if (!res.ok) {
              throw new Error(`API 請求失敗: ${res.status} ${res.statusText}`);
            }
            return res.json();
          })
          .then(data => {
            console.log(`${message.dataType} 測試數據獲取成功:`, data);
            
            // 根據數據類型設置存儲鍵
            let storageKey;
            switch(message.dataType) {
              case 'medication': storageKey = 'medicationData'; break;
              case 'labdata': storageKey = 'labData'; break;
              case 'lab': storageKey = 'labData'; break;
              case 'chinesemed': storageKey = 'chinesemedData'; break;
              case 'imaging': storageKey = 'imagingData'; break;
              case 'allergy': storageKey = 'allergyData'; break;
              case 'surgery': storageKey = 'surgeryData'; break;
              case 'discharge': storageKey = 'dischargeData'; break;
              case 'medDays': storageKey = 'medDaysData'; break;
              case 'patientSummary': storageKey = 'patientSummaryData'; break;
              default: storageKey = `${message.dataType}Data`;
            }
            
            // 更新存儲
            if (data[message.dataType]) {
              currentSessionData[storageKey] = data[message.dataType];
              chrome.storage.local.set({ [storageKey]: data[message.dataType] });
              
              // 通知所有標籤頁更新特定類型的數據
              chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                  if (tab.url && (tab.url.includes('nhi.gov.tw') || tab.url.includes('localhost'))) {
                    console.log(`嘗試向標籤頁 ${tab.id} 發送 ${message.dataType} 數據載入消息`);
                    chrome.tabs.sendMessage(tab.id, { 
                      action: "testDataTypeLoaded",
                      dataType: message.dataType,
                      storageKey: storageKey
                    }).catch(err => console.log(`無法傳送訊息到標籤頁 ${tab.id}:`, err));
                  }
                });
              });
              
              // 顯示通知
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: '測試數據已載入',
                message: `已成功載入 ${message.dataType} 測試數據`,
                buttons: [
                  { title: '確定' }
                ],
                priority: 2
              });
              
              sendResponse({ 
                status: "success", 
                data: data[message.dataType]
              });
            } else {
              throw new Error(`找不到 ${message.dataType} 測試數據`);
            }
          })
          .catch(err => {
            console.error(`${message.dataType} 測試數據獲取失敗:`, err);
            sendResponse({ 
              status: "error", 
              error: err.message 
            });
          });
        
        return true;
      } else {
        sendResponse({ 
          status: "error", 
          error: "開發模式未啟用或未選擇測試數據" 
        });
        return true;
      }
    }

    // Add handlers for new data types
    const dataHandlers = {
      saveAllergyData: 'allergyData',
      saveSurgeryData: 'surgeryData',
      saveDischargeData: 'dischargeData',
      saveMedDaysData: 'medDaysData',
      savePatientSummaryData: 'patientSummaryData'  // Add handler for patient summary
    };

    if (message.action === 'openPopup') {
      chrome.action.openPopup(); // 開啟 popup（需 Chrome 版本支援）
    }

    if (Object.keys(dataHandlers).includes(message.action)) {
      const dataType = dataHandlers[message.action];
      // console.log(`Background script received ${dataType} to save`);
      currentSessionData[dataType] = message.data;
      currentSessionData.currentUserSession = message.userSession || currentSessionData.currentUserSession;
      
      chrome.storage.local.set({ 
        [dataType]: message.data,
        currentUserSession: message.userSession || currentSessionData.currentUserSession
      }, function() {
        // console.log(`${dataType} saved to storage`);
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
      return true;
    }

    // Add handlers for new data types
    if (message.action === "saveChineseMedData") {
      // console.log("Background script received Chinese medicine data to save");
      currentSessionData.chinesemedData = message.data;
      currentSessionData.currentUserSession = message.userSession || currentSessionData.currentUserSession;
      
      chrome.storage.local.set({ 
        chinesemedData: message.data,
        currentUserSession: message.userSession || currentSessionData.currentUserSession
      }, function() {
        // console.log("Chinese medicine data saved to storage");
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
      return true;
    }
    
    if (message.action === "saveImagingData") {
      // console.log("Background script received imaging data to save");
      currentSessionData.imagingData = message.data;
      currentSessionData.currentUserSession = message.userSession || currentSessionData.currentUserSession;
      
      chrome.storage.local.set({ 
        imagingData: message.data,
        currentUserSession: message.userSession || currentSessionData.currentUserSession
      }, function() {
        // console.log("Imaging data saved to storage");
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
      return true;
    }

  // 處理用戶會話變更，清空臨時資料
  if (message.action === "userSessionChanged") {
    // console.log("User session changed, resetting temporary data");
    currentSessionData = {
      medicationData: null,
      labData: null,
      token: null,
      currentUserSession: message.userSession
    };
    
    chrome.storage.local.remove([
      'medicationData', 
      'labData', 
      'currentUserSession'
    ], function() {
      // console.log("Storage data cleared due to user session change");
      chrome.action.setBadgeText({ text: "" });
    });
    
    sendResponse({ status: "session_reset" });
    return true;
  }

  // 處理清除會話資料請求
  if (message.action === "clearSessionData") {
    // console.log("Clearing session data");
    currentSessionData = {
      medicationData: null,
      labData: null,
      token: null,
      currentUserSession: null
    };
    sendResponse({ status: "cleared" });
    return true;
  }
  
  // 處理用戶會話變更，清空臨時資料
  if (message.userSession && message.userSession !== currentSessionData.currentUserSession) {
    // console.log("User session changed, resetting temporary data");
    currentSessionData = {
      medicationData: null,
      labData: null,
      token: null,
      currentUserSession: message.userSession
    };
  }
  
  if (message.action === "saveMedicationData") {
    // console.log("Background script received medication data to save:", 
    //             message.data && message.data.rObject ? 
    //             `${message.data.rObject.length} records` : 
    //             "Invalid data format");
    
    // 儲存到當前會話的臨時資料中
    currentSessionData.medicationData = message.data;
    currentSessionData.currentUserSession = message.userSession || currentSessionData.currentUserSession;
    
    // 同時儲存到 storage 便於 popup 讀取
    chrome.storage.local.set({ 
      medicationData: message.data,
      currentUserSession: message.userSession || currentSessionData.currentUserSession
    }, function() {
      // console.log("Medication data saved to storage");
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
    return true; // 保持通道開啟
  }
  
  // 處理檢驗資料的保存請求
  if (message.action === "saveLabData") {
    // console.log("Background script received lab data to save:", 
    //             message.data && message.data.rObject ? 
    //             `${message.data.rObject.length} records` : 
    //             "Invalid data format");
    
    // 儲存到當前會話的臨時資料中
    currentSessionData.labData = message.data;
    currentSessionData.currentUserSession = message.userSession || currentSessionData.currentUserSession;
    
    // 同時儲存到 storage 便於 popup 讀取
    chrome.storage.local.set({ 
      labData: message.data,
      currentUserSession: message.userSession || currentSessionData.currentUserSession
    }, function() {
      // console.log("Lab data saved to storage");
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
    return true; // 保持通道開啟
  }
  
  // 儲存令牌（只儲存到臨時會話）
  if (message.action === "saveToken") {
    // console.log("Background script received token to save");
    currentSessionData.token = message.token;
    currentSessionData.currentUserSession = message.userSession || currentSessionData.currentUserSession;
    sendResponse({ status: "token_saved" });
    return true;
  }
  
  // 讀取臨時會話的資料
  if (message.action === "getSessionData") {
    // console.log("Background script received request for session data");
    sendResponse({ 
      status: "success",
      data: currentSessionData
    });
    return true;
  }
  
  if (message.action === "getDataStatus") {
    console.log("處理 getDataStatus 請求");
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
    ], (result) => {
      console.log("STORAGE DATA DEBUG:", result);
      const dataStatus = {};
      
      // 處理每種數據類型，支援多種可能的數據格式
      // 藥歷數據
      if (result.medicationData) {
        if (result.medicationData.rObject) {
          dataStatus.medication = {
            status: 'fetched',
            count: result.medicationData.rObject.length
          };
        } else if (Array.isArray(result.medicationData)) {
          dataStatus.medication = {
            status: 'fetched',
            count: result.medicationData.length
          };
        } else {
          dataStatus.medication = {
            status: 'fetched',
            count: 1
          };
        }
      } else {
        dataStatus.medication = { status: 'none', count: 0 };
      }
      
      // 檢驗數據
      if (result.labData) {
        if (result.labData.rObject) {
          dataStatus.labData = {
            status: 'fetched',
            count: result.labData.rObject.length
          };
        } else if (Array.isArray(result.labData)) {
          dataStatus.labData = {
            status: 'fetched',
            count: result.labData.length
          };
        } else {
          dataStatus.labData = {
            status: 'fetched',
            count: 1
          };
        }
      } else {
        dataStatus.labData = { status: 'none', count: 0 };
      }
      
      // 中醫用藥數據
      if (result.chinesemedData) {
        if (result.chinesemedData.rObject) {
          dataStatus.chineseMed = {
            status: 'fetched',
            count: result.chinesemedData.rObject.length
          };
        } else if (Array.isArray(result.chinesemedData)) {
          dataStatus.chineseMed = {
            status: 'fetched',
            count: result.chinesemedData.length
          };
        } else {
          dataStatus.chineseMed = {
            status: 'fetched',
            count: 1
          };
        }
      } else {
        dataStatus.chineseMed = { status: 'none', count: 0 };
      }
      
      // 影像數據
      if (result.imagingData) {
        console.log("IMAGING DEBUG:", result.imagingData);
        if (result.imagingData.rObject) {
          dataStatus.imaging = {
            status: 'fetched',
            count: result.imagingData.rObject.length
          };
        } else if (Array.isArray(result.imagingData)) {
          dataStatus.imaging = {
            status: 'fetched',
            count: result.imagingData.length
          };
        } else {
          dataStatus.imaging = {
            status: 'fetched',
            count: 1
          };
        }
      } else {
        console.log("IMAGING NOT FOUND OR INVALID FORMAT:", result.imagingData);
        dataStatus.imaging = { status: 'none', count: 0 };
      }
      
      // 過敏數據
      if (result.allergyData) {
        if (result.allergyData.rObject) {
          dataStatus.allergy = {
            status: 'fetched',
            count: result.allergyData.rObject.length
          };
        } else if (Array.isArray(result.allergyData)) {
          dataStatus.allergy = {
            status: 'fetched',
            count: result.allergyData.length
          };
        } else {
          dataStatus.allergy = {
            status: 'fetched',
            count: 1
          };
        }
      } else {
        dataStatus.allergy = { status: 'none', count: 0 };
      }
      
      // 手術數據
      if (result.surgeryData) {
        if (result.surgeryData.rObject) {
          dataStatus.surgery = {
            status: 'fetched',
            count: result.surgeryData.rObject.length
          };
        } else if (Array.isArray(result.surgeryData)) {
          dataStatus.surgery = {
            status: 'fetched',
            count: result.surgeryData.length
          };
        } else {
          dataStatus.surgery = {
            status: 'fetched',
            count: 1
          };
        }
      } else {
        dataStatus.surgery = { status: 'none', count: 0 };
      }
      
      // 出院數據
      if (result.dischargeData) {
        if (result.dischargeData.rObject) {
          dataStatus.discharge = {
            status: 'fetched',
            count: result.dischargeData.rObject.length
          };
        } else if (Array.isArray(result.dischargeData)) {
          dataStatus.discharge = {
            status: 'fetched',
            count: result.dischargeData.length
          };
        } else {
          dataStatus.discharge = {
            status: 'fetched',
            count: 1
          };
        }
      } else {
        dataStatus.discharge = { status: 'none', count: 0 };
      }
      
      // 用藥天數數據
      if (result.medDaysData) {
        if (result.medDaysData.rObject) {
          dataStatus.medDays = {
            status: 'fetched',
            count: result.medDaysData.rObject.length
          };
        } else if (Array.isArray(result.medDaysData)) {
          dataStatus.medDays = {
            status: 'fetched',
            count: result.medDaysData.length
          };
        } else {
          dataStatus.medDays = {
            status: 'fetched',
            count: 1
          };
        }
      } else {
        dataStatus.medDays = { status: 'none', count: 0 };
      }
      
      // 病患摘要數據
      if (result.patientSummaryData) {
        if (result.patientSummaryData.rObject) {
          dataStatus.patientSummary = {
            status: 'fetched',
            count: result.patientSummaryData.rObject.length
          };
        } else if (result.patientSummaryData.robject) {
          // 處理可能的大小寫差異
          dataStatus.patientSummary = {
            status: 'fetched',
            count: result.patientSummaryData.robject.length
          };
        } else if (Array.isArray(result.patientSummaryData)) {
          dataStatus.patientSummary = {
            status: 'fetched',
            count: result.patientSummaryData.length
          };
        } else {
          dataStatus.patientSummary = {
            status: 'fetched',
            count: 1
          };
        }
      } else {
        dataStatus.patientSummary = { status: 'none', count: 0 };
      }
      
      console.log("回傳的數據狀態:", dataStatus);
      sendResponse({ dataStatus });
    });
    
    return true; // 保持通道開啟以進行非同步回應
  }
  
  // 處理數據狀態更新請求
  if (message.action === "updateDataStatus") {
    console.log("收到數據狀態更新請求");
    // 通知所有標籤頁更新數據狀態
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (tab.url.includes('nhi.gov.tw') || tab.url.includes('localhost'))) {
          chrome.tabs.sendMessage(tab.id, { 
            action: "dataStatusUpdated"
          }).catch(err => console.log(`無法傳送訊息到標籤頁 ${tab.id}:`, err));
        }
      });
    });
    
    // 更新擴充功能圖標
    chrome.action.setBadgeText({ text: "✓" });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
    
    sendResponse({ status: "data_status_updated" });
    return true;
  }

  // 處理清除數據請求
  if (message.action === 'clearData') {
    currentSessionData = {
      medicationData: null,
      labData: null,
      chinesemedData: null,
      imagingData: null,
      allergyData: null,
      surgeryData: null,
      dischargeData: null,
      medDaysData: null,
      patientSummaryData: null,
      token: null,
      currentUserSession: message.userSession
    };

    chrome.storage.local.remove([
      'medicationData', 
      'labData', 
      'chinesemedData', 
      'imagingData',
      'allergyData',
      'surgeryData',
      'dischargeData',
      'medDaysData',
      'patientSummaryData',
      'currentUserSession'
    ], function() {
      // console.log("Storage data cleared due to user session change");
      chrome.action.setBadgeText({ text: "" });
      sendResponse({ status: "cleared" });
    });
  }

  // 處理重置數據請求
  if (message.action === 'resetData') {
    currentSessionData = {
      medicationData: null,
      labData: null,
      chinesemedData: null,
      imagingData: null,
      allergyData: null,
      surgeryData: null,
      dischargeData: null,
      medDaysData: null,
      patientSummaryData: null,
      token: null,
      currentUserSession: null
    };
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
    
    // 重置臨時會話資料
    currentSessionData = {
      medicationData: null,
      labData: null,
      token: null,
      currentUserSession: null
    };
    
    // 同時清除儲存的資料
    chrome.storage.local.remove(['medicationData', 'labData', 'currentUserSession'], function() {
      console.log("Storage data cleared due to logout");
      chrome.action.setBadgeText({ text: "" });
    });
  }
});

// Add this general handler to your background.js
function saveDataToStorage(type, data, userSession) {
  // Map data type to storage key
  const storageKeys = {
    'medication': 'medicationData',
    'labdata': 'labData',
    'lab': 'labData',
    'chinesemed': 'chinesemedData',
    'imaging': 'imagingData',
    'allergy': 'allergyData',
    'surgery': 'surgeryData',
    'discharge': 'dischargeData',
    'meddays': 'medDaysData',
    'patientsummary': 'patientSummaryData'
  };
  
  const storageKey = storageKeys[type.toLowerCase()] || type + 'Data';
  
  // Update session data
  currentSessionData[storageKey] = data;
  currentSessionData.currentUserSession = userSession || currentSessionData.currentUserSession;
  
  // Create storage object
  const storageObj = { 
    [storageKey]: data,
    currentUserSession: userSession || currentSessionData.currentUserSession
  };
  
  // console.log(`Saving ${type} data to storage with key ${storageKey}:`, 
    // data?.rObject ? `${data.rObject.length} records` : 'No records or invalid format');
  
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