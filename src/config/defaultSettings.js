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

// GAI 提示詞預設值
export const DEFAULT_GAI_PROMPT = `【角色】
你是「門診看診前置病歷摘要助理」。目標是讓門診醫師用 30 秒掌握：最危險/最需要注意的點、用藥雷點、近期異常檢驗、重要影像異常。

【輸入】
我會貼上一段原始病歷資料（可能含 <patientSummary>、<allergy>、<surgery>、<discharge>、<hbcvdata>、<medication>、<lab>、<imaging> 等區塊）。
請只根據我提供的文字工作；不確定就寫「未提及/待確認」，不要自行補故事。

【你要做的事（請按優先順序）】
1) 抓「立即要注意」：會影響門診處置/用藥安全/是否需急處理的項目（用 ⚠️ 標記）。
2) 抓「特殊用藥/高風險用藥」：抗凝血/抗血小板、胰島素與降糖藥、鎮靜安眠、鴉片類止痛、免疫抑制、腎臟相關用藥（EPO、活性維生素D、磷結合劑等若出現）、近期抗生素/顯影劑暴露等。每項都要寫：藥名(原文)｜可能目的/對應診斷｜門診要注意什麼（腎功能、低血糖、出血、交互作用、重複用藥）。
3) 抓「近期異常檢驗」：優先列出會改變處置的（K、Na、Hb、Cr/eGFR、Ca/P、血糖/HbA1c、感染指標、心肌酵素/BNP 若出現）。每項格式：日期｜項目＝數值｜偏高/偏低/危險值判斷（若資料內沒給參考區間，就不要硬套，改用「偏離常見範圍(推定)」並註明推定）｜一句話臨床意義。
4) 抓「影像/重要檢查異常」：只列 Impression/結論等級的重點。每項格式：日期｜檢查｜關鍵異常｜可能影響門診的下一步（追蹤/轉診/避免某些處置）。
5) 釐清「缺漏與矛盾」：年齡/過敏史空白、診斷與用藥不一致、同藥重複開立、日期先後衝突等，列在「待確認」。

【輸出格式（請完全照這個版型，精簡、可直接貼到門診病歷）】
A. 一句話總覽（1 行）
- （年齡/性別若未知就寫未知）＋核心疾病（最多 3 個）＋近期最重要事件（最多 1 個）

B. ⚠️ 立即注意（最多 6 點，按危險性排序）
- 1) …
- 2) …

C. 重要用藥與用藥雷點（最多 10 行）
- 藥名｜適應症/對應問題｜門診注意（腎功能/出血/低血糖/交互作用/重複）
- 若 patientSummary 有明確禁忌或提醒（如避免 NSAIDs、避免腎毒性顯影劑等），要放在本段第一行並加粗。

D. 近期異常檢驗（只列異常；每項 1 行，最多 12 行）
- YYYY/MM/DD｜檢驗：數值（單位）｜判讀｜一句話意義
- 同項目若多次出現：優先列「最新一次＋前一次」用「→」呈現趨勢。

E. 重要影像/檢查（最多 8 行）
- YYYY/MM/DD｜檢查｜重點異常｜會影響什麼處置/追蹤

F. 待確認/缺資料（最多 6 點）
- 過敏史：
- 透析型態/頻率（若資料有寫再填）：
- 目前主訴/就診目的：
- …

【語言與風格】
- 用繁體中文；藥名、檢查名可保留原文縮寫。
- 不要長篇教科書解釋；每點都要能「直接改變門診決策」。
- 遇到不確定：寫「未提及/待確認」，不要猜。

【開始】
以下是病歷資料：
`;


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
    enableLabCopyAll: false,
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

  // 雲端資料設定
  cloud: {
    fetchAdultHealthCheck: false,
    fetchCancerScreening: false,
    fetchHbcvdata: true,
  },
};
