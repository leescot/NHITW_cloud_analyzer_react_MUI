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
    Chip
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import WarningIcon from '@mui/icons-material/Warning';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import ChatIcon from '@mui/icons-material/Chat';

import { generateSelectiveXML } from '../utils/dataSelector';
import tabTemplateManager from '../services/gai/tabs';
import {
    loadAutoAnalysisConfig,
    loadQuickButtonsConfig,
    loadChatConfig,
    loadChatHistory,
    saveChatHistory,
    migrateSidebarConfigToV2
} from '../utils/settingsManager';

// V2 Components
import Tab1AutoAnalysis from './sidebar/Tab1AutoAnalysis';
import Tab2QuickButtons from './sidebar/Tab2QuickButtons';
import Tab3Chat from './sidebar/Tab3Chat';
import SidebarV2ConfigDialog from './sidebar/SidebarV2ConfigDialog';

const Sidebar = ({
    open,
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
    const [configDialogOpen, setConfigDialogOpen] = useState(false);

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
    const isResizingRef = useRef(false);
    const newWidthRef = useRef(width);
    const previousPatientIdRef = useRef(null); // Track previous patient ID for change detection

    // Load V2 Tab Configurations
    useEffect(() => {
        const loadConfigs = async () => {
            try {
                // Execute migration first (converts V1 to V2 if needed)
                const migrationResult = await migrateSidebarConfigToV2();
                if (migrationResult.migrated) {
                    console.log('[Sidebar V2] Migrated from V1:', migrationResult);
                }

                // Load V2 configs
                const autoConfig = await loadAutoAnalysisConfig();
                const buttonsConfig = await loadQuickButtonsConfig();
                const chatCfg = await loadChatConfig();
                const history = await loadChatHistory();

                console.log('[Sidebar V2] Loaded configs:', { autoConfig, buttonsConfig, chatCfg });

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
            } catch (error) {
                console.error('[Sidebar V2] Failed to load configs:', error);
            }
        };

        loadConfigs();
    }, []);

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
        if (open && isDataLoaded && !autoAnalysisLoading && !hasAnalyzed &&
            hasValidData() && autoAnalysisConfig?.enabled) {
            console.log('[Sidebar V2] Auto-analyzing with config:', autoAnalysisConfig);
            runAutoAnalysis();
        }
    }, [open, isDataLoaded, hasAnalyzed, autoAnalysisConfig?.enabled, autoAnalysisConfig?.templateId]);

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
        if (!isDataLoaded) {
            setHasAnalyzed(false);
            setAutoAnalysisResult([]);
            setAutoAnalysisError(null);
            clearChatHistory();
        }
    }, [isDataLoaded, clearChatHistory]);

    // Clear chat history when patient changes (detect via patientSummaryData change)
    useEffect(() => {
        if (!isDataLoaded) return;

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
    }, [patientData?.patientSummaryData, isDataLoaded, clearChatHistory]);

    // Listen for background events (session changes, local data loaded)
    useEffect(() => {
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
    }, [clearChatHistory]);

    // Helper: Clean markdown formatting issues from AI response
    const cleanMarkdownContent = (content) => {
        if (!content) return content;
        return content
            .replace(/\s+$/gm, '')                              // Remove trailing spaces
            .replace(/\n{3,}/g, '\n\n')                         // Compress 3+ consecutive newlines to 2
            .replace(/^(\s*[-*+]\s+.+)\n+(?=\s*[-*+])/gm, '$1\n')  // Remove extra blank lines between list items
            .replace(/(^\s*\|.*)\n\s*\n(?=\s*\|)/gm, '$1\n')    // Remove blank lines inside tables
            .replace(/^([^|\n\s].*)\n(\s*\|)/gm, '$1\n\n$2')    // Ensure blank line before table
            .replace(/^(\s*\|.*)\n([^|\n\s].*)/gm, '$1\n\n$2')  // Ensure blank line after table
            .replace(/<think>[\s\S]*?<\/think>/g, '');          // Remove thinking/reasoning tags if mixed in content
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
                        const rawMessage = response.data.choices[0].message;
                        const rawContent = rawMessage.content || '';
                        const content = cleanMarkdownContent(rawContent);
                        const isTruncated = response.data.choices[0].finish_reason === 'length';

                        // AI can return any format (markdown, plain text, etc.)
                        // Wrap in array for consistent display
                        let resultArray = [content];

                        // If truncated, add a warning
                        if (isTruncated) {
                            resultArray.push('⚠️ [警告：此分析因超過 Token 限制而被截斷，結果可能不完整。建議嘗試更精簡的模板或減少資料量。]');
                        }

                        // Append metrics if available
                        if (response.data.usage) {
                            const totalTokens = response.data.usage.total_tokens || response.data.usage.totalTokenCount || 0;
                            const durationSec = ((response.data.duration || 0) / 1000).toFixed(1);
                            const keyInfo = response.data.keyUsed ? `/${response.data.keyUsed}` : '';
                            resultArray.push(`[STATS]${totalTokens}tokens/${durationSec}s${keyInfo}`);
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
                        const rawMessage = response.data.choices[0].message;
                        const rawContent = rawMessage.content || '';
                        const content = cleanMarkdownContent(rawContent);
                        const isTruncated = response.data.choices[0].finish_reason === 'length';

                        // AI can return any format (markdown, plain text, etc.)
                        // Wrap in array for consistent display
                        let resultArray = [content];

                        // If truncated, add a warning
                        if (isTruncated) {
                            resultArray.push('⚠️ [警告：此分析因超過 Token 限制而被截斷，結果可能不完整。]');
                        }

                        // Append metrics if available
                        if (response.data.usage) {
                            const totalTokens = response.data.usage.total_tokens || response.data.usage.totalTokenCount || 0;
                            const durationSec = ((response.data.duration || 0) / 1000).toFixed(1);
                            const keyInfo = response.data.keyUsed ? `/${response.data.keyUsed}` : '';
                            resultArray.push(`[STATS]${totalTokens}tokens/${durationSec}s${keyInfo}`);
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

        // Generate XML with all 10 data types
        const allDataTypes = ['patientSummary', 'diagnosis', 'allergy', 'surgery', 'discharge', 'hbcvdata', 'medication', 'lab', 'chinesemed', 'imaging'];
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
                        const rawMessage = response.data.choices[0].message;
                        const rawContent = rawMessage.content || '';
                        const content = cleanMarkdownContent(rawContent);
                        const isTruncated = response.data.choices[0].finish_reason === 'length';

                        // Create assistant message
                        const assistantMessage = {
                            role: 'assistant',
                            content: isTruncated ? content + '\n\n⚠️ [警告：此對話內容因超過 Token 限制而被截斷。]' : content,
                            timestamp: new Date().toISOString(),
                            metadata: {
                                tokens: response.data.usage?.total_tokens || response.data.usage?.totalTokenCount || 0,
                                duration: ((response.data.duration || 0) / 1000).toFixed(1),
                                keyUsed: response.data.keyUsed || ''
                            }
                        };

                        const updatedHistory = [...newHistory, assistantMessage];

                        // Apply history length limit (rounds * 2)
                        let prunedHistory = updatedHistory;
                        const maxRounds = chatConfig?.maxHistoryLength || 5;
                        if (prunedHistory.length > maxRounds * 2) {
                            prunedHistory = prunedHistory.slice(prunedHistory.length - maxRounds * 2);
                        }

                        setChatHistory(prunedHistory);

                        // Save to chrome.storage.local
                        await saveChatHistory(prunedHistory);

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

    const handleTabChange = (_event, newValue) => {
        console.log('[Sidebar V2] Tab changed to:', newValue);
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
                        <Chip label="BETA" size="small" sx={{ height: 16, fontSize: '0.65rem', fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }} />
                    </Box>
                    <Box>
                        <Tooltip title="設定分析項目">
                            <IconButton onClick={() => setConfigDialogOpen(true)} size="small">
                                <SettingsIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="縮小">
                            <IconButton onClick={handleCollapse} size="small">
                                <KeyboardDoubleArrowRightIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Tabs - V2 Fixed 3 Tabs */}
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        minHeight: 40,
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 1,
                        '& .MuiTab-root': {
                            minHeight: 40,
                            py: 0.5,
                            fontSize: '0.85rem',
                            flexDirection: 'row',
                            gap: 0.5
                        }
                    }}
                >
                    <Tab
                        value={0}
                        icon={<WarningIcon sx={{ fontSize: '1rem !important' }} />}
                        label="自動"
                        iconPosition="start"
                        onClick={() => {
                            console.log('[Tab] Direct onClick triggered for Tab 0');
                            handleTabChange(null, 0);
                        }}
                        sx={{ minWidth: 0, p: 0.5, pointerEvents: 'auto', cursor: 'pointer' }}
                    />
                    <Tab
                        value={1}
                        icon={<TouchAppIcon sx={{ fontSize: '1rem !important' }} />}
                        label="快速"
                        iconPosition="start"
                        onClick={() => {
                            console.log('[Tab] Direct onClick triggered for Tab 1');
                            handleTabChange(null, 1);
                        }}
                        sx={{ minWidth: 0, p: 0.5, pointerEvents: 'auto', cursor: 'pointer' }}
                    />
                    <Tab
                        value={2}
                        icon={<ChatIcon sx={{ fontSize: '1rem !important' }} />}
                        label="對話"
                        iconPosition="start"
                        onClick={() => {
                            console.log('[Tab] Direct onClick triggered for Tab 2');
                            handleTabChange(null, 2);
                        }}
                        sx={{ minWidth: 0, p: 0.5, pointerEvents: 'auto', cursor: 'pointer' }}
                    />
                </Tabs>

                {/* Content Area - V2 Fixed Tab Content */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f8f9fa' }}>
                    {console.log('[Sidebar V2] Rendering content, tabValue:', tabValue)}
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
                            onClearHistory={clearChatHistory}
                        />
                    )}
                </Box>
            </Paper>

            {/* V2 Configuration Dialog */}
            <SidebarV2ConfigDialog
                open={configDialogOpen}
                onClose={() => setConfigDialogOpen(false)}
                autoAnalysisConfig={autoAnalysisConfig}
                quickButtonsConfig={quickButtonsConfig}
                chatConfig={chatConfig}
                onConfigSaved={handleV2ConfigSaved}
            />
        </>
    );
};

export default Sidebar;
