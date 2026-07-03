// logger.js
// 統一的 debug 輸出。預設靜默;在 console 執行
// localStorage.setItem('nhitw_debug', '1') 後重新整理即可開啟現場除錯。
// console.error / console.warn 不經過此模組,照常直接使用。
//
// 注意:flag 是以 localStorage 儲存,而擴充功能有三個各自獨立 storage 的執行環境:
// content script(NHI 頁面的 localStorage)、popup(chrome-extension:// origin 的
// localStorage,需另外在該頁面 console 設定)、background service worker(沒有
// localStorage,debugLog 永遠靜默)。在某一個 context 開啟 flag 不會影響其他 context。
//
// 效能注意:debugLog(...args) 的引數在呼叫前就會求值(JS 呼叫慣例),即使
// debug 未開啟也一樣;不要在呼叫處直接塞入昂貴運算(例如 JSON.stringify 大物件),
// 需要時請在呼叫端自行以 if 包住再組字串。

let cachedEnabled = null;

const isDebugEnabled = () => {
  if (cachedEnabled === null) {
    try {
      cachedEnabled = globalThis.localStorage?.getItem('nhitw_debug') === '1';
    } catch {
      // service worker 等無 localStorage 的環境
      cachedEnabled = false;
    }
  }
  return cachedEnabled;
};

// 僅供測試使用,應用程式碼不得呼叫:重設快取
export const _resetDebugCache = () => {
  cachedEnabled = null;
};

export const debugLog = (...args) => {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};
