/**
 * Tab 2: 快速按鈕組件
 *
 * 顯示 6 個可配置的分析按鈕，點擊執行分析，結果可展開/收合
 */

import { useState } from 'react';
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import * as MuiIcons from '@mui/icons-material';
import tabTemplateManager from '../../services/gai/tabs';
import MarkdownRenderer from './MarkdownRenderer';

const Tab2QuickButtons = ({ buttons, results, loadings, errors, onButtonClick }) => {
  // Track selected button slot
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [copied, setCopied] = useState(false);

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

  // 複製內容（排除統計資訊）
  const handleCopy = () => {
    if (!hasResult) return;
    const contentToCopy = result
      .filter(item => typeof item !== 'string' || !item.startsWith('[STATS]'))
      .join('\n');
    navigator.clipboard.writeText(contentToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      {/* Top Buttons Grid */}
      <Box>

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={copied ? "已複製" : "複製內容"}>
              <span>
                <IconButton size="small" onClick={handleCopy} disabled={!hasResult || isLoading} color={copied ? "success" : "default"}>
                  {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="重新分析">
              <span>
                <IconButton
                  size="small"
                  onClick={() => activeBtn && onButtonClick(activeBtn)}
                  disabled={isLoading || !activeBtn}
                  color="primary"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
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
                // 過濾掉統計資訊
                if (typeof item === 'string' && item.startsWith('[STATS]')) {
                  return null;
                }

                return (
                  <Box key={index} sx={{ mb: 1 }}>
                    <MarkdownRenderer content={item} variant="body2" />
                  </Box>
                );
              })}

              {/* 統計資訊 */}
              {result.some(item => typeof item === 'string' && item.startsWith('[STATS]')) && (
                <Box sx={{
                  mt: 1,
                  pt: 1,
                  borderTop: '1px dashed #eee',
                  textAlign: 'right',
                  opacity: 0.6
                }}>
                  <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                    {(() => {
                      const statsItem = result.find(item => typeof item === 'string' && item.startsWith('[STATS]'));
                      const stats = statsItem ? statsItem.replace('[STATS]', '') : '';
                      return `AI 可能出錯，請查核資訊 / ${stats}`;
                    })()}
                  </Typography>
                </Box>
              )}
            </Box>
          </Fade>
        </Box>
      </Box>
    </Box>
  );
};

export default Tab2QuickButtons;
