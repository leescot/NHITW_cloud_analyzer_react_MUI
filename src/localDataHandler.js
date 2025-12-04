/**
 * 本地資料處理器
 * 負責處理從本地上傳的 JSON 檔案，並將資料儲存到擴充功能變數中
 */

// 資料狀態追蹤
let localDataStatus = {
  loaded: false,
  source: '',
  dataTypes: []
};

/**
 * 從 Chrome storage 加載自定義格式設定
 * @returns {Promise<Object>} - 格式設定
 */
async function loadCustomFormatSettings() {
  return new Promise((resolve) => {
    // 使用預設值映射
    const defaultSettings = {
      enableMedicationCustomCopyFormat: false,
      medicationCopyFormat: "nameWithDosageVertical",
      customMedicationHeaderCopyFormat: [],
      customMedicationDrugCopyFormat: [],
      drugSeparator: ",",
    };

    chrome.storage.sync.get(defaultSettings, (settings) => {
      resolve(settings);
    });
  });
}

/**
 * 觸發資料載入完成事件
 * @param {string} dataType - 資料類型
 */
function triggerDataFetchCompleted(dataType) {
  // 使用 setTimeout 確保變量已完全初始化後再觸發事件
  setTimeout(() => {
    const customEvent = new CustomEvent("dataFetchCompleted", {
      detail: { type: dataType },
    });
    window.dispatchEvent(customEvent);
  }, 100);
}

/**
 * 通知擴充功能資料已載入
 * @param {string} source - 資料來源
 * @param {Array} dataTypes - 已載入的資料類型
 */
function notifyExtensionDataLoaded(source, dataTypes) {
  // 發送訊息給 background script
  chrome.runtime.sendMessage({
    action: "localDataLoaded",
    source: source,
    dataTypes: dataTypes
  });
}

/**
 * 設置全局格式設定
 * @param {Object} settings - 格式設定
 */
function setGlobalMedicationFormatSettings(settings) {
  // console.log("設置全局藥物格式設定:", settings);

  // 創建一個深度複製的全局格式設定
  window.medicationFormatSettings = {};

  // 複製基本設定
  Object.keys(settings).forEach(key => {
    if (!Array.isArray(settings[key])) {
      window.medicationFormatSettings[key] = settings[key];
    } else {
      // 深度複製數組，確保複製完整
      window.medicationFormatSettings[key] = JSON.parse(JSON.stringify(settings[key]));
    }
  });

  // 驗證複製後的數組是否完整
  if (Array.isArray(settings.customMedicationHeaderCopyFormat) &&
    Array.isArray(settings.customMedicationDrugCopyFormat)) {
    // console.log("驗證自定義格式數組設置後:", {
    //   原始標題長度: settings.customMedicationHeaderCopyFormat.length,
    //   複製後標題長度: window.medicationFormatSettings.customMedicationHeaderCopyFormat.length,
    //   原始藥物長度: settings.customMedicationDrugCopyFormat.length,
    //   複製後藥物長度: window.medicationFormatSettings.customMedicationDrugCopyFormat.length
    // });

    // 直接存儲到全局變量，以防其他方式丟失
    window.customMedicationHeaderCopyFormat = JSON.parse(JSON.stringify(settings.customMedicationHeaderCopyFormat));
    window.customMedicationDrugCopyFormat = JSON.parse(JSON.stringify(settings.customMedicationDrugCopyFormat));
  }
}

/**
 * 處理本地 JSON 資料
 * @param {Object} jsonData - 解析後的 JSON 資料
 * @param {string} filename - 檔案名稱
 * @returns {Object} - 處理結果 {success, message, loadedTypes}
 */
export async function processLocalData(jsonData, filename) {
  console.log('開始處理本地 JSON 資料:', filename);

  try {
    // 重置資料類型追蹤
    const loadedTypes = [];

    // 處理使用者資訊（如果存在）
    if (jsonData.userInfo) {
      window.lastInterceptedUserInfo = JSON.parse(JSON.stringify(jsonData.userInfo));
      console.log('已載入使用者資訊:', window.lastInterceptedUserInfo);
    }

    // 預先從 Chrome storage 加載自定義格式設定 (改為同步等待)
    // 這樣能確保處理藥物資料時有正確的格式設定
    if (jsonData.medication) {
      try {
        const settings = await loadCustomFormatSettings();
        console.log('已加載自定義格式設定:', settings);
        setGlobalMedicationFormatSettings(settings);
      } catch (error) {
        console.error('加載自定義格式設定時出錯:', error);
      }
    }

    /**
     * 清理資料，移除 originalData 以節省記憶體
     * @param {Object} data - 原始資料
     * @returns {Object} - 清理後的資料
     */
    const cleanData = (data) => {
      if (!data) return data;

      // 如果資料有 originalData，移除它
      if (data.originalData) {
        const { originalData, ...cleanedData } = data;
        return cleanedData;
      }

      return data;
    };

    // 使用 Map 定義資料類型及其處理邏輯
    const dataTypeHandlers = new Map([
      ['medication', () => {
        window.lastInterceptedMedicationData = cleanData(JSON.parse(JSON.stringify(jsonData.medication)));
        loadedTypes.push('medication');
        triggerDataFetchCompleted('medication');
      }],
      ['lab', () => {
        window.lastInterceptedLabData = cleanData(JSON.parse(JSON.stringify(jsonData.lab)));
        loadedTypes.push('labData');
        triggerDataFetchCompleted('lab');
      }],
      ['chinesemed', () => {
        window.lastInterceptedChineseMedData = cleanData(JSON.parse(JSON.stringify(jsonData.chinesemed)));
        loadedTypes.push('chineseMed');
        triggerDataFetchCompleted('chinesemed');
      }],
      ['imaging', () => {
        window.lastInterceptedImagingData = cleanData(JSON.parse(JSON.stringify(jsonData.imaging)));
        loadedTypes.push('imaging');
        triggerDataFetchCompleted('imaging');
      }],
      ['allergy', () => {
        window.lastInterceptedAllergyData = cleanData(JSON.parse(JSON.stringify(jsonData.allergy)));
        loadedTypes.push('allergy');
        triggerDataFetchCompleted('allergy');
      }],
      ['surgery', () => {
        window.lastInterceptedSurgeryData = cleanData(JSON.parse(JSON.stringify(jsonData.surgery)));
        loadedTypes.push('surgery');
        triggerDataFetchCompleted('surgery');
      }],
      ['discharge', () => {
        window.lastInterceptedDischargeData = cleanData(JSON.parse(JSON.stringify(jsonData.discharge)));
        loadedTypes.push('discharge');
        triggerDataFetchCompleted('discharge');
      }],
      ['medDays', () => {
        window.lastInterceptedMedDaysData = cleanData(JSON.parse(JSON.stringify(jsonData.medDays)));
        loadedTypes.push('medDays');
        triggerDataFetchCompleted('medDays');
      }],
      ['patientSummary', () => {
        window.lastInterceptedPatientSummaryData = cleanData(JSON.parse(JSON.stringify(jsonData.patientSummary)));
        loadedTypes.push('patientSummary');
        triggerDataFetchCompleted('patientSummary');
      }],
      ['adultHealthCheck', () => {
        window.lastInterceptedAdultHealthCheckData = cleanData(JSON.parse(JSON.stringify(jsonData.adultHealthCheck)));
        loadedTypes.push('adultHealthCheck');
        triggerDataFetchCompleted('adultHealthCheck');
      }],
      ['cancerScreening', () => {
        window.lastInterceptedCancerScreeningData = cleanData(JSON.parse(JSON.stringify(jsonData.cancerScreening)));
        loadedTypes.push('cancerScreening');
        triggerDataFetchCompleted('cancerScreening');
      }],
      ['hbcvdata', () => {
        window.lastInterceptedHbcvdata = cleanData(JSON.parse(JSON.stringify(jsonData.hbcvdata)));
        loadedTypes.push('hbcvdata');
        triggerDataFetchCompleted('hbcvdata');
      }]
    ]);

    // 檢查並處理每種資料類型
    for (const [dataType, handler] of dataTypeHandlers.entries()) {
      if (jsonData[dataType]) {
        handler();
      }
    }

    // 更新資料狀態
    if (loadedTypes.length > 0) {
      localDataStatus = {
        loaded: true,
        source: filename,
        dataTypes: loadedTypes
      };

      // 通知擴充功能資料已載入
      notifyExtensionDataLoaded(filename, loadedTypes);

      // 直接保存到 localStorage 並廣播資料
      try {
        // console.log('將資料保存到 localStorage ...');

        // 先將數據保存到 localStorage
        const dataToShare = {
          userInfo: window.lastInterceptedUserInfo, // 加入使用者資訊
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
          adultHealthCheck: window.lastInterceptedAdultHealthCheckData,
          cancerScreening: window.lastInterceptedCancerScreeningData,
          hbcvdata: window.lastInterceptedHbcvdata,
          rehabilitation: window.lastInterceptedRehabilitationData,
          acupuncture: window.lastInterceptedAcupunctureData,
          specialChineseMedCare: window.lastInterceptedSpecialChineseMedCareData,
          timestamp: Date.now()
        };

        // 保存到 localStorage
        localStorage.setItem('NHITW_DATA', JSON.stringify(dataToShare));
        // console.log('數據已保存到 localStorage');

        // 觸發 storage 事件，便於其他擴充功能監聽
        window.dispatchEvent(new Event('storage'));

        // 如果有廣播函數，也調用它以保持兼容性
        // if (typeof broadcastDataToOtherExtensions === 'function') {
        //   broadcastDataToOtherExtensions();
        // } else if (typeof window.broadcastDataToOtherExtensions === 'function') {
        //   window.broadcastDataToOtherExtensions();
        // } else {
        //   // 直接發送自定義事件
        //   const event = new CustomEvent('NHITW_DATA_UPDATED', { detail: dataToShare });
        //   document.dispatchEvent(event);
        //   console.log('直接發送自定義事件完成');
        // }
      } catch (error) {
        // console.error('保存資料到 localStorage 或廣播時發生錯誤:', error);
      }

      return {
        success: true,
        message: `成功載入 ${loadedTypes.length} 種資料`,
        loadedTypes: loadedTypes
      };
    } else {
      return {
        success: false,
        message: '沒有找到可識別的資料類型',
        loadedTypes: []
      };
    }
  } catch (error) {
    console.error('處理本地 JSON 資料時出錯:', error);
    return {
      success: false,
      message: `處理資料時出錯: ${error.message}`,
      error: error
    };
  }
}

/**
 * 清除所有本地資料
 * @returns {Object} - 處理結果 {success, message}
 */
export function clearLocalData() {
  try {
    // 定義需要清除的全局變數映射
    const globalVarsToReset = new Map([
      ['lastInterceptedUserInfo', null],
      ['lastInterceptedMedicationData', null],
      ['lastInterceptedLabData', null],
      ['lastInterceptedChineseMedData', null],
      ['lastInterceptedImagingData', null],
      ['lastInterceptedAllergyData', null],
      ['lastInterceptedSurgeryData', null],
      ['lastInterceptedDischargeData', null],
      ['lastInterceptedMedDaysData', null],
      ['lastInterceptedPatientSummaryData', null],
      ['lastInterceptedAdultHealthCheckData', null],
      ['lastInterceptedCancerScreeningData', null],
      ['lastInterceptedHbcvdata', null],
      ['lastProcessedMedicationData', null]
    ]);

    // 清除所有全局變數
    for (const [varName, defaultValue] of globalVarsToReset.entries()) {
      window[varName] = defaultValue;
    }

    // 重置狀態
    localDataStatus = {
      loaded: false,
      source: '',
      dataTypes: []
    };

    // 發送清除完成消息
    chrome.runtime.sendMessage({
      action: "localDataCleared"
    });

    // 觸發清除事件
    window.dispatchEvent(new CustomEvent("localDataCleared"));

    return {
      success: true,
      message: '已清除所有本地資料'
    };
  } catch (error) {
    console.error('清除本地資料時出錯:', error);
    return {
      success: false,
      message: `清除資料時出錯: ${error.message}`
    };
  }
}

/**
 * 獲取本地資料狀態
 * @returns {Object} - 本地資料狀態
 */
export function getLocalDataStatus() {
  return { ...localDataStatus };
}

// 匯出本地資料處理器
export const localDataHandler = {
  // 處理本地資料
  async processLocalData(data, filename) {
    // 初始化狀態對象
    const localDataStatus = {
      success: false,
      message: "",
      loadedTypes: []
    };

    if (!data) {
      localDataStatus.message = "未提供資料";
      return localDataStatus;
    }

    console.log(`開始處理本地 JSON 資料: ${filename}`);

    try {
      // 加載自定義格式設定
      try {
        const settings = await loadCustomFormatSettings();
        console.log('已加載自定義格式設定:', settings);
        setGlobalMedicationFormatSettings(settings);
      } catch (error) {
        console.error('加載自定義格式設定時出錯:', error);
      }

      // 根據結構和檔名處理不同資料類型
      await this.processJsonData(data, localDataStatus, filename);
    } catch (error) {
      console.error("處理 JSON 資料時出錯:", error);
      localDataStatus.message = `錯誤: ${error.message}`;
    }

    // 返回結果
    return localDataStatus;
  },

  // 處理 JSON 資料
  async processJsonData(data, localDataStatus, filename) {
    try {
      const dataType = this.detectDataType(data, filename);
      // console.log("檢測到資料類型:", dataType);

      if (dataType === "unknown") {
        localDataStatus.message = "無法識別的資料格式";
        return localDataStatus;
      }

      // 使用 Map 存儲不同資料類型的處理邏輯
      const dataProcessors = new Map([
        ["medication", async () => {
          const medicationProcessor = (await import("./utils/medicationProcessor.js")).default;
          window.lastInterceptedMedicationData = data;
          const processedData = await medicationProcessor.processMedicationData(data);
          window.lastProcessedMedicationData = processedData;
          localDataStatus.loadedTypes.push("medication");
        }],
        ["lab", () => {
          window.lastInterceptedLabData = data;
          localDataStatus.loadedTypes.push("lab");
        }]
        // 其他資料類型的處理可以在這裡添加
      ]);

      // 執行對應的處理邏輯
      const processor = dataProcessors.get(dataType);
      if (processor) {
        await processor();
      }

      // 更新處理狀態
      localDataStatus.success = true;
      localDataStatus.message = `成功載入 ${localDataStatus.loadedTypes.length} 種資料`;

    } catch (error) {
      console.error("檢測資料類型時出錯:", error);
      localDataStatus.message = `檢測資料類型時出錯: ${error.message}`;
    }

    return localDataStatus;
  },

  // 檢測資料類型
  detectDataType(data, filename) {
    // 檔名到資料類型的映射
    const filenamePatterns = new Map([
      [/藥|med/i, "medication"],
      [/檢驗|lab/i, "lab"]
      // 可以添加更多檔名模式
    ]);

    // 從檔名判斷
    if (filename) {
      const lowerFilename = filename.toLowerCase();

      for (const [pattern, type] of filenamePatterns.entries()) {
        if (pattern.test(lowerFilename)) {
          return type;
        }
      }
    }

    // 欄位特徵到資料類型的映射
    const fieldPatterns = new Map([
      [["MED_DESC", "MED_ITEM", "drug_ename", "DRUG_CODE"], "medication"],
      [["LAB_NAME", "lab_item", "LAB_RESULT"], "lab"]
      // 可以添加更多欄位特徵
    ]);

    // 從資料結構判斷
    if (data.rObject && Array.isArray(data.rObject) && data.rObject.length > 0) {
      const firstRecord = data.rObject[0];

      for (const [fields, type] of fieldPatterns.entries()) {
        if (fields.some(field => firstRecord[field])) {
          return type;
        }
      }
    }

    return "unknown";
  },

  // 清除本地資料
  clearLocalData() {
    return clearLocalData();
  },

  // 獲取本地資料狀態
  getLocalDataStatus() {
    return getLocalDataStatus();
  }
};

export default localDataHandler;