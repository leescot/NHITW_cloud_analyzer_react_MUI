// legacyContent.js — 重構版
// 純主動抓取架構，移除被動攔截（XHR/fetch monkey-patch）

import {
  getAuthToken,
  getPatientId,
  getPermissions,
  getApiHeaders,
  getTokenPayload,
  isTokenExpired,
} from './utils/tokenUtils';
import { DEFAULT_SETTINGS } from './config/defaultSettings';

console.log("Content script loaded for NHI data extractor (Refactored Version)");

// ===== 全域變數（供 React UI 透過 window.* 讀取） =====

window.lastInterceptedMedicationData = null;
window.lastInterceptedLabData = null;
window.lastInterceptedLabDrawData = null;
window.lastInterceptedChineseMedData = null;
window.lastInterceptedImagingData = null;
window.lastInterceptedAllergyData = null;
window.lastInterceptedSurgeryData = null;
window.lastInterceptedDischargeData = null;
window.lastInterceptedMedDaysData = null;
window.lastInterceptedPatientSummaryData = null;
window.lastInterceptedMasterMenuData = null;
window.lastInterceptedAdultHealthCheckData = null;
window.lastInterceptedCancerScreeningData = null;
window.lastInterceptedHbcvdata = null;
window.lastInterceptedChronicMedData = null;

// ===== 常數定義 =====

const API_PATH_MAP = new Map([
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
  ["adultHealthCheck", "imue0140/imue0140s01/hpa-data"],
  ["cancerScreening", "imue0150/imue0150s01/hpa-data"],
  ["hbcvdata", "imue0180/imue0180s01/hbcv-data"],
  ["chronicMed", "imue0008/imue0008s05/get-data"],
]);

const DATA_VAR_MAP = new Map([
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
  ["adultHealthCheck", "lastInterceptedAdultHealthCheckData"],
  ["cancerScreening", "lastInterceptedCancerScreeningData"],
  ["hbcvdata", "lastInterceptedHbcvdata"],
  ["chronicMed", "lastInterceptedChronicMedData"],
]);

const NODE_TO_DATA_TYPE = {
  '1.1': ['patientsummary'],
  '1.2': ['hbcvdata'],
  '2.1': ['medication'],
  '2.3': ['chronicMed'],
  '2.4': ['medDays'],
  '3.1': ['chinesemed'],
  '5.1': ['allergy'],
  '6.1': ['labdata', 'labdraw'],
  '6.2': ['imaging'],
  '6.3': ['adultHealthCheck'],
  '6.4': ['cancerScreening'],
  '7.1': ['surgery'],
  '8.1': ['discharge'],
};

// ===== 狀態管理 =====

let lastPatientId = null;
let isBatchFetchInProgress = false;
let switchPollTimer = null;
let tokenPollingStarted = false;

// ===== 初始化 =====

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

function initialize() {
  // 不論在哪個頁面都啟動 URL 輪詢和訊息監聽，
  // 因為 content script 可能在登入頁載入，之後頁面導航到目標頁時需要偵測到。
  observeUrlChanges();
  setupMessageListeners();

  if (isOnLoginPage()) {
    return;
  }
  if (isOnTargetPage()) {
    const patientId = getPatientId();
    if (patientId) {
      lastPatientId = patientId;
      fetchAllDataTypes();
    }
    startTokenPolling();
    watchPatientSwitchButtons();
  }
}

// ===== 頁面判斷 =====

function isOnLoginPage() {
  const url = window.location.href;
  return (
    url.includes("medcloud2.nhi.gov.tw/imu/login") ||
    url.includes("medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0001")
  );
}

function isOnTargetPage() {
  const url = window.location.href;
  const targetPaths = [
    "medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0008",
    "medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0060",
    "medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0090",
    "medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0130",
    "medcloud2.nhi.gov.tw/imu/IMUE2000/IMUE2000",
  ];
  return targetPaths.some(path => url.includes(path));
}

// ===== 病患切換偵測 =====

function startTokenPolling() {
  if (tokenPollingStarted) return;
  tokenPollingStarted = true;
  setInterval(() => {
    const currentId = getPatientId();
    if (!currentId) return;

    if (lastPatientId === null) {
      lastPatientId = currentId;
      return;
    }

    if (currentId !== lastPatientId) {
      console.log("Token polling: 偵測到病患切換", lastPatientId, "→", currentId);
      lastPatientId = currentId;
      clearAllData();
      fetchAllDataTypes();
    }
  }, 1500);
}

function watchPatientSwitchButtons() {
  const links = document.querySelectorAll('a');
  for (const link of links) {
    const text = link.textContent.trim();
    if (text.includes('請換卡再按我') || text.includes('請掃描再按我')) {
      link.addEventListener('click', onPatientSwitchRequested);
    }
  }
}

function onPatientSwitchRequested() {
  console.log("病患切換按鈕被點擊，開始等待新 token");
  clearAllData();
  window.dispatchEvent(new CustomEvent("dataFetchCompleted", { detail: { switching: true } }));

  if (switchPollTimer) clearInterval(switchPollTimer);

  const oldPatientId = lastPatientId;
  switchPollTimer = setInterval(() => {
    const newId = getPatientId();
    if (newId && newId !== oldPatientId) {
      clearInterval(switchPollTimer);
      switchPollTimer = null;
      console.log("偵測到新病患:", newId);
      lastPatientId = newId;
      fetchAllDataTypes();
    }
  }, 500);
}

// ===== URL 變化偵測 =====

function observeUrlChanges() {
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;

      if (isOnLoginPage()) {
        clearAllData();
        lastPatientId = null;
        return;
      }

      if (isOnTargetPage()) {
        startTokenPolling();
        watchPatientSwitchButtons();
        const patientId = getPatientId();
        if (patientId && patientId !== lastPatientId) {
          lastPatientId = patientId;
          clearAllData();
          fetchAllDataTypes();
        } else if (!window.lastInterceptedMedicationData?.rObject) {
          fetchAllDataTypes();
        }
      }
    }
  }, 1000);
}

// ===== 授權檢查 =====

function getAuthorizedDataTypes() {
  const permissions = getPermissions();
  const authorized = new Set();
  for (const node of permissions) {
    const types = NODE_TO_DATA_TYPE[node];
    if (types) {
      types.forEach(t => authorized.add(t));
    }
  }
  authorized.add('chronicMed');
  return authorized;
}

function shouldFetchSpecialData(dataType) {
  const settingKeyMap = {
    adultHealthCheck: 'fetchAdultHealthCheck',
    cancerScreening: 'fetchCancerScreening',
    hbcvdata: 'fetchHbcvdata',
  };
  const key = settingKeyMap[dataType];
  if (!key) return Promise.resolve(true);

  // fallback 對齊 defaultSettings.cloud（健檢/癌篩預設 false，hbcv 預設 true），
  // 避免使用者從未進入設定頁時「抓了但不顯示」的不一致行為
  const defaultVal = DEFAULT_SETTINGS.cloud[key];
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [key]: defaultVal }, (items) => {
      resolve(items[key]);
    });
  });
}

// ===== 資料抓取 =====

function fetchAllDataTypes() {
  if (isBatchFetchInProgress) return;

  const token = getAuthToken();
  if (!token) {
    console.warn("無法取得 token，跳過資料抓取");
    return;
  }

  if (isTokenExpired()) {
    console.warn("Token 已過期");
    return;
  }

  isBatchFetchInProgress = true;
  window.nhiDataBeingFetched = true;

  const authorized = getAuthorizedDataTypes();

  const regularTypes = [
    "medication", "labdata", "chinesemed", "imaging",
    "allergy", "surgery", "discharge", "medDays",
    "patientsummary", "chronicMed",
  ];

  const regularPromises = regularTypes.map(type => {
    if (authorized.has(type)) {
      return fetchSingleDataType(type).catch(err => {
        console.error(`獲取 ${type} 資料時發生錯誤:`, err);
        return createEmptyDataResult(type);
      });
    }
    return Promise.resolve(createEmptyDataResult(type));
  });

  const specialTypes = ["adultHealthCheck", "cancerScreening", "hbcvdata", "labdraw"];
  const specialPromises = specialTypes.map(type => {
    return shouldFetchSpecialData(type).then(shouldFetch => {
      if (shouldFetch && authorized.has(type)) {
        return fetchSingleDataType(type).catch(err => {
          console.error(`獲取 ${type} 資料時發生錯誤:`, err);
          return createEmptyDataResult(type);
        });
      }
      return createEmptyDataResult(type);
    });
  });

  Promise.all([...regularPromises, ...specialPromises])
    .then(results => {
      saveToLocalStorage();

      const event = new CustomEvent("dataFetchCompleted", { detail: results });
      window.dispatchEvent(event);

      chrome.runtime.sendMessage({ action: 'setBadge', text: '✓', color: '#4CAF50' });

      chrome.storage.sync.get({ autoOpenPage: false }, function (items) {
        if (items.autoOpenPage && window.openFloatingIconDialog) {
          setTimeout(() => window.openFloatingIconDialog(), 500);
        }
      });
    })
    .catch(error => {
      console.error("獲取資料時發生錯誤:", error);
    })
    .finally(() => {
      isBatchFetchInProgress = false;
      window.nhiDataBeingFetched = false;
    });
}

function fetchSingleDataType(dataType) {
  const apiPath = API_PATH_MAP.get(dataType);
  if (!apiPath) return Promise.reject(new Error(`不支援的資料類型: ${dataType}`));

  const requestPatientId = lastPatientId;

  let apiUrl;
  if (dataType === "patientsummary") {
    apiUrl = `https://medcloud2.nhi.gov.tw/imu/api/${apiPath}?drug_phet=false&drug_hemo=false&ctmri_assay=false&ctmri_dent=true&cli_datetime=${encodeURIComponent(new Date().toISOString().substring(0, 19))}`;
  } else {
    apiUrl = `https://medcloud2.nhi.gov.tw/imu/api/${apiPath}?cli_datetime=${encodeURIComponent(new Date().toISOString().substring(0, 19))}&insert_log=true`;
  }

  return fetch(apiUrl, {
    method: "GET",
    credentials: "include",
    headers: getApiHeaders(),
    cache: "no-store",
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (lastPatientId !== requestPatientId) {
        return { status: "stale", recordCount: 0, dataType };
      }

      const normalizedData = normalizeResponseData(data, dataType);

      const varName = DATA_VAR_MAP.get(dataType);
      if (varName) {
        window[varName] = normalizedData;
      }

      return {
        status: "success",
        recordCount: normalizedData.rObject.length,
        dataType,
        data: normalizedData,
      };
    });
}

function normalizeResponseData(data, dataType) {
  const recordsArray = data.rObject || data.robject;

  if (dataType === "medDays" || dataType === "labdraw") {
    return { rObject: Array.isArray(data) ? data : [data] };
  }

  if (dataType === "patientsummary") {
    return { rObject: Array.isArray(recordsArray) ? recordsArray : (recordsArray ? [recordsArray] : []) };
  }

  if (dataType === "chronicMed") {
    return { rObject: [data] };
  }

  if (dataType === "adultHealthCheck" || dataType === "cancerScreening" || dataType === "hbcvdata") {
    return { rObject: recordsArray ? [recordsArray] : [] };
  }

  return { rObject: Array.isArray(recordsArray) ? recordsArray : [] };
}

// ===== 資料管理 =====

function clearAllData() {
  for (const varName of DATA_VAR_MAP.values()) {
    window[varName] = null;
  }
  window.lastInterceptedMasterMenuData = null;

  chrome.runtime.sendMessage({ action: 'setBadge', text: '' });
}

function createEmptyDataResult(dataType) {
  const emptyData = { rObject: [] };
  const varName = DATA_VAR_MAP.get(dataType);
  if (varName) {
    window[varName] = emptyData;
  }
  return { status: "nodata", recordCount: 0, dataType, data: emptyData };
}

function saveToLocalStorage() {
  try {
    const dataToShare = { timestamp: Date.now() };
    for (const [dataType, varName] of DATA_VAR_MAP.entries()) {
      const storageKey = dataType === 'labdata' ? 'lab' : dataType;
      dataToShare[storageKey] = window[varName];
    }
    localStorage.setItem('NHITW_DATA', JSON.stringify(dataToShare));
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('保存資料到 localStorage 時出錯:', error);
  }
}

// ===== 訊息監聽（popup 互動） =====

function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "manualFetchData") {
      fetchAllDataTypes();
      sendResponse({ status: "fetching" });
      return true;
    }

    if (message.action === "dataCleared") {
      clearAllData();
      sendResponse({ status: "cleared" });
      return true;
    }

    if (message.action === "openDashboard") {
      const floatingIcon = document.querySelector("#nhi-floating-root button");
      if (floatingIcon) {
        floatingIcon.click();
        sendResponse({ status: "opened" });
      } else {
        sendResponse({ status: "error", message: "Dashboard component not found" });
      }
      return true;
    }

    if (message.action === "settingChanged") {
      const isMedicationSetting = [
        "simplifyMedicineName", "showDiagnosis", "showGenericName",
        "enableATC5Coloring", "copyFormat",
      ].includes(message.setting);

      const isChineseMedSetting = [
        "chineseMedShowDiagnosis", "chineseMedShowEffectName",
        "chineseMedDoseFormat", "chineseMedCopyFormat",
      ].includes(message.setting);

      if (isMedicationSetting || isChineseMedSetting) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("dataFetchCompleted", {
            detail: {
              settingsChanged: true,
              settingType: isMedicationSetting ? "medication" : "chinesemed",
              setting: message.setting,
              value: message.value,
              allSettings: message.allSettings,
            },
          }));
        }, 100);
      }
      sendResponse({ status: "setting_updated" });
      return true;
    }

    if (message.action === "getPatientData") {
      try {
        const payload = getTokenPayload();
        const patientData = {
          UserName: payload?.UserName || '',
          UserID: payload?.UserID || '',
          UserSex: payload?.UserSex || '',
          UserBirthday: payload?.UserBirthday || '',
          ClientTime: new Date().toISOString(),
        };
        for (const [dataType, varName] of DATA_VAR_MAP.entries()) {
          const key = dataType === 'labdata' ? 'lab' : dataType;
          patientData[key] = window[varName];
        }
        patientData.masterMenu = window.lastInterceptedMasterMenuData;

        const hasAnyData = Object.values(patientData).some(value => {
          return value?.rObject && Array.isArray(value.rObject) && value.rObject.length > 0;
        });

        if (hasAnyData) {
          const date = new Date();
          const ts = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}_${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
          const uid = patientData.UserID || 'unknown';
          const fileName = `${ts}_${uid}.json`;
          const jsonString = JSON.stringify(patientData, null, 2);
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const downloadLink = document.createElement("a");
          downloadLink.href = url;
          downloadLink.download = fileName;
          downloadLink.style.display = "none";
          document.body.appendChild(downloadLink);
          downloadLink.click();
          setTimeout(() => {
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
          }, 100);
          sendResponse({ status: "success", message: "已直接處理下載", directDownload: true });
        } else {
          sendResponse({ error: "無法獲取病人資料", status: "error" });
        }
      } catch (err) {
        sendResponse({ error: "處理下載時發生錯誤: " + err.message, status: "error" });
      }
      return true;
    }

    sendResponse({ status: "received" });
    return true;
  });
}

// ===== 匯出 =====

window.fetchNHI_Data = fetchAllDataTypes;
window.getSessionData = () => {
  const payload = getTokenPayload();
  return payload ? `patient_${payload.UserID}` : null;
};
