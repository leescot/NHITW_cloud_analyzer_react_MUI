/**
 * Tab 2: 快速按鈕組件
 *
 * 顯示 6 個可配置的分析按鈕，點擊執行分析，結果可展開/收合
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Alert,
  Grid,
  Tooltip,
  Fade,
  Divider
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import * as MuiIcons from '@mui/icons-material';
import tabTemplateManager from '../../services/gai/tabs';
import MarkdownRenderer from './MarkdownRenderer';

const Tab2QuickButtons = ({ buttons, results, loadings, errors, onButtonClick }) => {
  // Track selected button slot
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Filter enabled buttons
  const enabledButtons = buttons?.filter(btn => btn.enabled) || [];

  // Get icon component from name
  const getIconComponent = (iconName) => {
    const Icon = MuiIcons[iconName] || MuiIcons.Help;
    return <Icon fontSize="small" />;
  };

  if (enabledButtons.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">無啟用的快速按鈕</Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          請至設定中配置快速按鈕
        </Typography>
      </Box>
    );
  }

  const activeBtn = selectedSlot !== null ? enabledButtons.find(b => b.slotIndex === selectedSlot) : null;
  const isLoading = activeBtn ? loadings[activeBtn.slotIndex] : false;
  const error = activeBtn ? errors[activeBtn.slotIndex] : null;
  const result = activeBtn ? results[activeBtn.slotIndex] || [] : [];
  const hasResult = result.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      {/* Top Buttons Grid */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>
          快速分析工具
        </Typography>
        <Grid container spacing={1}>
          {enabledButtons.map((buttonConfig) => {
            const { slotIndex, type, templateId, label, icon } = buttonConfig;
            const isBtnLoading = loadings[slotIndex] || false;
            const isSelected = selectedSlot === slotIndex;
            const template = type === 'preset' ? tabTemplateManager.getTemplate(templateId) : null;
            const displayLabel = label || template?.name || '未命名';
            const iconName = icon || template?.icon || 'AutoAwesome';

            return (
              <Grid item xs={4} key={slotIndex}>
                <Tooltip title={displayLabel} arrow>
                  <Button
                    variant={isSelected ? "outlined" : "outlined"}
                    color={isSelected ? "primary" : "inherit"}
                    fullWidth
                    onClick={() => {
                      setSelectedSlot(slotIndex);
                      onButtonClick(buttonConfig);
                    }}
                    sx={{
                      height: 52,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.25,
                      textTransform: 'none',
                      minWidth: 0,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'primary.50' : 'transparent',
                      '&:hover': {
                        borderWidth: isSelected ? 2 : 1,
                        bgcolor: isSelected ? 'primary.100' : 'rgba(0,0,0,0.04)'
                      },
                      '& .MuiButton-startIcon': { m: 0 }
                    }}
                  >
                    {isBtnLoading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      getIconComponent(iconName)
                    )}
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        width: '100%',
                        fontSize: '0.65rem',
                        fontWeight: isSelected ? 'bold' : 'normal'
                      }}
                    >
                      {displayLabel}
                    </Typography>
                  </Button>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Divider />

      {/* Shared Result Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight="bold">
              {activeBtn ? (activeBtn.label || tabTemplateManager.getTemplate(activeBtn.templateId)?.name) : '分析結果'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => activeBtn && onButtonClick(activeBtn)}
            disabled={isLoading || !activeBtn}
            color="primary"
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            position: 'relative',
            pr: 1
          }}
        >
          {isLoading && !hasResult && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, py: 4 }}>
              <CircularProgress size={30} />
              <Typography variant="body2" color="text.secondary">正在產生分析結果...</Typography>
            </Box>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => activeBtn && onButtonClick(activeBtn)}>
                  重試
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {!isLoading && !hasResult && !error && (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
              <InfoOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">尚無分析結果</Typography>
              <Typography variant="caption">點擊上方按鈕開始分析</Typography>
            </Box>
          )}

          <Fade in={hasResult}>
            <Box>
              {result.map((item, index) => {
                if (typeof item === 'string' && (
                  item.startsWith('(Total_tokens:') ||
                  item.startsWith('Total_tokens:') ||
                  item.includes('執行時間:')
                )) {
                  return null;
                }

                return (
                  <Box key={index} sx={{ mb: 1 }}>
                    <MarkdownRenderer content={item} variant="body2" />
                  </Box>
                );
              })}
            </Box>
          </Fade>
        </Box>
      </Box>
    </Box>
  );
};

export default Tab2QuickButtons;
