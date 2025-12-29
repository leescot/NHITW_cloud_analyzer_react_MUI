import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';

import { GAI_CONFIG } from '../config/gaiConfig';
import { generateGAIFormatXML } from '../utils/gaiCopyFormatter';

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

    // Analysis State
    const [analysisResults, setAnalysisResults] = useState({
        critical_alerts: [],
        medication_risks: [],
        abnormal_labs: [],
        imaging_findings: []
    });

    // Granular Loading States
    const [loadingStates, setLoadingStates] = useState({
        critical_alerts: false,
        medication_risks: false,
        abnormal_labs: false,
        imaging_findings: false
    });

    // Error States
    const [errorStates, setErrorStates] = useState({
        critical_alerts: null,
        medication_risks: null,
        abnormal_labs: null,
        imaging_findings: null
    });

    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const isResizingRef = useRef(false);
    const newWidthRef = useRef(width);

    // Track if any analysis is running
    const isAnalyzing = Object.values(loadingStates).some(state => state);

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
        if (!isDataLoaded) {
            setHasAnalyzed(false);
            setAnalysisResults({
                critical_alerts: [],
                medication_risks: [],
                abnormal_labs: [],
                imaging_findings: []
            });
            setErrorStates({
                critical_alerts: null,
                medication_risks: null,
                abnormal_labs: null,
                imaging_findings: null
            });
        }
    }, [isDataLoaded]);

    const handleAnalyze = () => {
        setHasAnalyzed(true);
        const xmlString = generateGAIFormatXML(patientData);

        // 讀取使用者選擇的 AI 提供者
        // 使用新的統一 callGAI handler，支援所有已註冊的 Provider
        // background.js 會自動路由到對應的 Provider（OpenAIProvider、GeminiProvider、GroqProvider 等）
        chrome.storage.sync.get(['gaiProvider'], (result) => {
            const provider = result.gaiProvider || 'openai';
            // 平行觸發所有分析，每個分析獨立處理回應
            Object.keys(GAI_CONFIG).forEach(key => {
                runAnalysisForKey(key, xmlString, provider);
            });
        });
    };

    const runAnalysisForKey = (key, xmlString, provider = 'openai') => {
        const config = GAI_CONFIG[key];

        // 更新載入狀態
        setLoadingStates(prev => ({ ...prev, [key]: true }));
        setErrorStates(prev => ({ ...prev, [key]: null }));

        console.log(`📤 [Sidebar] Sending callGAI request for ${key} using provider: ${provider}`);

        // 呼叫 background script 執行 AI 分析
        // 使用新的統一 callGAI handler，支援所有已註冊的 Provider
        chrome.runtime.sendMessage({
            action: 'callGAI',
            providerId: provider,
            systemPrompt: config.systemPrompt,
            userPrompt: xmlString,
            jsonSchema: config.schema,
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
                            mergedResults[key].push(`(Total_tokens: ${totalTokens}, 執行時間: ${durationSec}s)`);
                        }

                        return mergedResults;
                    });
                } catch (e) {
                    setErrorStates(prev => ({ ...prev, [key]: "Parse error: " + e.message }));
                }
            }
        });
    };

    const handleTabChange = (event, newValue) => {
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
        document.body.style.cursor = 'default';
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
    }, [handleMouseMove, stopResizing]);

    const handleCollapse = () => setIsCollapsed(true);
    const handleRestore = () => setIsCollapsed(false);

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
                        chrome.storage.sync.get(['gaiProvider'], (result) => {
                            runAnalysisForKey(dataKey, generateGAIFormatXML(patientData), result.gaiProvider || 'openai');
                        });
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
                    width: '10px',
                    height: '100vh',
                    zIndex: 2147483648,
                    cursor: 'w-resize',
                    backgroundColor: 'transparent',
                    '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
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
                }}
            >
                {/* Header */}
                <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SmartToyIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight="bold">GAI 助手</Typography>
                    </Box>
                    <Box>
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

                {/* Tabs */}
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
                >
                    <Tab
                        icon={<Badge color="error" variant="dot" invisible={!analysisResults.critical_alerts.length}><WarningIcon fontSize="small" /></Badge>}
                        label="注意"
                        sx={{ minWidth: 0, p: 1, fontSize: '0.8rem' }}
                    />
                    <Tab
                        icon={<Badge color="warning" variant="dot" invisible={!analysisResults.medication_risks.length}><MedicationIcon fontSize="small" /></Badge>}
                        label="用藥"
                        sx={{ minWidth: 0, p: 1, fontSize: '0.8rem' }}
                    />
                    <Tab
                        icon={<Badge color="info" variant="dot" invisible={!analysisResults.abnormal_labs.length}><ScienceIcon fontSize="small" /></Badge>}
                        label="檢驗"
                        sx={{ minWidth: 0, p: 1, fontSize: '0.8rem' }}
                    />
                    <Tab
                        icon={<Badge color="error" variant="dot" invisible={!analysisResults.imaging_findings.length}><ImageSearchIcon fontSize="small" /></Badge>}
                        label="影像"
                        sx={{ minWidth: 0, p: 1, fontSize: '0.8rem' }}
                    />
                </Tabs>

                {/* Content Area - Scrollable */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f8f9fa' }}>
                    {/* Critical Alerts Tab */}
                    {tabValue === 0 && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'error.main' }}>
                                <WarningIcon sx={{ mr: 1 }} />
                                <Typography variant="subtitle2" fontWeight="bold">危險 / 注意事項</Typography>
                            </Box>
                            {renderContentList('critical_alerts', 'error', '無重大危險警示')}
                        </Box>
                    )}

                    {/* Medication Risks Tab */}
                    {tabValue === 1 && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'warning.dark' }}>
                                <MedicationIcon sx={{ mr: 1 }} />
                                <Typography variant="subtitle2" fontWeight="bold">用藥雷點 / 注意</Typography>
                            </Box>
                            {renderContentList('medication_risks', 'warning', '無發現顯著用藥風險')}
                        </Box>
                    )}

                    {/* Abnormal Labs Tab */}
                    {tabValue === 2 && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'info.main' }}>
                                <ScienceIcon sx={{ mr: 1 }} />
                                <Typography variant="subtitle2" fontWeight="bold">異常檢驗數值</Typography>
                            </Box>
                            {renderContentList('abnormal_labs', 'info', '近期無顯著異常檢驗')}
                        </Box>
                    )}

                    {/* Imaging Findings Tab */}
                    {tabValue === 3 && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.primary' }}>
                                <ImageSearchIcon sx={{ mr: 1 }} />
                                <Typography variant="subtitle2" fontWeight="bold">影像檢查發現</Typography>
                            </Box>
                            {renderContentList('imaging_findings', 'inherit', '無重要影像異常發現')}
                        </Box>
                    )}
                </Box>
            </Paper>
        </>
    );
};

export default Sidebar;
