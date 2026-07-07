// apiInterceptor/index.js — 健保 API 攔截與資料抓取層（前身 legacyContent.js）
// 純主動抓取架構，移除被動攔截（XHR/fetch monkey-patch）

import { API_PATH_MAP } from './apiPathMap.js';
import { CORE_REGULAR_KEYS, CORE_SPECIAL_KEYS, DEV_KEYS } from '../dataTypes/registry.js';
import { normalizeResponseData } from './responseNormalizer.js';
import {
  getAuthorizedDataTypes,
  shouldFetchSpecialData,
  SPECIAL_DATA_TYPE_SETTING_KEYS,
} from './authorization.js';
import { setupMessageListeners } from './messageHandlers.js';
import {
  getAuthToken,
  getPatientId,
  getPermissions,
  getApiHeaders,
  getTokenPayload,
  isTokenExpired,
} from '../utils/tokenUtils';
import { DEFAULT_SETTINGS } from '../config/defaultSettings';
import { debugLog } from '../utils/logger';
import { dataStore } from '../store/dataStore';
import { buildShareData, writeShareDataToLocalStorage } from '../store/nhitwExport';

debugLog("Content script loaded for NHI data extractor (Refactored Version)");

// ===== 常數定義 =====

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
  setupMessageListeners({
    fetchAllDataTypes,
    clearAllData,
    getTokenPayload,
    dataStore,
    API_PATH_MAP,
    getAuthorizedDataTypes,
  });

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

// debug log 用途：遮罩病患 ID（身分證號），僅保留頭尾避免完整 PII 落入 console。
function maskPatientId(id) {
  if (!id || typeof id !== 'string') return id;
  if (id.length <= 4) return '****';
  return id.slice(0, 3) + '****' + id.slice(-1);
}

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
      debugLog(
        "Token polling: 偵測到病患切換",
        maskPatientId(lastPatientId),
        "→",
        maskPatientId(currentId)
      );
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
  debugLog("病患切換按鈕被點擊，開始等待新 token");
  clearAllData();
  window.dispatchEvent(new CustomEvent("dataFetchCompleted", { detail: { switching: true } }));

  if (switchPollTimer) clearInterval(switchPollTimer);

  const oldPatientId = lastPatientId;
  switchPollTimer = setInterval(() => {
    const newId = getPatientId();
    if (newId && newId !== oldPatientId) {
      clearInterval(switchPollTimer);
      switchPollTimer = null;
      debugLog("偵測到新病患:", maskPatientId(newId));
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
        } else if (!dataStore.getData('medication')?.rObject) {
          fetchAllDataTypes();
        }
      }
    }
  }, 1000);
}

// ===== 授權檢查（純計算已抽至 apiInterceptor/authorization.js，這裡只負責取得輸入） =====

// 取得指定特殊資料型別對應的 cloud 設定值（chrome.storage.sync 讀取，含 fallback 預設值）。
// fallback 對齊 defaultSettings.cloud（健檢/癌篩預設 false，hbcv 預設 true），
// 避免使用者從未進入設定頁時「抓了但不顯示」的不一致行為。
function getCloudSettingsForType(dataType) {
  const key = SPECIAL_DATA_TYPE_SETTING_KEYS[dataType];
  if (!key) return Promise.resolve({});

  const defaultVal = DEFAULT_SETTINGS.cloud[key];
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [key]: defaultVal }, (items) => {
      resolve(items);
    });
  });
}

// 讀取開發者「完整抓取模式」旗標(chrome.storage.local.devFetchAll,預設 false)。
// 開發工具旗標,刻意不進 settingsSchema/storage.sync(不跨機同步、不污染設定契約)。
function getDevFetchAll() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ devFetchAll: false }, (items) => {
      resolve(Boolean(items.devFetchAll));
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

  const permissions = getPermissions();
  const authorized = getAuthorizedDataTypes(permissions);

  // 授權清單寫入 dataStore（permission 型別;一般模式也寫,成本為零,資料本來就在 JWT 內）。
  // 供下載 JSON 輸出參考;不進 NHITW_DATA 對外契約(buildShareData)。
  dataStore.setData('permission', {
    nodes: permissions,
    dataTypes: [...authorized],
  });

  // 由 coreTypes 描述檔衍生:regular = 一般批次;special = 經 shouldFetchSpecialData 閘門
  const regularTypes = CORE_REGULAR_KEYS;

  const regularPromises = regularTypes.map(type => {
    if (authorized.has(type)) {
      return fetchSingleDataType(type).catch(err => {
        console.error(`獲取 ${type} 資料時發生錯誤:`, err);
        return createEmptyDataResult(type);
      });
    }
    return Promise.resolve(createEmptyDataResult(type));
  });

  const specialTypes = CORE_SPECIAL_KEYS;

  // devFetchAll 為單一閘門:同時控制「特殊型別無視雲端開關」與「開發者補抓型別是否抓取」。
  getDevFetchAll().then(devFetchAll => {
    const specialPromises = specialTypes.map(type => {
      return getCloudSettingsForType(type).then(cloudSettings => {
        const shouldFetch = shouldFetchSpecialData(type, cloudSettings, devFetchAll);
        if (shouldFetch && authorized.has(type)) {
          return fetchSingleDataType(type).catch(err => {
            console.error(`獲取 ${type} 資料時發生錯誤:`, err);
            return createEmptyDataResult(type);
          });
        }
        return createEmptyDataResult(type);
      });
    });

    // 開發者補抓型別:僅 devFetchAll 開啟且該節點有授權時才抓,否則以空結果佔位(不增加 API 呼叫)。
    const devPromises = DEV_KEYS.map(type => {
      if (devFetchAll && authorized.has(type)) {
        return fetchSingleDataType(type).catch(err => {
          console.error(`獲取 ${type} 資料時發生錯誤:`, err);
          return createEmptyDataResult(type);
        });
      }
      return Promise.resolve(createEmptyDataResult(type));
    });

    return Promise.all([...regularPromises, ...specialPromises, ...devPromises]);
  })
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

      dataStore.setData(dataType, normalizedData);

      return {
        status: "success",
        recordCount: normalizedData.rObject.length,
        dataType,
        data: normalizedData,
      };
    });
}

// ===== 資料管理 =====

function clearAllData() {
  dataStore.clearAll();

  chrome.runtime.sendMessage({ action: 'setBadge', text: '' });
}

function createEmptyDataResult(dataType) {
  const emptyData = { rObject: [] };
  dataStore.setData(dataType, emptyData);
  return { status: "nodata", recordCount: 0, dataType, data: emptyData };
}

function saveToLocalStorage() {
  writeShareDataToLocalStorage(buildShareData());
}

// ===== 匯出 =====

// 開發者 console 手動除錯用 hook(isolated world 內,頁面與其他 extension 不可見);
// 無程式碼讀取,勿依賴。
window.fetchNHI_Data = fetchAllDataTypes;
window.getSessionData = () => {
  const payload = getTokenPayload();
  return payload ? `patient_${payload.UserID}` : null;
};
