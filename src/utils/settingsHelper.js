// 更新資料狀態的函數
export const updateDataStatus = (setDataStatus) => {
  chrome.runtime.sendMessage({ action: "getDataStatus" }, (response) => {
    console.log("DATA STATUS RESPONSE:", response);

    if (response && response.dataStatus) {
      // Make a copy to avoid direct state mutation
      const updatedStatus = { ...response.dataStatus };

      // 使用 Map 存儲預期的鍵和默認值
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

// 從存儲鍵獲取狀態鍵的輔助函數 - 使用 Map 代替對象映射
const storageToStatusKeyMap = new Map([
  ['medicationData', 'medication'],
  ['labData', 'labData'],
  ['chinesemedData', 'chineseMed'],
  ['imagingData', 'imaging'],
  ['allergyData', 'allergy'],
  ['surgeryData', 'surgery'],
  ['dischargeData', 'discharge'],
  ['medDaysData', 'medDays'],
  ['patientSummaryData', 'patientSummary']
]);

// 從存儲鍵獲取狀態鍵的輔助函數
const getStatusKeyFromStorageKey = (storageKey) => {
  return storageToStatusKeyMap.get(storageKey) || storageKey;
};

// 設定變更處理函數
export const handleSettingChange = (settingName, value, setLocalState, localStateProp, settingType) => {
  // Add special logging for displayLabFormat changes
  if (settingName === 'displayLabFormat') {
    console.log(`CHANGING LAB DISPLAY FORMAT TO: ${value}`);
  }

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

    // Special logging for displayLabFormat
    if (settingName === 'displayLabFormat') {
      chrome.storage.sync.get('displayLabFormat', (items) => {
        console.log(`Verified displayLabFormat in storage: ${items.displayLabFormat}`);
      });
    }

    // Notify content script of setting change
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'settingChanged',
          setting: settingName,
          value: value,
          settingType: settingType || 'general' // 使用傳入的 settingType 或預設為 'general'
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
  // 使用 Array 存儲需要清除的數據鍵
  const dataKeysToRemove = [
    'medicationData',
    'labData',
    'chinesemedData',
    'imagingData',
    'allergyData',
    'surgeryData',
    'dischargeData',
    'medDaysData'
  ];

  chrome.storage.local.remove(dataKeysToRemove, () => {
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