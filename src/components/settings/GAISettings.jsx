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
    Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import EditIcon from "@mui/icons-material/Edit";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { DEFAULT_GAI_PROMPT } from "../../config/defaultSettings";

const GAISettings = () => {
    const [settings, setSettings] = useState({
        enableGAICopyFormat: false,
        enableGAIPrompt: false,
    });

    const [promptDialogOpen, setPromptDialogOpen] = useState(false);
    const [gaiPrompt, setGaiPrompt] = useState(DEFAULT_GAI_PROMPT);

    useEffect(() => {
        // Load GAI settings
        chrome.storage.sync.get(
            {
                enableGAICopyFormat: false,
                enableGAIPrompt: false,
                gaiPrompt: DEFAULT_GAI_PROMPT,
            },
            (items) => {
                setSettings({
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

        // Update storage
        chrome.storage.sync.set({
            [key]: value
        }, () => {
            console.log(`Updated ${key} to ${value}`);

            // Notify content script of setting change
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

    return (
        <>
            {/* GAI相關設定 - GAI Settings */}
            <Accordion>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="gai-settings-content"
                    id="gai-settings-header"
                >
                    <SmartToyIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography>GAI相關設定</Typography>
                    <Chip
                        label="beta"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{
                            ml: 1,
                            height: '20px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                        }}
                    />
                </AccordionSummary>
                <AccordionDetails>
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
            </Accordion>

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
        </>
    );
};

export default GAISettings;
