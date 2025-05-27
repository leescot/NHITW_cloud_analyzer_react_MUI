import { useState, useEffect } from 'react';
import { 
  getAvailableElements, 
  getDefaultHeaderFormat, 
  getDefaultLabItemFormat,
  ELEMENT_SECTIONS
} from './formatEditorConfig';
import { handleSettingChange } from '../../../utils/settingsHelper';

// Counter for generating unique IDs
let idCounter = 0;

// Custom hook to manage format editor state
const useFormatEditorState = (appSettings, setAppSettings) => {
  // Format states
  const [headerFormat, setHeaderFormat] = useState([]);
  const [itemFormat, setItemFormat] = useState([]);
  const [enableLabCustomFormat, setEnableLabCustomFormat] = useState(true);
  const [customTextValue, setCustomTextValue] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [itemSeparator, setItemSeparator] = useState(',');
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  
  // Function to get available elements based on format type
  const availableElements = (formatType = 'all') => {
    return getAvailableElements(itemSeparator, formatType);
  };

  // Initialize formats from settings
  useEffect(() => {
    // Use the new separate format properties
    if (appSettings.lab) {
      // Initialize header format
      if (appSettings.lab.customLabHeaderCopyFormat) {
        const headerFormatWithSections = appSettings.lab.customLabHeaderCopyFormat.map(item => ({
          ...item,
          section: item.section || ELEMENT_SECTIONS.HEADER
        }));
        setHeaderFormat(headerFormatWithSections);
      } else {
        setHeaderFormat(getDefaultHeaderFormat());
      }
      
      // Initialize lab item format
      if (appSettings.lab.customLabItemCopyFormat) {
        const itemFormatWithSections = appSettings.lab.customLabItemCopyFormat.map(item => ({
          ...item,
          section: item.section || ELEMENT_SECTIONS.LAB
        }));
        setItemFormat(itemFormatWithSections);
      } else {
        setItemFormat(getDefaultLabItemFormat());
      }
      
      // Set item separator
      setItemSeparator(appSettings.lab.itemSeparator || ',');
    } else {
      // Use defaults if no saved format
      resetToDefault();
    }
  }, [
    appSettings.lab?.customLabHeaderCopyFormat, 
    appSettings.lab?.customLabItemCopyFormat,
    appSettings.lab?.itemSeparator
  ]);

  // Add item to header format with appropriate section
  const addHeaderItem = (item) => {
    // Ensure the item has the correct section
    let itemToAdd = { 
      ...item,
      section: ELEMENT_SECTIONS.HEADER 
    };
    
    // 對空格和文字元素確保有 header 前綴
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

  // Add item to lab item format with appropriate section
  const addLabItem = (item) => {
    // Ensure the item has the correct section
    let itemToAdd = { 
      ...item,
      section: ELEMENT_SECTIONS.LAB 
    };
    
    // 對空格和文字元素確保有 lab 前綴
    const baseId = itemToAdd.id.split('_')[0];
    
    // 使用 Map 代替 if-else 來處理需要添加前綴的元素型別
    const prefixMap = new Map([
      ['space', true],
      ['text', true]
    ]);
    
    if (prefixMap.has(baseId) && !itemToAdd.id.startsWith('lab_')) {
      itemToAdd.id = 'lab_' + baseId;
    }
    
    // Generate a unique ID using counter instead of timestamp
    idCounter++;
    const uniqueId = {
      ...itemToAdd,
      id: `${itemToAdd.id.split('_')[0]}_${idCounter.toString().padStart(2, '0')}`
    };
    
    setItemFormat(prev => [...prev, uniqueId]);
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

  // Add custom text to lab item format
  const addLabItemCustomText = (text) => {
    const textToAdd = text || customTextValue;
    if (textToAdd.trim()) {
      addLabItem({ 
        id: 'lab_text', 
        value: textToAdd,
        display: textToAdd,
        group: 'format',
        section: ELEMENT_SECTIONS.LAB
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

  // Remove item from lab item format
  const removeLabItem = (index) => {
    const newFormat = [...itemFormat];
    newFormat.splice(index, 1);
    setItemFormat(newFormat);
  };

  // Reset to default format
  const resetToDefault = () => {
    // Get default formats for lab items
    const defaultHeaderFormat = getDefaultHeaderFormat();
    const defaultLabItemFormat = getDefaultLabItemFormat();
    
    // Update local state
    setHeaderFormat(defaultHeaderFormat);
    setItemFormat(defaultLabItemFormat);
    setItemSeparator(','); // Reset the item separator to default value
    
    // Update app settings - ONLY update lab section
    setAppSettings(prev => {
      const newSettings = {
        ...prev,
        lab: {
          ...prev.lab,
          customLabHeaderCopyFormat: defaultHeaderFormat,
          customLabItemCopyFormat: defaultLabItemFormat,
          itemSeparator: ','
        }
      };
      
      console.log('LabCustomFormatEditor: Reset to default formats');
      
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
    const finalItemFormat = JSON.parse(JSON.stringify(itemFormat));
    
    // Ensure all header elements have the correct section
    finalHeaderFormat.forEach(item => {
      item.section = ELEMENT_SECTIONS.HEADER;
    });
    
    // Ensure all lab item elements have the correct section
    finalItemFormat.forEach(item => {
      item.section = ELEMENT_SECTIONS.LAB;
    });
    
    // Ensure itemSeparator is a string
    const finalItemSeparator = String(itemSeparator || ',');
    
    // Log the itemSeparator for debugging
    console.log(`Saving itemSeparator: "${finalItemSeparator}" (${typeof finalItemSeparator})`);
    
    // Update settings - saving header and lab item formats separately
    handleSettingChange('enableLabCustomCopyFormat', true, null, null, 'lab');
    handleSettingChange('customLabHeaderCopyFormat', finalHeaderFormat, null, null, 'lab');
    handleSettingChange('customLabItemCopyFormat', finalItemFormat, null, null, 'lab');
    handleSettingChange('copyLabFormat', formatType, null, null, 'lab');
    handleSettingChange('itemSeparator', finalItemSeparator, null, null, 'lab');
    
    setSnackbarMessage('設定已儲存，需重新讀取卡片/新資料才會生效');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    
    // Update app settings - ONLY update lab section, preserve everything else
    setAppSettings(prev => {
      const newSettings = {
        ...prev,
        lab: {
          ...prev.lab,
          customLabHeaderCopyFormat: finalHeaderFormat,
          customLabItemCopyFormat: finalItemFormat,
          enableLabCustomCopyFormat: true,
          copyLabFormat: formatType,
          itemSeparator: finalItemSeparator
        }
      };
      
      // Log the updated section for debugging
      console.log('Lab format settings updated:', {
        section: 'lab',
        changes: newSettings.lab
      });
      
      return newSettings;
    });
  };
  
  // Add a preset group of elements to the header format
  const addHeaderPresetGroup = () => {
    const diagnosisGroup = [
      { id: 'lab_text', value: '[', display: '[', group: 'format', section: ELEMENT_SECTIONS.HEADER },
      { id: 'date', display: '日期', group: 'header', section: ELEMENT_SECTIONS.HEADER },
      { id: 'header_text', value: ' - ', display: ' - ', group: 'format', section: ELEMENT_SECTIONS.HEADER },
      { id: 'hosp', display: '醫院', group: 'header', section: ELEMENT_SECTIONS.HEADER },
      { id: 'lab_text', value: ']', display: ']', group: 'format', section: ELEMENT_SECTIONS.HEADER }
    ];
    
    diagnosisGroup.forEach(item => addHeaderItem(item));
    setSnackbarMessage('已添加日期醫院群組');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  // Handle item separator change
  const handleItemSeparatorChange = (newValue) => {
    setItemSeparator(newValue);
  };

  return {
    headerFormat,
    setHeaderFormat,
    itemFormat,
    setItemFormat,
    enableLabCustomFormat,
    setEnableLabCustomFormat,
    customTextValue,
    setCustomTextValue,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    itemSeparator,
    setItemSeparator: handleItemSeparatorChange,
    selectedItems,
    setSelectedItems,
    sortMenuAnchor,
    setSortMenuAnchor,
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
  };
};

export default useFormatEditorState; 