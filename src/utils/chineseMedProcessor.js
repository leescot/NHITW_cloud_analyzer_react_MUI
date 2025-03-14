export const chineseMedProcessor = {
  // 處理中藥資料的主要函數
  processChineseMedData(data) {
    // console.log('Starting to process Chinese medicine data:', data);
    
    if (!data || !data.rObject || !Array.isArray(data.rObject)) {
      console.log('Invalid Chinese medicine data format:', data);
      return [];
    }

    try {
      // 將資料依照日期和 ICD 代碼分組
      const grouped = this.groupChineseMedsByDateAndICD(data.rObject);
      // console.log('Grouped Chinese medicine data:', grouped);

      // 轉換為陣列並依日期排序
      const sortedGroups = this.sortGroupedData(grouped);
      // console.log('Final sorted Chinese medicine groups:', sortedGroups);

      return sortedGroups;
    } catch (error) {
      console.error('Error processing Chinese medicine data:', error);
      console.error('Error details:', error.stack);
      return [];
    }
  },

  // 將中藥資料依照日期和 ICD 代碼分組
  groupChineseMedsByDateAndICD(medications) {
    return medications.reduce((acc, med) => {
      // console.log('Processing single Chinese medicine:', med);
      
      // 從 func_date 取得日期並格式化
      const date = this.formatDate(med.func_date);
      if (!date || !med.icd_code) {
        // console.log('Skipping item due to missing date or ICD code:', med);
        return acc;
      }

      const key = `${date}_${med.icd_code}`;
      // console.log('Generated key:', key);
      
      if (!acc[key]) {
        acc[key] = this.createNewGroup(med, date);
        // console.log('Created new group for key:', key);
      }

      acc[key].medications.push(this.formatChineseMedData(med));
      // console.log('Added Chinese medicine to group:', key);

      return acc;
    }, {});
  },

  // 格式化日期 (從 "YYYY-MM-DDT00:00:00" 轉為 "YYYY/MM/DD")
  formatDate(dateStr) {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  },

  // 創建新的分組
  createNewGroup(med, formattedDate) {
    return {
      date: formattedDate,
      icd_code: med.icd_code,
      icd_name: med.icd_cname,
      hosp: med.hosp.split(';')[0],
      medications: []
    };
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
      'QD': 1, 'QDP': 1, 'QAM': 1, 'QPM': 1, 
      'BID': 2, 'BIDP': 2, 
      'TID': 3, 'TIDP': 3, 
      'QID': 4, 'QIDP': 4,
      'Q2H': 12, 'Q4H': 6, 'Q6H': 4, 'Q8H': 3,
      'Q12H': 2, 'HS': 1, 'HSP': 1, 'DAILY': 1, 'QN': 1, 'STAT': 1, 'ST': 1 
    };

    const freqMatch = frequency.toUpperCase().match(/QD|QDP|BID|BIDP|TID|TIDP|QID|QIDP|Q2H|Q4H|Q6H|Q8H|Q12H|HS|HSP|PRN|QOD|TIW|BIW|QW|DAILY/);
    if (!freqMatch && !frequency.includes('需要時')) {
      console.log('無法識別的頻次:', frequency);
      return 'SPECIAL';
    }

    let totalDoses;
    const freq = freqMatch ? freqMatch[0] : 'PRN';
    
    if (frequency.includes('QOD') || frequency.includes('Q2D')) {
      totalDoses = Math.ceil(parseInt(days) / 2);
    } else if (frequency.includes('TIW')) {
      totalDoses = Math.ceil(parseInt(days) * 3 / 7);
    } else if (frequency.includes('BIW')) {
      totalDoses = Math.ceil(parseInt(days) * 2 / 7);
    } else if (frequency.includes('QW')) {
      totalDoses = Math.ceil(parseInt(days) / 7);
    } else if (freq === 'PRN' || frequency.includes('需要時')) {
      return 'SPECIAL';
    } else {
      const timesPerDay = frequencyMap[freq] || 1;
      totalDoses = parseInt(days) * timesPerDay;
    }
    
    if (isNaN(totalDoses) || totalDoses <= 0) {
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
    return Object.values(grouped)
      .sort((a, b) => {
        const dateA = new Date(a.date.replace(/\//g, '-'));
        const dateB = new Date(b.date.replace(/\//g, '-'));
        return dateB - dateA;
      });
  },

  // Format Chinese medicine list for copying with different formats
  formatChineseMedList(medications, format, groupInfo) {
    if (format === 'none') {
      return '';
    }
    
    // Format the header with date, hospital and diagnosis
    let header = `${groupInfo.date} - ${groupInfo.hosp}`;
    if (groupInfo.showDiagnosis && groupInfo.icd_code && groupInfo.icd_name) {
      header += ` [${groupInfo.icd_code} ${groupInfo.icd_name}]`;
    }
    
    const getMedicationText = (med) => {
      const nameText = `${med.name}${med.isMulti ? ' (複方)' : ''}`;
      const newFormatText = `${med.dailyDosage}g ${med.frequency}`;
      const oldDosageText = med.perDosage === 'SPECIAL' 
        ? `總量${med.dosage}` 
        : `${med.perDosage}#`;
      const oldUsageText = `${oldDosageText} ${med.frequency} / ${med.days}天`;
      const effectText = med.sosc_name && groupInfo.showEffectName ? ` - ${med.sosc_name}` : '';
      
      switch (format) {
        case 'nameVertical':
          return nameText;
        case 'nameWithDosageVertical':
          return `${nameText} ${newFormatText}${effectText}`;
        case 'nameHorizontal':
          return nameText;
        case 'nameWithDosageHorizontal':
          return `${nameText} ${newFormatText}${effectText}`;
        default:
          return nameText;
      }
    };
    
    const medicationTexts = medications.map(med => getMedicationText(med));
    
    // Format the full output with header
    if (format.includes('Horizontal')) {
      return `${header}\n${medicationTexts.join(', ')}`;
    } else {
      return `${header}\n${medicationTexts.join('\n')}`;
    }
  }
}; 