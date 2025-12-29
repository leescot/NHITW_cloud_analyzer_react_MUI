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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import EditIcon from "@mui/icons-material/Edit";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import SaveIcon from "@mui/icons-material/Save";
import { IconButton, InputAdornment } from "@mui/material";
import { DEFAULT_GAI_PROMPT } from "../../config/defaultSettings";

const GAISettings = () => {
    const [settings, setSettings] = useState({
        enableGAICopyFormat: false,
        enableGAIPrompt: false,
        enableGAISidebar: false,
    });

    const [promptDialogOpen, setPromptDialogOpen] = useState(false);
    const [gaiPrompt, setGaiPrompt] = useState(DEFAULT_GAI_PROMPT);
    const [gaiProvider, setGaiProvider] = useState("openai");
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKeySaved, setApiKeySaved] = useState(false);

    // ============ 動態提供者管理 ============
    const [availableProviders, setAvailableProviders] = useState([]);
    const [apiKeys, setApiKeys] = useState({}); // { providerId: apiKeyValue }

    useEffect(() => {
        // 1. 查詢可用的提供者列表
        chrome.runtime.sendMessage({ action: 'getGAIProviders' }, (response) => {
            if (response && response.success) {
                setAvailableProviders(response.providers);
                console.log('[GAISettings] Loaded providers:', response.providers);

                // 2. 載入所有提供者的 API Keys
                const storageKeys = response.providers.reduce((acc, provider) => {
                    acc[provider.apiKeyStorageKey] = "";
                    return acc;
                }, {});

                chrome.storage.sync.get(
                    {
                        enableGAICopyFormat: false,
                        enableGAIPrompt: false,
                        enableGAISidebar: false,
                        gaiPrompt: DEFAULT_GAI_PROMPT,
                        gaiProvider: "openai",
                        ...storageKeys
                    },
                    (items) => {
                        setSettings({
                            enableGAICopyFormat: items.enableGAICopyFormat,
                            enableGAIPrompt: items.enableGAIPrompt,
                            enableGAISidebar: items.enableGAISidebar,
                        });
                        setGaiPrompt(items.gaiPrompt || DEFAULT_GAI_PROMPT);
                        setGaiProvider(items.gaiProvider || "openai");

                        // 載入所有 API Keys
                        const loadedKeys = {};
                        response.providers.forEach(provider => {
                            loadedKeys[provider.id] = items[provider.apiKeyStorageKey] || "";
                        });
                        setApiKeys(loadedKeys);
                    }
                );
            } else {
                console.error('[GAISettings] Failed to load providers:', response?.error);
            }
        });
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
                    <Typography>GAI 相關設定</Typography>
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

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.enableGAISidebar}
                                onChange={(e) => {
                                    handleLocalSettingChange(
                                        "enableGAISidebar",
                                        e.target.checked
                                    );
                                }}
                            />
                        }
                        label="開啟 GAI 側邊欄顯示"
                    />

                    {settings.enableGAISidebar && availableProviders.length > 0 && (
                        <Box sx={{ mt: 2, mb: 1, ml: 4 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* 動態生成提供者選單 */}
                                <FormControl fullWidth size="small">
                                    <InputLabel id="gai-provider-label">AI 模型提供者</InputLabel>
                                    <Select
                                        labelId="gai-provider-label"
                                        value={gaiProvider}
                                        label="AI 模型提供者"
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setGaiProvider(newVal);
                                            chrome.storage.sync.set({ gaiProvider: newVal });
                                        }}
                                    >
                                        {availableProviders.map((provider) => (
                                            <MenuItem key={provider.id} value={provider.id}>
                                                {provider.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* 動態生成 API Key 輸入欄位 */}
                                {(() => {
                                    const currentProvider = availableProviders.find(p => p.id === gaiProvider);
                                    if (!currentProvider) return null;

                                    return (
                                        <>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <TextField
                                                    label={`${currentProvider.name} API Key`}
                                                    type={showApiKey ? "text" : "password"}
                                                    value={apiKeys[currentProvider.id] || ""}
                                                    onChange={(e) => {
                                                        setApiKeys(prev => ({
                                                            ...prev,
                                                            [currentProvider.id]: e.target.value
                                                        }));
                                                        setApiKeySaved(false);
                                                    }}
                                                    fullWidth
                                                    size="small"
                                                    variant="outlined"
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton
                                                                    aria-label="toggle password visibility"
                                                                    onClick={() => setShowApiKey(!showApiKey)}
                                                                    edge="end"
                                                                >
                                                                    {showApiKey ? <VisibilityOff /> : <Visibility />}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                                <Button
                                                    variant="contained"
                                                    color={apiKeySaved ? "success" : "primary"}
                                                    startIcon={<SaveIcon />}
                                                    onClick={() => {
                                                        const saveData = {
                                                            [currentProvider.apiKeyStorageKey]: apiKeys[currentProvider.id]
                                                        };
                                                        chrome.storage.sync.set(saveData, () => {
                                                            setApiKeySaved(true);
                                                            setTimeout(() => setApiKeySaved(false), 2000);
                                                        });
                                                    }}
                                                    sx={{ minWidth: '100px' }}
                                                >
                                                    {apiKeySaved ? "已儲存" : "儲存"}
                                                </Button>
                                            </Box>

                                            {/* 動態顯示提供者說明 */}
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {currentProvider.description || `請輸入您的 ${currentProvider.name} API Key，金鑰僅儲存在您的瀏覽器中。`}
                                            </Typography>
                                        </>
                                    );
                                })()}
                            </Box>
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
