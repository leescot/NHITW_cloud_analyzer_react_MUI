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
        // Deep copy the raw data to avoid reference issues
        const originalData = {
          robject: {
            result_data: JSON.parse(JSON.stringify(rawData.rObject.result_data))
          }
        };
        
        // Process data into the expected format
        const processedData = {
          originalData
        };
        
        return processedData;
      }
      
      // Check for data in rawData.originalData.robject (alternative structure)
      if (rawData?.originalData?.robject) {
        // Deep copy the raw data to avoid reference issues
        const originalData = {
          robject: {
            result_data: JSON.parse(JSON.stringify(rawData.originalData.robject))
          }
        };
        
        // Process data into the expected format
        const processedData = {
          originalData
        };
        
        return processedData;
      }
      
      return { originalData: null };
    } catch (error) {
      return { originalData: null };
    }
  }
}; 