/**
 * 自訂按鈕編輯器
 *
 * 編輯自訂按鈕的配置（名稱、資料類型、system prompt）
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip
} from '@mui/material';
import { DATA_TYPE_METADATA } from '../../config/dataTypeMetadata';

const CustomButtonEditor = ({ open, buttonConfig, onClose, onSave }) => {
  const [localConfig, setLocalConfig] = useState({
    label: '',
    icon: 'AutoAwesome',
    dataTypes: [],
    systemPrompt: '',
    schema: null
  });

  // Sync with buttonConfig when dialog opens
  useEffect(() => {
    if (open && buttonConfig) {
      setLocalConfig({
        label: buttonConfig.label || '',
        icon: buttonConfig.icon || 'AutoAwesome',
        dataTypes: buttonConfig.customConfig?.dataTypes || [],
        systemPrompt: buttonConfig.customConfig?.systemPrompt || '',
        schema: buttonConfig.customConfig?.schema || null
      });
    }
  }, [open, buttonConfig]);

  const handleDataTypeToggle = (dataType) => {
    setLocalConfig(prev => ({
      ...prev,
      dataTypes: prev.dataTypes.includes(dataType)
        ? prev.dataTypes.filter(dt => dt !== dataType)
        : [...prev.dataTypes, dataType]
    }));
  };

  const handleSave = () => {
    // Construct updated button config
    const updatedConfig = {
      ...buttonConfig,
      label: localConfig.label,
      icon: localConfig.icon,
      customConfig: {
        dataTypes: localConfig.dataTypes,
        systemPrompt: localConfig.systemPrompt,
        schema: localConfig.schema
      }
    };

    onSave(updatedConfig);
    onClose();
  };

  // Get all available data types
  const allDataTypes = Object.keys(DATA_TYPE_METADATA);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 2147483650 }}
    >
      <DialogTitle>編輯自訂按鈕</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {/* Button Name */}
          <TextField
            label="按鈕名稱"
            value={localConfig.label}
            onChange={(e) => setLocalConfig({ ...localConfig, label: e.target.value })}
            fullWidth
            required
            placeholder="例如：危險藥物提醒"
          />

          {/* Data Types Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              選擇資料類型（可多選）
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {allDataTypes.map(dataType => {
                const isSelected = localConfig.dataTypes.includes(dataType);
                const metadata = DATA_TYPE_METADATA[dataType];

                return (
                  <Chip
                    key={dataType}
                    label={metadata?.label || dataType}
                    onClick={() => handleDataTypeToggle(dataType)}
                    color={isSelected ? 'primary' : 'default'}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                );
              })}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              已選擇 {localConfig.dataTypes.length} 種資料類型
            </Typography>
          </Box>

          {/* System Prompt */}
          <TextField
            label="System Prompt（AI 指令）"
            value={localConfig.systemPrompt}
            onChange={(e) => setLocalConfig({ ...localConfig, systemPrompt: e.target.value })}
            multiline
            rows={6}
            fullWidth
            required
            placeholder="例如：請分析病人的用藥清單，找出可能有危險交互作用的藥物組合..."
            helperText="這段指令將發送給 AI 作為分析指示"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!localConfig.label || localConfig.dataTypes.length === 0 || !localConfig.systemPrompt}
        >
          儲存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomButtonEditor;
