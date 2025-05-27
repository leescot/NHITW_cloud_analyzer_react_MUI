/**
 * 標籤顏色工具函式
 * 用於根據設定和標籤型別生成顏色
 */

// 標籤顏色常數
const TAB_COLORS = {
  default: {
    primary: "#2196f3", // 淺藍色
    primaryDark: "#0d47a1", // 深藍色
    disabled: "#9e9e9e", // 灰色
    disabledDark: "#616161", // 深灰色
  },
  colorful: {
    // FloatingIcon 標籤
    overview: { primary: "#2196f3", dark: "#0d47a1" }, // 藍色
    medication: { primary: "#0d47a1", dark: "#0d47a1" }, // 深藍色
    chineseMed: { primary: "#2e7d32", dark: "#2e7d32" }, // 綠色
    lab: { primary: "#e65100", dark: "#e65100" }, // 橙色
    imaging: { primary: "#4a148c", dark: "#4a148c" }, // 紫色
    medDays: { primary: "#880e4f", dark: "#880e4f" }, // 粉紅色
    help: { primary: "#2196f3", dark: "#0d47a1" }, // 藍色
    settings: { primary: "#607d8b", dark: "#455a64" }, // 藍灰色

    // PopupSettings 標籤 - 各標籤型別使用唯一名稱
    popupSettings: { primary: "#0d47a1", dark: "#0d47a1" }, // 深藍色
    dataStatus: { primary: "#e65100", dark: "#e65100" }, // 橙色
    about: { primary: "#673ab7", dark: "#4a148c" }, // 紫色
    loadData: { primary: "#2e7d32", dark: "#1b5e20" }, // 綠色
    testMode: { primary: "#4a148c", dark: "#4a148c" }, // 紫色

    disabled: "#9e9e9e", // 灰色
    disabledDark: "#616161", // 深灰色
  }
};

/**
 * 擷取標籤顏色
 * @param {Object} generalDisplaySettings - 一般顯示設定
 * @param {string} tabType - 標籤型別
 * @param {boolean} hasData - 是否有數據
 * @returns {string} 顏色代碼
 */
export const getTabColor = (generalDisplaySettings, tabType, hasData = true) => {
  // 使用 Map 定義不同配置下的顏色選擇邏輯
  const colorStrategyMap = new Map([
    // 彩色標籤 + 有數據
    [() => generalDisplaySettings?.useColorfulTabs && hasData, 
     () => tabType && TAB_COLORS.colorful[tabType] 
            ? TAB_COLORS.colorful[tabType].primary 
            : TAB_COLORS.colorful.overview.primary],
    
    // 彩色標籤 + 無數據
    [() => generalDisplaySettings?.useColorfulTabs && !hasData, 
     () => TAB_COLORS.colorful.disabled],
    
    // 默認藍色 + 有數據
    [() => !generalDisplaySettings?.useColorfulTabs && hasData, 
     () => TAB_COLORS.default.primary],
    
    // 默認藍色 + 無數據
    [() => !generalDisplaySettings?.useColorfulTabs && !hasData, 
     () => TAB_COLORS.default.disabled]
  ]);

  // 尋找匹配的策略並應用
  for (const [condition, getColor] of colorStrategyMap) {
    if (condition()) {
      return getColor();
    }
  }

  // 預設回傳值（理論上不會執行到這裡）
  return TAB_COLORS.default.primary;
};

/**
 * 擷取標籤選中顏色
 * @param {Object} generalDisplaySettings - 一般顯示設定
 * @param {string} tabType - 標籤型別
 * @param {boolean} hasData - 是否有數據
 * @returns {string} 顏色代碼
 */
export const getTabSelectedColor = (generalDisplaySettings, tabType, hasData = true) => {
  // 使用 Map 定義不同配置下的顏色選擇邏輯
  const selectedColorStrategyMap = new Map([
    // 彩色標籤 + 有數據
    [() => generalDisplaySettings?.useColorfulTabs && hasData, 
     () => tabType && TAB_COLORS.colorful[tabType] 
            ? TAB_COLORS.colorful[tabType].dark 
            : TAB_COLORS.colorful.overview.dark],
    
    // 彩色標籤 + 無數據
    [() => generalDisplaySettings?.useColorfulTabs && !hasData, 
     () => TAB_COLORS.colorful.disabledDark],
    
    // 默認藍色 + 有數據
    [() => !generalDisplaySettings?.useColorfulTabs && hasData, 
     () => TAB_COLORS.default.primaryDark],
    
    // 默認藍色 + 無數據
    [() => !generalDisplaySettings?.useColorfulTabs && !hasData, 
     () => TAB_COLORS.default.disabledDark]
  ]);

  // 尋找匹配的策略並應用
  for (const [condition, getColor] of selectedColorStrategyMap) {
    if (condition()) {
      return getColor();
    }
  }

  // 預設回傳值（理論上不會執行到這裡）
  return TAB_COLORS.default.primaryDark;
};
