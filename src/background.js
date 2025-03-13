// background.js
// 監聽藥歷 API 請求

// 添加開發模式設定
let devMode = false;
let currentTestDataId = '';
let vercelApiBaseUrl = 'https://nhitw-mock-api.vercel.app/api';

// 初始化設定
chrome.storage.sync.get(['devMode', 'currentTestDataId', 'useLocalApi'], (result) => {
  devMode = result.devMode || false;
  currentTestDataId = result.currentTestDataId || '';
  vercelApiBaseUrl = result.useLocalApi ? 'http://localhost:3000/api' : 'https://nhitw-mock-api.vercel.app/api';
  console.log('初始化開發模式設定:', devMode, currentTestDataId, '使用 API:', vercelApiBaseUrl);
});

// 臨時會話資料
let currentSessionData = {
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

// API 端點映射
const apiEndpoints = {
  allergy: 'medcloud2.nhi.gov.tw/imu/api/imue0040/imue0040s02/get-data',
  surgery: 'medcloud2.nhi.gov.tw/imu/api/imue0020/imue0020s02/get-data',
  discharge: 'medcloud2.nhi.gov.tw/imu/api/imue0070/imue0070s02/get-data',
  medDays: 'medcloud2.nhi.gov.tw/imu/api/imue0120/imue0120s01/pres-med-day',
  patientSummary: 'medcloud2.nhi.gov.tw/imu/api/imue2000/imue2000s01/get-summary',
  medication: 'medcloud2.nhi.gov.tw/imu/api/imue0008/imue0008s02/get-data',
  labdata: 'medcloud2.nhi.gov.tw/imu/api/imue0060/imue0060s02/get-data',
  chinesemed: 'medcloud2.nhi.gov.tw/imu/api/imue0090/imue0090s02/get-data',
  imaging: 'medcloud2.nhi.gov.tw/imu/api/imue0130/imue0130s02/get-data'
};

// 獲取當前使用的 API 端點
function getApiEndpoint(type) {
  if (type in apiEndpoints) {
    return apiEndpoints[type];
  } else {
    console.error(`未知的 API 類型: ${type}`);
    return null;
  }
}

// 檢查當前環境
function isRealEnvironment(url) {
  return url && url.includes('medcloud2.nhi.gov.tw');
}

function isTestEnvironment(url) {
  return url && (url.includes('nhitw-mock-api.vercel.app') || url.includes('localhost'));
}

// 安全地發送訊息到標籤頁
function sendMessageToTab(tabId, message, callback) {
  // 首先檢查標籤頁是否存在
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.warn(`無法發送訊息到標籤頁 ${tabId}: ${chrome.runtime.lastError.message}`);
      if (callback) callback({ error: chrome.runtime.lastError.message });
      return;
    }
    
    // 檢查標籤頁是否已完成載入
    if (tab.status !== 'complete') {
      console.warn(`標籤頁 ${tabId} 尚未完成載入，等待後再嘗試發送訊息`);
      // 等待一段時間後再嘗試
      setTimeout(() => {
        sendMessageToTab(tabId, message, callback);
      }, 500);
      return;
    }
    
    // 嘗試發送訊息
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(`發送訊息到標籤頁 ${tabId} 失敗: ${chrome.runtime.lastError.message}`);
          // 如果是連接錯誤，可能是 content script 尚未載入，嘗試重新注入
          if (chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
            console.log(`嘗試重新注入 content script 到標籤頁 ${tabId}`);
            // 這裡不實際重新注入，只是提供一個回應
            if (callback) callback({ status: "retry", message: "接收端不存在，可能需要重新載入頁面" });
          } else {
            if (callback) callback({ error: chrome.runtime.lastError.message });
          }
          return;
        }
        
        if (callback) callback(response || { status: "success" });
      });
    } catch (error) {
      console.error(`發送訊息到標籤頁 ${tabId} 時發生異常:`, error);
      if (callback) callback({ error: error.message });
    }
  });
}

// 通知所有測試環境標籤頁數據已載入
function notifyTestTabsDataLoaded(message, dataType, storageKey, callback) {
  // 查詢所有測試環境標籤頁
  chrome.tabs.query({}, (tabs) => {
    const testTabs = tabs.filter(tab => isTestEnvironment(tab.url));
    
    if (testTabs.length === 0) {
      console.log("找不到測試環境標籤頁，無法通知數據載入");
      if (callback) callback({ status: "warning", message: "找不到測試環境標籤頁" });
      return;
    }
    
    console.log(`找到 ${testTabs.length} 個測試環境標籤頁，開始通知數據載入`);
    
    // 記錄成功通知的標籤頁數量
    let successCount = 0;
    let errorCount = 0;
    
    // 對每個測試環境標籤頁發送訊息
    testTabs.forEach((tab, index) => {
      sendMessageToTab(tab.id, message, (response) => {
        if (response && response.error) {
          console.warn(`通知標籤頁 ${tab.id} 失敗:`, response.error);
          errorCount++;
        } else {
          console.log(`成功通知標籤頁 ${tab.id}`);
          successCount++;
        }
        
        // 當所有標籤頁都已處理完畢時，調用回調函數
        if (successCount + errorCount === testTabs.length && callback) {
          callback({
            status: errorCount === 0 ? "success" : "partial",
            message: `已通知 ${successCount} 個標籤頁，${errorCount} 個失敗`,
            successCount,
            errorCount
          });
        }
      });
    });
  });
}

// 設置 webRequest 監聽器
function setupWebRequestListeners() {
  // 為每種 API 類型設置監聽器
  Object.entries(apiEndpoints).forEach(([type, endpoint]) => {
    // 監聽請求
    chrome.webRequest.onBeforeRequest.addListener(
      function(details) {
        if (details.method === 'GET' && details.url.includes(endpoint)) {
          console.log(`偵測到 ${type} API 請求:`, details.url);
          
          // 通知 content script
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
    
    // 監聽回應
    chrome.webRequest.onCompleted.addListener(
      function(details) {
        if (details.method === 'GET' && details.url.includes(endpoint)) {
          console.log(`完成 ${type} API 請求:`, details.url);
          
          // 通知 content script
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
}

// 初始化時設置監聽器
setupWebRequestListeners();

// 處理來自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 處理開發模式設定更新
  if (message.action === "updateDevMode") {
    devMode = message.value;
    chrome.storage.sync.set({ devMode: message.value });
    console.log("開發模式已更新:", devMode);
    sendResponse({ status: "success" });
    return true;
  }

  // 處理當前測試數據 ID 更新
  if (message.action === "updateCurrentTestDataId") {
    currentTestDataId = message.value;
    chrome.storage.sync.set({ currentTestDataId: message.value });
    console.log("當前測試數據 ID 已更新:", currentTestDataId);
    sendResponse({ status: "success" });
    return true;
  }

  // 處理 API 端點設定更新
  if (message.action === "updateApiEndpoint") {
    vercelApiBaseUrl = message.useLocalApi ? 'http://localhost:3000/api' : 'https://nhitw-mock-api.vercel.app/api';
    chrome.storage.sync.set({ useLocalApi: message.useLocalApi });
    console.log("API 端點已更新:", vercelApiBaseUrl);
    sendResponse({ status: "success" });
    return true;
  }

  // 處理測試數據載入請求
  if (message.action === "loadTestData") {
    // 檢查是否為開發模式且有設定測試數據 ID
    if (devMode && currentTestDataId) {
      console.log("正在載入測試數據...");
      
      // 定義所有可能的數據類型及其對應的存儲鍵
      const dataTypes = {
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
      
      // 構建請求 URL
      const url = `${vercelApiBaseUrl}/data/${currentTestDataId}`;
      console.log("請求 URL:", url);
      
      // 發送請求獲取測試數據
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log("測試數據載入成功:", data);
          
          // 保存數據到 Chrome 存儲
          const storageData = {};
          
          // 處理每種數據類型
          Object.entries(dataTypes).forEach(([type, storageKey]) => {
            if (data[type]) {
              storageData[storageKey] = data[type];
              console.log(`保存 ${type} 數據到存儲`);
            }
          });
          
          // 保存數據
          chrome.storage.local.set(storageData, () => {
            console.log("所有測試數據已保存到 Chrome 存儲");
            
            // 通知 content script 數據已載入
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
              if (tabs.length > 0) {
                // 使用安全的訊息發送函數
                sendMessageToTab(tabs[0].id, {
                  action: "testDataLoaded",
                  dataTypes: Object.keys(storageData)
                }, (response) => {
                  // 即使通知 content script 失敗，也要回應原始請求
                  sendResponse({
                    status: "test_data_loaded",
                    dataTypes: Object.keys(storageData)
                  });
                });
              } else {
                // 沒有活動標籤頁，但仍然回應原始請求
                sendResponse({
                  status: "test_data_loaded",
                  dataTypes: Object.keys(storageData)
                });
              }
            });
          });
        })
        .catch(error => {
          console.error("載入測試數據時出錯:", error);
          sendResponse({
            status: "error",
            error: `載入測試數據時出錯: ${error.message}`
          });
        });
      
      return true; // 保持通道開啟以進行非同步回應
    } else {
      sendResponse({
        status: "error",
        error: "未啟用開發模式或未設定測試數據 ID"
      });
      return false;
    }
  }

  // 處理特定類型測試數據載入請求
  if (message.action === "getTestData" && message.dataType) {
    if (devMode && currentTestDataId) {
      console.log(`正在獲取 ${message.dataType} 測試數據...`);
      
      // 構建請求 URL，只請求特定類型的數據
      const url = `${vercelApiBaseUrl}/data/${currentTestDataId}?type=${message.dataType}`;
      
      // 發送請求獲取測試數據
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log(`${message.dataType} 測試數據載入成功:`, data);
          
          // 根據數據類型確定存儲鍵
          let storageKey;
          switch(message.dataType) {
            case 'medication':
              storageKey = 'medicationData';
              break;
            case 'labdata':
              storageKey = 'labData';
              break;
            case 'chinesemed':
              storageKey = 'chinesemedData';
              break;
            case 'imaging':
              storageKey = 'imagingData';
              break;
            case 'allergy':
              storageKey = 'allergyData';
              break;
            case 'surgery':
              storageKey = 'surgeryData';
              break;
            case 'discharge':
              storageKey = 'dischargeData';
              break;
            case 'medDays':
              storageKey = 'medDaysData';
              break;
            case 'patientSummary':
              storageKey = 'patientSummaryData';
              break;
            default:
              throw new Error(`未知的數據類型: ${message.dataType}`);
          }
          
          // 保存數據到 Chrome 存儲
          const storageData = {};
          storageData[storageKey] = data[message.dataType];
          
          chrome.storage.local.set(storageData, () => {
            console.log(`${message.dataType} 測試數據已保存到 Chrome 存儲`);
            
            // 通知所有測試環境標籤頁數據已載入
            notifyTestTabsDataLoaded({
              action: "testDataTypeLoaded",
              dataType: message.dataType,
              storageKey: storageKey
            }, message.dataType, storageKey, (notifyResult) => {
              // 回應原始請求
              sendResponse({
                status: "success",
                message: `${message.dataType} 測試數據已載入`,
                notifyResult
              });
            });
          });
        })
        .catch(error => {
          console.error(`載入 ${message.dataType} 測試數據時出錯:`, error);
          sendResponse({
            status: "error",
            error: error.message
          });
        });
      
      return true; // 保持通道開啟以進行非同步回應
    } else {
      sendResponse({
        status: "error",
        error: "未啟用開發模式或未設定測試數據 ID"
      });
      return false;
    }
  }

  // 處理數據狀態更新請求
  if (message.action === "updateDataStatus") {
    console.log("收到數據狀態更新請求");
    
    // 獲取當前標籤頁
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length > 0) {
        const currentTab = tabs[0];
        
        // 檢查當前環境
        if (isRealEnvironment(currentTab.url) || isTestEnvironment(currentTab.url)) {
          // 使用安全的訊息發送函數
          sendMessageToTab(currentTab.id, {
            action: "dataStatusUpdated"
          }, (response) => {
            // 回應原始請求
            if (response && !response.error) {
              console.log("數據狀態更新通知已發送，回應:", response);
              sendResponse({
                status: "success",
                message: "數據狀態已更新"
              });
            } else {
              console.log("數據狀態更新通知發送失敗:", response?.error);
              sendResponse({
                status: "error",
                error: response?.error || "無法通知內容腳本"
              });
            }
          });
        } else {
          console.log("當前不在支援的環境中，不發送數據狀態更新通知");
          sendResponse({
            status: "error",
            error: "當前不在支援的環境中"
          });
        }
      } else {
        console.log("找不到當前標籤頁");
        sendResponse({
          status: "error",
          error: "找不到當前標籤頁"
        });
      }
    });
    
    return true; // 保持通道開啟以進行非同步回應
  }

  // 處理獲取測試數據列表請求
  if (message.action === "fetchTestDataList") {
    console.log("收到獲取測試數據列表請求");
    
    // 構建請求 URL
    const url = `${vercelApiBaseUrl}/data/list`;
    console.log("請求測試數據列表 URL:", url);
    
    // 發送請求獲取測試數據列表
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("測試數據列表獲取成功:", data);
        
        // 回應請求
        sendResponse({
          status: "success",
          data: data
        });
      })
      .catch(error => {
        console.error("獲取測試數據列表時出錯:", error);
        sendResponse({
          status: "error",
          error: error.message
        });
      });
    
    return true; // 保持通道開啟以進行非同步回應
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