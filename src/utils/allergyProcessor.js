export const allergyProcessor = {
  processAllergyData(data) {
    // console.log('Starting to process allergy data:', data);

    if (!data || !data.rObject || !Array.isArray(data.rObject)) {
      console.log('Invalid allergy data format:', data);
      return [];
    }

    try {
      // 格式化並排序資料
      const formattedData = data.rObject
        .map(item => this.formatAllergyData(item))
        .filter(item => this.isValidAllergyRecord(item)) // 過濾掉不符合條件的項目
        .sort((a, b) => {
          try {
            if (!a.date || !b.date) return 0;
            // 處理日期格式 "YYY/MM/DD" -> "YYYY/MM/DD"
            const dateA = this.convertTWDate(a.date);
            const dateB = this.convertTWDate(b.date);
            return new Date(dateB) - new Date(dateA);
          } catch (error) {
            console.error('Error sorting dates:', error, 'Data:', { a, b });
            return 0;
          }
        });

      return formattedData;
    } catch (error) {
      console.error('Error processing allergy data:', error);
      console.error('Error details:', error.stack);
      return [];
    }
  },

  // 判斷是否為有效的過敏記錄
  isValidAllergyRecord(item) {
    // 檢查日期
    if (!item.date) return false;

    // 使用 Map 儲存無效藥物名稱列表
    const invalidDrugNames = new Map([
      ['未記錄', true],
      ['NP', true],
      ['N.P', true],
      ['N.P.', true]
    ]);

    // 檢查 drug_name
    if (!item.drugName || 
        invalidDrugNames.has(item.drugName) || 
        item.drugName.includes('未過敏')) {
      return false;
    }

    return true;
  },

  // 將民國年日期轉換為西元年日期
  convertTWDate(twDate) {
    if (!twDate) return null;
    try {
      const [year, month, day] = twDate.split('/');
      const westernYear = parseInt(year) + 1911;
      return `${westernYear}/${month}/${day}`;
    } catch (error) {
      console.error('Error converting date:', error, 'Date string:', twDate);
      return null;
    }
  },

  formatAllergyData(item) {
    // 定義預設值的 Map
    const defaultValues = new Map([
      ['drugName', '未記錄'],
      ['symptoms', '未記錄'],
      ['severity', '未記錄'],
      ['hospital', '未記錄']
    ]);

    // 格式化並返回過敏資料
    return {
      date: item.upload_d,
      drugName: item.drug_name?.replace(/;;$/, '') || defaultValues.get('drugName'), // 移除結尾的 ;;
      symptoms: item.sympton_name?.split(';').filter(Boolean).join(', ') || defaultValues.get('symptoms'), // 分割並移除空值
      severity: item.allerg_severity_level || defaultValues.get('severity'),
      hospital: item.hosp?.split(';')[0] || defaultValues.get('hospital')
    };
  }
};