/* eslint-disable react/prop-types -- 專案未使用 PropTypes(全 repo 該規則有 ~2100 個未修告警,實質未執行) */
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

// Import generic copy-format editor building blocks (階段5 Task 6)
import FormatElementsPanel from './copyFormat/FormatElementsPanel';
import FormatPreview from './copyFormat/FormatPreview';
import useFormatEditorState from './copyFormat/useFormatEditorState';
import { createDragHandlers } from './copyFormat/dragDropHandlers';
import medicationConfig from './copyFormat/medicationConfig';
import { debugLog } from '../../utils/logger';

// 西藥自訂格式編輯器組件
const MedicationCustomFormatEditor = ({ appSettings, setAppSettings }) => {
  // Format type selection (horizontal or vertical)
  const [formatType, setFormatType] = useState('customVertical');

  // Use the generic hook for state management, driven by medicationConfig
  const {
    headerFormat,
    setHeaderFormat,
    itemFormat: drugFormat,
    setItemFormat: setDrugFormat,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    separator: drugSeparator,
    setSeparator: setDrugSeparator,
    availableElements,
    addHeaderItem,
    addItemElement: addDrugItem,
    addHeaderCustomText,
    addItemCustomText: addDrugCustomText,
    removeHeaderItem,
    removeItemElement: removeDrugItem,
    saveChanges,
    resetToDefault,
    addHeaderPresetGroup
  } = useFormatEditorState(appSettings, setAppSettings, medicationConfig);

  // Create drag handlers
  const headerDragHandlers = createDragHandlers(headerFormat, setHeaderFormat);
  const drugDragHandlers = createDragHandlers(drugFormat, setDrugFormat);

  // Initialize format type from settings
  useEffect(() => {
    if (appSettings.western) {
      if (appSettings.western.medicationCopyFormat === 'customHorizontal') {
        setFormatType('customHorizontal');
      } else {
        setFormatType('customVertical');
      }
    }
  }, [appSettings.western]);

  // Handle format type change
  const handleFormatTypeChange = (event) => {
    const newFormatType = event.target ? event.target.value : event;
    debugLog('Format type changed to:', newFormatType);
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
      console.warn('MedicationCustomFormatEditor: Closing bracket missing from header format!');
    }

    // Save with format type
    saveChanges({
      formatType // Pass the current format type for medication only
    });

    // Log final settings after saving
    debugLog('MedicationCustomFormatEditor: Saved format settings:', {
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
            onClick={() => {
              debugLog('MedicationCustomFormatEditor: Reset button clicked');
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
          itemFormat={drugFormat}
          separator={drugSeparator}
          formatType={formatType}
          onFormatTypeChange={handleFormatTypeChange}
          config={medicationConfig}
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
        config={medicationConfig}
      />

      {/* Drug format panel */}
      <FormatElementsPanel
        title="藥品格式 (每個藥品顯示一次)"
        elements={drugFormat}
        formatClass="drug-format-item"
        availableElements={availableElements('item')}
        onAddItem={addDrugItem}
        onRemoveItem={removeDrugItem}
        onAddCustomText={(text) => addDrugCustomText(text)}
        formatType="item"
        separator={drugSeparator}
        setSeparator={setDrugSeparator}
        currentFormatType={formatType}
        dragHandlers={drugDragHandlers}
        config={medicationConfig}
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
