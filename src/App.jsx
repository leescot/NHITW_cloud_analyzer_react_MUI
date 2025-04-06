import React, { useEffect } from 'react';

import { updateDataStatus } from './utils/settingsHelper.js';

function App() {
  useEffect(() => {
    console.log('PopupSettings 組件已掛載');

    // 立即更新資料狀態
    updateDataStatus();

    // 添加儲存變更的監聽器
    const handleStorageChange = (changes, area) => {
      console.log('儲存變更事件觸發:', changes);
      if (area === 'local') {
        console.log('本地儲存變更, 更新資料狀態');
        updateDataStatus();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // 設定定期檢查
    const intervalId = setInterval(() => {
      console.log('定期檢查資料狀態');
      updateDataStatus();
    }, 3000);

    // 清理監聽器和間隔
    return () => {
      console.log('清理 PopupSettings 組件');
      chrome.storage.onChanged.removeListener(handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="app-container">
      <h1>NHI Cloud Data Extractor</h1>
      <p>This is the main application component, but it's not used in the Chrome extension context.</p>
      <p>The extension functionality is provided through the content script and popup.</p>
    </div>
  );
}

export default App;