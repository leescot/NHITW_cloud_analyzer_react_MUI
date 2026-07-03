// nhitwExport.js
// NHITW_DATA localStorage 匯出:供同頁面的其他 chrome extension 交換資料使用。
// ⚠️ 這是對外契約。2026-07-02 起兩條寫入路徑(主動抓取/本地匯入)統一為此單一格式;
//    變更 key 名稱或語意前,必須同步調整所有消費端 extension。
// 格式:timestamp 最前;labdata 對外改名 lab;patientSummary 駝峰;
//      未載入的型別輸出 null。
import { dataStore } from './dataStore';

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
  };
};

/**
 * 寫入 localStorage 並發出 storage 事件通知其他 extension。
 * 失敗時 console.error 後靜默(對齊原行為,不可讓分享失敗中斷主流程)。
 */
export const writeShareDataToLocalStorage = (shareData) => {
  try {
    localStorage.setItem('NHITW_DATA', JSON.stringify(shareData));
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('保存資料到 localStorage 時出錯:', error);
  }
};
