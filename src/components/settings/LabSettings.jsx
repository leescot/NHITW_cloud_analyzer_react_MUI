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
export const resetLabCopyItemsToDefault = (callback = () => { }) => {
  chrome.storage.sync.set(
    { labChooseCopyItems: DEFAULT_LAB_COPY_ITEMS },
    () => {
      // 通知其他組件設定已更改
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "settingChanged",
            settingType: "lab",
            setting: "labChooseCopyItems",
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
    displayLabFormat: 'byType',
    showLabUnit: false,
    showLabReference: false,
    enableLabAbbrev: true,
    highlightAbnormalLab: true,
    copyLabFormat: 'horizontal',
    enableLabChooseCopy: false,
    labChooseCopyItems: DEFAULT_LAB_COPY_ITEMS,
    enableLabCustomCopyFormat: false,
    enableLabCopyAll: false,
    customLabHeaderCopyFormat: [
      { id: 'date', display: '日期' },

      { id: 'separator', value: ' - ', display: ' - ' },
      { id: 'hosp', display: '醫院' },
      { id: 'newline', display: '換行' },
    ],
    customLabItemCopyFormat: [
      { id: 'itemName', display: '項目名稱' },
      { id: 'space', display: ' ' },
      { id: 'value', display: '數值' },
      { id: 'space', display: ' ' },
      { id: 'unit', display: '單位' },
    ]
  });

  const [customCopyDialogOpen, setCustomCopyDialogOpen] = useState(false);
  const [tempCustomCopyItems, setTempCustomCopyItems] = useState([]);

  useEffect(() => {
    // Load lab settings
    chrome.storage.sync.get({
      displayLabFormat: 'byType',
      showLabUnit: false,
      showLabReference: false,
      enableLabAbbrev: true,
      highlightAbnormalLab: true,
      copyLabFormat: 'horizontal',
      enableLabChooseCopy: false,
      labChooseCopyItems: DEFAULT_LAB_COPY_ITEMS,
      enableLabCustomCopyFormat: false,
      enableLabCopyAll: false,
      customLabHeaderCopyFormat: [
        { id: 'date', display: '日期' },
        { id: 'separator', value: ' - ', display: ' - ' },
        { id: 'hosp', display: '醫院' },
        { id: 'newline', display: '換行' },
      ],
      customLabItemCopyFormat: [
        { id: 'itemName', display: '項目名稱' },
        { id: 'space', display: ' ' },
        { id: 'value', display: '數值' },
        { id: 'space', display: ' ' },
        { id: 'unit', display: '單位' },
      ]
    }, (items) => {
      setSettings({
        displayLabFormat: items.displayLabFormat,
        showLabUnit: items.showLabUnit,
        showLabReference: items.showLabReference,
        enableLabAbbrev: items.enableLabAbbrev,
        highlightAbnormalLab: items.highlightAbnormalLab,
        copyLabFormat: items.copyLabFormat,
        enableLabChooseCopy: items.enableLabChooseCopy,
        labChooseCopyItems: items.labChooseCopyItems,
        enableLabCustomCopyFormat: items.enableLabCustomCopyFormat,
        enableLabCopyAll: items.enableLabCopyAll,
        customLabHeaderCopyFormat: items.customLabHeaderCopyFormat,
        customLabItemCopyFormat: items.customLabItemCopyFormat
      });
    });

    // Listen for real-time setting changes from other components
    const handleSettingChangedEvent = (event) => {
      const { key, value } = event.detail;
      if (key === 'enableLabCustomCopyFormat') {
        setSettings(prev => ({
          ...prev,
          [key]: value
        }));
      }
    };

    window.addEventListener('settingChanged', handleSettingChangedEvent);

    // Cleanup the event listener
    return () => {
      window.removeEventListener('settingChanged', handleSettingChangedEvent);
    };
  }, []);

  // 打開自訂複製項目對話框
  const handleOpenCustomCopyDialog = () => {
    setTempCustomCopyItems([...settings.labChooseCopyItems]);
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
      labChooseCopyItems: tempCustomCopyItems
    };

    setSettings(updatedSettings);
    chrome.storage.sync.set({ labChooseCopyItems: tempCustomCopyItems }, () => {
      // 發送消息給其他組件更新
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "settingChanged",
            settingType: "lab",
            setting: "labChooseCopyItems",
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

  // 打開 FloatingIcon 的檢驗自訂格式標籤
  const openLabCustomFormatEditor = () => {
    // Only proceed if enableLabCustomCopyFormat is true
    if (!settings.enableLabCustomCopyFormat) return;

    // 發送消息給 background script 或直接調用 FloatingIcon 的方法
    if (window.openFloatingIconDialog) {
      window.openFloatingIconDialog();
      // 等對話框打開後，切換到檢驗自訂格式標籤（索引為10）
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'switchToLabCustomFormatTab',
          tabIndex: 10
        });
      }, 100);
    } else {
      // 如果全局方法不可用，則發送消息給背景脚本處理
      chrome.runtime.sendMessage({
        action: 'openLabCustomFormatEditor'
      });
    }
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="lab-settings-content"
        id="lab-settings-header"
      >
        <ScienceIcon sx={{ mr: 1, color: 'primary.main' }} />
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
              checked={settings.enableLabChooseCopy}
              onChange={(e) => handleSettingChange('enableLabChooseCopy', e.target.checked, setSettings, 'enableLabChooseCopy', 'labsettings')}
            />
          }
          label="開啟自選複製項目功能"
        />

        {settings.enableLabChooseCopy && (
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

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableLabCustomCopyFormat}
              onChange={(e) => handleSettingChange('enableLabCustomCopyFormat', e.target.checked, setSettings, 'enableLabCustomCopyFormat', 'labsettings')}
            />
          }
          label="開啟檢驗報告自訂複製格式"
        />

        {settings.enableLabCustomCopyFormat && (
          <Box sx={{ mt: 1, mb: 2, ml: 4 }}>
            <Typography variant="body2" color="text.secondary">
              需於程式主頁面「進階設定」來設定格式
            </Typography>
          </Box>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableLabCopyAll}
              onChange={(e) => handleSettingChange('enableLabCopyAll', e.target.checked, setSettings, 'enableLabCopyAll', 'labsettings')}
            />
          }
          label="開啟檢驗報告全部資料複製功能"
        />

        <Divider sx={{ my: 1.5 }} />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="lab-display-format-label">檢驗報告呈現方式</InputLabel>
          <Select
            labelId="lab-display-format-label"
            id="lab-display-format"
            value={settings.displayLabFormat}
            label="檢驗報告呈現方式"
            onChange={(e) => {
              const newValue = e.target.value;
              console.log(`Changing displayLabFormat to: ${newValue}`);

              // Call the handleSettingChange with detailed logging
              handleSettingChange('displayLabFormat', newValue, setSettings, 'displayLabFormat', 'labsettings');

              // Verify the change was saved in storage
              setTimeout(() => {
                chrome.storage.sync.get(['displayLabFormat'], (items) => {
                  console.log('Verification check - displayLabFormat in storage:', items.displayLabFormat);
                });
              }, 500);
            }}
          >
            <MenuItem value="byType">依檢驗類型分組顯示</MenuItem>
            <MenuItem value="vertical">直式呈現 (每項檢驗獨立顯示)</MenuItem>
            <MenuItem value="horizontal">橫式呈現 (檢驗項目並排顯示)</MenuItem>
            <MenuItem value="twoColumn">雙欄呈現 (兩欄顯示提高空間利用)</MenuItem>
            <MenuItem value="threeColumn">三欄呈現 (三欄顯示最大化空間利用)</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="lab-copy-format-label">檢驗報告複製格式</InputLabel>
          <Select
            labelId="lab-copy-format-label"
            id="lab-copy-format"
            value={settings.copyLabFormat}
            label="檢驗報告複製格式"
            onChange={(e) => handleSettingChange('copyLabFormat', e.target.value, setSettings, 'copyLabFormat', 'labsettings')}
          >
            <MenuItem value="vertical">直式格式 (每項檢驗獨立一行)</MenuItem>
            <MenuItem value="horizontal">橫式格式 (檢驗項目並排顯示)</MenuItem>
            <MenuItem
              value="customVertical"
              disabled={!settings.enableLabCustomCopyFormat}
            >
              自訂檢驗複製格式(直式)
            </MenuItem>
            <MenuItem
              value="customHorizontal"
              disabled={!settings.enableLabCustomCopyFormat}
            >
              自訂檢驗複製格式(橫式)
            </MenuItem>
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