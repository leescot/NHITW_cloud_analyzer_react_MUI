export const medicationProcessor = {
  // Simplify medication names by removing redundant text
  simplifyMedicineName(name) {
    if (!name) return "";

    let simplifiedName = name;

    // Handle special case where name starts with quotation mark
    if (simplifiedName.trim().startsWith('"')) {
      // Extract the first quoted text
      const firstQuoteMatch = simplifiedName.match(/"([^"]*)"/);
      if (firstQuoteMatch) {
        // Keep the content of the first quotes
        const firstQuoteContent = firstQuoteMatch[1];

        // Remove the first quoted part from the string
        simplifiedName = simplifiedName.substring(firstQuoteMatch[0].length);

        // Now remove all other quoted text
        simplifiedName = simplifiedName.replace(/"([^"]*)"/g, "");

        // Prepend the first quoted content back (without quotes)
        simplifiedName = firstQuoteContent + " " + simplifiedName;
      }
    } else {
      // Normal case: remove all quoted text
      simplifiedName = simplifiedName.replace(/"([^"]*)"/g, "");
    }

    // Process tablet related variations
    const tabletRegex =
      /\b(tablets?|f\.?c\.?\s*tablets?|film[\s-]?coated\s*tablets?|prolonged release tablets?)\b/gi;
    simplifiedName = simplifiedName.replace(tabletRegex, "");

    // Process other variations and formats
    simplifiedName = simplifiedName
      // Remove specific phrases
      .replace(/\b(ENTERIC-MICROENCAPSULATED|CAPSULES|ENTERIC[\s-]?SUGAR[\s-]?COATED|ENTERIC[\s-]?COATED|EFFERVESCENT|, solution for peritoneal dialysis|Plastic Syringe)\b/gi, "")
      // Standardize capsule notation
      .replace(/\b(capsules?|cap\.?)\b/gi, "CAP.")
      // Format dosage with parentheses
      .replace(
        /(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?){0,2})\s*mg\b(?!\s*\/)/gi,
        (match, p1) => `(${p1.replace(/\s+/g, "")})`
      )
      // Clean up spacing around TAB./CAP.
      .replace(/\s+(TAB\.|CAP\.)\s+/, " ")
      // Remove packaging information - updated to handle both half-width and full-width parentheses
      .replace(/\([^)]*箔[^)]*\)/g, "")
      .replace(/（[^）]*箔[^）]*）/g, "")
      // Remove non-dosage parenthetical content - updated to handle both half-width and full-width parentheses
      .replace(/\((?!\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?(?:\/\d+(?:[.,]\d+)?)?)([^)]*)\)/gi, "")
      .replace(/（(?!\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?(?:\/\d+(?:[.,]\d+)?)?)([^）]*)）/gi, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      // Remove quotes (in case any remain)
      .replace(/"/g, "")
      .trim();

    // Handle complex dosage
    const complexDoseRegex =
      /\((\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?){0,2})\)\s*(?:MG|MCG|G|ML|I\.U\.\/ML)(?!\s*\/)/i;
    const doseMatch = simplifiedName.match(complexDoseRegex);

    // Cut off everything after the dosage if found
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

    // 從匹配到的頻次字串中獲取完整頻次
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

  // Main function to process medication data with settings
  processMedicationData(data) {
    // Removed excessive logging

    if (!data || !data.rObject || !Array.isArray(data.rObject)) {
      console.error("Invalid medication data format");
      return Promise.resolve([]);
    }

    // Get user settings for processing
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        {
          simplifyMedicineName: true,
          showGenericName: false,
          showDiagnosis: false,
          showATC5Name: false,
        },
        (settings) => {
          // Process with settings here, without logging every time
          try {
            // Group medications by visit date and institution
            const processedRecords = {};

            data.rObject.forEach((record) => {
              // Extract hospital name and visit type from the hosp field
              const hospParts = (record.HOSP_NAME || record.hosp || "").split(";");
              const hospitalName = hospParts[0] || "";
              const visitType = hospParts.length > 1 ? hospParts[1] || "" : "";

              // Create a unique key that includes date, hospital, visit type, and ICD code
              const key = `${record.PER_DATE || record.drug_date}_${hospitalName}_${visitType}_${record.ICD_CODE || record.icd_code || ""}`;

              if (!processedRecords[key]) {
                processedRecords[key] = {
                  date: record.PER_DATE || record.drug_date,
                  hosp: hospitalName,
                  visitType: visitType, // Add the new visitType field
                  icd_code: record.ICD_CODE || record.icd_code,
                  icd_name: record.ICD_NAME || record.icd_cname,
                  medications: [],
                };
              }

              // Process medication name based on settings
              let medicationName =
                record.MED_DESC || record.MED_ITEM || record.drug_ename;
              let ingredientName = record.GENERIC_NAME || record.drug_ing_name;

              if (settings.simplifyMedicineName) {
                medicationName = this.simplifyMedicineName(medicationName);
              }

              // Get total quantity and calculate per-dose amount
              const totalQty = record.DOSAGE || record.qty || "1";
              const frequency = record.FREQ_DESC || record.drug_fre || "QD";
              const days = record.MED_DAYS || record.day || "1";

              // Calculate per-dose amount
              const perDose = this.calculatePerDosage(
                totalQty,
                frequency,
                days
              );

              processedRecords[key].medications.push({
                name: medicationName,
                ingredient: ingredientName,
                dosage: totalQty, // Total quantity
                perDosage: perDose, // Per-dose amount (calculated)
                frequency: frequency,
                days: days,
                atc_code: record.ATC_CODE || record.drug_atc7_code,
                atc_name: record.ATC_NAME || record.drug_atc5_name,
                drug_left: parseInt(
                  record.DRUG_LEFT || record.drug_left || "0",
                  10
                ),
                drugcode: record.drug_code || "" // Add the new drugcode field
              });
            });

            // Convert to array and sort by date (newest first)
            const groupedData = Object.values(processedRecords);

            groupedData.sort((a, b) => {
              // Handle different date formats
              const dateA = a.date.replace(/\//g, "-");
              const dateB = b.date.replace(/\//g, "-");
              return dateB.localeCompare(dateA);
            });

            resolve(groupedData);
          } catch (error) {
            console.error("Error processing medication data:", error);
            console.error("Error details:", error.stack);
            resolve([]);
          }
        }
      );
    });
  },

  // 使用 Map 重構格式處理邏輯
  formatMedicationList(medications, format, groupInfo) {
    if (format === "none") {
      return "";
    }

    // Format the header with date, hospital, visit type and diagnosis
    let header = `${groupInfo.date} - ${groupInfo.hosp}`;
    if (groupInfo.visitType) {
      header += ` (${groupInfo.visitType})`;
    }
    if (groupInfo.showDiagnosis && groupInfo.icd_code && groupInfo.icd_name) {
      header += ` [${groupInfo.icd_code} ${groupInfo.icd_name}]`;
    }

    // 使用 Map 儲存不同格式的處理邏輯
    const formatHandlers = new Map([
      ['nameVertical', (med) => med.name],
      ['nameWithDosageVertical', (med) => {
        const dosageText = med.perDosage === "SPECIAL" ? `總量${med.dosage}` : `${med.perDosage}#`;
        return `${med.name} ${dosageText} ${med.frequency} ${med.days}天`;
      }],
      ['nameHorizontal', (med) => med.name],
      ['nameWithDosageHorizontal', (med) => {
        const dosageText = med.perDosage === "SPECIAL" ? `總量${med.dosage}` : `${med.perDosage}#`;
        return `${med.name} ${dosageText} ${med.frequency} ${med.days}天`;
      }]
    ]);

    // 獲取適當的格式處理器
    const formatHandler = formatHandlers.get(format) || ((med) => med.name);
    
    // 應用格式處理器到每個藥物
    const medicationTexts = medications.map((med) => formatHandler(med));

    // 根據格式決定分隔符號
    const separator = format.includes("Horizontal") ? ", " : "\n";
    
    // 格式化完整輸出
    return `${header}\n${medicationTexts.join(separator)}`;
  },
};

export default medicationProcessor;