import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Switch,
  FormControlLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  InputLabel,
  FormHelperText
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';

const GeneralDisplaySettings = () => {
  // Define state variables for settings
  const [autoOpenPage, setAutoOpenPage] = useState(false);
  const [titleTextSize, setTitleTextSize] = useState('medium');
  const [contentTextSize, setContentTextSize] = useState('medium');
  const [noteTextSize, setNoteTextSize] = useState('small');
  const [floatingIconPosition, setFloatingIconPosition] = useState('top-right');
  const [alwaysOpenOverviewTab, setAlwaysOpenOverviewTab] = useState(true);
  const [useColorfulTabs, setUseColorfulTabs] = useState(false);

  // Load settings from storage
  useEffect(() => {
    chrome.storage.sync.get({
      autoOpenPage: false,
      titleTextSize: 'medium',
      contentTextSize: 'medium',
      noteTextSize: 'small',
      floatingIconPosition: 'top-right',
      alwaysOpenOverviewTab: true,
      useColorfulTabs: true
    }, (items) => {
      setAutoOpenPage(items.autoOpenPage);
      setTitleTextSize(items.titleTextSize);
      setContentTextSize(items.contentTextSize);
      setNoteTextSize(items.noteTextSize);
      setFloatingIconPosition(items.floatingIconPosition);
      setAlwaysOpenOverviewTab(items.alwaysOpenOverviewTab);
      setUseColorfulTabs(items.useColorfulTabs);
    });
  }, []);

  // Handle auto-open page toggle
  const handleAutoOpenPageChange = (event) => {
    const newValue = event.target.checked;
    setAutoOpenPage(newValue);
    chrome.storage.sync.set({ autoOpenPage: newValue });

    // Notify FloatingIcon component of the change
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "settingChanged",
          settingType: "generalDisplay",
          setting: "autoOpenPage",
          value: newValue,
          allSettings: {
            autoOpenPage: newValue,
            titleTextSize: titleTextSize,
            contentTextSize: contentTextSize,
            noteTextSize: noteTextSize,
            floatingIconPosition: floatingIconPosition,
            alwaysOpenOverviewTab: alwaysOpenOverviewTab,
            useColorfulTabs: useColorfulTabs
          }
        });
      }
    });
  };

  // Handle title text size change
  const handleTitleTextSizeChange = (event) => {
    const newValue = event.target.value;
    setTitleTextSize(newValue);
    chrome.storage.sync.set({ titleTextSize: newValue });

    // Notify FloatingIcon component of the change
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "settingChanged",
          settingType: "generalDisplay",
          setting: "titleTextSize",
          value: newValue,
          allSettings: {
            autoOpenPage: autoOpenPage,
            titleTextSize: newValue,
            contentTextSize: contentTextSize,
            noteTextSize: noteTextSize,
            floatingIconPosition: floatingIconPosition,
            alwaysOpenOverviewTab: alwaysOpenOverviewTab,
            useColorfulTabs: useColorfulTabs
          }
        });
      }
    });
  };

  // Handle content text size change
  const handleContentTextSizeChange = (event) => {
    const newValue = event.target.value;
    setContentTextSize(newValue);
    chrome.storage.sync.set({ contentTextSize: newValue });

    // Notify FloatingIcon component of the change
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "settingChanged",
          settingType: "generalDisplay",
          setting: "contentTextSize",
          value: newValue,
          allSettings: {
            autoOpenPage: autoOpenPage,
            titleTextSize: titleTextSize,
            contentTextSize: newValue,
            noteTextSize: noteTextSize,
            floatingIconPosition: floatingIconPosition,
            alwaysOpenOverviewTab: alwaysOpenOverviewTab,
            useColorfulTabs: useColorfulTabs
          }
        });
      }
    });
  };

  // Handle note text size change
  const handleNoteTextSizeChange = (event) => {
    const newValue = event.target.value;
    setNoteTextSize(newValue);
    chrome.storage.sync.set({ noteTextSize: newValue });

    // Notify FloatingIcon component of the change
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "settingChanged",
          settingType: "generalDisplay",
          setting: "noteTextSize",
          value: newValue,
          allSettings: {
            autoOpenPage: autoOpenPage,
            titleTextSize: titleTextSize,
            contentTextSize: contentTextSize,
            noteTextSize: newValue,
            floatingIconPosition: floatingIconPosition,
            alwaysOpenOverviewTab: alwaysOpenOverviewTab,
            useColorfulTabs: useColorfulTabs
          }
        });
      }
    });
  };

  // Handle floating icon position change
  const handleFloatingIconPositionChange = (event) => {
    const newValue = event.target.value;
    setFloatingIconPosition(newValue);
    chrome.storage.sync.set({ floatingIconPosition: newValue });

    // Notify FloatingIcon component of the change
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "settingChanged",
          settingType: "generalDisplay",
          setting: "floatingIconPosition",
          value: newValue,
          allSettings: {
            autoOpenPage: autoOpenPage,
            titleTextSize: titleTextSize,
            contentTextSize: contentTextSize,
            noteTextSize: noteTextSize,
            floatingIconPosition: newValue,
            alwaysOpenOverviewTab: alwaysOpenOverviewTab,
            useColorfulTabs: useColorfulTabs
          }
        });
      }
    });
  };

  // Handle always open overview tab toggle
  const handleAlwaysOpenOverviewTabChange = (event) => {
    const newValue = event.target.checked;
    setAlwaysOpenOverviewTab(newValue);
    chrome.storage.sync.set({ alwaysOpenOverviewTab: newValue });

    // Notify FloatingIcon component of the change
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "settingChanged",
          settingType: "generalDisplay",
          setting: "alwaysOpenOverviewTab",
          value: newValue,
          allSettings: {
            autoOpenPage: autoOpenPage,
            titleTextSize: titleTextSize,
            contentTextSize: contentTextSize,
            noteTextSize: noteTextSize,
            floatingIconPosition: floatingIconPosition,
            alwaysOpenOverviewTab: newValue,
            useColorfulTabs: useColorfulTabs
          }
        });
      }
    });
  };

  // Handle colorful tabs toggle
  const handleColorfulTabsChange = (event) => {
    const newValue = event.target.checked;
    setUseColorfulTabs(newValue);
    chrome.storage.sync.set({ useColorfulTabs: newValue });

    // Notify FloatingIcon component of the change
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "settingChanged",
          settingType: "generalDisplay",
          setting: "useColorfulTabs",
          value: newValue,
          allSettings: {
            autoOpenPage: autoOpenPage,
            titleTextSize: titleTextSize,
            contentTextSize: contentTextSize,
            noteTextSize: noteTextSize,
            floatingIconPosition: floatingIconPosition,
            alwaysOpenOverviewTab: alwaysOpenOverviewTab,
            useColorfulTabs: newValue
          }
        });
      }
    });
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="general-display-settings-content"
        id="general-display-settings-header"
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DisplaySettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography>一般顯示設定</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ mb: 2 }}>
          <FormHelperText>此頁所有設定需重新載入網頁才會生效</FormHelperText>
          <FormControlLabel
            control={
              <Switch
                checked={alwaysOpenOverviewTab}
                onChange={handleAlwaysOpenOverviewTabChange}
                name="alwaysOpenOverviewTab"
                color="primary"
              />
            }
            label="開啟頁面固定顯示總覽頁面"
          />
          <FormHelperText>每次開啟時會固定顯示「總覽」頁面</FormHelperText>

          <FormControlLabel
            control={
              <Switch
                checked={useColorfulTabs}
                onChange={handleColorfulTabsChange}
                name="useColorfulTabs"
                color="primary"
              />
            }
            label="使用彩色標籤"
          />
          <FormHelperText>頁面標籤會以不同顏色顯示，關閉則使用淺藍色</FormHelperText>

          <FormControlLabel
            control={
              <Switch
                checked={autoOpenPage}
                onChange={handleAutoOpenPageChange}
                name="autoOpenPage"
                color="primary"
              />
            }
            label="自動開啟資料頁面"
          />
          <FormHelperText>讀卡後進入雲端網站自動開啟資料頁面</FormHelperText>
          <Divider sx={{ my: 2 }} />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="floating-icon-position-label">浮動圖標位置</InputLabel>
            <Select
              labelId="floating-icon-position-label"
              id="floating-icon-position"
              value={floatingIconPosition}
              label="浮動圖標位置"
              onChange={handleFloatingIconPositionChange}
            >
              <MenuItem value="top-right">右上</MenuItem>
              <MenuItem value="middle-right">右中</MenuItem>
              <MenuItem value="bottom-right">右下</MenuItem>
            </Select>
            <FormHelperText>設定浮動圖標在螢幕上的顯示位置</FormHelperText>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="title-text-size-label">標題文字大小</InputLabel>
            <Select
              labelId="title-text-size-label"
              id="title-text-size"
              value={titleTextSize}
              label="標題文字大小"
              onChange={handleTitleTextSizeChange}
            >
              <MenuItem value="small">小</MenuItem>
              <MenuItem value="medium">中</MenuItem>
              <MenuItem value="large">大</MenuItem>
            </Select>
            <FormHelperText>影響所有標題的顯示大小</FormHelperText>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="content-text-size-label">內容文字大小</InputLabel>
            <Select
              labelId="content-text-size-label"
              id="content-text-size"
              value={contentTextSize}
              label="內容文字大小"
              onChange={handleContentTextSizeChange}
            >
              <MenuItem value="small">小</MenuItem>
              <MenuItem value="medium">中</MenuItem>
              <MenuItem value="large">大</MenuItem>
            </Select>
            <FormHelperText>影響主要內容的顯示大小</FormHelperText>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="note-text-size-label">備註文字大小</InputLabel>
            <Select
              labelId="note-text-size-label"
              id="note-text-size"
              value={noteTextSize}
              label="備註文字大小"
              onChange={handleNoteTextSizeChange}
            >
              <MenuItem value="small">小</MenuItem>
              <MenuItem value="medium">中</MenuItem>
              <MenuItem value="large">大</MenuItem>
            </Select>
            <FormHelperText>影響說明與備註的顯示大小</FormHelperText>
          </FormControl>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default GeneralDisplaySettings;
