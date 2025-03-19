import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  ListItemIcon
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import CategoryIcon from '@mui/icons-material/Category';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { handleSettingChange } from '../../utils/settingsHelper';
import { DEFAULT_LAB_COPY_ITEMS } from '../../config/labTests';

/**
 * 重置用戶的檢驗複製項目設定為預設值
 */
export const resetLabCopyItemsToDefault = (callback = () => {}) => {
  chrome.storage.sync.set(
    { customCopyItems: DEFAULT_LAB_COPY_ITEMS }, 
    () => {
      // 通知其他組件設定已更改
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "settingChanged",
            settingType: "lab",
            setting: "customCopyItems",
            value: DEFAULT_LAB_COPY_ITEMS
          });
        }
        callback();
      });
    }
  );
};

const LabSettings = () => {
  const [settings, setSettings] = useState({
    labDisplayFormat: 'byType',
    showLabUnit: false,
    showLabReference: false,
    enableLabAbbrev: true,
    highlightAbnormalLab: true,
    labCopyFormat: 'horizontal',
    enableCustomCopy: false,
    customCopyItems: DEFAULT_LAB_COPY_ITEMS
  });
  
  const [customCopyDialogOpen, setCustomCopyDialogOpen] = useState(false);
  const [tempCustomCopyItems, setTempCustomCopyItems] = useState([]);

  useEffect(() => {
    // Load lab settings
    chrome.storage.sync.get({
      labDisplayFormat: 'byType',
      showLabUnit: false,
      showLabReference: false,
      enableLabAbbrev: true,
      highlightAbnormalLab: true,
      labCopyFormat: 'horizontal',
      enableCustomCopy: false,
      customCopyItems: DEFAULT_LAB_COPY_ITEMS
    }, (items) => {
      setSettings({
        labDisplayFormat: items.labDisplayFormat,
        showLabUnit: items.showLabUnit,
        showLabReference: items.showLabReference,
        enableLabAbbrev: items.enableLabAbbrev,
        highlightAbnormalLab: items.highlightAbnormalLab,
        labCopyFormat: items.labCopyFormat,
        enableCustomCopy: items.enableCustomCopy,
        customCopyItems: items.customCopyItems
      });
    });
  }, []);
  
  // 打開自訂複製項目對話框
  const handleOpenCustomCopyDialog = () => {
    setTempCustomCopyItems([...settings.customCopyItems]);
    setCustomCopyDialogOpen(true);
  };
  
  // 關閉自訂複製項目對話框
  const handleCloseCustomCopyDialog = () => {
    setCustomCopyDialogOpen(false);
  };
  
  // 保存自訂複製項目設置
  const handleSaveCustomCopyItems = () => {
    const updatedSettings = {
      ...settings,
      customCopyItems: tempCustomCopyItems
    };
    
    setSettings(updatedSettings);
    chrome.storage.sync.set({ customCopyItems: tempCustomCopyItems }, () => {
      // 發送消息給其他組件更新
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "settingChanged",
            settingType: "lab",
            setting: "customCopyItems",
            value: tempCustomCopyItems
          });
        }
      });
    });
    
    setCustomCopyDialogOpen(false);
  };
  
  // 重置自訂複製項目到默认设置
  const handleResetCustomCopyItems = () => {
    // Create a fresh deep copy of the default items
    const resetItems = JSON.parse(JSON.stringify(DEFAULT_LAB_COPY_ITEMS));
    
    // Update state with reset items
    setTempCustomCopyItems([]);  // Clear first
    
    // Use setTimeout to ensure the update happens in a separate render cycle
    setTimeout(() => {
      setTempCustomCopyItems(resetItems);
    }, 50);
  };
  
  // 切換自訂複製項目啟用狀態
  const handleToggleCustomCopyItem = (index) => {
    const updatedItems = [...tempCustomCopyItems];
    updatedItems[index].enabled = !updatedItems[index].enabled;
    setTempCustomCopyItems(updatedItems);
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="lab-settings-content"
        id="lab-settings-header"
      >
        <ScienceIcon sx={{ mr: 1, color: 'primary.main' }}/>
        <Typography>檢驗報告設定</Typography>
      </AccordionSummary>
      <AccordionDetails>
        
        {/* <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>顯示選項</Typography>
         */}
        <FormControlLabel
          control={
            <Switch
              checked={settings.showLabUnit}
              onChange={(e) => handleSettingChange('showLabUnit', e.target.checked, setSettings, 'showLabUnit', 'labsettings')}
            />
          }
          label="顯示檢驗單位"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.showLabReference}
              onChange={(e) => handleSettingChange('showLabReference', e.target.checked, setSettings, 'showLabReference', 'labsettings')}
            />
          }
          label="顯示檢驗參考值"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.enableLabAbbrev}
              onChange={(e) => handleSettingChange('enableLabAbbrev', e.target.checked, setSettings, 'enableLabAbbrev', 'labsettings')}
            />
          }
          label="顯示檢驗縮寫"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.highlightAbnormalLab}
              onChange={(e) => handleSettingChange('highlightAbnormalLab', e.target.checked, setSettings, 'highlightAbnormalLab', 'labsettings')}
            />
          }
          label="開啟異常值變色"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.enableCustomCopy}
              onChange={(e) => handleSettingChange('enableCustomCopy', e.target.checked, setSettings, 'enableCustomCopy', 'labsettings')}
            />
          }
          label="開啟自訂複製項目功能"
        />

        {settings.enableCustomCopy && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ContentCopyIcon />}
            onClick={handleOpenCustomCopyDialog}
            fullWidth
            sx={{ mt: 1, mb: 1 }}
          >
            選擇要複製的檢驗項目
          </Button>
        )}

        <Divider sx={{ my: 1.5 }} />
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="lab-display-format-label">檢驗報告呈現方式</InputLabel>
          <Select
            labelId="lab-display-format-label"
            id="lab-display-format"
            value={settings.labDisplayFormat}
            label="檢驗報告呈現方式"
            onChange={(e) => handleSettingChange('labDisplayFormat', e.target.value, setSettings, 'labDisplayFormat', 'labsettings')}
          >
            <MenuItem value="vertical">直式呈現 (每項檢驗獨立顯示)</MenuItem>
            <MenuItem value="horizontal">橫式呈現 (檢驗項目並排顯示)</MenuItem>
            <MenuItem value="twoColumn">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ViewColumnIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                <span>雙欄呈現 (兩欄顯示提高空間利用)</span>
              </Box>
            </MenuItem>
            <MenuItem value="threeColumn">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ViewColumnIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                <span>三欄呈現 (三欄顯示最大化空間利用)</span>
              </Box>
            </MenuItem>
            <MenuItem value="fourColumn">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ViewColumnIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                <span>四欄呈現 (四欄顯示超高空間利用)</span>
              </Box>
            </MenuItem>
            <MenuItem value="byType">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CategoryIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                <span>依檢驗類型分組 (按類型分欄顯示)</span>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="lab-copy-format-label">檢驗報告複製格式</InputLabel>
          <Select
            labelId="lab-copy-format-label"
            id="lab-copy-format"
            value={settings.labCopyFormat}
            label="檢驗報告複製格式"
            onChange={(e) => handleSettingChange('labCopyFormat', e.target.value, setSettings, 'labCopyFormat', 'labsettings')}
          >
            <MenuItem value="vertical">直式格式 (每項檢驗獨立一行)</MenuItem>
            <MenuItem value="horizontal">橫式格式 (檢驗項目並排顯示)</MenuItem>
          </Select>
        </FormControl>
        
        {/* 自訂複製項目對話框 */}
        <Dialog 
          open={customCopyDialogOpen} 
          onClose={handleCloseCustomCopyDialog}
          fullWidth
          maxWidth="sm"
          keepMounted={false}
        >
          <DialogTitle>選擇要複製的檢驗項目</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              此處勾選的項目會在複製操作時自動先勾選。
            </Typography>
            <List sx={{ width: '100%' }}>
              {tempCustomCopyItems.map((item, index) => (
                <ListItem key={`${item.orderCode}-${index}`} divider>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={item.enabled}
                      onChange={() => handleToggleCustomCopyItem(index)}
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`${item.displayName}`} 
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCustomCopyDialog} color="primary">
              取消
            </Button>
            <Button 
              onClick={handleResetCustomCopyItems} 
              color="secondary"
              sx={{ mr: 'auto' }}
            >
              重置為預設
            </Button>
            <Button onClick={handleSaveCustomCopyItems} color="primary" variant="contained">
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </AccordionDetails>
    </Accordion>
  );
};

export default LabSettings;