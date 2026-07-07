import { NODE_TO_DATA_TYPE } from './permissionMap.js';

// 特殊資料型別（健檢/癌篩/hbcv）對應的 chrome.storage.sync 設定 key，
// 供 legacyContent.js 呼叫端組出 chrome.storage.sync.get 的查詢物件。
export const SPECIAL_DATA_TYPE_SETTING_KEYS = {
  adultHealthCheck: 'fetchAdultHealthCheck',
  cancerScreening: 'fetchCancerScreening',
  hbcvdata: 'fetchHbcvdata',
};

/**
 * 依權限節點陣列計算已授權的資料型別集合。
 * @param {string[]} permissions - getPermissions() 回傳的權限節點陣列
 * @returns {Set<string>} 已授權的資料型別（永遠包含 'chronicMed'）
 */
export function getAuthorizedDataTypes(permissions) {
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

/**
 * 依傳入的 cloud 設定物件判斷是否應抓取指定的特殊資料型別。
 * 非特殊型別（不在 SPECIAL_DATA_TYPE_SETTING_KEYS 中）恆回傳 true。
 * @param {string} dataType
 * @param {object} cloudSettings - 已解析出的 cloud 設定物件（key 為 SPECIAL_DATA_TYPE_SETTING_KEYS 對應值）
 * @param {boolean} [devFetchAll=false] - 開發者「完整抓取模式」;為 true 時無視 cloudSettings 一律抓取
 * @returns {boolean}
 */
export function shouldFetchSpecialData(dataType, cloudSettings, devFetchAll = false) {
  const key = SPECIAL_DATA_TYPE_SETTING_KEYS[dataType];
  if (!key) return true;          // 非特殊型別恆 true
  if (devFetchAll) return true;   // 完整抓取模式無視雲端開關
  return Boolean(cloudSettings && cloudSettings[key]);
}
