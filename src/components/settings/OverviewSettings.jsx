import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import ScienceIcon from '@mui/icons-material/Science';
import ImageIcon from '@mui/icons-material/Image';

import { storageDefaultsForSection } from '../../config/settingsSchema';
import CodeSetEditor from './CodeSetEditor';

const OverviewSettings = () => {
  // 設定初始值為 90 天 (之前的寫死值)
  const [medicationTrackingDays, setMedicationTrackingDays] = useState(90);
  const [labTrackingDays, setLabTrackingDays] = useState(90);
  // 新增關注影像追蹤天數
  const [imageTrackingDays, setImageTrackingDays] = useState(90);

  // 目前開啟的 CodeSet 編輯器('labFocus' / 'imageFocus' / null)
  const [editorId, setEditorId] = useState(null);

  // 加載設定
  useEffect(() => {
    chrome.storage.sync.get(storageDefaultsForSection('overview'), (items) => {
      setMedicationTrackingDays(items.medicationTrackingDays);
      setLabTrackingDays(items.labTrackingDays);
      setImageTrackingDays(items.imageTrackingDays);
    });
  }, []);

  // 更新藥物追蹤天數
  const handleMedicationDaysChange = (event) => {
    const newValue = parseInt(event.target.value, 10);
    if (newValue > 0) {
      setMedicationTrackingDays(newValue);
      chrome.storage.sync.set({ medicationTrackingDays: newValue });

      // 發送消息給 FloatingIcon 組件更新
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "settingChanged",
            settingType: "overview",
            setting: "medicationTrackingDays",
            value: newValue,
            allSettings: {
              medicationTrackingDays: newValue,
              labTrackingDays: labTrackingDays,
              imageTrackingDays: imageTrackingDays
            }
          });
        }
      });
    }
  };

  // 更新檢驗追蹤天數
  const handleLabDaysChange = (event) => {
    const newValue = parseInt(event.target.value, 10);
    if (newValue > 0) {
      setLabTrackingDays(newValue);
      chrome.storage.sync.set({ labTrackingDays: newValue });

      // 發送消息給 FloatingIcon 組件更新
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "settingChanged",
            settingType: "overview",
            setting: "labTrackingDays",
            value: newValue,
            allSettings: {
              medicationTrackingDays: medicationTrackingDays,
              labTrackingDays: newValue,
              imageTrackingDays: imageTrackingDays
            }
          });
        }
      });
    }
  };

  // 新增更新影像追蹤天數
  const handleImageDaysChange = (event) => {
    const newValue = parseInt(event.target.value, 10);
    if (newValue > 0) {
      setImageTrackingDays(newValue);
      chrome.storage.sync.set({ imageTrackingDays: newValue });

      // 發送消息給 FloatingIcon 組件更新
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "settingChanged",
            settingType: "overview",
            setting: "imageTrackingDays",
            value: newValue,
            allSettings: {
              medicationTrackingDays: medicationTrackingDays,
              labTrackingDays: labTrackingDays,
              imageTrackingDays: newValue
            }
          });
        }
      });
    }
  };

  const medicationHelperText = (
    <span>
      <span style={{ color: 'red' }}>關注藥物清單請至西藥ACT分類設定</span>
      /範圍: 1~180天
    </span>
  );

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="overview-settings-content"
        id="overview-settings-header"
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DashboardCustomizeIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography>總覽顯示設定</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            id="medication-tracking-days"
            label="關注藥物追蹤天數"
            type="number"
            value={medicationTrackingDays}
            onChange={handleMedicationDaysChange}
            inputProps={{ min: 1, max: 180 }}
            helperText={medicationHelperText}
          />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <TextField
              id="lab-tracking-days"
              label="關注檢驗追蹤天數"
              type="number"
              value={labTrackingDays}
              onChange={handleLabDaysChange}
              inputProps={{ min: 1, max: 365 }}
              helperText="總覽頁面最多顯示七組資料/範圍: 1~365天"
            />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <TextField
              id="image-tracking-days"
              label="關注影像追蹤天數"
              type="number"
              value={imageTrackingDays}
              onChange={handleImageDaysChange}
              inputProps={{ min: 1, max: 365 }}
              helperText="範圍: 1~365天"
            />
          </FormControl>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<ScienceIcon />}
            onClick={() => setEditorId('labFocus')}
            fullWidth
            sx={{ mb: 2 }}
          >
            關注檢驗清單設定
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            設定要在總覽頁面顯示的檢驗項目及其排序
          </Typography>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<ImageIcon />}
            onClick={() => setEditorId('imageFocus')}
            fullWidth
            sx={{ mb: 1 }}
          >
            關注影像清單設定
          </Button>
          <Typography variant="caption" color="text.secondary">
            設定要在總覽頁面顯示的影像檢查項目及其排序
          </Typography>
        </Box>

        {editorId && (
          <CodeSetEditor codeSetId={editorId} open onClose={() => setEditorId(null)} />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default OverviewSettings;
