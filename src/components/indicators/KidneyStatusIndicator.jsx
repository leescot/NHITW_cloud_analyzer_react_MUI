import React from 'react';
import { Chip, Tooltip } from "@mui/material";
import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
import { NOTE_TEXT_SIZES } from "../../utils/textSizeUtils";

// 腎臟狀態指示器組件
const KidneyStatusIndicator = ({ stage, fontSize }) => {
  if (stage === null) return null;

  // 使用 NOTE_TEXT_SIZES 並設定默認值
  const fontSizeValue = NOTE_TEXT_SIZES[fontSize] || NOTE_TEXT_SIZES['small'];

  // 根據階段決定顏色
  let color;
  switch(stage) {
    case 3:
      color = "warning"; // Stage 3 使用橙色
      break;
    case 4:
    case 5:
      color = "error"; // Stage 4-5 使用紅色
      break;
    default:
      color = "default";
  }

  return (
    <Tooltip title={`慢性腎臟病 Stage ${stage}`}>
      <Chip
        icon={<ReportRoundedIcon />}
        label={`CKD${stage}`}
        size="small"
        color={color}
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

export default KidneyStatusIndicator;