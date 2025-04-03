import React from "react";
import { Box, Checkbox, FormControlLabel } from "@mui/material";
import TypographySizeWrapper from "../../utils/TypographySizeWrapper";
import { getStatusColor, formatReferenceRange } from "../../utils/lab/LabUtilities";

// 生成測試項目顯示
const LabItemDisplay = ({
  lab,
  groupIndex,
  labIndex,
  selectedLabItems,
  handleToggleLabItem,
  generalDisplaySettings,
  labSettings
}) => {
  const {
    enableCustomCopy,
    displayFormat,
    enableAbbrev,
    showUnit,
    showReference,
    highlightAbnormal
  } = labSettings;

  const labId = `${groupIndex}-${labIndex}`;
  const isSelected = selectedLabItems[groupIndex]?.[labId] || false;

  // 使用 Map 來決定渲染哪個組件
  const displayComponents = new Map([
    // 顯示帶有複選框的版本 - 當啟用自定義複製且顯示格式不是垂直或水平
    [
      () => enableCustomCopy && 
            (displayFormat !== 'vertical' && 
             displayFormat !== 'horizontal'),
      () => (
        <FormControlLabel
          control={
            <Checkbox
              checked={isSelected}
              onChange={() => handleToggleLabItem(groupIndex, labIndex)}
              size="small"
              disableRipple
              sx={{
                color: 'rgba(0, 0, 0, 0.25)',
                '&.Mui-checked': {
                  color: '#9c64a6', // 淡紫色 (比 secondary.main 更淡)
                },
                padding: 0,
                marginRight: 0.5
              }}
            />
          }
          label={
            <TypographySizeWrapper
              variant="body2"
              textSizeType="content"
              generalDisplaySettings={generalDisplaySettings}
              style={{
                color: getStatusColor(lab, highlightAbnormal),
                display: "inline-block",
                marginBottom: 0,
                lineHeight: 1.2
              }}
            >
              {enableAbbrev ? (lab.abbrName || lab.itemName) : lab.itemName}{" "}
              <span style={{ fontWeight: 'medium' }}>
                {lab.value}
              </span>
              {showUnit && lab.unit && (
                <span style={{ color: "gray" }}>{` ${lab.unit}`}</span>
              )}
              {formatReferenceRange(lab, showReference)}
            </TypographySizeWrapper>
          }
          sx={{
            m: 0,
            p: 0,
            alignItems: 'center',
            '& .MuiCheckbox-root': {
              padding: 0
            },
            '& .MuiFormControlLabel-label': {
              marginTop: 0,
              marginLeft: 0
            },
            marginLeft: 0,
            paddingLeft: 0
          }}
        />
      )
    ],
    // 預設顯示 - 不帶複選框的簡化版
    [
      () => true,
      () => (
        <TypographySizeWrapper
          variant="body2"
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          style={{
            color: getStatusColor(lab, highlightAbnormal),
            display: "inline-block",
            marginBottom: 0
          }}
        >
          {enableAbbrev ? (lab.abbrName || lab.itemName) : lab.itemName}{" "}
          <span style={{ fontWeight: 'medium' }}>
            {lab.value}
          </span>
          {showUnit && lab.unit && (
            <span style={{ color: "gray" }}>{` ${lab.unit}`}</span>
          )}
          {formatReferenceRange(lab, showReference)}
        </TypographySizeWrapper>
      )
    ]
  ]);

  // 渲染合適的組件
  let renderedComponent = null;
  for (const [condition, renderer] of displayComponents) {
    if (condition()) {
      renderedComponent = renderer();
      break;
    }
  }

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      mb: 0.25
    }}>
      {renderedComponent}
    </Box>
  );
};

export default LabItemDisplay;