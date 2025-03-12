/**
 * 影像檢查預設設定
 * 
 * 此檔案定義了應用中使用的預設影像檢查項目列表
 * 
 * 每個項目的格式:
 * - orderCode: 檢查的代碼 (例如: 33072B)
 * - displayName: 在界面上顯示的名稱
 * - enabled: 是否預設啟用此項目
 * 
 * 注意: 
 * 1. 僅修改此處不會影響現有使用者的設定，因為他們的配置已存儲在 Chrome storage 中
 * 2. 若要更新所有使用者的設定，需要實現版本升級機制
 */
export const DEFAULT_IMAGE_TESTS = [
  { orderCode: '33085B,33084B', displayName: '磁振造影(MRI)', enabled: true },
  { orderCode: '33072B,33070B', displayName: '電腦斷層(CT)', enabled: true },
  { orderCode: '19009C,19001C', displayName: '腹部超音波', enabled: true },
  { orderCode: '19009C', displayName: '其他超音波', enabled: true },
  { orderCode: '18006C', displayName: '心臟超音波', enabled: true },
  { orderCode: '28016C', displayName: '胃鏡', enabled: true },
  { orderCode: '32001C', displayName: 'CXR', enabled: false },
  { orderCode: '18001C', displayName: 'EKG', enabled: false },
]; 