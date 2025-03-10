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
  MenuItem
} from '@mui/material';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { handleSettingChange } from '../../utils/settingsHelper';

const ChineseMedicationSettings = () => {
  const [settings, setSettings] = useState({
    showDiagnosis: false,
    showEffectName: false,
    copyFormat: 'nameWithDosageVertical'
  });

  useEffect(() => {
    // Load Chinese medicine settings
    chrome.storage.sync.get({
      chineseMedShowDiagnosis: false,
      chineseMedShowEffectName: false,
      chineseMedCopyFormat: 'nameWithDosageVertical'
    }, (items) => {
      setSettings({
        showDiagnosis: items.chineseMedShowDiagnosis,
        showEffectName: items.chineseMedShowEffectName,
        copyFormat: items.chineseMedCopyFormat
      });
    });
  }, []);

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="chinesemed-settings-content"
        id="chinesemed-settings-header"
      >
        <LocalPharmacyIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography>中藥顯示設定</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FormControlLabel
          control={
            <Switch
              checked={settings.showDiagnosis}
              onChange={(e) => handleSettingChange('chineseMedShowDiagnosis', e.target.checked, setSettings, 'showDiagnosis')}
            />
          }
          label="顯示主診斷資訊"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.showEffectName}
              onChange={(e) => handleSettingChange('chineseMedShowEffectName', e.target.checked, setSettings, 'showEffectName')}
            />
          }
          label="顯示效能名稱"
        />
        
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="chinesemed-copy-format-label">中藥複製格式</InputLabel>
          <Select
            labelId="chinesemed-copy-format-label"
            id="chinesemed-copy-format"
            value={settings.copyFormat}
            label="中藥複製格式"
            onChange={(e) => handleSettingChange('chineseMedCopyFormat', e.target.value, setSettings, 'copyFormat')}
          >
            <MenuItem value="none">關閉複製功能</MenuItem>
            <MenuItem value="nameVertical">複製商品名(直式)</MenuItem>
            <MenuItem value="nameWithDosageVertical">複製商品名+使用量(直式)</MenuItem>
            <MenuItem value="nameHorizontal">複製商品名(橫式)</MenuItem>
            <MenuItem value="nameWithDosageHorizontal">複製商品名+使用量(橫式)</MenuItem>
          </Select>
        </FormControl>
      </AccordionDetails>
    </Accordion>
  );
};

export default ChineseMedicationSettings; 