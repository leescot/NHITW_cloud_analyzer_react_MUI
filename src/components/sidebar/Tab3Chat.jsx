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
  Chip,
  Divider,
  Avatar
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PsychologyIcon from '@mui/icons-material/Psychology';
import MarkdownRenderer from './MarkdownRenderer';

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
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

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
      {/* Session Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ChatIcon color="primary" fontSize="small" />
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">AI 智慧對答</Typography>
          <Typography variant="caption" color="text.secondary">基於病歷資料進行自由對話</Typography>
        </Box>
      </Box>

      <Divider />

      {/* Chat History Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          px: 0.5,
          minHeight: 200,
          maxHeight: 500,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 4 }
        }}
      >
        {history.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled', opacity: 0.7 }}>
            <PsychologyIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">準備好開始對話了嗎？</Typography>
            <Typography variant="caption">您可以詢問病歷細節、用藥建議或檢驗摘要</Typography>
          </Box>
        )}

        {history.map((message, index) => {
          const isUser = message.role === 'user';
          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, maxWidth: '90%' }}>
                {!isUser && (
                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'error.light' }}>
                    <PsychologyIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                )}
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: isUser ? 'primary.main' : '#f0f2f5',
                    color: isUser ? 'primary.contrastText' : 'text.primary',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    border: isUser ? 'none' : '1px solid #e0e0e0'
                  }}
                >
                  {isUser ? (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {message.content}
                    </Typography>
                  ) : (
                    <MarkdownRenderer content={message.content} variant="body2" />
                  )}
                </Paper>
                {isUser && (
                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.light' }}>
                    <AccountCircleIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                )}
              </Box>

              {message.metadata && !isUser && (
                <Typography variant="caption" color="text.disabled" sx={{ ml: 4, mt: 0.5 }}>
                  {message.metadata.tokens && `${message.metadata.tokens} tokens`}
                  {message.metadata.duration && ` • ${message.metadata.duration}s`}
                </Typography>
              )}
            </Box>
          );
        })}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
            <CircularProgress size={12} thickness={5} />
            <Typography variant="caption" color="text.secondary">AI 正在思考...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ py: 0, px: 2 }}>
            {error}
          </Alert>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Bottom Controls */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Quick Questions - WRAP layout */}
        {quickQuestions.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {quickQuestions.map((question, index) => (
              <Chip
                key={index}
                label={question}
                size="small"
                onClick={() => onQuickQuestion(question)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: 'white',
                  height: 24,
                  fontSize: '0.75rem',
                  '& .MuiChip-label': { px: 1 }
                }}
                variant="outlined"
              />
            ))}
          </Box>
        )}

        {/* Input Field */}
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            p: 0.75,
            borderRadius: 2,
            bgcolor: '#fcfcfc',
            '&:focus-within': { borderColor: 'primary.main', bgcolor: 'white' }
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="請輸入醫療相關問題..."
            value={userInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={{ px: 1, py: 0.25 }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!userInput.trim() || loading}
            size="small"
            sx={{ p: 0.5 }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Box>
    </Box>
  );
};

export default Tab3Chat;
