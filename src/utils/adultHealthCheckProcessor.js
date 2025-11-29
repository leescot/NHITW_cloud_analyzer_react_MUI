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
      // 1. Try to get data from rObject array (new normalized format)
      if (rawData?.rObject && Array.isArray(rawData.rObject) && rawData.rObject.length > 0) {
        // The data we want is in the first element of the array
        return rawData.rObject[0];
      }

      // 2. Try to get data from originalData (new normalized format fallback)
      if (rawData?.originalData?.robject) {
        return rawData.originalData.robject;
      }

      // 3. Try to get data directly (legacy format or direct object)
      if (rawData?.result_data) {
        return rawData;
      }

      // 4. Try to get from rObject if it's not an array (unexpected but possible legacy)
      if (rawData?.rObject?.result_data) {
        return rawData.rObject;
      }

      // No valid data found
      return { result_data: null };
    } catch (error) {
      console.error('Error processing adult health check data:', error);
      return { result_data: null };
    }
  }
}; 