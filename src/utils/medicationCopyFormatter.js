/**
 * medicationCopyFormatter.js
 * 處理藥物清單的自訂複製格式功能
 */

import { medicationProcessor } from './medicationProcessor.js';

export const medicationCopyFormatter = {
  /**
   * 應用自訂格式到藥物清單
   * @param {Array} medications - 藥物資料陣列
   * @param {Object} groupInfo - 包含格式設定的群組資訊
   * @returns {String} - 格式化後的文字
   */
  applyCustomFormat(medications, groupInfo) {
    // 記錄 groupInfo 中的所有屬性以便調試
    console.log("applyCustomFormat 收到的 GroupInfo:", JSON.stringify({
      hasHeaderFormat: Array.isArray(groupInfo.customMedicationHeaderCopyFormat),
      headerFormatLength: groupInfo.customMedicationHeaderCopyFormat?.length,
      hasDrugFormat: Array.isArray(groupInfo.customMedicationDrugCopyFormat),
      drugFormatLength: groupInfo.customMedicationDrugCopyFormat?.length,
      format: groupInfo.medicationCopyFormat,
      formatType: groupInfo.formatType,
      isHorizontal: groupInfo.isHorizontal,
      enableCustomFormat: groupInfo.enableMedicationCustomCopyFormat,
      drugSeparator: groupInfo.drugSeparator
    }));
    
    // 定義驗證陣列是否有效的函式
    const isValidArray = (array) => Array.isArray(array) && array.length > 0;
    
    // 使用 Map 定義陣列處理器
    const arrayHandlers = new Map([
      ['header', {
        isValid: (info) => isValidArray(info.customMedicationHeaderCopyFormat),
        getBackup: () => window.customMedicationHeaderCopyFormat,
        process: (info, backup) => {
          if (!isValidArray(info.customMedicationHeaderCopyFormat) && 
              isValidArray(backup)) {
            console.log("使用全局變數中的備份標題格式陣列");
            info.customMedicationHeaderCopyFormat = JSON.parse(JSON.stringify(backup));
            return true;
          }
          return false;
        }
      }],
      ['drug', {
        isValid: (info) => isValidArray(info.customMedicationDrugCopyFormat),
        getBackup: () => window.customMedicationDrugCopyFormat,
        process: (info, backup) => {
          if (!isValidArray(info.customMedicationDrugCopyFormat) && 
              isValidArray(backup)) {
            console.log("使用全局變數中的備份藥物格式陣列");
            info.customMedicationDrugCopyFormat = JSON.parse(JSON.stringify(backup));
            return true;
          }
          return false;
        }
      }]
    ]);
    
    // 處理備份陣列
    for (const [key, handler] of arrayHandlers.entries()) {
      const backup = handler.getBackup();
      handler.process(groupInfo, backup);
    }
    
    const { customMedicationHeaderCopyFormat, customMedicationDrugCopyFormat } = groupInfo;
    
    // 詳細檢查自訂格式設定
    console.log("自訂格式陣列檢查:", {
      headerFormat: customMedicationHeaderCopyFormat,
      headerFormatType: typeof customMedicationHeaderCopyFormat,
      headerFormatIsArray: Array.isArray(customMedicationHeaderCopyFormat),
      headerFormatLength: Array.isArray(customMedicationHeaderCopyFormat) ? customMedicationHeaderCopyFormat.length : 0,
      drugFormat: customMedicationDrugCopyFormat,
      drugFormatType: typeof customMedicationDrugCopyFormat,
      drugFormatIsArray: Array.isArray(customMedicationDrugCopyFormat),
      drugFormatLength: Array.isArray(customMedicationDrugCopyFormat) ? customMedicationDrugCopyFormat.length : 0
    });
    
    // 更嚴格地驗證自訂格式是否可用
    const hasHeaderFormat = isValidArray(customMedicationHeaderCopyFormat);
    const hasDrugFormat = isValidArray(customMedicationDrugCopyFormat);
    
    // 如果缺少格式定義，則記錄並回退到預設格式
    if (!hasHeaderFormat || !hasDrugFormat) {
      console.log("已選擇自訂格式但缺少格式定義:", {
        format: "customVertical",
        hasHeaderFormat,
        hasDrugFormat
      });
      
      // 回退到預設垂直格式
      return this.applyVerticalFormat(medications, groupInfo);
    }
    
    try {
      // 將藥物資料轉換為文字，使用自訂格式
      return this.generateCustomTextOutput(medications, 
                                        customMedicationHeaderCopyFormat, 
                                        customMedicationDrugCopyFormat, 
                                        groupInfo);
    } catch (error) {
      console.error("應用自訂格式時出錯:", error);
      // 發生錯誤時，回退到預設垂直格式
      return this.applyVerticalFormat(medications, groupInfo);
    }
  },

  /**
   * 分析格式元素的輔助函式
   * @param {Array} headerFormat - 標題格式陣列
   * @param {Array} drugFormat - 藥物格式陣列
   */
  analyzeFormatElements(headerFormat, drugFormat) {
    if (!Array.isArray(headerFormat) || !Array.isArray(drugFormat)) {
      console.warn("無效的格式陣列:", {
        headerFormat: typeof headerFormat,
        drugFormat: typeof drugFormat
      });
      return;
    }
    
    console.log("分析自訂格式元素:");
    console.log("標題格式有", headerFormat.length, "個元素:", 
      headerFormat.map(item => `{id: ${item.id}, group: ${item.group}, value: ${item.value}}`));
    console.log("藥物格式有", drugFormat.length, "個元素:", 
      drugFormat.map(item => `{id: ${item.id}, group: ${item.group}, value: ${item.value}}`));
  },

  /**
   * 驗證藥物對象結構是否符合預期的格式元素
   * @param {Object} medication - 藥物對象
   */
  validateMedicationObjectForFormat(medication) {
    console.log("藥物對象結構:", {
      properties: Object.keys(medication),
      name: typeof medication.name,
      simplifiedname: "從名稱派生",
      ingredient: typeof medication.ingredient,
      perDosage: typeof medication.perDosage,
      frequency: typeof medication.frequency,
      days: typeof medication.days,
    });
  },

  /**
   * 生成自訂文字輸出
   * @param {Array} medications - 藥物清單
   * @param {Array} headerFormat - 標題格式陣列
   * @param {Array} drugFormat - 藥物格式陣列
   * @param {Object} groupInfo - 格式設定資訊
   * @returns {String} - 格式化後的文字
   */
  generateCustomTextOutput(medications, headerFormat, drugFormat, groupInfo) {
    // 詳細驗證傳入的參數
    console.log("generateCustomTextOutput 被呼叫，參數:", {
      medications: medications.length,
      headerFormat: headerFormat, 
      headerFormatLength: Array.isArray(headerFormat) ? headerFormat.length : 0,
      drugFormat: drugFormat,
      drugFormatLength: Array.isArray(drugFormat) ? drugFormat.length : 0,
      format: groupInfo.medicationCopyFormat,
      formatType: groupInfo.formatType,
      isHorizontal: groupInfo.isHorizontal,
      drugSeparator: groupInfo.drugSeparator
    });
    
    // 堅實的安全檢查
    if (!Array.isArray(headerFormat) || headerFormat.length === 0 || 
        !Array.isArray(drugFormat) || drugFormat.length === 0) {
      console.error("提供給 generateCustomTextOutput 的格式陣列無效");
      return this.applyVerticalFormat(medications, groupInfo);
    }
    
    // 嘗試讀取第一個格式項目的屬性，以確認格式陣列結構
    try {
      const headerSample = headerFormat[0];
      const drugSample = drugFormat[0];
      
      console.log("格式樣本:", {
        headerSample: {
          id: headerSample.id,
          group: headerSample.group,
          value: headerSample.value,
          allProps: Object.keys(headerSample)
        },
        drugSample: {
          id: drugSample.id,
          group: drugSample.group,
          value: drugSample.value,
          allProps: Object.keys(drugSample)
        }
      });
    } catch (error) {
      console.error("訪問格式項目時出錯:", error);
    }
    
    // 群組信息映射
    const groupPropertyMap = new Map([
      ['date', groupInfo.date || ''],
      ['hosp', groupInfo.hosp || ''],
      ['icdcode', groupInfo.icd_code || ''],
      ['icdname', groupInfo.icd_name || ''],
    ]);
    
    // 建置頭部信息
    let header = '';
    for (const item of headerFormat) {
      // 提取基本 ID（移除前綴和計數器）
      let baseId = item.id.split('_')[0];
      
      // 處理有前綴的 ID (如 header_text_5)
      if (baseId === 'header' && item.id.split('_').length > 1) {
        baseId = item.id.split('_')[1];
      }
      
      // 使用 Map 和 Set 簡化格式邏輯
      const formatActions = new Map([
        ['format', () => item.value || ''],
        ['property', () => groupPropertyMap.get(baseId) || '']
      ]);
      
      const action = item.group === 'format' ? 
                    formatActions.get('format') : 
                    formatActions.get('property');
      
      header += action();
    }
    
    // 藥物屬性映射函式
    const getMedicationProperty = (med, formatItem) => {
      // 提取基本 ID（移除前綴和計數器）
      let baseId = formatItem.id.split('_')[0];
      
      // 處理有前綴的 ID (如 drug_text_5, header_space_3)
      if ((baseId === 'drug' || baseId === 'header') && formatItem.id.split('_').length > 1) {
        baseId = formatItem.id.split('_')[1]; 
      }
      
      // 藥物屬性映射
      const medPropertyMap = new Map([
        ['name', med.name || ''],
        ['simplifiedname', medicationProcessor.simplifyMedicineName(med.name) || ''],
        ['ingredient', med.ingredient || ''],
        ['perDosage', med.perDosage === "SPECIAL" ? 
          `總量${med.dosage}` : `${med.perDosage}`],
        ['frequency', med.frequency || ''],
        ['days', med.days || ''],
      ]);
      
      // 格式群組處理 (空格、文字等)
      if (formatItem.group === 'format' && formatItem.value !== undefined) {
        return formatItem.value;
      }
      
      // 返回映射的藥物屬性或空字串
      return medPropertyMap.get(baseId) || '';
    };
    
    // 建置藥物列表
    const isHorizontal = groupInfo.isHorizontal !== undefined 
      ? groupInfo.isHorizontal 
      : (groupInfo.medicationCopyFormat && groupInfo.medicationCopyFormat.toLowerCase().includes('horizontal'));
    
    let medsText = medications.map((med) => {
      let medText = '';
      
      for (const item of drugFormat) {
        // 擷取藥物屬性值
        medText += getMedicationProperty(med, item);
      }
      return medText;
    }).join(isHorizontal ? (groupInfo.drugSeparator || ', ') : '\n');
    
    // 根據顯示格式決定是否在標題後添加換行
    // 明確定義垂直格式
    const isVertical = !isHorizontal;
    
    console.log("自訂格式換行設定:", {
      format: groupInfo.medicationCopyFormat || groupInfo.formatType,
      formatType: groupInfo.formatType,
      isHorizontal,
      isVertical,
      drugSeparator: groupInfo.drugSeparator
    });
    
    // 使用 Map 定義格式配置
    const formatConfigs = new Map([
      ['horizontal', {
        separator: ' ',  // 水平格式使用空格分隔標題和藥物
        description: '水平格式使用空格分隔'
      }],
      ['vertical', {
        separator: '\n',  // 垂直格式使用換行分隔標題和藥物
        description: '垂直格式使用換行分隔'
      }]
    ]);
    
    // 根據格式類型擷取配置
    const formatType = isHorizontal ? 'horizontal' : 'vertical';
    const formatConfig = formatConfigs.get(formatType);
    
    // 擷取合適的分隔字元
    const separator = formatConfig.separator;
    
    console.log(`使用分隔字元: "${separator === '\n' ? '\\n' : separator}" (${formatConfig.description})`);
    console.log(`藥物之間的分隔字元: "${groupInfo.drugSeparator || '未設定，使用預設值'}"`);
    
    const result = header + separator + medsText;
    console.log("最終自訂格式結果:", result);
    return result;
  },

  /**
   * 應用預設垂直格式
   * @param {Array} medications - 藥物清單
   * @param {Object} groupInfo - 群組資訊
   * @returns {String} - 格式化後的文字
   */
  applyVerticalFormat(medications, groupInfo) {
    console.log("由於自訂格式問題，應用預設垂直格式");
    
    // 使用日期和醫院格式化標頭
    let header = `${groupInfo.date} - ${groupInfo.hosp}`;
    
    // 如果可用，添加診斷信息
    if (groupInfo.icd_code && groupInfo.icd_name) {
      header += ` [${groupInfo.icd_code} ${groupInfo.icd_name}]`;
    }
    
    // 使用劑量信息格式化藥物列表
    const medicationTexts = medications.map(med => {
      const dosageText = med.perDosage === "SPECIAL" ? `總量${med.dosage}` : `${med.perDosage}#`;
      return `${med.name} ${dosageText} ${med.frequency} ${med.days}d`;
    });
    
    // 在標頭後添加換行
    const result = header + '\n' + medicationTexts.join('\n');
    console.log("預設格式結果:", result);
    return result;
  }
}; 