// src/dataTypes/coreTypes.js
// 14 個舊(核心)資料型別的單一描述來源(DOC/07 方向一)。
// 由 registry.js 衍生各接點需要的片段(API_PATH_MAP / NODE_TO_DATA_TYPE /
// TYPE_SHAPE / DATA_TYPES / 抓取分流 / NHITW_DATA / 本地匯入)。
// 遷移中:尚未搬入的型別仍在各檔手寫登記(見 plans/2026-07-07-core-types-registry-migration.md)。
//
// 欄位:
//   key             store key,全系統唯一,照舊不改名(2026-07-07 選項 A 決策)
//   node            NHI masterMenu prsnAuth 授權節點
//   apiPath         API 路徑
//   shape           responseNormalizer 形狀;省略 = 'rows'
//   exportKey       NHITW_DATA/下載 JSON/本地匯入的對外 key;省略 = 與 key 相同。
//                   僅 labdata→'lab'、patientsummary→'patientSummary',不再新增別名。
//   fetchGroup      'special' = 走 specialPromises 分流;省略 = regular 批次
//   cloudSettingKey 特殊型別的 chrome.storage.sync 開關 key;省略 = 恆抓
//
// ⚠️ 陣列順序 = NHITW_DATA key 順序(masterMenu 插在 patientsummary 後)
//    = 下載 JSON key 順序 = DATA_TYPES 順序。不可任意重排。
// masterMenu / permission 為無 apiPath 的偽型別,不在此登記(維持手寫)。

export const CORE_DATA_TYPES = [
  { key: 'medication', node: '2.1', apiPath: 'imue0008/imue0008s02/get-data' },
  { key: 'labdata', node: '6.1', apiPath: 'imue0060/imue0060s02/get-data', exportKey: 'lab' },
  { key: 'labdraw', node: '6.1', apiPath: 'imue0060/imue0060s03/get-data', shape: 'dataAsRows', fetchGroup: 'special' },
  { key: 'chinesemed', node: '3.1', apiPath: 'imue0090/imue0090s02/get-data' },
  { key: 'imaging', node: '6.2', apiPath: 'imue0130/imue0130s02/get-data' },
  { key: 'allergy', node: '5.1', apiPath: 'imue0040/imue0040s02/get-data' },
  { key: 'surgery', node: '7.1', apiPath: 'imue0020/imue0020s02/get-data' },
];
