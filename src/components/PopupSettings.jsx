import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  AppBar,
  Toolbar,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';

// 導入拆分出的組件
import DataStatusTab from './settings/DataStatusTab';
import GeneralDisplaySettings from './settings/GeneralDisplaySettings';
import MedicationSettings from './settings/MedicationSettings';
import ChineseMedicationSettings from './settings/ChineseMedicationSettings';
import LabSettings from './settings/LabSettings';
import OverviewSettings from './settings/OverviewSettings';
import { updateDataStatus } from '../utils/settingsHelper';

// 新增下載功能
const handleDownloadJSON = (setDownloading, setSnackbar) => {
  setDownloading(true);
  
  // 從 content script 獲取所有資料
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0] || !tabs[0].id) {
      setDownloading(false);
      setSnackbar({
        open: true,
        message: '無法獲取當前標籤頁資訊',
        severity: 'error'
      });
      return;
    }
    
    try {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getPatientData" }, function(response) {
        setDownloading(false);
        
        // 處理 chrome 錯誤
        if (chrome.runtime.lastError) {
          setSnackbar({
            open: true,
            message: '與內容腳本通訊失敗，請確認頁面已正確載入',
            severity: 'error'
          });
          return;
        }
        
        // 檢查回應是否存在
        if (!response) {
          setSnackbar({
            open: true,
            message: '未收到回應，請重新整理頁面後再試',
            severity: 'error'
          });
          return;
        }
        
        // 檢查是否有錯誤訊息
        if (response.error) {
          setSnackbar({
            open: true,
            message: response.error,
            severity: 'error'
          });
          return;
        }
        
        // 檢查是否已直接由內容腳本處理下載
        if (response.directDownload || response.status === "success") {
          setSnackbar({
            open: true,
            message: '資料下載成功',
            severity: 'success'
          });
          return;
        }
        
        // 預設錯誤處理
        // setSnackbar({
        //   open: true,
        //   message: '處理資料時發生異常，請重試',
        //   severity: 'error'
        // });
      });
    } catch (err) {
      setDownloading(false);
      setSnackbar({
        open: true,
        message: '與內容腳本通訊時發生錯誤',
        severity: 'error'
      });
    }
  });
};

const PopupSettings = () => {
  const [dataStatus, setDataStatus] = useState({
    medication: { status: 'none', count: 0 },
    labData: { status: 'none', count: 0 },
    chineseMed: { status: 'none', count: 0 },
    imaging: { status: 'none', count: 0 },
    allergy: { status: 'none', count: 0 },
    surgery: { status: 'none', count: 0 },
    discharge: { status: 'none', count: 0 },
    medDays: { status: 'none', count: 0 }
  });
  
  // 新增下載狀態與通知
  const [downloading, setDownloading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Add tab state
  const [activeTab, setActiveTab] = useState(0);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 組件掛載時初始化
  useEffect(() => {
    console.log('PopupSettings 組件已掛載');
    
    // 立即更新資料狀態
    updateDataStatus(setDataStatus);
    
    // 添加儲存變更的監聽器
    const handleStorageChange = (changes, area) => {
      if (area === 'local') {
        updateDataStatus(setDataStatus);
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    // 設定定期檢查 (每3秒檢查一次)
    const intervalId = setInterval(() => {
      updateDataStatus(setDataStatus);
    }, 3000);
    
    // 清理監聽器和間隔
    return () => {
      console.log('清理 PopupSettings 組件');
      chrome.storage.onChanged.removeListener(handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={0}>
        {/* <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            NHI Cloud Data Extractor
          </Typography>
        </Toolbar> */}
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<SettingsIcon />} label="設定" />
          <Tab icon={<InfoIcon />} label="資料狀態" />
          
        </Tabs>
      </AppBar>
      {/* Settings Tab */}
      {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <GeneralDisplaySettings />
            <OverviewSettings />
            <MedicationSettings />
            <ChineseMedicationSettings />
            <LabSettings />
          </Box>
        )}

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {/* Data Status Tab */}
        {activeTab === 1 && (
          <Box>
            <DataStatusTab dataStatus={dataStatus} />
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                onClick={() => handleDownloadJSON(setDownloading, setSnackbar)}
                disabled={downloading}
                sx={{ width: '100%' }}
              >
                {downloading ? '下載中...' : '下載 JSON 資料檔'}
              </Button>
            </Box>
          </Box>
        )}
        
        
      </Box>
      
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          健保雲端資料整理器
        </Typography>
      </Box>
      
      {/* 通知訊息 */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PopupSettings; 