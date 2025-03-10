/**
 * Overview_ImagingTests Component
 * 
 * This component displays a card showing recent imaging tests from the past X days,
 * filtered to only show tests included in the user's focused imaging tests list.
 */

import React, { useMemo, useState } from "react";
import {
  Card,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from "@mui/material";
import ImageIcon from '@mui/icons-material/Image';
import TypographySizeWrapper from "../utils/TypographySizeWrapper";
import DescriptionIcon from '@mui/icons-material/Description';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DEFAULT_IMAGE_TESTS } from '../settings/OverviewSettings';

// 處理 orderName，移除括號內的內容和分號
const formatOrderName = (orderName) => {
  if (!orderName) return "";
  
  // 移除 英文和中文括號內的內容
  let formatted = orderName
    .replace(/\([^)]*\)/g, "") // 移除英文括號 (...) 及其內容
    .replace(/（[^）]*）/g, ""); // 移除中文括號 （...） 及其內容
  
  // 移除分號和之後的所有內容
  if (formatted.includes(";")) {
    formatted = formatted.split(";")[0];
  }
  
  // 移除換行符和之後的所有內容
  if (formatted.includes("\n")) {
    formatted = formatted.split("\n")[0];
  }
  
  // 去除前後多餘空格
  return formatted.trim();
};

// 整合相同檢查項目的記錄
const consolidateImagingRecords = (records) => {
  if (!records || records.length === 0) return [];

  // 使用 Map 來整合相同檢查的記錄
  const consolidatedMap = new Map();
  
  records.forEach(record => {
    // 創建一個唯一的鍵，基於檢查日期和檢查名稱
    const formattedName = formatOrderName(record.orderName);
    const key = `${record.date}_${formattedName}_${record.order_code}`;
    
    if (!consolidatedMap.has(key)) {
      // 如果是第一次看到這個檢查，將其添加到 Map 中
      consolidatedMap.set(key, {
        ...record,
        orderName: formattedName
      });
    } else {
      // 如果已經有了這個檢查，不做任何處理，保留第一筆
    }
  });
  
  // 將 Map 轉換回陣列
  return Array.from(consolidatedMap.values());
};

const Overview_ImagingTests = ({ 
  imagingData = { withReport: [], withoutReport: [] },
  overviewSettings = { imageTrackingDays: 90, focusedImageTests: DEFAULT_IMAGE_TESTS },
  generalDisplaySettings = { titleTextSize: 'medium', contentTextSize: 'medium', noteTextSize: 'small' }
}) => {
  // Add state for report dialog
  const [reportDialog, setReportDialog] = useState({ open: false, content: '', title: '' });
  
  // Add function to view image (imported from ImagingData.jsx)
  const viewImage = async (imageParams) => {
    try {
      // 嘗試多種方式獲取授權令牌
      let authToken = null;
      
      // Try from sessionStorage first
      const tokenKeys = ['jwt_token', 'token', 'access_token', 'auth_token', 'nhi_extractor_token'];
      for (const key of tokenKeys) {
        const token = sessionStorage.getItem(key);
        if (token) {
          authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          break;
        }
      }
      
      // Try from localStorage if not found
      if (!authToken) {
        for (const key of tokenKeys) {
          const token = localStorage.getItem(key);
          if (token) {
            authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            break;
          }
        }
      }
      
      if (!authToken) {
        alert("無法獲取授權令牌，請重新整理頁面後再試");
        return;
      }

      // 發送請求獲取影像數據
      const response = await fetch("https://medcloud2.nhi.gov.tw/imu/api/imuecommon/imuecommon/get-ctmri2", {
        method: "POST",
        headers: {
          "Accept": "application/json, text/plain, */*",
          "Content-Type": "application/json;charset=UTF-8",
          "Authorization": authToken,
          "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "include",
        body: JSON.stringify({
          ProcID: "IMUE0130",
          ClientData: imageParams
        })
      });

      if (!response.ok) {
        throw new Error(`API 請求失敗，狀態碼: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.ctmri_url) {
        throw new Error('API 回應中沒有影像 URL');
      }

      // 存儲影像數據到 sessionStorage
      const imgData = {
        fileName: data.ctmri_url,
        apiName: "imue0130"
      };
      sessionStorage.setItem("ShowImg", JSON.stringify(imgData));

      // 開啟新視窗顯示影像
      window.open("https://medcloud2.nhi.gov.tw/imu/IMUE1000/ShowImg", "_blank");
    } catch (error) {
      alert("載入影像時發生錯誤: " + error.message);
    }
  };

  // Filter imaging data based on tracking days and focused tests
  const filteredImagingTests = useMemo(() => {
    // Extract all tests (with and without reports)
    const allTests = [...imagingData.withReport, ...imagingData.withoutReport];
    
    if (!allTests || allTests.length === 0) return [];
    
    // Get the cut-off date based on imageTrackingDays
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - overviewSettings.imageTrackingDays);
    
    // Get the enabled order codes from focusedImageTests
    const enabledOrderCodes = (overviewSettings.focusedImageTests || [])
      .filter(test => test.enabled)
      .map(test => test.orderCode.split(','))
      .flat();
    
    // If no tests are enabled, return an empty array
    if (enabledOrderCodes.length === 0) return [];
    
    // Filter tests by date and order code
    const filteredTests = allTests
      .filter(test => {
        // Check if the test date is within tracking days
        const testDate = new Date(test.date);
        if (isNaN(testDate.getTime())) return false;
        
        const isRecentEnough = testDate >= cutoffDate;
        
        // Check if the test order code is in the enabled list
        const isEnabled = enabledOrderCodes.some(code => 
          test.order_code && test.order_code.includes(code)
        );
        
        return isRecentEnough && isEnabled;
      })
      .sort((a, b) => {
        // Sort by date, most recent first
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
    
    // 整合相同的檢查記錄
    return consolidateImagingRecords(filteredTests);
  }, [imagingData, overviewSettings]);

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" mb={1}>
        {/* <ImageIcon color="primary" sx={{ mr: 1 }} /> */}
        <TypographySizeWrapper 
          variant="h6"
          generalDisplaySettings={generalDisplaySettings}
          gutterBottom
        >
          關注影像 - {overviewSettings.imageTrackingDays || 90} 天內
        </TypographySizeWrapper>
      </Box>
      
      {filteredImagingTests.length > 0 ? (
        <List dense disablePadding>
          {filteredImagingTests.map((test, index) => (
            <ListItem 
              key={`${test.date}-${test.orderName}-${index}`} 
              sx={{ py: 0.5 }}
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  {/* 如果有報告內容，顯示報告按鈕 */}
                  {test.inspectResult && (
                    <Tooltip 
                      title={
                        <Typography variant="caption" style={{ whiteSpace: 'pre-line' }}>
                          {test.inspectResult.length > 200 
                            ? test.inspectResult.substring(0, 200) + '...' 
                            : test.inspectResult}
                        </Typography>
                      }
                    >
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => setReportDialog({
                          open: true,
                          title: `${test.orderName} - ${test.date}`,
                          content: test.inspectResult
                        })}
                      >
                        <DescriptionIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {/* 如果有影像，顯示影像按鈕 */}
                  {test.images && test.images.length > 0 && (
                    <Tooltip title="查看影像">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => viewImage(`${test.images[0].ipl_case_seq_no}@${test.images[0].read_pos || '2'}@@${test.images[0].file_type || 'DCF'}@${test.images[0].file_qty || '2'}`)}
                      >
                        {test.images.length > 1 ? (
                          <PhotoLibraryIcon fontSize="small" />
                        ) : (
                          <ImageIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              }
            >
              <ListItemText
                primary={
                  <TypographySizeWrapper
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                  >
                    {test.orderName}
                  </TypographySizeWrapper>
                }
                secondary={
                  <TypographySizeWrapper
                    textSizeType="note"
                    generalDisplaySettings={generalDisplaySettings}
                    color="text.secondary"
                  >
                    {test.date} {test.hosp}
                  </TypographySizeWrapper>
                }
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <TypographySizeWrapper 
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          color="text.secondary"
        >
          {overviewSettings.imageTrackingDays} 天內無關注的影像檢查
        </TypographySizeWrapper>
      )}
      
      {/* 報告內容對話框 */}
      <Dialog 
        open={reportDialog.open} 
        onClose={() => setReportDialog({ ...reportDialog, open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <TypographySizeWrapper
            textSizeType="title"
            generalDisplaySettings={generalDisplaySettings}
          >
            {reportDialog.title}
          </TypographySizeWrapper>
        </DialogTitle>
        <DialogContent dividers>
          <TypographySizeWrapper
            textSizeType="content"
            generalDisplaySettings={generalDisplaySettings}
            style={{ whiteSpace: 'pre-line' }}
          >
            {reportDialog.content}
          </TypographySizeWrapper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialog({ ...reportDialog, open: false })}>
            關閉
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Overview_ImagingTests; 