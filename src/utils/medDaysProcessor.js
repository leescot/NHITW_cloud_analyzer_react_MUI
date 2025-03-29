export const medDaysProcessor = {
  processMedDaysData(data) {
    // console.log('Starting to process medication days data:', data);

    if (!data || !data.rObject || !Array.isArray(data.rObject)) {
      console.log('Invalid medication days data format:', data);
      return [];
    }

    try {
      // 處理巢狀結構
      const allMedDays = data.rObject.reduce((acc, item) => {
        if (item.robject && Array.isArray(item.robject)) {
          acc.push(...item.robject);
        }
        return acc;
      }, []);

      // 格式化並排序資料（依到期日排序）
      const formattedData = allMedDays
        .map(item => this.formatMedDaysData(item))
        .filter(item => item.expiryDate && item.remainingDays > 0) // 只顯示還有剩餘天數的藥物
        .sort((a, b) => {
          try {
            if (!a.expiryDate || !b.expiryDate) return 0;
            const dateA = new Date(a.expiryDate.replace(/\//g, '-'));
            const dateB = new Date(b.expiryDate.replace(/\//g, '-'));
            return dateA - dateB; // 依到期日升序排序
          } catch (error) {
            console.error('Error sorting dates:', error, 'Data:', { a, b });
            return 0;
          }
        });

      return formattedData;
    } catch (error) {
      console.error('Error processing medication days data:', error);
      console.error('Error details:', error.stack);
      return [];
    }
  },

  formatMedDaysData(item) {
    return {
      // 只取"，"前的藥名
      drugName: item.ingredient?.split('，')[0] || '未記錄',
      remainingDays: parseInt(item.pres_med_day) || 0,
      expiryDate: item.edate || '未記錄'
    };
  }
};