import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  FormControlLabel, 
  Switch, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  CircularProgress,
  Divider,
  Paper,
  Chip,
  Grid,
  FormGroup,
  Checkbox,
  Tooltip
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';

const TestModeSettings = () => {
  const [devMode, setDevMode] = useState(false);
  const [testDataList, setTestDataList] = useState([]);
  const [selectedDataId, setSelectedDataId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadStatus, setLoadStatus] = useState('');
  const [selectedDataTypes, setSelectedDataTypes] = useState({
    medication: true,
    labdata: true,
    chinesemed: true,
    imaging: true,
    allergy: true,
    surgery: true,
    discharge: true,
    medDays: true,
    patientSummary: true
  });
  const [loadingDataType, setLoadingDataType] = useState(null);

  // API 基礎 URL - 只使用 Vercel API
  const apiBaseUrl = 'https://nhitw-mock-api.vercel.app/api';

  // 數據類型顯示名稱映射
  const dataTypeLabels = {
    medication: '藥歷',
    labdata: '檢驗',
    chinesemed: '中醫用藥',
    imaging: '影像',
    allergy: '過敏',
    surgery: '手術',
    discharge: '出院',
    medDays: '用藥天數',
    patientSummary: '病患摘要'
  };

  // 初始化
  useEffect(() => {
    // 獲取開發模式設定
    chrome.storage.sync.get(['devMode', 'currentTestDataId'], (result) => {
      setDevMode(result.devMode || false);
      setSelectedDataId(result.currentTestDataId || '');
    });

    // 如果開發模式已啟用，獲取測試數據列表
    if (devMode) {
      fetchTestDataList();
    }
  }, [devMode]);

  // 獲取測試數據列表
  const fetchTestDataList = () => {
    setLoadingList(true);
    
    // 使用 chrome.runtime.sendMessage 來獲取測試數據列表
    chrome.runtime.sendMessage({ action: "fetchTestDataList" }, (response) => {
      if (response && response.status === "success" && response.data) {
        setTestDataList(response.data || []);
      } else {
        console.error('獲取測試數據列表失敗:', response?.error || '未知錯誤');
      }
      setLoadingList(false);
    });
  };

  // 切換開發模式
  const handleDevModeToggle = () => {
    const newMode = !devMode;
    setDevMode(newMode);
    chrome.storage.sync.set({ devMode: newMode });
    chrome.runtime.sendMessage({ action: "updateDevMode", value: newMode });

    // 如果開啟開發模式，獲取測試數據列表
    if (newMode) {
      fetchTestDataList();
    }
  };

  // 選擇測試數據
  const handleDataIdChange = (event) => {
    const newId = event.target.value;
    setSelectedDataId(newId);
    chrome.storage.sync.set({ currentTestDataId: newId });
    chrome.runtime.sendMessage({ action: "updateTestDataId", value: newId });
  };

  // 切換數據類型選擇
  const handleDataTypeToggle = (dataType) => {
    setSelectedDataTypes(prev => ({
      ...prev,
      [dataType]: !prev[dataType]
    }));
  };

  // 全選/取消全選數據類型
  const handleToggleAllDataTypes = () => {
    const allSelected = Object.values(selectedDataTypes).every(v => v);
    const newValue = !allSelected;
    
    const newSelectedDataTypes = {};
    Object.keys(selectedDataTypes).forEach(key => {
      newSelectedDataTypes[key] = newValue;
    });
    
    setSelectedDataTypes(newSelectedDataTypes);
  };

  // 載入測試數據
  const handleLoadTestData = () => {
    setLoading(true);
    setLoadStatus('載入中...');
    
    chrome.runtime.sendMessage({ action: "loadTestData" }, (response) => {
      setLoading(false);
      
      if (response && response.status === "test_data_loaded") {
        setLoadStatus(`成功載入 ${response.dataTypes.length} 種數據`);
        
        // 通知 popup 更新數據狀態
        chrome.runtime.sendMessage({ action: "updatePopupDataStatus" });
      } else {
        setLoadStatus(response?.error || '載入失敗');
      }
      
      // 5秒後清除狀態訊息
      setTimeout(() => {
        setLoadStatus('');
      }, 5000);
    });
  };

  // 載入特定類型的測試數據
  const handleLoadDataType = (dataType) => {
    setLoadingDataType(dataType);
    
    chrome.runtime.sendMessage({ 
      action: "getTestData", 
      dataType: dataType 
    }, (response) => {
      setLoadingDataType(null);
      
      if (response && response.status === "success") {
        setLoadStatus(`成功載入 ${dataTypeLabels[dataType] || dataType} 數據`);
        
        // 通知 popup 更新數據狀態
        chrome.runtime.sendMessage({ action: "updatePopupDataStatus" });
      } else {
        setLoadStatus(response?.error || `載入 ${dataTypeLabels[dataType] || dataType} 數據失敗`);
      }
      
      // 3秒後清除狀態訊息
      setTimeout(() => {
        setLoadStatus('');
      }, 3000);
    });
  };

  // 刷新測試數據列表
  const handleRefreshDataList = () => {
    fetchTestDataList();
  };

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <BugReportIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">測試模式設定</Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <FormControlLabel
        control={
          <Switch 
            checked={devMode} 
            onChange={handleDevModeToggle}
            color="primary"
          />
        }
        label="啟用測試模式"
      />
      
      {devMode && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FormControl fullWidth sx={{ mr: 1 }}>
              <InputLabel>選擇測試數據</InputLabel>
              <Select
                value={selectedDataId}
                onChange={handleDataIdChange}
                label="選擇測試數據"
                disabled={loadingList}
              >
                {loadingList ? (
                  <MenuItem value="">
                    <CircularProgress size={20} /> 載入中...
                  </MenuItem>
                ) : (
                  testDataList.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <Tooltip title="刷新測試數據列表">
              <Button 
                variant="outlined" 
                onClick={handleRefreshDataList}
                disabled={loadingList}
                sx={{ minWidth: '40px', width: '40px', height: '40px', p: 0 }}
              >
                {loadingList ? (
                  <CircularProgress size={20} />
                ) : (
                  <RefreshIcon />
                )}
              </Button>
            </Tooltip>
          </Box>
          
          <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <InfoIcon fontSize="small" sx={{ mr: 0.5 }} />
            選擇要載入的數據類型
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <FormGroup>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={Object.values(selectedDataTypes).every(v => v)}
                      indeterminate={!Object.values(selectedDataTypes).every(v => v) && Object.values(selectedDataTypes).some(v => v)}
                      onChange={handleToggleAllDataTypes}
                    />
                  }
                  label="全選"
                />
                
                {Object.entries(selectedDataTypes).map(([dataType, isSelected]) => (
                  <Chip
                    key={dataType}
                    label={dataTypeLabels[dataType] || dataType}
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "filled" : "outlined"}
                    onClick={() => handleDataTypeToggle(dataType)}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            </FormGroup>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleLoadTestData}
            disabled={!selectedDataId || loading || !Object.values(selectedDataTypes).some(v => v)}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ mb: 2 }}
          >
            {loading ? '載入中...' : '載入所有選定數據'}
          </Button>
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            單獨載入特定類型數據
          </Typography>
          
          <Grid container spacing={1} sx={{ mb: 1 }}>
            {Object.entries(dataTypeLabels).map(([dataType, label]) => (
              <Grid item xs={6} key={dataType}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => handleLoadDataType(dataType)}
                  disabled={!selectedDataId || loadingDataType !== null}
                  startIcon={loadingDataType === dataType ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {label}
                </Button>
              </Grid>
            ))}
          </Grid>
          
          {loadStatus && (
            <Typography 
              variant="body2" 
              color={loadStatus.includes('成功') ? 'success.main' : 'error.main'} 
              sx={{ mt: 1, textAlign: 'center' }}
            >
              {loadStatus}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default TestModeSettings;
