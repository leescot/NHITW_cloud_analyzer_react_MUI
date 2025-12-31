/**
 * Tab Configuration Dialog
 *
 * Allows users to configure the 4 sidebar tabs:
 * - Tabs 1-3: Select from preset templates
 * - Tab 4: Custom tab with edit button
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ListSubheader,
    Typography,
    Box,
    Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

import tabTemplateManager from '../../services/gai/tabs';
import { saveSidebarTabs, resetSidebarTabsToDefault } from '../../utils/settingsManager';
import { DEFAULT_SIDEBAR_TABS } from '../../config/sidebarTabDefaults';

const TabConfigDialog = ({ open, onClose, currentTabs, onConfigSaved, onEditCustomTab }) => {
    const [localTabs, setLocalTabs] = useState([...DEFAULT_SIDEBAR_TABS]);
    const [hasChanges, setHasChanges] = useState(false);

    // Load current tabs when dialog opens
    useEffect(() => {
        if (open && currentTabs && currentTabs.length > 0) {
            setLocalTabs([...currentTabs]);
            setHasChanges(false);
        }
    }, [open, currentTabs]);

    // Get all templates grouped by category
    const allTemplates = tabTemplateManager.getAllTemplates();
    const templatesByCategory = {
        basic: allTemplates.filter(t => t.category === 'basic'),
        specialized: allTemplates.filter(t => t.category === 'specialized'),
        advanced: allTemplates.filter(t => t.category === 'advanced')
    };

    const handleTabChange = (slotIndex, newTemplateId) => {
        const updatedTabs = localTabs.map(tab => {
            if (tab.slotIndex === slotIndex) {
                return { ...tab, templateId: newTemplateId };
            }
            return tab;
        });

        setLocalTabs(updatedTabs);
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            await saveSidebarTabs(localTabs);
            console.log('[TabConfigDialog] Saved tab configuration:', localTabs);

            if (onConfigSaved) {
                onConfigSaved(localTabs);
            }

            setHasChanges(false);
            onClose();
        } catch (error) {
            console.error('[TabConfigDialog] Failed to save:', error);
            alert('儲存失敗，請重試');
        }
    };

    const handleReset = async () => {
        if (window.confirm('確定要重置為預設配置嗎？')) {
            try {
                await resetSidebarTabsToDefault();
                setLocalTabs([...DEFAULT_SIDEBAR_TABS]);
                setHasChanges(true);
                console.log('[TabConfigDialog] Reset to default tabs');
            } catch (error) {
                console.error('[TabConfigDialog] Failed to reset:', error);
                alert('重置失敗，請重試');
            }
        }
    };

    const handleCancel = () => {
        if (hasChanges && !window.confirm('有未儲存的變更，確定要離開嗎？')) {
            return;
        }
        setHasChanges(false);
        onClose();
    };

    const handleEditCustomTab = () => {
        if (onEditCustomTab) {
            onEditCustomTab();
        }
    };

    // Render template select for tabs 1-3
    const renderTemplateSelect = (slotIndex) => {
        const currentTab = localTabs.find(t => t.slotIndex === slotIndex);
        const currentTemplateId = currentTab?.templateId || '';

        return (
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Tab {slotIndex + 1}</InputLabel>
                <Select
                    value={currentTemplateId}
                    onChange={(e) => handleTabChange(slotIndex, e.target.value)}
                    label={`Tab ${slotIndex + 1}`}
                    MenuProps={{
                        sx: {
                            zIndex: 2147483649  // 高於 Dialog (2147483648)
                        }
                    }}
                >
                    {/* Basic Analysis Templates */}
                    <ListSubheader>基礎分析</ListSubheader>
                    {templatesByCategory.basic.map(template => (
                        <MenuItem key={template.id} value={template.id}>
                            {template.name} - {template.description}
                        </MenuItem>
                    ))}

                    {/* Specialized Analysis Templates */}
                    {templatesByCategory.specialized.length > 0 && (
                        <>
                            <ListSubheader>專科分析</ListSubheader>
                            {templatesByCategory.specialized.map(template => (
                                <MenuItem key={template.id} value={template.id}>
                                    {template.name} - {template.description}
                                </MenuItem>
                            ))}
                        </>
                    )}

                    {/* Advanced Analysis Templates */}
                    {templatesByCategory.advanced.length > 0 && (
                        <>
                            <ListSubheader>進階分析</ListSubheader>
                            {templatesByCategory.advanced.map(template => (
                                <MenuItem key={template.id} value={template.id}>
                                    {template.name} - {template.description}
                                </MenuItem>
                            ))}
                        </>
                    )}
                </Select>
            </FormControl>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            maxWidth="md"
            fullWidth
            sx={{
                zIndex: 2147483648,  // 高於 Sidebar (2147483647)
                '& .MuiDialog-container': {
                    marginRight: 0  // 不受 Sidebar 影響
                },
                '& .MuiBackdrop-root': {
                    marginRight: 0  // 背景遮罩也不受影響
                }
            }}
        >
            <DialogTitle>設定分析項目</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1 }}>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        前三個 Tab 可選擇預設分析模板，第四個 Tab 為自訂分析
                    </Alert>

                    {/* Tab 1-3: Template Selectors */}
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                        預設分析 Tab (1-3)
                    </Typography>
                    {[0, 1, 2].map(slotIndex => (
                        <Box key={slotIndex}>
                            {renderTemplateSelect(slotIndex)}
                        </Box>
                    ))}

                    {/* Tab 4: Custom Tab */}
                    <Typography variant="subtitle2" sx={{ mb: 1, mt: 3, color: 'text.secondary' }}>
                        自訂分析 Tab (4)
                    </Typography>
                    <Box
                        sx={{
                            p: 2,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            bgcolor: '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <Box>
                            <Typography variant="body2" fontWeight="bold">
                                自訂分析
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                可自訂資料類型、System Prompt 和快速提問
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={handleEditCustomTab}
                        >
                            編輯
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleReset} color="warning">
                    重置為預設
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button onClick={handleCancel}>
                    取消
                </Button>
                <Button onClick={handleSave} variant="contained" disabled={!hasChanges}>
                    儲存
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TabConfigDialog;
