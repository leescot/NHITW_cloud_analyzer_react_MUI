// 主要模組整合所有處理功能

import {
  labCodeAbbreviations,
  specialLabCodeAbbreviations,
  getAbbreviation,
  isGFRItem,
  isMultiItemOrderCode
} from './abbreviationUtils.js';

import {
  normalizeValue,
  checkIfAbnormal
} from './valueUtils.js';

import {
  isZeroReferenceRange,
  parseReferenceRange,
  getReferenceRangeDisplayText
} from './referenceRangeUtils.js';

import {
  deduplicateLabData
} from './deduplicationUtils.js';

import {
  formatLabData
} from './formattingUtils.js';

import {
  groupLabsByDate,
  sortGroupedData,
  getAllLabTypes
} from './groupingUtils.js';

import {
  prepareLabTableData
} from './tableUtils.js';

import { hasCustomReferenceRange, getCustomReferenceRange } from './customReferenceRanges.js';

// 檢驗資料處理模組 - 重新組合原始功能
const labProcessor = {
  // 縮寫和代碼相關
  labCodeAbbreviations,
  specialLabCodeAbbreviations,
  getAbbreviation,
  isGFRItem,
  isMultiItemOrderCode,

  // 數值標準化和檢查
  normalizeValue,
  checkIfAbnormal,

  // 參考範圍處理
  isZeroReferenceRange,
  parseReferenceRange,

  // 資料去重
  deduplicateLabData,

  // 資料格式化
  formatLabData,

  // 資料分組
  groupLabsByDate,
  sortGroupedData,
  getAllLabTypes,

  // 表格數據準備
  prepareLabTableData,

  // 處理檢驗資料的主要函數
  processLabData(labData, settings = {}) {
    if (!labData || !labData.rObject || !Array.isArray(labData.rObject)) {
      console.error('Invalid lab data format:', labData);
      return [];
    }

    // Extract settings with defaults
    const showLabReference = settings.showLabReference !== undefined ? settings.showLabReference : true;
    const highlightAbnormal = settings.highlightAbnormalLab !== undefined ? settings.highlightAbnormalLab : true;

    // First, deduplicate the lab data with new rules
    const dedupedLabData = this.deduplicateLabData(labData.rObject);

    // Group labs by date and hospital
    const groupedByDate = dedupedLabData.reduce((acc, lab) => {
      const date = lab.real_inspect_date?.replace(/\//g, '-') || lab.recipe_date?.replace(/\//g, '-') || '';
      const hosp = lab.hosp?.split(';')[0] || '';
      const groupKey = `${date}_${hosp}`;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          date,
          hosp,
          icd_code: lab.icd_code || '',
          icd_name: lab.icd_cname || '',
          labs: []
        };
      }

      // 忽略檢驗值為 "***" 的項目
      if (lab.assay_value === "***") {
        return acc; // 跳過此項目，不加入分析範圍
      }

      // Parse reference values using comprehensive parser - pass order_code and hosp
      const consultValue = this.parseReferenceRange(lab.consult_value, lab.order_code, lab.hosp);

      // 直接从源数据生成格式化的参考范围 - pass order_code and hosp
      const formattedReference = getReferenceRangeDisplayText(lab.consult_value, lab.order_code, lab.hosp);
      // console.log(`${lab.assay_item_name} - formattedReference direct:`, formattedReference);

      // 檢查是否有自定義參考範圍
      let referenceMin, referenceMax;
      let usingCustomRange = false;
      let originalConsultValue, originalReferenceMin, originalReferenceMax;

      if (hasCustomReferenceRange(lab.order_code)) {
        // 使用自定義參考範圍
        const customRange = getCustomReferenceRange(lab.order_code);
        referenceMin = customRange.min;
        referenceMax = customRange.max;
        // 記錄原始參考值，以便除錯
        originalConsultValue = lab.consult_value;
        originalReferenceMin = consultValue ? consultValue.min : null;
        originalReferenceMax = consultValue ? consultValue.max : null;
        usingCustomRange = true;
      } else {
        // 使用原始參考值
        referenceMin = consultValue ? consultValue.min : null;
        referenceMax = consultValue ? consultValue.max : null;
        usingCustomRange = false;
      }

      // 初始化狀態變數
      let valueStatus = "normal";
      let isAbnormal = false;

      // Skip abnormal marking for labs with [0.000][0.000] reference range unless using custom range
      if ((lab.consult_value && this.isZeroReferenceRange(lab.consult_value) && !usingCustomRange)) {
        valueStatus = "normal";
      } else if (lab.assay_value) {
        const value = parseFloat(lab.assay_value);

        if (!isNaN(value)) {
          // 使用新的 getValueStatus 邏輯
          if (referenceMin !== null && referenceMax !== null) {
            // 有上下限
            const min = parseFloat(referenceMin);
            const max = parseFloat(referenceMax);

            if (!isNaN(min) && !isNaN(max)) {
              if (value < min) valueStatus = "low";
              else if (value > max) valueStatus = "high";
            }
          } else if (referenceMin !== null) {
            // 只有下限
            const min = parseFloat(referenceMin);
            if (!isNaN(min) && value < min) {
              valueStatus = "low";
            }
          } else if (referenceMax !== null) {
            // 只有上限
            const max = parseFloat(referenceMax);
            if (!isNaN(max) && value > max) {
              valueStatus = "high";
            }
          }
        }
      }

      // 設定 isAbnormal 當值狀態不是 normal 時
      isAbnormal = valueStatus !== "normal";

      // 獲取縮寫名稱 - 傳入 itemName 作為新參數
      const abbrName = this.getAbbreviation(lab.order_code, lab.unit_data, lab.assay_item_name);

      // 檢查是否有多值數據
      let normalizedValue;
      let hasMultipleValues = false;
      let valueRange = null;

      if (lab._multiValueData && lab._multiValueData.values && lab._multiValueData.values.length > 1) {
        hasMultipleValues = true;

        // 將字符串數值轉換為數字以進行計算
        const numericValues = lab._multiValueData.values.map(val => {
          const num = parseFloat(val);
          return isNaN(num) ? null : num;
        }).filter(val => val !== null);

        if (numericValues.length > 0) {
          // 如果有有效數字，計算其範圍
          const minValue = Math.min(...numericValues);
          const maxValue = Math.max(...numericValues);

          valueRange = {
            min: minValue,
            max: maxValue,
            timePoints: lab._multiValueData.timePoints || []
          };

          // 合併數值為範圍形式
          if (minValue === maxValue) {
            normalizedValue = `${minValue}`;
          } else {
            normalizedValue = `${minValue}-${maxValue}`;
          }

          // 重新判斷異常狀態（基於範圍的最小值和最大值）
          if ((lab.consult_value && this.isZeroReferenceRange(lab.consult_value) && !usingCustomRange)) {
            valueStatus = "normal";
          } else {
            if (referenceMax !== null && maxValue > parseFloat(referenceMax)) {
              valueStatus = "high";
            } else if (referenceMin !== null && minValue < parseFloat(referenceMin)) {
              valueStatus = "low";
            } else {
              valueStatus = "normal";
            }
          }

          // 更新異常標記
          isAbnormal = valueStatus !== "normal";
        } else {
          // 如果沒有有效數字，使用原始值的連接
          normalizedValue = lab._multiValueData.values.join(", ");
        }
      } else {
        // 單一值的情況
        normalizedValue = this.normalizeValue(lab.assay_value || '');
      }

      // 檢查是否需要將 "試管TubeMethod" 更改為 "生化學檢查"
      let assayType = lab.assay_tp_cname || '';
      if (assayType === "試管TubeMethod") {
        assayType = "生化學檢查";
      }

      acc[groupKey].labs.push({
        itemName: lab.assay_item_name || '',
        value: normalizedValue,  // 可能是範圍形式或單一標準化值
        unit: lab.unit_data || '',
        hasMultipleValues: hasMultipleValues,  // 標記是否有多個數值
        valueRange: valueRange,      // 數值範圍資訊，包含最小值、最大值和時間點
        type: assayType,
        orderName: lab.order_name || '',
        orderCode: lab.order_code || '',
        consultValue: consultValue,  // Always include the reference values
        referenceMin: referenceMin,  // 參考值下限 (可能是自定義的)
        referenceMax: referenceMax,  // 參考值上限 (可能是自定義的)
        formattedReference: formattedReference,  // 直接添加格式化的参考范围文本
        isAbnormal: isAbnormal,      // 保留為向後兼容
        valueStatus: valueStatus,    // 新增詳細狀態 (normal, high, low)
        abbrName: abbrName,          // 新增縮寫屬性
        // 自定義參考範圍相關資訊
        _usingCustomRange: usingCustomRange,
        _originalConsultValue: originalConsultValue,
        _originalReferenceMin: originalReferenceMin,
        _originalReferenceMax: originalReferenceMax,
        // Include the raw consult_value for debugging
        _rawConsultValue: lab.consult_value
      });

      return acc;
    }, {});

    // Convert to array and sort by date (newest first)
    const result = Object.values(groupedByDate).sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    return result;
  }
};

export { labProcessor };