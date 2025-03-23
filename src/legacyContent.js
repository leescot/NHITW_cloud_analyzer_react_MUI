// content.js - Modified to handle user sessions
console.log("Content script loaded for NHI data extractor (Automated Version)");

let currentPatientId = null; // 新增追踪當前病人

// 在檔案頂部定義全局變數
window.lastInterceptedMedicationData = null;
window.lastInterceptedLabData = null;
window.lastInterceptedChineseMedData = null;
window.lastInterceptedImagingData = null;
window.lastInterceptedAllergyData = null;
window.lastInterceptedSurgeryData = null;
window.lastInterceptedDischargeData = null;
window.lastInterceptedMedDaysData = null;
window.lastInterceptedPatientSummaryData = null;
window.lastInterceptedMasterMenuData = null; // 新增主選單數據
window.lastInterceptedRehabilitationData = null; // 新增復健資料
window.lastInterceptedAcupunctureData = null; // 新增針灸資料
window.lastInterceptedSpecialChineseMedCareData = null; // 新增特殊中醫處置資料

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
  chinesemed: false,
  imaging: false,
  allergy: false,
  surgery: false,
  discharge: false,
  medDays: false,
  patientsummary: false, // 新增病患摘要
  masterMenu: false, // 新增主選單
};

// 在頁面加載後自動初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

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
  lastInterceptedChineseMedData = null;
  lastInterceptedImagingData = null;
  lastInterceptedAllergyData = null;
  lastInterceptedSurgeryData = null;
  lastInterceptedDischargeData = null;
  lastInterceptedMedDaysData = null;
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
  return (
    url.includes("medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0008") ||
    url.includes("medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0060") ||
    url.includes("medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0090") || // Chinese medicine
    url.includes("medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0130") || // Imaging
    url.includes("medcloud2.nhi.gov.tw/imu/IMUE2000/IMUE2000")
  ); // Patient summary
}

// 判斷頁面類型
function getPageType() {
  const url = window.location.href;
  if (url.includes("/IMUE0008")) return "medication";
  if (url.includes("/IMUE0060")) return "labdata";
  if (url.includes("/IMUE0090")) return "chinesemed";
  if (url.includes("/IMUE0130")) return "imaging";
  if (url.includes("/IMUE0040")) return "allergy";
  if (url.includes("/IMUE0020")) return "surgery";
  if (url.includes("/IMUE0070")) return "discharge";
  if (url.includes("/IMUE0120")) return "medDays";
  if (url.includes("/IMUE2000")) return "patientsummary";
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
          console.log(
            "User session changed from:",
            storedSession,
            "to:",
            userInfo
          );
          performClearPreviousData();
          currentPatientId = userInfo; // 更新當前病人標識
          chrome.storage.local.set({ currentUserSession: userInfo }, () => {
            console.log("New user session saved:", userInfo);
            chrome.runtime.sendMessage({
              action: "userSessionChanged",
              userSession: userInfo,
            });
            resolve(true); // 表示新病人
          });
        } else {
          currentUserSession = userInfo;
          currentPatientId = userInfo; // 更新但不清除資料
          // console.log('Same user session:', userInfo);
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
      lastInterceptedChineseMedData = null;
      lastInterceptedImagingData = null;
      lastInterceptedAllergyData = null;
      lastInterceptedSurgeryData = null;
      lastInterceptedDischargeData = null;
      lastInterceptedMedDaysData = null;
      lastInterceptedPatientSummaryData = null;
      lastInterceptedMasterMenuData = null;
      lastInterceptedRehabilitationData = null;
      lastInterceptedAcupunctureData = null;
      lastInterceptedSpecialChineseMedCareData = null;
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
    // console.log('Using cached user info:', cachedUserInfo);
    return cachedUserInfo;
  }

  // 方法1: 從 Authorization token 中提取 UserID（優先）
  try {
    const token = extractAuthorizationToken();
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1])); // 解碼 JWT payload
      const userId = payload.UserID; // 提取 UserID（健保卡號）
      if (userId) {
        console.log("Extracted UserID from token:", userId);
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
            console.log(
              "New patient or no data due to URL change, fetching..."
            );
            fetchAllDataTypes();
          } else {
            console.log("Same patient after URL change, reusing data");
          }
        });
      }
    }
  }, 1000);
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

  // API URL 模式
  const MEDICATION_API_URL_PATTERN = "/imu/api/imue0008/imue0008s02/get-data";
  const LABDATA_API_URL_PATTERN = "/imu/api/imue0060/imue0060s02/get-data";
  const CHINESE_MED_API_URL_PATTERN = "/imu/api/imue0090/imue0090s02/get-data";
  const IMAGING_API_URL_PATTERN = "/imu/api/imue0130/imue0130s02/get-data";
  const ALLERGY_API_URL_PATTERN = "/imu/api/imue0040/imue0040s02/get-data";
  const SURGERY_API_URL_PATTERN = "/imu/api/imue0020/imue0020s02/get-data";
  const DISCHARGE_API_URL_PATTERN = "/imu/api/imue0070/imue0070s02/get-data";
  const MED_DAYS_API_URL_PATTERN = "/imu/api/imue0120/imue0120s01/pres-med-day";
  const PATIENT_SUMMARY_API_URL_PATTERN =
    "/imu/api/imue2000/imue2000s01/get-summary";
  const MASTER_MENU_API_URL_PATTERN =
    "/imu/api/imue1000/imue1000s02/master-menu";
  const REHABILITATION_API_URL_PATTERN =
    "/imu/api/imue0080/imue0080s02/get-data";
  const ACUPUNCTURE_API_URL_PATTERN = "/imu/api/imue0160/imue0160s02/get-data";
  const SPECIAL_CHINESE_MED_CARE_API_URL_PATTERN =
    "/imu/api/imue0170/imue0170s02/get-data";

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
          // 只處理目標 API 請求
          if (
            originalUrl &&
            (originalUrl.includes(MEDICATION_API_URL_PATTERN) ||
              originalUrl.includes(LABDATA_API_URL_PATTERN) ||
              originalUrl.includes(CHINESE_MED_API_URL_PATTERN) ||
              originalUrl.includes(IMAGING_API_URL_PATTERN) ||
              originalUrl.includes(ALLERGY_API_URL_PATTERN) ||
              originalUrl.includes(SURGERY_API_URL_PATTERN) ||
              originalUrl.includes(DISCHARGE_API_URL_PATTERN) ||
              originalUrl.includes(MED_DAYS_API_URL_PATTERN) ||
              originalUrl.includes(PATIENT_SUMMARY_API_URL_PATTERN) ||
              originalUrl.includes(MASTER_MENU_API_URL_PATTERN) ||
              originalUrl.includes(REHABILITATION_API_URL_PATTERN) ||
              originalUrl.includes(ACUPUNCTURE_API_URL_PATTERN) ||
              originalUrl.includes(SPECIAL_CHINESE_MED_CARE_API_URL_PATTERN))
          ) {
            console.log(
              `XHR ${event} event fired for: ${originalUrl}, readyState: ${this.readyState}, status: ${this.status}`
            );

            if (this.readyState === 4 && this.status === 200) {
              try {
                console.log(
                  `Complete XHR response received, size: ${this.responseText.length} bytes`
                );

                const data = JSON.parse(this.responseText);

                // For master-menu, log the response data
                if (originalUrl.includes(MASTER_MENU_API_URL_PATTERN)) {
                  console.log(
                    "Master Menu API Response:",
                    JSON.stringify(data, null, 2)
                  );
                }

                // 檢查 robject（小寫）或 rObject（大寫），兩者都接受
                const recordsArray = data.rObject || data.robject;

                // 強化資料格式檢查
                if (
                  data &&
                  ((recordsArray && Array.isArray(recordsArray)) ||
                    originalUrl.includes(MASTER_MENU_API_URL_PATTERN))
                ) {
                  // 統一格式
                  const normalizedData = {
                    rObject: originalUrl.includes(MASTER_MENU_API_URL_PATTERN)
                      ? [data]
                      : recordsArray,
                    originalData: data,
                  };

                  // 判斷是藥歷還是檢驗資料
                  const dataType = originalUrl.includes(
                    MEDICATION_API_URL_PATTERN
                  )
                    ? "medication"
                    : originalUrl.includes(LABDATA_API_URL_PATTERN)
                    ? "labdata"
                    : originalUrl.includes(CHINESE_MED_API_URL_PATTERN)
                    ? "chinesemed"
                    : originalUrl.includes(IMAGING_API_URL_PATTERN)
                    ? "imaging"
                    : originalUrl.includes(ALLERGY_API_URL_PATTERN)
                    ? "allergy"
                    : originalUrl.includes(SURGERY_API_URL_PATTERN)
                    ? "surgery"
                    : originalUrl.includes(DISCHARGE_API_URL_PATTERN)
                    ? "discharge"
                    : originalUrl.includes(MED_DAYS_API_URL_PATTERN)
                    ? "medDays"
                    : originalUrl.includes(PATIENT_SUMMARY_API_URL_PATTERN)
                    ? "patientsummary"
                    : originalUrl.includes(MASTER_MENU_API_URL_PATTERN)
                    ? "masterMenu"
                    : originalUrl.includes(REHABILITATION_API_URL_PATTERN)
                    ? "rehabilitation"
                    : originalUrl.includes(ACUPUNCTURE_API_URL_PATTERN)
                    ? "acupuncture"
                    : originalUrl.includes(
                        SPECIAL_CHINESE_MED_CARE_API_URL_PATTERN
                      )
                    ? "specialChineseMedCare"
                    : null;

                  if (dataType) {
                    switch (dataType) {
                      case "medication":
                        window.lastInterceptedMedicationData = normalizedData;
                        break;
                      case "labdata":
                        window.lastInterceptedLabData = normalizedData;
                        break;
                      case "chinesemed":
                        window.lastInterceptedChineseMedData = normalizedData;
                        break;
                      case "imaging":
                        window.lastInterceptedImagingData = normalizedData;
                        break;
                      case "allergy":
                        window.lastInterceptedAllergyData = normalizedData;
                        break;
                      case "surgery":
                        window.lastInterceptedSurgeryData = normalizedData;
                        break;
                      case "discharge":
                        window.lastInterceptedDischargeData = normalizedData;
                        break;
                      case "medDays":
                        window.lastInterceptedMedDaysData = normalizedData;
                        break;
                      case "patientsummary":
                        window.lastInterceptedPatientSummaryData =
                          normalizedData;
                        break;
                      case "masterMenu":
                        window.lastInterceptedMasterMenuData = normalizedData;
                        break;
                      case "rehabilitation":
                        window.lastInterceptedRehabilitationData =
                          normalizedData;
                        break;
                      case "acupuncture":
                        window.lastInterceptedAcupunctureData = normalizedData;
                        break;
                      case "specialChineseMedCare":
                        window.lastInterceptedSpecialChineseMedCareData =
                          normalizedData;
                        break;
                    }

                    console.log(
                      `Successfully intercepted ${recordsArray.length} ${dataType} records via XHR`
                    );

                    // 將數據保存到儲存空間
                    saveData(normalizedData, dataType, "XHR");

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

    if (
      originalUrl &&
      (originalUrl.includes(MEDICATION_API_URL_PATTERN) ||
        originalUrl.includes(LABDATA_API_URL_PATTERN) ||
        originalUrl.includes(CHINESE_MED_API_URL_PATTERN) ||
        originalUrl.includes(IMAGING_API_URL_PATTERN) ||
        originalUrl.includes(ALLERGY_API_URL_PATTERN) ||
        originalUrl.includes(SURGERY_API_URL_PATTERN) ||
        originalUrl.includes(DISCHARGE_API_URL_PATTERN) ||
        originalUrl.includes(MED_DAYS_API_URL_PATTERN) ||
        originalUrl.includes(PATIENT_SUMMARY_API_URL_PATTERN) ||
        originalUrl.includes(MASTER_MENU_API_URL_PATTERN) ||
        originalUrl.includes(REHABILITATION_API_URL_PATTERN) ||
        originalUrl.includes(ACUPUNCTURE_API_URL_PATTERN) ||
        originalUrl.includes(SPECIAL_CHINESE_MED_CARE_API_URL_PATTERN))
    ) {
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

    if (
      url &&
      (url.includes(MEDICATION_API_URL_PATTERN) ||
        url.includes(LABDATA_API_URL_PATTERN) ||
        url.includes(CHINESE_MED_API_URL_PATTERN) ||
        url.includes(IMAGING_API_URL_PATTERN) ||
        url.includes(ALLERGY_API_URL_PATTERN) ||
        url.includes(SURGERY_API_URL_PATTERN) ||
        url.includes(DISCHARGE_API_URL_PATTERN) ||
        url.includes(MED_DAYS_API_URL_PATTERN) ||
        url.includes(PATIENT_SUMMARY_API_URL_PATTERN) ||
        url.includes(MASTER_MENU_API_URL_PATTERN) ||
        url.includes(REHABILITATION_API_URL_PATTERN) ||
        url.includes(ACUPUNCTURE_API_URL_PATTERN) ||
        url.includes(SPECIAL_CHINESE_MED_CARE_API_URL_PATTERN))
    ) {
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

                // For master-menu, log the response data
                if (url.includes(MASTER_MENU_API_URL_PATTERN)) {
                  console.log(
                    "Master Menu API Response:",
                    JSON.stringify(data, null, 2)
                  );
                }

                // 檢查 robject（小寫）或 rObject（大寫），兩者都接受
                const recordsArray = data.rObject || data.robject;

                // 強化資料格式檢查
                if (
                  data &&
                  ((recordsArray && Array.isArray(recordsArray)) ||
                    url.includes(MASTER_MENU_API_URL_PATTERN))
                ) {
                  // 統一格式
                  const normalizedData = {
                    rObject: url.includes(MASTER_MENU_API_URL_PATTERN)
                      ? [data]
                      : recordsArray,
                    originalData: data,
                  };

                  // 判斷是藥歷還是檢驗資料
                  const dataType = url.includes(MEDICATION_API_URL_PATTERN)
                    ? "medication"
                    : url.includes(LABDATA_API_URL_PATTERN)
                    ? "labdata"
                    : url.includes(CHINESE_MED_API_URL_PATTERN)
                    ? "chinesemed"
                    : url.includes(IMAGING_API_URL_PATTERN)
                    ? "imaging"
                    : url.includes(ALLERGY_API_URL_PATTERN)
                    ? "allergy"
                    : url.includes(SURGERY_API_URL_PATTERN)
                    ? "surgery"
                    : url.includes(DISCHARGE_API_URL_PATTERN)
                    ? "discharge"
                    : url.includes(MED_DAYS_API_URL_PATTERN)
                    ? "medDays"
                    : url.includes(PATIENT_SUMMARY_API_URL_PATTERN)
                    ? "patientsummary"
                    : url.includes(MASTER_MENU_API_URL_PATTERN)
                    ? "masterMenu"
                    : url.includes(REHABILITATION_API_URL_PATTERN)
                    ? "rehabilitation"
                    : url.includes(ACUPUNCTURE_API_URL_PATTERN)
                    ? "acupuncture"
                    : url.includes(SPECIAL_CHINESE_MED_CARE_API_URL_PATTERN)
                    ? "specialChineseMedCare"
                    : null;

                  if (dataType) {
                    switch (dataType) {
                      case "medication":
                        window.lastInterceptedMedicationData = normalizedData;
                        break;
                      case "labdata":
                        window.lastInterceptedLabData = normalizedData;
                        break;
                      case "chinesemed":
                        window.lastInterceptedChineseMedData = normalizedData;
                        break;
                      case "imaging":
                        window.lastInterceptedImagingData = normalizedData;
                        break;
                      case "allergy":
                        window.lastInterceptedAllergyData = normalizedData;
                        break;
                      case "surgery":
                        window.lastInterceptedSurgeryData = normalizedData;
                        break;
                      case "discharge":
                        window.lastInterceptedDischargeData = normalizedData;
                        break;
                      case "medDays":
                        window.lastInterceptedMedDaysData = normalizedData;
                        break;
                      case "patientsummary":
                        window.lastInterceptedPatientSummaryData =
                          normalizedData;
                        break;
                      case "masterMenu":
                        window.lastInterceptedMasterMenuData = normalizedData;
                        break;
                      case "rehabilitation":
                        window.lastInterceptedRehabilitationData =
                          normalizedData;
                        break;
                      case "acupuncture":
                        window.lastInterceptedAcupunctureData = normalizedData;
                        break;
                      case "specialChineseMedCare":
                        window.lastInterceptedSpecialChineseMedCareData =
                          normalizedData;
                        break;
                    }

                    console.log(
                      `Successfully intercepted ${recordsArray.length} ${dataType} records via fetch`
                    );

                    // 將數據保存到儲存空間
                    saveData(normalizedData, dataType, "fetch");

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

function saveData(data, dataType, source = "unknown") {
  // 先直接更新全局變數
  switch (dataType) {
    case "medication":
      window.lastInterceptedMedicationData = data;
      break;
    case "labdata":
      window.lastInterceptedLabData = data;
      break;
    case "chinesemed":
      window.lastInterceptedChineseMedData = data;
      break;
    case "imaging":
      window.lastInterceptedImagingData = data;
      break;
    case "allergy":
      window.lastInterceptedAllergyData = data;
      break;
    case "surgery":
      window.lastInterceptedSurgeryData = data;
      break;
    case "discharge":
      window.lastInterceptedDischargeData = data;
      break;
    case "medDays":
      window.lastInterceptedMedDaysData = data;
      break;
    case "patientsummary":
      window.lastInterceptedPatientSummaryData = data;
      break;
    case "masterMenu":
      window.lastInterceptedMasterMenuData = data;
      break;
    case "rehabilitation":
      window.lastInterceptedRehabilitationData = data;
      break;
    case "acupuncture":
      window.lastInterceptedAcupunctureData = data;
      break;
    case "specialChineseMedCare":
      window.lastInterceptedSpecialChineseMedCareData = data;
      break;
  }

  // 確保 data 有效 (對 masterMenu 類型特殊處理)
  if (!data || (!data.rObject && dataType !== "masterMenu")) {
    console.error(`Invalid data for type ${dataType}`);
    return;
  }

  const actionMap = {
    medication: "saveMedicationData",
    labdata: "saveLabData",
    chinesemed: "saveChineseMedData",
    imaging: "saveImagingData",
    allergy: "saveAllergyData",
    surgery: "saveSurgeryData",
    discharge: "saveDischargeData",
    medDays: "saveMedDaysData",
    patientsummary: "savePatientSummaryData",
    masterMenu: "saveMasterMenuData",
    rehabilitation: "saveRehabilitationData",
    acupuncture: "saveAcupunctureData",
    specialChineseMedCare: "saveSpecialChineseMedCareData",
  };

  const typeTextMap = {
    medication: "藥歷",
    labdata: "檢驗資料",
    chinesemed: "中醫用藥",
    imaging: "醫療影像",
    allergy: "過敏資料",
    surgery: "手術記錄",
    discharge: "出院病摘",
    medDays: "藥品餘藥",
    patientsummary: "病患摘要",
    masterMenu: "主選單",
    rehabilitation: "復健治療",
    acupuncture: "針灸治療",
    specialChineseMedCare: "特殊中醫處置",
  };

  const action = actionMap[dataType];
  const typeText = typeTextMap[dataType];

  if (!action) {
    console.error(`不支援的資料類型: ${dataType}`);
    return;
  }

  chrome.runtime.sendMessage(
    {
      action: action,
      data: data,
      userSession: currentUserSession,
    },
    (response) => {
      // console.log(`${dataType} data saved to storage via ${source}:`, response);

      if (response && response.status === "saved") {
        const recordCount = data.rObject.length;
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

    // 如果是目標API請求，添加事件監聽器來捕獲完整的請求頭
    if (
      url &&
      (url.includes(MEDICATION_API_URL_PATTERN) ||
        url.includes(LABDATA_API_URL_PATTERN) ||
        url.includes(CHINESE_MED_API_URL_PATTERN) ||
        url.includes(IMAGING_API_URL_PATTERN) ||
        url.includes(ALLERGY_API_URL_PATTERN) ||
        url.includes(SURGERY_API_URL_PATTERN) ||
        url.includes(DISCHARGE_API_URL_PATTERN) ||
        url.includes(MED_DAYS_API_URL_PATTERN) ||
        url.includes(PATIENT_SUMMARY_API_URL_PATTERN) ||
        url.includes(MASTER_MENU_API_URL_PATTERN) ||
        url.includes(REHABILITATION_API_URL_PATTERN) ||
        url.includes(ACUPUNCTURE_API_URL_PATTERN) ||
        url.includes(SPECIAL_CHINESE_MED_CARE_API_URL_PATTERN))
    ) {
      const xhr = this;
      this.addEventListener("loadend", function () {
        if (xhr.status === 200 && xhr._requestHeaders) {
          console.log("Captured successful request headers for API:", xhr._url);
          // 儲存成功請求的headers
          lastSuccessfulRequestHeaders = Object.assign({}, xhr._requestHeaders);
          console.log(
            "Headers captured:",
            Object.keys(lastSuccessfulRequestHeaders).join(", ")
          );

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

  console.log("XHR request header capturing set up");
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

// 在 content.js 中添加一個新函數，用於獲取所有類型的資料
function fetchAllDataTypes() {
  console.log("開始獲取所有資料類型");

  if (isBatchFetchInProgress) {
    console.log("已有批次抓取進行中，跳過本次請求");
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
    console.log("已有獨立請求進行中，跳過本次批次抓取");
    return;
  }

  isBatchFetchInProgress = true;
  isDataFetchingStarted = true;
  window.nhiDataBeingFetched = true;

  // 先獲取主選單資料(masterMenu)，以判斷有哪些資料可獲取
  enhancedFetchData("masterMenu")
    .then((menuResult) => {
      console.log("獲取主選單資料成功，開始處理其他資料");

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
        "rehabilitation",
        "acupuncture",
        "specialChineseMedCare",
      ];

      // 根據授權過濾並獲取資料類型
      const fetchPromises = dataTypes.map((dataType) => {
        if (isDataTypeAuthorized(dataType)) {
          // console.log(`${dataType} 已授權，開始獲取資料`);
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

      // 執行所有請求
      return Promise.all(fetchPromises);
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
      console.log("所有資料獲取完成，結果:", results);

      // Create counts object for all data types
      const counts = {
        medication:
          results.find((r) => r.dataType === "medication")?.recordCount || 0,
        labData:
          results.find((r) => r.dataType === "labdata")?.recordCount || 0,
        chineseMed:
          results.find((r) => r.dataType === "chinesemed")?.recordCount || 0,
        imaging:
          results.find((r) => r.dataType === "imaging")?.recordCount || 0,
        allergy:
          results.find((r) => r.dataType === "allergy")?.recordCount || 0,
        surgery:
          results.find((r) => r.dataType === "surgery")?.recordCount || 0,
        discharge:
          results.find((r) => r.dataType === "discharge")?.recordCount || 0,
        medDays:
          results.find((r) => r.dataType === "medDays")?.recordCount || 0,
        patientSummary:
          results.find((r) => r.dataType === "patientsummary")?.recordCount ||
          0,
        masterMenu: 1, // 主選單資料已獲取
      };

      // Build notification text
      const dataCounts = [];
      if (counts.medication > 0) dataCounts.push(`${counts.medication} 筆藥歷`);
      if (counts.labData > 0) dataCounts.push(`${counts.labData} 筆檢驗`);
      if (counts.chineseMed > 0) dataCounts.push(`${counts.chineseMed} 筆中醫`);
      if (counts.imaging > 0) dataCounts.push(`${counts.imaging} 筆影像`);
      if (counts.allergy > 0) dataCounts.push(`${counts.allergy} 筆過敏`);
      if (counts.surgery > 0) dataCounts.push(`${counts.surgery} 筆手術`);
      if (counts.discharge > 0) dataCounts.push(`${counts.discharge} 筆病摘`);
      if (counts.medDays > 0) dataCounts.push(`${counts.medDays} 筆餘藥`);
      if (counts.patientSummary > 0)
        dataCounts.push(`${counts.patientSummary} 筆摘要`);

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
            console.log("Auto opening floating icon dialog");
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
    "chinesemed",
    "imaging",
    "allergy",
    "surgery",
    "discharge",
    "medDays",
    "patientsummary",
    "masterMenu",
    "rehabilitation",
    "acupuncture",
    "specialChineseMedCare",
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

  // 資料類型的顯示文字對照表
  const typeTextMap = {
    medication: "藥歷",
    labdata: "檢驗資料",
    chinesemed: "中醫用藥",
    imaging: "醫療影像",
    allergy: "過敏資料",
    surgery: "手術記錄",
    discharge: "出院病摘",
    medDays: "藥品餘藥",
    patientsummary: "病患摘要",
    masterMenu: "主選單",
    rehabilitation: "復健治療",
    acupuncture: "針灸治療",
    specialChineseMedCare: "特殊中醫處置",
  };

  // API 路徑對照表
  const apiPath = {
    medication: "imue0008/imue0008s02/get-data",
    labdata: "imue0060/imue0060s02/get-data",
    chinesemed: "imue0090/imue0090s02/get-data",
    imaging: "imue0130/imue0130s02/get-data",
    allergy: "imue0040/imue0040s02/get-data",
    surgery: "imue0020/imue0020s02/get-data",
    discharge: "imue0070/imue0070s02/get-data",
    medDays: "imue0120/imue0120s01/pres-med-day",
    patientsummary: "imue2000/imue2000s01/get-summary",
    masterMenu: "imue1000/imue1000s02/master-menu",
    rehabilitation: "imue0080/imue0080s02/get-data",
    acupuncture: "imue0160/imue0160s02/get-data",
    specialChineseMedCare: "imue0170/imue0170s02/get-data",
  }[dataType];

  // 主要的獲取邏輯
  const attemptFetch = () => {
    return new Promise((resolve, reject) => {
      // 構建 API URL
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
          const recordsArray = data.rObject || data.robject;
          if (
            data &&
            (recordsArray !== undefined ||
              dataType === "medDays" ||
              dataType === "patientsummary" ||
              dataType === "masterMenu")
          ) {
            const normalizedData = {
              rObject:
                dataType === "medDays"
                  ? Array.isArray(data)
                    ? data
                    : [data]
                  : dataType === "patientsummary"
                  ? Array.isArray(recordsArray)
                    ? recordsArray
                    : recordsArray
                    ? [recordsArray]
                    : []
                  : dataType === "masterMenu"
                  ? [data] // For masterMenu, wrap the entire response in an array
                  : Array.isArray(recordsArray)
                  ? recordsArray
                  : [],
              originalData: data,
            };
            switch (dataType) {
              case "medication":
                window.lastInterceptedMedicationData = normalizedData;
                break;
              case "labdata":
                window.lastInterceptedLabData = normalizedData;
                break;
              case "chinesemed":
                window.lastInterceptedChineseMedData = normalizedData;
                break;
              case "imaging":
                window.lastInterceptedImagingData = normalizedData;
                break;
              case "allergy":
                window.lastInterceptedAllergyData = normalizedData;
                break;
              case "surgery":
                window.lastInterceptedSurgeryData = normalizedData;
                break;
              case "discharge":
                window.lastInterceptedDischargeData = normalizedData;
                break;
              case "medDays":
                window.lastInterceptedMedDaysData = normalizedData;
                break;
              case "patientsummary":
                window.lastInterceptedPatientSummaryData = normalizedData;
                break;
              case "masterMenu":
                window.lastInterceptedMasterMenuData = normalizedData;
                // Log the master menu data for debugging
                // console.log('Master Menu data captured:', JSON.stringify(data, null, 2));
                break;
            }
            saveData(normalizedData, dataType, "direct");
            const recordCount = normalizedData.rObject.length;
            // console.log(`${dataType} 請求完成 - ${new Date().toISOString()}`);
            resolve({
              status: "success",
              recordCount: recordCount,
              dataType: dataType,
              data: normalizedData,
            });
          } else {
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
  const typeTextMap = {
    medication: "西醫藥歷",
    lab: "檢驗",
    chinesemed: "中醫用藥",
    imaging: "醫療影像",
    allergy: "過敏",
    surgery: "手術記錄",
    discharge: "出院病摘",
    medDays: "藥品餘藥",
    patientsummary: "病患摘要",
    masterMenu: "主選單",
    rehabilitation: "復健治療",
    acupuncture: "針灸治療",
    specialChineseMedCare: "特殊中醫處置",
  };
  return typeTextMap[type] || type;
}

// 新增: 節點ID與資料類型對應表
const nodeToDataTypeMap = {
  1.1: "patientsummary",
  2.1: "medication",
  2.4: "medDays",
  3.1: "chinesemed",
  3.2: "acupuncture",
  3.3: "specialChineseMedCare",
  5.1: "allergy",
  6.1: "labdata",
  6.2: "imaging",
  7.1: "surgery",
  8.1: "discharge",
  9.1: "rehabilitation",
};

// 新增: 檢查資料類型是否有授權
function isDataTypeAuthorized(dataType) {
  // 如果尚未獲取主選單資料，預設所有資料類型都有授權
  if (!window.lastInterceptedMasterMenuData) {
    return true;
  }

  try {
    const masterMenuData = window.lastInterceptedMasterMenuData.originalData;
    const prsnAuth = masterMenuData.prsnAuth || [];

    // 反向查找: 從資料類型找到對應的節點ID
    const nodeIds = Object.entries(nodeToDataTypeMap)
      .filter(([node, type]) => type === dataType)
      .map(([node, type]) => node);

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
    rObject: [],
    originalData: { rObject: [] },
  };

  // Update corresponding window variable to ensure previous data doesn't persist
  switch (dataType) {
    case "medication":
      window.lastInterceptedMedicationData = emptyData;
      break;
    case "labdata":
      window.lastInterceptedLabData = emptyData;
      break;
    case "chinesemed":
      window.lastInterceptedChineseMedData = emptyData;
      break;
    case "imaging":
      window.lastInterceptedImagingData = emptyData;
      break;
    case "allergy":
      window.lastInterceptedAllergyData = emptyData;
      break;
    case "surgery":
      window.lastInterceptedSurgeryData = emptyData;
      break;
    case "discharge":
      window.lastInterceptedDischargeData = emptyData;
      break;
    case "medDays":
      window.lastInterceptedMedDaysData = emptyData;
      break;
    case "patientsummary":
      window.lastInterceptedPatientSummaryData = emptyData;
      break;
    case "masterMenu":
      window.lastInterceptedMasterMenuData = emptyData;
      break;
    case "rehabilitation":
      window.lastInterceptedRehabilitationData = emptyData;
      break;
    case "acupuncture":
      window.lastInterceptedAcupunctureData = emptyData;
      break;
    case "specialChineseMedCare":
      window.lastInterceptedSpecialChineseMedCareData = emptyData;
      break;
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
        if (!isBatchFetchInProgress) {
          console.log(
            "New patient or no data, fetching new data:",
            currentPatientId
          );
        }

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
    window.lastInterceptedMedicationData = null;
    window.lastInterceptedLabData = null;
    window.lastInterceptedChineseMedData = null;
    window.lastInterceptedImagingData = null;
    window.lastInterceptedAllergyData = null;
    window.lastInterceptedSurgeryData = null;
    window.lastInterceptedDischargeData = null;
    window.lastInterceptedMedDaysData = null;
    window.lastInterceptedPatientSummaryData = null;
    window.lastInterceptedMasterMenuData = null;
    window.lastInterceptedRehabilitationData = null;
    window.lastInterceptedAcupunctureData = null;
    window.lastInterceptedSpecialChineseMedCareData = null;

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
      // 收集所有病人資料
      const patientData = {
        medication: window.lastInterceptedMedicationData,
        lab: window.lastInterceptedLabData,
        chinesemed: window.lastInterceptedChineseMedData,
        imaging: window.lastInterceptedImagingData,
        allergy: window.lastInterceptedAllergyData,
        surgery: window.lastInterceptedSurgeryData,
        discharge: window.lastInterceptedDischargeData,
        medDays: window.lastInterceptedMedDaysData,
        patientSummary: window.lastInterceptedPatientSummaryData,
        masterMenu: window.lastInterceptedMasterMenuData,
        rehabilitation: window.lastInterceptedRehabilitationData,
        acupuncture: window.lastInterceptedAcupunctureData,
        specialChineseMedCare: window.lastInterceptedSpecialChineseMedCareData,
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
        const fileName = `patient_data_${date.getFullYear()}${(
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
