import React, { useState, useEffect } from "react";
import {
  Typography,
  Grid,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  IconButton,
  Tooltip,
  Stack,
  Radio,
  FormControlLabel
} from "@mui/material";
import ImageIcon from '@mui/icons-material/Image';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

// Function to open imaging study in a new window
const viewImage = async (imageParams) => {
  try {
    // 嘗試多種方式獲取授權令牌
    let authToken = null;

    // 方法1: 直接嘗試從 chrome storage 獲取
    try {
      await new Promise((resolve) => {
        chrome.storage.local.get('nhiToken', function(result) {
          if (result && result.nhiToken) {
            authToken = result.nhiToken;
          }
          resolve();
        });
      });
    } catch (e) {
      // Silent error handling
    }

    // 方法2: 嘗試從 window.extractAuthorizationToken() 獲取
    if (!authToken && window.extractAuthorizationToken) {
      try {
        authToken = window.extractAuthorizationToken();
      } catch (e) {
        // Silent error handling
      }
    }

    // 方法3: 嘗試從 sessionStorage 獲取
    if (!authToken) {
      const tokenKeys = ['jwt_token', 'token', 'access_token', 'auth_token', 'nhi_extractor_token'];
      for (const key of tokenKeys) {
        const token = sessionStorage.getItem(key);
        if (token) {
          authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          break;
        }
      }
    }

    // 方法4: 嘗試從 localStorage 獲取
    if (!authToken) {
      const tokenKeys = ['jwt_token', 'token', 'access_token', 'auth_token', 'nhi_extractor_token'];
      for (const key of tokenKeys) {
        const token = localStorage.getItem(key);
        if (token) {
          authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          break;
        }
      }
    }

    // 方法5: 透過消息傳遞請求背景腳本提供令牌
    if (!authToken) {
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'getAuthToken' }, (response) => {
            resolve(response);
          });
        });

        if (response && response.token) {
          authToken = response.token;
        }
      } catch (e) {
        // Silent error handling
      }
    }

    if (!authToken) {
      alert("無法獲取授權令牌，請重新整理頁面後再試");
      return;
    }

    // 發送請求獲取影像數據，先嘗試原始格式
    try {
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
    } catch (firstError) {
      // 第一次請求失敗，嘗試修改參數格式再試一次
      try {
        // 從原始 imageParams 解析出參數
        const params = imageParams.split('@');
        if (params.length >= 5) {
          // 建立新的參數格式，省略 ctmri_mark
          const modifiedParams = `${params[0]}@${params[1]}@@${params[3]}@${params[4]}`;

          const retryResponse = await fetch("https://medcloud2.nhi.gov.tw/imu/api/imuecommon/imuecommon/get-ctmri2", {
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
              ClientData: modifiedParams
            })
          });

          if (!retryResponse.ok) {
            throw new Error(`API 請求失敗，狀態碼: ${retryResponse.status}`);
          }

          const retryData = await retryResponse.json();

          if (!retryData || !retryData.ctmri_url) {
            throw new Error('API 回應中沒有影像 URL');
          }

          // 存儲影像數據到 sessionStorage
          const imgData = {
            fileName: retryData.ctmri_url,
            apiName: "imue0130"
          };
          sessionStorage.setItem("ShowImg", JSON.stringify(imgData));

          // 開啟新視窗顯示影像
          window.open("https://medcloud2.nhi.gov.tw/imu/IMUE1000/ShowImg", "_blank");
        } else {
          throw new Error('無效的參數格式');
        }
      } catch (secondError) {
        // 兩次嘗試都失敗，顯示錯誤訊息
        alert("載入影像時發生錯誤: " + secondError.message);
      }
    }
  } catch (error) {
    alert("載入影像時發生錯誤: " + error.message);
  }
};

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

// 整合影像和報告資料
const processImagingData = (data) => {
  const withReport = [...data.withReport];
  let withoutReport = [...data.withoutReport];

  // 用於追踪已處理過的影像資料
  const processedImageIds = new Set();

  // 首先處理同時有報告和影像的情況
  for (let i = 0; i < withReport.length; i++) {
    const report = withReport[i];

    // 檢查這個報告項目本身是否已經包含影像資料
    if (report.ipl_case_seq_no && report.ctmri_mark === 'Y') {
      // 創建影像物件 (使用報告本身的影像資料)
      const imageData = {
        ...report,
        // 確保所有必要的影像欄位都有值
        ipl_case_seq_no: report.ipl_case_seq_no,
        read_pos: report.read_pos || '1',
        ctmri_mark: report.ctmri_mark,
        file_type: report.file_type || 'DCF',
        file_qty: report.file_qty
      };

      // 將影像資料添加到報告中
      withReport[i] = {
        ...report,
        images: [imageData]
      };

      // 記錄這個影像ID已處理過
      processedImageIds.add(report.ipl_case_seq_no);
    }
  }

  // 然後處理需要匹配的報告和影像
  for (let i = 0; i < withReport.length; i++) {
    const report = withReport[i];

    // 跳過已經有影像的報告
    if (report.images && report.images.length > 0) {
      continue;
    }

    // 使用多個欄位進行匹配，提高準確性
    const reportDate = report.date || report.real_inspect_date || '';
    const reportOrderCode = report.order_code || '';
    const reportHosp = (report.hosp || '').trim();

    // 尋找匹配的影像資料
    const matchedImages = [];
    withoutReport = withoutReport.filter(image => {
      const imageDate = image.date || image.real_inspect_date || '';
      const imageOrderCode = image.order_code || '';
      const imageHosp = (image.hosp || '').trim();

      // 1. 日期、檢查代碼和院所都匹配
      // 2. 檢查是否有有效的影像資料 (ipl_case_seq_no 和 ctmri_mark)
      const dateMatch = imageDate === reportDate;
      const codeMatch = imageOrderCode === reportOrderCode;
      const hospMatch = imageHosp === reportHosp;
      const hasValidImageData = image.ipl_case_seq_no && image.ctmri_mark === 'Y';

      const isMatch = dateMatch && codeMatch && hospMatch && hasValidImageData;

      if (isMatch) {
        matchedImages.push(image);
        processedImageIds.add(image.ipl_case_seq_no);
        return false; // 從withoutReport中移除
      }
      return true; // 保留在withoutReport中
    });

    // 將匹配的影像添加到報告中
    if (matchedImages.length > 0) {
      withReport[i] = {
        ...report,
        images: matchedImages
      };
    }
  }

  // 過濾掉 withoutReport 中沒有影像資料的項目
  withoutReport = withoutReport.filter(item =>
    item.ipl_case_seq_no && item.ctmri_mark === 'Y'
  );

  return {
    withReport,
    withoutReport
  };
};

// ImagingTable 組件 - 處理待取報告
const PendingImagingTable = ({ data, generalDisplaySettings }) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              <TypographySizeWrapper
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
              >
                日期
              </TypographySizeWrapper>
            </TableCell>
            <TableCell>
              <TypographySizeWrapper
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
              >
                檢查項目
              </TypographySizeWrapper>
            </TableCell>
            <TableCell width="60px" align="center">
              <TypographySizeWrapper
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
              >
                影像
              </TypographySizeWrapper>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, index) => {
            const formattedName = formatOrderName(item.orderName);

            return (
              <TableRow key={index}>
                <TableCell>
                  <Box>
                    <TypographySizeWrapper
                      variant="body2"
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      {item.date}
                    </TypographySizeWrapper>
                    <TypographySizeWrapper
                      variant="caption"
                      textSizeType="note"
                      generalDisplaySettings={generalDisplaySettings}
                      color="text.secondary"
                    >
                      {item.hosp}
                    </TypographySizeWrapper>
                  </Box>
                </TableCell>
                <TableCell>
                  <TypographySizeWrapper
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                  >
                    {formattedName}
                  </TypographySizeWrapper>
                  {/* 當 order_code 符合特定值時，顯示 cure_path_name */}
                  {["33085B", "33084B", "33072B", "33070B"].includes(item.order_code) && item.cure_path_name && (
                    <TypographySizeWrapper
                      variant="caption"
                      textSizeType="note"
                      generalDisplaySettings={generalDisplaySettings}
                      color="text.secondary"
                    >
                      {item.cure_path_name}
                    </TypographySizeWrapper>
                  )}
                </TableCell>
                <TableCell align="center">
                  {(item.ipl_case_seq_no && item.ctmri_mark === 'Y') ? (
                    <Tooltip title="查看影像">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => {
                          viewImage(`${item.ipl_case_seq_no}@${item.read_pos}@${item.ctmri_mark}@${item.file_type}@${item.file_qty}`);
                        }}
                      >
                        <ImageIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ImagingTable 組件 - 處理已有報告
const ReportImagingTable = ({ data, generalDisplaySettings }) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              <TypographySizeWrapper
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
              >
                檢查資訊
              </TypographySizeWrapper>
            </TableCell>
            <TableCell>
              <TypographySizeWrapper
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
              >
                報告結果
              </TypographySizeWrapper>
            </TableCell>
            <TableCell width="80px" align="center">
              <TypographySizeWrapper
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
              >
                影像
              </TypographySizeWrapper>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, index) => {
            const formattedName = formatOrderName(item.orderName);
            let reportResult = item.inspectResult || "";
            if (reportResult.includes("報告內容:")) {
              reportResult = reportResult.split("報告內容:")[1];
            }

            return (
              <TableRow key={index}>
                <TableCell>
                  <Box>
                    <TypographySizeWrapper
                      variant="body2"
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      {item.date}
                    </TypographySizeWrapper>
                    <TypographySizeWrapper
                      variant="caption"
                      textSizeType="note"
                      generalDisplaySettings={generalDisplaySettings}
                      color="text.secondary"
                    >
                      {item.hosp}
                    </TypographySizeWrapper>
                    <TypographySizeWrapper
                      variant="body2"
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                      sx={{ mt: 0.5 }}
                    >
                      {formattedName}
                    </TypographySizeWrapper>
                    {/* 當 order_code 符合特定值時，顯示 cure_path_name */}
                    {["33085B", "33084B", "33072B", "33070B"].includes(item.order_code) && item.cure_path_name && (
                      <TypographySizeWrapper
                        variant="caption"
                        textSizeType="note"
                        generalDisplaySettings={generalDisplaySettings}
                        color="text.secondary"
                      >
                        {item.cure_path_name}
                      </TypographySizeWrapper>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <TypographySizeWrapper
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                  >
                    {reportResult}
                  </TypographySizeWrapper>
                </TableCell>
                <TableCell align="center">
                  {item.images && item.images.length > 0 ? (
                    <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                      {item.images.length === 1 ? (
                        <Tooltip title="查看影像">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => {
                              viewImage(`${item.images[0].ipl_case_seq_no}@${item.images[0].read_pos}@${item.images[0].ctmri_mark}@${item.images[0].file_type}@${item.images[0].file_qty}`);
                            }}
                          >
                            <ImageIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        // Group images into chunks of 5
                        [...Array(Math.ceil(item.images.length / 5))].map((_, rowIndex) => (
                          <Box
                            key={`row-${rowIndex}`}
                            sx={{
                              display: 'flex',
                              width: '100%',
                              justifyContent: 'center',
                              mt: rowIndex > 0 ? 0.5 : 0
                            }}
                          >
                            {item.images.slice(rowIndex * 5, (rowIndex + 1) * 5).map((img, colIndex) => {
                              const imgIndex = rowIndex * 5 + colIndex;
                              return (
                                <Tooltip key={imgIndex} title={`查看影像 ${imgIndex+1}`}>
                                  <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={() => {
                                      viewImage(`${img.ipl_case_seq_no}@${img.read_pos}@${img.ctmri_mark}@${img.file_type}@${img.file_qty}`);
                                    }}
                                    sx={{ mx: 0.25 }}
                                  >
                                    {imgIndex === 0 ? (
                                      <PhotoLibraryIcon fontSize="small" />
                                    ) : (
                                      <TypographySizeWrapper
                                        variant="caption"
                                        textSizeType="content"
                                        generalDisplaySettings={generalDisplaySettings}
                                        sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}
                                      >
                                        {imgIndex + 1}
                                      </TypographySizeWrapper>
                                    )}
                                  </IconButton>
                                </Tooltip>
                              );
                            })}
                          </Box>
                        ))
                      )}
                    </Stack>
                  ) : item.ipl_case_seq_no && item.ctmri_mark === 'Y' ? (
                    // 直接處理項目本身包含影像資料的情況
                    <Tooltip title="查看影像">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => {
                          viewImage(`${item.ipl_case_seq_no}@${item.read_pos || '1'}@${item.ctmri_mark}@${item.file_type || 'DCF'}@${item.file_qty}`);
                        }}
                      >
                        <ImageIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ImagingData = ({ imagingData, generalDisplaySettings }) => {
  // 確保資料存在
  const initialData = {
    withReport: imagingData?.withReport || [],
    withoutReport: imagingData?.withoutReport || []
  };

  // 新增過濾選項的狀態
  const [filterOption, setFilterOption] = useState('all');

  // CT & MRI 的 order code 列表
  const ctMriOrderCodes = ['33085B', '33084B', '33072B', '33070B'];

  // 超音波的 order code 列表
  const ultrasoundOrderCodes = [
    '18047B', '19001C', '19002B', '19003C', '19004C', '19005C', '19007C',
    '19008B', '19009C', '19010C', '19011C', '19012C', '19013C', '19014C',
    '19015C', '19016C', '19017C', '19018C', '18006C', '18005C'
  ];

  // 整合報告和影像資料
  const processedData = processImagingData(initialData);

  // 檢查是否有 CT & MRI 和超音波的報告
  const hasCTMRIReports = React.useMemo(() => {
    return processedData.withReport.some(item =>
      ctMriOrderCodes.includes(item.order_code)
    );
  }, [processedData.withReport]);

  const hasUltrasoundReports = React.useMemo(() => {
    return processedData.withReport.some(item =>
      ultrasoundOrderCodes.includes(item.order_code)
    );
  }, [processedData.withReport]);

  // 是否顯示過濾選項
  const shouldShowFilter = hasCTMRIReports || hasUltrasoundReports;

  // 使用 Map 實現過濾邏輯，根據過濾選項取得對應的資料處理函數
  const filterMap = React.useMemo(() => new Map([
    // # zh-TW: 顯示所有報告
    ['all', () => processedData.withReport],
    // # zh-TW: 只顯示 CT & MRI 的報告
    ['ctmri', () => processedData.withReport.filter(item => 
      ctMriOrderCodes.includes(item.order_code)
    )],
    // # zh-TW: 只顯示超音波的報告
    ['ultrasound', () => processedData.withReport.filter(item => 
      ultrasoundOrderCodes.includes(item.order_code)
    )]
  ]), [processedData.withReport, ctMriOrderCodes, ultrasoundOrderCodes]);

  // 根據過濾選項過濾報告資料
  const filteredReportData = React.useMemo(() => {
    // # zh-TW: 如果不應該顯示過濾選項，則直接返回所有報告
    if (!shouldShowFilter) {
      return processedData.withReport;
    }
    
    // # zh-TW: 從 Map 獲取對應的過濾函數並執行
    const filterFunction = filterMap.get(filterOption);
    return filterFunction ? filterFunction() : processedData.withReport;
  }, [processedData.withReport, filterOption, shouldShowFilter, filterMap]);

  // 根據待取報告數量調整欄位寬度
  const pendingColSize = processedData.withoutReport.length === 0 ? 2 : 4;
  const reportColSize = processedData.withoutReport.length === 0 ? 10 : 8;

  // 處理過濾器改變
  const handleFilterChange = (event) => {
    const newValue = event.target.value;
    // 確保所選類型有報告，否則設置為 'all'
    if (newValue === 'ctmri' && !hasCTMRIReports) {
      setFilterOption('all');
    } else if (newValue === 'ultrasound' && !hasUltrasoundReports) {
      setFilterOption('all');
    } else {
      setFilterOption(newValue);
    }
  };

  // 當資料更新且所選類型沒有報告時，重置為 'all'
  useEffect(() => {
    if (filterOption === 'ctmri' && !hasCTMRIReports) {
      setFilterOption('all');
    } else if (filterOption === 'ultrasound' && !hasUltrasoundReports) {
      setFilterOption('all');
    }
  }, [hasCTMRIReports, hasUltrasoundReports, filterOption]);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={pendingColSize}>
        <TypographySizeWrapper
          variant="h6"
          textSizeType="title"
          generalDisplaySettings={generalDisplaySettings}
          gutterBottom
        >
          待取報告 ({processedData.withoutReport.length})
        </TypographySizeWrapper>
        {processedData.withoutReport.length === 0 ? (
          <TypographySizeWrapper
            textSizeType="content"
            generalDisplaySettings={generalDisplaySettings}
            color="text.secondary"
          >
            無待取報告項目
          </TypographySizeWrapper>
        ) : (
          <PendingImagingTable
            data={processedData.withoutReport}
            generalDisplaySettings={generalDisplaySettings}
          />
        )}
      </Grid>
      <Grid item xs={12} md={reportColSize}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <TypographySizeWrapper
            variant="h6"
            textSizeType="title"
            generalDisplaySettings={generalDisplaySettings}
            sx={{ mr: 2 }}
          >
            已有報告 ({filteredReportData.length})
          </TypographySizeWrapper>

          {shouldShowFilter && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Radio
                    value="all"
                    checked={filterOption === 'all'}
                    onChange={handleFilterChange}
                    size="small"
                  />
                }
                label={
                  <TypographySizeWrapper
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                  >
                    顯示所有
                  </TypographySizeWrapper>
                }
                sx={{ mr: 2 }}
              />

              {hasCTMRIReports && (
                <FormControlLabel
                  control={
                    <Radio
                      value="ctmri"
                      checked={filterOption === 'ctmri'}
                      onChange={handleFilterChange}
                      size="small"
                    />
                  }
                  label={
                    <TypographySizeWrapper
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      只顯示 CT & MRI
                    </TypographySizeWrapper>
                  }
                  sx={{ mr: 2 }}
                />
              )}

              {hasUltrasoundReports && (
                <FormControlLabel
                  control={
                    <Radio
                      value="ultrasound"
                      checked={filterOption === 'ultrasound'}
                      onChange={handleFilterChange}
                      size="small"
                    />
                  }
                  label={
                    <TypographySizeWrapper
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      只顯示超音波
                    </TypographySizeWrapper>
                  }
                />
              )}
            </Box>
          )}
        </Box>

        {filteredReportData.length === 0 ? (
          <TypographySizeWrapper
            textSizeType="content"
            generalDisplaySettings={generalDisplaySettings}
            color="text.secondary"
          >
            無報告項目
          </TypographySizeWrapper>
        ) : (
          <ReportImagingTable
            data={filteredReportData}
            generalDisplaySettings={generalDisplaySettings}
          />
        )}
      </Grid>
    </Grid>
  );
};

export default ImagingData;