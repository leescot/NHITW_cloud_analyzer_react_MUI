// tabIds.js — 主對話框 tab 的穩定字串 id(單一來源)
// DOC/07 方向三:跨元件一律用 id 定位 tab,禁止數字 index——
// 插入/移除/重排 tab 不會使其他 tab 位移,也不會有魔術數字。
// Overview 不是 Tab:tabValue === false 代表未選任何 tab(顯示總覽)。
export const TAB = {
  medication: 'medication',           // 西藥清單
  medicationTable: 'medicationTable', // 西藥表格檢視
  chineseMed: 'chineseMed',           // 中藥
  lab: 'lab',                         // 檢驗
  labTable: 'labTable',               // 檢驗表格檢視
  imaging: 'imaging',                 // 影像
  medDays: 'medDays',                 // 餘藥
  help: 'help',                       // 說明
  advanced: 'advanced',               // 進階(自訂複製格式,條件顯示)
};
