/**
 * labCopyFormatter.js
 * 處理檢驗報告的自訂複製格式功能
 */

export const labCopyFormatter = {
  /**
   * 應用自訂格式到檢驗報告
   * @param {Array} labs - 檢驗資料陣列
   * @param {Object} groupInfo - 包含格式設定的群組資訊
   * @returns {String} - 格式化後的文字
   */
  applyCustomFormat(labs, group, labSettings) {
    // 記錄設定資訊以便調試
    console.log("labCopyFormatter.applyCustomFormat 收到的設定:", JSON.stringify({
      hasHeaderFormat: Array.isArray(labSettings.customLabHeaderCopyFormat),
      headerFormatLength: labSettings.customLabHeaderCopyFormat?.length,
      hasItemFormat: Array.isArray(labSettings.customLabItemCopyFormat),
      itemFormatLength: labSettings.customLabItemCopyFormat?.length,
      format: labSettings.copyLabFormat,
      formatType: labSettings.formatType,
      isHorizontal: labSettings.copyLabFormat === "customHorizontal",
      enableCustomFormat: labSettings.enableLabCustomCopyFormat,
      itemSeparator: labSettings.itemSeparator
    }, null, 2));
    
    // 定義驗證陣列是否有效的函數
    const isValidArray = (array) => Array.isArray(array) && array.length > 0;
    
    const { customLabHeaderCopyFormat, customLabItemCopyFormat } = labSettings;
    
    // 詳細檢查自訂格式設定
    console.log("檢驗報告自訂格式數組檢查:", {
      headerFormat: customLabHeaderCopyFormat,
      headerFormatType: typeof customLabHeaderCopyFormat,
      headerFormatIsArray: Array.isArray(customLabHeaderCopyFormat),
      headerFormatLength: Array.isArray(customLabHeaderCopyFormat) ? customLabHeaderCopyFormat.length : 0,
      itemFormat: customLabItemCopyFormat,
      itemFormatType: typeof customLabItemCopyFormat,
      itemFormatIsArray: Array.isArray(customLabItemCopyFormat),
      itemFormatLength: Array.isArray(customLabItemCopyFormat) ? customLabItemCopyFormat.length : 0
    });
    
    // 更嚴格地驗證自訂格式是否可用
    const hasHeaderFormat = isValidArray(customLabHeaderCopyFormat);
    const hasItemFormat = isValidArray(customLabItemCopyFormat);
    
    // 如果缺少格式定義，則記錄並回退到預設格式
    if (!hasHeaderFormat || !hasItemFormat) {
      console.log("已選擇自訂格式但缺少格式定義:", {
        format: labSettings.copyLabFormat,
        hasHeaderFormat,
        hasItemFormat
      });
      
      // 回退到預設格式
      if (labSettings.copyLabFormat === "customVertical") {
        return this.applyVerticalFormat(labs, group, labSettings);
      } else {
        return this.applyHorizontalFormat(labs, group, labSettings);
      }
    }
    
    try {
      // 將檢驗資料轉換為文字，使用自訂格式
      return this.generateCustomTextOutput(labs, group, 
                                        customLabHeaderCopyFormat, 
                                        customLabItemCopyFormat, 
                                        labSettings);
    } catch (error) {
      console.error("應用自訂格式時出錯:", error);
      // 發生錯誤時，回退到預設格式
      if (labSettings.copyLabFormat === "customVertical") {
        return this.applyVerticalFormat(labs, group, labSettings);
      } else {
        return this.applyHorizontalFormat(labs, group, labSettings);
      }
    }
  },

  /**
   * 格式化參考值
   * @param {*} consultValue - 參考值，可能是字符串或對象
   * @returns {String} - 格式化後的參考值字符串
   */
  formatConsultValue(consultValue) {
    // 如果是空值，返回空字符串
    if (!consultValue) return '';
    
    // 如果是对象类型，转换为字符串格式
    if (typeof consultValue === 'object') {
      // 检查是否有数组形式的内容 [min][max]
      if (Array.isArray(consultValue)) {
        return consultValue.join('');
      }
      
      // 尝试格式化对象
      try {
        // 如果对象有 min/max 值
        if (consultValue.min !== undefined && consultValue.max !== undefined) {
          return `[${consultValue.min}]-[${consultValue.max}]`;
        }
        
        // 如果对象有数组形式的内容
        if (consultValue[0] !== undefined && consultValue[1] !== undefined) {
          return `[${consultValue[0]}][${consultValue[1]}]`;
        }
        
        // 其他情况转换为简单字符串
        return JSON.stringify(consultValue).replace(/[{}"]/g, '');
      } catch (e) {
        console.error("格式化參考值出錯:", e);
        return consultValue.toString();
      }
    }
    
    // 如果是简单类型，直接返回
    return consultValue.toString();
  },

  /**
   * 生成自訂文字輸出
   * @param {Array} labs - 檢驗項目清單
   * @param {Object} group - 檢驗組別資訊
   * @param {Array} headerFormat - 標題格式數組
   * @param {Array} itemFormat - 檢驗項目格式數組
   * @param {Object} labSettings - 格式設定資訊
   * @returns {String} - 格式化後的文字
   */
  generateCustomTextOutput(labs, group, headerFormat, itemFormat, labSettings) {
    console.log("generateCustomTextOutput 被調用，參數:", {
      labs: labs.length,
      headerFormatLength: Array.isArray(headerFormat) ? headerFormat.length : 0,
      itemFormatLength: Array.isArray(itemFormat) ? itemFormat.length : 0,
      format: labSettings.copyLabFormat,
      formatType: labSettings.formatType,
      isHorizontal: labSettings.copyLabFormat === "customHorizontal",
      itemSeparator: labSettings.itemSeparator || ','
    });
    
    // 堅實的安全檢查
    if (!Array.isArray(headerFormat) || headerFormat.length === 0 || 
        !Array.isArray(itemFormat) || itemFormat.length === 0) {
      console.error("提供給 generateCustomTextOutput 的格式數組無效");
      if (labSettings.copyLabFormat === "customVertical") {
        return this.applyVerticalFormat(labs, group, labSettings);
      } else {
        return this.applyHorizontalFormat(labs, group, labSettings);
      }
    }
    
    // 群組信息映射 yyyy-mm-dd 轉換為 yyyy/mm/dd
    const groupPropertyMap = new Map([
      ['date', group.date ? group.date.replace(/-/g, '/') : ''],
      ['hosp', group.hosp || '']
    ]);
    
    // 構建頭部信息
    let header = '';
    for (const item of headerFormat) {
      // 提取基本 ID（移除前綴和計數器）
      let baseId = item.id.split('_')[0];
      
      // 處理有前綴的 ID (如 header_text_5)
      if (baseId === 'header' && item.id.split('_').length > 1) {
        baseId = item.id.split('_')[1];
      }
      
      // 對於格式元素，直接使用值；對於屬性元素，查找對應屬性
      if (item.group === 'format' && item.value !== undefined) {
        header += item.value;
      } else {
        header += groupPropertyMap.get(baseId) || '';
      }
    }
    
    // 檢驗項目屬性映射函數
    const getLabItemProperty = (lab, formatItem) => {
      // 提取基本 ID（移除前綴和計數器）
      let baseId = formatItem.id.split('_')[0];
      
      // 處理有前綴的 ID (如 lab_text_5)
      if ((baseId === 'lab') && formatItem.id.split('_').length > 1) {
        baseId = formatItem.id.split('_')[1]; 
      }
      
      // 格式群組處理 (空格、文字等)
      if (formatItem.group === 'format' && formatItem.value !== undefined) {
        return formatItem.value;
      }
      
      // 檢驗項目屬性映射
      if (baseId === 'consultValue') {
        // 特殊處理參考值，確保格式化輸出
        return this.formatConsultValue(lab.consultValue);
      } else {
        const labPropertyMap = new Map([
          ['itemName', lab.itemName || lab.name || ''],
          ['orderCode', lab.orderCode || ''],
          ['value', lab.value || ''],
          ['unit', lab.unit || '']
          // 'consultValue' 已在上面特殊處理
        ]);
        
        // 返回映射的檢驗項目屬性或空字串
        return labPropertyMap.get(baseId) || '';
      }
    };
    
    // 根據格式類型決定輸出方式
    const isHorizontal = labSettings.copyLabFormat === "customHorizontal";
    
    // 構建檢驗項目列表
    let labItemsText = '';
    
    if (isHorizontal) {
      // 確保分隔字元是字符串類型
      const itemSeparator = String(labSettings.itemSeparator || ', ');
      
      // 記錄使用的分隔字元
      console.log(`使用水平格式，項目分隔字元: "${itemSeparator}" (${typeof itemSeparator})`);
      
      // 水平格式：所有項目在一行，以定義的分隔字元分隔
      labItemsText = labs.map((lab) => {
        let itemText = '';
        for (const item of itemFormat) {
          itemText += getLabItemProperty(lab, item);
        }
        return itemText;
      }).join(itemSeparator);
    } else {
      // 垂直格式：每個項目一行
      labItemsText = labs.map((lab) => {
        let itemText = '';
        for (const item of itemFormat) {
          itemText += getLabItemProperty(lab, item);
        }
        return itemText;
      }).join('\n');
    }
    
    // 使用正確的分隔字元連接標題和檢驗項目
    const separator = isHorizontal ? ' ' : '\n';
    const result = header + separator + labItemsText;
    
    console.log(`檢驗報告格式: ${isHorizontal ? '水平' : '垂直'}, 項目間分隔字元: "${labSettings.itemSeparator || ','}", 標題與項目分隔字元: "${separator === '\n' ? '\\n' : separator}"`);
    console.log("最終自訂格式結果:", result);
    return result;
  },

  /**
   * 應用預設垂直格式
   * @param {Array} labs - 檢驗項目清單
   * @param {Object} group - 檢驗組別資訊
   * @param {Object} labSettings - 設定資訊
   * @returns {String} - 格式化後的文字
   */
  applyVerticalFormat(labs, group, labSettings) {
    console.log("應用預設垂直格式");
    
    const { showUnit, showReference } = labSettings;
    
    // 格式化日期，從 YYYY-MM-DD 轉換為 YYYY/MM/DD
    const formattedDate = group.date.replace(/-/g, '/');
    
    let formattedText = `${formattedDate} - ${group.hosp}\n`;
    
    // 垂直格式：每個檢驗項目一行
    labs.forEach((lab) => {
      let labText = lab.itemName || lab.name || '';
      
      if (lab.value) {
        labText += ` ${lab.value}`;
        
        if (showUnit && lab.unit) {
          labText += ` ${lab.unit}`;
        }
        
        if (showReference && lab.consultValue) {
          // 使用格式化函數處理參考值
          labText += ` (${this.formatConsultValue(lab.consultValue)})`;
        }
      }
      
      formattedText += `${labText}\n`;
    });
    
    return formattedText;
  },

  /**
   * 應用預設水平格式
   * @param {Array} labs - 檢驗項目清單
   * @param {Object} group - 檢驗組別資訊
   * @param {Object} labSettings - 設定資訊
   * @returns {String} - 格式化後的文字
   */
  applyHorizontalFormat(labs, group, labSettings) {
    console.log("應用預設水平格式");
    
    const { showUnit, showReference } = labSettings;
    
    // 格式化日期，從 YYYY-MM-DD 轉換為 YYYY/MM/DD
    const formattedDate = group.date.replace(/-/g, '/');
    
    let formattedText = `${formattedDate} - ${group.hosp} `;
    
    // 水平格式：檢驗項目在同一行，用空格分隔
    const labItems = labs.map((lab) => {
      let labText = lab.itemName || lab.name || '';
      
      if (lab.value) {
        labText += ` ${lab.value}`;
        
        if (showUnit && lab.unit) {
          labText += ` ${lab.unit}`;
        }
        
        if (showReference && lab.consultValue) {
          // 使用格式化函數處理參考值
          labText += ` (${this.formatConsultValue(lab.consultValue)})`;
        }
      }
      
      return labText;
    });
    
    formattedText += labItems.join(' ');
    
    return formattedText;
  }
}; 