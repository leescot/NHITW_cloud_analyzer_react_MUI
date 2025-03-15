/**
 * NHI 本地資料處理器
 * 負責處理從本地上傳的 JSON 檔案，分類資料，並存儲在本地變數中
 */

// 儲存處理過的資料
const localData = {
    medication: null,
    labData: null,
    chineseMed: null,
    imaging: null,
    allergy: null,
    surgery: null,
    discharge: null,
    medDays: null,
    patientSummary: null
};

// 資料狀態
const dataStatus = {
    medication: { status: 'none', message: '未載入' },
    labData: { status: 'none', message: '未載入' },
    chineseMed: { status: 'none', message: '未載入' },
    imaging: { status: 'none', message: '未載入' },
    allergy: { status: 'none', message: '未載入' },
    surgery: { status: 'none', message: '未載入' },
    discharge: { status: 'none', message: '未載入' },
    medDays: { status: 'none', message: '未載入' },
    patientSummary: { status: 'none', message: '未載入' }
};

/**
 * 處理 JSON 資料
 * @param {Object} jsonData - 解析後的 JSON 資料
 * @param {Function} callback - 處理完成後的回呼函數
 */
function processJSONData(jsonData, callback) {
    console.log('開始處理 JSON 資料', jsonData);
    
    // 重置所有狀態為'loading'
    for (const key in dataStatus) {
        dataStatus[key] = { status: 'loading', message: '載入中...' };
    }
    
    try {
        // 檢查不同種類的資料並處理
        if (jsonData.medication) {
            localData.medication = jsonData.medication;
            dataStatus.medication = { 
                status: 'success', 
                message: `已載入 ${getItemCount(jsonData.medication)} 筆` 
            };
            
            // 通知擴充功能資料已準備好
            notifyExtension('medication', jsonData.medication);
        }
        
        if (jsonData.lab) {
            localData.labData = jsonData.lab;
            dataStatus.labData = { 
                status: 'success', 
                message: `已載入 ${getItemCount(jsonData.lab)} 筆` 
            };
            
            notifyExtension('labData', jsonData.lab);
        }
        
        if (jsonData.chinesemed) {
            localData.chineseMed = jsonData.chinesemed;
            dataStatus.chineseMed = { 
                status: 'success', 
                message: `已載入 ${getItemCount(jsonData.chinesemed)} 筆` 
            };
            
            notifyExtension('chineseMed', jsonData.chinesemed);
        }
        
        if (jsonData.imaging) {
            localData.imaging = jsonData.imaging;
            dataStatus.imaging = { 
                status: 'success', 
                message: `已載入 ${getItemCount(jsonData.imaging)} 筆` 
            };
            
            notifyExtension('imaging', jsonData.imaging);
        }
        
        if (jsonData.allergy) {
            localData.allergy = jsonData.allergy;
            dataStatus.allergy = { 
                status: 'success', 
                message: `已載入 ${getItemCount(jsonData.allergy)} 筆` 
            };
            
            notifyExtension('allergy', jsonData.allergy);
        }
        
        if (jsonData.surgery) {
            localData.surgery = jsonData.surgery;
            dataStatus.surgery = { 
                status: 'success', 
                message: `已載入 ${getItemCount(jsonData.surgery)} 筆` 
            };
            
            notifyExtension('surgery', jsonData.surgery);
        }
        
        if (jsonData.discharge) {
            localData.discharge = jsonData.discharge;
            dataStatus.discharge = { 
                status: 'success', 
                message: `已載入 ${getItemCount(jsonData.discharge)} 筆` 
            };
            
            notifyExtension('discharge', jsonData.discharge);
        }
        
        if (jsonData.medDays) {
            localData.medDays = jsonData.medDays;
            dataStatus.medDays = { 
                status: 'success', 
                message: `已載入 ${getItemCount(jsonData.medDays)} 筆` 
            };
            
            notifyExtension('medDays', jsonData.medDays);
        }
        
        if (jsonData.patientSummary) {
            localData.patientSummary = jsonData.patientSummary;
            dataStatus.patientSummary = { 
                status: 'success', 
                message: `已載入` 
            };
            
            notifyExtension('patientSummary', jsonData.patientSummary);
        }
        
        // 更新沒有數據的狀態為'none'
        for (const key in dataStatus) {
            if (dataStatus[key].status === 'loading') {
                dataStatus[key] = { status: 'none', message: '未載入' };
            }
        }
        
        // 完成回調
        if (callback) {
            callback({
                success: true,
                message: '資料處理完成',
                loadedTypes: Object.keys(dataStatus).filter(key => dataStatus[key].status === 'success')
            });
        }
    } catch (error) {
        console.error('處理 JSON 資料時出錯:', error);
        
        // 將所有'loading'狀態改為'error'
        for (const key in dataStatus) {
            if (dataStatus[key].status === 'loading') {
                dataStatus[key] = { status: 'error', message: '載入失敗' };
            }
        }
        
        if (callback) {
            callback({
                success: false,
                message: `處理資料時出錯: ${error.message}`,
                error: error
            });
        }
    }
}

/**
 * 獲取項目數量
 * @param {Object|Array} data - 資料物件或陣列
 * @returns {number} - 項目數量
 */
function getItemCount(data) {
    if (!data) return 0;
    
    if (Array.isArray(data)) {
        return data.length;
    }
    
    if (data.data && Array.isArray(data.data)) {
        return data.data.length;
    }
    
    if (typeof data === 'object') {
        // 嘗試檢測常見格式
        if (data.medication_data && Array.isArray(data.medication_data)) {
            return data.medication_data.length;
        }
        
        if (data.lab_data && Array.isArray(data.lab_data)) {
            return data.lab_data.length;
        }
        
        if (data.results && Array.isArray(data.results)) {
            return data.results.length;
        }
        
        // 如果以上都不符合，嘗試找第一個陣列屬性
        for (const key in data) {
            if (Array.isArray(data[key])) {
                return data[key].length;
            }
        }
    }
    
    return 1; // 如果無法確定數量，默認為1
}

/**
 * 通知擴充功能資料已準備好
 * @param {string} dataType - 資料類型
 * @param {Object} data - 資料對象
 */
function notifyExtension(dataType, data) {
    console.log(`通知擴充功能: ${dataType} 資料已準備好`);
    
    // 使用 postMessage 通知擴充功能
    window.postMessage({
        type: 'dataForExtension',
        dataType: dataType,
        data: JSON.parse(JSON.stringify(data)) // 深拷貝避免引用問題
    }, '*');
    
    // 使用自定義事件通知
    const event = new CustomEvent('dataFetchCompleted', {
        detail: { type: dataType }
    });
    window.dispatchEvent(event);
}

/**
 * 獲取資料狀態
 * @param {string} dataType - 資料類型
 * @returns {Object} - 資料狀態對象 { status, message }
 */
function getDataStatus(dataType) {
    return dataStatus[dataType] || { status: 'none', message: '未知' };
}

/**
 * 獲取指定類型的資料
 * @param {string} dataType - 資料類型
 * @returns {Object} - 資料對象
 */
function getDataByType(dataType) {
    return localData[dataType];
}

/**
 * 清除所有資料
 */
function clearAllData() {
    for (const key in localData) {
        localData[key] = null;
        dataStatus[key] = { status: 'none', message: '未載入' };
    }
    
    // 通知擴充功能資料已清除
    window.postMessage({
        type: 'localDataCleared'
    }, '*');
}

// 導出函數供頁面使用
window.processJSONData = processJSONData;
window.getDataStatus = getDataStatus;
window.getDataByType = getDataByType;
window.clearAllData = clearAllData; 