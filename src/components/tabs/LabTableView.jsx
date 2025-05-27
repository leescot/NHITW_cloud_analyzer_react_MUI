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
  // console.log("LabTableView rendering with lab settings:", labSettings);
  // 擷取所有可用的檢驗型別
  const allLabTypes = labProcessor.getAllLabTypes(groupedLabs);

  // 按指定順序排序檢驗型別
  const labTypes = sortLabTypes(allLabTypes);

  // 狀態管理選擇的檢驗型別 - 初始值設為排序後的第一個型別（如果有的話）
  const [selectedType, setSelectedType] = useState(labTypes.length > 0 ? labTypes[0].value : 'all');

  // 按優先順序排序檢驗型別的輔助函式
  function sortLabTypes(types) {
    const priorityTypes = ["生化學檢查", "血液學檢查", "尿液檢查"];
    const priorityMap = new Map(priorityTypes.map((type, index) => [type, index]));

    // 將所有型別轉換為具有標籤和值的對象
    const typeObjects = types.map(type => ({
      label: type,
      value: type
    }));

    // 排序: 優先型別按指定順序，其他型別按原順序，"所有檢驗"放最後
    return typeObjects.sort((a, b) => {
      const priorityA = priorityMap.has(a.label) ? priorityMap.get(a.label) : 999;
      const priorityB = priorityMap.has(b.label) ? priorityMap.get(b.label) : 999;
      return priorityA - priorityB;
    });
  }

  // 添加"所有檢驗"選項（放在最後）
  const radioOptions = [...labTypes, { label: "所有檢驗", value: "all" }];

  // 根據選擇的型別準備表格數據
  const { dates, items } = labProcessor.prepareLabTableData(
    groupedLabs,
    selectedType === 'all' ? null : selectedType
  );

  // 型別選擇變更處理
  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
  };

  // 使用 Map 來定義日期格式轉換邏輯
  const dateFormatterMap = new Map([
    // 格式化日期顯示
    ['valid', (parts) => {
      const [year, month, day] = parts;
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
    }],
    ['invalid', (dateStr) => dateStr],
    ['empty', () => '']
  ]);

  // 格式化日期顯示
  const formatDateHeader = (dateStr) => {
    // 日期為空的情況
    if (!dateStr) return dateFormatterMap.get('empty')();
    
    // 嘗試分割日期字串
    const parts = dateStr.split('-');
    
    // 判斷日期格式是否有效
    const dateStatus = parts.length === 3 ? 'valid' : 'invalid';
    
    // 使用 Map 擷取對應的格式化函式
    return dateFormatterMap.get(dateStatus)(dateStatus === 'valid' ? parts : dateStr);
  };

  // 使用 Map 定義異常值狀態對應的顏色
  const statusColorMap = new Map([
    ["high", "#c62828"], // 紅色
    ["low", "#2e7d32"],  // 綠色
    ["default", "inherit"] // 正常值
  ]);

  // 使用 Map 定義異常值狀態對應的背景色
  const statusBackgroundColorMap = new Map([
    ["high", "#fff0f0"], // 更明顯但不太強烈的淡紅色
    ["low", "#f0fff0"],  // 更明顯但不太強烈的淡綠色
    ["default", "inherit"] // 正常值
  ]);

  // 定義根據異常值狀態擷取顏色的函式
  const getStatusColor = (valueStatus, highlightAbnormal) => {
    // 如果不需要標示異常值，直接返回預設值
    if (!highlightAbnormal) return "inherit";
    // 根據狀態從 Map 中擷取顏色，若找不到則使用預設值
    return statusColorMap.get(valueStatus) || statusColorMap.get("default");
  };

  // 定義根據異常值狀態擷取背景色的函式
  const getStatusBackgroundColor = (valueStatus, highlightAbnormal) => {
    // 如果不需要標示異常值，直接返回預設值
    if (!highlightAbnormal) return "inherit";
    // 根據狀態從 Map 中擷取背景色，若找不到則使用預設值
    return statusBackgroundColorMap.get(valueStatus) || statusBackgroundColorMap.get("default");
  };

  if (dates.length === 0 || items.length === 0) {
    return (
      <Box sx={{ height: 'calc(100vh - 210px)', display: 'flex', flexDirection: 'column' }}>
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
    // 調整容器高度，減少重疊問題
    <Box sx={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 縮小型別選擇器間距 */}
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

      {/* 調整表格容器以確保其適合父容器 */}
      <TableContainer
        component={Paper}
        sx={{
          width: '100%',
          flexGrow: 1,
          overflow: 'auto',
          // 移除底部空間
          mb: 0,
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
                              (value.formattedReference ? (
                                <TypographySizeWrapper
                                  component="span"
                                  textSizeType="note"
                                  generalDisplaySettings={generalDisplaySettings}
                                  sx={{ color: "gray" }}
                                >
                                  {` (${value.formattedReference})`}
                                </TypographySizeWrapper>
                              ) : value.referenceMin !== null ? (
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
                              ) : null)}
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