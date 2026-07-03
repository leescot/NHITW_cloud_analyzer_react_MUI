import { useState, useEffect, useRef } from 'react';
import { handleSettingChange } from '../../../utils/settingsHelper';
import { debugLog } from '../../../utils/logger';

/**
 * 通用複製格式編輯器 state hook — 由 medicationCopyFormat/useFormatEditorState.js 與
 * labCopyFormat/useFormatEditorState.js 合併而來(階段5 Task 5)。
 * 差異已全部收斂進 `config` 參數,行為選擇與依據見下方註解與 PR 說明。
 *
 * @typedef {Object} FormatEditorConfig
 * @property {'medication'|'lab'} kind - 僅用於 debugLog 標示，不影響邏輯
 * @property {{HEADER: string, ITEM: string, BOTH: string}} sections - 對應原本的 ELEMENT_SECTIONS
 *   (medication: HEADER/DRUG/BOTH；lab: LABHEADER/LABCONTENT/BOTH —— 通用化為 HEADER/ITEM/BOTH，
 *   實際字串值仍由呼叫端 config 決定，保留與各自 formatEditorConfig.js 一致的字串)
 * @property {string} itemPrefix - item 區塊 space/text 元素的 id 前綴('drug' | 'lab')
 * @property {string} storageSettingsKey - appSettings 底下的區段鍵('western' | 'lab')
 * @property {{enableCustomFormat: string, headerFormat: string, itemFormat: string, formatType: string, separator: string}} settingsKeys
 *   - 對應 chrome.storage / handleSettingChange 使用的實際設定鍵名
 * @property {string} [defaultSeparator=','] - 分隔符預設值
 * @property {(separator: string, formatType: 'header'|'item'|'all') => Array} getAvailableElements
 * @property {() => Array} getDefaultHeaderFormat
 * @property {() => Array} getDefaultItemFormat
 * @property {(item: Object) => Object} [transformHeaderItem] - 選用；標題元素加入前的特殊轉換
 *   (行為差異取捨：medication 原本針對 id==='icd' 依 display 文字轉成 icdcode/icdname，
 *   lab 沒有這段邏輯。兩邊都保留：不提供此函式時等同 lab 的「不轉換」行為，
 *   提供時等同 medication 的行為 —— 不預設偏向任何一邊，由 config 決定)
 * @property {{items: Array, successMessage?: string, successSeverity?: string, noopMessage?: string, noopSeverity?: string}} [headerPresetGroup]
 *   - 選用；「加入預設群組」按鈕的行為
 *   (行為差異取捨：lab 版本真的會插入「日期 - 醫院」群組並顯示成功訊息；
 *   medication 版本此功能已被拔除，只顯示一句提示訊息、不新增任何元素。
 *   兩邊都保留為 config 開關：提供 items 時執行 lab 的行為，不提供時執行 medication 的行為)
 * @property {string} [separatorElementId] - 選用；分隔符變更時，需同步更新 value 的殘留元素 baseId
 *   (行為差異取捨：medication 的 setDrugSeparator 會掃描 header/item 格式陣列，
 *   把 baseId 為 'drugsep' 的殘留元素 value 一併更新；lab 的 setItemSeparator 沒有這段防呆。
 *   選擇「較完整/較安全」的 medication 行為套用到兩邊 —— 只要 config 提供 separatorElementId
 *   即會執行；不提供則等同 lab 原本的簡單行為，不會出錯)
 * @property {string} [resetMessage] - 重置成功訊息(兩邊原文字相同，仍留可覆寫)
 * @property {string} [saveMessage] - 儲存成功訊息(兩邊原文字相同，仍留可覆寫)
 */

// 每個 hook 實例各自累計 id 計數器(改用 useRef，取代原本 medication/lab 各自檔案中
// 「module-level 共用計數器」的寫法 —— 原設計因為 medication 與 lab 是各自獨立的檔案，
// 計數器天然互不干擾；合併成同一個通用模組後若仍用 module-level 變數，
// 兩種格式編輯器若曾經在同一個 session 內先後掛載，會共用同一組遞增計數，
// 屬於合併帶來的新風險，因此改為每個元件掛載各自歸零，行為更貼近原本「互不干擾」的效果)
const useFormatEditorState = (appSettings, setAppSettings, config) => {
  const {
    kind,
    sections,
    itemPrefix,
    storageSettingsKey,
    settingsKeys,
    defaultSeparator = ',',
    getAvailableElements,
    getDefaultHeaderFormat,
    getDefaultItemFormat,
    transformHeaderItem,
    headerPresetGroup,
    separatorElementId,
    resetMessage = '已重置為新的預設格式',
    saveMessage = '設定已儲存，需重新讀取卡片/新資料才會生效'
  } = config;

  const idCounterRef = useRef(0);

  // Format states
  const [headerFormat, setHeaderFormat] = useState([]);
  const [itemFormat, setItemFormat] = useState([]);
  const [enableCustomFormat, setEnableCustomFormat] = useState(true);
  const [customTextValue, setCustomTextValue] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [separator, setSeparatorState] = useState(defaultSeparator);
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

  // Function to get available elements based on format type
  const availableElements = (formatType = 'all') => {
    return getAvailableElements(separator, formatType);
  };

  // Add item to header format with appropriate section
  const addHeaderItem = (item) => {
    let itemToAdd = {
      ...item,
      section: sections.HEADER
    };

    if (typeof transformHeaderItem === 'function') {
      itemToAdd = transformHeaderItem(itemToAdd) || itemToAdd;
    }

    // 對空格和文字元素確保有 header 前綴
    const baseId = itemToAdd.id.split('_')[0];
    if (baseId === 'space' || baseId === 'text') {
      if (!itemToAdd.id.startsWith('header_')) {
        itemToAdd.id = 'header_' + baseId;
      }
    }

    // Generate a unique ID by appending counter instead of timestamp
    idCounterRef.current += 1;
    const uniqueId = {
      ...itemToAdd,
      id: `${itemToAdd.id.split('_')[0]}_${idCounterRef.current.toString().padStart(2, '0')}`
    };

    setHeaderFormat(prev => [...prev, uniqueId]);
  };

  // Add item to item(drug/lab) format with appropriate section
  const addItemElement = (item) => {
    let itemToAdd = {
      ...item,
      section: sections.ITEM
    };

    const baseId = itemToAdd.id.split('_')[0];
    const prefixSet = new Set(['space', 'text']);

    if (prefixSet.has(baseId) && !itemToAdd.id.startsWith(`${itemPrefix}_`)) {
      itemToAdd.id = `${itemPrefix}_` + baseId;
    }

    idCounterRef.current += 1;
    const uniqueId = {
      ...itemToAdd,
      id: `${itemToAdd.id.split('_')[0]}_${idCounterRef.current.toString().padStart(2, '0')}`
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
        section: sections.HEADER
      });
      if (!text) setCustomTextValue('');
    }
  };

  // Add custom text to item format
  const addItemCustomText = (text) => {
    const textToAdd = text || customTextValue;
    if (textToAdd.trim()) {
      addItemElement({
        id: `${itemPrefix}_text`,
        value: textToAdd,
        display: textToAdd,
        group: 'format',
        section: sections.ITEM
      });
      if (!text) setCustomTextValue('');
    }
  };

  // Remove item from header format
  const removeHeaderItem = (index) => {
    const newFormat = [...headerFormat];
    newFormat.splice(index, 1);
    setHeaderFormat(newFormat);
  };

  // Remove item from item format
  const removeItemElement = (index) => {
    const newFormat = [...itemFormat];
    newFormat.splice(index, 1);
    setItemFormat(newFormat);
  };

  // Reset to default format
  const resetToDefault = () => {
    const defaultHeaderFormat = getDefaultHeaderFormat();
    const defaultItemFormat = getDefaultItemFormat();

    setHeaderFormat(defaultHeaderFormat);
    setItemFormat(defaultItemFormat);
    setSeparatorState(defaultSeparator);

    setAppSettings(prev => {
      const newSettings = {
        ...prev,
        [storageSettingsKey]: {
          ...prev[storageSettingsKey],
          [settingsKeys.headerFormat]: defaultHeaderFormat,
          [settingsKeys.itemFormat]: defaultItemFormat,
          [settingsKeys.separator]: defaultSeparator
        }
      };

      debugLog(`useFormatEditorState(${kind}): Reset to default formats`);

      return newSettings;
    });

    setSnackbarMessage(resetMessage);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  // Initialize formats from settings
  const settingsSection = appSettings?.[storageSettingsKey];
  const savedHeaderFormat = settingsSection?.[settingsKeys.headerFormat];
  const savedItemFormat = settingsSection?.[settingsKeys.itemFormat];
  const savedSeparator = settingsSection?.[settingsKeys.separator];

  useEffect(() => {
    if (settingsSection) {
      if (savedHeaderFormat) {
        const headerFormatWithSections = savedHeaderFormat.map(item => ({
          ...item,
          section: item.section || sections.HEADER
        }));
        setHeaderFormat(headerFormatWithSections);
      } else {
        setHeaderFormat(getDefaultHeaderFormat());
      }

      if (savedItemFormat) {
        const itemFormatWithSections = savedItemFormat.map(item => ({
          ...item,
          section: item.section || sections.ITEM
        }));
        setItemFormat(itemFormatWithSections);
      } else {
        setItemFormat(getDefaultItemFormat());
      }

      setSeparatorState(savedSeparator || defaultSeparator);
    } else {
      // Use defaults if no saved format
      resetToDefault();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依賴刻意只列設定值本身(對齊原 medication/lab 版本行為，resetToDefault 為穩定的函式參照)
  }, [settingsSection, savedHeaderFormat, savedItemFormat, savedSeparator]);

  // Save changes to settings
  const saveChanges = (newlineOptions = {}) => {
    const { formatType = 'customVertical' } = newlineOptions;

    // Create deep copies of formats to avoid reference issues
    const finalHeaderFormat = JSON.parse(JSON.stringify(headerFormat));
    const finalItemFormat = JSON.parse(JSON.stringify(itemFormat));

    finalHeaderFormat.forEach(item => {
      item.section = sections.HEADER;
    });

    finalItemFormat.forEach(item => {
      item.section = sections.ITEM;
    });

    // 統一轉為字串,避免分隔符為非字串型別(行為取捨：採用 labCopyFormat 原本的防呆寫法，
    // 套用到兩邊 —— medication 原版沒有這段轉型，但轉型本身對合法字串輸入無副作用，較安全)
    const finalSeparator = String(separator || defaultSeparator);

    handleSettingChange(settingsKeys.enableCustomFormat, true, null, null, storageSettingsKey);
    handleSettingChange(settingsKeys.headerFormat, finalHeaderFormat, null, null, storageSettingsKey);
    handleSettingChange(settingsKeys.itemFormat, finalItemFormat, null, null, storageSettingsKey);
    handleSettingChange(settingsKeys.formatType, formatType, null, null, storageSettingsKey);
    handleSettingChange(settingsKeys.separator, finalSeparator, null, null, storageSettingsKey);

    setSnackbarMessage(saveMessage);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);

    setAppSettings(prev => {
      const newSettings = {
        ...prev,
        [storageSettingsKey]: {
          ...prev[storageSettingsKey],
          [settingsKeys.headerFormat]: finalHeaderFormat,
          [settingsKeys.itemFormat]: finalItemFormat,
          [settingsKeys.enableCustomFormat]: true,
          [settingsKeys.formatType]: formatType,
          [settingsKeys.separator]: finalSeparator
        }
      };

      debugLog(`useFormatEditorState(${kind}): format settings updated`, {
        section: storageSettingsKey,
        changes: newSettings[storageSettingsKey]
      });

      return newSettings;
    });
  };

  // Add preset group to header format
  const addHeaderPresetGroup = () => {
    const hasPresetItems = Array.isArray(headerPresetGroup?.items) && headerPresetGroup.items.length > 0;

    if (hasPresetItems) {
      headerPresetGroup.items.forEach(item => addHeaderItem(item));
      setSnackbarMessage(headerPresetGroup.successMessage || '已添加預設群組');
      setSnackbarSeverity(headerPresetGroup.successSeverity || 'success');
    } else {
      setSnackbarMessage(headerPresetGroup?.noopMessage || '標題格式已更新為自訂格式');
      setSnackbarSeverity(headerPresetGroup?.noopSeverity || 'info');
    }

    setSnackbarOpen(true);
  };

  // Handle separator change
  const handleSeparatorChange = (newValue) => {
    setSeparatorState(newValue);

    if (separatorElementId) {
      const updateSeparatorValue = (list) => list.map(item => {
        const baseId = item.id.split('_')[0];
        const isSeparatorElement = baseId === separatorElementId ||
          (baseId === itemPrefix && item.id.includes(`_${separatorElementId}`));
        return isSeparatorElement ? { ...item, value: newValue } : item;
      });

      setHeaderFormat(prev => updateSeparatorValue(prev));
      setItemFormat(prev => updateSeparatorValue(prev));
    }
  };

  return {
    headerFormat,
    setHeaderFormat,
    itemFormat,
    setItemFormat,
    enableCustomFormat,
    setEnableCustomFormat,
    customTextValue,
    setCustomTextValue,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    separator,
    setSeparator: handleSeparatorChange,
    selectedItems,
    setSelectedItems,
    sortMenuAnchor,
    setSortMenuAnchor,
    availableElements,
    addHeaderItem,
    addItemElement,
    addHeaderCustomText,
    addItemCustomText,
    removeHeaderItem,
    removeItemElement,
    saveChanges,
    resetToDefault,
    addHeaderPresetGroup
  };
};

export default useFormatEditorState;
