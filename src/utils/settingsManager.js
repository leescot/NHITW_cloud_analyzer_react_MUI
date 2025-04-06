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
      medicationCopyFormat: DEFAULT_SETTINGS.western.medicationCopyFormat,
      separateShortTermMeds: DEFAULT_SETTINGS.western.separateShortTermMeds,
      showExternalDrugImage: DEFAULT_SETTINGS.western.showExternalDrugImage,
      enableMedicationCustomCopyFormat: DEFAULT_SETTINGS.western.enableMedicationCustomCopyFormat || false,
      enableMedicationCopyAll: DEFAULT_SETTINGS.western.enableMedicationCopyAll || false,
      drugSeparator: DEFAULT_SETTINGS.western.drugSeparator || ',',
      customMedicationHeaderCopyFormat: DEFAULT_SETTINGS.western.customMedicationHeaderCopyFormat,
      customMedicationDrugCopyFormat: DEFAULT_SETTINGS.western.customMedicationDrugCopyFormat,

      // ATC5 Color settings
      enableATC5Colors: DEFAULT_SETTINGS.atc5.enableColors,
      atc5Groups: DEFAULT_SETTINGS.atc5.groups,
      atc5ColorGroups: DEFAULT_SETTINGS.atc5.colorGroups,

      // Chinese medicine settings
      chineseMedShowDiagnosis: DEFAULT_SETTINGS.chinese.showDiagnosis,
      chineseMedShowEffectName: DEFAULT_SETTINGS.chinese.showEffectName,
      chineseMedDoseFormat: DEFAULT_SETTINGS.chinese.doseFormat,
      chineseMedCopyFormat: DEFAULT_SETTINGS.chinese.copyFormat,

      // Lab settings
      displayLabFormat: DEFAULT_SETTINGS.lab.displayLabFormat,
      showLabUnit: DEFAULT_SETTINGS.lab.showUnit,
      showLabReference: DEFAULT_SETTINGS.lab.showReference,
      enableLabAbbrev: DEFAULT_SETTINGS.lab.enableLabAbbrev,
      highlightAbnormalLab: DEFAULT_SETTINGS.lab.highlightAbnormal,
      copyLabFormat: DEFAULT_SETTINGS.lab.copyLabFormat,
      enableLabChooseCopy: DEFAULT_SETTINGS.lab.enableLabChooseCopy,
      labChooseCopyItems: DEFAULT_SETTINGS.lab.labChooseCopyItems,

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
      useColorfulTabs: DEFAULT_SETTINGS.general.useColorfulTabs,
    }, (items) => {
      // 組織所有設置到一個結構化對象
      const allSettings = {
        western: {
          simplifyMedicineName: items.simplifyMedicineName,
          showGenericName: items.showGenericName,
          showDiagnosis: items.showDiagnosis,
          showATC5Name: items.showATC5Name,
          medicationCopyFormat: items.medicationCopyFormat,
          separateShortTermMeds: items.separateShortTermMeds,
          showExternalDrugImage: items.showExternalDrugImage,
          enableMedicationCustomCopyFormat: items.enableMedicationCustomCopyFormat,
          enableMedicationCopyAll: items.enableMedicationCopyAll,
          customMedicationHeaderCopyFormat: items.customMedicationHeaderCopyFormat,
          customMedicationDrugCopyFormat: items.customMedicationDrugCopyFormat,
          drugSeparator: items.drugSeparator,
        },
        atc5: {
          enableColors: items.enableATC5Colors,
          groups: items.atc5Groups,
          colorGroups: items.atc5ColorGroups,
        },
        chinese: {
          showDiagnosis: items.chineseMedShowDiagnosis,
          showEffectName: items.chineseMedShowEffectName,
          doseFormat: items.chineseMedDoseFormat,
          copyFormat: items.chineseMedCopyFormat,
        },
        lab: {
          displayLabFormat: items.displayLabFormat,
          showUnit: items.showLabUnit,
          showReference: items.showLabReference,
          enableLabAbbrev: items.enableLabAbbrev,
          highlightAbnormal: items.highlightAbnormalLab,
          copyLabFormat: items.copyLabFormat,
          enableLabChooseCopy: items.enableLabChooseCopy,
          labChooseCopyItems: items.labChooseCopyItems,
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
          useColorfulTabs: items.useColorfulTabs,
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
 * 處理中藥設置變更
 */
const handleChineseMedSettingsChange = (event, currentSettings, updateCallback, callbacks) => {
  if (event.detail.allSettings) {
    // 更新所有中藥設置
    const newChineseMedSettings = {
      showDiagnosis: event.detail.allSettings.chineseMedShowDiagnosis,
      showEffectName: event.detail.allSettings.chineseMedShowEffectName,
      doseFormat: event.detail.allSettings.chineseMedDoseFormat,
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
  console.log("Lab settings change event:", event.detail);
  
  if (event.detail.allSettings) {
    // 更新所有檢驗設置
    const newLabSettings = {
      displayLabFormat: event.detail.allSettings.displayLabFormat,
      showUnit: event.detail.allSettings.showLabUnit,
      showReference: event.detail.allSettings.showLabReference,
      enableLabAbbrev: event.detail.allSettings.enableLabAbbrev,
      highlightAbnormal: event.detail.allSettings.highlightAbnormalLab,
      copyLabFormat: event.detail.allSettings.copyLabFormat,
      enableLabChooseCopy: event.detail.allSettings.enableLabChooseCopy,
      labChooseCopyItems: event.detail.allSettings.labChooseCopyItems,
    };

    console.log("Updating all lab settings:", newLabSettings);

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
    let updatedValue = event.detail.value;
    let settingKey = event.detail.setting;
    
    console.log(`Updating single lab setting: ${settingKey} = ${JSON.stringify(updatedValue)}`);
    
    // 特別處理 displayLabFormat
    if (settingKey === 'displayLabFormat') {
      console.log(`Special handling for display format: ${updatedValue}`);
      
      // 創建新的設置對象，確保 displayLabFormat 被正確設置
      const updatedSettings = {
        ...currentSettings.lab,
        displayLabFormat: updatedValue
      };
      
      console.log("Updated lab settings with new display format:", updatedSettings);
      
      // 更新設置
      updateCallback({
        ...currentSettings,
        lab: updatedSettings
      });
      
      // 重新處理檢驗數據
      if (window.lastInterceptedLabData && callbacks.reprocessLab) {
        callbacks.reprocessLab(window.lastInterceptedLabData, updatedSettings);
      }
      
      return; // 提前返回，不執行後面的代碼
    }
    
    // 其他設置的一般處理
    const updatedSettings = {
      ...currentSettings.lab,
      [settingKey]: updatedValue
    };

    console.log("Updated lab settings:", updatedSettings);

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
      ['generalDisplay', () => handleGeneralDisplaySettingsChange(event, updateCallback)]
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