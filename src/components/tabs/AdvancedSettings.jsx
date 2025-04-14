import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Divider
} from '@mui/material';

// Import settings pages
import MedicationCustomFormatEditor from './MedicationCustomFormatEditor';
import LabCustomFormatEditor from './LabCustomFormatEditor';

// Import icons
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
// Other icons can be imported for future settings pages

/**
 * 進階設定主組件 - 管理多個設定頁面
 */
const AdvancedSettings = ({ appSettings, setAppSettings, generalDisplaySettings }) => {
  // 當前選擇的設定頁面索引
  const [settingsTabIndex, setSettingsTabIndex] = useState(0);
  // 是否啟用實驗室自訂複製格式
  const [enableLabCustomFormat, setEnableLabCustomFormat] = useState(false);

  // 獲取設定狀態
  useEffect(() => {
    chrome.storage.sync.get(
      {
        enableLabCustomCopyFormat: false
      },
      (items) => {
        setEnableLabCustomFormat(items.enableLabCustomCopyFormat);
      }
    );

    // 監聽設定變更事件
    const handleSettingChangedEvent = (event) => {
      const { key, value } = event.detail;
      if (key === 'enableLabCustomCopyFormat') {
        setEnableLabCustomFormat(value);
      }
    };

    window.addEventListener('settingChanged', handleSettingChangedEvent);

    // 清理事件監聽
    return () => {
      window.removeEventListener('settingChanged', handleSettingChangedEvent);
    };
  }, []);

  // 處理設定頁籤變更
  const handleSettingsTabChange = (event, newValue) => {
    setSettingsTabIndex(newValue);
  };

  return (
    <Box sx={{ pt: 0, px: 1, pb: 1 }}>
      {/* 進階設定標題 */}
      {/* <Typography variant="h5" fontWeight="medium" sx={{ mb: 2 }}>
        進階設定
      </Typography> */}
      
      {/* 設定頁籤選擇 */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 1, 
          backgroundColor: '#f5f9ff',
          borderRadius: '8px', 
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={settingsTabIndex}
          onChange={handleSettingsTabChange}
          variant="scrollable"
          scrollButtons="auto"
          TabIndicatorProps={{
            style: {
              backgroundColor: '#1976d2',
              height: 1.5,
            },
          }}
          sx={{
            minHeight: '36px',
            '& .MuiTab-root': {
              minHeight: '36px',
              padding: '4px 16px',
              fontWeight: 'medium',
              fontSize: (generalDisplaySettings?.contentTextSize) || 'medium',
            },
          }}
        >
          <Tab 
            label="西藥自訂複製格式" 
            icon={<MedicationIcon sx={{ fontSize: '1rem' }} />}
            iconPosition="start"
          />
          {enableLabCustomFormat && (
            <Tab 
              label="檢驗複製格式" 
              icon={<ScienceIcon sx={{ fontSize: '1rem' }} />}
              iconPosition="start"
            />
          )}
          {/* 在這裡可以加入更多的設定頁籤 */}
        </Tabs>
      </Paper>
      
      <Divider sx={{ mb: 1 }} />
      
      {/* 設定頁面內容 */}
      <Box role="tabpanel" hidden={settingsTabIndex !== 0}>
        {settingsTabIndex === 0 && (
          <MedicationCustomFormatEditor 
            appSettings={appSettings} 
            setAppSettings={setAppSettings} 
            generalDisplaySettings={generalDisplaySettings} 
          />
        )}
      </Box>
      
      {/* 檢驗複製格式設定頁面 */}
      {enableLabCustomFormat && (
        <Box role="tabpanel" hidden={settingsTabIndex !== 1}>
          {settingsTabIndex === 1 && (
            <LabCustomFormatEditor 
              appSettings={appSettings} 
              setAppSettings={setAppSettings} 
              generalDisplaySettings={generalDisplaySettings} 
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default AdvancedSettings; 