import React, { useState, useEffect } from "react";
import {
  Typography,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Radio,
  RadioGroup,
  Button,
  Box,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import { FormHelperText, Divider } from "@mui/material";
import { handleSettingChange } from "../../utils/settingsHelper";

const AdvancedSettings = () => {
  const [settings, setSettings] = useState({
    enableMedicationCustomCopyFormat: false,
    enableMedicationCopyAll: false,
    medicationCopyAllOrder: 'newToOld',
    enableLabCustomCopyFormat: false,
    enableLabCopyAll: false,
    labCopyAllOrder: 'newToOld',
    enableCKMTab: false,
    enableNephroReport: false,
    enableCKMScreening: false,
  });

  useEffect(() => {
    // Load advanced settings
    chrome.storage.sync.get(
      {
        enableMedicationCustomCopyFormat: false,
        enableMedicationCopyAll: false,
        medicationCopyAllOrder: 'newToOld',
        enableLabCustomCopyFormat: false,
        enableLabCopyAll: false,
        labCopyAllOrder: 'newToOld',
        enableCKMTab: false,
        enableNephroReport: false,
        enableCKMScreening: false,
      },
      (items) => {
        setSettings({
          enableMedicationCustomCopyFormat: items.enableMedicationCustomCopyFormat,
          enableMedicationCopyAll: items.enableMedicationCopyAll,
          medicationCopyAllOrder: items.medicationCopyAllOrder,
          enableLabCustomCopyFormat: items.enableLabCustomCopyFormat,
          enableLabCopyAll: items.enableLabCopyAll,
          labCopyAllOrder: items.labCopyAllOrder,
          enableCKMTab: items.enableCKMTab,
          enableNephroReport: items.enableNephroReport,
          enableCKMScreening: items.enableCKMScreening,
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

        {settings.enableMedicationCopyAll && (
          <Box sx={{ ml: 4, mt: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              複製排序方式
            </Typography>
            <RadioGroup
              value={settings.medicationCopyAllOrder}
              onChange={(e) => handleLocalSettingChange('medicationCopyAllOrder', e.target.value)}
              row
            >
              <FormControlLabel value="newToOld" control={<Radio size="small" />} label="由新到舊" />
              <FormControlLabel value="oldToNew" control={<Radio size="small" />} label="由舊到新" />
            </RadioGroup>
          </Box>
        )}

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

        {settings.enableLabCopyAll && (
          <Box sx={{ ml: 4, mt: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              複製排序方式
            </Typography>
            <RadioGroup
              value={settings.labCopyAllOrder}
              onChange={(e) => handleLocalSettingChange('labCopyAllOrder', e.target.value)}
              row
            >
              <FormControlLabel value="newToOld" control={<Radio size="small" />} label="由新到舊" />
              <FormControlLabel value="oldToNew" control={<Radio size="small" />} label="由舊到新" />
            </RadioGroup>
          </Box>
        )}

        <Divider sx={{ my: 1.5 }} />

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableCKMTab}
              onChange={(e) => {
                handleLocalSettingChange("enableCKMTab", e.target.checked);
              }}
            />
          }
          label="啟用 CKM 加強 Overview"
        />
        <FormHelperText>將心血管-腎臟-代謝（CKM）相關資料整合顯示於總覽頁面（需重新載入網頁）</FormHelperText>

        {settings.enableCKMTab && (
          <Box sx={{ ml: 4, mt: 0.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableNephroReport}
                  onChange={(e) => {
                    handleLocalSettingChange("enableNephroReport", e.target.checked);
                  }}
                  size="small"
                />
              }
              label="開啟腎臟檢驗報告列印功能"
            />
            <FormHelperText>在總覽「關注檢驗」標題列顯示列印按鈕，可開新分頁列印腎臟檢驗報告</FormHelperText>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableCKMScreening}
                  onChange={(e) => {
                    handleLocalSettingChange("enableCKMScreening", e.target.checked);
                  }}
                  size="small"
                />
              }
              label={
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  顯示篩檢指標（FIB-4/TyG/KFRE/HOMA-IR）
                  <Chip
                    label="β"
                    size="small"
                    sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#f57c00', color: '#fff', '& .MuiChip-label': { px: 0.5 } }}
                  />
                </Box>
              }
            />
            <FormHelperText>實驗性功能：在總覽 CKM 摘要列顯示肝腎心代謝篩檢指標（需重新載入網頁）</FormHelperText>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default AdvancedSettings; 