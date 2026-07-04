// settingsManager.js
// 統一管理所有設置相關的函數

import { buildStorageDefaults, structureFromFlat, sectionFromFlat } from "../config/settingsSchema";
import { debugLog } from "./logger";
import { dataStore } from "../store/dataStore";

/**
 * 從 Chrome storage 加載所有設置
 * @returns {Promise<Object>} 所有設置
 */
export const loadAllSettings = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(buildStorageDefaults(), (items) => {
      resolve(structureFromFlat(items));
    });
  });
};

/**
 * 設置變更的監聽處理函數
 * @param {Function} callback - 設置變更時的回調函數
 * @returns {Function} 移除監聽器的函數
 */
export const listenForSettingsChanges = (callback) => {
  const handleStorageChange = (changes, area) => {
    if (area === "sync") {
      // 當有設置變更時，重新加載所有設置
      loadAllSettings().then(callback);
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);

  // 返回清理函數
  return () => {
    chrome.storage.onChanged.removeListener(handleStorageChange);
  };
};

/**
 * 監聽 Chrome 擴展消息
 * @param {Function} callback - 收到消息時的回調函數
 * @returns {Function} 移除監聽器的函數
 */
export const listenForMessages = (callback) => {
  const handleMessage = (message) => {
    callback(message);
  };

  chrome.runtime.onMessage.addListener(handleMessage);

  // 返回清理函數
  return () => {
    chrome.runtime.onMessage.removeListener(handleMessage);
  };
};

/**
 * 監聽數據加載完成事件
 * @param {Function} callback - 數據加載完成時的回調函數
 * @returns {Function} 移除監聽器的函數
 */
export const listenForDataFetchCompletion = (callback) => {
  const handleDataFetchCompleted = (event) => {
    callback(event);
  };

  window.addEventListener("dataFetchCompleted", handleDataFetchCompleted);

  // 返回清理函數
  return () => {
    window.removeEventListener("dataFetchCompleted", handleDataFetchCompleted);
  };
};

/**
 * 處理設置變更的消息
 * @param {Object} message - 消息對象
 * @param {Function} settingsUpdateCallback - 設置更新時的回調函數
 */
export const handleSettingChangeMessage = (message, settingsUpdateCallback) => {
  if (message.action === "settingChanged") {
    // 使用完整設定物件更新設定，而不僅是變更的設定
    if (message.allSettings) {
      loadAllSettings().then(settingsUpdateCallback);
    }
  }
};

/**
 * 處理中藥設置變更
 */
const handleChineseMedSettingsChange = (event, currentSettings, updateCallback, callbacks) => {
  if (event.detail.allSettings) {
    // 更新所有中藥設置
    const newChineseMedSettings = sectionFromFlat('chinese', event.detail.allSettings);

    // 更新設置並重新處理數據
    updateCallback({
      ...currentSettings,
      chinese: newChineseMedSettings
    });

    // 重新處理中藥數據
    const chinesemedData = dataStore.getData('chinesemed');
    if (chinesemedData && callbacks.reprocessChineseMed) {
      callbacks.reprocessChineseMed(chinesemedData, newChineseMedSettings);
    }
  }
};

/**
 * 處理檢驗設置變更
 */
const handleLabSettingsChange = (event, currentSettings, updateCallback, callbacks) => {
  debugLog("Lab settings change event:", event.detail);

  if (event.detail.allSettings) {
    // 更新所有檢驗設置
    const newLabSettings = sectionFromFlat('lab', event.detail.allSettings);

    debugLog("Updating all lab settings:", newLabSettings);

    // 更新設置並重新處理數據
    updateCallback({
      ...currentSettings,
      lab: newLabSettings
    });

    // 重新處理檢驗數據
    const labData = dataStore.getData('labdata');
    if (labData && callbacks.reprocessLab) {
      callbacks.reprocessLab(labData, newLabSettings);
    }
  } else {
    // 單一設置變更
    let updatedValue = event.detail.value;
    let settingKey = event.detail.setting;

    debugLog(`Updating single lab setting: ${settingKey} = ${JSON.stringify(updatedValue)}`);

    // 特別處理 displayLabFormat
    if (settingKey === 'displayLabFormat') {
      debugLog(`Special handling for display format: ${updatedValue}`);

      // 創建新的設置對象，確保 displayLabFormat 被正確設置
      const updatedSettings = {
        ...currentSettings.lab,
        displayLabFormat: updatedValue
      };

      debugLog("Updated lab settings with new display format:", updatedSettings);

      // 更新設置
      updateCallback({
        ...currentSettings,
        lab: updatedSettings
      });

      // 重新處理檢驗數據
      const labDataForDisplayFormat = dataStore.getData('labdata');
      if (labDataForDisplayFormat && callbacks.reprocessLab) {
        callbacks.reprocessLab(labDataForDisplayFormat, updatedSettings);
      }

      return; // 提前返回，不執行後面的代碼
    }

    // 特別處理 itemSeparator
    if (settingKey === 'itemSeparator') {
      debugLog(`Special handling for item separator: "${updatedValue}" (${typeof updatedValue})`);

      // 確保分隔符是字符串
      if (typeof updatedValue !== 'string') {
        console.warn(`Invalid itemSeparator value: ${updatedValue}, converting to string`);
        updatedValue = String(updatedValue || ',');
      }

      // 確保有可讀的日誌輸出
      const loggableSeparator = updatedValue
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');

      debugLog(`Sanitized itemSeparator: "${loggableSeparator}" (${typeof updatedValue})`);

      // 創建新的設置對象，確保 itemSeparator 被正確設置
      const updatedSettings = {
        ...currentSettings.lab,
        itemSeparator: updatedValue
      };

      debugLog("Updated lab settings with new item separator:", updatedSettings);

      // 更新設置
      updateCallback({
        ...currentSettings,
        lab: updatedSettings
      });

      // 重新處理檢驗數據
      const labDataForItemSeparator = dataStore.getData('labdata');
      if (labDataForItemSeparator && callbacks.reprocessLab) {
        callbacks.reprocessLab(labDataForItemSeparator, updatedSettings);
      }

      return; // 提前返回，不執行後面的代碼
    }

    // 其他設置的一般處理
    const updatedSettings = {
      ...currentSettings.lab,
      [settingKey]: updatedValue
    };

    debugLog("Updated lab settings:", updatedSettings);

    // 更新設置
    updateCallback({
      ...currentSettings,
      lab: updatedSettings
    });

    // 重新處理檢驗數據
    const labDataForGeneralSetting = dataStore.getData('labdata');
    if (labDataForGeneralSetting && callbacks.reprocessLab) {
      callbacks.reprocessLab(labDataForGeneralSetting, updatedSettings);
    }
  }
};

/**
 * 處理總覽設置變更
 */
const handleOverviewSettingsChange = (event, currentSettings, updateCallback, callbacks) => {
  if (event.detail.allSettings) {
    // 更新所有總覽設置
    const newOverviewSettings = sectionFromFlat('overview', event.detail.allSettings);

    // 更新設置
    updateCallback({
      ...currentSettings,
      overview: newOverviewSettings
    });

    // 當追蹤天數變更時，重新處理藥物數據
    const medicationData = dataStore.getData('medication');
    if (medicationData?.rObject && callbacks.reprocessMedication) {
      callbacks.reprocessMedication(medicationData, currentSettings.western);
    }
  } else {
    // 單一設置變更
    const updatedSettings = {
      ...currentSettings.overview,
      [event.detail.setting]: event.detail.value
    };

    // 更新設置
    updateCallback({
      ...currentSettings,
      overview: updatedSettings
    });

    // 處理特定設置變更
    const medicationDataForSingleSetting = dataStore.getData('medication');
    if (event.detail.setting === "medicationTrackingDays" &&
      medicationDataForSingleSetting?.rObject &&
      callbacks.reprocessMedication) {
      callbacks.reprocessMedication(medicationDataForSingleSetting, currentSettings.western);
    }
  }
};

/**
 * 處理雲端資料設置變更
 */
const handleCloudDataSettingsChange = (event, currentSettings, updateCallback) => {
  if (event.detail.allSettings) {
    // 更新所有雲端資料設置
    const newCloudSettings = sectionFromFlat('cloud', event.detail.allSettings);

    // 更新設置
    updateCallback({
      ...currentSettings,
      cloud: newCloudSettings
    });
  } else {
    // 單一設置變更
    const updatedSettings = {
      ...currentSettings.cloud,
      [event.detail.setting]: event.detail.value
    };

    // 更新設置
    updateCallback({
      ...currentSettings,
      cloud: updatedSettings
    });
  }
};

/**
 * 處理一般顯示設置變更
 */
const handleGeneralDisplaySettingsChange = (event, updateGeneralDisplaySettings) => {
  if (event.detail.allSettings) {
    // 更新所有顯示設置
    const newGeneralDisplaySettings = sectionFromFlat('general', event.detail.allSettings);

    // 更新設置
    updateGeneralDisplaySettings(newGeneralDisplaySettings);
  } else {
    // 單一設置變更
    updateGeneralDisplaySettings(prevSettings => ({
      ...prevSettings,
      [event.detail.setting]: event.detail.value
    }));
  }
};

/**
 * 處理數據加載完成事件中的設置變更
 * @param {Object} event - 事件對象
 * @param {Object} currentSettings - 當前設置
 * @param {Function} updateCallback - 設置更新時的回調函數
 * @param {Object} callbacks - 各種數據處理回調函數
 */
export const handleDataFetchCompletedSettingsChange = (event, currentSettings, updateCallback, callbacks) => {
  // Handle setting changes
  if (event.detail?.settingsChanged) {
    // 使用 Map 替代 switch 結構
    const settingTypeHandlers = new Map([
      ['chinesemed', () => handleChineseMedSettingsChange(event, currentSettings, updateCallback, callbacks)],
      ['labsettings', () => handleLabSettingsChange(event, currentSettings, updateCallback, callbacks)],
      ['overview', () => handleOverviewSettingsChange(event, currentSettings, updateCallback, callbacks)],
      ['generalDisplay', () => handleGeneralDisplaySettingsChange(event, updateCallback)],
      ['cloud', () => handleCloudDataSettingsChange(event, currentSettings, updateCallback)]
    ]);

    // 從 Map 中獲取並執行對應的處理函數
    const handler = settingTypeHandlers.get(event.detail.settingType);

    // 如果找到對應的處理函數則執行，否則加載所有設置
    if (handler) {
      handler();
    } else {
      // 未知類型，可能需要加載所有設置
      loadAllSettings().then(updateCallback);
    }
  }
};