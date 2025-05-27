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
 * 1. 僅修改此處不會影響現有使用者的設定，因為他們的配置已儲存在 Chrome storage 中
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
 * 2. 設定會儲存在 Chrome storage 中的 labChooseCopyItems 欄位
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