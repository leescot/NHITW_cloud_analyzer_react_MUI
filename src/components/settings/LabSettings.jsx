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
  Box
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import CategoryIcon from '@mui/icons-material/Category';
import { handleSettingChange } from '../../utils/settingsHelper';

const LabSettings = () => {
  const [settings, setSettings] = useState({
    labDisplayFormat: 'byType',
    showLabUnit: false,
    showLabReference: false,
    enableLabAbbrev: true,
    highlightAbnormalLab: true,
    labCopyFormat: 'horizontal'
  });

  useEffect(() => {
    // Load lab settings
    chrome.storage.sync.get({
      labDisplayFormat: 'byType',
      showLabUnit: false,
      showLabReference: false,
      enableLabAbbrev: true,
      highlightAbnormalLab: true,
      labCopyFormat: 'horizontal'
    }, (items) => {
      setSettings({
        labDisplayFormat: items.labDisplayFormat,
        showLabUnit: items.showLabUnit,
        showLabReference: items.showLabReference,
        enableLabAbbrev: items.enableLabAbbrev,
        highlightAbnormalLab: items.highlightAbnormalLab,
        labCopyFormat: items.labCopyFormat
      });
    });
  }, []);

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
            <MenuItem value="byType">分類格式 (按檢驗類型分組)</MenuItem>
          </Select>
        </FormControl>
        
      </AccordionDetails>
    </Accordion>
  );
};

export default LabSettings;