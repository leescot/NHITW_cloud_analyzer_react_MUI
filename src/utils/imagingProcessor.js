export const imagingProcessor = {
  processImagingData(data) {
    if (!data || !data.rObject) {
      console.error('Invalid imaging data:', data);
      return { withReport: [], withoutReport: [] };
    }

    // console.log('Processing imaging data:', data.rObject); // 添加調試信息

    // 處理影像檢查資料
    const withReport = [];
    const withoutReport = [];

    data.rObject.forEach(item => {
      // 保存原始數據中與影像相關的欄位
      const processedItem = {
        date: this.formatDate(item.real_inspect_date || item.case_time || item.recipe_date),
        hosp: (item.hosp || '').split(';')[0],
        orderName: (item.order_name || '').replace(/;/g, '\n'),
        inspectResult: item.inspect_result || '',
        // 關鍵：加入 order_code 欄位，用於後續整合影像和報告
        order_code: item.order_code || '',
        // 關鍵：保存所有與影像查看相關的欄位
        ipl_case_seq_no: item.ipl_case_seq_no || '',
        ctmri_mark: item.ctmri_mark || '',
        read_pos: item.read_pos || '2',
        ord_mark: item.ord_mark || '',
        file_type: item.file_type || 'DCF',
        file_qty: item.file_qty || '2',
        // 加入原始檢查日期，用於整合影像和報告
        real_inspect_date: item.real_inspect_date || '',
        // 加入 cure_path_name 欄位，用於顯示檢查部位
        cure_path_name: item.cure_path_name || ''
      };

      // 檢查是否有報告結果
      if (processedItem.inspectResult) {
        withReport.push(processedItem);
      } else {
        withoutReport.push(processedItem);
      }
    });

    // console.log('Processed imaging data:', { withReport, withoutReport }); // 添加調試信息

    return {
      withReport: withReport,
      withoutReport: withoutReport
    };
  },

  formatDate(dateStr) {
    if (!dateStr) return '';

    // 處理日期格式
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // 西元年
      const year = parts[0].length === 4 ? parts[0] : String(parseInt(parts[0]) + 1911);
      return `${year}/${parts[1]}/${parts[2]}`;
    }

    return dateStr;
  }
};