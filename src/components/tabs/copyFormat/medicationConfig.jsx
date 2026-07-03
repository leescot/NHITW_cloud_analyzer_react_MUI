import { Box, Button, TextField, IconButton, InputAdornment } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// 西藥複製格式編輯器 config(階段5 Task 6)—— 內容逐字搬自舊
// src/components/tabs/medicationCopyFormat/{formatEditorConfig.js, FormatElementsPanel.jsx} ，
// 對接階段5 Task 5 定案的通用模組介面。行為(可用元素排版、預設格式、預覽渲染)與舊版一致，
// 唯一刻意變更：不設定 labels.presetButtonText —— 舊 medication UI 從未渲染過「加入預設群組」
// 按鈕(headerPresetGroup 也是 null，只顯示提示訊息)，若設定 presetButtonText 會多長出一顆
// 舊版沒有的按鈕，違反「行為零變更」要求(見審查結論)。

const colorSettings = {
  headerBase: '#e3f2fd',
  medicationBase: '#e8f5e9',
  dosageBase: '#fff3e0',
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
  medication: {
    name: '藥物元素',
    color: colorSettings.medicationBase,
    lightColor: colorSettings.medicationBase + colorSettings.transparency.light,
    mediumColor: colorSettings.medicationBase + colorSettings.transparency.medium
  },
  dosage: {
    name: '劑量元素',
    color: colorSettings.dosageBase,
    lightColor: colorSettings.dosageBase + colorSettings.transparency.light,
    mediumColor: colorSettings.dosageBase + colorSettings.transparency.medium
  },
  format: {
    name: '格式元素',
    color: colorSettings.formatBase,
    lightColor: colorSettings.formatBase + colorSettings.transparency.light,
    mediumColor: colorSettings.formatBase + colorSettings.transparency.medium
  }
};

const SECTIONS = { HEADER: 'header', ITEM: 'drug', BOTH: 'both' };

const allElements = [
  { id: 'date', display: '日期', group: 'header', section: SECTIONS.HEADER },
  { id: 'hosp', display: '醫院', group: 'header', section: SECTIONS.HEADER },
  { id: 'icdcode', display: 'ICD代碼', group: 'header', section: SECTIONS.HEADER },
  { id: 'icdname', display: 'ICD名稱', group: 'header', section: SECTIONS.HEADER },

  { id: 'name', display: '藥物名稱', group: 'medication', section: SECTIONS.ITEM },
  { id: 'simplifiedname', display: '簡化藥名', group: 'medication', section: SECTIONS.ITEM },
  { id: 'ingredient', display: '成份名', group: 'medication', section: SECTIONS.ITEM },
  { id: 'perDosage', display: '單次劑量', group: 'dosage', section: SECTIONS.ITEM },
  { id: 'frequency', display: '頻次', group: 'dosage', section: SECTIONS.ITEM },
  { id: 'days', display: '天數', group: 'dosage', section: SECTIONS.ITEM },

  { id: 'header_space', display: '(空格)', value: ' ', group: 'format', section: SECTIONS.HEADER },
  { id: 'drug_space', display: '(空格)', value: ' ', group: 'format', section: SECTIONS.ITEM },
  { id: 'header_text', display: '自訂文字', value: '自訂文字', group: 'format', section: SECTIONS.HEADER },
  { id: 'drug_text', display: '自訂文字', value: '自訂文字', group: 'format', section: SECTIONS.ITEM },
  { id: 'newline', display: '換行', group: 'format', section: SECTIONS.ITEM }
];

const getElementsBySection = (section) => allElements.filter(el => el.section === section || el.section === SECTIONS.BOTH);
const getHeaderElements = () => getElementsBySection(SECTIONS.HEADER);
const getItemElements = () => getElementsBySection(SECTIONS.ITEM);

const getAvailableElements = (drugSeparator, formatType = 'all') => {
  let elements = [];

  if (formatType === 'header') {
    elements = getHeaderElements();
  } else if (formatType === 'item') {
    elements = getItemElements();
    elements.push({ id: 'drugsep', display: '藥品分隔符', value: drugSeparator || ',', group: 'format', section: SECTIONS.ITEM });
  } else {
    elements = [...allElements];
    elements.push({ id: 'drugsep', display: '藥品分隔符', value: drugSeparator || ',', group: 'format', section: SECTIONS.ITEM });
  }

  return elements;
};

const previewHeader = {
  date: '2025/04/01',
  hosp: '台灣好棒棒醫院',
  icdcode: 'I10',
  icdname: '高血壓'
};

const previewDrugs = [
  { name: 'NORVASC TABLETS 5MG', simplifiedname: 'NORVASC (5)', ingredient: 'Amlodipine (Besylate)', perDosage: '1', frequency: 'BID', days: '30' },
  { name: 'ZULITOR TABLETS 4MG', simplifiedname: 'ZULITOR (4)', ingredient: 'Pitavastatin Calcium', perDosage: '0.5', frequency: 'HS', days: '30' },
  { name: 'TAKEPRON OD 30MG TABLETS', simplifiedname: 'TAKEPRON OD (30)', ingredient: 'Lansoprazole', perDosage: '1', frequency: 'QD', days: '14' }
];

let defaultIdCounter = 1;

const getDefaultHeaderFormat = () => {
  defaultIdCounter = 1;
  return [
    { id: `date_${defaultIdCounter++}`, display: '日期', group: 'header', section: SECTIONS.HEADER },
    { id: `header_text_${defaultIdCounter++}`, value: ' - ', display: ' - ', group: 'format', section: SECTIONS.HEADER },
    { id: `hosp_${defaultIdCounter++}`, display: '醫院', group: 'header', section: SECTIONS.HEADER },
    { id: `header_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: SECTIONS.HEADER },
    { id: `header_text_${defaultIdCounter++}`, value: '[', display: '[', group: 'format', section: SECTIONS.HEADER },
    { id: `icdcode_${defaultIdCounter++}`, display: 'ICD代碼', group: 'header', section: SECTIONS.HEADER },
    { id: `header_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: SECTIONS.HEADER },
    { id: `icdname_${defaultIdCounter++}`, display: 'ICD名稱', group: 'header', section: SECTIONS.HEADER },
    { id: `header_text_${defaultIdCounter++}`, value: ']', display: ']', group: 'format', section: SECTIONS.HEADER }
  ];
};

const getDefaultItemFormat = () => ([
  { id: `simplifiedname_${defaultIdCounter++}`, display: '簡化藥名', group: 'medication', section: SECTIONS.ITEM },
  { id: `drug_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: SECTIONS.ITEM },
  { id: `perDosage_${defaultIdCounter++}`, display: '單次劑量', group: 'dosage', section: SECTIONS.ITEM },
  { id: `drug_text_${defaultIdCounter++}`, value: '#', display: '#', group: 'format', section: SECTIONS.ITEM },
  { id: `drug_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: SECTIONS.ITEM },
  { id: `frequency_${defaultIdCounter++}`, display: '頻次', group: 'dosage', section: SECTIONS.ITEM },
  { id: `drug_space_${defaultIdCounter++}`, display: '(空格)', value: ' ', group: 'format', section: SECTIONS.ITEM },
  { id: `days_${defaultIdCounter++}`, display: '天數', group: 'dosage', section: SECTIONS.ITEM },
  { id: `drug_text_${defaultIdCounter++}`, value: '天', display: '天', group: 'format', section: SECTIONS.ITEM }
]);

// 用於預覽渲染 —— 對齊舊版 renderElem，保留 icdcode/icdname 特殊處理
const renderElem = (item, index, drugData) => {
  let baseId = item.id.split('_')[0];

  if (baseId === 'header' || baseId === 'drug') {
    const parts = item.id.split('_');
    if (parts.length > 1) baseId = parts[1];
  } else if (item.id.includes('icdcode')) {
    baseId = 'icdcode';
  } else if (item.id.includes('icdname')) {
    baseId = 'icdname';
  }

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

  if (item.group === 'format' && item.value) {
    return item.value;
  }

  return elementValuesMap.get(baseId) || '';
};

// 找出可用元素清單裡對應 id 的元素(header / item 各自的前綴與 section 不同)
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
            sx={{ color: colorSettings.addButtonColor, padding: '1px' }}
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
  const icdCodeElement = findElement(availableElements, 'icdcode', 'header', SECTIONS.HEADER);
  const icdNameElement = findElement(availableElements, 'icdname', 'header', SECTIONS.HEADER);
  const spaceElement = findElement(availableElements, 'space', 'header', SECTIONS.HEADER);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
        {dateElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(dateElement, () => onAddItem(dateElement))}
          </Box>
        )}
        {icdCodeElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(icdCodeElement, () => onAddItem(icdCodeElement))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
        {hospElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(hospElement, () => onAddItem(hospElement))}
          </Box>
        )}
        {icdNameElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(icdNameElement, () => onAddItem(icdNameElement))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', mb: 0 }}>
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
      </Box>
    </>
  );
};

const renderItemElements = ({ availableElements, onAddItem, localTextValue, setLocalTextValue, onAddCustomText }) => {
  const nameElement = findElement(availableElements, 'name', 'drug', SECTIONS.ITEM);
  const simplifiedNameElement = findElement(availableElements, 'simplifiedname', 'drug', SECTIONS.ITEM);
  const ingredientElement = findElement(availableElements, 'ingredient', 'drug', SECTIONS.ITEM);
  const perDosageElement = findElement(availableElements, 'perDosage', 'drug', SECTIONS.ITEM);
  const frequencyElement = findElement(availableElements, 'frequency', 'drug', SECTIONS.ITEM);
  const daysElement = findElement(availableElements, 'days', 'drug', SECTIONS.ITEM);
  const spaceElement = findElement(availableElements, 'space', 'drug', SECTIONS.ITEM);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
        {nameElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.medication.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(nameElement, () => onAddItem(nameElement))}
          </Box>
        )}
        {perDosageElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.dosage.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(perDosageElement, () => onAddItem(perDosageElement))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
        {simplifiedNameElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.medication.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(simplifiedNameElement, () => onAddItem(simplifiedNameElement))}
          </Box>
        )}
        {frequencyElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.dosage.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(frequencyElement, () => onAddItem(frequencyElement))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
        {ingredientElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.medication.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(ingredientElement, () => onAddItem(ingredientElement))}
          </Box>
        )}
        {daysElement && (
          <Box sx={{ flex: 1, bgcolor: elementGroups.dosage.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {elementButton(daysElement, () => onAddItem(daysElement))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', mb: 0 }}>
        <Box sx={{ mb: 0.5 }}>
          {spaceElement && (
            <Box sx={{ width: '100%', bgcolor: elementGroups.format.mediumColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              {elementButton(spaceElement, () => onAddItem(spaceElement))}
            </Box>
          )}
        </Box>

        {customTextField({
          placeholder: '輸入藥物文字',
          localTextValue,
          setLocalTextValue,
          onAddCustomText
        })}
      </Box>
    </>
  );
};

const renderAvailableElements = (params) => (
  params.formatType === 'header' ? renderHeaderElements(params) : renderItemElements(params)
);

const medicationConfig = {
  kind: 'medication',
  sections: SECTIONS,
  itemPrefix: 'drug',
  itemGroupKey: 'medication',
  storageSettingsKey: 'western',
  settingsKeys: {
    enableCustomFormat: 'enableMedicationCustomCopyFormat',
    headerFormat: 'customMedicationHeaderCopyFormat',
    itemFormat: 'customMedicationDrugCopyFormat',
    formatType: 'medicationCopyFormat',
    separator: 'drugSeparator'
  },
  defaultSeparator: ',',
  getAvailableElements,
  getDefaultHeaderFormat,
  getDefaultItemFormat,
  // medication 原本針對 id==='icd' 的特殊轉換(見舊 medicationCopyFormat/useFormatEditorState.js)。
  // 目前的可用元素清單已直接提供 icdcode/icdname，理論上不會再有 id==='icd' 的呼叫，
  // 保留此函式純粹是為了行為對齊、避免未來若有呼叫端仍傳入 'icd' 時悄悄改變行為。
  transformHeaderItem: (item) => {
    if (item.id === 'icd') {
      return { ...item, id: item.display?.includes('代碼') ? 'icdcode' : 'icdname' };
    }
    return item;
  },
  headerPresetGroup: null,
  separatorElementId: 'drugsep',

  elementGroups,
  colorSettings,
  labels: {
    separatorLabel: '藥物分隔符:'
    // presetButtonText 刻意不設定 —— 見檔案頂端說明
  },
  separatorVisibility: 'always',
  renderAvailableElements,

  renderElem,
  validateSections: true,
  showCaptions: false,
  previewHeaderData: previewHeader,
  previewItemsData: previewDrugs
};

export default medicationConfig;
