import React, { useState, useEffect } from "react";
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
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Paper,
  Grid,
  Chip,
  Radio,
  RadioGroup,
  Tooltip,
} from "@mui/material";
import MedicationIcon from "@mui/icons-material/Medication";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import { handleSettingChange } from "../../utils/settingsHelper";

// 导入默认配置
import { DEFAULT_ATC5_GROUPS, DEFAULT_ATC5_COLOR_GROUPS } from "../../config/medicationGroups";

const MedicationSettings = () => {
  const [settings, setSettings] = useState({
    simplifyMedicineName: true,
    showDiagnosis: true,
    showGenericName: false,
    showATC5Name: false,
    medicationCopyFormat: "nameWithDosageVertical",
    separateShortTermMeds: false,
    enableATC5Colors: true,
    atc5Groups: DEFAULT_ATC5_GROUPS,
    atc5ColorGroups: DEFAULT_ATC5_COLOR_GROUPS,
    showExternalDrugImage: false,
    enableMedicationCustomCopyFormat: false,
    customMedicationHeaderCopyFormat: [
      { id: 'date', display: '日期' },
      { id: 'separator', value: ' - ', display: ' - ' },
      { id: 'hosp', display: '醫院' },
      { id: 'newline', display: '換行' },
    ],
    customMedicationDrugCopyFormat: [
      { id: 'name', display: '藥物名稱' },
      { id: 'space', display: ' ' },
      { id: 'perDosage', display: '單次劑量' },
      { id: 'space', display: ' ' },
      { id: 'frequency', display: '頻次' },
      { id: 'space', display: ' ' },
      { id: 'days', display: '天數' },
      { id: 'text', value: '天', display: '天' }
    ]
  });

  // Monitor when enableMedicationCustomCopyFormat changes
  useEffect(() => {
    console.log("MedicationSettings: enableMedicationCustomCopyFormat changed to:", settings.enableMedicationCustomCopyFormat);
  }, [settings.enableMedicationCustomCopyFormat]);

  // 统一的 ATC5 分组对话框
  const [atc5GroupsDialogOpen, setAtc5GroupsDialogOpen] = useState(false);

  // ATC5 Group 编辑状态
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCodes, setNewGroupCodes] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("none"); // 新增颜色选择
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    // 加载药物设置
    chrome.storage.sync.get(
      {
        simplifyMedicineName: true,
        showDiagnosis: true,
        showGenericName: false,
        showATC5Name: false,
        medicationCopyFormat: "nameWithDosageVertical",
        separateShortTermMeds: false,
        enableATC5Colors: true,
        atc5Groups: DEFAULT_ATC5_GROUPS,
        atc5ColorGroups: DEFAULT_ATC5_COLOR_GROUPS,
        showExternalDrugImage: false,
        enableMedicationCustomCopyFormat: false,
        customMedicationHeaderCopyFormat: [
          { id: 'date', display: '日期' },
          { id: 'separator', value: ' - ', display: ' - ' },
          { id: 'hosp', display: '醫院' },
          { id: 'newline', display: '換行' },
        ],
        customMedicationDrugCopyFormat: [
          { id: 'name', display: '藥物名稱' },
          { id: 'space', display: ' ' },
          { id: 'perDosage', display: '單次劑量' },
          { id: 'space', display: ' ' },
          { id: 'frequency', display: '頻次' },
          { id: 'space', display: ' ' },
          { id: 'days', display: '天數' },
          { id: 'text', value: '天', display: '天' }
        ]
      },
      (items) => {
        setSettings({
          simplifyMedicineName: items.simplifyMedicineName,
          showDiagnosis: items.showDiagnosis,
          showGenericName: items.showGenericName,
          showATC5Name: items.showATC5Name,
          medicationCopyFormat: items.medicationCopyFormat,
          separateShortTermMeds: items.separateShortTermMeds,
          enableATC5Colors: items.enableATC5Colors,
          atc5Groups: items.atc5Groups,
          atc5ColorGroups: items.atc5ColorGroups,
          showExternalDrugImage: items.showExternalDrugImage,
          enableMedicationCustomCopyFormat: items.enableMedicationCustomCopyFormat,
          customMedicationHeaderCopyFormat: items.customMedicationHeaderCopyFormat,
          customMedicationDrugCopyFormat: items.customMedicationDrugCopyFormat
        });
      }
    );

    // Listen for real-time setting changes from other components
    const handleSettingChangedEvent = (event) => {
      const { key, value } = event.detail;
      if (key === 'enableMedicationCustomCopyFormat') {
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

  const handleLocalSettingChange = (key, value) => {
    // 立即更新本地状态以提高 UI 响应性
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // 然后更新 chrome storage
    handleSettingChange(key, value, setSettings);
  };

  // 打开和关闭对话框
  const handleOpenAtc5GroupsDialog = () => {
    setAtc5GroupsDialogOpen(true);
  };

  const handleCloseAtc5GroupsDialog = () => {
    setEditingGroup(null);
    setNewGroupName("");
    setNewGroupCodes("");
    setNewGroupColor("none");
    setEditMode(false);
    setAtc5GroupsDialogOpen(false);
  };

  // 查找组的颜色
  const getGroupColor = (groupName) => {
    // # zh-TW: 使用 Map 代替多個 if-else 檢查，提高可讀性和效率
    const colorMap = new Map([
      [settings.atc5ColorGroups.red.includes(groupName), "red"],
      [settings.atc5ColorGroups.orange.includes(groupName), "orange"],
      [settings.atc5ColorGroups.green.includes(groupName), "green"]
    ]);

    // 找出第一個符合條件的顏色，或返回 "none"
    return colorMap.get(true) || "none";
  };

  // ATC5 分组管理函数
  const handleEditGroup = (groupName) => {
    setEditingGroup(groupName);
    setNewGroupName(groupName);
    setNewGroupCodes(settings.atc5Groups[groupName].join(' '));
    setNewGroupColor(getGroupColor(groupName));
    setEditMode(true);
  };

  const handleDeleteGroup = (groupName) => {
    const updatedGroups = { ...settings.atc5Groups };
    delete updatedGroups[groupName];

    // 首先更新 ATC5 分组
    handleLocalSettingChange('atc5Groups', updatedGroups);

    // 然后从任何颜色分配中删除已删除的组
    const updatedColorGroups = { ...settings.atc5ColorGroups };

    // 检查所有颜色类别并删除组（如果存在）
    ['red', 'orange', 'green'].forEach(color => {
      if (updatedColorGroups[color].includes(groupName)) {
        updatedColorGroups[color] = updatedColorGroups[color].filter(
          group => group !== groupName
        );
      }
    });

    // 更新颜色组分配
    handleLocalSettingChange('atc5ColorGroups', updatedColorGroups);
  };

  const handleAddNewGroup = () => {
    setEditingGroup(null);
    setNewGroupName("");
    setNewGroupCodes("");
    setNewGroupColor("none");
    setEditMode(true);
  };

  const handleSaveGroup = () => {
    if (!newGroupName.trim()) {
      alert("請輸入群組名稱");
      return;
    }

    const codes = newGroupCodes.trim().split(/\s+/);

    if (codes.length === 0 || (codes.length === 1 && codes[0] === "")) {
      alert("請輸入至少一個 ATC 代碼");
      return;
    }

    const updatedGroups = { ...settings.atc5Groups };
    const oldGroupName = editingGroup;

    // 更新分组
    if (oldGroupName && oldGroupName !== newGroupName) {
      delete updatedGroups[oldGroupName];
    }

    updatedGroups[newGroupName] = codes;
    handleLocalSettingChange('atc5Groups', updatedGroups);

    // 更新颜色分配
    const updatedColorGroups = { ...settings.atc5ColorGroups };

    // 从所有颜色组中删除旧的组名（如果存在）
    ['red', 'orange', 'green'].forEach(color => {
      // 如果是编辑现有组，删除旧的分配
      if (oldGroupName) {
        updatedColorGroups[color] = updatedColorGroups[color].filter(
          group => group !== oldGroupName
        );
      }

      // 如果是编辑现有组且组名已更改，还需删除新名称的任何现有分配
      if (oldGroupName !== newGroupName) {
        updatedColorGroups[color] = updatedColorGroups[color].filter(
          group => group !== newGroupName
        );
      }
    });

    // 添加新的颜色分配（如果不是"none"）
    if (newGroupColor !== "none") {
      updatedColorGroups[newGroupColor] = [
        ...updatedColorGroups[newGroupColor],
        newGroupName
      ];
    }

    handleLocalSettingChange('atc5ColorGroups', updatedColorGroups);

    setEditMode(false);
    setEditingGroup(null);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingGroup(null);
  };

  const handleResetSettings = () => {
    // 创建默认组的深拷贝
    const groupsCopy = JSON.parse(JSON.stringify(DEFAULT_ATC5_GROUPS));
    const colorGroupsCopy = JSON.parse(JSON.stringify(DEFAULT_ATC5_COLOR_GROUPS));

    // 将两个设置都更新为默认值
    handleLocalSettingChange('atc5Groups', groupsCopy);
    handleLocalSettingChange('atc5ColorGroups', colorGroupsCopy);

    // 如果打开，关闭编辑模式
    setEditMode(false);
    setEditingGroup(null);
  };

  // 为更好显示格式化 ATC 代码 - 两列
  const formatCodesForDisplay = (codes) => {
    if (codes.length === 0) return null;

    // # zh-TW: 為兩列佈局創建代碼對
    const rows = [];
    for (let i = 0; i < codes.length; i += 2) {
      // # zh-TW: 使用條件運算符替代 if-else 邏輯，更簡潔
      const pair = i + 1 < codes.length
        ? [codes[i], codes[i + 1]]  // 如果有一對
        : [codes[i]];               // 如果最後有奇數
      rows.push(pair);
    }

    return (
      <Box sx={{ width: '100%' }}>
        {rows.map((row, rowIndex) => (
          <Box key={rowIndex} sx={{ display: 'flex', mb: 0.5 }}>
            {row.map((code, codeIndex) => (
              <Typography
                key={codeIndex}
                variant="body2"
                component="span"
                sx={{
                  display: 'inline-block',
                  width: '50%',
                  minWidth: '90px'
                }}
              >
                {code}
              </Typography>
            ))}
          </Box>
        ))}
      </Box>
    );
  };

  // 根据组的颜色获取显示芯片
  const getColorChip = (groupName) => {
    // # zh-TW: 使用 Map 代替物件映射，保持一致性並提高查詢效率
    const colorMap = new Map([
      ["red", { color: "error", label: "紅" }],
      ["orange", { color: "warning", label: "橘" }],
      ["green", { color: "success", label: "綠" }],
      ["none", { color: "default", label: "無" }]
    ]);

    const groupColor = getGroupColor(groupName);
    // 如果顏色是 none 則不顯示芯片
    if (groupColor === "none") return null;

    const { color, label } = colorMap.get(groupColor);

    return (
      <Chip
        size="small"
        label={label}
        color={color}
        variant="outlined"
        icon={<ColorLensIcon />}
        sx={{ ml: 1 }}
      />
    );
  };

  // 颜色选择标签的样式
  const getColorLabelStyle = (color) => {
    const baseStyle = {
      borderRadius: 1,
      px: 1,
      py: 0.5,
      display: 'flex',
      alignItems: 'center',
      gap: 0.5
    };

    // # zh-TW: 使用 Map 代替 switch-case，提高可讀性和維護性
    const styleMap = new Map([
      ["red", { ...baseStyle, bgcolor: '#ffebee', color: 'error.main', border: '1px solid', borderColor: 'error.light' }],
      ["orange", { ...baseStyle, bgcolor: '#fff3e0', color: 'warning.main', border: '1px solid', borderColor: 'warning.light' }],
      ["green", { ...baseStyle, bgcolor: '#e8f5e9', color: 'success.main', border: '1px solid', borderColor: 'success.light' }]
    ]);

    // 返回對應顏色的樣式，如果找不到則返回預設樣式
    return styleMap.get(color) || { ...baseStyle, bgcolor: 'grey.100', color: 'text.secondary', border: '1px solid', borderColor: 'grey.300' };
  };

  // 打开 FloatingIcon 的自訂設定标签
  const openCustomFormatEditor = () => {
    // Only proceed if enableMedicationCustomCopyFormat is true
    if (!settings.enableMedicationCustomCopyFormat) return;

    // 发送消息给 background script 或直接调用 FloatingIcon 的方法
    if (window.openFloatingIconDialog) {
      window.openFloatingIconDialog();
      // 等对话框打开后，切换到自訂設定标签（索引为9）
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'switchToCustomFormatTab',
          tabIndex: 9
        });
      }, 100);
    } else {
      // 如果全局方法不可用，则发送消息给背景脚本处理
      chrome.runtime.sendMessage({
        action: 'openCustomFormatEditor'
      });
    }
  };

  console.log("Render - medicationCopyFormat:", settings.medicationCopyFormat);
  console.log("Render - enableMedicationCustomCopyFormat:", settings.enableMedicationCustomCopyFormat);

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="medication-settings-content"
        id="medication-settings-header"
      >
        <MedicationIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography>西藥顯示設定</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FormControlLabel
          control={
            <Switch
              checked={settings.simplifyMedicineName}
              onChange={(e) =>
                handleLocalSettingChange(
                  "simplifyMedicineName",
                  e.target.checked
                )
              }
            />
          }
          label="藥物商品名精簡顯示"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.showDiagnosis}
              onChange={(e) =>
                handleLocalSettingChange("showDiagnosis", e.target.checked)
              }
            />
          }
          label="顯示主診斷資訊"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.showGenericName}
              onChange={(e) =>
                handleLocalSettingChange("showGenericName", e.target.checked)
              }
            />
          }
          label="顯示藥品學名"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.showATC5Name}
              onChange={(e) =>
                handleLocalSettingChange("showATC5Name", e.target.checked)
              }
            />
          }
          label="顯示ATC5分類名稱"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.separateShortTermMeds}
              onChange={(e) =>
                handleLocalSettingChange("separateShortTermMeds", e.target.checked)
              }
            />
          }
          label="短天數藥物分欄顯示"
        />


        <FormControlLabel
          control={
            <Switch
              checked={settings.showExternalDrugImage}
              onChange={(e) =>
                handleLocalSettingChange("showExternalDrugImage", e.target.checked)
              }
            />
          }
          label="顯示藥物外觀功能(需連接外網)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.enableATC5Colors}
              onChange={(e) =>
                handleLocalSettingChange("enableATC5Colors", e.target.checked)
              }
            />
          }
          label="開啟ATC5變色功能"
        />
        {settings.enableATC5Colors && (
          <Box sx={{ mt: 1, mb: 2, ml: 4 }}>
            <Button
              variant="outlined"
              onClick={handleOpenAtc5GroupsDialog}
            >
              設定ATC5群組與顏色
            </Button>
          </Box>
        )}

        {/* Remove the duplicate switch for enableMedicationCustomCopyFormat since it's now in AdvancedSettings */}
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

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="medication-copy-format-label">
            藥物複製格式
          </InputLabel>
          <Select
            labelId="medication-copy-format-label"
            id="medication-copy-format"
            value={settings.medicationCopyFormat}
            label="藥物複製格式"
            onChange={(e) => {
              console.log("Select onChange triggered. Value:", e.target.value);
              handleLocalSettingChange("medicationCopyFormat", e.target.value);
            }}
          >
            <MenuItem value="none">關閉複製功能</MenuItem>
            <MenuItem value="nameVertical">複製商品名(直式)</MenuItem>
            <MenuItem value="nameWithDosageVertical">
              複製商品名+使用量(直式)
            </MenuItem>
            <MenuItem value="nameHorizontal">複製商品名(橫式)</MenuItem>
            <MenuItem value="nameWithDosageHorizontal">
              複製商品名+使用量(橫式)
            </MenuItem>
            <MenuItem
              value="customVertical"
              disabled={!settings.enableMedicationCustomCopyFormat}
            >
              自訂西藥複製格式(直式)
            </MenuItem>
            <MenuItem
              value="customHorizontal"
              disabled={!settings.enableMedicationCustomCopyFormat}
            >
              自訂西藥複製格式(橫式)
            </MenuItem>
          </Select>
        </FormControl>

        {/* 整合后的 ATC5 分组和颜色对话框 */}
        <Dialog
          open={atc5GroupsDialogOpen}
          onClose={handleCloseAtc5GroupsDialog}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>設定ATC群組與顏色</DialogTitle>
          <DialogContent dividers>
            {/* <Typography variant="body1" gutterBottom>
              設定ATC組合群組與顏色
            </Typography> */}
            <Typography variant="body2" gutterBottom sx={{ color: 'text.secondary' }}>
              每個群組可以選擇一種顏色或不指定顏色(暫不分組)
            </Typography>

            {!editMode ? (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddNewGroup}
                  >
                    新增群組
                  </Button>
                </Box>

                <List sx={{ width: '100%' }}>
                  {Object.entries(settings.atc5Groups).map(([groupName, codes], index) => (
                    <React.Fragment key={groupName}>
                      {index > 0 && <Divider />}
                      <ListItem
                        sx={{
                          py: 1.5,
                          position: 'relative',
                          display: 'block'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {groupName}
                          </Typography>
                          {getColorChip(groupName)}
                          <Box sx={{ display: 'flex', ml: 'auto' }}>
                            <IconButton size="small" onClick={() => handleEditGroup(groupName)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteGroup(groupName)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Box>
                          {formatCodesForDisplay(codes)}
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="群組名稱"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="ATC 代碼 (以空格分隔)"
                      value={newGroupCodes}
                      onChange={(e) => setNewGroupCodes(e.target.value)}
                      placeholder="例如: M01AA M01AB M01AC M01AE M01AG M01AH"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      選擇群組顏色:
                    </Typography>
                    <RadioGroup
                      row
                      value={newGroupColor}
                      onChange={(e) => setNewGroupColor(e.target.value)}
                    >

                      <FormControlLabel
                        value="red"
                        control={<Radio color="error" />}
                        label={
                          <Box component="span" sx={getColorLabelStyle("red")}>
                            <ColorLensIcon fontSize="small" />
                            紅
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="orange"
                        control={<Radio color="warning" />}
                        label={
                          <Box component="span" sx={getColorLabelStyle("orange")}>
                            <ColorLensIcon fontSize="small" />
                            橘
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="green"
                        control={<Radio color="success" />}
                        label={
                          <Box component="span" sx={getColorLabelStyle("green")}>
                            <ColorLensIcon fontSize="small" />
                            綠
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="none"
                        control={<Radio />}
                        label={
                          <Box component="span" sx={getColorLabelStyle("none")}>
                            {/* <ColorLensIcon fontSize="small" /> */}
                            不分組
                          </Box>
                        }
                      />
                    </RadioGroup>
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                  <Button onClick={handleCancelEdit}>取消</Button>
                  <Button variant="contained" onClick={handleSaveGroup}>儲存</Button>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center' }}>
            <Button
              onClick={handleResetSettings}
              color="secondary"
            >
              ATC設定重置為預設
            </Button>
          </DialogActions>
        </Dialog>
      </AccordionDetails>
    </Accordion>
  );
};

export default MedicationSettings;