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

  // 民國年日期 (例 "115/02/24") 轉為西元年 (例 "2026/02/24")
  rocToGregorianDate(rocStr) {
    if (!rocStr || typeof rocStr !== "string") return rocStr || "";
    const parts = rocStr.split("/");
    if (parts.length !== 3) return rocStr;
    const yr = parseInt(parts[0], 10);
    if (isNaN(yr)) return rocStr;
    return `${yr + 1911}/${parts[1]}/${parts[2]}`;
  },

  // 由 medication.rObject 建立 drug_code -> {atc5, 學名, ...} 查表，供 chronicMed 合成紀錄回填缺失欄位
  buildDrugInfoMap(data) {
    const map = new Map();
    if (!data || !Array.isArray(data.rObject)) return map;
    for (const rec of data.rObject) {
      const code = rec.drug_code;
      if (!code) continue;
      const existing = map.get(code);
      const recDate = rec.drug_date || "";
      if (!existing || recDate.localeCompare(existing.drug_date || "") > 0) {
        map.set(code, {
          drug_atc5_code: rec.drug_atc5_code || "",
          drug_atc5_name: rec.drug_atc5_name || "",
          drug_atc7_code: rec.drug_atc7_code || "",
          drug_atc3_code: rec.drug_atc3_code || "",
          drug_ing_name: rec.drug_ing_name || "",
          drug_ename: rec.drug_ename || "",
          drug_date: recDate
        });
      }
    }
    return map;
  },

  // 解析 chronicMed 的慢箋週期，回傳每一次領藥 pickup 及對應的 (chronicSeq, chronicTotal)
  //
  // NHI 官方定義（取自 IMUE0008S05 頁面說明）：
  //   「同醫事機構、同就醫序號及同就醫日期之慢性病連續處方箋用藥品項視為同一張慢性病連續處方箋。」
  //
  // 但 cycle key 不能含 hosp_id：sort_code=3 (續領) 紀錄的 hosp_id 是「領藥藥局」而非開立醫事機構，
  // 加入 hosp_id 會把原處方端 (sort=1/2) 與藥局續領端 (sort=3) 切成兩個假 cycle。
  // 改用 (orig_func_seq_no, func_date) — 已足夠識別一張慢箋。
  //
  // sort_code 語意：
  //   1 = 原處方 visit 事件（有 treat_t；無 chr_num/chr_days）
  //   2 = 慢箋註記（有 chr_days = 總天數；rel_date 通常等於 func_date）
  //   3 = 續領紀錄（有 chr_num = 連續處方可調劑次數；func_seq_no 為 IC02/IC03...；rel_date 是實際領藥日；hosp_abbr 是藥局）
  //
  // M（連續處方可調劑次數）優先用 sort=3 的 chr_num，否則用 sort=2 的 chr_days / order_drug_day。
  // 都拿不到 → 不是登記為慢箋，整個 cycle 跳過（不掛 (慢箋:N/M) 標記）。
  parseChronicMedCycles(rawChronicMed) {
    const payload = rawChronicMed?.rObject?.[0];
    if (!payload) return [];
    const all = [
      ...(Array.isArray(payload.chrDataY) ? payload.chrDataY : []),
      ...(Array.isArray(payload.chrDataN) ? payload.chrDataN : [])
    ];
    if (all.length === 0) return [];

    // 依 (orig_func_seq_no, func_date) 分群 = 一張慢箋
    const cycles = new Map();
    for (const r of all) {
      if (!r || !r.orig_func_seq_no || !r.func_date) continue;
      const key = `${r.orig_func_seq_no}|${r.func_date}`;
      if (!cycles.has(key)) cycles.set(key, []);
      cycles.get(key).push(r);
    }

    const pickups = [];
    for (const [, records] of cycles.entries()) {
      // 計算 M：優先 chr_num，否則 chr_days/order_drug_day
      // 注意：chr_num 出現在 sort=3；chr_days 出現在 sort=2 「或」sort=3（不同病患資料格式不一致）
      let M = null;
      const withChrNum = records.find(r => Number(r.sort_code) === 3 && r.chr_num);
      if (withChrNum) {
        M = parseInt(withChrNum.chr_num, 10);
      }
      if (!M) {
        const withChrDays = records.find(r => r.chr_days);
        if (withChrDays) {
          const dd = parseInt(withChrDays.order_drug_day || records[0]?.order_drug_day || "0", 10);
          const cd = parseInt(withChrDays.chr_days, 10);
          if (dd > 0 && cd > 0) M = Math.round(cd / dd);
        }
      }
      // M 拿不到時：只有 overdue=N (chrDataN，效期內未啟動續領) 才標記為「(慢箋:效期內)」。
      // overdue=Y (chrDataY，已逾期且無 metadata) 通常是只領一次沒走慢箋路徑，不應誤標。
      if (!M || M < 1) {
        M = null;
        const isWithinValidity = records[0]?.overdue === "N";
        if (!isWithinValidity) continue;
      }

      // 對每個 order_code 各自展開 pickups
      const byDrug = new Map();
      for (const r of records) {
        if (!r.order_code) continue;
        if (!byDrug.has(r.order_code)) byDrug.set(r.order_code, []);
        byDrug.get(r.order_code).push(r);
      }

      for (const [, drugRecs] of byDrug.entries()) {
        for (const r of drugRecs) {
          const sc = Number(r.sort_code);
          if (sc === 2) continue; // metadata only

          let N = null;
          let pickupDate = null;
          let pickupHosp = null;
          let isOriginal = false;

          if (sc === 1) {
            N = 1;
            pickupDate = this.rocToGregorianDate(r.func_date);
            pickupHosp = r.hosp_abbr || "";
            isOriginal = true;
          } else if (sc === 3) {
            const m = (r.func_seq_no || "").match(/^IC0?(\d+)$/i);
            if (m) N = parseInt(m[1], 10);
            pickupDate = this.rocToGregorianDate(r.rel_date || r.func_date);
            pickupHosp = r.hosp_abbr || ""; // 藥局
          }

          if (N == null || !pickupDate) continue;
          pickups.push({
            record: r,
            chronicSeq: N,
            chronicTotal: M,
            gregorianDate: pickupDate,
            pickupHosp: pickupHosp,
            isOriginal: isOriginal
          });
        }
      }
    }
    return pickups;
  },

  // 將 chronicMed 領藥紀錄合併進已分群的 processedRecords：
  //   原處方 pickup (isOriginal=true, sort_code=1)：
  //     - 命中 medication.rObject 既有紀錄 → 掛 chronicSeq/chronicTotal，不加列
  //     - 未命中 → 合成 drug 紀錄放進 hospital 的 "門診" visit group（不標 isChronicSynthesized；視為正規紀錄）
  //   續領 pickup (isOriginal=false, sort_code=3)：
  //     - 必然合成（medication.rObject 沒有藥局紀錄）→ 放進藥局的 "藥局" visit group，標 isChronicSynthesized=true
  mergeChronicMedIntoGroups(processedRecords, rawChronicMed, drugInfoMap, settings) {
    const pickups = this.parseChronicMedCycles(rawChronicMed);
    if (pickups.length === 0) return;

    for (const { record, chronicSeq, chronicTotal, gregorianDate, pickupHosp, isOriginal } of pickups) {
      // 1. 對原處方 pickup，先嘗試對應 medication.rObject 既有紀錄
      if (isOriginal) {
        let matched = false;
        for (const group of Object.values(processedRecords)) {
          if (group.date !== gregorianDate) continue;
          if (group.hosp !== pickupHosp) continue;
          for (const med of group.medications) {
            if (med.drugcode === record.order_code) {
              med.chronicSeq = chronicSeq;
              med.chronicTotal = chronicTotal;
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
        if (matched) continue;
      }

      // 2. 合成新藥物紀錄（原處方未命中 或 藥局續領）
      const lookup = drugInfoMap.get(record.order_code) || {};
      let synthName = record.drug_ename || lookup.drug_ename || record.order_code;
      if (settings.simplifyMedicineName) {
        synthName = this.simplifyMedicineName(synthName);
      }
      const dosage = String(record.order_qty ?? "1");
      const frequency = record.drug_fre || "QD";
      const days = String(record.order_drug_day ?? "1");
      const perDose = this.calculatePerDosage(dosage, frequency, days);

      const synthDrug = {
        name: synthName,
        ingredient: lookup.drug_ing_name || "",
        dosage: dosage,
        perDosage: perDose,
        frequency: frequency,
        days: days,
        atc_code: lookup.drug_atc7_code || "",
        atc_name: lookup.drug_atc5_name || "",
        drug_left: 0,
        drugcode: record.order_code,
        chronicSeq: chronicSeq,
        chronicTotal: chronicTotal,
        // 原處方未命中 → 不標記，視為正規 medication 紀錄
        // 續領 → 標記 isChronicSynthesized 讓 group header 顯示 (慢箋續領)
        isChronicSynthesized: !isOriginal
      };

      // 3. 找或建 visit group
      const icdCode = record.icd9cm_code || "";
      const visitType = isOriginal ? "門診" : "藥局";
      const groupKey = `${gregorianDate}_${pickupHosp}_${visitType}_${icdCode}`;
      if (!processedRecords[groupKey]) {
        processedRecords[groupKey] = {
          date: gregorianDate,
          hosp: pickupHosp,
          visitType: visitType,
          icd_code: icdCode,
          icd_name: record.icd_cname || "",
          medications: []
        };
      }
      processedRecords[groupKey].medications.push(synthDrug);
    }
  },

  // 處理藥物資料的主要函數
  processMedicationData(data, rawChronicMed) {
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

    // 從 Chrome storage 獲取使用者設定
    return new Promise((resolve) => {
      chrome.storage.sync.get(defaultSettings, (settings) => {
        // 檢查全局格式設定（來自本地資料處理器）
        if (window.medicationFormatSettings) {
          // console.log("使用全局藥物格式設定:", window.medicationFormatSettings);
          
          // 建立深度複製以確保數組被正確複製
          const deepCopiedSettings = {};
          
          // 直接複製基本值
          Object.keys(window.medicationFormatSettings).forEach(key => {
            if (!Array.isArray(window.medicationFormatSettings[key])) {
              deepCopiedSettings[key] = window.medicationFormatSettings[key];
            } else {
              // 使用 JSON 深度複製數組
              deepCopiedSettings[key] = JSON.parse(JSON.stringify(window.medicationFormatSettings[key]));
            }
          });
          
          // 記錄深度複製的數組以驗證
          // console.log("深度複製的數組:", {
          //   標題格式長度: deepCopiedSettings.customMedicationHeaderCopyFormat?.length,
          //   藥物格式長度: deepCopiedSettings.customMedicationDrugCopyFormat?.length
          // });
          
          // 合併全局設定與獲取的設定
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
          
          // 改進: 如果啟用了自定義格式但 Chrome storage 中沒有全局變量，設置全局變量
          if (settings.enableMedicationCustomCopyFormat && 
              (settings.customMedicationHeaderCopyFormat || settings.customMedicationDrugCopyFormat)) {
              
            // console.log("從 Chrome storage 設置全局格式變量");
            
            // 創建全局設定對象 (如果不存在)
            if (!window.medicationFormatSettings) {
              window.medicationFormatSettings = {};
            }
            
            // 複製自定義格式設定到全局變量
            if (settings.customMedicationHeaderCopyFormat) {
              window.medicationFormatSettings.customMedicationHeaderCopyFormat = 
                  JSON.parse(JSON.stringify(settings.customMedicationHeaderCopyFormat));
              // 設置備份變量
              window.customMedicationHeaderCopyFormat = 
                  JSON.parse(JSON.stringify(settings.customMedicationHeaderCopyFormat));
            }
            
            if (settings.customMedicationDrugCopyFormat) {
              window.medicationFormatSettings.customMedicationDrugCopyFormat = 
                  JSON.parse(JSON.stringify(settings.customMedicationDrugCopyFormat));
              // 設置備份變量
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
            
            // console.log("全局變量設置完成:", {
            //   hasGlobalSettings: !!window.medicationFormatSettings,
            //   hasHeaderArray: !!window.customMedicationHeaderCopyFormat,
            //   headerLength: window.customMedicationHeaderCopyFormat?.length,
            //   hasDrugArray: !!window.customMedicationDrugCopyFormat,
            //   drugLength: window.customMedicationDrugCopyFormat?.length
            // });
          }
        }
        
        try {
          // 預先建立 drug_code -> 藥品資訊 查表，給 chronicMed 合成紀錄回填使用
          const drugInfoMap = this.buildDrugInfoMap(data);

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

          // 從記錄中獲取特定欄位的值
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

            // 獲取總量並計算每劑量
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

          // 合併 chronicMed 慢性處方箋資料：命中既有藥物則掛 chronicSeq/chronicTotal，未命中則合成新紀錄
          if (rawChronicMed) {
            this.mergeChronicMedIntoGroups(processedRecords, rawChronicMed, drugInfoMap, settings);
          }

          // 轉換為數組並按日期排序（最新的優先）
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

    // 建立分隔符獲取策略
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
      
    // console.log("藥物分隔符檢查:", {
    //   fromGroupInfo: groupInfo.drugSeparator,
    //   fromGlobalSettings: window.medicationFormatSettings?.drugSeparator,
    //   fromCustomGlobal: window.customDrugSeparator,
    //   finalValue: drugSeparatorFromSettings
    // });

    // 確保 groupInfo 包含所有必要的設定
    const enhancedGroupInfo = {
      ...groupInfo,
      // 確保自定義格式設定存在
      customMedicationHeaderCopyFormat: groupInfo.customMedicationHeaderCopyFormat || [],
      customMedicationDrugCopyFormat: groupInfo.customMedicationDrugCopyFormat || [],
      // 確保分隔符設定存在，使用多重檢查確保我們有一個值
      drugSeparator: drugSeparatorFromSettings
    };

    // 記錄完整的增強 groupInfo 設定
    // console.log("增強後的 groupInfo 設定:", {
    //   format,
    //   drugSeparator: enhancedGroupInfo.drugSeparator
    // });

    // 定義驗證自定義格式配置的函數
    const isValidArray = (array) => Array.isArray(array) && array.length > 0;

    // 檢查自定義格式數組是否有效（非空）
    let hasValidHeaderFormat = isValidArray(enhancedGroupInfo.customMedicationHeaderCopyFormat);
    let hasValidDrugFormat = isValidArray(enhancedGroupInfo.customMedicationDrugCopyFormat);

    // console.log("使用格式格式化藥物:", format, "以及設定:", {
    //   drugSeparator: enhancedGroupInfo.drugSeparator,
    //   hasCustomHeaderFormat: hasValidHeaderFormat,
    //   hasCustomDrugFormat: hasValidDrugFormat,
    //   headerFormatLength: enhancedGroupInfo.customMedicationHeaderCopyFormat?.length,
    //   drugFormatLength: enhancedGroupInfo.customMedicationDrugCopyFormat?.length
    // });

    // 建立格式數組來源映射
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

    // 檢查是否需要並可以使用自定義格式
    const isCustomFormat = ['custom', 'customVertical', 'customHorizontal'].includes(format);
    const needsCustomFormatArrays = isCustomFormat && (!hasValidHeaderFormat || !hasValidDrugFormat);

    // 如果需要自定義格式但缺少必要的數組
    if (needsCustomFormatArrays) {
      // console.log("檢查全局變量中的自定義格式數組");
      
      // 處理自定義格式數組配置
      for (const [key, configMeta] of formatArraySources.entries()) {
        // 如果當前配置有效，跳過
        if (configMeta.validate(enhancedGroupInfo)) continue;
        
        // 嘗試從可能的來源獲取有效配置
        for (const sourceFunc of configMeta.sources) {
          const source = sourceFunc(enhancedGroupInfo);
          
          if (isValidArray(source)) {
            // 複製數組到 enhancedGroupInfo
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
      // console.log("全局變量檢查後的自定義格式狀態:", {
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

    // 處理自定義格式特殊情況
    if (isCustomFormat) {
      const isHorizontal = format === 'customHorizontal';
      
      // console.log("使用自定義格式設定:", {
      //   format,
      //   isHorizontal,
      //   drugSeparator: enhancedGroupInfo.drugSeparator
      // });
      
      // 增強 groupInfo 以支持自定義格式
      enhancedGroupInfo.formatType = format;
      enhancedGroupInfo.isHorizontal = isHorizontal;
      
      // 使用 medicationCopyFormatter 處理自定義格式
      const customResult = medicationCopyFormatter.applyCustomFormat(medications, enhancedGroupInfo);
      if (customResult !== null) {
        return customResult;
      }
    }
    
    // 獲取適當的格式處理器
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

    // 根據格式決定分隔符號和換行
    const isHorizontal = format.includes("Horizontal");
    const formatType = isHorizontal ? 'horizontal' : 'vertical';
    const config = formatConfig.get(formatType);
    
    // console.log("藥物分隔符設定:", {
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