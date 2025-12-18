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
    setIsCollapsed // Function to update collapse state in parent
}) => {
    // 拖曳狀態
    const [isResizing, setIsResizing] = useState(false);

    // Refs for resizing
    const isResizingRef = useRef(false);

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

        // Save width handled by setWidth in parent (state update), persistance in parent
        // In parent, we monitor changes and save to storage.
        // Or we can save here if we want to ensure save on drag end.
        // Let's rely on the parent's useEffect on [width] or save here if we had access to the final value easily without prop drill for save.
        // Actually, parent handles persistence on change or effect.
        // Since setWidth updates state, parent effect can save it.
        // But to avoid too many writes during drag, parent usually debounces or saves on unmount.
        // For simplicity, let's trigger a save in parent or here if we pass a "onResizeEnd" prop.
        // Current implementation in FloatingIcon saves on resize? No, I need to add that.
        // The implementation plan said: handleSidebarResize: Update sidebarWidth and save to chrome.storage.local.
        // But setWidth is likely just state setter.
        // So I'll just let the state update content. Ideally we save on drag end.
        // Let's just update the state for now.

        // Let's add explicit save here if we want, but props dont give us "save".
        // Use local storage direct access if needed, but lifting state usually implies parent manages it.
        // Let's assume parent saves it or we just update state.
        // Actually checking FloatingIcon implementation: 
        // I haven't implemented "save on change" in FloatingIcon yet, only "load".
        // So I should probably add saving logic to FloatingIcon's useEffect or add onResizeEnd prop.
        // For now, let's stick to updating state. 
        // We can add a simple save to storage here since it's cleaner than prop drilling "save".
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
                    <Tooltip title="縮小至圖示">
                        <IconButton onClick={handleCollapse} size="small" aria-label="minimize sidebar">
                            <KeyboardDoubleArrowRightIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Toolbar */}
                <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #f0f0f0' }}>
                    <FormControl size="small" fullWidth sx={{ mr: 1 }}>
                        <Select
                            value="text"
                            displayEmpty
                            inputProps={{ 'aria-label': 'Mode' }}
                            sx={{ height: 32, fontSize: '0.875rem' }}
                        >
                            <MenuItem value="text">Text</MenuItem>
                            <MenuItem value="summary">Summary</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ ml: 'auto', display: 'flex' }}>
                        <IconButton size="small">
                            <SettingsIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small">
                            <RefreshIcon fontSize="small" />
                        </IconButton>
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
                    {/* Loader Placeholder */}
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
                        <Typography color="text.secondary" fontWeight="medium">
                            Loading...
                        </Typography>
                    </Paper>

                    {/* Transcript Placeholder */}
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            backgroundColor: '#f5f5f5',
                            border: 'none',
                            borderRadius: 2,
                            minHeight: 100,
                            position: 'relative'
                        }}
                    >
                        <IconButton
                            size="small"
                            sx={{ position: 'absolute', top: 4, right: 4 }}
                        >
                            <ContentCopyIcon fontSize="small" sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                            Loading transcript...
                        </Typography>
                    </Paper>
                </Box>
            </Paper>
        </>
    );
};

export default Sidebar;
