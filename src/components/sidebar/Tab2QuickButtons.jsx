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
  Collapse,
  IconButton,
  Paper,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import * as MuiIcons from '@mui/icons-material';
import tabTemplateManager from '../../services/gai/tabs';
import MarkdownRenderer from './MarkdownRenderer';

const Tab2QuickButtons = ({ buttons, results, loadings, errors, onButtonClick }) => {
  console.log('[Tab2QuickButtons] Rendering with buttons:', buttons);

  // Track which buttons are expanded
  const [expandedButtons, setExpandedButtons] = useState({});

  const toggleExpand = (slotIndex) => {
    setExpandedButtons(prev => ({
      ...prev,
      [slotIndex]: !prev[slotIndex]
    }));
  };

  // Get icon component from name
  const getIconComponent = (iconName) => {
    return MuiIcons[iconName] || MuiIcons.Help;
  };

  // Filter enabled buttons
  const enabledButtons = buttons?.filter(btn => btn.enabled) || [];

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {enabledButtons.map((buttonConfig) => {
        const { slotIndex, type, templateId, customConfig, label, icon } = buttonConfig;
        const isLoading = loadings[slotIndex] || false;
        const error = errors[slotIndex] || null;
        const result = results[slotIndex] || [];
        const isExpanded = expandedButtons[slotIndex] || false;
        const hasResults = result.length > 0;

        // Get template info (for preset buttons)
        const template = type === 'preset' ? tabTemplateManager.getTemplate(templateId) : null;
        const displayLabel = label || template?.name || '未命名';
        const IconComponent = getIconComponent(icon || template?.icon || 'Help');

        return (
          <Paper key={slotIndex} variant="outlined" sx={{ p: 2 }}>
            {/* Button Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: hasResults ? 1 : 0 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <IconComponent />}
                onClick={() => onButtonClick(buttonConfig)}
                disabled={isLoading}
                sx={{ flex: 1 }}
              >
                {displayLabel}
              </Button>

              {/* Expand/Collapse button (only show if has results) */}
              {hasResults && (
                <IconButton
                  size="small"
                  onClick={() => toggleExpand(slotIndex)}
                  sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
            </Box>

            {/* Error State */}
            {error && (
              <Alert
                severity="error"
                action={
                  <IconButton size="small" onClick={() => onButtonClick(buttonConfig)} color="inherit">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                }
                sx={{ mt: 1 }}
              >
                {error}
              </Alert>
            )}

            {/* Results Collapse */}
            <Collapse in={isExpanded}>
              <Box sx={{ mt: 2, pl: 2, borderLeft: '3px solid #1976d2' }}>
                {result.map((item, index) => {
                  // Filter out token and time stats
                  if (typeof item === 'string' && (
                    item.startsWith('(Total_tokens:') ||
                    item.startsWith('Total_tokens:') ||
                    item.includes('執行時間:')
                  )) {
                    return null;
                  }

                  return (
                    <Box key={index}>
                      <MarkdownRenderer content={item} variant="body2" />
                    </Box>
                  );
                })}
              </Box>
            </Collapse>
          </Paper>
        );
      })}
    </Box>
  );
};

export default Tab2QuickButtons;
