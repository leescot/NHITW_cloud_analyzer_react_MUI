// nhitwExport.js
// NHITW_DATA localStorage 匯出:供同頁面的其他 chrome extension 交換資料使用。
// ⚠️ 這是對外契約。2026-07-02 起兩條寫入路徑(主動抓取/本地匯入)統一為此單一格式;
//    變更 key 名稱或語意前,必須同步調整所有消費端 extension。
// 格式:timestamp 最前;labdata 對外改名 lab;patientSummary 駝峰;
//      未載入的型別輸出 null;truncated 最後(快照完整性標記)。
import { dataStore } from './dataStore';
import { debugLog } from '../utils/logger';

// 大小警告門檻(估算 bytes)。Chrome localStorage 每 origin 約 5MB(UTF-16 計價),
// 超過此值代表逼近寫入失敗風險,提前經 debugLog 告警。只警告不截斷——
// 截斷策略涉及臨床資料取捨,尚未定案(見 DOC/04 技術債 #4)。
export const NHITW_DATA_WARN_BYTES = 4 * 1024 * 1024;

// JS 字串以 UTF-16 儲存,localStorage quota 也以 UTF-16 計,每 code unit 估 2 bytes。
const estimateBytes = (json) => json.length * 2;

export const buildShareData = (timestamp = Date.now()) => {
  return {
    timestamp,
    medication: dataStore.getData('medication'),
    lab: dataStore.getData('labdata'),
    labdraw: dataStore.getData('labdraw'),
    chinesemed: dataStore.getData('chinesemed'),
    imaging: dataStore.getData('imaging'),
    allergy: dataStore.getData('allergy'),
    surgery: dataStore.getData('surgery'),
    discharge: dataStore.getData('discharge'),
    medDays: dataStore.getData('medDays'),
    patientSummary: dataStore.getData('patientsummary'),
    masterMenu: dataStore.getData('masterMenu'),
    adultHealthCheck: dataStore.getData('adultHealthCheck'),
    cancerScreening: dataStore.getData('cancerScreening'),
    hbcvdata: dataStore.getData('hbcvdata'),
    chronicMed: dataStore.getData('chronicMed'),
    // 對外契約新增欄位(2026-07-05):快照是否因大小限制被截斷。
    // 截斷策略未實作,目前恆為 false;實作後由截斷邏輯設 true。
    truncated: false,
  };
};

/**
 * 寫入 localStorage 並發出 storage 事件通知其他 extension。
 * 寫入前量測序列化大小,超過 NHITW_DATA_WARN_BYTES 經 debugLog 告警(不阻擋寫入)。
 * 失敗時 console.error 後靜默(對齊原行為,不可讓分享失敗中斷主流程)。
 */
export const writeShareDataToLocalStorage = (shareData) => {
  const json = JSON.stringify(shareData);
  const sizeBytes = estimateBytes(json);
  if (sizeBytes > NHITW_DATA_WARN_BYTES) {
    debugLog(
      `NHITW_DATA 大小警告:估算 ${sizeBytes} bytes,超過門檻 ${NHITW_DATA_WARN_BYTES} bytes,逼近瀏覽器 localStorage 上限,寫入可能失敗`
    );
  }
  try {
    localStorage.setItem('NHITW_DATA', json);
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error(`保存資料到 localStorage 時出錯(估算 ${sizeBytes} bytes):`, error);
  }
};
