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
    Link,
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

const GAISettings = ({ developerMode = false }) => {
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

    // ============ 雙 API Key 功能 ============
    const [apiKeys2, setApiKeys2] = useState({});          // { providerId: apiKey2Value }
    const [dualKeyEnabled, setDualKeyEnabled] = useState({}); // { providerId: boolean }
    const [showApiKey2, setShowApiKey2] = useState({});    // { providerId: boolean }

    useEffect(() => {
        // 1. 查詢可用的提供者列表
        chrome.runtime.sendMessage({ action: 'getGAIProviders' }, (response) => {
            if (response && response.success) {
                setAvailableProviders(response.providers);
                console.log('[GAISettings] Loaded providers:', response.providers);

                // 2. 載入所有提供者的 API Keys（包含雙 Key 相關資料）
                const storageKeys = response.providers.reduce((acc, provider) => {
                    acc[provider.apiKeyStorageKey] = "";
                    acc[provider.apiKey2StorageKey] = "";             // 新增：第二個 API Key
                    acc[provider.dualKeyEnabledStorageKey] = false;    // 新增：雙 Key 啟用狀態
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
                        const loadedKeys2 = {};             // 新增：第二個 API Key
                        const loadedDualEnabled = {};       // 新增：雙 Key 啟用狀態
                        response.providers.forEach(provider => {
                            loadedKeys[provider.id] = items[provider.apiKeyStorageKey] || "";
                            loadedKeys2[provider.id] = items[provider.apiKey2StorageKey] || "";
                            loadedDualEnabled[provider.id] = items[provider.dualKeyEnabledStorageKey] || false;
                        });
                        setApiKeys(loadedKeys);
                        setApiKeys2(loadedKeys2);           // 新增：設置第二個 API Key
                        setDualKeyEnabled(loadedDualEnabled); // 新增：設置雙 Key 啟用狀態
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
                    {/* 開發者模式專用設定 */}
                    {developerMode && (
                        <>
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
                        </>
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

                                                        // 如果啟用雙 Key，同時儲存 Key2
                                                        if (dualKeyEnabled[currentProvider.id]) {
                                                            saveData[currentProvider.apiKey2StorageKey] = apiKeys2[currentProvider.id] || "";
                                                        }

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

                                            {/* 新增：雙 API Key checkbox */}
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={dualKeyEnabled[currentProvider.id] || false}
                                                        onChange={(e) => {
                                                            const newValue = e.target.checked;
                                                            setDualKeyEnabled(prev => ({ ...prev, [currentProvider.id]: newValue }));
                                                            // 立即儲存到 storage
                                                            chrome.storage.sync.set({
                                                                [currentProvider.dualKeyEnabledStorageKey]: newValue
                                                            });
                                                        }}
                                                        size="small"
                                                    />
                                                }
                                                label="啟用雙 API Key 輪流呼叫"
                                                sx={{ mt: 1 }}
                                            />

                                            {/* 新增：第二個 API Key 輸入欄位（條件顯示）*/}
                                            {dualKeyEnabled[currentProvider.id] && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                                    <TextField
                                                        label={`${currentProvider.name} API Key 2`}
                                                        type={showApiKey2[currentProvider.id] ? "text" : "password"}
                                                        value={apiKeys2[currentProvider.id] || ""}
                                                        onChange={(e) => {
                                                            setApiKeys2(prev => ({ ...prev, [currentProvider.id]: e.target.value }));
                                                            setApiKeySaved(false);
                                                        }}
                                                        fullWidth
                                                        size="small"
                                                        variant="outlined"
                                                        placeholder="第二個 API Key（選填）"
                                                        InputProps={{
                                                            endAdornment: (
                                                                <InputAdornment position="end">
                                                                    <IconButton
                                                                        aria-label="toggle password visibility"
                                                                        onClick={() => setShowApiKey2(prev => ({
                                                                            ...prev,
                                                                            [currentProvider.id]: !prev[currentProvider.id]
                                                                        }))}
                                                                        edge="end"
                                                                    >
                                                                        {showApiKey2[currentProvider.id] ? <VisibilityOff /> : <Visibility />}
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
                                                                [currentProvider.apiKeyStorageKey]: apiKeys[currentProvider.id],
                                                                [currentProvider.apiKey2StorageKey]: apiKeys2[currentProvider.id] || ""
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
                                            )}

                                            {/* 動態顯示提供者說明 */}
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                                {(() => {
                                                    const desc = currentProvider.description || `請輸入您的 ${currentProvider.name} API Key，金鑰僅儲存在您的瀏覽器中。`;
                                                    // 解析 URL 並轉換為可點擊連結
                                                    const urlMatch = desc.match(/(https?:\/\/[^\s]+)/);
                                                    if (urlMatch) {
                                                        const url = urlMatch[1];
                                                        const parts = desc.split(url);
                                                        return (
                                                            <>
                                                                {parts[0]}
                                                                <Link
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    sx={{ wordBreak: 'break-all' }}
                                                                >
                                                                    {url}
                                                                </Link>
                                                                {parts[1]}
                                                            </>
                                                        );
                                                    }
                                                    return desc;
                                                })()}
                                                {dualKeyEnabled[currentProvider.id] && (
                                                    <>
                                                        <br />
                                                        啟用雙 Key 模式後，每次 API 呼叫將自動切換使用不同的 Key。
                                                    </>
                                                )}
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
