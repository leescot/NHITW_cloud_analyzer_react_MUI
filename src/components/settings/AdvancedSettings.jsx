import React, { useState, useEffect } from "react";
import {
  Typography,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Button,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import { handleSettingChange } from "../../utils/settingsHelper";

const AdvancedSettings = () => {
  const [settings, setSettings] = useState({
    enableMedicationCustomCopyFormat: false,
    enableMedicationCopyAll: false,
    enableLabCustomCopyFormat: false,
    enableLabCopyAll: false,
    enableAcupunctureIndicator: false,
  });

  useEffect(() => {
    // Load advanced settings
    chrome.storage.sync.get(
      {
        enableMedicationCustomCopyFormat: false,
        enableMedicationCopyAll: false,
        enableLabCustomCopyFormat: false,
        enableLabCopyAll: false,
        enableAcupunctureIndicator: false,
      },
      (items) => {
        setSettings({
          enableMedicationCustomCopyFormat: items.enableMedicationCustomCopyFormat,
          enableMedicationCopyAll: items.enableMedicationCopyAll,
          enableLabCustomCopyFormat: items.enableLabCustomCopyFormat,
          enableLabCopyAll: items.enableLabCopyAll,
          enableAcupunctureIndicator: items.enableAcupunctureIndicator,
        });
      }
    );
  }, []);

  const handleLocalSettingChange = (key, value) => {
    // Update local state for UI responsiveness
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Dispatch a custom event to immediately notify other components
    window.dispatchEvent(new CustomEvent('settingChanged', {
      detail: { key, value }
    }));

    // Update both the western setting and general display setting
    chrome.storage.sync.set({ 
      [key]: value 
    }, () => {
      console.log(`Updated ${key} to ${value}`);
      
      // Notify content script of setting change for both western and general
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'settingChanged',
            setting: key,
            value: value,
            allSettings: true
          });
        }
      });
    });
  };

  // Function to open the FloatingIcon's custom format editor
  const openCustomFormatEditor = () => {
    // Only proceed if enableMedicationCustomCopyFormat is true
    if (!settings.enableMedicationCustomCopyFormat) return;
    
    // Send a message to open the FloatingIcon dialog and switch to the custom format tab
    if (window.openFloatingIconDialog) {
      window.openFloatingIconDialog();
      // After the dialog is open, switch to the custom format tab (index 9)
      setTimeout(() => {
        chrome.runtime.sendMessage({ 
          action: 'switchToCustomFormatTab',
          tabIndex: 9
        });
      }, 100);
    } else {
      // If the global method is not available, send a message to the background script
      chrome.runtime.sendMessage({ 
        action: 'openCustomFormatEditor' 
      });
    }
  };

  // Function to open the Lab custom format editor
  const openLabCustomFormatEditor = () => {
    // Only proceed if enableLabCustomCopyFormat is true
    if (!settings.enableLabCustomCopyFormat) return;
    
    // Send a message to open the FloatingIcon dialog and switch to the lab custom format tab
    if (window.openFloatingIconDialog) {
      window.openFloatingIconDialog();
      // After the dialog is open, switch to the lab custom format tab (index 10)
      setTimeout(() => {
        chrome.runtime.sendMessage({ 
          action: 'switchToLabCustomFormatTab',
          tabIndex: 10
        });
      }, 100);
    } else {
      // If the global method is not available, send a message to the background script
      chrome.runtime.sendMessage({ 
        action: 'openLabCustomFormatEditor' 
      });
    }
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="advanced-settings-content"
        id="advanced-settings-header"
      >
        <TuneIcon sx={{ mr: 1, color: 'primary.main' }}/>
        <Typography>更多進階設定</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FormControlLabel
          control={
            <Switch
              checked={settings.enableMedicationCustomCopyFormat}
              onChange={(e) => {
                handleLocalSettingChange(
                  "enableMedicationCustomCopyFormat",
                  e.target.checked
                );
              }}
            />
          }
          label="開啟西藥自訂複製格式"
        />
        
        {settings.enableMedicationCustomCopyFormat && (
          <Box sx={{ mt: 1, mb: 2, ml: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              需於程式主頁面「進階設定」來設定格式
            </Typography>
          </Box>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableMedicationCopyAll}
              onChange={(e) => {
                handleLocalSettingChange(
                  "enableMedicationCopyAll",
                  e.target.checked
                );
              }}
            />
          }
          label="開啟西藥全部資料複製功能"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableLabCustomCopyFormat}
              onChange={(e) => {
                handleLocalSettingChange(
                  "enableLabCustomCopyFormat",
                  e.target.checked
                );
              }}
            />
          }
          label="開啟檢驗報告自訂複製格式"
        />
        
        {settings.enableLabCustomCopyFormat && (
          <Box sx={{ mt: 1, mb: 2, ml: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              需於程式主頁面「進階設定」來設定格式
            </Typography>
          </Box>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableLabCopyAll}
              onChange={(e) => {
                handleLocalSettingChange(
                  "enableLabCopyAll",
                  e.target.checked
                );
              }}
            />
          }
          label="開啟檢驗報告全部資料複製功能"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableAcupunctureIndicator}
              onChange={(e) => {
                handleLocalSettingChange(
                  "enableAcupunctureIndicator",
                  e.target.checked
                );
              }}
            />
          }
          label="顯示針灸適應症指示器（中醫）"
        />
      </AccordionDetails>
    </Accordion>
  );
};

export default AdvancedSettings; 