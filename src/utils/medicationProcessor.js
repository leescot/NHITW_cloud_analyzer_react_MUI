import { medicationCopyFormatter } from './medicationCopyFormatter.js';

export const medicationProcessor = {
  // Simplify medication names by removing redundant text
  simplifyMedicineName(name) {
    if (!name) return "";

    let simplifiedName = name;

    // 使用 Map 定義不同情況的文字處理方法
    const textProcessors = new Map([
      // 處理引號開頭的特殊情況
      ['quoteStart', (text) => {
        // 提取第一個引號中的內容
        const firstQuoteMatch = text.match(/"([^"]*)"/);
        if (firstQuoteMatch) {
          // 保留第一個引號內容
          const firstQuoteContent = firstQuoteMatch[1];
          // 移除第一個引號部分
          text = text.substring(firstQuoteMatch[0].length);
          // 移除所有其他引號文字
          text = text.replace(/"([^"]*)"/g, "");
          // 將第一個引號內容加回（不含引號）
          return firstQuoteContent + " " + text;
        }
        return text;
      }],
      // 處理一般情況
      ['normal', (text) => {
        // 移除所有引號文字
        return text.replace(/"([^"]*)"/g, "");
      }]
    ]);

    // 根據文字是否以引號開頭選擇處理方法
    const processorKey = simplifiedName.trim().startsWith('"') ? 'quoteStart' : 'normal';
    simplifiedName = textProcessors.get(processorKey)(simplifiedName);

    // 定義正則表達式用於處理製劑相關變體
    const regexReplacements = new Map([
      // 處理片劑相關變體
      [/\b(tablets?|f\.?c\.?\s*tablets?|film[\s-]?coated\s*tablets?|prolonged release tablets?)\b/gi, ""],
      // 移除特定詞組
      [/\b(ENTERIC-MICROENCAPSULATED|CAPSULES|ENTERIC[\s-]?SUGAR[\s-]?COATED|ENTERIC[\s-]?COATED|EFFERVESCENT|, solution for peritoneal dialysis|Plastic Syringe)\b/gi, ""],
      // 標準化膠囊表示法
      [/\b(capsules?|cap\.?)\b/gi, "CAP."],
      // 格式化劑量（加括號）
      [/(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?){0,2})\s*mg\b(?!\s*\/)/gi, (match, p1) => `(${p1.replace(/\s+/g, "")})`],
      // 清理 TAB./CAP. 周圍的空格
      [/\s+(TAB\.|CAP\.)\s+/, " "],
      // 移除包裝資訊（半寬和全寬括號）
      [/\([^)]*箔[^)]*\)/g, ""],
      [/（[^）]*箔[^）]*）/g, ""],
      // 移除非劑量的括號內容（半寬和全寬括號）
      [/\((?!\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?(?:\/\d+(?:[.,]\d+)?)?)([^)]*)\)/gi, ""],
      [/（(?!\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?(?:\/\d+(?:[.,]\d+)?)?)([^）]*)）/gi, ""],
      // 標準化空格
      [/\s+/g, " "],
      // 移除引號（如有遺留）
      [/"/g, ""]
    ]);

    // 應用所有正則表達式替換
    for (const [regex, replacement] of regexReplacements.entries()) {
      simplifiedName = simplifiedName.replace(regex, replacement);
    }
    
    simplifiedName = simplifiedName.trim();

    // 處理複雜劑量
    const complexDoseRegex = /\((\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?){0,2})\)\s*(?:MG|MCG|G|ML|I\.U\.\/ML)(?!\s*\/)/i;
    const doseMatch = simplifiedName.match(complexDoseRegex);

    // 如果找到劑量，截斷劑量後的內容
    if (doseMatch) {
      const dosePart = `(${doseMatch[1]})`;
      const beforeDose = simplifiedName.split(dosePart)[0].trim();
      simplifiedName = beforeDose + " " + dosePart;
    }

    return simplifiedName.trim();
  },

  // 使用 Map 重構頻次映射表
  calculatePerDosage(dosage, frequency, days) {
    if (!dosage || !frequency || !days) return "";

    // 使用 Map 儲存頻次和對應的每日劑量次數
    const frequencyMap = new Map([
      ['QD', 1],
      ['QDP', 1],
      ['QAM', 1],
      ['AM', 1],
      ['AMPC', 1],
      ['QPM', 1],
      ['QDPM', 1],
      ['PM', 1],
      ['BID', 2],
      ['BIDP', 2],
      ['TID', 3],
      ['TIDP', 3],
      ['QID', 4],
      ['QIDP', 4],
      ['Q2H', 12],
      ['Q4H', 6],
      ['Q6H', 4],
      ['Q8H', 3],
      ['Q12H', 2],
      ['HS', 1],
      ['HSP', 1],
      ['DAILY', 1],
      ['QN', 1],
      ['STAT', 1],
      ['ST', 1],
      ['ASORDER', 1], // 新增 ASORDER
      ['PRN', 1],     // 新增 PRN (as needed)
      ['QOD', 0.5],   // 新增 QOD (every other day)
      ['ONCE', 1],    // 新增 ONCE (equivalent to STAT)
      ['PRNB', 2],    // 新增 PRNB (PRN BID)
      ['QW', 0.14],   // 新增 QW (once a week) - approximately 1/7
      ['BIW', 0.29],  // 新增 BIW (twice a week) - approximately 2/7
      ['TIW', 0.43],  // 新增 TIW (three times a week) - approximately 3/7
    ]);

    // 特殊頻次處理映射
    const specialFreqMap = new Map([
      ['QOD', (d) => Math.ceil(parseInt(d) / 2)],
      ['Q2D', (d) => Math.ceil(parseInt(d) / 2)],
      ['TIW', (d) => Math.ceil(parseInt(d) / 7) * 3],
      ['BIW', (d) => Math.ceil(parseInt(d) / 7) * 2],
      ['QW', (d) => Math.ceil(parseInt(d) / 7)]
    ]);

    // 常見的有效單位劑量
    const validUnits = [
      0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0,
      8.0, 9.0, 10.0,
    ];

    // 建立正則表達式來匹配所有可能的頻次
    const freqRegexStr = Array.from(frequencyMap.keys()).join("|");
    const freqRegex = new RegExp(freqRegexStr, "i");
    const freqMatch = frequency.toUpperCase().match(freqRegex);

    // 無法辨識的頻次且不是「需要時」，回傳 SPECIAL
    if (!freqMatch && !frequency.includes("需要時")) {
      console.log("無法識別的頻次:", frequency);
      return "SPECIAL";
    }

    // 從匹配到的頻次字串中擷取完整頻次
    const freq = freqMatch ? freqMatch[0].toUpperCase() : "PRN";

    // 檢查是否是特殊頻次（QOD, TIW, BIW, QW）
    let totalDoses;
    
    // 先檢查特殊頻次
    for (const [specialFreq, doseCalculator] of specialFreqMap.entries()) {
      if (frequency.includes(specialFreq)) {
        totalDoses = doseCalculator(days);
        break;
      }
    }

    // 如果不是特殊頻次
    if (totalDoses === undefined) {
      // PRN 相關頻次或需要時，回傳 SPECIAL
      if (frequency.includes("PRN") || frequency.includes("需要時") || freq === "PRN" || freq === "PRNB") {
        return "SPECIAL";
      } else {
        // 一般頻次，按照 Map 中的值計算
        totalDoses = parseInt(days) * (frequencyMap.get(freq) || 1);
      }
    }

    const totalDosage = parseFloat(dosage);
    const singleDose = totalDosage / totalDoses;

    const threshold = 0.24;
    
    // 如果單次劑量過小，回傳 SPECIAL
    if (singleDose < threshold) {
      return "SPECIAL";
    }

    // 特殊頻次的精確計算
    if (['TIW', 'BIW', 'QW'].includes(freq) || ['TIW', 'BIW', 'QW'].some(f => frequency.includes(f))) {
      // 計算週數和估計劑量
      const numWeeks = Math.ceil(parseInt(days) / 7);
      let estimatedDoses;
      
      if (freq === 'TIW' || frequency.includes('TIW')) {
        estimatedDoses = numWeeks * 3;
      } else if (freq === 'BIW' || frequency.includes('BIW')) {
        estimatedDoses = numWeeks * 2;
      } else { // QW
        estimatedDoses = numWeeks;
      }
      
      const perDose = Math.round(totalDosage / estimatedDoses);
      
      // 只有在是標準單位劑量時才回傳
      if (validUnits.includes(perDose)) {
        return perDose.toString();
      }
    }

    const roundedDose = Math.round(singleDose * 4) / 4;

    if (!validUnits.includes(roundedDose)) {
      return "SPECIAL";
    }

    return roundedDose.toString();
  },

  // 處理藥物資料的主要函式
  processMedicationData(data) {
    if (!data || !data.rObject || !Array.isArray(data.rObject)) {
      console.error("無效的藥物資料格式");
      return Promise.resolve([]);
    }

    // 預設使用者設定映射
    const defaultSettings = {
      simplifyMedicineName: true,
      showGenericName: false,
      showDiagnosis: false,
      showATC5Name: false,
      enableMedicationCustomCopyFormat: false,
      medicationCopyFormat: "nameWithDosageVertical",
      customMedicationHeaderCopyFormat: null,
      customMedicationDrugCopyFormat: null,
      drugSeparator: ",",
    };

    // 從 Chrome storage 擷取使用者設定
    return new Promise((resolve) => {
      chrome.storage.sync.get(defaultSettings, (settings) => {
        // 檢查全局格式設定（來自本地資料處理器）
        if (window.medicationFormatSettings) {
          // console.log("使用全局藥物格式設定:", window.medicationFormatSettings);
          
          // 建立深度複製以確保陣列被正確複製
          const deepCopiedSettings = {};
          
          // 直接複製基本值
          Object.keys(window.medicationFormatSettings).forEach(key => {
            if (!Array.isArray(window.medicationFormatSettings[key])) {
              deepCopiedSettings[key] = window.medicationFormatSettings[key];
            } else {
              // 使用 JSON 深度複製陣列
              deepCopiedSettings[key] = JSON.parse(JSON.stringify(window.medicationFormatSettings[key]));
            }
          });
          
          // 記錄深度複製的陣列以驗證
          // console.log("深度複製的陣列:", {
          //   標題格式長度: deepCopiedSettings.customMedicationHeaderCopyFormat?.length,
          //   藥物格式長度: deepCopiedSettings.customMedicationDrugCopyFormat?.length
          // });
          
          // 合併全局設定與擷取的設定
          settings = {
            ...settings,
            ...deepCopiedSettings
          };
        } else {
          console.log("使用 Chrome storage 中的設定:", {
            medicationCopyFormat: settings.medicationCopyFormat,
            enableMedicationCustomCopyFormat: settings.enableMedicationCustomCopyFormat,
            hasHeaderFormat: !!settings.customMedicationHeaderCopyFormat,
            hasDrugFormat: !!settings.customMedicationDrugCopyFormat,
            drugSeparator: settings.drugSeparator
          });
          
          // 改進: 如果啟用了自訂格式但 Chrome storage 中沒有全局變數，設置全局變數
          if (settings.enableMedicationCustomCopyFormat && 
              (settings.customMedicationHeaderCopyFormat || settings.customMedicationDrugCopyFormat)) {
              
            // console.log("從 Chrome storage 設置全局格式變數");
            
            // 創建全局設定對象 (如果不存在)
            if (!window.medicationFormatSettings) {
              window.medicationFormatSettings = {};
            }
            
            // 複製自訂格式設定到全局變數
            if (settings.customMedicationHeaderCopyFormat) {
              window.medicationFormatSettings.customMedicationHeaderCopyFormat = 
                  JSON.parse(JSON.stringify(settings.customMedicationHeaderCopyFormat));
              // 設置備份變數
              window.customMedicationHeaderCopyFormat = 
                  JSON.parse(JSON.stringify(settings.customMedicationHeaderCopyFormat));
            }
            
            if (settings.customMedicationDrugCopyFormat) {
              window.medicationFormatSettings.customMedicationDrugCopyFormat = 
                  JSON.parse(JSON.stringify(settings.customMedicationDrugCopyFormat));
              // 設置備份變數
              window.customMedicationDrugCopyFormat = 
                  JSON.parse(JSON.stringify(settings.customMedicationDrugCopyFormat));
            }
            
            // 複製其他設定
            window.medicationFormatSettings.enableMedicationCustomCopyFormat = 
                settings.enableMedicationCustomCopyFormat;
            window.medicationFormatSettings.medicationCopyFormat = 
                settings.medicationCopyFormat;
            window.medicationFormatSettings.drugSeparator = 
                settings.drugSeparator;
            
            // console.log("全局變數設置完成:", {
            //   hasGlobalSettings: !!window.medicationFormatSettings,
            //   hasHeaderArray: !!window.customMedicationHeaderCopyFormat,
            //   headerLength: window.customMedicationHeaderCopyFormat?.length,
            //   hasDrugArray: !!window.customMedicationDrugCopyFormat,
            //   drugLength: window.customMedicationDrugCopyFormat?.length
            // });
          }
        }
        
        try {
          // 按訪問日期和醫療機構分組藥物
          const processedRecords = {};

          // 欄位映射，用於處理不同的資料來源格式
          const fieldMappings = new Map([
            ["date", { primary: "PER_DATE", fallback: "drug_date" }],
            ["hosp", { primary: "HOSP_NAME", fallback: "hosp" }],
            ["icd_code", { primary: "ICD_CODE", fallback: "icd_code" }],
            ["icd_name", { primary: "ICD_NAME", fallback: "icd_cname" }],
            ["med_name", { primary: "MED_DESC", fallback1: "MED_ITEM", fallback2: "drug_ename" }],
            ["ingredient", { primary: "GENERIC_NAME", fallback: "drug_ing_name" }],
            ["dosage", { primary: "DOSAGE", fallback: "qty", default: "1" }],
            ["frequency", { primary: "FREQ_DESC", fallback: "drug_fre", default: "QD" }],
            ["days", { primary: "MED_DAYS", fallback: "day", default: "1" }],
            ["atc_code", { primary: "ATC_CODE", fallback: "drug_atc7_code" }],
            ["atc_name", { primary: "ATC_NAME", fallback: "drug_atc5_name" }],
            ["drug_left", { primary: "DRUG_LEFT", fallback: "drug_left", default: "0" }],
            ["drugcode", { primary: "drug_code", default: "" }]
          ]);

          // 從記錄中擷取特定欄位的值
          const getFieldValue = (record, fieldMapping, isDefault = false) => {
            const mapping = fieldMappings.get(fieldMapping);
            if (!mapping) return "";
            
            if (mapping.primary && record[mapping.primary]) {
              return record[mapping.primary];
            } else if (mapping.fallback && record[mapping.fallback]) {
              return record[mapping.fallback];
            } else if (mapping.fallback1 && record[mapping.fallback1]) {
              return record[mapping.fallback1];
            } else if (mapping.fallback2 && record[mapping.fallback2]) {
              return record[mapping.fallback2];
            } else if (isDefault && mapping.default) {
              return mapping.default;
            }
            
            return "";
          };

          data.rObject.forEach((record) => {
            // 從 hosp 欄位中提取醫院名稱和就診類型
            const hospValue = getFieldValue(record, "hosp");
            const hospParts = hospValue.split(";");
            const hospitalName = hospParts[0] || "";
            const visitType = hospParts.length > 1 ? hospParts[1] || "" : "";

            // 創建包含日期、醫院、就診類型和 ICD 代碼的唯一鍵
            const key = `${getFieldValue(record, "date")}_${hospitalName}_${visitType}_${getFieldValue(record, "icd_code")}`;

            if (!processedRecords[key]) {
              processedRecords[key] = {
                date: getFieldValue(record, "date"),
                hosp: hospitalName,
                visitType: visitType, // 增加新的 visitType 欄位
                icd_code: getFieldValue(record, "icd_code"),
                icd_name: getFieldValue(record, "icd_name"),
                medications: [],
              };
            }

            // 根據設定處理藥物名稱
            let medicationName = getFieldValue(record, "med_name");
            let ingredientName = getFieldValue(record, "ingredient");

            if (settings.simplifyMedicineName) {
              medicationName = this.simplifyMedicineName(medicationName);
            }

            // 擷取總量並計算每劑量
            const totalQty = getFieldValue(record, "dosage", true);
            const frequency = getFieldValue(record, "frequency", true);
            const days = getFieldValue(record, "days", true);

            // 計算每劑量
            const perDose = this.calculatePerDosage(
              totalQty,
              frequency,
              days
            );

            // 將處理後的藥物資訊添加到相應組中
            processedRecords[key].medications.push({
              name: medicationName,
              ingredient: ingredientName,
              dosage: totalQty, // 總量
              perDosage: perDose, // 每劑量（計算得出）
              frequency: frequency,
              days: days,
              atc_code: getFieldValue(record, "atc_code"),
              atc_name: getFieldValue(record, "atc_name"),
              drug_left: parseInt(getFieldValue(record, "drug_left", true), 10),
              drugcode: getFieldValue(record, "drugcode") // 增加新的 drugcode 欄位
            });
          });

          // 轉換為陣列並按日期排序（最新的優先）
          const groupedData = Object.values(processedRecords);

          groupedData.sort((a, b) => {
            // 處理不同的日期格式
            const dateA = a.date.replace(/\//g, "-");
            const dateB = b.date.replace(/\//g, "-");
            return dateB.localeCompare(dateA);
          });

          resolve(groupedData);
        } catch (error) {
          console.error("處理藥物數據時出錯:", error);
          console.error("錯誤詳情:", error.stack);
          resolve([]);
        }
      });
    });
  },

  // 使用 Map 重構格式處理邏輯
  formatMedicationList(medications, format, groupInfo) {
    if (format === "none") {
      return "";
    }
    
    // 記錄 groupInfo 的完整內容以便調試
    // console.log("formatMedicationList 中的完整 groupInfo:", JSON.stringify({
    //   format: format,
    //   hasHeaderArray: Array.isArray(groupInfo.customMedicationHeaderCopyFormat),
    //   headerArrayLength: groupInfo.customMedicationHeaderCopyFormat?.length,
    //   hasDrugArray: Array.isArray(groupInfo.customMedicationDrugCopyFormat),
    //   drugArrayLength: groupInfo.customMedicationDrugCopyFormat?.length,
    //   drugSeparator: groupInfo.drugSeparator
    // }));

    // 建立分隔字元擷取策略
    const getSeparator = () => {
      const sources = [
        groupInfo.drugSeparator,
        window.medicationFormatSettings?.drugSeparator,
        window.customDrugSeparator,
        ', ' // 預設值
      ];
      
      // 使用第一個非空值
      return sources.find(source => source !== undefined && source !== null) || ', ';
    };
    
    const drugSeparatorFromSettings = getSeparator();
      
    // console.log("藥物分隔字元檢查:", {
    //   fromGroupInfo: groupInfo.drugSeparator,
    //   fromGlobalSettings: window.medicationFormatSettings?.drugSeparator,
    //   fromCustomGlobal: window.customDrugSeparator,
    //   finalValue: drugSeparatorFromSettings
    // });

    // 確保 groupInfo 包含所有必要的設定
    const enhancedGroupInfo = {
      ...groupInfo,
      // 確保自訂格式設定存在
      customMedicationHeaderCopyFormat: groupInfo.customMedicationHeaderCopyFormat || [],
      customMedicationDrugCopyFormat: groupInfo.customMedicationDrugCopyFormat || [],
      // 確保分隔字元設定存在，使用多重檢查確保我們有一個值
      drugSeparator: drugSeparatorFromSettings
    };

    // 記錄完整的增強 groupInfo 設定
    // console.log("增強後的 groupInfo 設定:", {
    //   format,
    //   drugSeparator: enhancedGroupInfo.drugSeparator
    // });

    // 定義驗證自訂格式配置的函式
    const isValidArray = (array) => Array.isArray(array) && array.length > 0;

    // 檢查自訂格式陣列是否有效（非空）
    let hasValidHeaderFormat = isValidArray(enhancedGroupInfo.customMedicationHeaderCopyFormat);
    let hasValidDrugFormat = isValidArray(enhancedGroupInfo.customMedicationDrugCopyFormat);

    // console.log("使用格式格式化藥物:", format, "以及設定:", {
    //   drugSeparator: enhancedGroupInfo.drugSeparator,
    //   hasCustomHeaderFormat: hasValidHeaderFormat,
    //   hasCustomDrugFormat: hasValidDrugFormat,
    //   headerFormatLength: enhancedGroupInfo.customMedicationHeaderCopyFormat?.length,
    //   drugFormatLength: enhancedGroupInfo.customMedicationDrugCopyFormat?.length
    // });

    // 建立格式陣列來源映射
    const formatArraySources = new Map([
      ['header', {
        validate: (config) => isValidArray(config.customMedicationHeaderCopyFormat),
        sources: [
          (config) => config.customMedicationHeaderCopyFormat,
          () => window.medicationFormatSettings?.customMedicationHeaderCopyFormat,
          () => window.customMedicationHeaderCopyFormat
        ],
        target: 'customMedicationHeaderCopyFormat'
      }],
      ['drug', {
        validate: (config) => isValidArray(config.customMedicationDrugCopyFormat),
        sources: [
          (config) => config.customMedicationDrugCopyFormat,
          () => window.medicationFormatSettings?.customMedicationDrugCopyFormat,
          () => window.customMedicationDrugCopyFormat
        ],
        target: 'customMedicationDrugCopyFormat'
      }]
    ]);

    // 檢查是否需要並可以使用自訂格式
    const isCustomFormat = ['custom', 'customVertical', 'customHorizontal'].includes(format);
    const needsCustomFormatArrays = isCustomFormat && (!hasValidHeaderFormat || !hasValidDrugFormat);

    // 如果需要自訂格式但缺少必要的陣列
    if (needsCustomFormatArrays) {
      // console.log("檢查全局變數中的自訂格式陣列");
      
      // 處理自訂格式陣列配置
      for (const [key, configMeta] of formatArraySources.entries()) {
        // 如果當前配置有效，跳過
        if (configMeta.validate(enhancedGroupInfo)) continue;
        
        // 嘗試從可能的來源擷取有效配置
        for (const sourceFunc of configMeta.sources) {
          const source = sourceFunc(enhancedGroupInfo);
          
          if (isValidArray(source)) {
            // 複製陣列到 enhancedGroupInfo
            enhancedGroupInfo[configMeta.target] = JSON.parse(JSON.stringify(source));
            
            // 更新驗證標記
            if (key === 'header') hasValidHeaderFormat = true;
            if (key === 'drug') hasValidDrugFormat = true;
            
            // 找到有效來源後跳出
            break;
          }
        }
      }
      
      // 記錄設定更新後的狀態
      // console.log("全局變數檢查後的自訂格式狀態:", {
      //   hasValidHeaderFormat,
      //   hasValidDrugFormat,
      //   headerLength: enhancedGroupInfo.customMedicationHeaderCopyFormat?.length,
      //   drugLength: enhancedGroupInfo.customMedicationDrugCopyFormat?.length
      // });
    }

    // 格式化僅包含日期和醫院的標頭（移除了 visitType）
    let header = `${enhancedGroupInfo.date} - ${enhancedGroupInfo.hosp}`;
    // 移除了 visitType 包含代碼
    if (enhancedGroupInfo.showDiagnosis && enhancedGroupInfo.icd_code && enhancedGroupInfo.icd_name) {
      header += ` [${enhancedGroupInfo.icd_code} ${enhancedGroupInfo.icd_name}]`;
    }

    // 使用 Map 儲存不同格式的處理邏輯
    const formatHandlers = new Map([
      ['nameVertical', (med) => med.name],
      ['nameWithDosageVertical', (med) => {
        const dosageText = med.perDosage === "SPECIAL" ? `總量${med.dosage}` : `${med.perDosage}#`;
        return `${med.name} ${dosageText} ${med.frequency} ${med.days}d`;
      }],
      ['nameHorizontal', (med) => med.name],
      ['nameWithDosageHorizontal', (med) => {
        const dosageText = med.perDosage === "SPECIAL" ? `總量${med.dosage}` : `${med.perDosage}#`;
        return `${med.name} ${dosageText} ${med.frequency} ${med.days}d`;
      }]
    ]);

    // 處理自訂格式特殊情況
    if (isCustomFormat) {
      const isHorizontal = format === 'customHorizontal';
      
      // console.log("使用自訂格式設定:", {
      //   format,
      //   isHorizontal,
      //   drugSeparator: enhancedGroupInfo.drugSeparator
      // });
      
      // 增強 groupInfo 以支持自訂格式
      enhancedGroupInfo.formatType = format;
      enhancedGroupInfo.isHorizontal = isHorizontal;
      
      // 使用 medicationCopyFormatter 處理自訂格式
      const customResult = medicationCopyFormatter.applyCustomFormat(medications, enhancedGroupInfo);
      if (customResult !== null) {
        return customResult;
      }
    }
    
    // 擷取適當的格式處理器
    const formatHandler = formatHandlers.get(format) || ((med) => med.name);
    
    // 應用格式處理器到每個藥物
    const medicationTexts = medications.map((med) => formatHandler(med));

    // 格式呈現配置映射
    const formatConfig = new Map([
      ['horizontal', {
        isHorizontal: true,
        separator: enhancedGroupInfo.drugSeparator,
        headerSeparator: ' '
      }],
      ['vertical', {
        isHorizontal: false,
        separator: '\n',
        headerSeparator: '\n'
      }]
    ]);

    // 根據格式決定分隔字元號和換行
    const isHorizontal = format.includes("Horizontal");
    const formatType = isHorizontal ? 'horizontal' : 'vertical';
    const config = formatConfig.get(formatType);
    
    // console.log("藥物分隔字元設定:", {
    //   format,
    //   isHorizontal,
    //   drugSeparator: enhancedGroupInfo.drugSeparator,
    //   usingSeparator: config.separator
    // });
    
    // 組合最終輸出
    let result = header + config.headerSeparator + medicationTexts.join(config.separator);
    
    // console.log("格式化結果:", result);
    return result;
  },
};