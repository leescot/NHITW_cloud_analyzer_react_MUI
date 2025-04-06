import React from 'react';
import { Chip, Tooltip } from "@mui/material";
import { NOTE_TEXT_SIZES } from "../../utils/textSizeUtils";

// 狀態指示器組件
const StatusIndicator = ({ label, hasData, icon, fontSize, tooltipTitle }) => {
  // 使用 NOTE_TEXT_SIZES 並設定默認值
  const fontSizeValue = NOTE_TEXT_SIZES[fontSize] || NOTE_TEXT_SIZES['small'];

  return (
    <Tooltip title={tooltipTitle || (hasData ? `有${label}資料` : `無${label}資料`)}>
      <Chip
        icon={React.createElement(icon)}
        label={label}
        size="small"
        color={hasData ? "success" : "default"}
        variant={hasData ? "filled" : "outlined"}
        sx={{
          mx: 0.5,
          '& .MuiChip-label': {
            fontSize: fontSizeValue
          }
        }}
      />
    </Tooltip>
  );
};

export default StatusIndicator;