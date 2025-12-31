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
      enableLabCustomCopyFormat: DEFAULT_SETTINGS.lab.enableLabCustomCopyFormat || false,
      enableLabCopyAll: DEFAULT_SETTINGS.lab.enableLabCopyAll || false,
      itemSeparator: DEFAULT_SETTINGS.lab.itemSeparator || ',',
      customLabHeaderCopyFormat: DEFAULT_SETTINGS.lab.customLabHeaderCopyFormat,
      customLabItemCopyFormat: DEFAULT_SETTINGS.lab.customLabItemCopyFormat,

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

      // Cloud data settings
      fetchAdultHealthCheck: DEFAULT_SETTINGS.cloud.fetchAdultHealthCheck,
      fetchCancerScreening: DEFAULT_SETTINGS.cloud.fetchCancerScreening,
      fetchHbcvdata: DEFAULT_SETTINGS.cloud.fetchHbcvdata,
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
          enableLabCustomCopyFormat: items.enableLabCustomCopyFormat,
          enableLabCopyAll: items.enableLabCopyAll,
          itemSeparator: items.itemSeparator || ',',
          customLabHeaderCopyFormat: items.customLabHeaderCopyFormat,
          customLabItemCopyFormat: items.customLabItemCopyFormat,
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
        },
        cloud: {
          fetchAdultHealthCheck: items.fetchAdultHealthCheck,
          fetchCancerScreening: items.fetchCancerScreening,
          fetchHbcvdata: items.fetchHbcvdata,
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
      enableLabCustomCopyFormat: event.detail.allSettings.enableLabCustomCopyFormat,
      enableLabCopyAll: event.detail.allSettings.enableLabCopyAll,
      itemSeparator: event.detail.allSettings.itemSeparator || ',',
      customLabHeaderCopyFormat: event.detail.allSettings.customLabHeaderCopyFormat,
      customLabItemCopyFormat: event.detail.allSettings.customLabItemCopyFormat,
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

    // 特別處理 itemSeparator
    if (settingKey === 'itemSeparator') {
      console.log(`Special handling for item separator: "${updatedValue}" (${typeof updatedValue})`);

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

      console.log(`Sanitized itemSeparator: "${loggableSeparator}" (${typeof updatedValue})`);

      // 創建新的設置對象，確保 itemSeparator 被正確設置
      const updatedSettings = {
        ...currentSettings.lab,
        itemSeparator: updatedValue
      };

      console.log("Updated lab settings with new item separator:", updatedSettings);

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
 * 處理雲端資料設置變更
 */
const handleCloudDataSettingsChange = (event, currentSettings, updateCallback) => {
  if (event.detail.allSettings) {
    // 更新所有雲端資料設置
    const newCloudSettings = {
      fetchAdultHealthCheck: event.detail.allSettings.fetchAdultHealthCheck,
      fetchCancerScreening: event.detail.allSettings.fetchCancerScreening,
      fetchHbcvdata: event.detail.allSettings.fetchHbcvdata,
    };

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

// ==================== GAI Sidebar Tab Configuration ====================

/**
 * 載入 Sidebar Tab 配置
 * @returns {Promise<Array>} Tab 配置陣列
 */
export const loadSidebarTabs = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['gaiSidebarTabs'], async (result) => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error loading sidebar tabs:', chrome.runtime.lastError);
        // 錯誤時返回預設值
        const defaultTabs = [
          { slotIndex: 0, templateId: 'critical_alerts', type: 'preset' },
          { slotIndex: 1, templateId: 'medication_risks', type: 'preset' },
          { slotIndex: 2, templateId: 'abnormal_labs', type: 'preset' },
          { slotIndex: 3, templateId: 'imaging_findings', type: 'preset' }
        ];
        resolve(defaultTabs);
        return;
      }

      // 如果沒有配置，自動建立並儲存預設值
      if (!result.gaiSidebarTabs) {
        console.log('[SettingsManager] No sidebar tabs config found, creating default...');
        const defaultTabs = [
          { slotIndex: 0, templateId: 'critical_alerts', type: 'preset' },
          { slotIndex: 1, templateId: 'medication_risks', type: 'preset' },
          { slotIndex: 2, templateId: 'abnormal_labs', type: 'preset' },
          { slotIndex: 3, templateId: 'imaging_findings', type: 'preset' }
        ];
        await saveSidebarTabs(defaultTabs);
        resolve(defaultTabs);
        return;
      }

      resolve(result.gaiSidebarTabs);
    });
  });
};

/**
 * 儲存 Sidebar Tab 配置
 * @param {Array} tabs - Tab 配置陣列
 * @returns {Promise<boolean>} 是否儲存成功
 */
export const saveSidebarTabs = async (tabs) => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ gaiSidebarTabs: tabs }, () => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error saving sidebar tabs:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      console.log('[SettingsManager] Sidebar tabs saved successfully');
      resolve(true);
    });
  });
};

/**
 * 載入自訂 Tab 配置
 * @returns {Promise<Object>} 自訂 Tab 配置
 */
export const loadCustomTabConfig = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['gaiCustomTabConfig'], async (result) => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error loading custom tab config:', chrome.runtime.lastError);
        // 錯誤時返回預設值
        const defaultCustomConfig = {
          name: '自訂分析',
          icon: 'Star',
          description: '我的自訂分析',
          category: 'custom',
          dataTypes: ['medication', 'lab'],
          systemPrompt: '你是專業的醫療AI助理。請分析以下病歷資料，提供有用的臨床見解。使用台灣醫師常用的繁體中文醫學術語。',
          quickQuestions: [
            '摘要重點',
            '列出異常項目',
            '分析用藥安全'
          ],
          schema: {
            name: 'custom_analysis_response',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                analysis_results: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of analysis results'
                }
              },
              required: ['analysis_results'],
              additionalProperties: false
            }
          },
          version: '1.0.0'
        };
        resolve(defaultCustomConfig);
        return;
      }

      // 如果沒有配置，自動建立並儲存預設值
      if (!result.gaiCustomTabConfig) {
        console.log('[SettingsManager] No custom tab config found, creating default...');
        const defaultCustomConfig = {
          name: '自訂分析',
          icon: 'Star',
          description: '我的自訂分析',
          category: 'custom',
          dataTypes: ['medication', 'lab'],
          systemPrompt: '你是專業的醫療AI助理。請分析以下病歷資料，提供有用的臨床見解。使用台灣醫師常用的繁體中文醫學術語。',
          quickQuestions: [
            '摘要重點',
            '列出異常項目',
            '分析用藥安全'
          ],
          schema: {
            name: 'custom_analysis_response',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                analysis_results: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of analysis results'
                }
              },
              required: ['analysis_results'],
              additionalProperties: false
            }
          },
          version: '1.0.0'
        };
        await saveCustomTabConfig(defaultCustomConfig);
        resolve(defaultCustomConfig);
        return;
      }

      resolve(result.gaiCustomTabConfig);
    });
  });
};

/**
 * 儲存自訂 Tab 配置
 * @param {Object} config - 自訂 Tab 配置
 * @returns {Promise<boolean>} 是否儲存成功
 */
export const saveCustomTabConfig = async (config) => {
  return new Promise((resolve) => {
    // 加入最後修改時間戳記
    const configWithTimestamp = {
      ...config,
      lastModified: new Date().toISOString()
    };

    chrome.storage.sync.set({ gaiCustomTabConfig: configWithTimestamp }, () => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error saving custom tab config:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      console.log('[SettingsManager] Custom tab config saved successfully');
      resolve(true);
    });
  });
};

/**
 * 重置 Sidebar Tabs 為預設值
 * @returns {Promise<boolean>} 是否重置成功
 */
export const resetSidebarTabsToDefault = async () => {
  // 預設值會在需要時從 sidebarTabDefaults.js 導入
  const defaultTabs = [
    { slotIndex: 0, templateId: 'critical_alerts', type: 'preset' },
    { slotIndex: 1, templateId: 'medication_risks', type: 'preset' },
    { slotIndex: 2, templateId: 'abnormal_labs', type: 'preset' },
    { slotIndex: 3, templateId: 'imaging_findings', type: 'preset' }
  ];

  return saveSidebarTabs(defaultTabs);
};

// ==================== GAI Sidebar V2 Configuration ====================

/**
 * 載入自動分析配置（Tab 1）
 * @returns {Promise<Object>} 自動分析配置
 */
export const loadAutoAnalysisConfig = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['gaiAutoAnalysisConfig'], async (result) => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error loading auto analysis config:', chrome.runtime.lastError);
        // 錯誤時返回預設值
        const { DEFAULT_AUTO_ANALYSIS_CONFIG } = await import('../config/sidebarV2Defaults.js');
        resolve(DEFAULT_AUTO_ANALYSIS_CONFIG);
        return;
      }

      // 如果沒有配置，自動建立並儲存預設值
      if (!result.gaiAutoAnalysisConfig) {
        console.log('[SettingsManager] No auto analysis config found, creating default...');
        const { DEFAULT_AUTO_ANALYSIS_CONFIG } = await import('../config/sidebarV2Defaults.js');
        await saveAutoAnalysisConfig(DEFAULT_AUTO_ANALYSIS_CONFIG);
        resolve(DEFAULT_AUTO_ANALYSIS_CONFIG);
        return;
      }

      resolve(result.gaiAutoAnalysisConfig);
    });
  });
};

/**
 * 儲存自動分析配置（Tab 1）
 * @param {Object} config - 自動分析配置
 * @returns {Promise<boolean>} 是否儲存成功
 */
export const saveAutoAnalysisConfig = async (config) => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ gaiAutoAnalysisConfig: config }, () => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error saving auto analysis config:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      console.log('[SettingsManager] Auto analysis config saved successfully');
      resolve(true);
    });
  });
};

/**
 * 載入快速按鈕配置（Tab 2）
 * @returns {Promise<Array>} 快速按鈕配置陣列
 */
export const loadQuickButtonsConfig = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['gaiQuickButtonsConfig'], async (result) => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error loading quick buttons config:', chrome.runtime.lastError);
        // 錯誤時返回預設值
        const { DEFAULT_QUICK_BUTTONS_CONFIG } = await import('../config/sidebarV2Defaults.js');
        resolve(DEFAULT_QUICK_BUTTONS_CONFIG);
        return;
      }

      // 如果沒有配置，自動建立並儲存預設值
      if (!result.gaiQuickButtonsConfig) {
        console.log('[SettingsManager] No quick buttons config found, creating default...');
        const { DEFAULT_QUICK_BUTTONS_CONFIG } = await import('../config/sidebarV2Defaults.js');
        await saveQuickButtonsConfig(DEFAULT_QUICK_BUTTONS_CONFIG);
        resolve(DEFAULT_QUICK_BUTTONS_CONFIG);
        return;
      }

      resolve(result.gaiQuickButtonsConfig);
    });
  });
};

/**
 * 儲存快速按鈕配置（Tab 2）
 * @param {Array} config - 快速按鈕配置陣列
 * @returns {Promise<boolean>} 是否儲存成功
 */
export const saveQuickButtonsConfig = async (config) => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ gaiQuickButtonsConfig: config }, () => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error saving quick buttons config:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      console.log('[SettingsManager] Quick buttons config saved successfully');
      resolve(true);
    });
  });
};

/**
 * 載入 Chat 配置（Tab 3）
 * @returns {Promise<Object>} Chat 配置
 */
export const loadChatConfig = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['gaiChatConfig'], async (result) => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error loading chat config:', chrome.runtime.lastError);
        // 錯誤時返回預設值
        const { DEFAULT_CHAT_CONFIG } = await import('../config/sidebarV2Defaults.js');
        resolve(DEFAULT_CHAT_CONFIG);
        return;
      }

      // 如果沒有配置，自動建立並儲存預設值
      if (!result.gaiChatConfig) {
        console.log('[SettingsManager] No chat config found, creating default...');
        const { DEFAULT_CHAT_CONFIG } = await import('../config/sidebarV2Defaults.js');
        await saveChatConfig(DEFAULT_CHAT_CONFIG);
        resolve(DEFAULT_CHAT_CONFIG);
        return;
      }

      resolve(result.gaiChatConfig);
    });
  });
};

/**
 * 儲存 Chat 配置（Tab 3）
 * @param {Object} config - Chat 配置
 * @returns {Promise<boolean>} 是否儲存成功
 */
export const saveChatConfig = async (config) => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ gaiChatConfig: config }, () => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error saving chat config:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      console.log('[SettingsManager] Chat config saved successfully');
      resolve(true);
    });
  });
};

/**
 * 載入 Chat 歷史記錄（使用 chrome.storage.local，不同步）
 * @returns {Promise<Array>} Chat 歷史記錄陣列
 */
export const loadChatHistory = async () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['gaiChatHistory'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error loading chat history:', chrome.runtime.lastError);
        resolve([]);
        return;
      }

      resolve(result.gaiChatHistory || []);
    });
  });
};

/**
 * 儲存 Chat 歷史記錄（使用 chrome.storage.local，不同步）
 * @param {Array} history - Chat 歷史記錄陣列
 * @returns {Promise<boolean>} 是否儲存成功
 */
export const saveChatHistory = async (history) => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ gaiChatHistory: history }, () => {
      if (chrome.runtime.lastError) {
        console.error('[SettingsManager] Error saving chat history:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      console.log('[SettingsManager] Chat history saved successfully');
      resolve(true);
    });
  });
};

/**
 * 資料遷移：從 V1（4 tabs）遷移到 V2（3 tabs）
 * @returns {Promise<Object>} 遷移結果
 */
export const migrateSidebarConfigToV2 = async () => {
  return new Promise(async (resolve) => {
    try {
      // 檢查是否已遷移
      const versionCheck = await new Promise((resolveVersion) => {
        chrome.storage.sync.get(['gaiSidebarConfigVersion'], (result) => {
          resolveVersion(result.gaiSidebarConfigVersion);
        });
      });

      if (versionCheck === 2) {
        console.log('[Migration] Already migrated to V2');
        resolve({ migrated: false, reason: 'already_v2' });
        return;
      }

      // 載入舊配置
      const oldTabs = await loadSidebarTabs();
      const oldCustomConfig = await loadCustomTabConfig();

      // 檢查是否有有效的舊配置
      if (!oldTabs || oldTabs.length !== 4) {
        console.log('[Migration] No valid V1 config found, using defaults');
        // 標記為 V2 並使用預設配置
        chrome.storage.sync.set({ gaiSidebarConfigVersion: 2 });
        resolve({ migrated: false, reason: 'no_v1_config' });
        return;
      }

      console.log('[Migration] Migrating from V1 to V2...');

      // 遷移邏輯
      // Tab 0 → 自動分析
      const autoAnalysisConfig = {
        templateId: oldTabs[0].templateId,
        enabled: true
      };

      // Tab 1-3 → 快速按鈕（slot 0-2）
      const { DEFAULT_QUICK_BUTTONS_CONFIG } = await import('../config/sidebarV2Defaults.js');
      const quickButtonsConfig = [...DEFAULT_QUICK_BUTTONS_CONFIG];

      // 遷移 Tab 1
      if (oldTabs[1]) {
        quickButtonsConfig[0] = {
          slotIndex: 0,
          type: oldTabs[1].type,
          templateId: oldTabs[1].type === 'preset' ? oldTabs[1].templateId : null,
          customConfig: oldTabs[1].type === 'custom' ? oldCustomConfig : null,
          label: getTemplateName(oldTabs[1], oldCustomConfig),
          icon: getTemplateIcon(oldTabs[1], oldCustomConfig),
          enabled: true
        };
      }

      // 遷移 Tab 2
      if (oldTabs[2]) {
        quickButtonsConfig[1] = {
          slotIndex: 1,
          type: oldTabs[2].type,
          templateId: oldTabs[2].type === 'preset' ? oldTabs[2].templateId : null,
          customConfig: oldTabs[2].type === 'custom' ? oldCustomConfig : null,
          label: getTemplateName(oldTabs[2], oldCustomConfig),
          icon: getTemplateIcon(oldTabs[2], oldCustomConfig),
          enabled: true
        };
      }

      // 遷移 Tab 3
      if (oldTabs[3]) {
        quickButtonsConfig[2] = {
          slotIndex: 2,
          type: oldTabs[3].type,
          templateId: oldTabs[3].type === 'preset' ? oldTabs[3].templateId : null,
          customConfig: oldTabs[3].type === 'custom' ? oldCustomConfig : null,
          label: getTemplateName(oldTabs[3], oldCustomConfig),
          icon: getTemplateIcon(oldTabs[3], oldCustomConfig),
          enabled: true
        };
      }

      // Chat 配置使用預設值
      const { DEFAULT_CHAT_CONFIG } = await import('../config/sidebarV2Defaults.js');
      const chatConfig = DEFAULT_CHAT_CONFIG;

      // 儲存新配置
      await saveAutoAnalysisConfig(autoAnalysisConfig);
      await saveQuickButtonsConfig(quickButtonsConfig);
      await saveChatConfig(chatConfig);

      // 備份舊配置並標記版本
      await new Promise((resolveBackup) => {
        chrome.storage.sync.set({
          gaiSidebarTabs_backup: oldTabs,
          gaiCustomTabConfig_backup: oldCustomConfig,
          gaiSidebarConfigVersion: 2
        }, () => resolveBackup());
      });

      console.log('[Migration] Migration complete');
      resolve({
        migrated: true,
        oldTabs,
        newConfigs: { autoAnalysisConfig, quickButtonsConfig, chatConfig }
      });
    } catch (error) {
      console.error('[Migration] Migration failed:', error);
      resolve({ migrated: false, reason: 'error', error });
    }
  });
};

// Helper functions for migration
const getTemplateName = (tabConfig, customConfig) => {
  if (tabConfig.type === 'custom') {
    return customConfig?.name || '自訂';
  }
  // 從 templateId 推斷名稱（簡化版）
  const nameMap = {
    'critical_alerts': '危險警示',
    'medication_risks': '用藥風險',
    'abnormal_labs': '檢驗異常',
    'imaging_findings': '影像重點',
    'renal_medication': '腎功能',
    'diabetes_management': '糖尿病',
    'comprehensive_summary': '綜合摘要'
  };
  return nameMap[tabConfig.templateId] || '分析';
};

const getTemplateIcon = (tabConfig, customConfig) => {
  if (tabConfig.type === 'custom') {
    return customConfig?.icon || 'Star';
  }
  // 從 templateId 推斷圖示（簡化版）
  const iconMap = {
    'critical_alerts': 'Warning',
    'medication_risks': 'Medication',
    'abnormal_labs': 'Science',
    'imaging_findings': 'ImageSearch',
    'renal_medication': 'Vaccines',
    'diabetes_management': 'MonitorHeart',
    'comprehensive_summary': 'Summarize'
  };
  return iconMap[tabConfig.templateId] || 'Star';
};