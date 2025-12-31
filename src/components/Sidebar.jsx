import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Fab,
    Tooltip,
    Tabs,
    Tab,
    CircularProgress,
    Badge
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';

import { generateSelectiveXML } from '../utils/dataSelector';
import tabTemplateManager from '../services/gai/tabs';
import { loadSidebarTabs, loadCustomTabConfig } from '../utils/settingsManager';
import * as MuiIcons from '@mui/icons-material';
import TabConfigDialog from './sidebar/TabConfigDialog';

const Sidebar = ({
    open,
    onClose,
    width = 350,
    setWidth,
    isCollapsed = false,
    setIsCollapsed,
    patientData = {},
    isDataLoaded = false
}) => {
    // UI State
    const [isResizing, setIsResizing] = useState(false);
    const [tabValue, setTabValue] = useState(0);

    // Tab Configuration State
    const [tabConfigs, setTabConfigs] = useState([]);
    const [customTabConfig, setCustomTabConfig] = useState(null);
    const [configDialogOpen, setConfigDialogOpen] = useState(false);

    // Dynamic Analysis State (using Maps for flexibility)
    const [analysisResults, setAnalysisResults] = useState({});
    const [loadingStates, setLoadingStates] = useState({});
    const [errorStates, setErrorStates] = useState({});

    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const isResizingRef = useRef(false);
    const newWidthRef = useRef(width);

    // Track if any analysis is running
    const isAnalyzing = Object.values(loadingStates).some(state => state);

    // Load Tab Configurations
    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const tabs = await loadSidebarTabs();
                const customConfig = await loadCustomTabConfig();

                console.log('[Sidebar] Loaded tab configs:', tabs);
                console.log('[Sidebar] Loaded custom config:', customConfig);

                setTabConfigs(tabs);
                setCustomTabConfig(customConfig);

                // Initialize dynamic states based on loaded tabs
                const initialResults = {};
                const initialLoadingStates = {};
                const initialErrorStates = {};

                tabs.forEach(tab => {
                    const key = tab.type === 'custom' ? 'custom' : tab.templateId;
                    initialResults[key] = [];
                    initialLoadingStates[key] = false;
                    initialErrorStates[key] = null;
                });

                setAnalysisResults(initialResults);
                setLoadingStates(initialLoadingStates);
                setErrorStates(initialErrorStates);
            } catch (error) {
                console.error('[Sidebar] Failed to load tab configs:', error);
            }
        };

        loadConfigs();
    }, []);

    // Auto Analyze Logic
    useEffect(() => {
        const hasValidData = () => {
            if (!patientData) return false;
            return (
                (patientData.groupedMedications && patientData.groupedMedications.length > 0) ||
                (patientData.groupedLabs && patientData.groupedLabs.length > 0) ||
                (patientData.patientSummaryData && patientData.patientSummaryData.length > 0) ||
                (patientData.allergyData && patientData.allergyData.length > 0) ||
                (patientData.surgeryData && patientData.surgeryData.length > 0) ||
                (patientData.dischargeData && patientData.dischargeData.length > 0) ||
                (patientData.imagingData && (patientData.imagingData.withReport?.length > 0 || patientData.imagingData.withoutReport?.length > 0)) ||
                (patientData.hbcvData && Object.keys(patientData.hbcvData).length > 0)
            );
        };

        if (open && isDataLoaded && !isAnalyzing && !hasAnalyzed && hasValidData()) {
            console.log('Sidebar: Auto-analyzing valid patient data...');
            handleAnalyze();
        }
    }, [open, isDataLoaded, hasAnalyzed, patientData]);

    // Reset when data reloads
    useEffect(() => {
        if (!isDataLoaded && tabConfigs.length > 0) {
            setHasAnalyzed(false);

            // Reset dynamic states based on current tab configs
            const resetResults = {};
            const resetErrors = {};

            tabConfigs.forEach(tab => {
                const key = tab.type === 'custom' ? 'custom' : tab.templateId;
                resetResults[key] = [];
                resetErrors[key] = null;
            });

            setAnalysisResults(resetResults);
            setErrorStates(resetErrors);
        }
    }, [isDataLoaded, tabConfigs]);

    // Helper: Get template for a tab config
    const getTemplate = (tabConfig) => {
        if (tabConfig.type === 'custom') {
            return customTabConfig;
        } else {
            return tabTemplateManager.getTemplate(tabConfig.templateId);
        }
    };

    // Helper: Get icon component from icon name
    const getIconComponent = (iconName) => {
        return MuiIcons[iconName] || MuiIcons.Star;
    };

    // Handle quick question (replacement style)
    const handleQuickQuestion = (question, template) => {
        console.log(`[Sidebar] Quick question clicked: "${question}"`);

        // Create modified template with question as system prompt (replacement style)
        const modifiedTemplate = {
            ...template,
            systemPrompt: question  // Replace system prompt with the question
        };

        // Generate XML with same data types
        const xmlData = generateSelectiveXML(patientData, template.dataTypes);

        // Run analysis with modified template
        chrome.storage.sync.get(['gaiProvider'], (result) => {
            const provider = result.gaiProvider || 'openai';
            runAnalysisForKey('custom', modifiedTemplate, xmlData, provider);
        });
    };

    const handleAnalyze = () => {
        if (tabConfigs.length === 0) {
            console.warn('[Sidebar] Tab configs not loaded yet');
            return;
        }

        setHasAnalyzed(true);

        // 讀取使用者選擇的 AI 提供者
        chrome.storage.sync.get(['gaiProvider'], (result) => {
            const provider = result.gaiProvider || 'openai';

            // 遍歷所有配置的 tab，執行分析
            tabConfigs.forEach(tabConfig => {
                const template = getTemplate(tabConfig);
                if (!template) {
                    console.warn(`[Sidebar] Template not found for tab:`, tabConfig);
                    return;
                }

                // 使用 dataSelector 生成選擇性 XML
                const xmlData = generateSelectiveXML(patientData, template.dataTypes);

                // 確定分析結果的 key
                const analysisKey = tabConfig.type === 'custom' ? 'custom' : tabConfig.templateId;

                // 執行分析
                runAnalysisForKey(analysisKey, template, xmlData, provider);
            });
        });
    };

    const runAnalysisForKey = (key, template, xmlData, provider = 'openai') => {
        // 更新載入狀態
        setLoadingStates(prev => ({ ...prev, [key]: true }));
        setErrorStates(prev => ({ ...prev, [key]: null }));

        console.log(`📤 [Sidebar] Sending callGAI request for ${key} (${template.name}) using provider: ${provider}`);
        console.log(`[Sidebar] Data types for this analysis:`, template.dataTypes);

        // 呼叫 background script 執行 AI 分析
        // 使用新的統一 callGAI handler，支援所有已註冊的 Provider
        chrome.runtime.sendMessage({
            action: 'callGAI',
            providerId: provider,
            systemPrompt: template.systemPrompt,
            userPrompt: xmlData,
            jsonSchema: template.schema,
            options: {
                model: provider === 'openai' ? 'gpt-5-nano' : undefined
            }
        }, (response) => {
            setLoadingStates(prev => ({ ...prev, [key]: false }));

            if (chrome.runtime.lastError) {
                setErrorStates(prev => ({ ...prev, [key]: chrome.runtime.lastError.message }));
            } else if (!response || !response.success) {
                setErrorStates(prev => ({ ...prev, [key]: response?.error || "Unknown error" }));
            } else {
                console.log(`[GAI Analysis - ${key}] Response:`, response.data);
                try {
                    const content = response.data.choices[0].message.content;
                    const parsed = JSON.parse(content);

                    setAnalysisResults(prev => {
                        // Merge results and append metrics if available
                        const mergedResults = { ...prev, ...parsed };

                        // Append metrics to the specific key's array if usage/duration data exists
                        if (mergedResults[key] && Array.isArray(mergedResults[key]) && response.data.usage) {
                            const totalTokens = response.data.usage.total_tokens || response.data.usage.totalTokenCount || 0;
                            const durationSec = ((response.data.duration || 0) / 1000).toFixed(2);
                            const keyInfo = response.data.keyUsed ? ` [${response.data.keyUsed}]` : '';
                            mergedResults[key].push(`(Total_tokens: ${totalTokens}, 執行時間: ${durationSec}s${keyInfo})`);
                        }

                        return mergedResults;
                    });
                } catch (e) {
                    setErrorStates(prev => ({ ...prev, [key]: "Parse error: " + e.message }));
                }
            }
        });
    };

    const handleTabChange = (_event, newValue) => {
        setTabValue(newValue);
    };

    // Body margin handling
    useEffect(() => {
        if (open && !isCollapsed) {
            document.body.style.transition = 'margin-right 0.3s ease-in-out';
            document.body.style.marginRight = `${width}px`;
        } else {
            document.body.style.marginRight = '0px';
        }
        return () => { document.body.style.marginRight = '0px'; };
    }, [open, isCollapsed, width]);

    // Resizing logic
    const handleMouseMove = useCallback((e) => {
        if (!isResizingRef.current) return;
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 250 && newWidth < 800) {
            setWidth(newWidth);
        }
    }, [setWidth]);

    const stopResizing = useCallback(() => {
        isResizingRef.current = false;
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        chrome.storage.local.set({ gaiSidebarWidth: newWidthRef.current });
    }, [handleMouseMove]);

    useEffect(() => { newWidthRef.current = width; }, [width]);

    const startResizing = useCallback((e) => {
        isResizingRef.current = true;
        setIsResizing(true);
        e.preventDefault();
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'w-resize';
        document.body.style.userSelect = 'none'; // 拖曳時禁用文字選取
    }, [handleMouseMove, stopResizing]);

    const handleCollapse = () => setIsCollapsed(true);
    const handleRestore = () => setIsCollapsed(false);

    // Handle config dialog save
    const handleConfigSaved = async (_newTabs) => {
        console.log('[Sidebar] Tab config saved, reloading...');

        // Reload configurations
        const tabs = await loadSidebarTabs();
        const customConfig = await loadCustomTabConfig();

        setTabConfigs(tabs);
        setCustomTabConfig(customConfig);

        // Reinitialize states
        const initialResults = {};
        const initialLoadingStates = {};
        const initialErrorStates = {};

        tabs.forEach(tab => {
            const key = tab.type === 'custom' ? 'custom' : tab.templateId;
            initialResults[key] = [];
            initialLoadingStates[key] = false;
            initialErrorStates[key] = null;
        });

        setAnalysisResults(initialResults);
        setLoadingStates(initialLoadingStates);
        setErrorStates(initialErrorStates);

        // Reset analysis flag to trigger re-analysis
        setHasAnalyzed(false);
    };

    // Handle edit custom tab (Stage 4 - placeholder for now)
    const handleEditCustomTab = () => {
        console.log('[Sidebar] Edit custom tab clicked - Stage 4 feature');
        // TODO: Open CustomTabEditor dialog in Stage 4
        alert('自訂 Tab 編輯器功能將在階段 4 實作');
        setConfigDialogOpen(false);
    };

    if (!open) return null;

    if (isCollapsed) {
        return (
            <Fab
                color="primary"
                onClick={handleRestore}
                sx={{ position: 'fixed', top: 80, right: 20, zIndex: 2147483647 }}
            >
                <SmartToyIcon />
            </Fab>
        );
    }

    // Helper to render content list
    const renderContentList = (dataKey, color, emptyMsg) => {
        const isLoading = loadingStates[dataKey];
        const error = errorStates[dataKey];
        const items = analysisResults[dataKey] || [];

        if (isLoading) {
            return (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
                    <CircularProgress size={30} color={color} />
                    <Typography variant="body2" color="text.secondary">正在分析...</Typography>
                </Box>
            );
        }

        if (error) {
            return (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff3e0', borderColor: '#ffcc80' }}>
                    <Typography color="error" variant="caption">{error}</Typography>
                    <IconButton size="small" onClick={() => {
                        // Find the corresponding tab config
                        const tabConfig = tabConfigs.find(tc => {
                            const key = tc.type === 'custom' ? 'custom' : tc.templateId;
                            return key === dataKey;
                        });

                        if (tabConfig) {
                            const template = getTemplate(tabConfig);
                            const xmlData = generateSelectiveXML(patientData, template.dataTypes);

                            chrome.storage.sync.get(['gaiProvider'], (result) => {
                                runAnalysisForKey(dataKey, template, xmlData, result.gaiProvider || 'openai');
                            });
                        }
                    }}>
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                </Paper>
            );
        }

        if (items.length === 0) {
            return (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary', opacity: 0.7 }}>
                    <Typography variant="body2">{emptyMsg}</Typography>
                </Box>
            );
        }

        return (
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {items.map((item, index) => (
                    <Box component="li" key={index} sx={{ mb: 1.5 }}>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{item}</Typography>
                    </Box>
                ))}
            </Box>
        );
    };

    return (
        <>
            {/* Resize Handle */}
            <Box
                onMouseDown={startResizing}
                sx={{
                    position: 'fixed',
                    top: 0,
                    right: width,
                    width: '5px',
                    height: '100vh',
                    zIndex: 2147483648,
                    cursor: 'ew-resize',
                    backgroundColor: 'rgba(25, 118, 210, 0.2)',
                    userSelect: 'none',
                    pointerEvents: 'auto',
                    '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.4)',
                        width: '8px'
                    }
                }}
            />

            <Paper
                elevation={4}
                sx={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: width,
                    height: '100vh',
                    zIndex: 2147483647,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#ffffff',
                    borderLeft: '1px solid #e0e0e0',
                    transition: isResizing ? 'none' : 'width 0.1s ease-out, transform 0.3s ease-in-out',
                    userSelect: isResizing ? 'none' : 'text',
                    pointerEvents: 'auto'
                }}
            >
                {/* Header */}
                <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SmartToyIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight="bold">GAI 助手</Typography>
                    </Box>
                    <Box>
                        <Tooltip title="設定分析項目">
                            <IconButton onClick={() => setConfigDialogOpen(true)} size="small">
                                <SettingsIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="全部重新分析">
                            <IconButton onClick={handleAnalyze} size="small" disabled={isAnalyzing}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="縮小">
                            <IconButton onClick={handleCollapse} size="small">
                                <KeyboardDoubleArrowRightIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Tabs - Dynamic Rendering */}
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
                >
                    {tabConfigs && tabConfigs.length > 0 ? tabConfigs.map((tabConfig, index) => {
                        const template = getTemplate(tabConfig);
                        if (!template) return null;

                        const IconComponent = getIconComponent(template.icon);
                        const resultKey = tabConfig.type === 'custom' ? 'custom' : tabConfig.templateId;
                        const hasResults = (analysisResults[resultKey] || []).length > 0;

                        // Determine badge color based on template category
                        const badgeColor = template.category === 'basic' ? 'error' :
                                         template.category === 'specialized' ? 'warning' : 'info';

                        return (
                            <Tab
                                key={index}
                                icon={
                                    <Badge color={badgeColor} variant="dot" invisible={!hasResults}>
                                        <IconComponent fontSize="small" />
                                    </Badge>
                                }
                                label={template.name.length > 4 ? template.name.substring(0, 4) : template.name}
                                sx={{ minWidth: 0, p: 1, fontSize: '0.8rem' }}
                            />
                        );
                    }) : (
                        <Tab icon={<CircularProgress size={20} />} label="載入中..." disabled />
                    )}
                </Tabs>

                {/* Content Area - Scrollable with Dynamic Tab Content */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f8f9fa' }}>
                    {tabConfigs && tabConfigs.length > 0 ? tabConfigs.map((tabConfig, index) => {
                        if (tabValue !== index) return null;

                        const template = getTemplate(tabConfig);
                        if (!template) return null;

                        const IconComponent = getIconComponent(template.icon);
                        const resultKey = tabConfig.type === 'custom' ? 'custom' : tabConfig.templateId;

                        // Determine color based on category
                        const headerColor = template.category === 'basic' ? 'error.main' :
                                          template.category === 'specialized' ? 'warning.dark' : 'info.main';
                        const listColor = template.category === 'basic' ? 'error' :
                                        template.category === 'specialized' ? 'warning' : 'info';

                        return (
                            <Box key={index}>
                                {/* Tab Header */}
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: headerColor }}>
                                    <IconComponent sx={{ mr: 1 }} />
                                    <Typography variant="subtitle2" fontWeight="bold">{template.name}</Typography>
                                </Box>

                                {/* Quick Questions for Custom Tab */}
                                {tabConfig.type === 'custom' && customTabConfig?.quickQuestions && customTabConfig.quickQuestions.length > 0 && (
                                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {customTabConfig.quickQuestions.map((question, qIndex) => (
                                            <Box
                                                key={qIndex}
                                                component="button"
                                                onClick={() => handleQuickQuestion(question, template)}
                                                sx={{
                                                    px: 1.5,
                                                    py: 0.5,
                                                    fontSize: '0.75rem',
                                                    borderRadius: 1,
                                                    border: '1px solid #1976d2',
                                                    bgcolor: '#e3f2fd',
                                                    color: '#1976d2',
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        bgcolor: '#bbdefb'
                                                    },
                                                    transition: 'background-color 0.2s'
                                                }}
                                            >
                                                {question}
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                {/* Content List */}
                                {renderContentList(resultKey, listColor, `無${template.name}項目`)}
                            </Box>
                        );
                    }) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
                            <CircularProgress size={40} />
                            <Typography variant="body2" color="text.secondary">正在載入配置...</Typography>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Tab Configuration Dialog */}
            <TabConfigDialog
                open={configDialogOpen}
                onClose={() => setConfigDialogOpen(false)}
                currentTabs={tabConfigs}
                onConfigSaved={handleConfigSaved}
                onEditCustomTab={handleEditCustomTab}
            />
        </>
    );
};

export default Sidebar;
