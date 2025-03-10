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
      // Remove packaging information
      .replace(/\([^)]*箔[^)]*\)/g, "")
      // Remove non-dosage parenthetical content
      .replace(/\((?!\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?(?:\/\d+(?:[.,]\d+)?)?)([^)]*)\)/gi, "")
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

  // calculatePerDosage 函數的修正版本
  calculatePerDosage(dosage, frequency, days) {
    if (!dosage || !frequency || !days) return "";

    const frequencyMap = {
      QD: 1,
      QDP: 1,
      QAM: 1,
      QPM: 1,
      BID: 2,
      BIDP: 2,
      TID: 3,
      TIDP: 3,
      QID: 4,
      QIDP: 4,
      Q2H: 12,
      Q4H: 6,
      Q6H: 4,
      Q8H: 3,
      Q12H: 2,
      HS: 1,
      HSP: 1,
      DAILY: 1,
      QN: 1,
      STAT: 1,
      ST: 1,
      ASORDER: 1, // 新增 ASORDER
      PRN: 1,     // 新增 PRN (as needed)
      QOD: 0.5,   // 新增 QOD (every other day)
      ONCE: 1,    // 新增 ONCE (equivalent to STAT)
      PRNB: 2,    // 新增 PRNB (PRN BID)
    };

    // 修改正則表達式，確保包含所有在 frequencyMap 中的頻次
    const freqRegexStr = Object.keys(frequencyMap).join("|");
    const freqRegex = new RegExp(freqRegexStr, "i");
    const freqMatch = frequency.toUpperCase().match(freqRegex);

    if (!freqMatch && !frequency.includes("需要時")) {
      console.log("無法識別的頻次:", frequency);
      return "SPECIAL";
    }

    let totalDoses;
    // 從匹配到的頻次字串中獲取完整頻次
    const freq = freqMatch ? freqMatch[0].toUpperCase() : "PRN";

    // QOD 特殊處理 - 確保同時支援正則表達式匹配和特殊邏輯
    if (frequency.includes("QOD") || frequency.includes("Q2D")) {
      totalDoses = Math.ceil(parseInt(days) / 2);
    } else if (frequency.includes("TIW")) {
      totalDoses = Math.ceil(parseInt(days) / 7) * 3;
    } else if (frequency.includes("BIW")) {
      totalDoses = Math.ceil(parseInt(days) / 7) * 2;
    } else if (frequency.includes("QW")) {
      totalDoses = Math.ceil(parseInt(days) / 7);
    } else if (frequency.includes("PRN") || frequency.includes("需要時") || freq === "PRN" || freq === "PRNB") {
      return "SPECIAL";
    } else {
      totalDoses = parseInt(days) * (frequencyMap[freq] || 1);
    }

    const totalDosage = parseFloat(dosage);
    const singleDose = totalDosage / totalDoses;

    const threshold = 0.24;
    const validUnits = [
      0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0,
      8.0, 9.0, 10.0,
    ];

    if (singleDose < threshold) {
      return "SPECIAL";
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
              const key = `${record.PER_DATE || record.drug_date}_${
                record.HOSP_NAME || record.hosp
              }`;

              if (!processedRecords[key]) {
                processedRecords[key] = {
                  date: record.PER_DATE || record.drug_date,
                  hosp: (record.HOSP_NAME || record.hosp || "").split(";")[0],
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
                )
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

  // Format medication list for copying with different formats
  formatMedicationList(medications, format, groupInfo) {
    if (format === "none") {
      return "";
    }

    // Format the header with date, hospital and diagnosis
    let header = `${groupInfo.date} - ${groupInfo.hosp}`;
    if (groupInfo.showDiagnosis && groupInfo.icd_code && groupInfo.icd_name) {
      header += ` [${groupInfo.icd_code} ${groupInfo.icd_name}]`;
    }

    const getMedicationText = (med) => {
      const dosageText =
        med.perDosage === "SPECIAL" ? `總量${med.dosage}` : `${med.perDosage}#`;

      switch (format) {
        case "nameVertical":
          return med.name;
        case "nameWithDosageVertical":
          return `${med.name} ${dosageText} ${med.frequency} ${med.days}天`;
        case "nameHorizontal":
          return med.name;
        case "nameWithDosageHorizontal":
          return `${med.name} ${dosageText} ${med.frequency} ${med.days}天`;
        default:
          return med.name;
      }
    };

    const medicationTexts = medications.map((med) => getMedicationText(med));

    // Format the full output with header
    if (format.includes("Horizontal")) {
      return `${header}\n${medicationTexts.join(", ")}`;
    } else {
      return `${header}\n${medicationTexts.join("\n")}`;
    }
  },
};

export default medicationProcessor;
