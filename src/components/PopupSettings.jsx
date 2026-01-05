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
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HelpIcon from '@mui/icons-material/Help';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';

// 引入標籤顏色工具函數
import { getTabColor, getTabSelectedColor } from '../utils/tabColorUtils';

// 導入拆分出的組件
import GeneralDisplaySettings from './settings/GeneralDisplaySettings';
import MedicationSettings from './settings/MedicationSettings';
import ChineseMedicationSettings from './settings/ChineseMedicationSettings';
import LabSettings from './settings/LabSettings';
import OverviewSettings from './settings/OverviewSettings';
import AboutTab from './settings/AboutTab';
import GAISettings from './settings/GAISettings';
import CloudDataSettings from './settings/CloudDataSettings';
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
    patientSummary: { status: 'none', count: 0 },
    adultHealthCheck: { status: 'none', count: 0 },
    cancerScreening: { status: 'none', count: 0 }
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

  // 使用 Map 處理標籤內容的顯示
  const tabContentMap = new Map([
    [0, (
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <GeneralDisplaySettings />
        <CloudDataSettings />
        <OverviewSettings />
        <MedicationSettings />
        <ChineseMedicationSettings />
        <LabSettings />
        <GAISettings developerMode={developerMode} />
      </Box>
    )],
    [1, (
      <Box>
        <AboutTab />
      </Box>
    )],
    [2, (
      <Box>
        <Typography variant="h6" align="center" gutterBottom>贊助我們</Typography>
        <Typography paragraph align="center">
          感謝您使用「更好的健保雲端2.0」</Typography><Typography paragraph align="center">
          如果您覺得這個工具對您醫療上有所幫助，您可以考慮贊助我們，幫助我們持續改進和維護這個專案。
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
          <Box sx={{ mb: 2, maxWidth: '200px', maxHeight: '200px' }}>
            <img
              src="/images/buymeacoffee_qr.png"
              alt="Buy Me A Coffee QR Code"
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<VolunteerActivismIcon />}
            onClick={() => chrome.tabs.create({ url: 'https://buymeacoffee.com/leescot' })}
          >
            前往贊助頁面
          </Button>
        </Box>
      </Box>
    )],
    [3, (
      <Box>
        <LoadDataTab
          localDataStatus={localDataStatus}
          setSnackbar={setSnackbar}
        />
      </Box>
    )]
  ]);

  const handleTabChange = (event, newValue) => {
    // 檢查是否點擊了"開啟雲端"標籤
    const lastTabIndex = developerMode ? 4 : 3;
    if (newValue === lastTabIndex) {
      // 開啟雲端連結而不切換標籤
      openNHIMedCloud();
      return;
    }

    // 正常切換標籤
    setActiveTab(newValue);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 使用 Map 處理開發者模式的不同點擊次數情況
  const handleDeveloperModeActions = new Map([
    [5, {
      action: (currentMode) => {
        const newMode = !currentMode;
        setDeveloperMode(newMode);

        // 儲存開發者模式狀態
        chrome.storage.local.set({ developerMode: newMode });

        // 如果關閉開發者模式，且當前在開發模式頁面，切換回設定頁面
        if (!newMode && activeTab === 4) {
          setActiveTab(0);
        }

        return {
          message: newMode ? '開發者模式已啟用' : '開發者模式已關閉',
          severity: newMode ? 'success' : 'info'
        };
      }
    }]
  ]);

  // 處理底部文字點擊事件
  const handleFooterClick = () => {
    // 增加計數器
    const newCount = clickCount + 1;
    setClickCount(newCount);

    // 使用 Map 處理開發者模式的點擊邏輯
    const actionConfig = handleDeveloperModeActions.get(newCount);
    if (actionConfig) {
      const { message, severity } = actionConfig.action(developerMode);

      // 顯示通知
      setSnackbar({
        open: true,
        message,
        severity
      });

      // 重置計數器
      setTimeout(() => setClickCount(0), 500);
    } else {
      // 只在開發者模式已啟用的情況下且點擊次數在範圍內才顯示點擊提示
      if (developerMode && newCount > 0 && newCount < 7) {
        setSnackbar({
          open: true,
          message: `再點擊 ${7 - newCount} 次以關閉開發者模式`,
          severity: 'info',
          autoHideDuration: 1000
        });
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
  };

  // Function to open NHI MedCloud website
  const openNHIMedCloud = () => {
    chrome.tabs.create({ url: 'https://medcloud2.nhi.gov.tw/imu/IMUE1000/' });
  };

  // 消息處理 Map
  const messageHandlerMap = new Map([
    ['refreshDataStatus', () => updateDataStatus(setDataStatus)],
    ['localDataLoaded', (message) => {
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
    }]
  ]);

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
      const handler = messageHandlerMap.get(message.action);
      if (handler) {
        handler(message);
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
          sx={{
            '& .MuiTab-root': {
              minWidth: '20%', // 5 tabs - each gets 20%
              padding: '6px 2px',
              fontSize: '0.87rem', // Further increased font size
              fontWeight: 'bold', // Added bold text
            },
            '& .MuiTabs-flexContainer': {
              justifyContent: 'space-between',
            },
            '& .MuiTab-iconWrapper': {
              marginBottom: '4px',
              '& .MuiSvgIcon-root': {
                fontSize: '1.3rem', // Increased icon size
              }
            },
            minHeight: '58px', // Increased height for better touch targets
          }}
        >
          <Tab
            icon={<SettingsIcon />}
            label="設定"
            sx={{
              color: getTabColor(generalDisplaySettings, "settings"),
              "&.Mui-selected": {
                color: getTabSelectedColor(generalDisplaySettings, "settings"),
              },
              minHeight: '58px',
            }}
          />
          <Tab
            icon={<HelpIcon />}
            label="關於"
            sx={{
              color: getTabColor(generalDisplaySettings, "about"),
              "&.Mui-selected": {
                color: getTabSelectedColor(generalDisplaySettings, "about"),
              },
              minHeight: '58px',
            }}
          />
          <Tab
            icon={<VolunteerActivismIcon />}
            label="贊助"
            sx={{
              color: getTabColor(generalDisplaySettings, "sponsor"),
              "&.Mui-selected": {
                color: getTabSelectedColor(generalDisplaySettings, "sponsor"),
              },
              minHeight: '58px',
            }}
          />
          {developerMode && (
            <Tab
              icon={<CloudUploadIcon />}
              label="開發"
              sx={{
                color: getTabColor(generalDisplaySettings, "loadData"),
                "&.Mui-selected": {
                  color: getTabSelectedColor(generalDisplaySettings, "loadData"),
                },
                minHeight: '58px',
              }}
            />
          )}
          <Tab
            icon={<OpenInNewIcon />}
            label="雲端"
            sx={{
              color: getTabColor(generalDisplaySettings, "cloud"),
              "&.Mui-selected": {
                color: getTabSelectedColor(generalDisplaySettings, "cloud"),
              },
              minHeight: '58px',
            }}
          />
        </Tabs>
      </AppBar>

      {/* 使用 Map 渲染標籤內容 */}
      {activeTab === 0 && tabContentMap.get(0)}

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {/* 使用 Map 渲染其他標籤內容 */}
        {activeTab === 1 && tabContentMap.get(1)}
        {activeTab === 2 && tabContentMap.get(2)}
        {activeTab === 3 && developerMode && tabContentMap.get(3)}
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
          更好的健保雲端2.0
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
          top: '50% !important',
          left: '50% !important',
          transform: 'translate(-50%, -50%)',
          bottom: 'auto !important',
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