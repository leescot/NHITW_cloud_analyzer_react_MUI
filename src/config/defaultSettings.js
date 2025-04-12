/**
 * 應用程式預設設定
 * 包含所有模組的預設配置選項
 */

// 導入需要的常數和設定
import {
  DEFAULT_ATC5_GROUPS,
  DEFAULT_ATC5_COLOR_GROUPS,
} from "./medicationGroups";
import { DEFAULT_LAB_TESTS, DEFAULT_LAB_COPY_ITEMS } from "./labTests";
import { DEFAULT_IMAGE_TESTS } from "./imageTests";

// 整合預設設定
export const DEFAULT_SETTINGS = {
  // 西藥設定
  western: {
    simplifyMedicineName: true,
    showGenericName: false,
    showDiagnosis: true,
    showATC5Name: false,
    medicationCopyFormat: 'nameWithDosageVertical',
    separateShortTermMeds: true,
    showExternalDrugImage: false,
    enableMedicationCustomCopyFormat: false,
    enableMedicationCopyAll: false,
    drugSeparator: ',',
    customMedicationHeaderCopyFormat: [
      { id: 'date_default', display: '日期', group: 'header', section: 'header' },
      { id: 'header_text_default', value: ' - ', display: ' - ', group: 'format', section: 'header' },
      { id: 'hosp_default', display: '醫院', group: 'header', section: 'header' },
      { id: 'header_space_default', display: '(空格)', value: ' ', group: 'format', section: 'header' },
      { id: 'header_text_default2', value: '[', display: '[', group: 'format', section: 'header' },
      { id: 'icdcode_default', display: 'ICD代碼', group: 'header', section: 'header' },
      { id: 'header_space_default2', display: '(空格)', value: ' ', group: 'format', section: 'header' },
      { id: 'icdname_default', display: 'ICD名稱', group: 'header', section: 'header' },
      { id: 'header_text_default3', value: ']', display: ']', group: 'format', section: 'header' }
    ],
    customMedicationDrugCopyFormat: [
      { id: 'simplifiedname_default', display: '簡化藥名', group: 'medication', section: 'drug' },
      { id: 'drug_space_default', display: '(空格)', value: ' ', group: 'format', section: 'drug' },
      { id: 'perDosage_default', display: '單次劑量', group: 'dosage', section: 'drug' },
      { id: 'drug_text_default', value: '#', display: '#', group: 'format', section: 'drug' },
      { id: 'drug_space_default2', display: '(空格)', value: ' ', group: 'format', section: 'drug' },
      { id: 'frequency_default', display: '頻次', group: 'dosage', section: 'drug' },
      { id: 'drug_space_default3', display: '(空格)', value: ' ', group: 'format', section: 'drug' },
      { id: 'days_default', display: '天數', group: 'dosage', section: 'drug' },
      { id: 'drug_text_default2', value: '天', display: '天', group: 'format', section: 'drug' }
    ]
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
    doseFormat: "perDay",
    copyFormat: "nameWithDosageVertical",
  },

  // 檢驗資料設定
  lab: {
    displayLabFormat: "byType",
    showUnit: false,
    showReference: false,
    enableLabAbbrev: true,
    highlightAbnormal: true,
    copyLabFormat: "horizontal",
    enableLabChooseCopy: false,
    labChooseCopyItems: DEFAULT_LAB_COPY_ITEMS,
    enableLabCustomCopyFormat: false,
    itemSeparator: ',',
    customLabHeaderCopyFormat: [
      { id: 'date_default', display: '日期', group: 'header', section: 'labheader' },
      { id: 'header_text_default', value: ' - ', display: ' - ', group: 'format', section: 'labheader' },
      { id: 'hosp_default', display: '醫院', group: 'header', section: 'labheader' },
      { id: 'header_space_default', display: '(空格)', value: ' ', group: 'format', section: 'labheader' },
    ],
    customLabItemCopyFormat: [
      { id: 'itemName_default', display: '檢驗名稱', group: 'lab', section: 'labcontent' },
      { id: 'lab_space_default', display: '(空格)', value: ' ', group: 'format', section: 'labcontent' },
      { id: 'value_default', display: '數值', group: 'lab', section: 'labcontent' },
      { id: 'lab_space_default2', display: '(空格)', value: ' ', group: 'format', section: 'labcontent' },
      { id: 'unit_default', display: '單位', group: 'lab', section: 'labcontent' },
      { id: 'consultValue_default', display: '參考值', group: 'lab', section: 'labcontent' }
    ]
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
