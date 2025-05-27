import { useState, useEffect } from 'react';
import { 
  getAvailableElements, 
  getDefaultHeaderFormat, 
  getDefaultDrugFormat,
  ELEMENT_SECTIONS
} from './formatEditorConfig';
import { handleSettingChange } from '../../../utils/settingsHelper';

// Counter for generating unique IDs
let idCounter = 0;

// Custom hook to manage format editor state
const useFormatEditorState = (appSettings, setAppSettings) => {
  // Format states
  const [headerFormat, setHeaderFormat] = useState([]);
  const [drugFormat, setDrugFormat] = useState([]);
  const [enableMedicationCustomFormat, setEnableMedicationCustomFormat] = useState(true);
  const [customTextValue, setCustomTextValue] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [drugSeparator, setDrugSeparator] = useState(',');
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  
  // Function to get available elements based on format type
  const availableElements = (formatType = 'all') => {
    return getAvailableElements(drugSeparator, formatType);
  };

  // Initialize formats from settings
  useEffect(() => {
    // Use the new separate format properties
    if (appSettings.western) {
      // Initialize header format
      if (appSettings.western.customMedicationHeaderCopyFormat) {
        const headerFormatWithSections = appSettings.western.customMedicationHeaderCopyFormat.map(item => ({
          ...item,
          section: item.section || ELEMENT_SECTIONS.HEADER
        }));
        setHeaderFormat(headerFormatWithSections);
      } else {
        setHeaderFormat(getDefaultHeaderFormat());
      }
      
      // Initialize drug format
      if (appSettings.western.customMedicationDrugCopyFormat) {
        const drugFormatWithSections = appSettings.western.customMedicationDrugCopyFormat.map(item => ({
          ...item,
          section: item.section || ELEMENT_SECTIONS.DRUG
        }));
        setDrugFormat(drugFormatWithSections);
      } else {
        setDrugFormat(getDefaultDrugFormat());
      }
      
      // Set drug separator
      setDrugSeparator(appSettings.western.drugSeparator || ',');
    } else {
      // Use defaults if no saved format
      resetToDefault();
    }
  }, [
    appSettings.western?.customMedicationHeaderCopyFormat, 
    appSettings.western?.customMedicationDrugCopyFormat,
    appSettings.western?.drugSeparator
  ]);

  // Add item to header format with appropriate section
  const addHeaderItem = (item) => {
    // Ensure the item has the correct section
    let itemToAdd = { 
      ...item,
      section: ELEMENT_SECTIONS.HEADER 
    };
    
    // 使用 Map 代替 if-else 來處理特殊元素 #zh-TW
    if (item.id === 'icd') {
      const icdMap = new Map([
        [true, 'icdcode'],   // 代碼情況
        [false, 'icdname']   // 名稱情況
      ]);
      
      const isCodeDisplay = item.display.includes('代碼');
      itemToAdd.id = icdMap.get(isCodeDisplay) || item.id;
    }
    
    // 對空格和文字元素確保有 header 前綴 #zh-TW
    const baseId = itemToAdd.id.split('_')[0];
    if (baseId === 'space' || baseId === 'text') {
      if (!itemToAdd.id.startsWith('header_')) {
        itemToAdd.id = 'header_' + baseId;
      }
    }
    
    // Generate a unique ID by appending counter instead of timestamp
    idCounter++;
    const uniqueId = {
      ...itemToAdd,
      id: `${itemToAdd.id.split('_')[0]}_${idCounter.toString().padStart(2, '0')}`
    };
    
    setHeaderFormat(prev => [...prev, uniqueId]);
  };

  // Add item to drug format with appropriate section
  const addDrugItem = (item) => {
    // Ensure the item has the correct section
    let itemToAdd = { 
      ...item,
      section: ELEMENT_SECTIONS.DRUG 
    };
    
    // 對空格和文字元素確保有 drug 前綴 #zh-TW
    const baseId = itemToAdd.id.split('_')[0];
    
    // 使用 Map 代替 if-else 來處理需要添加前綴的元素類型 #zh-TW
    const prefixMap = new Map([
      ['space', true],
      ['text', true]
    ]);
    
    if (prefixMap.has(baseId) && !itemToAdd.id.startsWith('drug_')) {
      itemToAdd.id = 'drug_' + baseId;
    }
    
    // Generate a unique ID using counter instead of timestamp
    idCounter++;
    const uniqueId = {
      ...itemToAdd,
      id: `${itemToAdd.id.split('_')[0]}_${idCounter.toString().padStart(2, '0')}`
    };
    
    setDrugFormat(prev => [...prev, uniqueId]);
  };
  
  // Add custom text to header format
  const addHeaderCustomText = (text) => {
    const textToAdd = text || customTextValue;
    if (textToAdd.trim()) {
      addHeaderItem({ 
        id: 'header_text', 
        value: textToAdd,
        display: textToAdd,
        group: 'format',
        section: ELEMENT_SECTIONS.HEADER
      });
      // Only clear the global state if we used it
      if (!text) setCustomTextValue('');
    }
  };

  // Add custom text to drug format
  const addDrugCustomText = (text) => {
    const textToAdd = text || customTextValue;
    if (textToAdd.trim()) {
      addDrugItem({ 
        id: 'drug_text', 
        value: textToAdd,
        display: textToAdd,
        group: 'format',
        section: ELEMENT_SECTIONS.DRUG
      });
      // Only clear the global state if we used it
      if (!text) setCustomTextValue('');
    }
  };

  // Remove item from header format
  const removeHeaderItem = (index) => {
    const newFormat = [...headerFormat];
    newFormat.splice(index, 1);
    setHeaderFormat(newFormat);
  };

  // Remove item from drug format
  const removeDrugItem = (index) => {
    const newFormat = [...drugFormat];
    newFormat.splice(index, 1);
    setDrugFormat(newFormat);
  };

  // Reset to default format
  const resetToDefault = () => {
    // Get default formats for medication
    const defaultHeaderFormat = getDefaultHeaderFormat();
    const defaultDrugFormat = getDefaultDrugFormat();
    
    // Update local state
    setHeaderFormat(defaultHeaderFormat);
    setDrugFormat(defaultDrugFormat);
    setDrugSeparator(','); // Reset the drug separator to default value
    
    // Update app settings - ONLY update western section
    setAppSettings(prev => {
      const newSettings = {
        ...prev,
        western: {
          ...prev.western,
          customMedicationHeaderCopyFormat: defaultHeaderFormat,
          customMedicationDrugCopyFormat: defaultDrugFormat,
          drugSeparator: ','
        }
      };
      
      console.log('MedicationCustomFormatEditor: Reset to default formats');
      
      return newSettings;
    });
    
    // Show success message
    setSnackbarMessage('已重設為新的預設格式');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  // Save changes to settings
  const saveChanges = (newlineOptions = {}) => {
    const { 
      formatType = 'customVertical'
    } = newlineOptions;
    
    // Create deep copies of formats to avoid reference issues
    const finalHeaderFormat = JSON.parse(JSON.stringify(headerFormat));
    const finalDrugFormat = JSON.parse(JSON.stringify(drugFormat));
    
    // Ensure all header elements have the correct section
    finalHeaderFormat.forEach(item => {
      item.section = ELEMENT_SECTIONS.HEADER;
    });
    
    // Ensure all drug elements have the correct section
    finalDrugFormat.forEach(item => {
      item.section = ELEMENT_SECTIONS.DRUG;
    });
    
    // Update settings - now saving header and drug formats separately
    handleSettingChange('enableMedicationCustomCopyFormat', true, null, null, 'western');
    handleSettingChange('customMedicationHeaderCopyFormat', finalHeaderFormat, null, null, 'western');
    handleSettingChange('customMedicationDrugCopyFormat', finalDrugFormat, null, null, 'western');
    handleSettingChange('medicationCopyFormat', formatType, null, null, 'western');
    handleSettingChange('drugSeparator', drugSeparator, null, null, 'western');
    
    setSnackbarMessage('設定已儲存，需重新讀取卡片/新資料才會生效');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    
    // Update app settings - ONLY update western section, preserve everything else
    setAppSettings(prev => {
      const newSettings = {
        ...prev,
        western: {
          ...prev.western,
          customMedicationHeaderCopyFormat: finalHeaderFormat,
          customMedicationDrugCopyFormat: finalDrugFormat,
          enableMedicationCustomCopyFormat: true,
          medicationCopyFormat: formatType,
          drugSeparator: drugSeparator
        }
      };
      
      // Log the updated section for debugging
      console.log('Medication format settings updated:', {
        section: 'western',
        changes: newSettings.western
      });
      
      return newSettings;
    });
  };
  
  // Add preset group to header format - removed functionality since it's now empty
  const addHeaderPresetGroup = () => {
    // This function is kept for backward compatibility
    // It used to add preset header items but now headerPresetItems is empty
    // Currently does nothing significant
    setSnackbarMessage('標題格式已更新為自訂格式');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  };

  // Handle drug separator change
  const handleDrugSeparatorChange = (newValue) => {
    setDrugSeparator(newValue);
    
    // Update drugsep elements in formats
    // The drugSeparator will be applied when rendering the preview
    
    // Keep this code in case there are still any drugsep elements
    const updatedHeaderFormat = headerFormat.map(item => {
      const baseId = item.id.split('_')[0];
      if (baseId === 'drugsep' || (baseId === 'drug' && item.id.includes('_drugsep'))) {
        return { ...item, value: newValue };
      }
      return item;
    });
    
    const updatedDrugFormat = drugFormat.map(item => {
      const baseId = item.id.split('_')[0];
      if (baseId === 'drugsep' || (baseId === 'drug' && item.id.includes('_drugsep'))) {
        return { ...item, value: newValue };
      }
      return item;
    });
    
    setHeaderFormat(updatedHeaderFormat);
    setDrugFormat(updatedDrugFormat);
  };

  /**
   * 保存當前設置
   * @param {Object} customSettings - 自訂設置
   */
  const saveCurrentSettings = (customSettings = {}) => {
    const {
      medicationCopyFormat = formatType,
      drugSeparator: customDrugSeparator = drugSeparator,
    } = customSettings;
    
    // console.log('保存設置:', {
    //   medicationCopyFormat,
    //   drugSeparator: customDrugSeparator,
    //   headerElements: headerFormat.length,
    //   drugElements: drugFormat.length
    // });
    
    // 保存當前格式類型
    setSavedFormatType(medicationCopyFormat);
    
    // 保存到 Chrome 存儲
    const settingsToSave = [
      ['medicationCopyFormat', medicationCopyFormat, 'western'],
      ['drugSeparator', customDrugSeparator, 'western'],
      ['customMedicationHeaderCopyFormat', headerFormat, 'western'],
      ['customMedicationDrugCopyFormat', drugFormat, 'western']
    ];
    
    settingsToSave.forEach(([key, value, type]) => {
      handleSettingChange(key, value, null, null, type);
    });
    
    return {
      success: true,
      medicationCopyFormat,
      drugSeparator: customDrugSeparator,
      headerElements: headerFormat,
      drugElements: drugFormat
    };
  };

  return {
    headerFormat,
    setHeaderFormat,
    drugFormat,
    setDrugFormat,
    enableMedicationCustomFormat,
    customTextValue,
    setCustomTextValue,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    drugSeparator,
    setDrugSeparator: handleDrugSeparatorChange,
    selectedItems,
    setSelectedItems,
    sortMenuAnchor,
    setSortMenuAnchor,
    availableElements,
    addHeaderItem,
    addDrugItem,
    addHeaderCustomText,
    addDrugCustomText,
    removeHeaderItem,
    removeDrugItem,
    saveChanges,
    resetToDefault,
    addHeaderPresetGroup,
    saveCurrentSettings
  };
};

export default useFormatEditorState; 