import React from 'react';
import { Chip, Tooltip, Box, Typography } from "@mui/material";
import AcupunctureIcon from '@mui/icons-material/LocalHospital';
import { NOTE_TEXT_SIZES } from "../../utils/textSizeUtils";

/**
 * 針灸適應症指示器組件
 *
 * 顯示患者是否符合針灸申報條件：
 * - 高度複雜性針灸（深琥珀色 #e65100）
 * - 中度複雜性針灸（琥珀色 #fb8c00）
 */
const AcupunctureIndicator = ({ type, matchedDiagnoses = [], fontSize }) => {
  if (!type || matchedDiagnoses.length === 0) return null;

  // 使用 NOTE_TEXT_SIZES 並設定默認值
  const fontSizeValue = NOTE_TEXT_SIZES[fontSize] || NOTE_TEXT_SIZES['small'];

  // 根據類型決定顏色和標籤
  const config = {
    highly: {
      label: '高複雜',
      color: '#e65100',      // 深琥珀色
      borderColor: '#bf360c', // 更深的邊框色
      bgColor: '#e65100',
      title: '符合高度複雜性針灸適應症'
    },
    moderate: {
      label: '中複雜',
      color: '#fb8c00',      // 琥珀色
      borderColor: '#e65100', // 深琥珀色邊框
      bgColor: '#fb8c00',
      title: '符合中度複雜性針灸適應症'
    }
  };

  const currentConfig = config[type];

  if (!currentConfig) return null;

  // 建立 Tooltip 內容 - 顯示所有符合的診斷
  const tooltipContent = (
    <Box sx={{ maxWidth: 400, maxHeight: 500, overflowY: 'auto' }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
        {currentConfig.title}
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        符合的病名 (共 {matchedDiagnoses.length} 筆)：
      </Typography>
      {matchedDiagnoses.map((diagnosis, index) => (
        <Box key={index} sx={{ ml: 1, mb: 0.3 }}>
          <Typography variant="caption" component="div">
            • {diagnosis.code} {diagnosis.name}
            {diagnosis.type && ` (${diagnosis.type})`}
            {diagnosis.count > 1 && ` ×${diagnosis.count}`}
          </Typography>
        </Box>
      ))}
      {type === 'highly' && (
        <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic', color: 'warning.light' }}>
          建議優先使用高度複雜性申報
        </Typography>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Chip
        icon={<AcupunctureIcon />}
        label={currentConfig.label}
        size="small"
        sx={{
          mx: 0.5,
          backgroundColor: currentConfig.bgColor,
          color: 'white',
          border: `1px solid ${currentConfig.borderColor}`,
          fontWeight: 'bold',
          '& .MuiChip-label': {
            fontSize: fontSizeValue,
            paddingLeft: '8px',
            paddingRight: '8px'
          },
          '& .MuiChip-icon': {
            color: 'white',
            fontSize: '1rem'
          },
          '&:hover': {
            backgroundColor: currentConfig.borderColor,
            cursor: 'pointer'
          }
        }}
      />
    </Tooltip>
  );
};

export default AcupunctureIndicator;
