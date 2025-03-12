// settingsManager.js
// 統一管理所有設置相關的函數

import { DEFAULT_SETTINGS } from "../config/defaultSettings";
import { DEFAULT_LAB_TESTS } from "../config/labTests";
import { DEFAULT_IMAGE_TESTS } from "../config/imageTests";

/**
 * 從 Chrome storage 加載所有設置
 * @returns {Promise<Object>} 所有設置
 */
export const loadAllSettings = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      // Western medication settings
      simplifyMedicineName: DEFAULT_SETTINGS.western.simplifyMedicineName,
      showGenericName: DEFAULT_SETTINGS.western.showGenericName,
      showDiagnosis: DEFAULT_SETTINGS.western.showDiagnosis,
      showATC5Name: DEFAULT_SETTINGS.western.showATC5Name,
      copyFormat: DEFAULT_SETTINGS.western.copyFormat,
      
      // ATC5 Color settings
      enableATC5Colors: DEFAULT_SETTINGS.atc5.enableColors,
      atc5Groups: DEFAULT_SETTINGS.atc5.groups,
      atc5ColorGroups: DEFAULT_SETTINGS.atc5.colorGroups,
      
      // Chinese medicine settings
      chineseMedShowDiagnosis: DEFAULT_SETTINGS.chinese.showDiagnosis,
      chineseMedShowEffectName: DEFAULT_SETTINGS.chinese.showEffectName,
      chineseMedCopyFormat: DEFAULT_SETTINGS.chinese.copyFormat,
      
      // Lab settings
      labDisplayFormat: DEFAULT_SETTINGS.lab.displayFormat,
      showLabUnit: DEFAULT_SETTINGS.lab.showUnit,
      showLabReference: DEFAULT_SETTINGS.lab.showReference,
      enableLabAbbrev: DEFAULT_SETTINGS.lab.enableAbbrev,
      highlightAbnormalLab: DEFAULT_SETTINGS.lab.highlightAbnormal,
      labCopyFormat: DEFAULT_SETTINGS.lab.copyFormat,
      
      // Overview settings
      medicationTrackingDays: DEFAULT_SETTINGS.overview.medicationTrackingDays,
      labTrackingDays: DEFAULT_SETTINGS.overview.labTrackingDays,
      imageTrackingDays: DEFAULT_SETTINGS.overview.imageTrackingDays,
      focusedLabTests: DEFAULT_SETTINGS.overview.focusedLabTests,
      focusedImageTests: DEFAULT_SETTINGS.overview.focusedImageTests,
      
      // General display settings
      autoOpenPage: DEFAULT_SETTINGS.general.autoOpenPage,
      titleTextSize: DEFAULT_SETTINGS.general.titleTextSize,
      contentTextSize: DEFAULT_SETTINGS.general.contentTextSize,
      noteTextSize: DEFAULT_SETTINGS.general.noteTextSize,
      floatingIconPosition: DEFAULT_SETTINGS.general.floatingIconPosition,
      alwaysOpenOverviewTab: DEFAULT_SETTINGS.general.alwaysOpenOverviewTab,
      useColorfulTabs: DEFAULT_SETTINGS.general.useColorfulTabs
    }, (items) => {
      // 組織所有設置到一個結構化對象
      const allSettings = {
        western: {
          simplifyMedicineName: items.simplifyMedicineName,
          showGenericName: items.showGenericName,
          showDiagnosis: items.showDiagnosis,
          showATC5Name: items.showATC5Name,
          copyFormat: items.copyFormat,
        },
        atc5: {
          enableColors: items.enableATC5Colors,
          groups: items.atc5Groups,
          colorGroups: items.atc5ColorGroups,
        },
        chinese: {
          showDiagnosis: items.chineseMedShowDiagnosis,
          showEffectName: items.chineseMedShowEffectName,
          copyFormat: items.chineseMedCopyFormat,
        },
        lab: {
          displayFormat: items.labDisplayFormat,
          showUnit: items.showLabUnit,
          showReference: items.showLabReference,
          enableAbbrev: items.enableLabAbbrev,
          highlightAbnormal: items.highlightAbnormalLab,
          copyFormat: items.labCopyFormat,
        },
        overview: {
          medicationTrackingDays: items.medicationTrackingDays,
          labTrackingDays: items.labTrackingDays,
          imageTrackingDays: items.imageTrackingDays,
          focusedLabTests: items.focusedLabTests || DEFAULT_LAB_TESTS,
          focusedImageTests: items.focusedImageTests || DEFAULT_IMAGE_TESTS
        },
        general: {
          autoOpenPage: items.autoOpenPage,
          titleTextSize: items.titleTextSize,
          contentTextSize: items.contentTextSize,
          noteTextSize: items.noteTextSize,
          floatingIconPosition: items.floatingIconPosition,
          alwaysOpenOverviewTab: items.alwaysOpenOverviewTab,
          useColorfulTabs: items.useColorfulTabs
        }
      };
      
      resolve(allSettings);
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
 * 處理數據加載完成事件中的設置變更
 * @param {Object} event - 事件對象
 * @param {Object} currentSettings - 當前設置
 * @param {Function} updateCallback - 設置更新時的回調函數
 * @param {Object} callbacks - 各種數據處理回調函數
 */
export const handleDataFetchCompletedSettingsChange = (event, currentSettings, updateCallback, callbacks) => {
  // Handle setting changes
  if (event.detail?.settingsChanged) {
    // 根據不同的設置類型處理
    switch (event.detail.settingType) {
      case "chinesemed":
        handleChineseMedSettingsChange(event, currentSettings, updateCallback, callbacks);
        break;
      case "labsettings":
        handleLabSettingsChange(event, currentSettings, updateCallback, callbacks);
        break;
      case "overview":
        handleOverviewSettingsChange(event, currentSettings, updateCallback, callbacks);
        break;
      case "generalDisplay":
        handleGeneralDisplaySettingsChange(event, updateCallback);
        break;
      default:
        // 未知類型，可能需要加載所有設置
        loadAllSettings().then(updateCallback);
    }
  }
};

/**
 * 處理中藥設置變更
 */
const handleChineseMedSettingsChange = (event, currentSettings, updateCallback, callbacks) => {
  if (event.detail.allSettings) {
    // 更新所有中藥設置
    const newChineseMedSettings = {
      showDiagnosis: event.detail.allSettings.chineseMedShowDiagnosis,
      showEffectName: event.detail.allSettings.chineseMedShowEffectName,
      copyFormat: event.detail.allSettings.chineseMedCopyFormat,
    };

    // 更新設置並重新處理數據
    updateCallback({
      ...currentSettings,
      chinese: newChineseMedSettings
    });

    // 重新處理中藥數據
    if (window.lastInterceptedChineseMedData && callbacks.reprocessChineseMed) {
      callbacks.reprocessChineseMed(window.lastInterceptedChineseMedData, newChineseMedSettings);
    }
  }
};

/**
 * 處理檢驗設置變更
 */
const handleLabSettingsChange = (event, currentSettings, updateCallback, callbacks) => {
  if (event.detail.allSettings) {
    // 更新所有檢驗設置
    const newLabSettings = {
      displayFormat: event.detail.allSettings.labDisplayFormat,
      showUnit: event.detail.allSettings.showLabUnit,
      showReference: event.detail.allSettings.showLabReference,
      enableAbbrev: event.detail.allSettings.enableLabAbbrev,
      highlightAbnormal: event.detail.allSettings.highlightAbnormalLab,
      copyFormat: event.detail.allSettings.labCopyFormat,
    };

    // 更新設置並重新處理數據
    updateCallback({
      ...currentSettings,
      lab: newLabSettings
    });

    // 重新處理檢驗數據
    if (window.lastInterceptedLabData && callbacks.reprocessLab) {
      callbacks.reprocessLab(window.lastInterceptedLabData, newLabSettings);
    }
  } else {
    // 單一設置變更
    const updatedSettings = {
      ...currentSettings.lab,
      [event.detail.setting]: event.detail.value
    };
    
    // 更新設置
    updateCallback({
      ...currentSettings,
      lab: updatedSettings
    });
    
    // 重新處理檢驗數據
    if (window.lastInterceptedLabData && callbacks.reprocessLab) {
      callbacks.reprocessLab(window.lastInterceptedLabData, updatedSettings);
    }
  }
};

/**
 * 處理總覽設置變更
 */
const handleOverviewSettingsChange = (event, currentSettings, updateCallback, callbacks) => {
  if (event.detail.allSettings) {
    // 更新所有總覽設置
    const newOverviewSettings = {
      medicationTrackingDays: event.detail.allSettings.medicationTrackingDays,
      labTrackingDays: event.detail.allSettings.labTrackingDays,
      imageTrackingDays: event.detail.allSettings.imageTrackingDays,
      focusedLabTests: event.detail.allSettings.focusedLabTests || DEFAULT_LAB_TESTS,
      focusedImageTests: event.detail.allSettings.focusedImageTests || DEFAULT_IMAGE_TESTS
    };
    
    // 更新設置
    updateCallback({
      ...currentSettings,
      overview: newOverviewSettings
    });
    
    // 當追蹤天數變更時，重新處理藥物數據
    if (window.lastInterceptedMedicationData?.rObject && callbacks.reprocessMedication) {
      callbacks.reprocessMedication(window.lastInterceptedMedicationData, currentSettings.western);
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
    if (event.detail.setting === "medicationTrackingDays" && 
        window.lastInterceptedMedicationData?.rObject &&
        callbacks.reprocessMedication) {
      callbacks.reprocessMedication(window.lastInterceptedMedicationData, currentSettings.western);
    }
  }
};

/**
 * 處理一般顯示設置變更
 */
const handleGeneralDisplaySettingsChange = (event, updateGeneralDisplaySettings) => {
  if (event.detail.allSettings) {
    // 更新所有顯示設置
    const newGeneralDisplaySettings = {
      autoOpenPage: event.detail.allSettings.autoOpenPage,
      titleTextSize: event.detail.allSettings.titleTextSize,
      contentTextSize: event.detail.allSettings.contentTextSize,
      noteTextSize: event.detail.allSettings.noteTextSize,
      floatingIconPosition: event.detail.allSettings.floatingIconPosition,
      alwaysOpenOverviewTab: event.detail.allSettings.alwaysOpenOverviewTab,
      useColorfulTabs: event.detail.allSettings.useColorfulTabs
    };
    
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