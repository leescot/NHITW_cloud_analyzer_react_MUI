// responseNormalizer.js — API 回應形狀正規化(統一為 { rObject: [...] })
// 宣告式 shape 對照(DOC/07 方向一 responseShape 的前身):
// 新型別回應形狀特殊時,在 TYPE_SHAPE 加一行對照,不再累積 if-else 分支
// (2026-07-05,DOC/07 地雷 #4)。

import { DEV_SHAPE_ENTRIES } from '../dataTypes/registry.js';

// 各形狀的正規化函數:(data, recordsArray) => { rObject: [...] }
// - data:原始回應;recordsArray:data.rObject ?? data.robject(大小寫相容)
const SHAPE_NORMALIZERS = {
  // 預設:rObject 本身是列陣列;非陣列一律收斂為空陣列
  rows: (data, recordsArray) => ({ rObject: Array.isArray(recordsArray) ? recordsArray : [] }),
  // rObject 可能是陣列或單一物件;單一物件包成一元素陣列(patientsummary)
  rowsOrSingle: (data, recordsArray) => ({
    rObject: Array.isArray(recordsArray) ? recordsArray : (recordsArray ? [recordsArray] : []),
  }),
  // 回應本體就是列陣列;非陣列包成一元素陣列(medDays / labdraw)
  dataAsRows: (data) => ({ rObject: Array.isArray(data) ? data : [data] }),
  // 回應本體整包視為單一元素(chronicMed 的 { chrDataN, chrDataY })
  dataAsSingle: (data) => ({ rObject: [data] }),
  // rObject 是單一紀錄(物件或陣列皆然),整個包成一元素;缺值為空陣列
  // (adultHealthCheck / cancerScreening / hbcvdata)
  recordAsSingle: (data, recordsArray) => ({ rObject: recordsArray ? [recordsArray] : [] }),
};

// 形狀特殊的型別對照;未列出的型別走預設 'rows'
const TYPE_SHAPE = new Map([
  ['medDays', 'dataAsRows'],
  ['labdraw', 'dataAsRows'],
  ['patientsummary', 'rowsOrSingle'],
  ['chronicMed', 'dataAsSingle'],
  ['adultHealthCheck', 'recordAsSingle'],
  ['cancerScreening', 'recordAsSingle'],
  ['hbcvdata', 'recordAsSingle'],
  // 開發者補抓型別的非預設形狀(特殊給付限制三分表→recordAsSingle、
  // 各彙總副表裸陣列→dataAsRows);由 src/dataTypes/ 描述檔衍生。
  ...DEV_SHAPE_ENTRIES,
]);

export function normalizeResponseData(data, dataType) {
  const recordsArray = data.rObject || data.robject;
  const shape = TYPE_SHAPE.get(dataType) ?? 'rows';
  return SHAPE_NORMALIZERS[shape](data, recordsArray);
}
