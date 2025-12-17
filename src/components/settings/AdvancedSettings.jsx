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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import EditIcon from "@mui/icons-material/Edit";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { handleSettingChange } from "../../utils/settingsHelper";
import { DEFAULT_GAI_PROMPT } from "../../config/defaultSettings";

const AdvancedSettings = () => {
  const [settings, setSettings] = useState({
    enableMedicationCustomCopyFormat: false,
    enableMedicationCopyAll: false,
    enableLabCustomCopyFormat: false,
    enableLabCopyAll: false,
    enableGAICopyFormat: false,
    enableGAIPrompt: false,
  });

  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [gaiPrompt, setGaiPrompt] = useState(DEFAULT_GAI_PROMPT);

  useEffect(() => {
    // Load advanced settings
    chrome.storage.sync.get(
      {
        enableMedicationCustomCopyFormat: false,
        enableMedicationCopyAll: false,
        enableLabCustomCopyFormat: false,
        enableLabCopyAll: false,
        enableGAICopyFormat: false,
        enableGAIPrompt: false,
        gaiPrompt: DEFAULT_GAI_PROMPT,
      },
      (items) => {
        setSettings({
          enableMedicationCustomCopyFormat: items.enableMedicationCustomCopyFormat,
          enableMedicationCopyAll: items.enableMedicationCopyAll,
          enableLabCustomCopyFormat: items.enableLabCustomCopyFormat,
          enableLabCopyAll: items.enableLabCopyAll,
          enableGAICopyFormat: items.enableGAICopyFormat,
          enableGAIPrompt: items.enableGAIPrompt,
        });
        setGaiPrompt(items.gaiPrompt || DEFAULT_GAI_PROMPT);
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
        <TuneIcon sx={{ mr: 1, color: 'primary.main' }} />
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
              checked={settings.enableGAICopyFormat}
              onChange={(e) => {
                handleLocalSettingChange(
                  "enableGAICopyFormat",
                  e.target.checked
                );
              }}
            />
          }
          label="開啟複製XML資料格式"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableGAIPrompt}
              onChange={(e) => {
                handleLocalSettingChange(
                  "enableGAIPrompt",
                  e.target.checked
                );
              }}
            />
          }
          label="開啟包含提示詞資料格式"
        />

        {settings.enableGAIPrompt && (
          <Box sx={{ mt: 1, mb: 2, ml: 4, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => setPromptDialogOpen(true)}
            >
              編輯提示詞
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={() => {
                setGaiPrompt(DEFAULT_GAI_PROMPT);
                chrome.storage.sync.set({ gaiPrompt: DEFAULT_GAI_PROMPT }, () => {
                  console.log('GAI prompt reset to default');
                });
              }}
            >
              重置
            </Button>
          </Box>
        )}
      </AccordionDetails>

      {/* GAI Prompt Edit Dialog */}
      <Dialog
        open={promptDialogOpen}
        onClose={() => setPromptDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>編輯 GAI 提示詞</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={20}
            fullWidth
            value={gaiPrompt}
            onChange={(e) => setGaiPrompt(e.target.value)}
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptDialogOpen(false)}>取消</Button>
          <Button
            onClick={() => {
              chrome.storage.sync.set({ gaiPrompt }, () => {
                console.log('GAI prompt saved');
                setPromptDialogOpen(false);
              });
            }}
            variant="contained"
          >
            儲存
          </Button>
        </DialogActions>
      </Dialog>
    </Accordion>
  );
};

export default AdvancedSettings; 