/**
 * Tab 1: 自動分析組件
 *
 * 顯示單一自動執行的分析結果
 */

import { Box, Typography, CircularProgress, IconButton, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import tabTemplateManager from '../../services/gai/tabs';
import MarkdownRenderer from './MarkdownRenderer';

const Tab1AutoAnalysis = ({ config, result, loading, error, onRetry }) => {
  // 取得模板資訊
  const template = config ? tabTemplateManager.getTemplate(config.templateId) : null;

  // 停用狀態
  if (!config || !config.enabled) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">自動分析已停用</Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          請至設定中啟用自動分析功能
        </Typography>
      </Box>
    );
  }

  // Loading 狀態
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
        <CircularProgress size={30} color="error" />
        <Typography variant="body2" color="text.secondary">
          正在分析...
        </Typography>
        {template && (
          <Typography variant="caption" color="text.secondary">
            {template.name}
          </Typography>
        )}
      </Box>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: '#fff3e0',
          borderColor: '#ffcc80',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="error" fontWeight="medium" gutterBottom>
            分析失敗
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {error}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onRetry} color="primary">
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Paper>
    );
  }

  // 無結果狀態
  if (!result || result.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary', opacity: 0.7 }}>
        <Typography variant="body2">無分析項目</Typography>
        {template && (
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {template.description}
          </Typography>
        )}
      </Box>
    );
  }

  // 顯示結果
  return (
    <Box>
      {/* 標題區域 */}
      {template && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'error.main' }}>
          <WarningIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle2" fontWeight="bold">
            {template.name}
          </Typography>
        </Box>
      )}

      {/* 結果列表 */}
      <Box>
        {result.map((item, index) => {
          // 過濾掉 token 和時間統計資訊
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

      {/* 顯示統計資訊（如果有） */}
      {result.some(item =>
        typeof item === 'string' && item.startsWith('(Total_tokens:')
      ) && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="caption" color="text.secondary">
            {result.find(item =>
              typeof item === 'string' && item.startsWith('(Total_tokens:')
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Tab1AutoAnalysis;
