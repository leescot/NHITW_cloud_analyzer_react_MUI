// src/dataTypes/registry.js
// 由 devTypes.js 的描述檔衍生出各既有接點需要的片段。既有接點以「附加」方式
// 併入這些衍生值,不改動 14 個舊型別的原分散登記(見 spec v2 §5)。

import { DEV_DATA_TYPES } from './devTypes';

// dataStore.DATA_TYPES 需含的新型別 key
export const DEV_KEYS = DEV_DATA_TYPES.map(t => t.key);

// apiPathMap.js 的 API_PATH_MAP 併入用:[key, apiPath] 條目
export const DEV_API_ENTRIES = DEV_DATA_TYPES.map(t => [t.key, t.apiPath]);

// responseNormalizer.js 的 TYPE_SHAPE 併入用:只登記非預設 shape(預設 'rows' 省略)
export const DEV_SHAPE_ENTRIES = DEV_DATA_TYPES
  .filter(t => t.shape)
  .map(t => [t.key, t.shape]);

// permissionMap.js 的 NODE_TO_DATA_TYPE 併入用。NODE_TO_DATA_TYPE 的值是「型別陣列」
// (如 '6.1': ['labdata','labdraw']);2.2/3.3/9.1 各對兩型別(明細+彙總),
// 故先 group by node,值收成陣列。
export const DEV_NODE_TO_TYPES = DEV_DATA_TYPES.reduce((acc, t) => {
  (acc[t.node] ??= []).push(t.key);
  return acc;
}, {});
