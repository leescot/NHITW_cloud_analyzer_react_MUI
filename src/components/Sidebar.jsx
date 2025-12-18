import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    Fab,
    Tooltip
} from '@mui/material';
// import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';

const Sidebar = ({
    open,
    onClose,
    width = 350,
    setWidth, // Function to update width in parent
    isCollapsed = false,
    setIsCollapsed, // Function to update collapse state in parent
    patientData = {},
    isDataLoaded = false
}) => {
    // 拖曳狀態
    const [isResizing, setIsResizing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [gaiPrompt, setGaiPrompt] = useState("");

    // Refs for resizing
    const isResizingRef = useRef(false);

    // Load GAI Prompt
    useEffect(() => {
        chrome.storage.sync.get({ gaiPrompt: "You are a helpful assistant." }, (items) => {
            setGaiPrompt(items.gaiPrompt);
        });
    }, []);

    // Auto Analyze Logic
    useEffect(() => {
        const hasValidData = () => {
            if (!patientData) return false;

            // Check if any major data category has content
            return (
                (patientData.groupedMedications && patientData.groupedMedications.length > 0) ||
                (patientData.groupedLabs && patientData.groupedLabs.length > 0) ||
                (patientData.patientSummaryData && patientData.patientSummaryData.length > 0) ||
                (patientData.allergyData && patientData.allergyData.length > 0) ||
                (patientData.surgeryData && patientData.surgeryData.length > 0) ||
                (patientData.dischargeData && patientData.dischargeData.length > 0) ||
                (patientData.imagingData && (patientData.imagingData.withReport?.length > 0 || patientData.imagingData.withoutReport?.length > 0)) ||
                // Check HBVC or other specific data if necessary
                (patientData.hbcvData && Object.keys(patientData.hbcvData).length > 0)
            );
        };

        // Only trigger if:
        // 1. Sidebar is open
        // 2. Data is loaded and valid
        // 3. Not currently analyzing
        // 4. Has NOT analyzed this data session yet
        // 5. Data actually contains records (not just empty arrays initialized)

        if (open && isDataLoaded && !isAnalyzing && !hasAnalyzed && hasValidData()) {
            console.log('Sidebar: Auto-analyzing valid patient data...');
            handleAnalyze();
        } else if (open && isDataLoaded && !hasValidData()) {
            console.log('Sidebar: Data loaded but no records found. Skipping auto-analysis.');
        }
    }, [open, isDataLoaded, isAnalyzing, hasAnalyzed, patientData]);

    // Reset analysis when data reloads (isDataLoaded goes false then true? Or if patientData changes?)
    // Let's reset hasAnalyzed when isDataLoaded becomes false to allow re-trigger.
    useEffect(() => {
        if (!isDataLoaded) {
            setHasAnalyzed(false);
            setAnalysisResult(null);
            setError(null);
        }
    }, [isDataLoaded]);


    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);

        try {
            // Import dynamically or assume it is passed/available? It was not passed.
            // I need to import generateGAIFormatXML. It is an export from utils.
            // Since this is a .jsx file, I should have added the import at the top. I will add it in a separate block or include it here if I rewrite imports?
            // Wait, I can't easily add import at top with this tool call unless I replace the whole file or use multi_replace properly. 
            // I will assume I need to fix imports later or do it now.
            // Let's use dynamic import if possible? No, standard import is better. 
            // I'll skip import here and add it in a separate tool call to be safe, OR I can trust the build system? 
            // React best practice: just import it.
            // I will use another tool call to add the import.
            // For now, assume generateGAIFormatXML is available or I will fail.
            // Let's postpone the execution of this logic until I add the import. 
            // Actually, I am replacing the whole component logic basically. 

            // Wait, I can add imports via ReplaceFileContent at the top.
            // I will continue this logic assuming import exists, and I will add import in next step.

            const { generateGAIFormatXML } = await import('../utils/gaiCopyFormatter');

            const xmlString = generateGAIFormatXML(patientData);

            // Retrieve latest prompt if needed or use state
            // chrome.storage.sync.get... logic is async.

            chrome.runtime.sendMessage({
                action: 'callOpenAI',
                systemPrompt: gaiPrompt,
                userPrompt: xmlString
            }, (response) => {
                if (chrome.runtime.lastError) {
                    setError(chrome.runtime.lastError.message);
                } else if (!response || !response.success) {
                    setError(response?.error || "Unknown error");
                } else {
                    // Success
                    // Parse if it's string, but background sends JSON object "data" which contains the choices etc?
                    // Background sends: { success: true, data: openaiResponse }
                    // OpenAI response structure for structured output:
                    // choices[0].message.content (string representation of JSON) OR if parsed_output is supported?
                    // With response_format json_schema, content IS a JSON string.

                    try {
                        const content = response.data.choices[0].message.content;
                        const parsed = JSON.parse(content);
                        setAnalysisResult(parsed);
                        setHasAnalyzed(true);
                    } catch (e) {
                        setError("Failed to parse AI response: " + e.message);
                    }
                }
                setIsAnalyzing(false);
            });

        } catch (e) {
            setError(e.message);
            setIsAnalyzing(false);
        }
    };


    // Initial width load is now handled by parent (FloatingIcon)

    // Handle body margin for content shifting
    useEffect(() => {
        if (open && !isCollapsed) {
            document.body.style.transition = 'margin-right 0.3s ease-in-out';
            document.body.style.marginRight = `${width}px`;
        } else {
            document.body.style.marginRight = '0px';
        }

        // Cleanup
        return () => {
            document.body.style.marginRight = '0px';
        };
    }, [open, isCollapsed, width]);

    // Resize handlers
    // Define handleMouseMove FIRST because it is used by others
    const handleMouseMove = useCallback((e) => {
        if (!isResizingRef.current) return;

        // Calculate new width (Window width - Mouse X)
        const newWidth = window.innerWidth - e.clientX;

        // Constraints
        if (newWidth > 250 && newWidth < 800) {
            setWidth(newWidth);
        }
    }, [setWidth]);

    // Define stopResizing SECOND because it uses handleMouseMove
    const stopResizing = useCallback(() => {
        isResizingRef.current = false;
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';

        chrome.storage.local.set({ gaiSidebarWidth: newWidthRef.current });

    }, [handleMouseMove]);

    // We need to track the latest width for saving in stopResize without dependency issues
    const newWidthRef = useRef(width);
    useEffect(() => { newWidthRef.current = width; }, [width]);


    // Define startResizing LAST because it uses handleMouseMove and stopResizing
    const startResizing = useCallback((e) => {
        isResizingRef.current = true;
        setIsResizing(true);
        e.preventDefault(); // Prevent text selection
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'w-resize';
    }, [handleMouseMove, stopResizing]);

    // Handle Collapse
    const handleCollapse = () => {
        setIsCollapsed(true);
    };

    // Handle Restore
    const handleRestore = () => {
        setIsCollapsed(false);
    };

    if (!open) return null;

    // Render Collapsed State (Floating Button)
    if (isCollapsed) {
        return (
            <Fab
                color="primary"
                aria-label="restore sidebar"
                onClick={handleRestore}
                sx={{
                    position: 'fixed',
                    top: 80,
                    right: 20,
                    zIndex: 2147483647,
                }}
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
                    right: width, // Position at the left edge of sidebar
                    width: '10px', // Hit area width
                    height: '100vh',
                    zIndex: 2147483648, // Above sidebar
                    cursor: 'w-resize',
                    backgroundColor: 'transparent',
                    '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.1)', // Visual feedback
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
                    transition: isResizing ? 'none' : 'width 0.1s ease-out, transform 0.3s ease-in-out', // Disable transition during resize for performance
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.1)'
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: '#fff'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SmartToyIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                            GAI 助手
                        </Typography>
                    </Box>
                    <Box>
                        <Tooltip title="重新分析">
                            <IconButton onClick={handleAnalyze} size="small" disabled={isAnalyzing}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="縮小至圖示">
                            <IconButton onClick={handleCollapse} size="small" aria-label="minimize sidebar">
                                <KeyboardDoubleArrowRightIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Content Area */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        p: 2,
                        backgroundColor: '#f8f9fa',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }}
                >
                    {isAnalyzing && (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                backgroundColor: '#f5f5f5',
                                border: 'none',
                                borderRadius: 2
                            }}
                        >
                            <Box className="loader" sx={{
                                width: 20,
                                height: 20,
                                border: '2px solid #ccc',
                                borderBottomColor: 'primary.main',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' },
                                }
                            }} />
                            <Typography color="text.secondary" fontWeight="medium">
                                正在分析病歷資料...
                            </Typography>
                        </Paper>
                    )}

                    {error && (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                backgroundColor: '#fff3e0',
                                border: '1px solid #ffcc80',
                                borderRadius: 2
                            }}
                        >
                            <Typography variant="subtitle2" color="error">
                                分析失敗:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {error}
                            </Typography>
                            {!gaiPrompt && (
                                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                    請檢查是否已設定 API Key。
                                </Typography>
                            )}
                        </Paper>
                    )}

                    {!isAnalyzing && !analysisResult && !error && (
                        <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                            <SmartToyIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                            <Typography variant="body2">
                                等待資料載入後自動分析...
                            </Typography>
                        </Box>
                    )}

                    {analysisResult && (
                        <>
                            {/* Critical Alerts */}
                            {analysisResult.critical_alerts && analysisResult.critical_alerts.length > 0 && (
                                <Paper sx={{ p: 0, overflow: 'hidden', border: '1px solid #ffcdd2' }}>
                                    <Box sx={{ bgcolor: '#ffebee', px: 2, py: 1, borderBottom: '1px solid #ffcdd2' }}>
                                        <Typography variant="subtitle2" color="error.main" fontWeight="bold">
                                            🔴 危險 / 注意
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: 2 }}>
                                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                                            {analysisResult.critical_alerts.map((item, index) => (
                                                <li key={index}>
                                                    <Typography variant="body2">{item}</Typography>
                                                </li>
                                            ))}
                                        </ul>
                                    </Box>
                                </Paper>
                            )}

                            {/* Medication Risks */}
                            {analysisResult.medication_risks && analysisResult.medication_risks.length > 0 && (
                                <Paper sx={{ p: 0, overflow: 'hidden', border: '1px solid #ffe0b2' }}>
                                    <Box sx={{ bgcolor: '#fff3e0', px: 2, py: 1, borderBottom: '1px solid #ffe0b2' }}>
                                        <Typography variant="subtitle2" color="warning.dark" fontWeight="bold">
                                            💊 用藥雷點
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: 2 }}>
                                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                                            {analysisResult.medication_risks.map((item, index) => (
                                                <li key={index}>
                                                    <Typography variant="body2">{item}</Typography>
                                                </li>
                                            ))}
                                        </ul>
                                    </Box>
                                </Paper>
                            )}

                            {/* Abnormal Labs */}
                            {analysisResult.abnormal_labs && analysisResult.abnormal_labs.length > 0 && (
                                <Paper sx={{ p: 0, overflow: 'hidden', border: '1px solid #b3e5fc' }}>
                                    <Box sx={{ bgcolor: '#e1f5fe', px: 2, py: 1, borderBottom: '1px solid #b3e5fc' }}>
                                        <Typography variant="subtitle2" color="info.main" fontWeight="bold">
                                            🧪 異常檢驗
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: 2 }}>
                                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                                            {analysisResult.abnormal_labs.map((item, index) => (
                                                <li key={index}>
                                                    <Typography variant="body2">{item}</Typography>
                                                </li>
                                            ))}
                                        </ul>
                                    </Box>
                                </Paper>
                            )}

                            {/* Imaging Findings */}
                            {analysisResult.imaging_findings && analysisResult.imaging_findings.length > 0 && (
                                <Paper sx={{ p: 0, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                                    <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
                                        <Typography variant="subtitle2" color="text.primary" fontWeight="bold">
                                            📸 影像異常
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: 2 }}>
                                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                                            {analysisResult.imaging_findings.map((item, index) => (
                                                <li key={index}>
                                                    <Typography variant="body2">{item}</Typography>
                                                </li>
                                            ))}
                                        </ul>
                                    </Box>
                                </Paper>
                            )}
                        </>
                    )}
                </Box>
            </Paper>
        </>
    );
};

export default Sidebar;
