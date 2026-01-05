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
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  Collapse,
  ListSubheader,
  Paper
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RestoreIcon from '@mui/icons-material/Restore';
import * as MuiIcons from '@mui/icons-material';
import { DATA_TYPE_METADATA } from '../../config/dataTypeMetadata';
import tabTemplateManager from '../../services/gai/tabs';
import { PRESET_TEMPLATES } from '../../services/gai/tabs/presetTemplates';
import {
  getAllDefaults,
  DEFAULT_AUTO_ANALYSIS_CONFIG,
  DEFAULT_CHAT_CONFIG
} from '../../config/sidebarV2Defaults';
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

  // Expanded slot index for Tab 2
  const [expandedSlot, setExpandedSlot] = useState(null);

  // Sync with props when dialog opens
  useEffect(() => {
    if (open) {
      setLocalAutoConfig(autoAnalysisConfig);
      setLocalButtonsConfig(quickButtonsConfig);
      setLocalChatConfig(chatConfig);
      setTabValue(0); // Reset to first tab
      setExpandedSlot(null);
    }
  }, [open]); // Only sync when dialog explicitly opens

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

  const toggleSlotExpand = (slotIndex) => {
    setExpandedSlot(expandedSlot === slotIndex ? null : slotIndex);
  };

  const handleResetDefaults = () => {
    if (window.confirm('確定要將所有 Sidebar 設定重置回系統預設值嗎？')) {
      const defaults = getAllDefaults();
      setLocalAutoConfig(defaults.autoAnalysis);
      setLocalButtonsConfig(defaults.quickButtons);
      setLocalChatConfig(defaults.chat);
      setExpandedSlot(null);
    }
  };

  // Get MuiIcon from name
  const getIcon = (iconName) => {
    const IconComponent = MuiIcons[iconName] || MuiIcons.Help;
    return <IconComponent />;
  };

  // Get preset template options (basic, specialized, and advanced categories)
  const presetOptions = Object.values(PRESET_TEMPLATES).filter(
    template => template.category === 'basic' || template.category === 'specialized' || template.category === 'advanced'
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
      sx={{
        zIndex: 2147483649,
        '& .MuiDialog-paper': {
          zIndex: 2147483650,
          pointerEvents: 'auto'
        }
      }}
      slotProps={{
        backdrop: {
          sx: {
            zIndex: 2147483648,
            pointerEvents: 'none'
          }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight="bold">GAI Sidebar 設定</Typography>
        <Button
          size="small"
          color="warning"
          startIcon={<RestoreIcon />}
          onClick={handleResetDefaults}
          sx={{ textTransform: 'none' }}
        >
          重置原設定
        </Button>
      </DialogTitle>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tab label="自動" />
        <Tab label="快速" />
        <Tab label="對話" />
      </Tabs>

      <DialogContent sx={{ minHeight: 400 }}>
        {/* Tab 1: 自動分析 */}
        {tabValue === 0 && (
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localAutoConfig?.enabled ?? false}
                    onChange={(e) => {
                      console.log('[Config] Tab1 Switch onChange:', e.target.checked);
                      setLocalAutoConfig({
                        templateId: localAutoConfig?.templateId || 'comprehensive_summary',
                        enabled: e.target.checked
                      });
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <SettingsSuggestIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">自動分析狀態</Typography>
                      <Typography variant="caption" color="text.secondary">
                        當側邊欄開啟且病歷載入完成時，自動執行指定的 GAI 分析
                      </Typography>
                    </Box>
                  </Box>
                }
                labelPlacement="start"
                sx={{
                  margin: 0,
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              />
            </Paper>

            <Collapse in={localAutoConfig?.enabled}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>選擇最佳分析模板</InputLabel>
                  <Select
                    value={localAutoConfig?.templateId || ''}
                    label="選擇最佳分析模板"
                    onChange={(e) => {
                      setLocalAutoConfig({
                        templateId: e.target.value,
                        enabled: localAutoConfig?.enabled ?? true
                      });
                    }}
                    MenuProps={{ sx: { zIndex: 2147483650 } }}
                  >
                    <ListSubheader>基礎分析</ListSubheader>
                    {Object.values(PRESET_TEMPLATES).filter(t => t.category === 'basic').map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getIcon(t.icon)}
                          <Typography variant="body2">{t.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                    <ListSubheader>專科分析</ListSubheader>
                    {Object.values(PRESET_TEMPLATES).filter(t => t.category === 'specialized').map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getIcon(t.icon)}
                          <Typography variant="body2">{t.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                    <ListSubheader>進階分析</ListSubheader>
                    {Object.values(PRESET_TEMPLATES).filter(t => t.category === 'advanced').map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getIcon(t.icon)}
                          <Typography variant="body2">{t.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedTemplate && (
                  <Card variant="outlined" sx={{ bgcolor: 'primary.50', borderColor: 'primary.light' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box
                          sx={{
                            p: 1.5,
                            bgcolor: 'primary.main',
                            color: 'white',
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {getIcon(selectedTemplate.icon)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold" color="primary.dark">
                            {selectedTemplate.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {selectedTemplate.description}
                          </Typography>

                          <Typography variant="caption" fontWeight="bold" sx={{ display: 'block', mb: 1, color: 'text.primary' }}>
                            分析所需的資料範圍：
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selectedTemplate.dataTypes.map(dataType => {
                              const metadata = DATA_TYPE_METADATA[dataType];
                              return (
                                <Chip
                                  key={dataType}
                                  label={metadata?.label || dataType}
                                  size="small"
                                  variant="outlined"
                                  sx={{ bgcolor: 'white' }}
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>
            </Collapse>

            {!localAutoConfig?.enabled && (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled', border: '1px dashed grey', borderRadius: 2 }}>
                <Typography variant="body2">自動分析已停用</Typography>
                <Typography variant="caption">開啟上方開關以在進入病歷時自動獲得 AI 摘要</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: 快速按鈕 */}
        {tabValue === 1 && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
              配置 6 個快速按鈕，每個可選擇預設模板或自訂分析。按鈕將在 Sidebar 中以網格排列。
            </Typography>

            <Grid container spacing={2}>
              {localButtonsConfig && localButtonsConfig.map((button) => {
                const isExpanded = expandedSlot === button.slotIndex;
                const template = button.type === 'preset' ? tabTemplateManager.getTemplate(button.templateId) : null;
                const displayLabel = button.label || template?.name || '未命名';
                const iconName = button.type === 'custom' ? 'Star' : (button.icon || template?.icon || 'AutoAwesome');

                return (
                  <Grid item xs={12} sm={6} key={button.slotIndex}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderColor: isExpanded ? 'primary.main' : 'divider',
                        borderWidth: isExpanded ? 2 : 1,
                        bgcolor: button.enabled ? 'background.paper' : '#f8f9fa'
                      }}
                    >
                      <CardActionArea
                        onClick={() => toggleSlotExpand(button.slotIndex)}
                        sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, opacity: button.enabled ? 1 : 0.5 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: button.enabled ? 'primary.light' : 'grey.300',
                              color: button.enabled ? 'primary.contrastText' : 'grey.600'
                            }}
                          >
                            {getIcon(iconName)}
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                              {displayLabel}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              按鈕 {button.slotIndex + 1} • {button.type === 'preset' ? '預設' : '自訂'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={button.enabled}
                                onChange={(e) => {
                                  handleButtonConfigChange(button.slotIndex, 'enabled', e.target.checked);
                                }}
                              />
                            }
                            label=""
                            sx={{ m: 0 }}
                          />
                          <IconButton size="small" sx={{ ml: 0.5 }}>
                            {isExpanded ? <ExpandMoreIcon sx={{ transform: 'rotate(180deg)' }} /> : <EditIcon fontSize="small" />}
                          </IconButton>
                        </Box>
                      </CardActionArea>

                      <Collapse in={isExpanded}>
                        <Divider />
                        <CardContent sx={{ bgcolor: '#fafafa', p: 2 }}>
                          {/* Type Selection */}
                          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel>按鈕類型</InputLabel>
                            <Select
                              value={button.type}
                              label="按鈕類型"
                              onChange={(e) => handleButtonConfigChange(button.slotIndex, 'type', e.target.value)}
                              MenuProps={{ sx: { zIndex: 2147483650 } }}
                            >
                              <MenuItem value="preset">使用預設模板</MenuItem>
                              <MenuItem value="custom">自訂分析指令</MenuItem>
                            </Select>
                          </FormControl>

                          {/* Preset Template Selection */}
                          {button.type === 'preset' && (
                            <FormControl fullWidth size="small">
                              <InputLabel>選擇模板</InputLabel>
                              <Select
                                value={button.templateId || ''}
                                label="選擇模板"
                                onChange={(e) => {
                                  handleButtonConfigChange(button.slotIndex, 'templateId', e.target.value);
                                  const templ = tabTemplateManager.getTemplate(e.target.value);
                                  if (templ) {
                                    handleButtonConfigChange(button.slotIndex, 'label', templ.name);
                                    handleButtonConfigChange(button.slotIndex, 'icon', templ.icon);
                                  }
                                }}
                                MenuProps={{ sx: { zIndex: 2147483650 } }}
                              >
                                {presetOptions.map(t => (
                                  <MenuItem key={t.id} value={t.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {getIcon(t.icon)}
                                      <Typography variant="body2">{t.name}</Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}

                          {/* Custom Button Config */}
                          {button.type === 'custom' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <TextField
                                label="按鈕顯示名稱"
                                value={button.label || ''}
                                size="small"
                                onChange={(e) => handleButtonConfigChange(button.slotIndex, 'label', e.target.value)}
                                fullWidth
                              />
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<EditIcon fontSize="small" />}
                                onClick={() => handleEditCustomButton(button)}
                                fullWidth
                              >
                                編輯自訂分析指令
                              </Button>
                            </Box>
                          )}
                        </CardContent>
                      </Collapse>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* Tab 3: 對話 */}
        {tabValue === 2 && (
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header Section */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ChatIcon color="primary" />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">Chat 功能設定</Typography>
                  <Typography variant="caption" color="text.secondary">
                    與 AI 進行自由對話，AI 將讀取完整的 10 種病歷資料
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

              {/* Personality Section */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PsychologyIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" fontWeight="bold">AI 專家設定 (System Prompt)</Typography>
                </Box>
                <TextField
                  value={localChatConfig?.systemPrompt || ''}
                  onChange={(e) => setLocalChatConfig({ ...localChatConfig, systemPrompt: e.target.value })}
                  multiline
                  rows={4}
                  fullWidth
                  variant="outlined"
                  placeholder="例如：你是專業的醫療AI助理，請根據提供的病歷資料回答問題..."
                  sx={{ bgcolor: 'white' }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  設定 AI 的人格背景與回答風格
                </Typography>
              </Box>

              <Divider />

              {/* Interface Section */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <EditIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" fontWeight="bold">快速提問按鈕 (最多 5 個)</Typography>
                </Box>
                <Grid container spacing={1.5}>
                  {(localChatConfig?.quickQuestions || []).map((question, index) => (
                    <Grid item xs={12} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          value={question}
                          onChange={(e) => {
                            const newQuestions = [...(localChatConfig.quickQuestions || [])];
                            newQuestions[index] = e.target.value;
                            setLocalChatConfig({ ...localChatConfig, quickQuestions: newQuestions });
                          }}
                          size="small"
                          fullWidth
                          placeholder="輸入問題，例如：摘要此病歷重點"
                          sx={{ bgcolor: 'white' }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            const newQuestions = (localChatConfig.quickQuestions || []).filter((_, i) => i !== index);
                            setLocalChatConfig({ ...localChatConfig, quickQuestions: newQuestions });
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                {(!localChatConfig?.quickQuestions || localChatConfig.quickQuestions.length < 5) && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const newQuestions = [...(localChatConfig?.quickQuestions || []), ''];
                      setLocalChatConfig({ ...localChatConfig, quickQuestions: newQuestions });
                    }}
                    sx={{ mt: 1 }}
                  >
                    新增快速提問
                  </Button>
                )}
              </Box>

              <Divider />

              {/* Session Section */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <HistoryIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" fontWeight="bold">對話紀錄管理</Typography>
                </Box>

                <Box sx={{ pl: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localChatConfig?.enableHistory || false}
                        onChange={(e) => setLocalChatConfig({ ...localChatConfig, enableHistory: e.target.checked })}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">保存對話歷史</Typography>}
                  />

                  <Collapse in={localChatConfig?.enableHistory}>
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TextField
                        label="最大保存輪數(最多 5 輪)"
                        type="number"
                        value={localChatConfig?.maxHistoryLength || 5}
                        onChange={(e) => {
                          let val = parseInt(e.target.value) || 1;
                          if (val > 5) val = 5;
                          if (val < 1) val = 1;
                          setLocalChatConfig({ ...localChatConfig, maxHistoryLength: val });
                        }}
                        size="small"
                        sx={{ maxWidth: 120, bgcolor: 'white' }}
                        inputProps={{ min: 1, max: 5 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        紀錄超過此數量後，將自動移除最舊的對話
                      </Typography>
                    </Box>
                  </Collapse>
                </Box>
              </Box>
            </Box>
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
