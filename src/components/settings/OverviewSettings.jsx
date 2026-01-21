import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormHelperText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  ListItemIcon,
  ListItemSecondaryAction,
  FormControlLabel,
  Switch
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import ScienceIcon from '@mui/icons-material/Science';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import ImageIcon from '@mui/icons-material/Image';

// 導入從配置文件中移出的常數
import { DEFAULT_LAB_TESTS } from '../../config/labTests';
import { DEFAULT_IMAGE_TESTS } from '../../config/imageTests';

/**
 * FALLBACK_LAB_TESTS - 極簡版的檢驗項目配置
 *
 * 當用戶沒有儲存的設定且 DEFAULT_LAB_TESTS 也不可用時的最小備用配置。
 * 這個配置應與 DEFAULT_LAB_TESTS 中最重要的幾個項目保持一致。
 */
export const FALLBACK_LAB_TESTS = [
  { orderCode: '09002C', displayName: 'BUN', enabled: true },
  { orderCode: '09015C', displayName: 'Cr & GFR', enabled: true },
  { orderCode: '09001C', displayName: 'Chol', enabled: true },
  { orderCode: '09004C', displayName: 'TG', enabled: true },
  { orderCode: '09044C', displayName: 'LDL', enabled: true },
];

/**
 * SPECIAL_LAB_CODES - 需要特殊處理的檢驗代碼
 *
 * 這些檢驗項目在處理時需要特殊邏輯。
 * 集中在此處定義可確保一致性和易於維護。
 */
export const SPECIAL_LAB_CODES = [
  '09015C',   // eGFR
  '09040C',   // Creatinine
  '12111C',   // 特殊檢驗
  '08011C-',  // CBC 相關檢驗 (前綴匹配)
];

/**
 * 重置用戶的檢驗項目設定為預設值
 *
 * 可在需要重置設定的地方調用此函數，例如：
 * - 設定頁面中的"重置為預設"按鈕
 * - 應用版本更新時
 */
export const resetLabTestsToDefault = (callback = () => {}) => {
  chrome.storage.sync.set(
    { focusedLabTests: DEFAULT_LAB_TESTS },
    () => {
      // 通知其他組件設定已更改
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "dataFetchCompleted",
            settingsChanged: true,
            settingType: "overview",
            setting: "focusedLabTests",
            value: DEFAULT_LAB_TESTS
          });
        }
        callback();
      });
    }
  );
};

/**
 * FALLBACK_IMAGE_TESTS - 極簡版的影像檢查配置
 *
 * 當用戶沒有儲存的設定且 DEFAULT_IMAGE_TESTS 也不可用時的最小備用配置。
 * 這個配置應與 DEFAULT_IMAGE_TESTS 中最重要的幾個項目保持一致。
 */
export const FALLBACK_IMAGE_TESTS = [
  { orderCode: '33072B,33070B', displayName: '電腦斷層(CT)', enabled: true },
  { orderCode: '33085B,33084B', displayName: '磁振造影(MRI)', enabled: true },
];

/**
 * 重置用戶的影像檢查設定為預設值
 */
export const resetImageTestsToDefault = (callback = () => {}) => {
  chrome.storage.sync.set(
    { focusedImageTests: DEFAULT_IMAGE_TESTS },
    () => {
      // 通知其他組件設定已更改
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "dataFetchCompleted",
            settingsChanged: true,
            settingType: "overview",
            setting: "focusedImageTests",
            value: DEFAULT_IMAGE_TESTS
          });
        }
        callback();
      });
    }
  );
};

const OverviewSettings = () => {
  // 設定初始值為 90 天 (之前的寫死值)
  const [medicationTrackingDays, setMedicationTrackingDays] = useState(90);
  const [labTrackingDays, setLabTrackingDays] = useState(90);
  // 新增關注影像追蹤天數
  const [imageTrackingDays, setImageTrackingDays] = useState(90);

  // 關注檢驗清單狀態
  const [focusedLabTests, setFocusedLabTests] = useState(DEFAULT_LAB_TESTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempLabTests, setTempLabTests] = useState([]);

  // 關注影像清單狀態
  const [focusedImageTests, setFocusedImageTests] = useState(DEFAULT_IMAGE_TESTS);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [tempImageTests, setTempImageTests] = useState([]);

  // 加載設定
  useEffect(() => {
    chrome.storage.sync.get({
      medicationTrackingDays: 100,
      labTrackingDays: 180,
      imageTrackingDays: 180,
      focusedLabTests: DEFAULT_LAB_TESTS,
      focusedImageTests: DEFAULT_IMAGE_TESTS
    }, (items) => {
      setMedicationTrackingDays(items.medicationTrackingDays);
      setLabTrackingDays(items.labTrackingDays);
      setImageTrackingDays(items.imageTrackingDays);
      setFocusedLabTests(items.focusedLabTests);
      setFocusedImageTests(items.focusedImageTests);
    });
  }, []);

  // 更新藥物追蹤天數
  const handleMedicationDaysChange = (event) => {
    const newValue = parseInt(event.target.value, 10);
    if (newValue > 0) {
      setMedicationTrackingDays(newValue);
      chrome.storage.sync.set({ medicationTrackingDays: newValue });

      // 發送消息給 FloatingIcon 組件更新
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
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
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
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
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
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

  // 打開關注檢驗清單對話框
  const handleOpenLabDialog = () => {
    setTempLabTests([...focusedLabTests]);
    setDialogOpen(true);
  };

  // 關閉關注檢驗清單對話框
  const handleCloseLabDialog = () => {
    setDialogOpen(false);
  };

  // 保存關注檢驗清單設置
  const handleSaveLabTests = () => {
    setFocusedLabTests(tempLabTests);
    chrome.storage.sync.set({ focusedLabTests: tempLabTests });

    // 發送消息給 FloatingIcon 組件更新
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "settingChanged",
          settingType: "overview",
          setting: "focusedLabTests",
          value: tempLabTests
        });
      }
    });

    setDialogOpen(false);
  };

  // 重置检验清单到默认设置
  const handleResetLabTests = () => {
    setTempLabTests([...DEFAULT_LAB_TESTS]);
  };

  // 切換檢驗項目啟用狀態
  const handleToggleLabTest = (index) => {
    const updatedTests = [...tempLabTests];
    updatedTests[index].enabled = !updatedTests[index].enabled;
    setTempLabTests(updatedTests);
  };

  // 上移檢驗項目
  const handleMoveUp = (index) => {
    if (index > 0) {
      const updatedTests = [...tempLabTests];
      const temp = updatedTests[index];
      updatedTests[index] = updatedTests[index - 1];
      updatedTests[index - 1] = temp;
      setTempLabTests(updatedTests);
    }
  };

  // 下移檢驗項目
  const handleMoveDown = (index) => {
    if (index < tempLabTests.length - 1) {
      const updatedTests = [...tempLabTests];
      const temp = updatedTests[index];
      updatedTests[index] = updatedTests[index + 1];
      updatedTests[index + 1] = temp;
      setTempLabTests(updatedTests);
    }
  };

  // 打開關注影像清單對話框
  const handleOpenImageDialog = () => {
    setTempImageTests([...focusedImageTests]);
    setImageDialogOpen(true);
  };

  // 關閉關注影像清單對話框
  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
  };

  // 保存關注影像清單設置
  const handleSaveImageTests = () => {
    setFocusedImageTests(tempImageTests);
    chrome.storage.sync.set({ focusedImageTests: tempImageTests });

    // 發送消息給 FloatingIcon 組件更新
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "settingChanged",
          settingType: "overview",
          setting: "focusedImageTests",
          value: tempImageTests
        });
      }
    });

    setImageDialogOpen(false);
  };

  // 重置影像清單到默认设置
  const handleResetImageTests = () => {
    setTempImageTests([...DEFAULT_IMAGE_TESTS]);
  };

  const medicationHelperText = (
    <span>
      <span style={{ color: 'red' }}>關注藥物清單請至西藥ACT分類設定</span>
      /範圍: 1~180天
    </span>
  );

  // 切換影像項目啟用狀態
  const handleToggleImageTest = (index) => {
    const updatedTests = [...tempImageTests];
    updatedTests[index].enabled = !updatedTests[index].enabled;
    setTempImageTests(updatedTests);
  };

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
          {/* <Typography variant="body2" color="text.secondary" paragraph>
            設定總覽頁面中的資料顯示範圍
          </Typography> */}

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
            onClick={handleOpenLabDialog}
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
            onClick={handleOpenImageDialog}
            fullWidth
            sx={{ mb: 1 }}
          >
            關注影像清單設定
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            設定要在總覽頁面顯示的影像檢查項目及其排序
          </Typography>
        </Box>

        {/* 關注檢驗清單對話框 */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseLabDialog}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>關注檢驗清單設定</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              勾選需要顯示的檢驗項目，並使用上下箭頭調整顯示順序。
            </Typography>
            <List sx={{ width: '100%' }}>
              {tempLabTests.map((test, index) => (
                <ListItem key={test.orderCode} divider>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={test.enabled}
                      onChange={() => handleToggleLabTest(index)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${test.displayName}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      size="small"
                      sx={{
                        color: 'primary.main',
                        bgcolor: 'primary.lighter',
                        borderRadius: 1,
                        mr: 0.5,
                        '&:hover': {
                          bgcolor: 'primary.light',
                          boxShadow: 1
                        },
                        '&.Mui-disabled': {
                          opacity: 0.4
                        }
                      }}
                    >
                      <ArrowCircleUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === tempLabTests.length - 1}
                      size="small"
                      sx={{
                        color: 'primary.main',
                        bgcolor: 'primary.lighter',
                        borderRadius: 1,
                        '&:hover': {
                          bgcolor: 'primary.light',
                          boxShadow: 1
                        },
                        '&.Mui-disabled': {
                          opacity: 0.4
                        }
                      }}
                    >
                      <ArrowCircleDownIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLabDialog} color="primary">
              取消
            </Button>
            <Button
              onClick={handleResetLabTests}
              color="secondary"
              sx={{ mr: 'auto' }}
            >
              重置為預設
            </Button>
            <Button onClick={handleSaveLabTests} color="primary" variant="contained">
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* 關注影像清單對話框 */}
        <Dialog
          open={imageDialogOpen}
          onClose={handleCloseImageDialog}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>關注影像清單設定</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              勾選需要顯示的影像檢查項目。
            </Typography>
            <List sx={{ width: '100%' }}>
              {tempImageTests.map((test, index) => (
                <ListItem key={test.orderCode} divider>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={test.enabled}
                      onChange={() => handleToggleImageTest(index)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${test.displayName}`}
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseImageDialog} color="primary">
              取消
            </Button>
            <Button
              onClick={handleResetImageTests}
              color="secondary"
              sx={{ mr: 'auto' }}
            >
              重置為預設
            </Button>
            <Button onClick={handleSaveImageTests} color="primary" variant="contained">
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </AccordionDetails>
    </Accordion>
  );
};

export default OverviewSettings;