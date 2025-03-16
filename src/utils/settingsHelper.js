// 更新資料狀態的函數
export const updateDataStatus = (setDataStatus) => {
  chrome.runtime.sendMessage({ action: "getDataStatus" }, (response) => {
    console.log("DATA STATUS RESPONSE:", response);
    
    if (response && response.dataStatus) {
      // Make a copy to avoid direct state mutation
      const updatedStatus = { ...response.dataStatus };
      
      // Add any missing entries with default values
      const expectedKeys = [
        'medication', 'labData', 'chineseMed', 'imaging', 
        'allergy', 'surgery', 'discharge', 'medDays', 'patientSummary'
      ];
      
      expectedKeys.forEach(key => {
        if (!updatedStatus[key]) {
          updatedStatus[key] = { status: 'none', count: 0 };
        }
      });
      
      console.log("PROCESSED STATUS FOR UI:", updatedStatus);
      setDataStatus(updatedStatus);
    }
  });
};

// 從存儲鍵獲取狀態鍵的輔助函數
const getStatusKeyFromStorageKey = (storageKey) => {
  const mapping = {
    'medicationData': 'medication',
    'labData': 'labData',
    'chinesemedData': 'chineseMed',
    'imagingData': 'imaging',
    'allergyData': 'allergy',
    'surgeryData': 'surgery',
    'dischargeData': 'discharge',
    'medDaysData': 'medDays',
    'patientSummaryData': 'patientSummary'
  };
  return mapping[storageKey] || storageKey;
};

// 設定變更處理函數
export const handleSettingChange = (settingName, value, setLocalState, localStateProp, settingType) => {
  // Update local component state
  if (setLocalState && localStateProp) {
    setLocalState(prev => ({
      ...prev,
      [localStateProp]: value
    }));
  }
  
  // Save to Chrome storage
  chrome.storage.sync.set({ [settingName]: value }, () => {
    console.log(`Setting updated: ${settingName} = ${JSON.stringify(value)}`);
    
    // Notify content script of setting change
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'settingChanged',
          setting: settingName,
          value: value,
          settingType: settingType
        });
      }
    });
  });
};

// 手動擷取資料處理函數
export const handleFetchData = (setDataStatus) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'manualDataFetch' }, 
        (response) => {
          if (response && response.status === 'started') {
            console.log('Manual data fetch initiated');
            
            // Update status after a delay to allow fetch to complete
            setTimeout(() => {
              updateDataStatus(setDataStatus);
            }, 2000);
          }
        }
      );
    }
  });
};

// 清除資料處理函數
export const handleClearData = (setDataStatus) => {
  chrome.storage.local.remove([
    'medicationData', 
    'labData', 
    'chinesemedData', 
    'imagingData',
    'allergyData',
    'surgeryData',
    'dischargeData',
    'medDaysData'
  ], () => {
    console.log('All data cleared from storage');
    updateDataStatus(setDataStatus);
    
    // Notify content script to clear data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'clearData' });
      }
    });
  });
}; 