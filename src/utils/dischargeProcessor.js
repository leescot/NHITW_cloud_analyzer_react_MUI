export const dischargeProcessor = {
  processDischargeData(data) {
    // console.log('Starting to process discharge data:', data);
    
    if (!data || !data.rObject || !Array.isArray(data.rObject)) {
      console.log('Invalid discharge data format:', data);
      return [];
    }

    try {
      // 格式化並排序資料
      const formattedData = data.rObject
        .map(item => this.formatDischargeData(item))
        .filter(item => item.date) // 過濾掉沒有日期的項目
        .sort((a, b) => {
          try {
            if (!a.date || !b.date) return 0;
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
          } catch (error) {
            console.error('Error sorting dates:', error, 'Data:', { a, b });
            return 0;
          }
        });

      return formattedData;
    } catch (error) {
      console.error('Error processing discharge data:', error);
      console.error('Error details:', error.stack);
      return [];
    }
  },

  formatDischargeData(item) {
    return {
      date: item.out_date?.split('T')[0], // 只取日期部分
      hospital: item.hosp?.split(';')[0] || '未記錄',
      icd_code: item.icd_code || '',
      icd_cname: item.icd_cname || '',
      mds_file: item.mds_file || '',
      mds_pdf_file: item.mds_pdf_file || ''
    };
  }
};