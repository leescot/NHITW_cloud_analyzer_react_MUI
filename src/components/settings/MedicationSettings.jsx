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
  Card,
  CardHeader,
  CardContent,
  FormHelperText,
  Radio,
  RadioGroup,
} from "@mui/material";
import MedicationIcon from "@mui/icons-material/Medication";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import { handleSettingChange } from "../../utils/settingsHelper";

// 預設的 ATC5 群組
const DEFAULT_ATC5_GROUPS = {
  NSAID: ['M01AA', 'M01AB', 'M01AC', 'M01AE', 'M01AG', 'M01AH'],
  ACEI: ['C09AA', 'C09BA', 'C09BB', 'C09BX'],
  ARB: ['C09CA', 'C09DA', 'C09DB', 'C09DX'],
  STATIN: ['C10AA', 'C10BA', 'C10BX'],
  SGLT2: ['A10BK', 'A10BD15', 'A10BD16', 'A10BD19', 'A10BD20', 'A10BD21', 'A10BD25', 'A10BD27', 'A10BD29', 'A10BD30'],
  GLP1: ['A10BJ', 'A10AE54', 'A10AE56'],
};

const MedicationSettings = () => {
  const [settings, setSettings] = useState({
    simplifyMedicineName: true,
    showDiagnosis: true,
    showGenericName: false,
    showATC5Name: false,
    copyFormat: "nameWithDosageVertical",
    enableATC5Colors: true,
    atc5Groups: DEFAULT_ATC5_GROUPS,
    atc5ColorGroups: {
      red: ['NSAID'],
      orange: ['ARB','ACEI','STATIN'],
      green: [],
    },
  });

  // Dialog states
  const [atc5GroupsDialogOpen, setAtc5GroupsDialogOpen] = useState(false);
  const [colorSettingsDialogOpen, setColorSettingsDialogOpen] = useState(false);

  // ATC5 Group editing states
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCodes, setNewGroupCodes] = useState("");
  const [editMode, setEditMode] = useState(false);
  
  // Group Colors Dialog states
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  useEffect(() => {
    // Load medication settings
    chrome.storage.sync.get(
      {
        simplifyMedicineName: true,
        showDiagnosis: true,
        showGenericName: false,
        showATC5Name: false,
        copyFormat: "nameWithDosageVertical",
        enableATC5Colors: true,
        atc5Groups: DEFAULT_ATC5_GROUPS,
        atc5ColorGroups: {
          red: ['NSAID'],
          orange: ['ARB','ACEI','STATIN'],
          green: [],
        },
      },
      (items) => {
        setSettings({
          simplifyMedicineName: items.simplifyMedicineName,
          showDiagnosis: items.showDiagnosis,
          showGenericName: items.showGenericName,
          showATC5Name: items.showATC5Name,
          copyFormat: items.copyFormat,
          enableATC5Colors: items.enableATC5Colors,
          atc5Groups: items.atc5Groups,
          atc5ColorGroups: items.atc5ColorGroups,
        });
        
        // Ensure the default ATC5 groups are properly saved in storage
        // This fixes the bug where groups don't work until edited
        if (JSON.stringify(items.atc5Groups) === JSON.stringify(DEFAULT_ATC5_GROUPS)) {
          // Create a deep copy of the default groups to ensure proper storage
          const groupsCopy = JSON.parse(JSON.stringify(DEFAULT_ATC5_GROUPS));
          handleSettingChange('atc5Groups', groupsCopy);
        }
      }
    );
  }, []);

  const handleLocalSettingChange = (key, value) => {
    // Update local state immediately for UI responsiveness
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Then update chrome storage
    handleSettingChange(key, value, setSettings);
  };

  // Open and close dialogs
  const handleOpenAtc5GroupsDialog = () => {
    setAtc5GroupsDialogOpen(true);
  };

  const handleCloseAtc5GroupsDialog = () => {
    setEditingGroup(null);
    setNewGroupName("");
    setNewGroupCodes("");
    setEditMode(false);
    setAtc5GroupsDialogOpen(false);
  };

  const handleOpenColorSettingsDialog = () => {
    setColorSettingsDialogOpen(true);
  };

  const handleCloseColorSettingsDialog = () => {
    setColorSettingsDialogOpen(false);
  };

  // ATC5 Group management functions
  const handleEditGroup = (groupName) => {
    setEditingGroup(groupName);
    setNewGroupName(groupName);
    setNewGroupCodes(settings.atc5Groups[groupName].join(' '));
    setEditMode(true);
  };

  const handleDeleteGroup = (groupName) => {
    const updatedGroups = { ...settings.atc5Groups };
    delete updatedGroups[groupName];
    
    handleLocalSettingChange('atc5Groups', updatedGroups);
  };

  const handleAddNewGroup = () => {
    setEditingGroup(null);
    setNewGroupName("");
    setNewGroupCodes("");
    setEditMode(true);
  };

  const handleSaveGroup = () => {
    if (!newGroupName.trim()) {
      alert("請輸入群組名稱");
      return;
    }

    const codes = newGroupCodes.trim().split(/\s+/);
    
    if (codes.length === 0 || (codes.length === 1 && codes[0] === "")) {
      alert("請輸入至少一個 ATC5 代碼");
      return;
    }
    
    const updatedGroups = { ...settings.atc5Groups };
    
    // 如果是編輯現有群組且名稱已更改，需要刪除舊的
    if (editingGroup && editingGroup !== newGroupName) {
      delete updatedGroups[editingGroup];
    }
    
    updatedGroups[newGroupName] = codes;
    
    handleLocalSettingChange('atc5Groups', updatedGroups);
    setEditMode(false);
    setEditingGroup(null);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingGroup(null);
  };

  // Get available groups that are not assigned to any color
  const getAvailableGroups = () => {
    const assignedGroups = [
      ...settings.atc5ColorGroups.red,
      ...settings.atc5ColorGroups.orange,
      ...settings.atc5ColorGroups.green
    ];
    
    return Object.keys(settings.atc5Groups).filter(
      group => !assignedGroups.includes(group)
    );
  };

  const handleColorGroupChange = (color, groups) => {
    const updatedColorGroups = {
      ...settings.atc5ColorGroups,
      [color]: groups
    };
    
    handleLocalSettingChange('atc5ColorGroups', updatedColorGroups);
  };

  const handleRemoveFromColor = (color, groupToRemove) => {
    const updatedGroups = settings.atc5ColorGroups[color].filter(
      group => group !== groupToRemove
    );
    handleColorGroupChange(color, updatedGroups);
  };

  const handleAddGroupToColor = () => {
    if (!selectedGroup || !selectedColor) return;
    
    const updatedGroups = [...settings.atc5ColorGroups[selectedColor], selectedGroup];
    handleColorGroupChange(selectedColor, updatedGroups);
    
    // Reset selection
    setSelectedGroup("");
    setSelectedColor("");
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="medication-settings-content"
        id="medication-settings-header"
      >
        <MedicationIcon sx={{ mr: 1, color: 'primary.main' }}/>
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
              checked={settings.enableATC5Colors}
              onChange={(e) =>
                handleLocalSettingChange("enableATC5Colors", e.target.checked)
              }
            />
          }
          label="開啟ATC5變色功能"
        />
        
        {settings.enableATC5Colors && (
          <Box sx={{ mt: 1, mb: 2, ml: 4, display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={handleOpenAtc5GroupsDialog}
            >
              設定ATC5群組
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleOpenColorSettingsDialog}
            >
              設定群組顏色
            </Button>
          </Box>
        )}

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="medication-copy-format-label">
            藥物複製格式
          </InputLabel>
          <Select
            labelId="medication-copy-format-label"
            id="medication-copy-format"
            value={settings.copyFormat}
            label="藥物複製格式"
            onChange={(e) =>
              handleLocalSettingChange("copyFormat", e.target.value)
            }
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
          </Select>
        </FormControl>

        {/* ATC5 Groups Dialog */}
        <Dialog 
          open={atc5GroupsDialogOpen} 
          onClose={handleCloseAtc5GroupsDialog}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>設定ATC5群組</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body1" gutterBottom>
              設定不同ATC5組合標籤群組
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
                        secondaryAction={
                          <Box>
                            <IconButton edge="end" onClick={() => handleEditGroup(groupName)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton edge="end" onClick={() => handleDeleteGroup(groupName)}>
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={groupName}
                          secondary={codes.join(', ')}
                        />
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
                      label="ATC5 代碼 (以空格分隔)"
                      value={newGroupCodes}
                      onChange={(e) => setNewGroupCodes(e.target.value)}
                      placeholder="例如: M01AA M01AB M01AC M01AE M01AG M01AH"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                  <Button onClick={handleCancelEdit}>取消</Button>
                  <Button variant="contained" onClick={handleSaveGroup}>儲存</Button>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAtc5GroupsDialog}>關閉</Button>
          </DialogActions>
        </Dialog>

        {/* Group Colors Dialog */}
        <Dialog 
          open={colorSettingsDialogOpen} 
          onClose={handleCloseColorSettingsDialog}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>設定群組顏色</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body1" gutterBottom>
              為ATC5群組標籤指定顏色
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              每個群組只能指定一種顏色（紅、橘、綠）
            </Typography>
            
            {/* Color Cards */}
            <Grid container spacing={3}>
              {/* Red Card */}
              <Grid item xs={12} md={4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderColor: 'red',
                    mb: 2,
                    '& .MuiCardHeader-root': {
                      backgroundColor: '#ffebee'
                    }
                  }}
                >
                  <CardHeader 
                    title="紅色群組" 
                    titleTypographyProps={{ color: 'error' }}
                    avatar={<ColorLensIcon color="error" />}
                  />
                  <CardContent>
                    {settings.atc5ColorGroups.red.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {settings.atc5ColorGroups.red.map(group => (
                          <Chip
                            key={group}
                            label={group}
                            onDelete={() => handleRemoveFromColor('red', group)}
                            color="error"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        尚未指派任何群組
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Orange Card */}
              <Grid item xs={12} md={4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderColor: 'orange',
                    mb: 2,
                    '& .MuiCardHeader-root': {
                      backgroundColor: '#fff3e0'
                    }
                  }}
                >
                  <CardHeader 
                    title="橘色群組" 
                    titleTypographyProps={{ color: 'warning.main' }}
                    avatar={<ColorLensIcon color="warning" />}
                  />
                  <CardContent>
                    {settings.atc5ColorGroups.orange.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {settings.atc5ColorGroups.orange.map(group => (
                          <Chip
                            key={group}
                            label={group}
                            onDelete={() => handleRemoveFromColor('orange', group)}
                            color="warning"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        尚未指派任何群組
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Green Card */}
              <Grid item xs={12} md={4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderColor: 'green',
                    mb: 2,
                    '& .MuiCardHeader-root': {
                      backgroundColor: '#e8f5e9'
                    }
                  }}
                >
                  <CardHeader 
                    title="綠色群組" 
                    titleTypographyProps={{ color: 'success.main' }}
                    avatar={<ColorLensIcon color="success" />}
                  />
                  <CardContent>
                    {settings.atc5ColorGroups.green.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {settings.atc5ColorGroups.green.map(group => (
                          <Chip
                            key={group}
                            label={group}
                            onDelete={() => handleRemoveFromColor('green', group)}
                            color="success"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        尚未指派任何群組
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Add Group Assignment Controls */}
            {getAvailableGroups().length > 0 && (
              <Box sx={{ mt: 4, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  新增群組指派
                </Typography>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={5}>
                    <FormControl fullWidth>
                      <InputLabel>選擇群組</InputLabel>
                      <Select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        label="選擇群組"
                      >
                        {getAvailableGroups().map(group => (
                          <MenuItem key={group} value={group}>
                            {group}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>選擇要指派的群組</FormHelperText>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={5}>
                    <FormControl>
                      <Typography sx={{ mb: 1 }}>指派到顏色：</Typography>
                      <RadioGroup
                        row
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                      >
                        <FormControlLabel 
                          value="red" 
                          control={<Radio color="error" />} 
                          label="紅色" 
                        />
                        <FormControlLabel 
                          value="orange" 
                          control={<Radio color="warning" />} 
                          label="橘色" 
                        />
                        <FormControlLabel 
                          value="green" 
                          control={<Radio color="success" />} 
                          label="綠色" 
                        />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={2}>
                    <Button
                      variant="contained"
                      onClick={handleAddGroupToColor}
                      disabled={!selectedGroup || !selectedColor}
                      fullWidth
                    >
                      指派
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseColorSettingsDialog}>關閉</Button>
          </DialogActions>
        </Dialog>
      </AccordionDetails>
    </Accordion>
  );
};

export default MedicationSettings;
