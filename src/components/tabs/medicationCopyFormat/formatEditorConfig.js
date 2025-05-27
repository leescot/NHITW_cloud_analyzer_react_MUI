// Element and group configurations for the format editor

// Define all color settings in one place
export const colorSettings = {
  // Base colors for element groups
  headerBase: '#e3f2fd', // 確保這是藍色系 (淺藍色)
  medicationBase: '#e8f5e9',
  dosageBase: '#fff3e0',
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

// Element groups with styling information - now with expanded color settings
export const elementGroups = {
  header: { 
    name: '標題元素', 
    color: colorSettings.headerBase,
    lightColor: colorSettings.headerBase + colorSettings.transparency.light,
    mediumColor: colorSettings.headerBase + colorSettings.transparency.medium,
  },
  medication: { 
    name: '藥物元素', 
    color: colorSettings.medicationBase,
    lightColor: colorSettings.medicationBase + colorSettings.transparency.light,
    mediumColor: colorSettings.medicationBase + colorSettings.transparency.medium,
  },
  dosage: { 
    name: '劑量元素', 
    color: colorSettings.dosageBase,
    lightColor: colorSettings.dosageBase + colorSettings.transparency.light,
    mediumColor: colorSettings.dosageBase + colorSettings.transparency.medium,
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
  HEADER: 'header',
  DRUG: 'drug',
  BOTH: 'both'
};

// All possible elements that can be used, with explicit section property
const allElements = [
  // Header specific elements
  { id: 'date', display: '日期', group: 'header', section: ELEMENT_SECTIONS.HEADER },
  { id: 'hosp', display: '醫院', group: 'header', section: ELEMENT_SECTIONS.HEADER },
  { id: 'icdcode', display: 'ICD代碼', group: 'header', section: ELEMENT_SECTIONS.HEADER },
  { id: 'icdname', display: 'ICD名稱', group: 'header', section: ELEMENT_SECTIONS.HEADER },
  
  // Drug specific elements
  { id: 'name', display: '藥物名稱', group: 'medication', section: ELEMENT_SECTIONS.DRUG },
  { id: 'simplifiedname', display: '簡化藥名', group: 'medication', section: ELEMENT_SECTIONS.DRUG },
  { id: 'ingredient', display: '成份名', group: 'medication', section: ELEMENT_SECTIONS.DRUG },
  { id: 'perDosage', display: '單次劑量', group: 'dosage', section: ELEMENT_SECTIONS.DRUG },
  { id: 'frequency', display: '頻次', group: 'dosage', section: ELEMENT_SECTIONS.DRUG },
  { id: 'days', display: '天數', group: 'dosage', section: ELEMENT_SECTIONS.DRUG },
  
  // Shared elements with unique section-specific IDs
  { id: 'header_space', display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.HEADER },
  { id: 'drug_space', display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.DRUG },
  { id: 'header_text', display: '自訂文字', value: '自訂文字', group: 'format', section: ELEMENT_SECTIONS.HEADER },
  { id: 'drug_text', display: '自訂文字', value: '自訂文字', group: 'format', section: ELEMENT_SECTIONS.DRUG },
  { id: 'newline', display: '換行', group: 'format', section: ELEMENT_SECTIONS.DRUG } // Newline for drug section only
];

// Helper function to get elements by section
export const getElementsBySection = (section) => {
  return allElements.filter(el => el.section === section || el.section === ELEMENT_SECTIONS.BOTH);
};

// Get header elements
export const getHeaderElements = () => getElementsBySection(ELEMENT_SECTIONS.HEADER);

// Get drug elements
export const getDrugElements = () => getElementsBySection(ELEMENT_SECTIONS.DRUG);

// Available elements filtered by format type
export const getAvailableElements = (drugSeparator, formatType = 'all') => {
  // Determine which elements to include based on format type
  let elements = [];
  
  if (formatType === 'header') {
    // Only include header elements
    elements = getHeaderElements();
  } else if (formatType === 'drug') {
    // Only include drug elements and drug separator
    elements = getDrugElements();
    
    // Create a drugsep element for drug separator
    const drugsepElement = { 
      id: 'drugsep', 
      display: '藥品分隔字元', 
      value: drugSeparator || ',', 
      group: 'format',
      section: ELEMENT_SECTIONS.DRUG
    };
    
    elements.push(drugsepElement);
  } else {
    // Include all elements
    elements = [...allElements];
    
    // Add drug separator
    const drugsepElement = { 
      id: 'drugsep', 
      display: '藥品分隔字元', 
      value: drugSeparator || ',', 
      group: 'format',
      section: ELEMENT_SECTIONS.DRUG
    };
    
    elements.push(drugsepElement);
  }
  
  return elements;
};

// Preview header data - centralized here for consistent display
export const previewHeader = {
  date: '2025/04/01',
  hosp: '台灣好棒棒醫院',
  icdcode: 'I10',
  icdname: '高血壓'
};

// Sample drug data for preview
export const previewDrugs = [
  {
    name: 'NORVASC TABLETS 5MG',
    simplifiedname: 'NORVASC (5)',
    ingredient: 'Amlodipine (Besylate)',
    perDosage: '1',
    frequency: 'BID',
    days: '30'
  },
  {
    name: 'ZULITOR TABLETS 4MG',
    simplifiedname: 'ZULITOR (4)',
    ingredient: 'Pitavastatin Calcium',
    perDosage: '0.5',
    frequency: 'HS',
    days: '30'
  },
  {
    name: 'TAKEPRON OD 30MG TABLETS',
    simplifiedname: 'TAKEPRON OD (30)',
    ingredient: 'Lansoprazole',
    perDosage: '1',
    frequency: 'QD',
    days: '14'
  }
];

// Counter for generating unique IDs in default formats
let defaultIdCounter = 1;

// Default header format - updated with section-specific IDs
export const getDefaultHeaderFormat = () => {
  // Reset counter for default format
  defaultIdCounter = 1;
  return [
    { id: `date_${defaultIdCounter++}`, display: '日期', group: 'header', section: ELEMENT_SECTIONS.HEADER },
    { id: `header_text_${defaultIdCounter++}`, value: ' - ', display: ' - ', group: 'format', section: ELEMENT_SECTIONS.HEADER },
    { id: `hosp_${defaultIdCounter++}`, display: '醫院', group: 'header', section: ELEMENT_SECTIONS.HEADER },
    { id: `header_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.HEADER },
    { id: `header_text_${defaultIdCounter++}`, value: '[', display: '[', group: 'format', section: ELEMENT_SECTIONS.HEADER },
    { id: `icdcode_${defaultIdCounter++}`, display: 'ICD代碼', group: 'header', section: ELEMENT_SECTIONS.HEADER },
    { id: `header_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.HEADER },
    { id: `icdname_${defaultIdCounter++}`, display: 'ICD名稱', group: 'header', section: ELEMENT_SECTIONS.HEADER },
    { id: `header_text_${defaultIdCounter++}`, value: ']', display: ']', group: 'format', section: ELEMENT_SECTIONS.HEADER }
  ];
};

// Default drug format - updated with section-specific IDs
export const getDefaultDrugFormat = () => {
  // Continue counter from header format
  return [
    { id: `simplifiedname_${defaultIdCounter++}`, display: '簡化藥名', group: 'medication', section: ELEMENT_SECTIONS.DRUG },
    { id: `drug_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.DRUG },
    { id: `perDosage_${defaultIdCounter++}`, display: '單次劑量', group: 'dosage', section: ELEMENT_SECTIONS.DRUG },
    { id: `drug_text_${defaultIdCounter++}`, value: '#', display: '#', group: 'format', section: ELEMENT_SECTIONS.DRUG },
    { id: `drug_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.DRUG },
    { id: `frequency_${defaultIdCounter++}`, display: '頻次', group: 'dosage', section: ELEMENT_SECTIONS.DRUG },
    { id: `drug_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: ELEMENT_SECTIONS.DRUG },
    { id: `days_${defaultIdCounter++}`, display: '天數', group: 'dosage', section: ELEMENT_SECTIONS.DRUG },
    { id: `drug_text_${defaultIdCounter++}`, value: '天', display: '天', group: 'format', section: ELEMENT_SECTIONS.DRUG }
  ];
};

// Render a single element with appropriate value
// This function is used by FormatPreview.jsx and should not be deleted
export const renderElem = (item, index, drugData) => {
  // Special handling for ICD elements which have underscore in their base ID
  let baseId = item.id.split('_')[0];
  
  // Handle section-specific elements
  if (baseId === 'header' || baseId === 'drug') {
    // Extract the actual element type after the section prefix
    const parts = item.id.split('_');
    if (parts.length > 1) {
      baseId = parts[1];
    }
  } else if (item.id.includes('icdcode')) {
    baseId = 'icdcode';
  } else if (item.id.includes('icdname')) {
    baseId = 'icdname';
  }
  
  // 使用 Map 數據結構代替多個 if-else 或 switch-case 語句 #zh-TW
  const elementValuesMap = new Map([
    ['date', previewHeader.date],
    ['hosp', previewHeader.hosp],
    ['icdcode', previewHeader.icdcode],
    ['icdname', previewHeader.icdname],
    ['name', drugData?.name || ''],
    ['simplifiedname', drugData?.simplifiedname || ''],
    ['ingredient', drugData?.ingredient || ''],
    ['perDosage', drugData?.perDosage || ''],
    ['frequency', drugData?.frequency || ''],
    ['days', drugData?.days || ''],
    ['space', ' '],
    ['drugsep', item.value],
    ['newline', '\n'],
    ['separator', item.value],
    ['text', item.value]
  ]);
  
  // 優先使用格式元素的值（如果存在） #zh-TW
  if (item.group === 'format' && item.value) {
    return item.value;
  }
  
  // 從 Map 中擷取值，如果找不到則返回空字符串 #zh-TW
  return elementValuesMap.get(baseId) || '';
}; 