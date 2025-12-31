/**
 * Sidebar V2 配置對話框
 *
 * 配置 3 個 Tab 的設定
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Chip,
  TextField,
  IconButton
} from '@mui/material';
import tabTemplateManager from '../../services/gai/tabs';
import { PRESET_TEMPLATES } from '../../services/gai/tabs/presetTemplates';
import {
  saveAutoAnalysisConfig,
  saveQuickButtonsConfig,
  saveChatConfig
} from '../../utils/settingsManager';
import CustomButtonEditor from './CustomButtonEditor';

const SidebarV2ConfigDialog = ({
  open,
  onClose,
  autoAnalysisConfig,
  quickButtonsConfig,
  chatConfig,
  onConfigSaved
}) => {
  const [tabValue, setTabValue] = useState(0);

  // Local state for editing
  const [localAutoConfig, setLocalAutoConfig] = useState(autoAnalysisConfig);
  const [localButtonsConfig, setLocalButtonsConfig] = useState(quickButtonsConfig);
  const [localChatConfig, setLocalChatConfig] = useState(chatConfig);

  // Custom button editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingButton, setEditingButton] = useState(null);

  // Sync with props when dialog opens
  useEffect(() => {
    if (open) {
      setLocalAutoConfig(autoAnalysisConfig);
      setLocalButtonsConfig(quickButtonsConfig);
      setLocalChatConfig(chatConfig);
      setTabValue(0); // Reset to first tab
    }
  }, [open, autoAnalysisConfig, quickButtonsConfig, chatConfig]);

  const handleSave = async () => {
    // Save all configs
    await saveAutoAnalysisConfig(localAutoConfig);
    await saveQuickButtonsConfig(localButtonsConfig);
    await saveChatConfig(localChatConfig);

    // Notify parent
    onConfigSaved({
      autoAnalysisConfig: localAutoConfig,
      quickButtonsConfig: localButtonsConfig,
      chatConfig: localChatConfig
    });

    onClose();
  };

  const handleTabChange = (_event, newValue) => {
    setTabValue(newValue);
  };

  // Tab 2: Handle button config changes
  const handleButtonConfigChange = (slotIndex, field, value) => {
    setLocalButtonsConfig(prev => {
      const newConfig = [...prev];
      const buttonIndex = newConfig.findIndex(btn => btn.slotIndex === slotIndex);
      if (buttonIndex >= 0) {
        newConfig[buttonIndex] = { ...newConfig[buttonIndex], [field]: value };
      }
      return newConfig;
    });
  };

  const handleEditCustomButton = (button) => {
    setEditingButton(button);
    setEditorOpen(true);
  };

  const handleSaveCustomButton = (updatedConfig) => {
    setLocalButtonsConfig(prev => {
      const newConfig = [...prev];
      const buttonIndex = newConfig.findIndex(btn => btn.slotIndex === updatedConfig.slotIndex);
      if (buttonIndex >= 0) {
        newConfig[buttonIndex] = updatedConfig;
      }
      return newConfig;
    });
  };

  // Get preset template options (only basic and specialized categories)
  const presetOptions = Object.values(PRESET_TEMPLATES).filter(
    template => template.category === 'basic' || template.category === 'specialized'
  );

  // Get selected template info
  const selectedTemplate = localAutoConfig
    ? tabTemplateManager.getTemplate(localAutoConfig.templateId)
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 2147483649 }}
    >
      <DialogTitle>GAI Sidebar 設定</DialogTitle>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tab label="自動分析" />
        <Tab label="快速按鈕" />
        <Tab label="對話" />
      </Tabs>

      <DialogContent sx={{ minHeight: 400 }}>
        {/* Tab 1: 自動分析 */}
        {tabValue === 0 && (
          <Box sx={{ pt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={localAutoConfig?.enabled || false}
                  onChange={(e) => setLocalAutoConfig({ ...localAutoConfig, enabled: e.target.checked })}
                />
              }
              label="啟用自動分析(載入病歷時自動執行GAI分析)"
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>選擇分析模板</InputLabel>
              <Select
                value={localAutoConfig?.templateId || ''}
                label="選擇分析模板"
                onChange={(e) => setLocalAutoConfig({ ...localAutoConfig, templateId: e.target.value })}
                disabled={!localAutoConfig?.enabled}
                MenuProps={{
                  sx: { zIndex: 2147483650 }
                }}
              >
                {presetOptions.map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedTemplate && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  此模板使用的資料類型：
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {selectedTemplate.dataTypes.map(dataType => (
                    <Chip key={dataType} label={dataType} size="small" color="primary" variant="outlined" />
                  ))}
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  說明：{selectedTemplate.description}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: 快速按鈕 */}
        {tabValue === 1 && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              配置 6 個快速按鈕，每個可選擇預設模板或自訂分析
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {localButtonsConfig && localButtonsConfig.map((button) => (
                <Box
                  key={button.slotIndex}
                  sx={{
                    p: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    bgcolor: button.enabled ? '#ffffff' : '#f5f5f5'
                  }}
                >
                  {/* Button Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      按鈕 {button.slotIndex + 1}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={button.enabled}
                          onChange={(e) => handleButtonConfigChange(button.slotIndex, 'enabled', e.target.checked)}
                          size="small"
                        />
                      }
                      label="啟用"
                    />
                  </Box>

                  {button.enabled && (
                    <>
                      {/* Type Selection */}
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>類型</InputLabel>
                        <Select
                          value={button.type}
                          label="類型"
                          onChange={(e) => handleButtonConfigChange(button.slotIndex, 'type', e.target.value)}
                          MenuProps={{
                            sx: { zIndex: 2147483650 }
                          }}
                        >
                          <MenuItem value="preset">預設模板</MenuItem>
                          <MenuItem value="custom">自訂分析</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Preset Template Selection */}
                      {button.type === 'preset' && (
                        <FormControl fullWidth>
                          <InputLabel>選擇模板</InputLabel>
                          <Select
                            value={button.templateId || ''}
                            label="選擇模板"
                            onChange={(e) => {
                              handleButtonConfigChange(button.slotIndex, 'templateId', e.target.value);
                              const template = tabTemplateManager.getTemplate(e.target.value);
                              if (template) {
                                handleButtonConfigChange(button.slotIndex, 'label', template.name);
                                handleButtonConfigChange(button.slotIndex, 'icon', template.icon);
                              }
                            }}
                            MenuProps={{
                              sx: { zIndex: 2147483650 }
                            }}
                          >
                            {presetOptions.map(template => (
                              <MenuItem key={template.id} value={template.id}>
                                {template.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* Custom Button Config */}
                      {button.type === 'custom' && (
                        <Box>
                          <TextField
                            label="按鈕名稱"
                            value={button.label || ''}
                            onChange={(e) => handleButtonConfigChange(button.slotIndex, 'label', e.target.value)}
                            fullWidth
                            sx={{ mb: 2 }}
                          />
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => handleEditCustomButton(button)}
                          >
                            編輯自訂分析
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Tab 3: 對話 */}
        {tabValue === 2 && (
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Enable Chat */}
            <FormControlLabel
              control={
                <Switch
                  checked={localChatConfig?.enabled || false}
                  onChange={(e) => setLocalChatConfig({ ...localChatConfig, enabled: e.target.checked })}
                />
              }
              label="啟用 Chat 功能"
            />

            {localChatConfig?.enabled && (
              <>
                {/* System Prompt */}
                <TextField
                  label="System Prompt（AI 指令）"
                  value={localChatConfig?.systemPrompt || ''}
                  onChange={(e) => setLocalChatConfig({ ...localChatConfig, systemPrompt: e.target.value })}
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="你是專業的醫療AI助理..."
                  helperText="此指令將告訴 AI 如何回應使用者的問題"
                />

                {/* Quick Questions Management */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    快速提問按鈕（最多 5 個）
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    {(localChatConfig?.quickQuestions || []).map((question, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          value={question}
                          onChange={(e) => {
                            const newQuestions = [...(localChatConfig.quickQuestions || [])];
                            newQuestions[index] = e.target.value;
                            setLocalChatConfig({ ...localChatConfig, quickQuestions: newQuestions });
                          }}
                          size="small"
                          fullWidth
                          placeholder="輸入快速提問"
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            const newQuestions = (localChatConfig.quickQuestions || []).filter((_, i) => i !== index);
                            setLocalChatConfig({ ...localChatConfig, quickQuestions: newQuestions });
                          }}
                        >
                          <Typography variant="body2">✕</Typography>
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                  {(!localChatConfig?.quickQuestions || localChatConfig.quickQuestions.length < 5) && (
                    <Button
                      size="small"
                      onClick={() => {
                        const newQuestions = [...(localChatConfig?.quickQuestions || []), ''];
                        setLocalChatConfig({ ...localChatConfig, quickQuestions: newQuestions });
                      }}
                    >
                      + 新增快速提問
                    </Button>
                  )}
                </Box>

                {/* Chat History Settings */}
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localChatConfig?.enableHistory || false}
                        onChange={(e) => setLocalChatConfig({ ...localChatConfig, enableHistory: e.target.checked })}
                      />
                    }
                    label="保存對話歷史（重新整理後會保留）"
                  />
                  {localChatConfig?.enableHistory && (
                    <TextField
                      label="最大保存輪數"
                      type="number"
                      value={localChatConfig?.maxHistoryLength || 10}
                      onChange={(e) => setLocalChatConfig({ ...localChatConfig, maxHistoryLength: parseInt(e.target.value) || 10 })}
                      size="small"
                      sx={{ mt: 1, maxWidth: 200 }}
                      inputProps={{ min: 1, max: 20 }}
                      helperText="建議 5-10 輪，避免 Token 超限"
                    />
                  )}
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          儲存
        </Button>
      </DialogActions>

      {/* Custom Button Editor Dialog */}
      <CustomButtonEditor
        open={editorOpen}
        buttonConfig={editingButton}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveCustomButton}
      />
    </Dialog>
  );
};

export default SidebarV2ConfigDialog;
