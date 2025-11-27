/**
 * cancerScreeningProcessor.js
 * 處理癌症篩檢資料的相關函數
 */

export const cancerScreeningProcessor = {
  /**
   * 處理癌症篩檢資料
   * @param {Object} rawData - 原始資料
   * @returns {Object} - 處理後的資料
   */
  processCancerScreeningData(rawData) {
    try {
      // Check for data in rawData.rObject (standard structure)
      if (rawData?.rObject?.result_data) {
        // Return the result_data directly
        return {
          result_data: rawData.rObject.result_data
        };
      }

      // No valid data found
      return { result_data: null };
    } catch (error) {
      console.error('Error processing cancer screening data:', error);
      return { result_data: null };
    }
  }
};