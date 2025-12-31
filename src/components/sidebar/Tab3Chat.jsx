/**
 * Tab 3: Chat 對話組件
 *
 * 多輪對話功能，與醫療資料互動
 */

import { useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  CircularProgress,
  Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

const Tab3Chat = ({
  config,
  history,
  loading,
  error,
  userInput,
  onInputChange,
  onSendMessage,
  onQuickQuestion
}) => {
  console.log('[Tab3Chat] Rendering with config:', config);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = () => {
    if (userInput.trim() && !loading) {
      onSendMessage(userInput);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Chat disabled state
  if (!config || !config.enabled) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">Chat 功能已停用</Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          請至設定中啟用 Chat 功能
        </Typography>
      </Box>
    );
  }

  const quickQuestions = config.quickQuestions || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      {/* Quick Questions */}
      {quickQuestions.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            快速提問：
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
            {quickQuestions.map((question, index) => (
              <Chip
                key={index}
                label={question}
                size="small"
                onClick={() => onQuickQuestion(question)}
                sx={{ cursor: 'pointer' }}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Chat History */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          minHeight: 300,
          maxHeight: 500
        }}
      >
        {history.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary', opacity: 0.7 }}>
            <Typography variant="body2">尚無對話</Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              輸入問題或點擊快速提問開始對話
            </Typography>
          </Box>
        )}

        {history.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <Paper
              sx={{
                p: 1.5,
                maxWidth: '85%',
                bgcolor: message.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                borderRadius: 2
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                {message.role === 'user' ? '您' : 'AI 助手'}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {message.content}
              </Typography>
              {message.metadata && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {message.metadata.tokens && `Tokens: ${message.metadata.tokens} | `}
                  {message.metadata.duration && `時間: ${message.metadata.duration}s`}
                </Typography>
              )}
            </Paper>
          </Box>
        ))}

        {/* Loading indicator */}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              AI 思考中...
            </Typography>
          </Box>
        )}

        {/* Error message */}
        {error && (
          <Paper sx={{ p: 1.5, bgcolor: '#ffebee', borderRadius: 2 }}>
            <Typography variant="body2" color="error">
              錯誤：{error}
            </Typography>
          </Paper>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Box */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder="輸入您的問題..."
          value={userInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          size="small"
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!userInput.trim() || loading}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Tab3Chat;
