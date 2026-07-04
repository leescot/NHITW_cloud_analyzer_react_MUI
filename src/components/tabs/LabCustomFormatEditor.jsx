import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Snackbar,
  Alert
} from '@mui/material';

import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';

import { debugLog } from '../../utils/logger';

// Import generic copy-format editor building blocks (階段5 Task 6)
import FormatElementsPanel from './copyFormat/FormatElementsPanel';
import FormatPreview from './copyFormat/FormatPreview';
import useFormatEditorState from './copyFormat/useFormatEditorState';
import { createDragHandlers } from './copyFormat/dragDropHandlers';
import labConfig from './copyFormat/labConfig';

// 檢驗報告自訂格式編輯器組件
const LabCustomFormatEditor = ({ appSettings, setAppSettings }) => {
  // Format type selection (horizontal or vertical)
  const [formatType, setFormatType] = useState('customVertical');

  // Use the generic hook for state management, driven by labConfig
  const {
    headerFormat,
    setHeaderFormat,
    itemFormat,
    setItemFormat,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    separator: itemSeparator,
    setSeparator: setItemSeparator,
    availableElements,
    addHeaderItem,
    addItemElement: addLabItem,
    addHeaderCustomText,
    addItemCustomText: addLabItemCustomText,
    removeHeaderItem,
    removeItemElement: removeLabItem,
    saveChanges,
    resetToDefault,
    addHeaderPresetGroup
  } = useFormatEditorState(appSettings, setAppSettings, labConfig);

  // Create drag handlers
  const headerDragHandlers = createDragHandlers(headerFormat, setHeaderFormat);
  const itemDragHandlers = createDragHandlers(itemFormat, setItemFormat);

  // Initialize format type from settings
  useEffect(() => {
    if (appSettings.lab) {
      if (appSettings.lab.copyLabFormat === 'customHorizontal') {
        setFormatType('customHorizontal');
      } else {
        setFormatType('customVertical');
      }

      debugLog(`LabCustomFormatEditor: Initial itemSeparator from settings: "${appSettings.lab.itemSeparator || ','}"`);
    }
  }, [appSettings.lab]);

  // Effect to track itemSeparator changes
  useEffect(() => {
    debugLog(`LabCustomFormatEditor: itemSeparator changed to: "${itemSeparator}"`);
  }, [itemSeparator]);

  // Handle format type change
  const handleFormatTypeChange = (event) => {
    const newFormatType = event.target ? event.target.value : event;
    debugLog('LabCustomFormatEditor: Format type changed to:', newFormatType);
    setFormatType(newFormatType);
  };

  // Custom save changes function to include format type
  const handleSaveChanges = () => {
    // Save with format type
    saveChanges({
      formatType // Pass the current format type for lab only
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
            onClick={() => {
              debugLog('LabCustomFormatEditor: Reset button clicked');
              resetToDefault();
            }}
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
          itemFormat={itemFormat}
          separator={itemSeparator}
          formatType={formatType}
          onFormatTypeChange={handleFormatTypeChange}
          config={labConfig}
        />
      </Box>

      {/* Header format panel */}
      <FormatElementsPanel
        title="標題格式 (只顯示一次)"
        elements={headerFormat}
        formatClass="header-format-item"
        availableElements={availableElements('header')}
        onAddItem={addHeaderItem}
        onRemoveItem={removeHeaderItem}
        onAddCustomText={(text) => addHeaderCustomText(text)}
        onAddPresetGroup={addHeaderPresetGroup}
        formatType="header"
        currentFormatType={formatType}
        dragHandlers={headerDragHandlers}
        config={labConfig}
      />

      {/* Lab item format panel */}
      <FormatElementsPanel
        title="檢驗項目格式 (每個檢驗項目顯示一次)"
        elements={itemFormat}
        formatClass="lab-item-format-item"
        availableElements={availableElements('item')}
        onAddItem={addLabItem}
        onRemoveItem={removeLabItem}
        onAddCustomText={(text) => addLabItemCustomText(text)}
        formatType="item"
        separator={itemSeparator}
        setSeparator={setItemSeparator}
        currentFormatType={formatType}
        dragHandlers={itemDragHandlers}
        config={labConfig}
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
