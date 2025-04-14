import React from "react";
import { Typography, Box, IconButton, Tooltip } from "@mui/material";
import { styled } from '@mui/material/styles';
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

// 方法：使用相對定位和絕對定位為圖標添加文字
export const IconWithTextOverlay = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

export const TextOverlay = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  fontSize: '9px',
  fontWeight: 'bold',
  color: theme.palette.primary.contrastText,
  backgroundColor: theme.palette.primary.main,
  padding: '1px 2px',
  borderRadius: '2px',
  lineHeight: 1,
  right: 0,
  bottom: 0
}));

// 複製全部按鈕
export const CopySectionButton = ({ onClick, style, showLabel = true }) => {
  return (
    <Tooltip title="複製此區段檢驗資料">
      <IconButton onClick={onClick} size="small" sx={style}>
        <IconWithTextOverlay>
          <ContentCopyIcon fontSize="small" color="primary" />
          {showLabel && (
            <TextOverlay sx={{ backgroundColor: 'primary.main' }}>All</TextOverlay>
          )}
        </IconWithTextOverlay>
      </IconButton>
    </Tooltip>
  );
};

// 複製選定項目按鈕
export const CopySelectedButton = ({ onClick, style }) => {
  return (
    <Tooltip title="複製選擇的檢驗項目">
      <IconButton onClick={onClick} size="small" sx={style}>
        <IconWithTextOverlay>
          <ContentCopyIcon fontSize="small" color="secondary" />
          <TextOverlay sx={{ backgroundColor: 'secondary.main' }}>Sel</TextOverlay>
        </IconWithTextOverlay>
      </IconButton>
    </Tooltip>
  );
};