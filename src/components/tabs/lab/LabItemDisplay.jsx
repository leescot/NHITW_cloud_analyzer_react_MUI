import React from "react";
import { Box, Checkbox } from "@mui/material";
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
      mb: 0.5 
    }}>
      {enableCustomCopy && 
       (displayFormat !== 'vertical' && 
        displayFormat !== 'horizontal') && (
        <Checkbox 
          checked={isSelected}
          onChange={() => handleToggleLabItem(groupIndex, labIndex)}
          size="small"
          sx={{ 
            p: 0.5, 
            mr: 0.5,
            color: 'rgba(0, 0, 0, 0.25)',
            '&.Mui-checked': {
              color: '#9c64a6', // 淡紫色 (比 secondary.main 更淡)
            }
          }}
        />
      )}
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
    </Box>
  );
};

export default LabItemDisplay; 