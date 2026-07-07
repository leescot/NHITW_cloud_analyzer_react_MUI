/**
 * 檢驗項目預設設定
 *
 * 此檔案定義了應用中使用的預設檢驗項目列表
 *
 * 每個項目的格式:
 * - orderCode: 檢驗的代碼 (例如: 09015C)
 * - displayName: 在界面上顯示的名稱
 * - enabled: 是否預設啟用此項目
 *
 * 注意:
 * 1. 僅修改此處不會影響現有使用者的設定，因為他們的配置已存儲在 Chrome storage 中
 * 2. 若要更新所有使用者的設定，需要實現版本升級機制
 * 3. 新增或修改項目時，確保 orderCode 的唯一性
 *
 * 顯示格式選項:
 * - vertical: 垂直單欄顯示
 * - twoColumn: 雙欄顯示
 * - threeColumn: 三欄顯示
 * - fourColumn: 四欄顯示
 * - byType: 依檢驗類型分組顯示
 */
export const DEFAULT_LAB_TESTS = [
  { orderCode: '08011C-WBC', displayName: 'WBC', enabled: false },
  { orderCode: '08011C-Hb', displayName: 'Hb', enabled: true },
  { orderCode: '08011C-Platelet', displayName: 'Platelet', enabled: false },
  { orderCode: '09002C', displayName: 'BUN', enabled: true },
  { orderCode: '09015C', displayName: 'Cr & GFR', enabled: true },
  { orderCode: '09040C', displayName: 'UPCR', enabled: true },
  { orderCode: '12111C', displayName: 'UACR', enabled: true },
  { orderCode: '09038C', displayName: 'Alb', enabled: true },
  { orderCode: '09005C', displayName: 'Glucose', enabled: true },
  { orderCode: '09006C', displayName: 'HbA1c', enabled: true },
  { orderCode: '09001C', displayName: 'Chol', enabled: true },
  { orderCode: '09004C', displayName: 'TG', enabled: true },
  { orderCode: '09043C', displayName: 'HDL', enabled: true },
  { orderCode: '09044C', displayName: 'LDL', enabled: true },
  { orderCode: '09021C', displayName: 'Na', enabled: true },
  { orderCode: '09022C', displayName: 'K', enabled: true },
  { orderCode: '09011C', displayName: 'Ca', enabled: false },
  { orderCode: '09012C', displayName: 'P', enabled: false },
  { orderCode: '09013C', displayName: 'U.A', enabled: true },
  { orderCode: '09025C', displayName: 'GOT', enabled: true },
  { orderCode: '09026C', displayName: 'GPT', enabled: true },
  { orderCode: '09027C', displayName: 'Alk-P', enabled: false },
  { orderCode: '09029C', displayName: 'Bil(T)', enabled: false },
  { orderCode: '09030C', displayName: 'Bil(D)', enabled: false },
  { orderCode: '09031C', displayName: 'r-GT', enabled: false }
];

/**
 * 檢驗項目複製預設設定
 *
 * 此常數定義了當使用者啟用"自訂複製項目功能"時，預設要複製的檢驗項目列表
 *
 * 格式與 DEFAULT_LAB_TESTS 相同:
 * - orderCode: 檢驗的代碼
 * - displayName: 在界面上顯示的名稱
 * - enabled: 是否預設啟用此項目進行複製
 *
 * 注意:
 * 1. 使用者可以透過設定界面自訂要複製的項目
 * 2. 設定會存儲在 Chrome storage 中的 labChooseCopyItems 欄位
 */
export const DEFAULT_LAB_COPY_ITEMS = [
  { orderCode: '08011C-WBC', displayName: 'WBC', enabled: false },
  { orderCode: '08011C-Hb', displayName: 'Hb', enabled: false },
  { orderCode: '08011C-Platelet', displayName: 'Platelet', enabled: false },
  { orderCode: '09002C', displayName: 'BUN', enabled: false },
  { orderCode: '09015C', displayName: 'Cr & GFR', enabled: false },
  { orderCode: '09040C', displayName: 'UPCR', enabled: false },
  { orderCode: '12111C', displayName: 'UACR', enabled: false },
  { orderCode: '09038C', displayName: 'Alb', enabled: false },
  { orderCode: '09005C', displayName: 'Glucose', enabled: false },
  { orderCode: '09006C', displayName: 'HbA1c', enabled: false },
  { orderCode: '09001C', displayName: 'Chol', enabled: false },
  { orderCode: '09004C', displayName: 'TG', enabled: false },
  { orderCode: '09043C', displayName: 'HDL', enabled: false },
  { orderCode: '09044C', displayName: 'LDL', enabled: false },
  { orderCode: '09021C', displayName: 'Na', enabled: false },
  { orderCode: '09022C', displayName: 'K', enabled: false },
  { orderCode: '09011C', displayName: 'Ca', enabled: false },
  { orderCode: '09012C', displayName: 'P', enabled: false },
  { orderCode: '09013C', displayName: 'U.A', enabled: false },
  { orderCode: '09025C', displayName: 'GOT', enabled: false },
  { orderCode: '09026C', displayName: 'GPT', enabled: false },
  { orderCode: '09027C', displayName: 'Alk-P', enabled: false },
  { orderCode: '09029C', displayName: 'Bil(T)', enabled: false },
  { orderCode: '09030C', displayName: 'Bil(D)', enabled: false },
  { orderCode: '09031C', displayName: 'r-GT', enabled: false }
];

/**
 * LAB_FOCUS_SPECIAL_CODES - 需要特殊處理的檢驗代碼(內容同 OverviewSettings 的 SPECIAL_LAB_CODES,Task 10 刪原處)
 * '-' 結尾者為前綴匹配(08011C- 涵蓋 CBC 全部偽代碼子項)。
 */
export const LAB_FOCUS_SPECIAL_CODES = ['09015C', '09040C', '12111C', '08011C-'];

/**
 * LAB_FOCUS_BUILTIN - labFocus 代碼集的內建基底(CodeSet 新模型)
 * 與 DEFAULT_LAB_TESTS 等價(tests/codeSets.test.js 鎖定);使用者自訂存 overlay delta。
 */
export const LAB_FOCUS_BUILTIN = [
  { id: 'wbc',      label: 'WBC',      codes: ['08011C-WBC'],      enabled: false, order: 0 },
  { id: 'hb',       label: 'Hb',       codes: ['08011C-Hb'],       enabled: true,  order: 1 },
  { id: 'platelet', label: 'Platelet', codes: ['08011C-Platelet'], enabled: false, order: 2 },
  { id: 'bun',      label: 'BUN',      codes: ['09002C'],          enabled: true,  order: 3 },
  { id: 'cr-gfr',   label: 'Cr & GFR', codes: ['09015C'],          enabled: true,  order: 4 },
  { id: 'upcr',     label: 'UPCR',     codes: ['09040C'],          enabled: true,  order: 5 },
  { id: 'uacr',     label: 'UACR',     codes: ['12111C'],          enabled: true,  order: 6 },
  { id: 'alb',      label: 'Alb',      codes: ['09038C'],          enabled: true,  order: 7 },
  { id: 'glucose',  label: 'Glucose',  codes: ['09005C'],          enabled: true,  order: 8 },
  { id: 'hba1c',    label: 'HbA1c',    codes: ['09006C'],          enabled: true,  order: 9 },
  { id: 'chol',     label: 'Chol',     codes: ['09001C'],          enabled: true,  order: 10 },
  { id: 'tg',       label: 'TG',       codes: ['09004C'],          enabled: true,  order: 11 },
  { id: 'hdl',      label: 'HDL',      codes: ['09043C'],          enabled: true,  order: 12 },
  { id: 'ldl',      label: 'LDL',      codes: ['09044C'],          enabled: true,  order: 13 },
  { id: 'na',       label: 'Na',       codes: ['09021C'],          enabled: true,  order: 14 },
  { id: 'k',        label: 'K',        codes: ['09022C'],          enabled: true,  order: 15 },
  { id: 'ca',       label: 'Ca',       codes: ['09011C'],          enabled: false, order: 16 },
  { id: 'p',        label: 'P',        codes: ['09012C'],          enabled: false, order: 17 },
  { id: 'ua',       label: 'U.A',      codes: ['09013C'],          enabled: true,  order: 18 },
  { id: 'got',      label: 'GOT',      codes: ['09025C'],          enabled: true,  order: 19 },
  { id: 'gpt',      label: 'GPT',      codes: ['09026C'],          enabled: true,  order: 20 },
  { id: 'alkp',     label: 'Alk-P',    codes: ['09027C'],          enabled: false, order: 21 },
  { id: 'bil-t',    label: 'Bil(T)',   codes: ['09029C'],          enabled: false, order: 22 },
  { id: 'bil-d',    label: 'Bil(D)',   codes: ['09030C'],          enabled: false, order: 23 },
  { id: 'r-gt',     label: 'r-GT',     codes: ['09031C'],          enabled: false, order: 24 },
];