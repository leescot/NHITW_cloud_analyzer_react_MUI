import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl
} from '@mui/material';
import { labProcessor } from '../../utils/labProcessor';
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const LabTableView = ({ groupedLabs, labSettings, generalDisplaySettings }) => {
  console.log("LabTableView rendering with lab settings:", labSettings);
  // 獲取所有可用的檢驗類型
  const allLabTypes = labProcessor.getAllLabTypes(groupedLabs);
  
  // 按指定順序排序檢驗類型
  const labTypes = sortLabTypes(allLabTypes);

  // 狀態管理選擇的檢驗類型 - 初始值設為排序後的第一個類型（如果有的話）
  const [selectedType, setSelectedType] = useState(labTypes.length > 0 ? labTypes[0].value : 'all');
  
  // 按優先順序排序檢驗類型的輔助函數
  function sortLabTypes(types) {
    const priorityTypes = ["生化學檢查", "血液學檢查", "尿液檢查"];
    const priorityMap = new Map(priorityTypes.map((type, index) => [type, index]));
    
    // 將所有類型轉換為具有標籤和值的對象
    const typeObjects = types.map(type => ({
      label: type,
      value: type
    }));
    
    // 排序: 優先類型按指定順序，其他類型按原順序，"所有檢驗"放最後
    return typeObjects.sort((a, b) => {
      const priorityA = priorityMap.has(a.label) ? priorityMap.get(a.label) : 999;
      const priorityB = priorityMap.has(b.label) ? priorityMap.get(b.label) : 999;
      return priorityA - priorityB;
    });
  }
  
  // 添加"所有檢驗"選項（放在最後）
  const radioOptions = [...labTypes, { label: "所有檢驗", value: "all" }];
  
  // 根據選擇的類型準備表格數據
  const { dates, items } = labProcessor.prepareLabTableData(
    groupedLabs, 
    selectedType === 'all' ? null : selectedType
  );

  // 類型選擇變更處理
  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
  };

  // 格式化日期顯示
  const formatDateHeader = (dateStr) => {
    if (!dateStr) return '';
    
    // 假設日期格式為 'YYYY-MM-DD'
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    
    return (
      <Box>
        <TypographySizeWrapper 
          variant="caption" 
          textSizeType="note"
          generalDisplaySettings={generalDisplaySettings}
          color="text.secondary" 
          display="block"
        >
          {year}
        </TypographySizeWrapper>
        <TypographySizeWrapper 
          variant="body2"
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
        >
          {month}/{day}
        </TypographySizeWrapper>
      </Box>
    );
  };

  // 定義根據異常值狀態獲取顏色的函數
  const getStatusColor = (valueStatus, highlightAbnormal) => {
    if (!highlightAbnormal) return "inherit";
    if (valueStatus === "high") return "#c62828"; // 紅色
    if (valueStatus === "low") return "#2e7d32"; // 綠色
    return "inherit"; // 正常值
  };

  // 定義根據異常值狀態獲取背景色的函數
  const getStatusBackgroundColor = (valueStatus, highlightAbnormal) => {
    if (!highlightAbnormal) return "inherit";
    if (valueStatus === "high") return "#fff0f0"; // 更明顯但不太強烈的淡紅色
    if (valueStatus === "low") return "#f0fff0"; // 更明顯但不太強烈的淡綠色
    return "inherit"; // 正常值
  };

  if (dates.length === 0 || items.length === 0) {
    return (
      <Box sx={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
        <FormControl component="fieldset" sx={{ m: 1, mt: 0.5 }}>
          <RadioGroup
            row
            name="lab-type-group"
            value={selectedType}
            onChange={handleTypeChange}
          >
            {radioOptions.map(option => (
              <FormControlLabel 
                key={option.value} 
                value={option.value} 
                control={<Radio size="small" />} 
                label={
                  <TypographySizeWrapper
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                  >
                    {option.label}
                  </TypographySizeWrapper>
                }
              />
            ))}
          </RadioGroup>
        </FormControl>
        <TypographySizeWrapper 
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          color="text.secondary" 
          sx={{ m: 2 }}
        >
          沒有可顯示的檢驗數據
        </TypographySizeWrapper>
      </Box>
    );
  }

  return (
    // 外層容器使用固定高度，不設置overflow，讓它顯示整個內容
    <Box sx={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      {/* 縮小類型選擇器間距 */}
      <FormControl component="fieldset" sx={{ mx: 1, my: 0.5 }}>
        <RadioGroup
          row
          name="lab-type-group"
          value={selectedType}
          onChange={handleTypeChange}
        >
          {radioOptions.map(option => (
            <FormControlLabel 
              key={option.value} 
              value={option.value} 
              control={<Radio size="small" />} 
              label={
                <TypographySizeWrapper
                  textSizeType="content"
                  generalDisplaySettings={generalDisplaySettings}
                >
                  {option.label.replace(/檢查/g, '')}
                </TypographySizeWrapper>
              }
              sx={{ mr: 1 }}
            />
          ))}
        </RadioGroup>
      </FormControl>
      
      {/* 表格容器設置為flex-grow: 1並啟用滾動 */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          width: '100%', 
          flexGrow: 1, 
          overflow: 'auto',
          // 確保滾動條在表格內部
          '& ::-webkit-scrollbar': {
            width: '8px',
            height: '8px'
          },
          '& ::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px'
          }
        }}
      >
        <Table stickyHeader size="small" aria-label="lab results table">
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  position: 'sticky', 
                  left: 0, 
                  top: 0,
                  backgroundColor: '#f5f5f5', 
                  zIndex: 3,
                  borderBottom: '2px solid #e0e0e0'
                }}
              >
                <TypographySizeWrapper
                  textSizeType="content"
                  generalDisplaySettings={generalDisplaySettings}
                >
                  檢驗項目
                </TypographySizeWrapper>
              </TableCell>
              {dates.map((dateInfo, index) => (
                <TableCell 
                  key={index} 
                  align="center"
                  sx={{ 
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#f5f5f5',
                    zIndex: 2,
                    borderBottom: '2px solid #e0e0e0'
                  }}
                >
                  {formatDateHeader(dateInfo.date)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.key} hover>
                <TableCell 
                  component="th" 
                  scope="row"
                  sx={{ 
                    position: 'sticky', 
                    left: 0, 
                    backgroundColor: 'white',
                    zIndex: 1,
                    // 當滑鼠懸停時調整背景色
                    '.MuiTableRow-hover:hover &': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}
                >
                  <TypographySizeWrapper 
                    variant="body2" 
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                    fontWeight="medium"
                  >
                    {item.displayName}
                  </TypographySizeWrapper>
                </TableCell>
                
                {dates.map((dateInfo, dateIndex) => {
                  const dateKey = `${dateInfo.date}_${dateInfo.hosp}`;
                  const value = item.values[dateKey];
                  
                  return (
                    <TableCell 
                      key={dateIndex} 
                      align="center"
                      sx={{
                        color: getStatusColor(
                          value?.valueStatus,
                          labSettings?.highlightAbnormal
                        ),
                        backgroundColor: getStatusBackgroundColor(
                          value?.valueStatus,
                          labSettings?.highlightAbnormal
                        ),
                        padding: '4px 8px'
                      }}
                    >
                      {value ? (
                        <Box>
                          <TypographySizeWrapper
                            variant="body2"
                            textSizeType="content"
                            generalDisplaySettings={generalDisplaySettings}
                            sx={{
                              color: getStatusColor(value.valueStatus, labSettings.highlightAbnormal),
                            }}
                          >
                            {value.value}
                            {labSettings.showUnit && value.unit && (
                              <TypographySizeWrapper
                                component="span"
                                textSizeType="note"
                                generalDisplaySettings={generalDisplaySettings}
                                sx={{ color: "gray" }}
                              >
                                {` ${value.unit}`}
                              </TypographySizeWrapper>
                            )}
                            {labSettings.showReference &&
                              value.referenceMin !== null && (
                                <TypographySizeWrapper
                                  component="span"
                                  textSizeType="note"
                                  generalDisplaySettings={generalDisplaySettings}
                                  sx={{ color: "gray" }}
                                >
                                  {` (${value.referenceMin}${
                                    value.referenceMax !== null
                                      ? `-${value.referenceMax}`
                                      : ""
                                  })`}
                                </TypographySizeWrapper>
                              )}
                          </TypographySizeWrapper>
                        </Box>
                      ) : (
                        <TypographySizeWrapper 
                          variant="body2" 
                          textSizeType="content"
                          generalDisplaySettings={generalDisplaySettings}
                          color="text.disabled"
                        >
                          —
                        </TypographySizeWrapper>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LabTableView;