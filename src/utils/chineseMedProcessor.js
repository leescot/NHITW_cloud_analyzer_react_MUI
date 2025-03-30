export const chineseMedProcessor = {
  // 處理中藥資料的主要函數
  processChineseMedData(data) {
    if (!data || !data.rObject || !Array.isArray(data.rObject)) {
      return [];
    }

    try {
      // 將資料分組
      const grouped = this.groupChineseMeds(data.rObject);

      // 轉換為陣列並依日期排序
      const sortedGroups = this.sortGroupedData(grouped);

      // Each group should have visitType, icd_code, and icd_name for the Overview_RecentDiagnosis component
      return sortedGroups;
    } catch (error) {
      console.error('Error processing Chinese medicine data:', error);
      console.error('Error details:', error.stack);
      return [];
    }
  },

  // 將中藥資料分組
  groupChineseMeds(medications) {
    return medications.reduce((acc, med) => {
      if (!med.icd_code) { return acc; }

      // 從 func_date 取得日期並格式化
      const date = this.formatDate(med.func_date);
      if (!date) { return acc; }

      // 日期 > 院所 > ICD > 用藥天數 > 用藥頻率
      const key = JSON.stringify([
        date,
        med.hosp,
        med.icd_code,
        med.day,
        med.drug_fre,
      ]);

      if (!acc[key]) {
        acc[key] = this.createNewGroup(med, date);
      }

      acc[key].medications.push(this.formatChineseMedData(med));

      return acc;
    }, {});
  },

  // 格式化日期 (從 "YYYY-MM-DDT00:00:00" 轉為 "YYYY/MM/DD")
  formatDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (Number.isNaN(date.valueOf())) { return null; }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  },

  // 創建新的分組
  createNewGroup(med, formattedDate) {
    // Extract visitType from hosp field (between first and second semicolon)
    const hospParts = med.hosp.split(';');

    // Ensure we have at least 2 parts (hospital name and visit type)
    const visitType = hospParts[1]?.trim() || "門診"; // Default to "門診"

    // Ensure the ICD code and name are not null or undefined
    const icd_code = med.icd_code || '';
    const icd_name = med.icd_cname || '';

    const group = {
      date: formattedDate,
      icd_code: icd_code,
      icd_name: icd_name,
      hosp: hospParts[0],  // First part of hosp (hospital name)
      visitType: visitType, // Add the visitType field
      days: med.day,
      get dosage() {
        const value = this.medications.reduce((acc, med) => acc + med.dosage, 0);
        Object.defineProperty(this, 'dosage', {value});
        return value;
      },
      freq: med.drug_fre,
      medications: [],
    };

    return group;
  },

  // 計算每日劑量 (order_qty / day)
  calculateDailyDosage(dosage, days) {
    if (!dosage || !days) return '';

    try {
      const dailyDosage = Math.round((parseFloat(dosage) / parseInt(days)) * 10) / 10;
      return dailyDosage.toString();
    } catch (error) {
      console.error('Error calculating daily dosage:', error);
      return '';
    }
  },

  // Add calculation for per-dose amount
  calculatePerDosage(dosage, frequency, days) {
    if (!dosage || !frequency || !days) return '';

    const frequencyMap = {
      'QD': 1, 'QDP': 1, 'DAILY': 1,
      'QAM': 1, 'QPM': 1,
      'QL': 1, 'QN': 1,
      'HS': 1, 'HSP': 1,
      'BID': 2, 'BIDP': 2,
      'TID': 3, 'TIDP': 3,
      'QID': 4, 'QIDP': 4,
      'Q2H': 12, 'Q4H': 6, 'Q6H': 4, 'Q8H': 3, 'Q12H': 2,

      // frequency below QD
      'QOD': 1/2, 'Q2D': 1/2,
      'QW': 1/7, 'BIW': 2/7, 'TIW': 3/7,

      // known special
      'PRN': null, 'PRNB': null, 'ASORDER': null, 'ONCE': null, '需要時': null,
      'STAT': null, 'ST': null,
    };
    const freqRegexStr = Object.keys(frequencyMap).join("|");
    const freqRegex = new RegExp(freqRegexStr, "i");
    const freqMatch = frequency.match(freqRegex);
    if (!freqMatch) {
      console.log('無法識別的頻次:', frequency);
      return 'SPECIAL';
    }

    const freq = freqMatch[0].toUpperCase();
    const timesPerDay = frequencyMap[freq];
    if (!Number.isFinite(timesPerDay)) {
      return 'SPECIAL';
    }

    let totalDoses = parseInt(days) * timesPerDay;

    // e.g. QOD, QW, BIW, TIW
    if (timesPerDay < 1) {
      totalDoses = Math.ceil(totalDoses);
    }

    if (Number.isNaN(totalDoses) || totalDoses <= 0) {
      return 'SPECIAL';
    }

    const perDose = Math.round((parseInt(dosage) / totalDoses) * 10) / 10;
    return perDose.toString();
  },

  // Update formatChineseMedData
  formatChineseMedData(med) {
    const perDosage = this.calculatePerDosage(med.order_qty, med.drug_fre, med.day);
    const dailyDosage = this.calculateDailyDosage(med.order_qty, med.day);

    return {
      name: med.drug_perscrn_name?.trim() || med.cdrug_name?.trim(),
      category: med.cdrug_sosc_name,
      dosage: med.order_qty,
      frequency: med.drug_fre,
      days: med.day,
      type: med.cdrug_dose_name,
      isMulti: med.drug_multi_mark === 'Y',
      sosc_name: med.cdrug_sosc_name || '',
      perDosage: perDosage, // Add the per-dose calculation
      dailyDosage: dailyDosage // Add the daily dosage calculation
    };
  },

  // 排序分組後的資料
  sortGroupedData(grouped) {
    const mapMaxDaysPerHosp = new Map();
    const mapTotalDosagePerHosp = new Map();
    const getHashKey = (group) => JSON.stringify([group.date, group.hosp]);
    const getMaxDaysPerHosp = (group) => mapMaxDaysPerHosp.get(getHashKey(group));
    const getTotalDosagePerHosp = (group) => mapTotalDosagePerHosp.get(getHashKey(group));

    for (const group of Object.values(grouped)) {
      const key = getHashKey(group);
      if (!(group.days <= mapMaxDaysPerHosp.get(key))) {
        mapMaxDaysPerHosp.set(key, group.days);
      }
      mapTotalDosagePerHosp.set(key, group.dosage + (mapTotalDosagePerHosp.get(key) || 0));
    }
    
    return Object.values(grouped)
      .sort((a, b) => {
        // date
        let va = new Date(a.date.replace(/\//g, '-'));
        let vb = new Date(b.date.replace(/\//g, '-'));
        if (vb > va) { return 1; }
        if (vb < va) { return -1; }

        // hosp max days
        va = getMaxDaysPerHosp(a);
        vb = getMaxDaysPerHosp(b);
        if (vb > va) { return 1; }
        if (vb < va) { return -1; }

        // hosp total dosage
        va = getTotalDosagePerHosp(a);
        vb = getTotalDosagePerHosp(b);
        if (vb > va) { return 1; }
        if (vb < va) { return -1; }

        // hosp
        va = a.hosp;
        vb = b.hosp;
        if (vb > va) { return 1; }
        if (vb < va) { return -1; }

        // ICD
        va = a.icd_code;
        vb = b.icd_code;
        if (vb > va) { return 1; }
        if (vb < va) { return -1; }

        // days
        va = a.days;
        vb = b.days;
        if (vb > va) { return 1; }
        if (vb < va) { return -1; }

        // dosage
        va = a.dosage;
        vb = b.dosage;
        if (vb > va) { return 1; }
        if (vb < va) { return -1; }

        return 0;
      });
  },

  // 依照劑量降序排序藥品
  sortMedicationsByDosage(medications) {
    return [...medications].sort((a, b) => b.dosage - a.dosage);
  },

  getMedicationText(med, format, groupInfo) {
    const nameText = `${med.name}`;
    const dosageText = `${med.dailyDosage}g`;
    const effectText = med.sosc_name && groupInfo.showEffectName ? ` - ${med.sosc_name}` : '';

    switch (format) {
      case 'nameWithDosageVertical':
      case 'nameWithDosageHorizontal':
        return `${nameText} ${dosageText}${effectText}`;
      case 'nameVertical':
      case 'nameHorizontal':
      default:
        return nameText;
    }
  },

  // Format Chinese medicine list for copying with different formats
  formatChineseMedList(medications, format, groupInfo) {
    if (format === 'none') {
      return '';
    }

    // Format the header with date, hospital, days and diagnosis
    let header = `${groupInfo.date} - ${groupInfo.hosp} ${groupInfo.days}天 ${groupInfo.freq}`;
    if (groupInfo.showDiagnosis && groupInfo.icd_code && groupInfo.icd_name) {
      header += ` [${groupInfo.icd_code} ${groupInfo.icd_name}]`;
    }

    // 先依照劑量降序排序藥品
    const sortedMedications = this.sortMedicationsByDosage(medications);

    const medicationTexts = sortedMedications.map(med => this.getMedicationText(med, format, groupInfo));

    // Format the full output with header
    if (format.includes('Horizontal')) {
      return `${header}\n${medicationTexts.join(', ')}`;
    } else {
      return `${header}\n${medicationTexts.join('\n')}`;
    }
  },
};