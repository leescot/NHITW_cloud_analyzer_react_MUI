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

const API_ENDPOINTS = {
  allergy: "medcloud2.nhi.gov.tw/imu/api/imue0040/imue0040s02/get-data",
  surgery: "medcloud2.nhi.gov.tw/imu/api/imue0020/imue0020s02/get-data",
  discharge: "medcloud2.nhi.gov.tw/imu/api/imue0070/imue0070s02/get-data",
  medDays: "medcloud2.nhi.gov.tw/imu/api/imue0120/imue0120s01/pres-med-day",
  patientSummary: "medcloud2.nhi.gov.tw/imu/api/imue2000/imue2000s01/get-summary"  // New endpoint
};

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

  // Add the new code HERE, at the beginning of the listener function
  // 處理用戶會話變更，清空臨時資料
  if (message.action === "userSessionChanged") {
    // console.log("User session changed, resetting temporary data");
    currentSessionData = {
      medicationData: null,
      labData: null,
      chinesemedData: null,
      imagingData: null,
      allergyData: null,
      surgeryData: null,
      dischargeData: null,
      medDaysData: null,
      patientSummaryData: null,  // Include in reset
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
      'patientSummaryData'  // Include in removal
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
      chinesemedData: null,
      imagingData: null,
      token: null,
      currentUserSession: null
    };
    sendResponse({ status: "cleared" });
    return true;
  }

  // The existing code continues below...
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

      // Process each data type
      if (result.medicationData?.rObject) {
        dataStatus.medication = {
          status: 'fetched',
          count: result.medicationData.rObject.length
        };
      } else {
        dataStatus.medication = { status: 'none', count: 0 };
      }

      if (result.labData?.rObject) {
        dataStatus.labData = {
          status: 'fetched',
          count: result.labData.rObject.length
        };
      } else {
        dataStatus.labData = { status: 'none', count: 0 };
      }

      if (result.chinesemedData?.rObject) {
        dataStatus.chineseMed = {
          status: 'fetched',
          count: result.chinesemedData.rObject.length
        };
      } else {
        dataStatus.chineseMed = { status: 'none', count: 0 };
      }

      if (result.imagingData?.rObject) {
        console.log("IMAGING DEBUG:", result.imagingData);
        dataStatus.imaging = {
          status: 'fetched',
          count: result.imagingData.rObject.length
        };
      } else {
        console.log("IMAGING NOT FOUND OR INVALID FORMAT:", result.imagingData);
        dataStatus.imaging = { status: 'none', count: 0 };
      }

      if (result.allergyData?.rObject) {
        dataStatus.allergy = {
          status: 'fetched',
          count: result.allergyData.rObject.length
        };
      } else {
        dataStatus.allergy = { status: 'none', count: 0 };
      }

      if (result.surgeryData?.rObject) {
        dataStatus.surgery = {
          status: 'fetched',
          count: result.surgeryData.rObject.length
        };
      } else {
        dataStatus.surgery = { status: 'none', count: 0 };
      }

      if (result.dischargeData?.rObject) {
        dataStatus.discharge = {
          status: 'fetched',
          count: result.dischargeData.rObject.length
        };
      } else {
        dataStatus.discharge = { status: 'none', count: 0 };
      }

      if (result.medDaysData?.rObject) {
        dataStatus.medDays = {
          status: 'fetched',
          count: result.medDaysData.rObject.length
        };
      } else {
        dataStatus.medDays = { status: 'none', count: 0 };
      }

      // Process patient summary data
      if (result.patientSummaryData?.robject) {
        dataStatus.patientSummary = {
          status: 'fetched',
          count: result.patientSummaryData.robject.length
        };
      } else if (result.patientSummaryData?.rObject) {
        // Handle possible capitalization difference
        dataStatus.patientSummary = {
          status: 'fetched',
          count: result.patientSummaryData.rObject.length
        };
      } else {
        dataStatus.patientSummary = { status: 'none', count: 0 };
      }

      sendResponse({ dataStatus });
    });

    return true; // Keep message channel open for async response
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