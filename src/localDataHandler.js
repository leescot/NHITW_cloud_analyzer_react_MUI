/**
 * 本地資料處理器
 * 負責處理從本地上傳的 JSON 檔案，並將資料儲存到擴充功能變數中
 */

import { debugLog } from './utils/logger';
import { dataStore } from './store/dataStore';
import { buildShareData, writeShareDataToLocalStorage } from './store/nhitwExport';
import { CORE_DATA_TYPES } from './dataTypes/coreTypes';
import { DEV_KEYS } from './dataTypes/registry';

// 本地 JSON 的 key → store 型別。核心型別由描述檔衍生(exportKey 別名:
// lab→labdata、patientSummary→patientsummary);permission 為偽型別手寫;
// 開發者補抓型別名字已統一,一律 [key, key]。
const LOCAL_KEY_TO_STORE_TYPE = new Map([
  ...CORE_DATA_TYPES.map(t => [t.exportKey ?? t.key, t.key]),
  ['permission', 'permission'],
  ...DEV_KEYS.map(key => [key, key]),
]);

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
 * 處理本地 JSON 資料
 * @param {Object} jsonData - 解析後的 JSON 資料
 * @param {string} filename - 檔案名稱
 * @returns {Object} - 處理結果 {success, message, loadedTypes}
 */
export async function processLocalData(jsonData, filename) {
  debugLog('開始處理本地 JSON 資料:', filename);

  try {
    // 重置資料類型追蹤
    const loadedTypes = [];

    // 藥物自訂複製格式設定一律經參數傳入 medicationProcessor（見
    // dataManager.js / useSettingsState.js），與資料來源（雲端 API 或本地 JSON
    // 匯入）無關，故不需在此預先讀取 chrome.storage 或寫入 window 全域變數。

    // 無效輸入需在清空 store 前擋下，避免壞資料把既有（上一位病患）資料一併清掉
    if (!jsonData || typeof jsonData !== 'object') {
      throw new TypeError('jsonData 必須是物件');
    }

    // 載入本地 JSON = 完整替換：先清空 store，避免上一位病患的資料殘留
    // (新 JSON 缺少的型別不會被覆寫，不清空會張冠李戴——例如前一人的慢箋
    //  會繼續合併進新病患的西藥清單)
    dataStore.clearAll();

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

    const LOADED_TYPE_LABEL = new Map([['lab', 'labData'], ['chinesemed', 'chineseMed']]);

    // 依 LOCAL_KEY_TO_STORE_TYPE 逐一處理 JSON 內存在的資料型別
    for (const [jsonKey, storeType] of LOCAL_KEY_TO_STORE_TYPE.entries()) {
      if (jsonData[jsonKey]) {
        dataStore.setData(storeType, cleanData(JSON.parse(JSON.stringify(jsonData[jsonKey]))));
        loadedTypes.push(LOADED_TYPE_LABEL.get(jsonKey) ?? jsonKey);
        triggerDataFetchCompleted(jsonKey);
      }
    }

    // 讀取 JSON 頂層的使用者資訊（若有），供 FloatingIcon 顯示
    window._localUserInfo = {
      name: jsonData.UserName || '',
      userId: jsonData.UserID || '',
      gender: jsonData.UserSex || '',
      birthday: jsonData.UserBirthday || '',
    };
    // 若 JSON 無任何使用者資訊，填入虛擬資料
    if (!window._localUserInfo.name && !window._localUserInfo.userId) {
      window._localUserInfo.name = '本地資料';
      window._localUserInfo.userId = filename || 'local';
    }

    // 更新資料狀態
    if (loadedTypes.length > 0) {
      // 通知擴充功能資料已載入
      notifyExtensionDataLoaded(filename, loadedTypes);

      // 保存到 localStorage 供其他擴充功能交換資料,並發出 storage 事件
      writeShareDataToLocalStorage(buildShareData());

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
    // 清除 store(真實來源)
    dataStore.clearAll();

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