/**
 * adultHealthCheckProcessor.js
 * 處理成人預防保健資料的相關函數
 */

export const adultHealthCheckProcessor = {
  /**
   * 處理成人預防保健資料
   * @param {Object} rawData - 原始資料
   * @returns {Object} - 處理後的資料
   */
  processAdultHealthCheckData(rawData) {
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
      console.error('Error processing adult health check data:', error);
      return { result_data: null };
    }
  }
}; 