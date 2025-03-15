/**
 * 應用程式預設設定
 * 包含所有模組的預設配置選項
 */

// 導入需要的常數和設定
import {
  DEFAULT_ATC5_GROUPS,
  DEFAULT_ATC5_COLOR_GROUPS,
} from "./medicationGroups";
import { DEFAULT_LAB_TESTS } from "./labTests";
import { DEFAULT_IMAGE_TESTS } from "./imageTests";

// 整合預設設定
export const DEFAULT_SETTINGS = {
  // 西藥設定
  western: {
    simplifyMedicineName: true,
    showGenericName: false,
    showDiagnosis: true,
    showATC5Name: false,
    copyFormat: "nameWithDosageVertical",
  },

  // ATC5 藥物分類設定
  atc5: {
    enableColors: true,
    groups: DEFAULT_ATC5_GROUPS,
    colorGroups: DEFAULT_ATC5_COLOR_GROUPS,
  },

  // 中藥設定
  chinese: {
    showDiagnosis: false,
    showEffectName: false,
    copyFormat: "nameWithDosageVertical",
  },

  // 檢驗資料設定
  lab: {
    displayFormat: "byType",
    showUnit: false,
    showReference: false,
    enableAbbrev: true,
    highlightAbnormal: true,
    copyFormat: "horizontal",
  },

  // 總覽頁面設定
  overview: {
    medicationTrackingDays: 100,
    labTrackingDays: 180,
    imageTrackingDays: 180,
    focusedLabTests: DEFAULT_LAB_TESTS,
    focusedImageTests: DEFAULT_IMAGE_TESTS,
  },

  // 一般顯示設定
  general: {
    autoOpenPage: false,
    titleTextSize: "small",
    contentTextSize: "small",
    noteTextSize: "small",
    floatingIconPosition: "middle-right",
    alwaysOpenOverviewTab: true,
    useColorfulTabs: true,
  },
};
