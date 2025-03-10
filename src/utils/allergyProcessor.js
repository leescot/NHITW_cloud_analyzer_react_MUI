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
        .filter(item => item.date) // 過濾掉沒有日期的項目
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
    return {
      date: item.upload_d,
      drugName: item.drug_name?.replace(/;;$/, '') || '未記錄', // 移除結尾的 ;;
      symptoms: item.sympton_name?.split(';').filter(Boolean).join(', ') || '未記錄', // 分割並移除空值
      severity: item.allerg_severity_level || '未記錄',
      hospital: item.hosp?.split(';')[0] || '未記錄'
    };
  }
}; 