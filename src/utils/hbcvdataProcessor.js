// hbcvdataProcessor.js
// 處理B、C肝炎專區資料

import { parseReferenceRange } from './labProcessorModules/referenceRangeUtils.js';

/**
 * 從 assay_value 中提取數值
 * 例如: "0.38(Nonreactive)" -> 0.38
 * @param {string} assayValue - 原始檢驗值
 * @returns {number|null} - 提取的數值，如果無法提取則返回 null
 */
export const extractNumericValue = (assayValue) => {
    if (!assayValue) return null;

    // 嘗試直接解析為數字
    const directParse = parseFloat(assayValue);
    if (!isNaN(directParse)) {
        return directParse;
    }

    // 嘗試從字串中提取數字（處理如 "0.38(Nonreactive)" 的情況）
    const match = assayValue.match(/^([\d.]+)/);
    if (match) {
        const value = parseFloat(match[1]);
        return isNaN(value) ? null : value;
    }

    return null;
};

/**
 * 檢查檢驗值是否異常
 * @param {string} assayValue - 檢驗值
 * @param {string} consultValue - 參考值範圍
 * @returns {Object} - { isAbnormal: boolean, status: 'normal'|'high'|'low' }
 */
export const checkAbnormalValue = (assayValue, consultValue) => {
    // 提取數值
    const numericValue = extractNumericValue(assayValue);

    // 如果無法提取數值，視為正常（非數值型資料）
    if (numericValue === null) {
        return { isAbnormal: false, status: 'normal' };
    }

    // 解析參考範圍
    const range = parseReferenceRange(consultValue);

    // 如果無法解析參考範圍，視為正常
    if (!range) {
        return { isAbnormal: false, status: 'normal' };
    }

    const { min, max } = range;

    // 檢查是否超出範圍
    if (max !== null && numericValue > max) {
        return { isAbnormal: true, status: 'high' };
    }

    if (min !== null && numericValue < min) {
        return { isAbnormal: true, status: 'low' };
    }

    return { isAbnormal: false, status: 'normal' };
};

/**
 * 從醫院字串中提取醫院名稱（第一個 <br> 前的內容）
 * 例如: "門諾醫院<br>門診<br>1145010038" -> "門諾醫院"
 * @param {string} hospString - 原始醫院字串
 * @returns {string} - 提取的醫院名稱
 */
export const extractHospitalName = (hospString) => {
    if (!hospString) return '';

    // 分割字串，取第一個部分
    const parts = hospString.split('<br>');
    return parts[0].trim();
};

/**
 * 處理B、C肝炎專區資料
 * @param {Object} rawData - 原始資料
 * @returns {Object} - 處理後的資料
 */
export const processHbcvdataData = (rawData) => {
    console.log("[hbcvdataProcessor] Processing hbcvdata:", rawData);

    if (!rawData) {
        console.log("[hbcvdataProcessor] No data to process");
        return null;
    }

    // 直接返回原始資料，因為資料結構已經符合需求
    // 資料結構包含 rObject[0] 其中有 result_data, med_data, inspection_data 等
    console.log("[hbcvdataProcessor] Returning processed data:", rawData);
    return rawData;
};

export const hbcvdataProcessor = {
    processHbcvdataData,
    extractNumericValue,
    checkAbnormalValue,
    extractHospitalName
};
