// hbcvdataProcessor.js
// 處理B、C肝炎專區資料

/**
 * 處理B、C肝炎專區資料
 * @param {Object} rawData - 原始資料
 * @returns {Object} - 處理後的資料
 */
export const processHbcvdataData = (rawData) => {
    console.log("[hbcvdataProcessor] Processing hbcvdata:", rawData);

    if (!rawData) {
        console.log("[hbcvdataProcessor] No data to process");
        return null;
    }

    // 直接返回原始資料，因為資料結構已經符合需求
    // 資料結構包含 rObject[0] 其中有 result_data, med_data, inspection_data 等
    console.log("[hbcvdataProcessor] Returning processed data:", rawData);
    return rawData;
};

export const hbcvdataProcessor = {
    processHbcvdataData
};
