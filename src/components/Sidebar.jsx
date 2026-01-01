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
import WarningIcon from '@mui/icons-material/Warning';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import ChatIcon from '@mui/icons-material/Chat';

import { generateSelectiveXML } from '../utils/dataSelector';
import tabTemplateManager from '../services/gai/tabs';
import {
  loadSidebarTabs,
  loadCustomTabConfig,
  loadAutoAnalysisConfig,
  loadQuickButtonsConfig,
  loadChatConfig,
  loadChatHistory,
  saveChatHistory,
  migrateSidebarConfigToV2
} from '../utils/settingsManager';
import * as MuiIcons from '@mui/icons-material';
import TabConfigDialog from './sidebar/TabConfigDialog';

// V2 Components
import Tab1AutoAnalysis from './sidebar/Tab1AutoAnalysis';
import Tab2QuickButtons from './sidebar/Tab2QuickButtons';
import Tab3Chat from './sidebar/Tab3Chat';
import SidebarV2ConfigDialog from './sidebar/SidebarV2ConfigDialog';

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

    // V1 Configuration State (preserved for backward compatibility)
    const [tabConfigs, setTabConfigs] = useState([]);
    const [customTabConfig, setCustomTabConfig] = useState(null);
    const [configDialogOpen, setConfigDialogOpen] = useState(false);

    // V1 Dynamic Analysis State
    const [analysisResults, setAnalysisResults] = useState({});
    const [loadingStates, setLoadingStates] = useState({});
    const [errorStates, setErrorStates] = useState({});

    // V2 Configuration State (3 Tabs)
    const [autoAnalysisConfig, setAutoAnalysisConfig] = useState(null);
    const [quickButtonsConfig, setQuickButtonsConfig] = useState([]);
    const [chatConfig, setChatConfig] = useState(null);

    // V2 Tab 1: Auto Analysis State
    const [autoAnalysisResult, setAutoAnalysisResult] = useState([]);
    const [autoAnalysisLoading, setAutoAnalysisLoading] = useState(false);
    const [autoAnalysisError, setAutoAnalysisError] = useState(null);

    // V2 Tab 2: Quick Buttons State
    const [buttonResults, setButtonResults] = useState({});
    const [buttonLoadings, setButtonLoadings] = useState({});
    const [buttonErrors, setButtonErrors] = useState({});

    // V2 Tab 3: Chat State
    const [chatHistory, setChatHistory] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState(null);
    const [userInput, setUserInput] = useState('');

    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [useV2, setUseV2] = useState(false); // Toggle between V1 and V2
    const isResizingRef = useRef(false);
    const newWidthRef = useRef(width);
    const previousPatientIdRef = useRef(null); // Track previous patient ID for change detection

    // Track if any analysis is running
    const isAnalyzing = Object.values(loadingStates).some(state => state) || autoAnalysisLoading || chatLoading;

    // Load Tab Configurations (V1 + V2)
    useEffect(() => {
        const loadConfigs = async () => {
            try {
                // Execute migration first
                const migrationResult = await migrateSidebarConfigToV2();
                if (migrationResult.migrated) {
                    console.log('[Sidebar] Migrated to V2:', migrationResult);
                    setUseV2(true); // Use V2 after migration
                    setTabValue(0); // Reset to first tab for V2
                }

                // Load V1 configs (for backward compatibility)
                const tabs = await loadSidebarTabs();
                const customConfig = await loadCustomTabConfig();

                console.log('[Sidebar] Loaded V1 tab configs:', tabs);
                console.log('[Sidebar] Loaded V1 custom config:', customConfig);

                setTabConfigs(tabs);
                setCustomTabConfig(customConfig);

                // Initialize V1 dynamic states
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

                // Load V2 configs
                const autoConfig = await loadAutoAnalysisConfig();
                const buttonsConfig = await loadQuickButtonsConfig();
                const chatCfg = await loadChatConfig();
                const history = await loadChatHistory();

                console.log('[Sidebar] Loaded V2 configs:', { autoConfig, buttonsConfig, chatCfg });

                setAutoAnalysisConfig(autoConfig);
                setQuickButtonsConfig(buttonsConfig);
                setChatConfig(chatCfg);
                setChatHistory(history);

                // Initialize V2 button states
                const initialButtonResults = {};
                const initialButtonLoadings = {};
                const initialButtonErrors = {};
                buttonsConfig.forEach(btn => {
                    initialButtonResults[btn.slotIndex] = [];
                    initialButtonLoadings[btn.slotIndex] = false;
                    initialButtonErrors[btn.slotIndex] = null;
                });
                setButtonResults(initialButtonResults);
                setButtonLoadings(initialButtonLoadings);
                setButtonErrors(initialButtonErrors);

                // Check if should use V2 (check if V2 configs exist and are valid)
                const hasV2Configs = autoConfig && buttonsConfig && chatCfg;
                if (hasV2Configs) {
                    setUseV2(true);
                    setTabValue(0); // Reset to first tab for V2
                    console.log('[Sidebar] Using V2 interface');
                }
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

    // V2: Auto Analyze Logic (Tab 1 only)
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

        // Only trigger once when conditions are met
        if (useV2 && open && isDataLoaded && !autoAnalysisLoading && !hasAnalyzed &&
            hasValidData() && autoAnalysisConfig?.enabled) {
            console.log('[Sidebar V2] Auto-analyzing with config:', autoAnalysisConfig);
            runAutoAnalysis();
        }
    }, [useV2, open, isDataLoaded, hasAnalyzed, autoAnalysisConfig?.enabled, autoAnalysisConfig?.templateId]);

    // Helper: Clear chat history
    const clearChatHistory = useCallback(async () => {
        console.log('[Sidebar V2] Clearing chat history');
        setChatHistory([]);
        setChatError(null);
        setUserInput('');
        await saveChatHistory([]);
    }, []);

    // Reset when data reloads
    useEffect(() => {
        if (!isDataLoaded && tabConfigs.length > 0) {
            setHasAnalyzed(false);

            // Reset V1 dynamic states
            const resetResults = {};
            const resetErrors = {};

            tabConfigs.forEach(tab => {
                const key = tab.type === 'custom' ? 'custom' : tab.templateId;
                resetResults[key] = [];
                resetErrors[key] = null;
            });

            setAnalysisResults(resetResults);
            setErrorStates(resetErrors);

            // Reset V2 states
            setAutoAnalysisResult([]);
            setAutoAnalysisError(null);

            // V2: Clear chat history when data reloads
            if (useV2) {
                clearChatHistory();
            }
        }
    }, [isDataLoaded, tabConfigs, useV2, clearChatHistory]);

    // V2: Clear chat history when patient changes (detect via patientSummaryData change)
    useEffect(() => {
        if (!useV2 || !isDataLoaded) return;

        // Get current patient ID
        const currentPatientId = patientData?.patientSummaryData?.[0]?.['病歷號'] ||
                                 patientData?.patientSummaryData?.[0]?.['身分證號'];

        // Check if patient has changed (compare with previous ID)
        if (currentPatientId && previousPatientIdRef.current !== null &&
            previousPatientIdRef.current !== currentPatientId) {
            console.log('[Sidebar V2] Patient changed, clearing chat history');
            clearChatHistory();
        }

        // Update previous patient ID
        if (currentPatientId) {
            previousPatientIdRef.current = currentPatientId;
        }
    }, [patientData?.patientSummaryData, useV2, isDataLoaded, clearChatHistory]);

    // V2: Listen for background events (session changes, local data loaded)
    useEffect(() => {
        if (!useV2) return;

        const handleBackgroundMessage = (message) => {
            // Clear chat history on session change or local data load
            if (message.action === 'userSessionChanged' || message.action === 'localDataLoaded') {
                console.log(`[Sidebar V2] Received ${message.action}, clearing chat history`);
                clearChatHistory();
            }
        };

        chrome.runtime.onMessage.addListener(handleBackgroundMessage);

        return () => {
            chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
        };
    }, [useV2, clearChatHistory]);

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

    // V2: Run auto-analysis (Tab 1)
    const runAutoAnalysis = () => {
        if (!autoAnalysisConfig || !autoAnalysisConfig.enabled) {
            console.log('[Sidebar V2] Auto-analysis disabled');
            return;
        }

        const template = tabTemplateManager.getTemplate(autoAnalysisConfig.templateId);
        if (!template) {
            console.warn('[Sidebar V2] Template not found:', autoAnalysisConfig.templateId);
            setAutoAnalysisError('分析模板未找到');
            return;
        }

        // Generate selective XML
        const xmlData = generateSelectiveXML(patientData, template.dataTypes);

        // Set loading state
        setAutoAnalysisLoading(true);
        setAutoAnalysisError(null);

        console.log(`📤 [Sidebar V2] Running auto-analysis: ${template.name}`);
        console.log(`[Sidebar V2] Data types:`, template.dataTypes);

        // Get provider setting
        chrome.storage.sync.get(['gaiProvider'], (result) => {
            const provider = result.gaiProvider || 'openai';

            // Call GAI via background script (no JSON schema - let AI decide format)
            chrome.runtime.sendMessage({
                action: 'callGAI',
                providerId: provider,
                systemPrompt: template.systemPrompt,
                userPrompt: xmlData,
                jsonSchema: null,
                options: {
                    model: provider === 'openai' ? 'gpt-5-nano' : undefined
                }
            }, (response) => {
                setAutoAnalysisLoading(false);

                if (chrome.runtime.lastError) {
                    setAutoAnalysisError(chrome.runtime.lastError.message);
                } else if (!response || !response.success) {
                    setAutoAnalysisError(response?.error || '未知錯誤');
                } else {
                    try {
                        const content = response.data.choices[0].message.content;

                        // AI can return any format (markdown, plain text, etc.)
                        // Wrap in array for consistent display
                        let resultArray = [content];

                        // Append metrics if available
                        if (response.data.usage) {
                            const totalTokens = response.data.usage.total_tokens || response.data.usage.totalTokenCount || 0;
                            const durationSec = ((response.data.duration || 0) / 1000).toFixed(2);
                            const keyInfo = response.data.keyUsed ? ` [${response.data.keyUsed}]` : '';
                            resultArray.push(`(Total_tokens: ${totalTokens}, 執行時間: ${durationSec}s${keyInfo})`);
                        }

                        setAutoAnalysisResult(resultArray);
                        console.log('[Sidebar V2] Auto-analysis completed:', resultArray);
                    } catch (e) {
                        setAutoAnalysisError('解析錯誤: ' + e.message);
                    }
                }
            });
        });
    };

    // V2: Run button analysis (Tab 2)
    const runButtonAnalysis = (buttonConfig) => {
        if (!buttonConfig) {
            console.warn('[Sidebar V2] Button config is null');
            return;
        }

        const { slotIndex, type, templateId, customConfig } = buttonConfig;

        // Get template (preset or custom)
        let template;
        if (type === 'preset') {
            template = tabTemplateManager.getTemplate(templateId);
            if (!template) {
                console.warn('[Sidebar V2] Preset template not found:', templateId);
                setButtonErrors(prev => ({ ...prev, [slotIndex]: '分析模板未找到' }));
                return;
            }
        } else if (type === 'custom') {
            // For custom buttons, construct template from customConfig
            if (!customConfig) {
                console.warn('[Sidebar V2] Custom config is null for button:', slotIndex);
                setButtonErrors(prev => ({ ...prev, [slotIndex]: '自訂配置未找到' }));
                return;
            }

            template = {
                id: `custom_button_${slotIndex}`,
                name: buttonConfig.label || '自訂按鈕',
                dataTypes: customConfig.dataTypes || [],
                systemPrompt: customConfig.systemPrompt || ''
            };
        } else {
            console.warn('[Sidebar V2] Unknown button type:', type);
            setButtonErrors(prev => ({ ...prev, [slotIndex]: '未知的按鈕類型' }));
            return;
        }

        // Generate selective XML
        const xmlData = generateSelectiveXML(patientData, template.dataTypes);

        // Set loading state
        setButtonLoadings(prev => ({ ...prev, [slotIndex]: true }));
        setButtonErrors(prev => ({ ...prev, [slotIndex]: null }));

        console.log(`📤 [Sidebar V2] Running button analysis (slot ${slotIndex}): ${template.name}`);
        console.log(`[Sidebar V2] Data types:`, template.dataTypes);

        // Get provider setting
        chrome.storage.sync.get(['gaiProvider'], (result) => {
            const provider = result.gaiProvider || 'openai';

            // Call GAI via background script (no JSON schema - let AI decide format)
            chrome.runtime.sendMessage({
                action: 'callGAI',
                providerId: provider,
                systemPrompt: template.systemPrompt,
                userPrompt: xmlData,
                jsonSchema: null,
                options: {
                    model: provider === 'openai' ? 'gpt-5-nano' : undefined
                }
            }, (response) => {
                setButtonLoadings(prev => ({ ...prev, [slotIndex]: false }));

                if (chrome.runtime.lastError) {
                    setButtonErrors(prev => ({ ...prev, [slotIndex]: chrome.runtime.lastError.message }));
                } else if (!response || !response.success) {
                    setButtonErrors(prev => ({ ...prev, [slotIndex]: response?.error || '未知錯誤' }));
                } else {
                    try {
                        const content = response.data.choices[0].message.content;

                        // AI can return any format (markdown, plain text, etc.)
                        // Wrap in array for consistent display
                        let resultArray = [content];

                        // Append metrics if available
                        if (response.data.usage) {
                            const totalTokens = response.data.usage.total_tokens || response.data.usage.totalTokenCount || 0;
                            const durationSec = ((response.data.duration || 0) / 1000).toFixed(2);
                            const keyInfo = response.data.keyUsed ? ` [${response.data.keyUsed}]` : '';
                            resultArray.push(`(Total_tokens: ${totalTokens}, 執行時間: ${durationSec}s${keyInfo})`);
                        }

                        setButtonResults(prev => ({ ...prev, [slotIndex]: resultArray }));
                        console.log(`[Sidebar V2] Button analysis completed (slot ${slotIndex}):`, resultArray);
                    } catch (e) {
                        setButtonErrors(prev => ({ ...prev, [slotIndex]: '解析錯誤: ' + e.message }));
                    }
                }
            });
        });
    };

    // V2: Send chat message (Tab 3)
    const sendChatMessage = async (message) => {
        if (!message || !message.trim()) return;

        // Add user message to history
        const userMessage = {
            role: 'user',
            content: message.trim(),
            timestamp: new Date().toISOString()
        };

        const newHistory = [...chatHistory, userMessage];
        setChatHistory(newHistory);
        setUserInput(''); // Clear input
        setChatLoading(true);
        setChatError(null);

        // Generate XML with all 9 data types
        const allDataTypes = ['patientSummary', 'allergy', 'surgery', 'discharge', 'hbcv', 'medication', 'lab', 'chineseMed', 'imaging'];
        const xmlData = generateSelectiveXML(patientData, allDataTypes);

        // Build multi-turn conversation prompt
        let conversationPrompt = xmlData + '\n\n';

        // Add conversation history
        if (newHistory.length > 0) {
            conversationPrompt += '對話歷史：\n';
            newHistory.forEach(msg => {
                conversationPrompt += `${msg.role === 'user' ? '使用者' : 'AI'}：${msg.content}\n`;
            });
        }

        console.log('[Sidebar V2] Sending chat message');

        // Get provider setting
        chrome.storage.sync.get(['gaiProvider'], (result) => {
            const provider = result.gaiProvider || 'openai';

            // Call GAI via background script (without JSON schema for free-form chat)
            chrome.runtime.sendMessage({
                action: 'callGAI',
                providerId: provider,
                systemPrompt: chatConfig?.systemPrompt || '你是專業的醫療AI助理。',
                userPrompt: conversationPrompt,
                jsonSchema: null, // No schema for chat
                options: {
                    model: provider === 'openai' ? 'gpt-5-nano' : undefined
                }
            }, async (response) => {
                setChatLoading(false);

                if (chrome.runtime.lastError) {
                    setChatError(chrome.runtime.lastError.message);
                } else if (!response || !response.success) {
                    setChatError(response?.error || '未知錯誤');
                } else {
                    try {
                        const content = response.data.choices[0].message.content;

                        // Create assistant message
                        const assistantMessage = {
                            role: 'assistant',
                            content: content,
                            timestamp: new Date().toISOString(),
                            metadata: {
                                tokens: response.data.usage?.total_tokens || response.data.usage?.totalTokenCount || 0,
                                duration: ((response.data.duration || 0) / 1000).toFixed(2)
                            }
                        };

                        const updatedHistory = [...newHistory, assistantMessage];
                        setChatHistory(updatedHistory);

                        // Save to chrome.storage.local
                        await saveChatHistory(updatedHistory);

                        console.log('[Sidebar V2] Chat message completed');
                    } catch (e) {
                        setChatError('解析錯誤: ' + e.message);
                    }
                }
            });
        });
    };

    // V2: Handle chat quick question (Tab 3)
    const handleChatQuickQuestion = (question) => {
        // For chat, quick questions are sent directly as user messages
        sendChatMessage(question);
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
        console.log('[Sidebar] Tab changed to:', newValue, 'useV2:', useV2);
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

    // V2: Handle config dialog save
    const handleV2ConfigSaved = (newConfigs) => {
        console.log('[Sidebar V2] Config saved, updating state...');

        // Update V2 state with new configs
        setAutoAnalysisConfig(newConfigs.autoAnalysisConfig);
        setQuickButtonsConfig(newConfigs.quickButtonsConfig);
        setChatConfig(newConfigs.chatConfig);

        // Close dialog
        setConfigDialogOpen(false);

        // Reset analysis flag to trigger re-analysis if auto-analysis is enabled
        if (newConfigs.autoAnalysisConfig?.enabled) {
            setHasAnalyzed(false);
        }
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

                {/* Tabs - Dynamic Rendering (V1) or Fixed Rendering (V2) */}
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        minHeight: 48,
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    {useV2 ? (
                        // V2: 3 Fixed Tabs
                        <>
                            <Tab
                                value={0}
                                icon={<WarningIcon fontSize="small" />}
                                label="自動分析"
                                onClick={() => {
                                    console.log('[Tab] Direct onClick triggered for Tab 0');
                                    handleTabChange(null, 0);
                                }}
                                sx={{ minWidth: 0, p: 1, fontSize: '0.8rem', pointerEvents: 'auto', cursor: 'pointer' }}
                            />
                            <Tab
                                value={1}
                                icon={<TouchAppIcon fontSize="small" />}
                                label="快速按鈕"
                                onClick={() => {
                                    console.log('[Tab] Direct onClick triggered for Tab 1');
                                    handleTabChange(null, 1);
                                }}
                                sx={{ minWidth: 0, p: 1, fontSize: '0.8rem', pointerEvents: 'auto', cursor: 'pointer' }}
                            />
                            <Tab
                                value={2}
                                icon={<ChatIcon fontSize="small" />}
                                label="對話"
                                onClick={() => {
                                    console.log('[Tab] Direct onClick triggered for Tab 2');
                                    handleTabChange(null, 2);
                                }}
                                sx={{ minWidth: 0, p: 1, fontSize: '0.8rem', pointerEvents: 'auto', cursor: 'pointer' }}
                            />
                        </>
                    ) : (
                        // V1: 4 Dynamic Tabs
                        tabConfigs && tabConfigs.length > 0 ? tabConfigs.map((tabConfig, index) => {
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
                        )
                    )}
                </Tabs>

                {/* Content Area - Scrollable with Dynamic Tab Content (V1) or Fixed Tab Content (V2) */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f8f9fa' }}>
                    {useV2 ? (
                        // V2: 3 Fixed Tab Content
                        <>
                            {console.log('[Sidebar] Rendering V2 content, tabValue:', tabValue)}
                            {tabValue === 0 && (
                                <Tab1AutoAnalysis
                                    config={autoAnalysisConfig}
                                    result={autoAnalysisResult}
                                    loading={autoAnalysisLoading}
                                    error={autoAnalysisError}
                                    onRetry={runAutoAnalysis}
                                />
                            )}
                            {tabValue === 1 && (
                                <Tab2QuickButtons
                                    buttons={quickButtonsConfig}
                                    results={buttonResults}
                                    loadings={buttonLoadings}
                                    errors={buttonErrors}
                                    onButtonClick={runButtonAnalysis}
                                />
                            )}
                            {tabValue === 2 && (
                                <Tab3Chat
                                    config={chatConfig}
                                    history={chatHistory}
                                    loading={chatLoading}
                                    error={chatError}
                                    userInput={userInput}
                                    onInputChange={setUserInput}
                                    onSendMessage={sendChatMessage}
                                    onQuickQuestion={handleChatQuickQuestion}
                                />
                            )}
                        </>
                    ) : (
                        // V1: 4 Dynamic Tab Content
                        tabConfigs && tabConfigs.length > 0 ? tabConfigs.map((tabConfig, index) => {
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
                        )
                    )}
                </Box>
            </Paper>

            {/* Tab Configuration Dialog - V1 or V2 */}
            {useV2 ? (
                <SidebarV2ConfigDialog
                    open={configDialogOpen}
                    onClose={() => setConfigDialogOpen(false)}
                    autoAnalysisConfig={autoAnalysisConfig}
                    quickButtonsConfig={quickButtonsConfig}
                    chatConfig={chatConfig}
                    onConfigSaved={handleV2ConfigSaved}
                />
            ) : (
                <TabConfigDialog
                    open={configDialogOpen}
                    onClose={() => setConfigDialogOpen(false)}
                    currentTabs={tabConfigs}
                    onConfigSaved={handleConfigSaved}
                    onEditCustomTab={handleEditCustomTab}
                />
            )}
        </>
    );
};

export default Sidebar;
