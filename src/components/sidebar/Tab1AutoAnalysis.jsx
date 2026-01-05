/**
 * Tab 1: 自動分析組件
 *
 * 顯示單一自動執行的分析結果
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Paper,
  Alert,
  Divider,
  Fade,
  Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import tabTemplateManager from '../../services/gai/tabs';
import MarkdownRenderer from './MarkdownRenderer';

const Tab1AutoAnalysis = ({ config, result, loading, error, onRetry }) => {
  const [copied, setCopied] = useState(false);

  // 取得模板資訊
  const template = config ? tabTemplateManager.getTemplate(config.templateId) : null;
  const hasResult = result && result.length > 0;

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      {/* Header Area */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="error" fontSize="small" />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
            {template?.name || '自動分析'}：載入時自動產生
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={copied ? "已複製" : "複製內容"}>
            <span>
              <IconButton size="small" onClick={handleCopy} disabled={!hasResult || loading} color={copied ? "success" : "default"}>
                {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="重新分析">
            <span>
              <IconButton size="small" onClick={onRetry} disabled={loading} color="primary">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <Divider />

      {/* Result Container */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
          pr: 1 // Add some padding for scrollbar
        }}
      >
        {loading && !hasResult && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, py: 4 }}>
            <CircularProgress size={30} color="error" />
            <Typography variant="body2" color="text.secondary">AI 正在自動分析病歷...</Typography>
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={onRetry}>
                重試
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {!loading && !hasResult && !error && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
            <Typography variant="body2">目前無自動分析內容</Typography>
            {template && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {template.description}
              </Typography>
            )}
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
  );
};

export default Tab1AutoAnalysis;
