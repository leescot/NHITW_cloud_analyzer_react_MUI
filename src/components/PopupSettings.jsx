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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// 引入標籤顏色工具函數
import { getTabColor, getTabSelectedColor } from '../utils/tabColorUtils';

// 導入拆分出的組件
import DataStatusTab from './settings/DataStatusTab';
import GeneralDisplaySettings from './settings/GeneralDisplaySettings';
import MedicationSettings from './settings/MedicationSettings';
import ChineseMedicationSettings from './settings/ChineseMedicationSettings';
import LabSettings from './settings/LabSettings';
import OverviewSettings from './settings/OverviewSettings';
import { updateDataStatus } from '../utils/settingsHelper';
import LoadDataTab from './settings/LoadDataTab';

const PopupSettings = () => {
  const [dataStatus, setDataStatus] = useState({
    medication: { status: 'none', count: 0 },
    labData: { status: 'none', count: 0 },
    chineseMed: { status: 'none', count: 0 },
    imaging: { status: 'none', count: 0 },
    allergy: { status: 'none', count: 0 },
    surgery: { status: 'none', count: 0 },
    discharge: { status: 'none', count: 0 },
    medDays: { status: 'none', count: 0 },
    patientSummary: { status: 'none', count: 0 }
  });
  
  // 添加一般顯示設定狀態
  const [generalDisplaySettings, setGeneralDisplaySettings] = useState({
    useColorfulTabs: false,
    titleTextSize: 'medium',
    contentTextSize: 'medium',
    noteTextSize: 'small',
    floatingIconPosition: 'top-right',
    alwaysOpenOverviewTab: true,
    autoOpenPage: false
  });
  
  // 新增通知
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // 新增本地資料狀態
  const [localDataStatus, setLocalDataStatus] = useState({
    loaded: false,
    source: '',
    types: []
  });

  // 開發者模式狀態
  const [developerMode, setDeveloperMode] = useState(false);
  // 點擊計數器
  const [clickCount, setClickCount] = useState(0);

  // Add tab state
  const [activeTab, setActiveTab] = useState(0);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 處理底部文字點擊事件
  const handleFooterClick = () => {
    // 增加計數器
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    // 檢查是否達到點擊次數
    if (!developerMode && newCount === 5) {
      // 啟用開發者模式
      setDeveloperMode(true);
      
      // 顯示通知
      setSnackbar({
        open: true,
        message: '開發者模式已啟用',
        severity: 'success'
      });
      
      // 重置計數器
      setTimeout(() => setClickCount(0), 500);
      
      // 儲存開發者模式狀態
      chrome.storage.local.set({ developerMode: true });
    } else if (developerMode && newCount === 5) {
      // 關閉開發者模式
      setDeveloperMode(false);
      
      // 顯示通知
      setSnackbar({
        open: true,
        message: '開發者模式已關閉',
        severity: 'info'
      });
      
      // 重置計數器
      setTimeout(() => setClickCount(0), 500);
      
      // 儲存開發者模式狀態
      chrome.storage.local.set({ developerMode: false });
      
      // 如果當前在開發模式頁面，切換回設定頁面
      if (activeTab === 2) {
        setActiveTab(0);
      }
    }
    
    // 如果超過7次點擊未處理，重置計數器
    if (newCount > 7) {
      setClickCount(0);
    }
    
    // 設定計數器重置計時器(5秒內未完成點擊將重置)
    if (newCount === 1) {
      setTimeout(() => {
        setClickCount(0);
      }, 5000);
    }
    
    // 只在開發者模式已啟用的情況下才顯示點擊提示
    if (developerMode && newCount > 0 && newCount < 7) {
      setSnackbar({
        open: true,
        message: `再點擊 ${7 - newCount} 次以關閉開發者模式`,
        severity: 'info',
        autoHideDuration: 1000
      });
    }
    // 移除非開發者模式下的點擊提示，避免洩露開發者模式的存在
  };

  // 組件掛載時初始化
  useEffect(() => {
    console.log('PopupSettings 組件已掛載');
    
    // 立即更新資料狀態
    updateDataStatus(setDataStatus);
    
    // 加載一般顯示設定
    chrome.storage.sync.get({
      useColorfulTabs: false,
      titleTextSize: 'medium',
      contentTextSize: 'medium',
      noteTextSize: 'small',
      floatingIconPosition: 'top-right',
      alwaysOpenOverviewTab: true,
      autoOpenPage: false
    }, (items) => {
      setGeneralDisplaySettings(items);
    });
    
    // 檢查開發者模式狀態
    chrome.storage.local.get('developerMode', (result) => {
      if (result.developerMode) {
        setDeveloperMode(result.developerMode);
      }
    });
    
    // 監聽來自 background 的消息，用於更新數據狀態
    const handleMessage = (message) => {
      if (message.action === "refreshDataStatus") {
        updateDataStatus(setDataStatus);
      }
      
      // 處理本地數據加載消息
      if (message.action === "localDataLoaded") {
        setLocalDataStatus({
          loaded: true,
          source: message.source || '本地檔案',
          types: message.dataTypes || []
        });
        
        // 顯示通知
        setSnackbar({
          open: true,
          message: `已成功載入${message.dataTypes.length}種本地資料`,
          severity: 'success'
        });
      }
    };
    
    // 添加消息監聽器
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // 添加儲存變更的監聽器
    const handleStorageChange = (changes, area) => {
      if (area === 'local') {
        updateDataStatus(setDataStatus);
        
        // 檢查開發者模式變更
        if (changes.developerMode) {
          setDeveloperMode(changes.developerMode.newValue);
        }
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
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.storage.onChanged.removeListener(handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            icon={<SettingsIcon />} 
            label="設定" 
            sx={{
              color: getTabColor(generalDisplaySettings, "settings"),
              "&.Mui-selected": {
                color: getTabSelectedColor(generalDisplaySettings, "settings"),
              },
            }}
          />
          <Tab 
            icon={<InfoIcon />} 
            label="資料狀態" 
            sx={{
              color: getTabColor(generalDisplaySettings, "dataStatus"),
              "&.Mui-selected": {
                color: getTabSelectedColor(generalDisplaySettings, "dataStatus"),
              },
            }}
          />
          {developerMode && (
            <Tab 
              icon={<CloudUploadIcon />} 
              label="開發模式" 
              sx={{
                color: getTabColor(generalDisplaySettings, "loadData"),
                "&.Mui-selected": {
                  color: getTabSelectedColor(generalDisplaySettings, "loadData"),
                },
              }}
            />
          )}
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
          </Box>
        )}
        
        {/* Load Data Tab - 只在開發者模式時顯示 */}
        {activeTab === 2 && developerMode && (
          <Box>
            <LoadDataTab 
              localDataStatus={localDataStatus} 
              setSnackbar={setSnackbar}
            />
          </Box>
        )}
      </Box>
      
      <Box 
        sx={{ 
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider', 
          textAlign: 'center',
          cursor: 'pointer'  // 添加點擊游標
        }}
        onClick={handleFooterClick}  // 添加點擊事件
      >
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            '&:hover': {
              color: clickCount > 0 ? 'primary.main' : 'text.secondary'
            }
          }}
        >
          健保雲端資料整理器
          {developerMode && (
            <span style={{ fontSize: '0.8em', marginLeft: '4px' }}>
              (開發模式)
            </span>
          )}
        </Typography>
      </Box>
      
      {/* 通知訊息 */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={snackbar.autoHideDuration || 6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          '& .MuiAlert-root': {
            minWidth: '200px',
            maxWidth: '90%'
          }
        }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PopupSettings; 