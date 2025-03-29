export const surgeryProcessor = {
  processSurgeryData(data) {
    // console.log('Starting to process surgery data:', data);

    if (!data || !data.rObject || !Array.isArray(data.rObject)) {
      console.log('Invalid surgery data format:', data);
      return [];
    }

    try {
      // 格式化並排序資料
      const formattedData = data.rObject
        .map(item => this.formatSurgeryData(item))
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
      console.error('Error processing surgery data:', error);
      console.error('Error details:', error.stack);
      return [];
    }
  },

  formatSurgeryData(item) {
    return {
      date: item.exe_s_date?.split('T')[0], // 只取日期部分
      hospital: item.hosp?.split(';')[0] || '未記錄',
      diagnosis: item.icd_code && item.icd_cname
        ? `${item.icd_code} ${item.icd_cname}`
        : (item.icd_code || item.icd_cname || '未記錄'),
      orderCode: item.order_code || '未記錄'
    };
  }
};