import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';

// 資料類型對照表
const dataTypeMap = new Map([
  ['medication', '西藥處方'],
  ['labData', '檢驗報告'],
  ['chineseMed', '中藥處方'],
  ['imaging', '醫療影像'],
  ['allergy', '過敏資料'],
  ['surgery', '手術記錄'],
  ['discharge', '出院病摘'],
  ['medDays', '餘藥資料'],
  ['patientSummary', '病患摘要']
]);

// 新增下載功能
const handleDownloadJSON = (setDownloading, setSnackbar) => {
  setDownloading(true);

  // 從 content script 擷取所有資料
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0] || !tabs[0].id) {
      setDownloading(false);
      setSnackbar({
        open: true,
        message: '無法擷取當前標籤頁資訊',
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

const LoadDataTab = ({ localDataStatus, setSnackbar }) => {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [downloading, setDownloading] = useState(false); // 新增下載狀態

  // 處理檔案選擇
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 載入本機檔案
  const handleLoadFile = async () => {
    if (!selectedFile) {
      setSnackbar({
        open: true,
        message: '請先選擇 JSON 檔案',
        severity: 'warning'
      });
      return;
    }

    setLoading(true);

    try {
      // 讀取檔案
      const fileContent = await readFileAsText(selectedFile);
      let jsonData;

      try {
        // 嘗試解析 JSON
        jsonData = JSON.parse(fileContent);
      } catch (err) {
        setSnackbar({
          open: true,
          message: '檔案內容不是有效的 JSON 格式',
          severity: 'error'
        });
        setLoading(false);
        return;
      }

      // 擷取當前標籤頁
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          setSnackbar({
            open: true,
            message: '無法擷取當前標籤頁',
            severity: 'error'
          });
          setLoading(false);
          return;
        }

        // 傳送訊息給內容腳本處理資料
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "loadLocalData",
          data: jsonData,
          filename: selectedFile.name
        }, (response) => {
          setLoading(false);

          // 處理通訊錯誤
          if (chrome.runtime.lastError) {
            setSnackbar({
              open: true,
              message: '與內容腳本通訊失敗，請確認您是否在正確的頁面上',
              severity: 'error'
            });
            return;
          }

          // 處理回應
          if (response && response.success) {
            setSnackbar({
              open: true,
              message: `成功載入資料：${response.loadedTypes.map(type => dataTypeMap.get(type) || type).join(', ')}`,
              severity: 'success'
            });
          } else {
            setSnackbar({
              open: true,
              message: response ? response.message : '資料載入失敗',
              severity: 'error'
            });
          }
        });
      });
    } catch (err) {
      setLoading(false);
      setSnackbar({
        open: true,
        message: `處理檔案時發生錯誤: ${err.message}`,
        severity: 'error'
      });
    }
  };

  // 讀取檔案為文字
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  // 清除本地資料
  // const handleClearLocalData = () => {
  //   // 擷取當前標籤頁
  //   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  //     if (tabs && tabs[0] && tabs[0].id) {
  //       // 傳送訊息給內容腳本清除資料
  //       chrome.tabs.sendMessage(tabs[0].id, {
  //         action: "clearLocalData"
  //       }, (response) => {
  //         if (response && response.success) {
  //           setSnackbar({
  //             open: true,
  //             message: '已清除本地資料',
  //             severity: 'success'
  //           });
  //         } else {
  //           setSnackbar({
  //             open: true,
  //             message: '清除資料失敗',
  //             severity: 'error'
  //           });
  //         }
  //       });
  //     }
  //   });
  // };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* <Typography variant="h6" gutterBottom>
        本地資料載入
      </Typography> */}

      {/* 新增下載 JSON 資料檔的按鈕 */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          下載雲端資料
        </Typography>
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
        {/* <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          從健保雲端系統下載的資料可用於後續分析或載入到其他裝置上
        </Typography> */}
      </Paper>

      {/* 檔案上傳區 */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          選擇 JSON 檔案
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<FolderOpenIcon />}
            sx={{ mr: 2 }}
          >
            瀏覽...
            <input
              type="file"
              accept=".json"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          <Typography variant="body2">
            {selectedFile ? selectedFile.name : '未選擇檔案'}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <CloudUploadIcon />}
          onClick={handleLoadFile}
          disabled={!selectedFile || loading}
        >
          {loading ? '載入中...' : '載入檔案'}
        </Button>
      </Paper>

      {/* 資料狀態顯示 */}
      {localDataStatus.loaded ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            <Typography variant="subtitle1">
              已載入本地資料
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            來源: {localDataStatus.source}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {localDataStatus.types.map((type) => (
              <Chip
                key={type}
                label={dataTypeMap.get(type) || type}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
          {/* <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleClearLocalData}
            sx={{ mt: 2 }}
          >
            清除本地資料
          </Button> */}
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          請選擇 JSON 檔案並點選「載入檔案」
        </Alert>
      )}

      
    </Box>
  );
};

export default LoadDataTab;