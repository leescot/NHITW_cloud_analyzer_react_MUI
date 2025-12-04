// content.js - Modified to handle user sessions
import { extractUserInfoFromToken } from './utils/userInfoUtils.js';

console.log("Content script loaded for NHI data extractor (Automated Version)");

let currentPatientId = null; // 新增追踪當前病人

// 在檔案頂部定義全局變數
window.lastInterceptedMedicationData = null;
window.lastInterceptedLabData = null;
window.lastInterceptedLabDrawData = null; // 新增檢驗圖形化查詢資料
window.lastInterceptedChineseMedData = null;
window.lastInterceptedImagingData = null;
window.lastInterceptedAllergyData = null;
window.lastInterceptedSurgeryData = null;
window.lastInterceptedDischargeData = null;
window.lastInterceptedMedDaysData = null;
window.lastInterceptedPatientSummaryData = null;
window.lastInterceptedMasterMenuData = null; // 新增主選單數據
window.lastInterceptedAdultHealthCheckData = null; // 新增成人預防保健資料
window.lastInterceptedCancerScreeningData = null; // 新增四癌篩檢結果資料
window.lastInterceptedHbcvdata = null; // 新增B、C肝炎專區資料
// window.lastInterceptedRehabilitationData = null; // 新增復健資料
// window.lastInterceptedAcupunctureData = null; // 新增針灸資料
// window.lastInterceptedSpecialChineseMedCareData = null; // 新增特殊中醫處置資料

// 新增: 使用者資訊快取
let cachedUserInfo = null;
let lastUserInfoExtractTime = 0;
const USER_INFO_CACHE_DURATION = 5000; // 5秒內不重複提取令牌

let isMonitoring = false;
let lastSuccessfulRequestHeaders = null;
let hasExtractedToken = false;
let autoFetchTimer = null;
let retryCount = 0;
let currentUserSession = null; // 新增: 追蹤目前的使用者會話
const MAX_RETRIES = 3;

// 新增: 紀錄上次清除資料的時間，用於防止短時間內多次清除
let lastDataClearTime = 0;
const DATA_CLEAR_COOLDOWN = 2000; // 2秒內不重複清除資料

let isBatchFetchInProgress = false;

let isDataFetchingStarted = false;

let pendingRequests = {
  medication: false,
  labdata: false,
  labdraw: false, // 新增檢驗圖形化查詢
  chinesemed: false,
  imaging: false,
  allergy: false,
  surgery: false,
  discharge: false,
  medDays: false,
  patientsummary: false, // 新增病患摘要
  masterMenu: false, // 新增主選單
  adultHealthCheck: false, // 新增成人預防保健
  cancerScreening: false, // 新增四癌篩檢結果
  hbcvdata: false, // 新增B、C肝炎專區
};

// 在頁面加載後自動初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

// 移除定时器，改为在数据保存或加载时直接更新 localStorage

// 初始化函數
function initialize() {
  // console.log('Initializing automated NHI data extractor');
  if (isOnLoginPage()) {
    clearPreviousData();
    return;
  }
  if (isOnTargetPage()) {
    checkAndInitUserSession().then(() => {
      setupMonitoring();
      observeUrlChanges(); // 啟動 URL 監聽
    });
  }
}

// 開發模式設置
function setupDevMode() {
  // 修改手動控制面板，添加測試數據載入功能
  const originalCreateManualControlPanel = createManualControlPanel;
  createManualControlPanel = function () {
    originalCreateManualControlPanel();

    const panel = document.getElementById("nhi-manual-control-panel");
    if (!panel) return;

    // 添加開發模式標題
    const devTitle = document.createElement("h4");
    devTitle.textContent = "開發模式控制";
    devTitle.style.margin = "20px 0 10px 0";
    devTitle.style.color = "#333";
    panel.appendChild(devTitle);

    // 添加載入測試數據的按鈕
    const loadTestDataButton = document.createElement("input");
    loadTestDataButton.type = "file";
    loadTestDataButton.accept = ".json";
    loadTestDataButton.style.display = "none";
    loadTestDataButton.multiple = true;
    panel.appendChild(loadTestDataButton);

    const loadButton = document.createElement("button");
    loadButton.textContent = "載入測試數據";
    loadButton.style.display = "block";
    loadButton.style.width = "100%";
    loadButton.style.padding = "6px";
    loadButton.style.margin = "5px 0";
    loadButton.style.backgroundColor = "#fff3e0";
    loadButton.style.border = "1px solid #ffe0b2";
    loadButton.style.borderRadius = "4px";
    loadButton.style.cursor = "pointer";
    loadButton.style.color = "#e65100";

    loadButton.addEventListener("click", () => {
      loadTestDataButton.click();
    });

    loadTestDataButton.addEventListener("change", handleTestDataLoad);
    panel.appendChild(loadButton);

    // 添加清除測試數據的按鈕
    const clearButton = document.createElement("button");
    clearButton.textContent = "清除測試數據";
    clearButton.style.display = "block";
    clearButton.style.width = "100%";
    clearButton.style.padding = "6px";
    clearButton.style.margin = "5px 0";
    clearButton.style.backgroundColor = "#ffebee";
    clearButton.style.border = "1px solid #ffcdd2";
    clearButton.style.borderRadius = "4px";
    clearButton.style.cursor = "pointer";
    clearButton.style.color = "#c62828";

    clearButton.addEventListener("click", clearTestData);
    panel.appendChild(clearButton);
  };
}

function handleTestDataLoad(event) {
  const files = event.target.files;
  if (!files.length) return;

  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // 判斷數據類型並載入到對應變數
        if (data.medication) {
          lastInterceptedMedicationData = data.medication;
        }
        if (data.labdata || data.lab) {
          lastInterceptedLabData = data.labdata || data.lab;
        }
        if (data.chinesemed) {
          lastInterceptedChineseMedData = data.chinesemed;
        }
        if (data.imaging) {
          lastInterceptedImagingData = data.imaging;
        }
        if (data.allergy) {
          lastInterceptedAllergyData = data.allergy;
        }
        if (data.surgery) {
          lastInterceptedSurgeryData = data.surgery;
        }
        if (data.discharge) {
          lastInterceptedDischargeData = data.discharge;
        }
        if (data.medDays) {
          lastInterceptedMedDaysData = data.medDays;
        }

        // 更新覆蓋層顯示
        // console.log('Test data loaded:', data);
      } catch (error) {
        console.error("Error parsing test data:", error);
      }
    };
    reader.readAsText(file);
  });
}

function clearTestData() {
  lastInterceptedMedicationData = null;
  lastInterceptedLabData = null;
  lastInterceptedLabDrawData = null;
  lastInterceptedChineseMedData = null;
  lastInterceptedImagingData = null;
  lastInterceptedAllergyData = null;
  lastInterceptedSurgeryData = null;
  lastInterceptedDischargeData = null;
  lastInterceptedMedDaysData = null;
  lastInterceptedPatientSummaryData = null;
  lastInterceptedMasterMenuData = null;
  lastInterceptedAdultHealthCheckData = null;
  lastInterceptedCancerScreeningData = null;
  lastInterceptedHbcvdata = null;
  // console.log('Test data cleared');
}

// 檢查是否在登入頁面
function isOnLoginPage() {
  const url = window.location.href;
  return (
    url.includes("medcloud2.nhi.gov.tw/imu/login") ||
    url.includes("medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0001")
  );
}

// 檢查是否在目標頁面
function isOnTargetPage() {
  const url = window.location.href;

  // 使用 Map 存儲目標頁面路徑
  const targetPaths = new Map([
    ["medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0008", "用藥紀錄"],
    ["medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0060", "檢驗報告"],
    ["medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0090", "中醫用藥"],  // Chinese medicine
    ["medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0130", "影像報告"],  // Imaging
    ["medcloud2.nhi.gov.tw/imu/IMUE2000/IMUE2000", "病人摘要"]   // Patient summary
  ]);

  // 檢查 URL 是否包含任何目標路徑
  for (const [path] of targetPaths) {
    if (url.includes(path)) {
      return true;
    }
  }

  return false;
}

// 使用 Map 來判斷頁面類型
const pageTypeMap = new Map([
  ["/IMUE0008", "medication"],
  ["/IMUE0060", "labdata"],
  ["/IMUE0090", "chinesemed"],
  ["/IMUE0130", "imaging"],
  ["/IMUE0040", "allergy"],
  ["/IMUE0020", "surgery"],
  ["/IMUE0070", "discharge"],
  ["/IMUE0120", "medDays"],
  ["/IMUE2000", "patientsummary"]
]);

// 判斷頁面類型
function getPageType() {
  const url = window.location.href;

  // 檢查 URL 是否包含定義在 Map 中的任何一個路徑
  for (const [path, type] of pageTypeMap.entries()) {
    if (url.includes(path)) {
      return type;
    }
  }

  return "unknown";
}

// 改進使用者會話處理，更好地檢測卡片變更
async function checkAndInitUserSession() {
  try {
    const userInfo = await extractUserInfo();
    if (!userInfo) {
      console.log("Could not extract user info, treating as new session");
      performClearPreviousData();
      currentPatientId = null;
      return false;
    }

    return new Promise((resolve) => {
      chrome.storage.local.get("currentUserSession", function (result) {
        const storedSession = result.currentUserSession;
        const isNewSession = storedSession !== userInfo;

        if (isNewSession) {
          performClearPreviousData();
          currentPatientId = userInfo; // 更新當前病人標識
          chrome.storage.local.set({ currentUserSession: userInfo }, () => {
            chrome.runtime.sendMessage({
              action: "userSessionChanged",
              userSession: userInfo,
            });
            resolve(true); // 表示新病人
          });
        } else {
          currentUserSession = userInfo;
          currentPatientId = userInfo; // 更新但不清除資料
          resolve(false); // 表示同一病人
        }
      });
    });
  } catch (error) {
    console.error("Error checking user session:", error);
    performClearPreviousData();
    currentPatientId = null;
    return false;
  }
}

// 改進清除之前資料的函數，確保背景腳本也被通知
function clearPreviousData() {
  // 直接調用實際執行清除的函數
  // 不進行去抖動檢查，因為這可能從其他地方直接調用
  performClearPreviousData();
}

// 實際執行清除資料的函數，帶有去抖動機制
function performClearPreviousData() {
  const currentTime = Date.now();

  // 如果上次清除時間太近，或者正在進行批次抓取，則跳過
  if (
    currentTime - lastDataClearTime < DATA_CLEAR_COOLDOWN ||
    isBatchFetchInProgress
  ) {
    console.log(
      "Skipping redundant data clear - recent clear or fetch in progress"
    );
    return;
  }

  lastDataClearTime = currentTime;
  console.log("Clearing previous data due to new session or card change");

  // 清除擴展儲存數據
  chrome.storage.local.remove(
    ["medicationData", "labData", "patientSummaryData"],
    function () {
      console.log("Previous data cleared from storage");
      try {
        chrome.action.setBadgeText({ text: "" });
      } catch (e) {
        // 忽略可能的錯誤，例如在content script中無法訪問chrome.action
      }
      lastInterceptedMedicationData = null;
      lastInterceptedLabData = null;
      lastInterceptedLabDrawData = null;
      lastInterceptedChineseMedData = null;
      lastInterceptedImagingData = null;
      lastInterceptedAllergyData = null;
      lastInterceptedSurgeryData = null;
      lastInterceptedDischargeData = null;
      lastInterceptedMedDaysData = null;
      lastInterceptedPatientSummaryData = null;
      lastInterceptedMasterMenuData = null;
      lastInterceptedAdultHealthCheckData = null;
      lastInterceptedCancerScreeningData = null;
      lastInterceptedHbcvdata = null;
      // lastInterceptedRehabilitationData = null;
      // lastInterceptedAcupunctureData = null;
      // lastInterceptedSpecialChineseMedCareData = null;
    }
  );

  // 通知background script清除會話數據
  chrome.runtime.sendMessage({
    action: "clearSessionData",
  });

  // 重置重試計數和標誌
  retryCount = 0;
  hasExtractedToken = false;
}

// 從頁面提取用戶識別信息
async function extractUserInfo() {
  const currentTime = Date.now();

  // 如果有快取且未過期，直接使用快取
  if (
    cachedUserInfo &&
    currentTime - lastUserInfoExtractTime < USER_INFO_CACHE_DURATION
  ) {
    return cachedUserInfo;
  }

  // 方法1: 從 Authorization token 中提取 UserID（優先）
  try {
    const token = extractAuthorizationToken();
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1])); // 解碼 JWT payload
      const userId = payload.UserID; // 提取 UserID（健保卡號）
      if (userId) {
        // console.log("Extracted UserID from token:", userId);
        // 更新快取
        cachedUserInfo = `patient_${userId}`;
        lastUserInfoExtractTime = currentTime;
        return cachedUserInfo; // 返回 patient_${健保卡號}
      }
      console.log("No UserID in token, using token prefix");
      // 更新快取
      cachedUserInfo = `token_${token.substring(0, 20)}`;
      lastUserInfoExtractTime = currentTime;
      return cachedUserInfo; // 備用
    }
  } catch (error) {
    console.log("Could not extract user info from token:", error);
  }

  // 方法2: 從 URL 獲取（備用）
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get("patientId") || urlParams.get("pid");
    if (patientId) {
      console.log("Extracted patient ID from URL:", patientId);
      // 更新快取
      cachedUserInfo = `patient_${patientId}`;
      lastUserInfoExtractTime = currentTime;
      return cachedUserInfo;
    }
  } catch (error) {
    console.log("Could not extract patient ID from URL:", error);
  }

  // 方法3: 從 DOM 獲取（次要備用）
  try {
    const patientInfoElements = document.querySelectorAll(
      ".patient-info, .patient-name, .card-no"
    );
    for (const element of patientInfoElements) {
      if (element.textContent && element.textContent.trim()) {
        console.log(
          "Extracted patient info from DOM:",
          element.textContent.trim()
        );
        // 更新快取
        cachedUserInfo = `dom_${element.textContent.trim()}`;
        lastUserInfoExtractTime = currentTime;
        return cachedUserInfo;
      }
    }
  } catch (error) {
    console.log("Could not extract patient info from DOM:", error);
  }

  // 預設: 時間戳
  console.log("No patient info found, using timestamp");
  cachedUserInfo = `session_${Date.now()}`;
  lastUserInfoExtractTime = currentTime;
  return cachedUserInfo;
}

// 監聽 URL 變化
function observeUrlChanges() {
  console.log("Setting up URL change observer");
  let lastUrl = window.location.href;
  const urlCheckInterval = setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log("URL changed to:", lastUrl);

      // 重置使用者資訊快取，確保頁面變更後重新提取
      cachedUserInfo = null;
      lastUserInfoExtractTime = 0;

      if (isOnLoginPage()) {
        console.log("Navigation to login page detected");
        performClearPreviousData();
        return;
      }

      if (isOnTargetPage()) {
        console.log("Navigation to target page detected");
        isDataFetchingStarted = false; // 重置狀態
        checkAndInitUserSession().then((isNewSession) => {
          if (isNewSession || !window.lastInterceptedMedicationData?.rObject) {
            fetchAllDataTypes();
          } else {
            console.log("Same patient after URL change, reusing data");
          }
        });
      }
    }
  }, 1000);
}

// API URL 模式映射表
const API_URL_PATTERNS = new Map([
  ["medication", "/imu/api/imue0008/imue0008s02/get-data"],
  ["labdata", "/imu/api/imue0060/imue0060s02/get-data"],
  ["labdraw", "/imu/api/imue0060/imue0060s03/get-data"],
  ["chinesemed", "/imu/api/imue0090/imue0090s02/get-data"],
  ["imaging", "/imu/api/imue0130/imue0130s02/get-data"],
  ["allergy", "/imu/api/imue0040/imue0040s02/get-data"],
  ["surgery", "/imu/api/imue0020/imue0020s02/get-data"],
  ["discharge", "/imu/api/imue0070/imue0070s02/get-data"],
  ["medDays", "/imu/api/imue0120/imue0120s01/pres-med-day"],
  ["patientsummary", "/imu/api/imue2000/imue2000s01/get-summary"],
  ["masterMenu", "/imu/api/imue1000/imue1000s02/master-menu"],
  ["adultHealthCheck", "/imu/api/imue0140/imue0140s01/hpa-data"],
  ["cancerScreening", "/imu/api/imue0150/imue0150s01/hpa-data"],
  ["hbcvdata", "/imu/api/imue0180/imue0180s01/hbcv-data"],
  // ["rehabilitation", "/imu/api/imue0080/imue0080s02/get-data"],
  // ["acupuncture", "/imu/api/imue0100/imue0100s02/get-data"],
  // ["specialChineseMedCare", "/imu/api/imue0170/imue0170s02/get-data"]
]);

// 數據處理模塊 - 封裝數據提取與處理相關功能
const DataProcessor = {
  // Map 定義集中管理，提高封裝性
  // API URL 模式映射表
  API_URL_PATTERNS: new Map([
    ["medication", "/imu/api/imue0008/imue0008s02/get-data"],
    ["labdata", "/imu/api/imue0060/imue0060s02/get-data"],
    ["labdraw", "/imu/api/imue0060/imue0060s03/get-data"],
    ["chinesemed", "/imu/api/imue0090/imue0090s02/get-data"],
    ["imaging", "/imu/api/imue0130/imue0130s02/get-data"],
    ["allergy", "/imu/api/imue0040/imue0040s02/get-data"],
    ["surgery", "/imu/api/imue0020/imue0020s02/get-data"],
    ["discharge", "/imu/api/imue0070/imue0070s02/get-data"],
    ["medDays", "/imu/api/imue0120/imue0120s01/pres-med-day"],
    ["patientsummary", "/imu/api/imue2000/imue2000s01/get-summary"],
    ["masterMenu", "/imu/api/imue1000/imue1000s02/master-menu"],
    ["adultHealthCheck", "/imu/api/imue0140/imue0140s01/hpa-data"],
    ["cancerScreening", "/imu/api/imue0150/imue0150s01/hpa-data"],
    ["hbcvdata", "/imu/api/imue0180/imue0180s01/hbcv-data"],
    // ["rehabilitation", "/imu/api/imue0080/imue0080s02/get-data"],
    // ["acupuncture", "/imu/api/imue0100/imue0100s02/get-data"],
    // ["specialChineseMedCare", "/imu/api/imue0170/imue0170s02/get-data"]
  ]),

  // 數據類型與對應的全局變數
  dataVarMap: new Map([
    ["medication", "lastInterceptedMedicationData"],
    ["labdata", "lastInterceptedLabData"],
    ["labdraw", "lastInterceptedLabDrawData"],
    ["chinesemed", "lastInterceptedChineseMedData"],
    ["imaging", "lastInterceptedImagingData"],
    ["allergy", "lastInterceptedAllergyData"],
    ["surgery", "lastInterceptedSurgeryData"],
    ["discharge", "lastInterceptedDischargeData"],
    ["medDays", "lastInterceptedMedDaysData"],
    ["patientsummary", "lastInterceptedPatientSummaryData"],
    ["masterMenu", "lastInterceptedMasterMenuData"],
    ["adultHealthCheck", "lastInterceptedAdultHealthCheckData"],
    ["cancerScreening", "lastInterceptedCancerScreeningData"],
    ["hbcvdata", "lastInterceptedHbcvdata"],
    // ["rehabilitation", "lastInterceptedRehabilitationData"],
    // ["acupuncture", "lastInterceptedAcupunctureData"],
    // ["specialChineseMedCare", "lastInterceptedSpecialChineseMedCareData"]
  ]),

  // 數據類型與對應的 action
  actionMap: new Map([
    ["medication", "saveMedicationData"],
    ["labdata", "saveLabData"],
    ["labdraw", "saveLabDrawData"],
    ["chinesemed", "saveChineseMedData"],
    ["imaging", "saveImagingData"],
    ["allergy", "saveAllergyData"],
    ["surgery", "saveSurgeryData"],
    ["discharge", "saveDischargeData"],
    ["medDays", "saveMedDaysData"],
    ["patientsummary", "savePatientSummaryData"],
    ["masterMenu", "saveMasterMenuData"],
    ["adultHealthCheck", "saveAdultHealthCheckData"],
    ["cancerScreening", "saveCancerScreeningData"],
    ["hbcvdata", "saveHbcvdata"],
    // ["rehabilitation", "saveRehabilitationData"],
    // ["acupuncture", "saveAcupunctureData"],
    // ["specialChineseMedCare", "saveSpecialChineseMedCareData"]
  ]),

  // 數據類型與對應的中文顯示文字
  typeTextMap: new Map([
    ["medication", "西醫藥歷"],
    ["labdata", "檢驗資料"],
    ["labdraw", "檢驗圖形化查詢"],
    ["chinesemed", "中醫用藥"],
    ["imaging", "醫療影像"],
    ["allergy", "過敏資料"],
    ["surgery", "手術記錄"],
    ["discharge", "出院病摘"],
    ["medDays", "藥品餘藥"],
    ["patientsummary", "病患摘要"],
    ["masterMenu", "主選單"],
    ["adultHealthCheck", "成人預防保健"],
    ["cancerScreening", "四癌篩檢結果"],
    ["hbcvdata", "B、C肝炎專區"],
    // ["rehabilitation", "復健治療"],
    // ["acupuncture", "針灸治療"],
    // ["specialChineseMedCare", "特殊中醫處置"]
  ]),

  // 處理原始數據，統一數據格式
  normalizeData(data, dataType) {
    // DEBUG: 輸出 adultHealthCheck, cancerScreening 和 hbcvdata 的原始資料
    if (dataType === "adultHealthCheck" || dataType === "cancerScreening" || dataType === "hbcvdata") {
      console.log(`[DEBUG] normalizeData 接收到 ${dataType} 資料:`, data);
    }

    // 檢查 robject（小寫）或 rObject（大寫），兩者都接受
    const recordsArray = data.rObject || data.robject;

    // 對 masterMenu, adultHealthCheck, cancerScreening, hbcvdata 類型特殊處理
    // 這些類型的 API 回應格式不同，robject 是物件而非陣列
    const isSpecialType = dataType === "masterMenu" ||
      dataType === "adultHealthCheck" ||
      dataType === "cancerScreening" ||
      dataType === "hbcvdata";

    if (!data || (!recordsArray && !isSpecialType)) {
      console.error(`Invalid data for type ${dataType}`);
      return null;
    }

    // 統一格式
    // 對於不同的特殊類型，使用不同的包裝方式
    if (isSpecialType) {
      let normalizedData;

      if (dataType === "masterMenu") {
        // masterMenu 需要包裝整個 data 物件（包含 prsnAuth 等授權資訊）
        normalizedData = {
          rObject: [data]
        };
      } else {
        // adultHealthCheck, cancerScreening 和 hbcvdata 只包裝 robject，不保留 originalData 以節省記憶體
        normalizedData = {
          rObject: recordsArray ? [recordsArray] : []
        };
        console.log(`[DEBUG] ${dataType} 標準化後資料:`, normalizedData);
      }

      return normalizedData;
    }

    // 對於其他類型，只保留 rObject
    return {
      rObject: recordsArray
    };
  },

  // 檢查數據是否為有效
  isValidData(data, dataType) {
    if (!data) return false;

    // 對 masterMenu, adultHealthCheck, cancerScreening, hbcvdata 類型特殊處理
    if (dataType === "masterMenu" ||
      dataType === "adultHealthCheck" ||
      dataType === "cancerScreening" ||
      dataType === "hbcvdata") {
      return true;
    }

    const recordsArray = data.rObject || data.robject;
    return recordsArray && Array.isArray(recordsArray);
  },

  // 獲取數據類型對應的變數名
  getVarName(dataType) {
    return this.dataVarMap.get(dataType);
  },

  // 獲取數據類型對應的 action
  getAction(dataType) {
    return this.actionMap.get(dataType);
  },

  // 獲取數據類型對應的顯示文字
  getTypeText(dataType) {
    return this.typeTextMap.get(dataType);
  },

  // 根據 URL 獲取對應的數據類型
  getDataTypeFromUrl(url) {
    const foundEntry = Array.from(this.API_URL_PATTERNS.entries())
      .find(([_, pattern]) => url.includes(pattern));

    return foundEntry ? foundEntry[0] : null;
  },

  // 處理 API 響應數據
  processApiResponse(data, url, source = "API") {
    const dataType = this.getDataTypeFromUrl(url);

    // DEBUG: 輸出 adultHealthCheck, cancerScreening 和 hbcvdata 的處理流程
    if (dataType === "adultHealthCheck" || dataType === "cancerScreening" || dataType === "hbcvdata") {
      console.log(`[DEBUG] processApiResponse - 偵測到 ${dataType} 類型`);
      console.log(`[DEBUG] URL: ${url}`);
      console.log(`[DEBUG] 原始資料:`, data);
    }

    if (!dataType) {
      console.log("無法從 URL 確定數據類型:", url);
      return null;
    }

    // 標準化數據
    const normalizedData = this.normalizeData(data, dataType);
    if (!normalizedData) return null;

    // 更新全局變數
    const varName = this.getVarName(dataType);
    if (varName) {
      window[varName] = normalizedData;
      if (dataType === "adultHealthCheck" || dataType === "cancerScreening" || dataType === "hbcvdata") {
        console.log(`[DEBUG] ${dataType} 已更新到全局變數 ${varName}:`, window[varName]);
      }
    }

    // 保存數據
    this.saveData(normalizedData, dataType, source);

    return {
      dataType,
      data: normalizedData
    };
  },

  // 保存數據到 localStorage
  saveDataToLocalStorage() {
    try {
      // 提取使用者資訊
      const userInfo = extractUserInfoFromToken();

      // 使用 dataVarMap 遍历获取所有数据，減少重複代碼和硬編碼
      const dataToShare = {
        userInfo: userInfo, // 加入使用者資訊
        timestamp: Date.now() // 添加时间戳以识别数据新鲜度
      };

      // 從 dataVarMap 中獲取所有數據類型和對應的變數名
      // 這樣避免硬編碼重複數據類型，使維護更容易
      for (const [dataType, varName] of this.dataVarMap.entries()) {
        // 特殊處理 labdata 類型，對應的存儲鍵為 lab
        const storageKey = dataType === 'labdata' ? 'lab' : dataType;
        dataToShare[storageKey] = window[varName];
      }

      // 檢查是否有數據
      const hasData = Object.values(dataToShare).some(value =>
        value !== null && value !== undefined && value !== false && value !== ''
      );

      if (hasData) {
        localStorage.setItem('NHITW_DATA', JSON.stringify(dataToShare));

        // 觸發存儲事件，便於其他擴展監聽
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      console.error('保存数据到 localStorage 时出错:', error);
    }
  },

  // 驗證數據有效性並更新全局變數
  validateAndUpdateData(data, dataType) {
    // 使用內部方法進行數據驗證和處理
    if (!this.isValidData(data, dataType)) {
      console.error(`無效的數據類型: ${dataType}`);
      return false;
    }

    // 更新全局變數
    const varName = this.getVarName(dataType);
    if (varName) {
      window[varName] = data;
    }

    const action = this.getAction(dataType);

    if (!action) {
      console.error(`不支援的資料類型: ${dataType}`);
      return false;
    }

    return true;
  },

  // 發送數據到後台腳本
  sendDataToBackground(data, dataType) {
    const action = this.getAction(dataType);

    chrome.runtime.sendMessage(
      {
        action: action,
        data: data,
        userSession: currentUserSession,
      },
      (response) => {
        if (response && response.status === "saved") {
          const recordCount = data.rObject.length;
          // 可以在此處添加保存成功後的處理邏輯
        }
      }
    );
  },

  // 保存數據函數
  saveData(data, dataType, source = "unknown") {
    // 數據檢驗和更新邏輯
    if (!this.validateAndUpdateData(data, dataType)) {
      return;
    }

    // 發送消息到後台腳本
    this.sendDataToBackground(data, dataType);

    // 保存到 localStorage
    this.saveDataToLocalStorage();
  },
};

// 使用此模塊替換原有的 getDataTypeFromUrl 函數
function getDataTypeFromUrl(url) {
  return DataProcessor.getDataTypeFromUrl(url);
}

// 監聽設置
function setupMonitoring() {
  if (isMonitoring) {
    console.log("Monitoring already active, skipping setup");
    return;
  }

  console.log("Setting up API monitoring");
  isMonitoring = true;
  hasExtractedToken = false; // 重置令牌狀態

  // 設置請求頭捕獲
  captureXhrRequestHeaders();

  // 監聽 XHR 請求
  const XHR = XMLHttpRequest.prototype;
  const open = XHR.open;
  const send = XHR.send;

  // 監聽 XHR open
  XHR.open = function () {
    this.url = arguments[1];
    return open.apply(this, arguments);
  };

  // 監聽 XHR send
  XHR.send = function () {
    const originalUrl = this.url;

    // 確保該 XHR 請求的 readyState, status 和 responseText 屬性能被攔截
    const originalAddEventListener = this.addEventListener;
    this.addEventListener = function (event, handler) {
      if (event === "load" || event === "readystatechange") {
        const newHandler = function () {
          // 檢查 URL 是否匹配任一 API 模式
          const isTargetUrl = Array.from(DataProcessor.API_URL_PATTERNS.values()).some(pattern =>
            originalUrl && originalUrl.includes(pattern)
          );

          if (isTargetUrl) {
            console.log(
              `XHR ${event} event fired for: ${originalUrl}, readyState: ${this.readyState}, status: ${this.status}`
            );

            if (this.readyState === 4 && this.status === 200) {
              try {
                // DEBUG: 檢查是否為 adultHealthCheck, cancerScreening 或 hbcvdata 的 API
                const isHealthCheckUrl = originalUrl.includes("/imue0140/imue0140s01/hpa-data");
                const isCancerScreeningUrl = originalUrl.includes("/imue0150/imue0150s01/hpa-data");
                const isHbcvdataUrl = originalUrl.includes("/imue0180/imue0180s01/hbcv-data");

                if (isHealthCheckUrl || isCancerScreeningUrl || isHbcvdataUrl) {
                  const urlType = isHealthCheckUrl ? "adultHealthCheck" : (isCancerScreeningUrl ? "cancerScreening" : "hbcvdata");
                  console.log(`[DEBUG] ========== 偵測到 ${urlType} API 回應 ==========`);
                  console.log(`[DEBUG] URL: ${originalUrl}`);
                  console.log(`[DEBUG] 回應大小: ${this.responseText.length} bytes`);
                }

                console.log(
                  `Complete XHR response received, size: ${this.responseText.length} bytes`
                );

                const data = JSON.parse(this.responseText);

                if (isHealthCheckUrl || isCancerScreeningUrl || isHbcvdataUrl) {
                  const urlType = isHealthCheckUrl ? "adultHealthCheck" : (isCancerScreeningUrl ? "cancerScreening" : "hbcvdata");
                  console.log(`[DEBUG] ${urlType} 解析後的 JSON:`, data);
                }

                // 使用 DataProcessor 處理 API 響應數據
                const result = DataProcessor.processApiResponse(data, originalUrl, "XHR");
                if (result) {
                  console.log(
                    `Successfully intercepted ${result.data.rObject.length} ${result.dataType} records via XHR`
                  );

                  // 嘗試提取並保存令牌
                  setTimeout(() => {
                    extractAndSaveToken();
                  }, 500);
                } else {
                  console.log(
                    "Response does not contain expected data structure:",
                    data
                  );
                }
              } catch (error) {
                console.error("Error processing XHR response:", error);
              }
            }
          }

          // 執行原始處理程序
          handler.apply(this, arguments);
        };

        return originalAddEventListener.call(this, event, newHandler);
      } else {
        return originalAddEventListener.apply(this, arguments);
      }
    };

    // 檢查 URL 是否匹配任一 API 模式
    const isTargetUrl = Array.from(DataProcessor.API_URL_PATTERNS.values()).some(pattern =>
      originalUrl && originalUrl.includes(pattern)
    );

    if (isTargetUrl) {
      console.log(`Monitoring XHR request to: ${originalUrl}`);
    }

    return send.apply(this, arguments);
  };

  console.log("XHR monitoring set up");

  // 同時監聽 fetch 請求
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : null;

    // 檢查 URL 是否匹配任一 API 模式
    const isTargetUrl = Array.from(DataProcessor.API_URL_PATTERNS.values()).some(pattern =>
      url && url.includes(pattern)
    );

    if (isTargetUrl) {
      console.log(`Monitoring fetch request to: ${url}`);

      try {
        // 執行原始 fetch 請求
        const response = await originalFetch.apply(this, arguments);

        // 只處理目標 API 請求的成功響應
        if (response.ok) {
          // 克隆響應，因為響應體只能被讀取一次
          const clonedResponse = response.clone();

          // 讀取響應數據
          clonedResponse
            .text()
            .then((text) => {
              console.log(
                `Complete fetch response received, size: ${text.length} bytes`
              );

              try {
                const data = JSON.parse(text);

                // 使用 DataProcessor 處理 API 響應數據
                const result = DataProcessor.processApiResponse(data, url);
                if (result) {
                  console.log(
                    `Successfully intercepted ${result.data.rObject.length} ${result.dataType} records via fetch`
                  );

                  // 嘗試提取並保存令牌
                  setTimeout(() => {
                    extractAndSaveToken();
                  }, 500);
                } else {
                  console.warn(
                    "Fetch response does not contain expected data structure:",
                    data
                  );
                }
              } catch (error) {
                console.error("Error parsing fetch response:", error);
              }
            })
            .catch((error) => {
              console.error("Error reading fetch response text:", error);
            });
        }

        return response;
      } catch (error) {
        console.error("Error during fetch interception:", error);
        throw error; // 重新拋出錯誤，以免中斷正常流程
      }
    }

    return originalFetch.apply(this, arguments);
  };

  console.log("Fetch monitoring set up");
}

// 保存數據的函數 - 對外接口
function saveData(data, dataType, source = "unknown") {
  // 直接調用 DataProcessor 模塊的方法
  DataProcessor.saveData(data, dataType, source);
}

// 驗證數據有效性並更新全局變數
function validateAndUpdateData(data, dataType) {
  // 使用內部方法進行數據驗證和處理
  if (!DataProcessor.isValidData(data, dataType)) {
    console.error(`無效的數據類型: ${dataType}`);
    return false;
  }

  // 更新全局變數
  const varName = DataProcessor.getVarName(dataType);
  if (varName) {
    window[varName] = data;
  }

  const action = DataProcessor.getAction(dataType);

  if (!action) {
    console.error(`不支援的資料類型: ${dataType}`);
    return false;
  }

  return true;
}

// 发送数据到后台脚本
function sendDataToBackground(data, dataType) {
  const action = DataProcessor.getAction(dataType);

  chrome.runtime.sendMessage(
    {
      action: action,
      data: data,
      userSession: currentUserSession,
    },
    (response) => {
      if (response && response.status === "saved") {
        const recordCount = data.rObject.length;
        // 可以在此处添加保存成功后的处理逻辑
      }
    }
  );
}

// 保存令牌
function saveToken(token) {
  hasExtractedToken = true;
  console.log("Successfully extracted token:", token.substring(0, 20) + "...");

  // 保存令牌到內存（不存到 localStorage）
  // 也發送給 background script 以供臨時使用
  chrome.runtime.sendMessage({
    action: "saveToken",
    token: token,
    userSession: currentUserSession,
  });
}

// XHR監聽以捕獲請求頭
function captureXhrRequestHeaders() {
  const XHR = XMLHttpRequest.prototype;
  const originalOpen = XHR.open;
  const originalSetRequestHeader = XHR.setRequestHeader;

  // 監聽所有的請求頭設置
  XHR.setRequestHeader = function (header, value) {
    // 確保每個XHR實例都有自己的requestHeaders對象
    if (!this._requestHeaders) {
      this._requestHeaders = {};
    }
    this._requestHeaders[header] = value;
    return originalSetRequestHeader.apply(this, arguments);
  };

  // 監聽open來獲取URL
  XHR.open = function () {
    const method = arguments[0];
    const url = arguments[1];
    this._method = method;
    this._url = url;

    // 檢查 URL 是否匹配任一 API 模式
    const isTargetUrl = Array.from(DataProcessor.API_URL_PATTERNS.values()).some(pattern =>
      url && url.includes(pattern)
    );

    if (isTargetUrl) {
      const xhr = this;
      this.addEventListener("loadend", function () {
        if (xhr.status === 200 && xhr._requestHeaders) {
          // console.log("Captured successful request headers for API:", xhr._url);
          // 儲存成功請求的headers
          lastSuccessfulRequestHeaders = Object.assign({}, xhr._requestHeaders);
          // console.log(
          //   "Headers captured:",
          //   Object.keys(lastSuccessfulRequestHeaders).join(", ")
          // );

          // 嘗試從headers中提取令牌
          if (lastSuccessfulRequestHeaders["Authorization"]) {
            const token = lastSuccessfulRequestHeaders["Authorization"];
            saveToken(token);
          }
        }
      });
    }

    return originalOpen.apply(this, arguments);
  };

  // console.log("XHR request header capturing set up");
}

// 從頁面中提取授權令牌
function extractAuthorizationToken() {
  // console.log('Searching for authorization token...');

  // 方法1: 優先使用已捕獲的請求頭中獲取
  if (
    lastSuccessfulRequestHeaders &&
    lastSuccessfulRequestHeaders["Authorization"]
  ) {
    // console.log('Found Authorization token in captured headers');
    return lastSuccessfulRequestHeaders["Authorization"];
  }

  // 方法2: 優先使用 sessionStorage (健保雲端系統實際使用的方式)
  try {
    const possibleTokenNames = [
      "jwt_token",
      "token",
      "access_token",
      "auth_token",
    ];
    for (const name of possibleTokenNames) {
      const token = sessionStorage.getItem(name);
      if (token) {
        // console.log(`Found token in sessionStorage with key "${name}"`);
        return token.startsWith("Bearer ") ? token : "Bearer " + token;
      }
    }
  } catch (error) {
    console.log("Could not access sessionStorage:", error);
  }

  // 方法3: 嘗試從頁面上的script標籤獲取
  try {
    const scripts = document.querySelectorAll("script");
    for (let script of scripts) {
      if (script.textContent && script.textContent.includes("token")) {
        const tokenMatch = script.textContent.match(
          /token\s*=\s*["']([^"']+)["']/
        );
        if (tokenMatch && tokenMatch[1]) {
          console.log("Found token in script tag");
          return "Bearer " + tokenMatch[1];
        }
      }
    }
  } catch (error) {
    console.log("Error searching scripts for token:", error);
  }

  // 最後才考慮使用 localStorage 方式
  // 由於localStorage會在不同使用者間保留，我們需要驗證令牌是否還有效
  try {
    const storageToken =
      localStorage.getItem("nhi_extractor_token") ||
      localStorage.getItem("jwt_token");
    if (storageToken) {
      // 檢查令牌是否過期或受污染
      if (validateToken(storageToken)) {
        console.log("Found valid token in localStorage");
        return storageToken.startsWith("Bearer ")
          ? storageToken
          : "Bearer " + storageToken;
      } else {
        console.log("Found token in localStorage but it appears invalid");
        localStorage.removeItem("nhi_extractor_token");
        localStorage.removeItem("jwt_token");
      }
    }
  } catch (error) {
    console.log("Could not access localStorage:", error);
  }

  console.warn("Could not find authorization token");
  return null;
}

// 驗證JWT令牌是否有效（基本檢查）
function validateToken(token) {
  try {
    // 移除Bearer前綴
    const jwtToken = token.startsWith("Bearer ") ? token.substring(7) : token;

    // 拆分令牌以獲取payload部分
    const parts = jwtToken.split(".");
    if (parts.length !== 3) {
      return false;
    }

    // 解碼payload部分（base64）
    const payload = JSON.parse(atob(parts[1]));

    // 檢查過期時間
    if (payload.exp) {
      const expiryDate = new Date(payload.exp * 1000);
      if (expiryDate < new Date()) {
        console.log("Token expired at", expiryDate);
        return false;
      }
    }

    // 檢查使用者ID與當前會話是否一致
    if (currentUserSession) {
      // 如果當前會話是從用戶ID提取的，則應該在令牌中找到該ID
      if (currentUserSession.includes("patient_") && payload.UserID2) {
        const sessionUserId = currentUserSession.replace("patient_", "");
        if (!payload.UserID2.includes(sessionUserId)) {
          console.log("Token user mismatch with current session");
          return false;
        }
      }

      // 檢查令牌是否屬於當前AuditBatchNo
      if (payload.AuditBatchNo && currentUserSession.includes("session_")) {
        // 這裡可以添加更多檢查邏輯
      }
    }

    return true;
  } catch (error) {
    console.error("Error validating token:", error);
    return false;
  }
}

// 新增: 檢查是否有抓取特定資料的設定
function shouldFetchData(dataType) {
  // 只對需要受控制的資料類型進行檢查，其他的預設為 true
  if (dataType === "adultHealthCheck") {
    // 檢查是否應該抓取成人預防保健資料
    return new Promise((resolve) => {
      chrome.storage.sync.get({ fetchAdultHealthCheck: true }, (items) => {
        resolve(items.fetchAdultHealthCheck);
      });
    });
  } else if (dataType === "cancerScreening") {
    // 檢查是否應該抓取四癌篩檢結果資料
    return new Promise((resolve) => {
      chrome.storage.sync.get({ fetchCancerScreening: true }, (items) => {
        resolve(items.fetchCancerScreening);
      });
    });
  } else if (dataType === "hbcvdata") {
    // 檢查是否應該抓取B、C肝炎專區資料
    return new Promise((resolve) => {
      chrome.storage.sync.get({ fetchHbcvdata: true }, (items) => {
        resolve(items.fetchHbcvdata);
      });
    });
  }

  // 其他資料類型預設為 true
  return Promise.resolve(true);
}

// 在 content.js 中添加一個新函數，用於獲取所有類型的資料
function fetchAllDataTypes() {
  // console.log("開始獲取所有資料類型");

  if (isBatchFetchInProgress) {
    // console.log("已有批次抓取進行中，跳過本次請求");
    return;
  }

  if (window.lastInterceptedMedicationData?.rObject && currentPatientId) {
    console.log("Data already fetched for patient:", currentPatientId);
    window.dispatchEvent(
      new CustomEvent("dataFetchCompleted", { detail: null })
    );
    return;
  }

  const hasPendingRequests = Object.values(pendingRequests).some(
    (pending) => pending
  );
  if (hasPendingRequests) {
    // console.log("已有獨立請求進行中，跳過本次批次抓取");
    return;
  }

  isBatchFetchInProgress = true;
  isDataFetchingStarted = true;
  window.nhiDataBeingFetched = true;

  // 先獲取主選單資料(masterMenu)，以判斷有哪些資料可獲取
  enhancedFetchData("masterMenu")
    .then((menuResult) => {
      // console.log("獲取主選單資料成功，開始處理其他資料");

      // 定義所有要獲取的資料類型
      const dataTypes = [
        "medication",
        "labdata",
        "chinesemed",
        "imaging",
        "allergy",
        "surgery",
        "discharge",
        "medDays",
        "patientsummary",
        // "rehabilitation",
        // "acupuncture",
        // "specialChineseMedCare",
      ];

      // 根據授權過濾並獲取資料類型
      const fetchPromises = dataTypes.map((dataType) => {
        if (isDataTypeAuthorized(dataType)) {
          // console.log(`${dataType} 已授權，開始取資料`);
          return enhancedFetchData(dataType).catch((err) => {
            console.error(`獲取 ${dataType} 資料時發生錯誤:`, err);
            return { status: "error", recordCount: 0, error: err, dataType };
          });
        } else {
          // console.log(`${dataType} 無資料，返回空集合`);
          // 未授權的資料類型返回空集合
          return Promise.resolve(createEmptyDataResult(dataType));
        }
      });

      // 獲取設定並根據設定決定是否抓取特殊資料類型
      const specialDataTypes = ["adultHealthCheck", "cancerScreening", "hbcvdata", "labdraw"];
      console.log("[DEBUG] 開始檢查特殊資料類型:", specialDataTypes);
      const specialFetchPromises = specialDataTypes.map((dataType) => {
        return shouldFetchData(dataType).then((shouldFetch) => {
          const isAuthorized = isDataTypeAuthorized(dataType);
          console.log(`[DEBUG] ${dataType} - shouldFetch: ${shouldFetch}, isAuthorized: ${isAuthorized}`);

          if (shouldFetch && isAuthorized) {
            console.log(`[DEBUG] ========== 開始抓取 ${dataType} ==========`);
            return enhancedFetchData(dataType).catch((err) => {
              console.error(`獲取 ${dataType} 資料時發生錯誤:`, err);
              return { status: "error", recordCount: 0, error: err, dataType };
            });
          } else {
            console.log(`[DEBUG] ${dataType} 設定不抓取或無授權，返回空集合`);
            return Promise.resolve(createEmptyDataResult(dataType));
          }
        });
      });

      // 執行所有請求
      return Promise.all([...fetchPromises, ...specialFetchPromises]);
    })
    .catch((err) => {
      console.error("獲取主選單資料失敗:", err);

      // 如果獲取主選單資料失敗，則使用原本的方式獲取所有資料
      console.log("切換到無授權檢查模式，嘗試獲取所有資料類型");

      return Promise.all([
        enhancedFetchData("medication").catch((err) => ({
          status: "error",
          recordCount: 0,
          error: err,
        })),
        enhancedFetchData("labdata").catch((err) => ({
          status: "error",
          recordCount: 0,
          error: err,
        })),
        enhancedFetchData("chinesemed").catch((err) => ({
          status: "error",
          recordCount: 0,
          error: err,
        })),
        enhancedFetchData("imaging").catch((err) => ({
          status: "error",
          recordCount: 0,
          error: err,
        })),
        enhancedFetchData("allergy").catch((err) => ({
          status: "error",
          recordCount: 0,
          error: err,
        })),
        enhancedFetchData("surgery").catch((err) => ({
          status: "error",
          recordCount: 0,
          error: err,
        })),
        enhancedFetchData("discharge").catch((err) => ({
          status: "error",
          recordCount: 0,
          error: err,
        })),
        enhancedFetchData("medDays").catch((err) => ({
          status: "error",
          recordCount: 0,
          error: err,
        })),
        enhancedFetchData("patientsummary").catch((err) => ({
          status: "error",
          recordCount: 0,
          error: err,
        })),
      ]);
    })
    .then((results) => {
      // console.log("所有資料獲取完成，結果:", results);

      // 使用 Map 創建計數對象
      const countsMap = new Map([
        ["medication", 0],
        ["labData", 0],
        ["chineseMed", 0],
        ["imaging", 0],
        ["allergy", 0],
        ["surgery", 0],
        ["discharge", 0],
        ["medDays", 0],
        ["patientSummary", 0],
        ["masterMenu", 1], // 主選單資料已獲取
        ["adultHealthCheck", 1], // 成人預防保健資料已獲取
        ["cancerScreening", 1], // 四癌篩檢結果資料已獲取
      ]);

      // 填充實際計數
      results.forEach(result => {
        if (result.dataType === "medication") countsMap.set("medication", result.recordCount || 0);
        else if (result.dataType === "labdata") countsMap.set("labData", result.recordCount || 0);
        else if (result.dataType === "chinesemed") countsMap.set("chineseMed", result.recordCount || 0);
        else if (result.dataType === "imaging") countsMap.set("imaging", result.recordCount || 0);
        else if (result.dataType === "allergy") countsMap.set("allergy", result.recordCount || 0);
        else if (result.dataType === "surgery") countsMap.set("surgery", result.recordCount || 0);
        else if (result.dataType === "discharge") countsMap.set("discharge", result.recordCount || 0);
        else if (result.dataType === "medDays") countsMap.set("medDays", result.recordCount || 0);
        else if (result.dataType === "patientsummary") countsMap.set("patientSummary", result.recordCount || 0);
        else if (result.dataType === "adultHealthCheck") countsMap.set("adultHealthCheck", result.recordCount || 0);
        else if (result.dataType === "cancerScreening") countsMap.set("cancerScreening", result.recordCount || 0);
      });

      // Build notification text
      const dataCounts = [];
      if (countsMap.get("medication") > 0) dataCounts.push(`${countsMap.get("medication")} 筆藥歷`);
      if (countsMap.get("labData") > 0) dataCounts.push(`${countsMap.get("labData")} 筆檢驗`);
      if (countsMap.get("chineseMed") > 0) dataCounts.push(`${countsMap.get("chineseMed")} 筆中醫`);
      if (countsMap.get("imaging") > 0) dataCounts.push(`${countsMap.get("imaging")} 筆影像`);
      if (countsMap.get("allergy") > 0) dataCounts.push(`${countsMap.get("allergy")} 筆過敏`);
      if (countsMap.get("surgery") > 0) dataCounts.push(`${countsMap.get("surgery")} 筆手術`);
      if (countsMap.get("discharge") > 0) dataCounts.push(`${countsMap.get("discharge")} 筆病摘`);
      if (countsMap.get("medDays") > 0) dataCounts.push(`${countsMap.get("medDays")} 筆餘藥`);
      if (countsMap.get("patientSummary") > 0) dataCounts.push(`${countsMap.get("patientSummary")} 筆摘要`);
      if (countsMap.get("adultHealthCheck") > 0) dataCounts.push(`${countsMap.get("adultHealthCheck")} 筆成人預防保健`);
      if (countsMap.get("cancerScreening") > 0) dataCounts.push(`${countsMap.get("cancerScreening")} 筆四癌篩檢結果`);

      let notificationText;
      if (dataCounts.length === 0) {
        notificationText = "無資料";
      } else if (dataCounts.length === 1) {
        notificationText = `已抓到 ${dataCounts[0]}`;
      } else {
        const lastItem = dataCounts.pop();
        notificationText = `已抓到 ${dataCounts.join("、")}及${lastItem}`;
      }

      // 發送自訂事件
      const event = new CustomEvent("dataFetchCompleted", { detail: results });
      window.dispatchEvent(event);

      // Check if autoOpenPage is true and open the dialog if it is
      chrome.storage.sync.get({ autoOpenPage: false }, function (items) {
        if (items.autoOpenPage && window.openFloatingIconDialog) {
          // Add a small delay to ensure the data is fully processed
          setTimeout(() => {
            window.openFloatingIconDialog();
          }, 500);
        }
      });
    })
    .catch((error) => {
      console.error("獲取資料時發生錯誤:", error);
    })
    .finally(() => {
      isBatchFetchInProgress = false;
      isDataFetchingStarted = false;
      window.nhiDataBeingFetched = false;
      Object.keys(pendingRequests).forEach((key) => {
        pendingRequests[key] = false;
      });
    });
}

// 使用 Map 定義 API 路徑
const apiPathMap = new Map([
  ["medication", "imue0008/imue0008s02/get-data"],
  ["labdata", "imue0060/imue0060s02/get-data"],
  ["labdraw", "imue0060/imue0060s03/get-data"],
  ["chinesemed", "imue0090/imue0090s02/get-data"],
  ["imaging", "imue0130/imue0130s02/get-data"],
  ["allergy", "imue0040/imue0040s02/get-data"],
  ["surgery", "imue0020/imue0020s02/get-data"],
  ["discharge", "imue0070/imue0070s02/get-data"],
  ["medDays", "imue0120/imue0120s01/pres-med-day"],
  ["patientsummary", "imue2000/imue2000s01/get-summary"],
  ["masterMenu", "imue1000/imue1000s02/master-menu"],
  ["adultHealthCheck", "imue0140/imue0140s01/hpa-data"],
  ["cancerScreening", "imue0150/imue0150s01/hpa-data"],
  ["hbcvdata", "imue0180/imue0180s01/hbcv-data"],
  // ["rehabilitation", "imue0080/imue0080s02/get-data"],
  // ["acupuncture", "imue0160/imue0160s02/get-data"],
  // ["specialChineseMedCare", "imue0170/imue0170s02/get-data"]
]);

function enhancedFetchData(dataType, options = {}) {
  const {
    showUI = true, // 是否顯示 UI 提示
    maxRetries = 3, // 最大重試次數
    retryInterval = 5000, // 重試間隔（毫秒）
  } = options;

  // 檢查資料類型是否有效
  const validDataTypes = [
    "medication",
    "labdata",
    "labdraw",
    "chinesemed",
    "imaging",
    "allergy",
    "surgery",
    "discharge",
    "medDays",
    "patientsummary",
    "masterMenu",
    "adultHealthCheck",
    "cancerScreening",
    "hbcvdata",
    // "rehabilitation",
    // "acupuncture",
    // "specialChineseMedCare",
  ];

  if (!validDataTypes.includes(dataType)) {
    const error = new Error(`不支援的資料類型: ${dataType}`);

    return Promise.reject(error);
  }

  // 檢查是否有進行中的請求
  if (pendingRequests[dataType]) {
    console.log(`${dataType} 已有進行中的請求，跳過`);
    return Promise.reject(new Error("REQUEST_IN_PROGRESS"));
  }

  // 設置請求狀態
  pendingRequests[dataType] = true;
  let retryCount = 0;
  // console.log(`開始獲取 ${dataType} 資料 - ${new Date().toISOString()}`);

  // 主要的獲取邏輯
  const attemptFetch = () => {
    return new Promise((resolve, reject) => {
      // 構建 API URL
      const apiPath = apiPathMap.get(dataType);
      let apiUrl;

      if (dataType === "patientsummary") {
        apiUrl =
          `https://medcloud2.nhi.gov.tw/imu/api/${apiPath}?drug_phet=false&drug_hemo=false&ctmri_assay=false&ctmri_dent=true&cli_datetime=` +
          encodeURIComponent(new Date().toISOString().substring(0, 19));
      } else if (dataType === "masterMenu") {
        apiUrl = `https://medcloud2.nhi.gov.tw/imu/api/${apiPath}`;
      } else {
        apiUrl =
          `https://medcloud2.nhi.gov.tw/imu/api/${apiPath}?cli_datetime=` +
          encodeURIComponent(new Date().toISOString().substring(0, 19)) +
          "&insert_log=true";
      }

      // 構建請求頭
      const headers = {
        Accept: "application/json, text/plain, */*",
        "X-Requested-With": "XMLHttpRequest",
      };

      // 添加授權令牌
      const authToken = extractAuthorizationToken();
      if (!authToken) {
        const error = new Error("無法獲取授權令牌");
        pendingRequests[dataType] = false;

        return reject(error);
      }
      headers["Authorization"] = authToken;

      // 添加其他必要的請求頭
      if (lastSuccessfulRequestHeaders) {
        ["AuditBatchNo", "LoginID", "client-os"].forEach((header) => {
          if (lastSuccessfulRequestHeaders[header]) {
            headers[header] = lastSuccessfulRequestHeaders[header];
          }
        });
      }

      // 發送請求
      fetch(apiUrl, {
        method: "GET",
        credentials: "include",
        headers: headers,
        cache: "no-store",
      })
        .then((response) => {
          // console.log(`${dataType} API response:`, response.status, apiUrl);
          if (!response.ok) {
            if (response.status === 401 && retryCount < maxRetries) {
              retryCount++;

              return new Promise((resolve) =>
                setTimeout(() => resolve(attemptFetch()), retryInterval)
              );
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          // DEBUG: 輸出 adultHealthCheck 和 cancerScreening 的回應
          if (dataType === "adultHealthCheck" || dataType === "cancerScreening") {
            console.log(`[DEBUG] enhancedFetchData 收到 ${dataType} 回應:`, data);
          }

          const recordsArray = data.rObject || data.robject;
          if (
            data &&
            (recordsArray !== undefined ||
              dataType === "medDays" ||
              dataType === "labdraw" ||
              dataType === "patientsummary" ||
              dataType === "masterMenu" ||
              dataType === "adultHealthCheck" ||
              dataType === "cancerScreening" ||
              dataType === "hbcvdata")
          ) {
            let rObject;
            let normalizedData;

            if (dataType === "medDays" || dataType === "labdraw") {
              // medDays 和 labdraw 直接返回陣列
              rObject = Array.isArray(data) ? data : [data];
              normalizedData = { rObject: rObject };
            } else if (dataType === "patientsummary") {
              rObject = Array.isArray(recordsArray) ? recordsArray : (recordsArray ? [recordsArray] : []);
              normalizedData = { rObject: rObject };
            } else if (dataType === "masterMenu") {
              // masterMenu 需要包裝整個 data 物件（包含 prsnAuth 等授權資訊）
              rObject = [data];
              normalizedData = { rObject: rObject };
            } else if (dataType === "adultHealthCheck" || dataType === "cancerScreening" || dataType === "hbcvdata") {
              // adultHealthCheck, cancerScreening 和 hbcvdata 只包裝 robject，不保留 originalData 以節省記憶體
              rObject = recordsArray ? [recordsArray] : [];
              normalizedData = { rObject: rObject };
              console.log(`[DEBUG] ${dataType} 標準化後的資料:`, normalizedData);
            } else {
              rObject = Array.isArray(recordsArray) ? recordsArray : [];
              normalizedData = { rObject: rObject };
            }

            // 使用 Map 更新全局變數
            const varName = DataProcessor.getVarName(dataType);
            if (varName) {
              window[varName] = normalizedData;
              if (dataType === "adultHealthCheck" || dataType === "cancerScreening" || dataType === "hbcvdata") {
                console.log(`[DEBUG] ${dataType} 已更新全局變數 ${varName}:`, window[varName]);
              }
            }

            saveData(normalizedData, dataType, "direct");
            const recordCount = normalizedData.rObject.length;
            console.log(`[DEBUG] ${dataType} 請求完成，記錄數: ${recordCount}`);
            resolve({
              status: "success",
              recordCount: recordCount,
              dataType: dataType,
              data: normalizedData,
            });
          } else {
            console.error(`[DEBUG] ${dataType} 資料格式不符，data:`, data);
            throw new Error(`${dataType} 資料格式不符`);
          }
        })
        .catch((error) => {
          console.error(`Error fetching ${dataType}:`, error);
          reject(error);
        })
        .finally(() => {
          pendingRequests[dataType] = false;
        });
    });
  };

  return attemptFetch();
}

// 修改 extractAndSaveToken 函數，移除自動觸發獲取數據的部分
function extractAndSaveToken() {
  if (hasExtractedToken) {
    console.log("Token already extracted, skipping additional extraction");
    return true;
  }

  const token = extractAuthorizationToken();
  if (token) {
    saveToken(token);
    return true;
  }

  return false;
}

// 新增輔助函數來獲取資料類型的中文名稱
function getTypeText(type) {
  return DataProcessor.getTypeText(type) || type;
}

// 新增: 節點ID與資料類型對應表（使用陣列以支援一個節點對應多個資料類型）
const nodeToDataTypeMap = [
  ["1.1", "patientsummary"],
  ["1.2", "hbcvdata"],
  ["2.1", "medication"],
  ["2.4", "medDays"],
  ["3.1", "chinesemed"],
  // ["3.2", "acupuncture"],
  // ["3.3", "specialChineseMedCare"],
  ["5.1", "allergy"],
  ["6.1", "labdata"],
  ["6.1", "labdraw"], // labdraw 也屬於 6.1 節點
  ["6.2", "imaging"],
  ["6.3", "adultHealthCheck"],
  ["6.4", "cancerScreening"],
  ["7.1", "surgery"],
  ["8.1", "discharge"],
  // ["9.1", "rehabilitation"]
];

// 新增: 檢查資料類型是否有授權
function isDataTypeAuthorized(dataType) {
  // 如果尚未獲取主選單資料，預設所有資料類型都有授權
  if (!window.lastInterceptedMasterMenuData) {
    return true;
  }

  try {
    const masterMenuData = window.lastInterceptedMasterMenuData;
    // masterMenu 的資料在 rObject[0] 中
    const menuData = masterMenuData.rObject?.[0] || masterMenuData;
    const prsnAuth = menuData.prsnAuth || [];

    // 反向查找: 從資料類型找到對應的節點ID
    const nodeIds = [];
    for (const [node, type] of nodeToDataTypeMap) {
      if (type === dataType) {
        nodeIds.push(node);
      }
    }

    // 檢查任何對應的節點ID是否在授權列表中
    return nodeIds.some((nodeId) => prsnAuth.includes(nodeId));
  } catch (error) {
    console.error("Error checking authorization:", error);
    // 發生錯誤時，預設有授權
    return true;
  }
}

// 新增: 建立空的資料結果
function createEmptyDataResult(dataType) {
  // Create empty data structure
  const emptyData = {
    rObject: []
  };

  // 使用 Map 更新對應的全局變數
  const varName = DataProcessor.getVarName(dataType);
  if (varName) {
    window[varName] = emptyData;
  }

  return {
    status: "nodata",
    recordCount: 0,
    dataType: dataType,
    data: emptyData,
  };
}

// 注入 FloatingIcon
function injectFloatingIcon() {
  const div = document.createElement("div");
  div.innerHTML = `
    <div style="position: fixed; right: 20px; top: 50%; transform: translateY(-50%); z-index: 9999;">
      <img src="${chrome.runtime.getURL(
    "images/icon-128.png"
  )}" style="width: 48px; height: 48px; cursor: pointer;" />
    </div>
  `;
  div.onclick = () => chrome.runtime.sendMessage({ action: "openPopup" });
  document.body.appendChild(div);
}

// 監聽來自背景腳本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "apiCallDetected") {
    // 只在debug模式下顯示詳細API呼叫資訊
    // console.log("Background script detected API call:", message.url);
    // const dataType = message.type || 'unknown';
    // console.log(`Data type: ${dataType}`);

    checkAndInitUserSession().then((isNewSession) => {
      if (!isNewSession && window.lastInterceptedMedicationData?.rObject) {
        // 已有資料的情況，不需頻繁紀錄
        // console.log("Same patient, reusing existing data:", currentPatientId);
        window.dispatchEvent(
          new CustomEvent("dataFetchCompleted", { detail: null })
        );
      } else {
        // 新病人或無資料的情況，只顯示一次
        // if (!isBatchFetchInProgress) {
        //   console.log(
        //     "New patient or no data, fetching new data:",
        //     currentPatientId
        //   );
        // }

        // 只有在一定時間後才清除資料並啟動新的抓取，避免重複清除
        if (!isBatchFetchInProgress) {
          // 使用統一的清除資料函數，它已內建去抖動機制
          performClearPreviousData();

          // 如果清除資料後再執行抓取
          setTimeout(() => {
            isDataFetchingStarted = true;
            window.nhiDataBeingFetched = true;
            window.medicationDataProcessed = false;
            window.labDataProcessed = false;
            Object.keys(pendingRequests).forEach(
              (key) => (pendingRequests[key] = false)
            );
            fetchAllDataTypes();
          }, 500);
        }
      }
    });
  }

  if (message.action === "apiCallCompleted") {
    // console.log("API call completed with status:", message.statusCode);
    isDataFetchingStarted = false; // 抓取完成後重置
  }

  if (message.action === "manualFetchData") {
    console.log("Manual data fetch requested from popup");
    fetchAllDataTypes();
    sendResponse({ status: "fetching" });
    return true;
  }

  if (message.action === "dataCleared") {
    console.log("Data cleared from popup");
    // Reset local data variables
    for (const varName of DataProcessor.dataVarMap.values()) {
      window[varName] = null;
    }

    sendResponse({ status: "cleared" });
    return true;
  }

  if (message.action === "openDashboard") {
    console.log("Opening dashboard requested from popup");
    // Find the floating icon component and trigger its click event
    const floatingIcon = document.querySelector("#nhi-floating-root button");
    if (floatingIcon) {
      floatingIcon.click();
      sendResponse({ status: "opened" });
    } else {
      sendResponse({
        status: "error",
        message: "Dashboard component not found",
      });
    }
    return true;
  }

  if (message.action === "settingChanged") {
    // Handle setting changes and trigger UI update if needed
    console.log(`Setting changed: ${message.setting} = ${message.value}`);

    if (message.allSettings) {
      console.log("All settings:", message.allSettings);
    }

    // Determine which type of setting changed
    const isMedicationSetting = [
      "simplifyMedicineName",
      "showDiagnosis",
      "showGenericName",
      "enableATC5Coloring",
      "copyFormat",
    ].includes(message.setting);

    const isChineseMedSetting = [
      "chineseMedShowDiagnosis",
      "chineseMedShowEffectName",
      "chineseMedDoseFormat",
      "chineseMedCopyFormat",
    ].includes(message.setting);

    // Dispatch appropriate events based on setting type
    if (isMedicationSetting || isChineseMedSetting) {
      // Force refresh of the UI components with a small delay
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("dataFetchCompleted", {
            detail: {
              settingsChanged: true,
              settingType: isMedicationSetting ? "medication" : "chinesemed",
              setting: message.setting,
              value: message.value,
              allSettings: message.allSettings,
            },
          })
        );
        console.log("Dispatched dataFetchCompleted event after setting change");
      }, 100); // Small delay to ensure storage is updated
    }

    sendResponse({ status: "setting_updated" });
    return true;
  }

  sendResponse({ status: "received" });
  return true;
});

window.fetchNHI_Data = fetchAllDataTypes; // 暴露抓取所有資料的函數
window.getSessionData = extractUserInfo; // 暴露會話資訊提取函數

// 新增一個自動觸發函數，頁面加載完成後檢查並啟動抓取功能
function triggerExtraction() {
  console.log("Checking if we need to extract data on this page...");
  const currentPage = window.location.href;

  // 特別針對病患摘要頁面檢查
  if (currentPage.includes("/imu/IMUE1000/IMUE2000")) {
    console.log("On patient summary page, triggering data extraction");
    setTimeout(() => {
      enhancedFetchData("patientsummary")
        .then((data) => {
          console.log("Successfully fetched patient summary data");
        })
        .catch((error) => {
          console.error("Error fetching patient summary data:", error);
        });
    }, 1500);
  }

  setupMonitoring();
}

// 添加訊息監聽器用於下載資料
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getPatientData") {
    try {
      // 提取使用者資訊
      const userInfo = extractUserInfoFromToken();

      // 收集所有病人資料
      const patientData = {
        userInfo: userInfo, // 加入使用者資訊
        timestamp: Date.now(), // 加入時間戳
        medication: window.lastInterceptedMedicationData,
        lab: window.lastInterceptedLabData,
        labdraw: window.lastInterceptedLabDrawData,
        chinesemed: window.lastInterceptedChineseMedData,
        imaging: window.lastInterceptedImagingData,
        allergy: window.lastInterceptedAllergyData,
        surgery: window.lastInterceptedSurgeryData,
        discharge: window.lastInterceptedDischargeData,
        medDays: window.lastInterceptedMedDaysData,
        patientSummary: window.lastInterceptedPatientSummaryData,
        masterMenu: window.lastInterceptedMasterMenuData,
        adultHealthCheck: window.lastInterceptedAdultHealthCheckData,
        cancerScreening: window.lastInterceptedCancerScreeningData,
        hbcvdata: window.lastInterceptedHbcvdata,
        // rehabilitation: window.lastInterceptedRehabilitationData,
        // acupuncture: window.lastInterceptedAcupunctureData,
        // specialChineseMedCare: window.lastInterceptedSpecialChineseMedCareData,
      };

      // 檢查是否有任何資料
      let hasAnyData = false;

      // 詳細檢查每個項目
      for (const [key, value] of Object.entries(patientData)) {
        if (value && typeof value === "object") {
          if (
            value.rObject &&
            Array.isArray(value.rObject) &&
            value.rObject.length > 0
          ) {
            hasAnyData = true;
            break;
          }
        }
      }

      if (hasAnyData) {
        // 實現直接在 content script 觸發下載
        const date = new Date();
        // 使用 userID 作為檔案名稱，如果沒有則使用 "unknown"
        const userIdPrefix = userInfo?.userId || "unknown";
        const fileName = `${userIdPrefix}_${date.getFullYear()}${(
          date.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}_${date
            .getHours()
            .toString()
            .padStart(2, "0")}${date
              .getMinutes()
              .toString()
              .padStart(2, "0")}.json`;

        // 轉換成 JSON 字串
        const jsonString = JSON.stringify(patientData, null, 2);

        // 建立 Blob 和下載連結
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // 建立下載連結並點擊
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = fileName;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();

        // 釋放資源
        setTimeout(() => {
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(url);
        }, 100);

        // 立即回應 popup 已直接處理下載
        sendResponse({
          status: "success",
          message: "已直接處理下載",
          directDownload: true,
        });
      } else {
        sendResponse({
          error: "無法獲取病人資料",
          status: "error",
        });
      }
    } catch (err) {
      sendResponse({
        error: "處理下載時發生錯誤: " + err.message,
        status: "error",
      });
    }

    return true; // 保持連接開啟以進行非同步回應
  }
});

// 新增: 使用 localStorage 保存数据的功能
function saveDataToLocalStorage() {
  // 直接调用 DataProcessor 模块中的方法
  DataProcessor.saveDataToLocalStorage();
} 