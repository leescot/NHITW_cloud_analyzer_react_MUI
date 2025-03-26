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
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      mb: 0.25 
    }}>
      {enableCustomCopy && 
       (displayFormat !== 'vertical' && 
        displayFormat !== 'horizontal') ? (
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
      ) : (
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
      )}
    </Box>
  );
};

export default LabItemDisplay; 