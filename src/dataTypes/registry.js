// src/dataTypes/registry.js
// 由 coreTypes.js(14 舊型別,遷移中)與 devTypes.js(開發者補抓型別)的描述檔
// 衍生出各既有接點需要的片段。遷移期間,尚未搬入 coreTypes 的舊型別仍在各檔
// 手寫登記,衍生值以「CORE 在前、手寫在後、DEV 最後」的順序併入,維持順序不變。

import { CORE_DATA_TYPES } from './coreTypes';
import { DEV_DATA_TYPES } from './devTypes';

const toKeys = (types) => types.map(t => t.key);
const toApiEntries = (types) => types.map(t => [t.key, t.apiPath]);
// TYPE_SHAPE 併入用:只登記非預設 shape(預設 'rows' 省略)
const toShapeEntries = (types) => types.filter(t => t.shape).map(t => [t.key, t.shape]);
// NODE_TO_DATA_TYPE 併入用:值是「型別陣列」,同節點多型別時 group by node
const toNodeToTypes = (types) => types.reduce((acc, t) => {
  (acc[t.node] ??= []).push(t.key);
  return acc;
}, {});

export const CORE_KEYS = toKeys(CORE_DATA_TYPES);
export const CORE_API_ENTRIES = toApiEntries(CORE_DATA_TYPES);
export const CORE_SHAPE_ENTRIES = toShapeEntries(CORE_DATA_TYPES);
export const CORE_NODE_TO_TYPES = toNodeToTypes(CORE_DATA_TYPES);

export const DEV_KEYS = toKeys(DEV_DATA_TYPES);
export const DEV_API_ENTRIES = toApiEntries(DEV_DATA_TYPES);
export const DEV_SHAPE_ENTRIES = toShapeEntries(DEV_DATA_TYPES);
export const DEV_NODE_TO_TYPES = toNodeToTypes(DEV_DATA_TYPES);

// index.js 抓取分流用:regular 批次 / special 批次(經 shouldFetchSpecialData 閘門)
export const CORE_REGULAR_KEYS = CORE_DATA_TYPES.filter(t => t.fetchGroup !== 'special').map(t => t.key);
export const CORE_SPECIAL_KEYS = CORE_DATA_TYPES.filter(t => t.fetchGroup === 'special').map(t => t.key);
// authorization.js 用:特殊型別 → chrome.storage.sync 開關 key
export const CORE_SETTING_KEYS = Object.fromEntries(
  CORE_DATA_TYPES.filter(t => t.cloudSettingKey).map(t => [t.key, t.cloudSettingKey])
);
