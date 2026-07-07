// dataStore.js
// 醫療資料的單一真實來源,取代 window.lastIntercepted* 全域變數。
// 語意刻意對齊舊 window 變數行為:
//   - DATA_TYPES 內的型別初始化為 null(舊變數宣告時 = null)
//   - 未知型別回傳 undefined(舊的未宣告變數),JSON.stringify 時會被省略
// React 端目前仍以 dataFetchCompleted 事件驅動;subscribe 供階段 4 整合用。
// getData 回傳的是同一參考(非拷貝)——消費端不可就地修改取得的資料。
// clearAll 對每個型別逐一 notify(維持與 setData 一致的訂閱契約):
// 規畫中的階段 4 訂閱者是依型別過濾的 hook,且 React 18+ 自動批次
// 會把同一 tick 的多次通知合併為一次 render,不會造成 15 次 re-render。

import { DEV_KEYS } from '../dataTypes/registry.js';

export const DATA_TYPES = [
  'medication', 'labdata', 'labdraw', 'chinesemed', 'imaging',
  'allergy', 'surgery', 'discharge', 'medDays', 'patientsummary',
  'adultHealthCheck', 'cancerScreening', 'hbcvdata', 'chronicMed',
  'masterMenu',
  // JWT 授權清單(非 apiPath 型別,由 fetchAllDataTypes 寫入;值 { nodes, dataTypes })
  'permission',
  // 開發者補抓型別(devFetchAll 才抓);由 src/dataTypes/ 描述檔衍生。
  ...DEV_KEYS,
];

const createInitialMap = () => new Map(DATA_TYPES.map(type => [type, null]));

let store = createInitialMap();
const listeners = new Set();

const notify = (type, data) => {
  for (const listener of listeners) {
    try {
      listener(type, data);
    } catch (e) {
      console.error('[dataStore] listener 執行錯誤:', e);
    }
  }
};

export const dataStore = {
  setData(type, data) {
    if (!DATA_TYPES.includes(type)) {
      console.warn(`[dataStore] 未知的資料型別:${type}(仍會儲存,但 clearAll 時不會收到重設通知)`);
    }
    store.set(type, data);
    notify(type, data);
  },

  getData(type) {
    return store.get(type);
  },

  clearAll() {
    store = createInitialMap();
    for (const type of DATA_TYPES) {
      notify(type, null);
    }
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
