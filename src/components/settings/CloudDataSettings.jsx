import React, { useState, useEffect } from 'react';
import {
  Typography,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  FormHelperText,
  Box
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import { handleSettingChange } from '../../utils/settingsHelper';
import { DEFAULT_SETTINGS } from '../../config/defaultSettings';

const CloudDataSettings = () => {
  const [settings, setSettings] = useState({
    fetchAdultHealthCheck: DEFAULT_SETTINGS.cloud.fetchAdultHealthCheck,
    fetchCancerScreening: DEFAULT_SETTINGS.cloud.fetchCancerScreening,
  });

  useEffect(() => {
    // Load cloud data settings
    chrome.storage.sync.get({
      fetchAdultHealthCheck: DEFAULT_SETTINGS.cloud.fetchAdultHealthCheck,
      fetchCancerScreening: DEFAULT_SETTINGS.cloud.fetchCancerScreening,
    }, (items) => {
      setSettings({
        fetchAdultHealthCheck: items.fetchAdultHealthCheck,
        fetchCancerScreening: items.fetchCancerScreening,
      });
    });
  }, []);

  const handleLocalSettingChange = (settingName, value) => {
    // Update local state
    setSettings(prev => ({
      ...prev,
      [settingName]: value
    }));

    // Save to Chrome storage
    handleSettingChange(settingName, value, null, null, 'cloud');
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="cloud-data-settings-content"
        id="cloud-data-settings-header"
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CloudQueueIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography>雲端資料設定</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ mb: 2 }}>
          <FormHelperText sx={{ color: 'warning.main', mb: 1 }}>
            此頁設定需重新讀卡才會抓取資料
          </FormHelperText>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.fetchAdultHealthCheck}
                onChange={(e) => handleLocalSettingChange('fetchAdultHealthCheck', e.target.checked)}
                name="fetchAdultHealthCheck"
                color="primary"
              />
            }
            label="抓取「成人預防保健」資料"
          />
          <FormHelperText>原網站資料所在：檢查與檢驗/成人預防保健</FormHelperText>

          <FormControlLabel
            control={
              <Switch
                checked={settings.fetchCancerScreening}
                onChange={(e) => handleLocalSettingChange('fetchCancerScreening', e.target.checked)}
                name="fetchCancerScreening"
                color="primary"
              />
            }
            label="抓取「四癌篩檢結果」資料"
          />
          <FormHelperText>原網站資料所在：檢查與檢驗/四癌篩檢結果</FormHelperText>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default CloudDataSettings; 