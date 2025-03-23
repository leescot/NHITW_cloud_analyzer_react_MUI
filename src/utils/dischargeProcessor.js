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
        .filter(item => item.out_date) // 過濾掉沒有出院日期的項目
        .sort((a, b) => {
          try {
            if (!a.out_date || !b.out_date) return 0;
            const dateA = new Date(a.out_date);
            const dateB = new Date(b.out_date);
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
      // 保留原始 in_date 和 out_date 以供日期格式化使用
      in_date: item.in_date || '',
      out_date: item.out_date || '',
      date: item.out_date?.split('T')[0], // 為了向後兼容，保留 date 字段
      hospital: item.hosp?.split(';')[0] || '未記錄',
      hosp: item.hosp || '', // 保留原始 hosp 欄位
      icd_code: item.icd_code || '',
      icd_cname: item.icd_cname || '',
      mds_file: item.mds_file || '',
      mds_pdf_file: item.mds_pdf_file || ''
    };
  }
};