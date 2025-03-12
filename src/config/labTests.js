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