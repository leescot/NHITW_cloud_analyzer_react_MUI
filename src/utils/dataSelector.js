/**
 * Data Selector Utility
 *
 * 根據 Tab 配置選擇性生成醫療資料 XML
 * 支援選擇 9 種資料類型的任意組合
 */

import {
  formatPatientSummary,
  formatAllergy,
  formatSurgery,
  formatDischarge,
  formatHBCV,
  formatMedication,
  formatLab,
  formatChineseMed,
  formatImaging,
  formatDiagnosis
} from './gaiCopyFormatter.js';

/**
 * 資料類型與 patientData key 的映射表
 */
const DATA_KEY_MAP = {
  patientSummary: 'patientSummaryData',
  diagnosis: 'diagnosisData',
  allergy: 'allergyData',
  surgery: 'surgeryData',
  discharge: 'dischargeData',
  hbcvdata: 'hbcvData',
  medication: 'groupedMedications',
  lab: 'groupedLabs',
  chinesemed: 'groupedChineseMeds',
  imaging: 'imagingData'
};

/**
 * 格式化函數映射表
 */
const FORMATTER_MAP = {
  patientSummary: formatPatientSummary,
  diagnosis: formatDiagnosis,
  allergy: formatAllergy,
  surgery: formatSurgery,
  discharge: formatDischarge,
  hbcvdata: formatHBCV,
  medication: formatMedication,
  lab: formatLab,
  chinesemed: formatChineseMed,
  imaging: formatImaging
};

/**
 * 根據資料類型選擇生成部分 XML
 * @param {Object} patientData - 完整的患者資料
 * @param {string[]} selectedDataTypes - 要包含的資料類型陣列
 * @returns {string} 部分 XML 格式資料
 *
 * @example
 * generateSelectiveXML(patientData, ['medication', 'lab', 'imaging'])
 * // 只生成用藥、檢驗、影像三種資料的 XML
 */
export const generateSelectiveXML = (patientData, selectedDataTypes) => {
  if (!patientData) {
    console.warn('[DataSelector] patientData is null or undefined');
    return '';
  }

  if (!selectedDataTypes || selectedDataTypes.length === 0) {
    console.warn('[DataSelector] selectedDataTypes is empty');
    return '這是病歷資料\n\n（未選擇任何資料類型）';
  }

  const { userInfo } = patientData;

  // 建立基本資訊
  const age = userInfo?.age || '未知';
  const gender = userInfo?.gender === 'M' ? 'male' :
    userInfo?.gender === 'F' ? 'female' : '未知';

  let xmlText = `這是一位 ${age} 歲的 ${gender} 性病人，以下是病歷資料\n\n`;

  // 根據選擇的資料類型，依序加入對應的 XML section
  selectedDataTypes.forEach(dataType => {
    const formatter = FORMATTER_MAP[dataType];

    if (!formatter) {
      console.warn(`[DataSelector] Unknown data type: ${dataType}`);
      return;
    }

    const dataKey = DATA_KEY_MAP[dataType];
    const data = patientData[dataKey];

    // 即使資料為空，也呼叫 formatter（formatter 內部會處理空資料）
    xmlText += formatter(data);
  });

  return xmlText;
};

/**
 * 驗證資料類型是否有效
 * @param {string[]} dataTypes - 資料類型陣列
 * @returns {{valid: boolean, invalidTypes: string[]}}
 */
export const validateDataTypes = (dataTypes) => {
  if (!Array.isArray(dataTypes)) {
    return {
      valid: false,
      invalidTypes: [],
      error: 'dataTypes must be an array'
    };
  }

  const validTypes = Object.keys(FORMATTER_MAP);
  const invalidTypes = dataTypes.filter(type => !validTypes.includes(type));

  return {
    valid: invalidTypes.length === 0,
    invalidTypes,
    validTypes
  };
};

/**
 * 檢查患者資料中是否包含指定的資料類型
 * @param {Object} patientData - 患者資料
 * @param {string[]} dataTypes - 要檢查的資料類型
 * @returns {{available: string[], missing: string[]}}
 */
export const checkDataAvailability = (patientData, dataTypes) => {
  if (!patientData) {
    return {
      available: [],
      missing: dataTypes || []
    };
  }

  const available = [];
  const missing = [];

  dataTypes.forEach(dataType => {
    const dataKey = DATA_KEY_MAP[dataType];
    const data = patientData[dataKey];

    // 檢查資料是否存在且非空
    const hasData = data && (
      Array.isArray(data)
        ? data.length > 0
        : (typeof data === 'object' && Object.keys(data).length > 0)
    );

    if (hasData) {
      available.push(dataType);
    } else {
      missing.push(dataType);
    }
  });

  return { available, missing };
};

/**
 * 取得所有支援的資料類型
 * @returns {string[]} 資料類型陣列
 */
export const getAllDataTypes = () => {
  return Object.keys(FORMATTER_MAP);
};

/**
 * 取得資料類型的顯示名稱
 * @param {string} dataType - 資料類型 ID
 * @returns {string} 顯示名稱
 */
export const getDataTypeLabel = (dataType) => {
  const labels = {
    patientSummary: '患者摘要',
    allergy: '過敏史',
    surgery: '開刀史',
    discharge: '住院史',
    hbcvdata: 'B/C肝炎',
    medication: '用藥記錄',
    lab: '檢驗記錄',
    chinesemed: '中藥記錄',
    imaging: '影像報告'
  };

  return labels[dataType] || dataType;
};
