import { Box, Button, TextField, IconButton, InputAdornment } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// 檢驗報告複製格式編輯器 config(階段5 Task 6)—— 內容逐字搬自舊
// src/components/tabs/labCopyFormat/{formatEditorConfig.js, FormatElementsPanel.jsx} ，
// 對接階段5 Task 5 定案的通用模組介面。行為(可用元素排版、預設格式、預覽渲染、加入日期-醫院
// 預設群組按鈕)與舊版一致。

const colorSettings = {
  headerBase: '#e3f2fd',
  labItemBase: '#e8f5e9',
  labValueBase: '#fff3e0',
  formatBase: '#f3e5f5',
  transparency: {
    light: '40',
    medium: '80',
    full: ''
  },
  spaceColor: '#f3e5f5',
  hoverEffect: 'rgba(0, 0, 0, 0.05)',
  addButtonColor: '#9c27b0'
};

const elementGroups = {
  header: {
    name: '標題元素',
    color: colorSettings.headerBase,
    lightColor: colorSettings.headerBase + colorSettings.transparency.light,
    mediumColor: colorSettings.headerBase + colorSettings.transparency.medium
  },
  labItem: {
    name: '檢驗項目元素',
    color: colorSettings.labItemBase,
    lightColor: colorSettings.labItemBase + colorSettings.transparency.light,
    mediumColor: colorSettings.labItemBase + colorSettings.transparency.medium
  },
  labValue: {
    name: '檢驗值元素',
    color: colorSettings.labValueBase,
    lightColor: colorSettings.labValueBase + colorSettings.transparency.light,
    mediumColor: colorSettings.labValueBase + colorSettings.transparency.medium
  },
  format: {
    name: '格式元素',
    color: colorSettings.formatBase,
    lightColor: colorSettings.formatBase + colorSettings.transparency.light,
    mediumColor: colorSettings.formatBase + colorSettings.transparency.medium
  }
};

const SECTIONS = { HEADER: 'labheader', ITEM: 'labcontent', BOTH: 'both' };

const allElements = [
  { id: 'date', display: '日期', group: 'header', section: SECTIONS.HEADER },
  { id: 'hosp', display: '醫院', group: 'header', section: SECTIONS.HEADER },

  { id: 'itemName', display: '檢驗項目名稱', group: 'labItem', section: SECTIONS.ITEM },
  { id: 'orderCode', display: '檢驗代碼', group: 'labItem', section: SECTIONS.ITEM },
  { id: 'value', display: '檢驗值', group: 'labValue', section: SECTIONS.ITEM },
  { id: 'unit', display: '單位', group: 'labValue', section: SECTIONS.ITEM },
  { id: 'consultValue', display: '參考值', group: 'labValue', section: SECTIONS.ITEM },

  { id: 'header_space', display: '(空格)', value: ' ', group: 'format', section: SECTIONS.HEADER },
  { id: 'lab_space', display: '(空格)', value: ' ', group: 'format', section: SECTIONS.ITEM },
  { id: 'header_text', display: '自訂文字', value: '自訂文字', group: 'format', section: SECTIONS.HEADER },
  { id: 'lab_text', display: '自訂文字', value: '自訂文字', group: 'format', section: SECTIONS.ITEM },
  { id: 'newline', display: '換行', group: 'format', section: SECTIONS.ITEM }
];

const getElementsBySection = (section) => allElements.filter(el => el.section === section || el.section === SECTIONS.BOTH);
const getHeaderElements = () => getElementsBySection(SECTIONS.HEADER);
const getItemElements = () => getElementsBySection(SECTIONS.ITEM);

const getAvailableElements = (itemSeparator, formatType = 'all') => {
  let elements = [];

  if (formatType === 'header') {
    elements = getHeaderElements();
  } else if (formatType === 'item') {
    elements = getItemElements();
    elements.push({ id: 'itemsep', display: '檢驗項目分隔符', value: itemSeparator || ',', group: 'format', section: SECTIONS.ITEM });
  } else {
    elements = [...allElements];
    elements.push({ id: 'itemsep', display: '檢驗項目分隔符', value: itemSeparator || ',', group: 'format', section: SECTIONS.ITEM });
  }

  return elements;
};

const previewHeader = {
  date: '2025/04/01',
  hosp: '台灣好棒棒醫院'
};

const previewLabItems = [
  { itemName: 'Cholesterol', orderCode: '09001C', value: '211', unit: 'mg/dL', consultValue: '[＜200][]' },
  { itemName: 'GOT/AST', orderCode: '09025C', value: '17', unit: 'U/L', consultValue: '[13][39]' },
  { itemName: 'Creatinine', orderCode: '09015C', value: '8.21', unit: 'mg/dl', consultValue: '[0.60][1.20]' }
];

let defaultIdCounter = 1;

const getDefaultHeaderFormat = () => {
  defaultIdCounter = 1;
  return [
    { id: `date_${defaultIdCounter++}`, display: '日期', group: 'header', section: SECTIONS.HEADER },
    { id: `header_text_${defaultIdCounter++}`, value: ' - ', display: ' - ', group: 'format', section: SECTIONS.HEADER },
    { id: `hosp_${defaultIdCounter++}`, display: '醫院', group: 'header', section: SECTIONS.HEADER }
  ];
};

const getDefaultItemFormat = () => ([
  { id: `itemName_${defaultIdCounter++}`, display: '檢驗項目名稱', group: 'labItem', section: SECTIONS.ITEM },
  { id: `lab_text_${defaultIdCounter++}`, value: '(', display: '(', group: 'format', section: SECTIONS.ITEM },
  { id: `orderCode_${defaultIdCounter++}`, display: '檢驗代碼', group: 'labItem', section: SECTIONS.ITEM },
  { id: `lab_text_${defaultIdCounter++}`, value: ')', display: ')', group: 'format', section: SECTIONS.ITEM },
  { id: `lab_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: SECTIONS.ITEM },
  { id: `value_${defaultIdCounter++}`, display: '檢驗值', group: 'labValue', section: SECTIONS.ITEM },
  { id: `lab_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: SECTIONS.ITEM },
  { id: `unit_${defaultIdCounter++}`, display: '單位', group: 'labValue', section: SECTIONS.ITEM },
  { id: `lab_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: SECTIONS.ITEM },
  { id: `lab_text_${defaultIdCounter++}`, value: '(參考值: ', display: '(參考值: ', group: 'format', section: SECTIONS.ITEM },
  { id: `consultValue_${defaultIdCounter++}`, display: '參考值', group: 'labValue', section: SECTIONS.ITEM },
  { id: `lab_text_${defaultIdCounter++}`, value: ')', display: ')', group: 'format', section: SECTIONS.ITEM }
]);

// 用於預覽渲染 —— 對齊舊版 renderElem
const renderElem = (item, index, labData) => {
  let baseId = item.id.split('_')[0];

  if (baseId === 'header' || baseId === 'lab') {
    const parts = item.id.split('_');
    if (parts.length > 1) baseId = parts[1];
  }

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

  if (item.group === 'format' && item.value) {
    return item.value;
  }

  return elementValuesMap.get(baseId) || '';
};

const findElement = (list, id, prefix, section) => list.find(item => (
  item.id === id ||
  item.id === `${prefix}_${id}` ||
  (item.id.startsWith(id) && item.section === section)
));

// 以一般函式(非 PascalCase 元件)回傳 JSX，避免與本檔案的 default export(非元件的 config
// 物件)混在一起觸發 react-refresh/only-export-components 警告；輸出的 JSX 與原本用元件寫法完全相同。
const elementButton = (item, onClick) => (
  <Button
    fullWidth
    size="small"
    variant="text"
    startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
    onClick={onClick}
    sx={{
      justifyContent: 'flex-start',
      color: 'text.primary',
      fontSize: '0.75rem',
      py: 0.3,
      minHeight: '24px',
      textTransform: 'none'
    }}
  >
    {item.display}
  </Button>
);

const customTextField = ({ placeholder, localTextValue, setLocalTextValue, onAddCustomText }) => (
  <TextField
    size="small"
    placeholder={placeholder}
    value={localTextValue}
    onChange={(e) => setLocalTextValue(e.target.value)}
    sx={{
      fontSize: '0.8rem',
      height: '28px',
      '& .MuiOutlinedInput-root': {
        bgcolor: '#fff',
        height: '28px',
        '& input': { padding: '2px 8px' }
      }
    }}
    InputProps={{
      endAdornment: (
        <InputAdornment position="end">
          <IconButton
            size="small"
            onClick={onAddCustomText}
            disabled={!localTextValue.trim()}
            sx={{ color: elementGroups.format.color, padding: '1px' }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </InputAdornment>
      )
    }}
  />
);

const renderHeaderElements = ({ availableElements, onAddItem, localTextValue, setLocalTextValue, onAddCustomText }) => {
  const dateElement = findElement(availableElements, 'date', 'header', SECTIONS.HEADER);
  const hospElement = findElement(availableElements, 'hosp', 'header', SECTIONS.HEADER);
  const spaceElement = findElement(availableElements, 'space', 'header', SECTIONS.HEADER);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
        {dateElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(dateElement, () => onAddItem(dateElement))}
          </Box>
        )}
        {hospElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(hospElement, () => onAddItem(hospElement))}
          </Box>
        )}
      </Box>

      {spaceElement && (
        <Box sx={{ mb: 0.5, bgcolor: elementGroups.format.mediumColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          {elementButton(spaceElement, () => onAddItem(spaceElement))}
        </Box>
      )}

      {customTextField({
        placeholder: '輸入標題文字',
        localTextValue,
        setLocalTextValue,
        onAddCustomText
      })}
    </>
  );
};

const renderItemElements = ({ availableElements, onAddItem, localTextValue, setLocalTextValue, onAddCustomText }) => {
  const itemNameElement = findElement(availableElements, 'itemName', 'lab', SECTIONS.ITEM);
  const orderCodeElement = findElement(availableElements, 'orderCode', 'lab', SECTIONS.ITEM);
  const valueElement = findElement(availableElements, 'value', 'lab', SECTIONS.ITEM);
  const unitElement = findElement(availableElements, 'unit', 'lab', SECTIONS.ITEM);
  const consultValueElement = findElement(availableElements, 'consultValue', 'lab', SECTIONS.ITEM);
  const spaceElement = findElement(availableElements, 'space', 'lab', SECTIONS.ITEM);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
        {itemNameElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.labItem.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(itemNameElement, () => onAddItem(itemNameElement))}
          </Box>
        )}
        {valueElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.labValue.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(valueElement, () => onAddItem(valueElement))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
        {orderCodeElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.labItem.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(orderCodeElement, () => onAddItem(orderCodeElement))}
          </Box>
        )}
        {unitElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.labValue.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(unitElement, () => onAddItem(unitElement))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 0.5 }}>
        {consultValueElement && (
          <Box sx={{ bgcolor: elementGroups.labValue.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(consultValueElement, () => onAddItem(consultValueElement))}
          </Box>
        )}
        {spaceElement && (
          <Box sx={{ bgcolor: elementGroups.format.mediumColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(spaceElement, () => onAddItem(spaceElement))}
          </Box>
        )}
      </Box>

      {customTextField({
        placeholder: '輸入檢驗項目文字',
        localTextValue,
        setLocalTextValue,
        onAddCustomText
      })}
    </>
  );
};

const renderAvailableElements = (params) => (
  params.formatType === 'header' ? renderHeaderElements(params) : renderItemElements(params)
);

const labConfig = {
  kind: 'lab',
  sections: SECTIONS,
  itemPrefix: 'lab',
  itemGroupKey: 'labItem',
  storageSettingsKey: 'lab',
  settingsKeys: {
    enableCustomFormat: 'enableLabCustomCopyFormat',
    headerFormat: 'customLabHeaderCopyFormat',
    itemFormat: 'customLabItemCopyFormat',
    formatType: 'copyLabFormat',
    separator: 'itemSeparator'
  },
  defaultSeparator: ',',
  getAvailableElements,
  getDefaultHeaderFormat,
  getDefaultItemFormat,
  // lab 版「加入預設群組」真的會插入「日期 - 醫院」群組(見舊 labCopyFormat/useFormatEditorState.js)
  headerPresetGroup: {
    items: [
      { id: 'lab_text', value: '[', display: '[', group: 'format', section: SECTIONS.HEADER },
      { id: 'date', display: '日期', group: 'header', section: SECTIONS.HEADER },
      { id: 'header_text', value: ' - ', display: ' - ', group: 'format', section: SECTIONS.HEADER },
      { id: 'hosp', display: '醫院', group: 'header', section: SECTIONS.HEADER },
      { id: 'lab_text', value: ']', display: ']', group: 'format', section: SECTIONS.HEADER }
    ],
    successMessage: '已添加日期醫院群組'
  },
  separatorElementId: 'itemsep',

  elementGroups,
  colorSettings,
  labels: {
    separatorLabel: '檢驗項目分隔符:',
    presetButtonText: '加入基本日期組合'
  },
  separatorVisibility: 'horizontalOnly',
  renderAvailableElements,

  renderElem,
  validateSections: false,
  showCaptions: true,
  previewHeaderData: previewHeader,
  previewItemsData: previewLabItems,
  itemSeparatorCaption: (separator) => `檢驗項目分隔符號: "${separator}"`,
  verticalCaption: '每個檢驗項目獨立一行顯示'
};

export default labConfig;
