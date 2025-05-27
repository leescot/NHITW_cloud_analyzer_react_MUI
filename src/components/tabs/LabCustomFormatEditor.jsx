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
import FormatElementsPanel from './labCopyFormat/FormatElementsPanel';
import FormatPreview from './labCopyFormat/FormatPreview';
import useFormatEditorState from './labCopyFormat/useFormatEditorState';
import { createHeaderLabHandlers, createItemLabHandlers } from './labCopyFormat/dragDropHandlers';

// 檢驗報告自訂格式編輯器元件
const LabCustomFormatEditor = ({ appSettings, setAppSettings, generalDisplaySettings }) => {
  // 響應式布局
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // DOM ref for拖拉元素
  const dragItem = useRef(null);
  
  // Format type selection (horizontal or vertical)
  const [formatType, setFormatType] = useState("customVertical");
  
  // Use the custom hook for state management - now with separate header and item formats
  const {
    headerFormat,
    setHeaderFormat,
    itemFormat,
    setItemFormat,
    customTextValue,
    setCustomTextValue,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    itemSeparator,
    setItemSeparator,
    availableElements,
    addHeaderItem,
    addLabItem,
    addHeaderCustomText,
    addLabItemCustomText,
    removeHeaderItem,
    removeLabItem,
    saveChanges,
    resetToDefault,
    addHeaderPresetGroup
  } = useFormatEditorState(appSettings, setAppSettings);

  // Create drag handlers
  const headerLabHandlers = createHeaderLabHandlers(headerFormat, setHeaderFormat);
  const itemLabHandlers = createItemLabHandlers(itemFormat, setItemFormat);

  // Add extra debugging to track settings changes
  useEffect(() => {
    if (appSettings?.lab?.customLabHeaderCopyFormat && appSettings?.lab?.customLabItemCopyFormat) {
      // Monitoring both formats instead of a single customCopyFormat
    }
  }, [appSettings?.lab?.customLabHeaderCopyFormat, appSettings?.lab?.customLabItemCopyFormat]);

  // Initialize format type from settings
  useEffect(() => {
    if (appSettings.lab) {
      // Initialize format type
      if (appSettings.lab.copyLabFormat === "customHorizontal") {
        setFormatType("customHorizontal");
      } else {
        setFormatType("customVertical");
      }
      
      // Log the current itemSeparator from settings
      console.log(`LabCustomFormatEditor: Initial itemSeparator from settings: "${appSettings.lab.itemSeparator || ','}"`);
    }
  }, [appSettings.lab]);

  // Effect to track itemSeparator changes
  useEffect(() => {
    console.log(`LabCustomFormatEditor: itemSeparator changed to: "${itemSeparator}"`);
  }, [itemSeparator]);

  // Handle format type change
  const handleFormatTypeChange = (event) => {
    const newFormatType = event.target ? event.target.value : event;
    console.log("LabCustomFormatEditor: Format type changed to:", newFormatType);
    setFormatType(newFormatType);
    
    // We no longer immediately update settings here - will be saved with saveChanges
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
    
    // if (!hasClosingBracket) {
    //   console.warn('LabCustomFormatEditor: Closing bracket missing from header format!');
    // }
    
    // Log the current itemSeparator before saving
    // console.log(`LabCustomFormatEditor: Current itemSeparator before saving: "${itemSeparator}" (${typeof itemSeparator})`);
    
    // Save with format type
    saveChanges({
      formatType // Pass the current format type for lab only
    });
    
    // Log final settings after saving
    // console.log('LabCustomFormatEditor: Saved format settings:', {
    //   header: headerFormat,
    //   item: itemFormat,
    //   formatType: formatType,
    //   options: {
    //     itemSeparator
    //   }
    // });
  };
  
  // For directly testing separator
  // const testCurrentSeparator = () => {
  //   console.log(`====== LAB SEPARATOR TEST ======`);
  //   console.log(`Current itemSeparator value: "${itemSeparator}" (${typeof itemSeparator})`);
  //   console.log(`appSettings.lab.itemSeparator: "${appSettings.lab?.itemSeparator}" (${typeof appSettings.lab?.itemSeparator})`);
  //   console.log(`================================`);
  // };

  return (
    <Box sx={{ pt: 0, px: 1, pb: 1 }}>
      {/* Header with title and buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1, mt: 0 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RestoreIcon />}
            onClick={() => {
              console.log('LabCustomFormatEditor: Reset button clicked');
              resetToDefault();
            }}
            size="small"
          >
            重設為預設
          </Button>
          {/* {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outlined"
              color="info"
              onClick={testCurrentSeparator}
              size="small"
            >
              測試分隔字元
            </Button>
          )} */}
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
            格式型別選擇與預覽
          </Typography>
        </Box>
        
        <FormatPreview 
          headerFormat={headerFormat} 
          itemFormat={itemFormat} 
          itemSeparator={itemSeparator}
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
          handleDragStart: headerLabHandlers.handleHeaderDragStart,
          handleDragEnter: headerLabHandlers.handleHeaderDragEnter,
          handleDragOver: headerLabHandlers.handleHeaderDragOver,
          handleDragLeave: headerLabHandlers.handleHeaderDragLeave,
          handleDrop: headerLabHandlers.handleHeaderDrop,
          handleDragEnd: headerLabHandlers.handleHeaderDragEnd
        }}
      />
      
      {/* Lab item format panel */}
      <FormatElementsPanel
        title="檢驗項目格式 (每個檢驗項目顯示一次)"
        elements={itemFormat}
        formatClass="lab-item-format-item"
        availableElements={availableElements('lab')}
        customTextValue=""
        setCustomTextValue={() => {}}
        onAddItem={addLabItem}
        onRemoveItem={removeLabItem}
        onAddCustomText={(text) => addLabItemCustomText(text)}
        formatType="lab"
        itemSeparator={itemSeparator}
        setItemSeparator={setItemSeparator}
        currentFormatType={formatType}
        dragHandlers={{
          handleDragStart: itemLabHandlers.handleItemDragStart,
          handleDragEnter: itemLabHandlers.handleItemDragEnter,
          handleDragOver: itemLabHandlers.handleItemDragOver,
          handleDragLeave: itemLabHandlers.handleItemDragLeave,
          handleDrop: itemLabHandlers.handleItemDrop,
          handleDragEnd: itemLabHandlers.handleItemDragEnd
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

export default LabCustomFormatEditor; 