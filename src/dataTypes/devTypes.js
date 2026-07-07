// src/dataTypes/devTypes.js
// 開發者「完整抓取模式」(devFetchAll) 才抓的補抓型別的單一描述來源。
// DOC/07 方向一「資料型別描述檔」的實作:14 個舊(核心)型別已於 2026-07-07
// 遷入 coreTypes.js,不再另外分散登記。由 registry.js 衍生出各既有
// 接點需要的片段(API_PATH_MAP / NODE_TO_DATA_TYPE / TYPE_SHAPE / DATA_TYPES)。
//
// 端點與回應形狀依 DOC/06 與 .test_data/api_data/ 實測樣本定案(2026-07-07 spec v2)。
// key 為 camelCase,全系統唯一名(store / apiPath / 下載 JSON / 本地匯入皆同一字串),
// 不製造別名。shape 省略 = responseNormalizer 預設 'rows'。
//
// 授權節點對照(NHI masterMenu prsnAuth,見 DOC/06):
//   1.3 特殊給付限制 / 2.2 特定管制用藥 / 3.2 針傷治療 / 3.3 特定疾病門診加強照護 /
//   4.1 牙科處置 / 6.5 檢查檢驗紀錄 / 9.1 復健醫療 / 10.1 特材紀錄

export const DEV_DATA_TYPES = [
  { key: 'specialPayment', node: '1.3', apiPath: 'imue0190/imue0190s01/lftp-data', shape: 'recordAsSingle' },
  { key: 'controlledMed', node: '2.2', apiPath: 'imue0009/imue0009s02/get-data' },
  { key: 'controlledMedSummary', node: '2.2', apiPath: 'imue0009/imue0009s03/get-data', shape: 'dataAsRows' },
  { key: 'acupuncture', node: '3.2', apiPath: 'imue0160/imue0160s02/get-data' },
  { key: 'chineseMedCare', node: '3.3', apiPath: 'imue0170/imue0170s02/get-data' },
  { key: 'chineseMedCareSummary', node: '3.3', apiPath: 'imue0170/imue0170s03/get-data', shape: 'dataAsRows' },
  { key: 'dental', node: '4.1', apiPath: 'imue0030/imue0030s02/get-data' },
  { key: 'labRecord', node: '6.5', apiPath: 'imue0010/imue0010s02/get-data' },
  { key: 'rehabilitation', node: '9.1', apiPath: 'imue0080/imue0080s02/get-data' },
  { key: 'rehabilitationSummary', node: '9.1', apiPath: 'imue0080/imue0080s03/get-data', shape: 'dataAsRows' },
  { key: 'specialMaterial', node: '10.1', apiPath: 'imue0200/imue0200s02/get-data' },
];
