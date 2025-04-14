// Element and group configurations for the lab format editor

// Define all color settings in one place
export const colorSettings = {
  // Base colors for element groups
  headerBase: '#e3f2fd', // 確保這是藍色系 (淺藍色)
  labItemBase: '#e8f5e9',
  labValueBase: '#fff3e0',
  formatBase: '#f3e5f5', // 這是粉色系
  
  // Transparency levels
  transparency: {
    light: '40',    // 25% opacity
    medium: '80',   // 50% opacity
    full: ''        // 100% opacity
  },
  
  // Special element colors
  spaceColor: '#f3e5f5',
  
  // Hover effects
  hoverEffect: 'rgba(0, 0, 0, 0.05)',
  
  // Text color for add button
  addButtonColor: '#9c27b0'
};

// Element groups with styling information
export const elementGroups = {
  header: { 
    name: '標題元素', 
    color: colorSettings.headerBase,
    lightColor: colorSettings.headerBase + colorSettings.transparency.light,
    mediumColor: colorSettings.headerBase + colorSettings.transparency.medium,
  },
  labItem: { 
    name: '檢驗項目元素', 
    color: colorSettings.labItemBase,
    lightColor: colorSettings.labItemBase + colorSettings.transparency.light,
    mediumColor: colorSettings.labItemBase + colorSettings.transparency.medium,
  },
  labValue: { 
    name: '檢驗值元素', 
    color: colorSettings.labValueBase,
    lightColor: colorSettings.labValueBase + colorSettings.transparency.light,
    mediumColor: colorSettings.labValueBase + colorSettings.transparency.medium,
  },
  format: { 
    name: '格式元素', 
    color: colorSettings.formatBase,
    lightColor: colorSettings.formatBase + colorSettings.transparency.light,
    mediumColor: colorSettings.formatBase + colorSettings.transparency.medium,
  }
};

// Define element sections
export const ELEMENT_SECTIONS = {
  LABHEADER: 'labheader',
  LABCONTENT: 'labcontent',
  BOTH: 'both'
};

// All possible elements that can be used, with explicit section property
const allElements = [
  // Header specific elements
  { id: 'date', display: '日期', group: 'header', section: ELEMENT_SECTIONS.LABHEADER },
  { id: 'hosp', display: '醫院', group: 'header', section: ELEMENT_SECTIONS.LABHEADER },
  
  // Lab specific elements
  { id: 'itemName', display: '檢驗項目名稱', group: 'labItem', section: ELEMENT_SECTIONS.LABCONTENT },
  { id: 'orderCode', display: '檢驗代碼', group: 'labItem', section: ELEMENT_SECTIONS.LABCONTENT },
  { id: 'value', display: '檢驗值', group: 'labValue', section: ELEMENT_SECTIONS.LABCONTENT },
  { id: 'unit', display: '單位', group: 'labValue', section: ELEMENT_SECTIONS.LABCONTENT },
  { id: 'consultValue', display: '參考值', group: 'labValue', section: ELEMENT_SECTIONS.LABCONTENT },
  
  // Shared elements with unique section-specific IDs
  { id: 'header_space', display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.LABHEADER },
  { id: 'lab_space', display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.LABCONTENT },
  { id: 'header_text', display: '自訂文字', value: '自訂文字', group: 'format', section: ELEMENT_SECTIONS.LABHEADER },
  { id: 'lab_text', display: '自訂文字', value: '自訂文字', group: 'format', section: ELEMENT_SECTIONS.LABCONTENT },
  { id: 'newline', display: '換行', group: 'format', section: ELEMENT_SECTIONS.LABCONTENT } // Newline for lab section only
];

// Helper function to get elements by section
export const getElementsBySection = (section) => {
  return allElements.filter(el => el.section === section || el.section === ELEMENT_SECTIONS.BOTH);
};

// Get header elements
export const getHeaderElements = () => getElementsBySection(ELEMENT_SECTIONS.LABHEADER);

// Get lab elements
export const getLabElements = () => getElementsBySection(ELEMENT_SECTIONS.LABCONTENT);

// Available elements filtered by format type
export const getAvailableElements = (itemSeparator, formatType = 'all') => {
  // Determine which elements to include based on format type
  let elements = [];
  
  if (formatType === 'header') {
    // Only include header elements
    elements = getHeaderElements();
  } else if (formatType === 'lab') {
    // Only include lab elements and lab separator
    elements = getLabElements();
    
    // Create an itemsep element for lab item separator
    const itemsepElement = { 
      id: 'itemsep', 
      display: '檢驗項目分隔符', 
      value: itemSeparator || ',', 
      group: 'format',
      section: ELEMENT_SECTIONS.LABCONTENT
    };
    
    elements.push(itemsepElement);
  } else {
    // Include all elements
    elements = [...allElements];
    
    // Add lab item separator
    const itemsepElement = { 
      id: 'itemsep', 
      display: '檢驗項目分隔符', 
      value: itemSeparator || ',', 
      group: 'format',
      section: ELEMENT_SECTIONS.LABCONTENT
    };
    
    elements.push(itemsepElement);
  }
  
  return elements;
};

// Preview header data - centralized here for consistent display
export const previewHeader = {
  date: '2025/04/01',
  hosp: '台灣好棒棒醫院'
};

// Sample lab data for preview
export const previewLabItems = [
  {
    itemName: 'Cholesterol',
    orderCode: '09001C',
    value: '211',
    unit: 'mg/dL',
    consultValue: '[＜200][]'
  },
  {
    itemName: 'GOT/AST',
    orderCode: '09025C',
    value: '17',
    unit: 'U/L',
    consultValue: '[13][39]'
  },
  {
    itemName: 'Creatinine',
    orderCode: '09015C',
    value: '8.21',
    unit: 'mg/dl',
    consultValue: '[0.60][1.20]'
  }
];

// Counter for generating unique IDs in default formats
let defaultIdCounter = 1;

// Default header format - updated with section-specific IDs
export const getDefaultHeaderFormat = () => {
  // Reset counter for default format
  defaultIdCounter = 1;
  return [
    { id: `date_${defaultIdCounter++}`, display: '日期', group: 'header', section: ELEMENT_SECTIONS.LABHEADER },
    { id: `header_text_${defaultIdCounter++}`, value: ' - ', display: ' - ', group: 'format', section: ELEMENT_SECTIONS.LABHEADER },
    { id: `hosp_${defaultIdCounter++}`, display: '醫院', group: 'header', section: ELEMENT_SECTIONS.LABHEADER }
  ];
};

// Default lab item format - updated with section-specific IDs
export const getDefaultLabItemFormat = () => {
  // Continue counter from header format
  return [
    { id: `itemName_${defaultIdCounter++}`, display: '檢驗項目名稱', group: 'labItem', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `lab_text_${defaultIdCounter++}`, value: '(', display: '(', group: 'format', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `orderCode_${defaultIdCounter++}`, display: '檢驗代碼', group: 'labItem', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `lab_text_${defaultIdCounter++}`, value: ')', display: ')', group: 'format', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `lab_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `value_${defaultIdCounter++}`, display: '檢驗值', group: 'labValue', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `lab_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `unit_${defaultIdCounter++}`, display: '單位', group: 'labValue', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `lab_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `lab_text_${defaultIdCounter++}`, value: '(參考值: ', display: '(參考值: ', group: 'format', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `consultValue_${defaultIdCounter++}`, display: '參考值', group: 'labValue', section: ELEMENT_SECTIONS.LABCONTENT },
    { id: `lab_text_${defaultIdCounter++}`, value: ')', display: ')', group: 'format', section: ELEMENT_SECTIONS.LABCONTENT }
  ];
};

// Render a single element with appropriate value
// This function is used by FormatPreview.jsx
export const renderElem = (item, index, labData) => {
  // Handle section-specific elements
  let baseId = item.id.split('_')[0];
  
  // Handle section-specific elements
  if (baseId === 'header' || baseId === 'lab') {
    // Extract the actual element type after the section prefix
    const parts = item.id.split('_');
    if (parts.length > 1) {
      baseId = parts[1];
    }
  }
  
  // 使用 Map 數據結構代替多個 if-else 或 switch-case 語句
  const elementValuesMap = new Map([
    ['date', previewHeader.date],
    ['hosp', previewHeader.hosp],
    ['itemName', labData?.itemName || ''],
    ['orderCode', labData?.orderCode || ''],
    ['value', labData?.value || ''],
    ['unit', labData?.unit || ''],
    ['consultValue', labData?.consultValue || ''],
    ['space', ' '],
    ['itemsep', item.value],
    ['newline', '\n'],
    ['separator', item.value],
    ['text', item.value]
  ]);
  
  // 優先使用格式元素的值（如果存在）
  if (item.group === 'format' && item.value) {
    return item.value;
  }
  
  // 從 Map 中獲取元素值或返回空字符串
  return elementValuesMap.get(baseId) || '';
}; 