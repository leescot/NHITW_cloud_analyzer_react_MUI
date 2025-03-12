/**
 * 標籤顏色配置
 * 定義標籤在不同模式下的顏色
 */

// 標籤顏色常數
export const TAB_COLORS = {
  default: {
    primary: "#2196f3", // 淺藍色
    primaryDark: "#0d47a1", // 深藍色
    disabled: "#9e9e9e", // 灰色
    disabledDark: "#616161", // 深灰色
  },
  colorful: {
    overview: { primary: "#2196f3", dark: "#0d47a1" }, // 藍色
    medication: { primary: "#0d47a1", dark: "#0d47a1" }, // 深藍色
    chineseMed: { primary: "#2e7d32", dark: "#2e7d32" }, // 綠色
    lab: { primary: "#e65100", dark: "#e65100" }, // 橙色
    imaging: { primary: "#4a148c", dark: "#4a148c" }, // 紫色
    medDays: { primary: "#880e4f", dark: "#880e4f" }, // 粉紅色
    help: { primary: "#2196f3", dark: "#0d47a1" }, // 藍色
    disabled: "#9e9e9e", // 灰色
    disabledDark: "#616161", // 深灰色
  }
};

// 獲取標籤顏色的函數
export const getTabColor = (generalDisplaySettings, tabType, hasData = true) => {
  if (generalDisplaySettings.useColorfulTabs) {
    // 彩色標籤模式
    if (hasData) {
      return tabType ? TAB_COLORS.colorful[tabType].primary : TAB_COLORS.colorful.overview.primary;
    } else {
      return TAB_COLORS.colorful.disabled;
    }
  } else {
    // 默認藍色標籤模式
    if (hasData) {
      return TAB_COLORS.default.primary;
    } else {
      return TAB_COLORS.default.disabled;
    }
  }
};

// 獲取標籤選中顏色的函數
export const getTabSelectedColor = (generalDisplaySettings, tabType, hasData = true) => {
  if (generalDisplaySettings.useColorfulTabs) {
    // 彩色標籤模式
    if (hasData) {
      return tabType ? TAB_COLORS.colorful[tabType].dark : TAB_COLORS.colorful.overview.dark;
    } else {
      return TAB_COLORS.colorful.disabledDark;
    }
  } else {
    // 默認藍色標籤模式
    if (hasData) {
      return TAB_COLORS.default.primaryDark;
    } else {
      return TAB_COLORS.default.disabledDark;
    }
  }
};
