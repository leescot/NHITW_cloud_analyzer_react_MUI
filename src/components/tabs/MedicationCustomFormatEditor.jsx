import React, { useState, useEffect, useRef } from 'react';
import {
  Typography,
  Box,
  Button,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio
} from '@mui/material';

import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';

// Import local components
import FormatElementsPanel from './medicationCopyFormat/FormatElementsPanel';
import FormatPreview from './medicationCopyFormat/FormatPreview';
import useFormatEditorState from './medicationCopyFormat/useFormatEditorState';
import { createHeaderDragHandlers, createDrugDragHandlers } from './medicationCopyFormat/dragDropHandlers';

// 西藥自訂格式編輯器組件
const MedicationCustomFormatEditor = ({ appSettings, setAppSettings, generalDisplaySettings }) => {
  // 響應式布局
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // DOM ref for拖拉元素
  const dragItem = useRef(null);
  
  // Format type selection (horizontal or vertical)
  const [formatType, setFormatType] = useState("customVertical");
  
  // Use the custom hook for state management - now with separate header and drug formats
  const {
    headerFormat,
    setHeaderFormat,
    drugFormat,
    setDrugFormat,
    customTextValue,
    setCustomTextValue,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    drugSeparator,
    setDrugSeparator,
    availableElements,
    addHeaderItem,
    addDrugItem,
    addHeaderCustomText,
    addDrugCustomText,
    removeHeaderItem,
    removeDrugItem,
    saveChanges,
    resetToDefault,
    addHeaderPresetGroup
  } = useFormatEditorState(appSettings, setAppSettings);

  // Create drag handlers
  const headerDragHandlers = createHeaderDragHandlers(headerFormat, setHeaderFormat);
  const drugDragHandlers = createDrugDragHandlers(drugFormat, setDrugFormat);

  // Add extra debugging to track settings changes
  useEffect(() => {
    if (appSettings?.western?.customMedicationHeaderCopyFormat && appSettings?.western?.customMedicationDrugCopyFormat) {
      // Monitoring both formats instead of a single customCopyFormat
    }
  }, [appSettings?.western?.customMedicationHeaderCopyFormat, appSettings?.western?.customMedicationDrugCopyFormat]);

  // Initialize format type from settings
  useEffect(() => {
    if (appSettings.western) {
      // Initialize format type
      if (appSettings.western.medicationCopyFormat === "customHorizontal") {
        setFormatType("customHorizontal");
      } else {
        setFormatType("customVertical");
      }
    }
  }, [appSettings.western]);

  // Handle format type change
  const handleFormatTypeChange = (event) => {
    const newFormatType = event.target ? event.target.value : event;
    console.log("Format type changed to:", newFormatType);
    setFormatType(newFormatType);
  };

  // Custom save changes function to include format type
  const handleSaveChanges = () => {
    // 使用 Map 結構來簡化檢查邏輯 #zh-TW
    const headerElementTypeMap = new Map([
      ['header', new Set(['text'])],
      ['text', new Set()]
    ]);
    
    // 檢查標題格式中是否有閉合括號 ']' #zh-TW
    const hasClosingBracket = headerFormat.some(item => {
      const baseId = item.id.split('_')[0];
      const secondPart = item.id.split('_')[1];
      
      const isHeaderTextOrText = (
        (headerElementTypeMap.has(baseId) && 
         (secondPart === undefined || headerElementTypeMap.get(baseId).has(secondPart))) ||
        (baseId === 'header' && secondPart === 'text')
      );
      
      return isHeaderTextOrText && item.value === ']';
    });
    
    if (!hasClosingBracket) {
      console.warn('Closing bracket missing from header format!');
    }
    
    // Save with format type
    saveChanges({
      formatType: formatType  // Pass the current format type
    });
    
    // Log final settings after saving - now with separate formats
    console.log('Saved format settings:', {
      header: headerFormat,
      drug: drugFormat,
      formatType: formatType,
      options: {
        drugSeparator
      }
    });
  };

  return (
    <Box sx={{ pt: 0, px: 1, pb: 1 }}>
      {/* Header with title and buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1, mt: 0 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RestoreIcon />}
            onClick={resetToDefault}
            size="small"
          >
            重置為預設
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveChanges}
            size="small"
          >
            儲存設定
          </Button>
        </Box>
      </Box>
      
      {/* Preview section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: '#f8f8f8', pt: 1, px: 2, pb: 1, borderRadius: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="medium" sx={{ width: '100%', textAlign: 'center' }}>
            格式類型選擇與預覽
          </Typography>
        </Box>
        
        <FormatPreview 
          headerFormat={headerFormat} 
          drugFormat={drugFormat} 
          drugSeparator={drugSeparator}
          formatType={formatType}
          onFormatTypeChange={handleFormatTypeChange}
        />
      </Box>
      
      {/* Header format panel */}
      <FormatElementsPanel
        title="標題格式 (只顯示一次)"
        elements={headerFormat}
        formatClass="header-format-item"
        availableElements={availableElements('header')}
        customTextValue=""
        setCustomTextValue={() => {}}
        onAddItem={addHeaderItem}
        onRemoveItem={removeHeaderItem}
        onAddCustomText={(text) => addHeaderCustomText(text)}
        onAddPresetGroup={addHeaderPresetGroup}
        formatType="header"
        currentFormatType={formatType}
        dragHandlers={{
          handleDragStart: headerDragHandlers.handleHeaderDragStart,
          handleDragEnter: headerDragHandlers.handleHeaderDragEnter,
          handleDragOver: headerDragHandlers.handleHeaderDragOver,
          handleDragLeave: headerDragHandlers.handleHeaderDragLeave,
          handleDrop: headerDragHandlers.handleHeaderDrop,
          handleDragEnd: headerDragHandlers.handleHeaderDragEnd
        }}
      />
      
      {/* Drug format panel */}
      <FormatElementsPanel
        title="藥品格式 (每個藥品顯示一次)"
        elements={drugFormat}
        formatClass="drug-format-item"
        availableElements={availableElements('drug')}
        customTextValue=""
        setCustomTextValue={() => {}}
        onAddItem={addDrugItem}
        onRemoveItem={removeDrugItem}
        onAddCustomText={(text) => addDrugCustomText(text)}
        formatType="drug"
        drugSeparator={drugSeparator}
        setDrugSeparator={setDrugSeparator}
        currentFormatType={formatType}
        dragHandlers={{
          handleDragStart: drugDragHandlers.handleDrugDragStart,
          handleDragEnter: drugDragHandlers.handleDrugDragEnter,
          handleDragOver: drugDragHandlers.handleDrugDragOver,
          handleDragLeave: drugDragHandlers.handleDrugDragLeave,
          handleDrop: drugDragHandlers.handleDrugDrop,
          handleDragEnd: drugDragHandlers.handleDragEnd
        }}
      />
      
      {/* Notifications */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={3000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MedicationCustomFormatEditor; 