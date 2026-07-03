import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import useFormatEditorState from '../src/components/tabs/copyFormat/useFormatEditorState.js';

// 通用 useFormatEditorState 的行為鎖定測試(階段5 Task 5)。
// 用兩組「等價於 medicationCopyFormat / labCopyFormat 原本 config」的測試 config 跑同一份
// 通用 hook，確保合併後的通用模組對兩種資料形狀都維持原本(或已明確記錄取捨後)的行為。
// config 內容(settingsKeys、sections 字串等)取自 src/config/defaultSettings.js 與
// 舊版 medicationCopyFormat/labCopyFormat 底下 formatEditorConfig.js 的實際設定鍵名。

const buildMedicationConfig = () => ({
  kind: 'medication',
  sections: { HEADER: 'header', ITEM: 'drug', BOTH: 'both' },
  itemPrefix: 'drug',
  storageSettingsKey: 'western',
  settingsKeys: {
    enableCustomFormat: 'enableMedicationCustomCopyFormat',
    headerFormat: 'customMedicationHeaderCopyFormat',
    itemFormat: 'customMedicationDrugCopyFormat',
    formatType: 'medicationCopyFormat',
    separator: 'drugSeparator'
  },
  defaultSeparator: ',',
  getAvailableElements: (separator) => ([
    { id: 'date', display: '日期', group: 'header', section: 'header' },
    { id: 'name', display: '藥物名稱', group: 'medication', section: 'drug' },
    { id: 'drugsep', display: '藥品分隔符', value: separator, group: 'format', section: 'drug' }
  ]),
  getDefaultHeaderFormat: () => ([
    { id: 'date_1', display: '日期', group: 'header', section: 'header' }
  ]),
  getDefaultItemFormat: () => ([
    { id: 'name_2', display: '藥物名稱', group: 'medication', section: 'drug' }
  ]),
  // medication 原本針對 id==='icd' 的特殊轉換(見 medicationCopyFormat/useFormatEditorState.js)
  transformHeaderItem: (item) => {
    if (item.id === 'icd') {
      return { ...item, id: item.display?.includes('代碼') ? 'icdcode' : 'icdname' };
    }
    return item;
  },
  // medication 版「加入預設群組」已被拔除功能，只顯示提示訊息、不新增元素
  headerPresetGroup: null,
  separatorElementId: 'drugsep'
});

const buildLabConfig = () => ({
  kind: 'lab',
  sections: { HEADER: 'labheader', ITEM: 'labcontent', BOTH: 'both' },
  itemPrefix: 'lab',
  storageSettingsKey: 'lab',
  settingsKeys: {
    enableCustomFormat: 'enableLabCustomCopyFormat',
    headerFormat: 'customLabHeaderCopyFormat',
    itemFormat: 'customLabItemCopyFormat',
    formatType: 'copyLabFormat',
    separator: 'itemSeparator'
  },
  defaultSeparator: ',',
  getAvailableElements: (separator) => ([
    { id: 'date', display: '日期', group: 'header', section: 'labheader' },
    { id: 'itemName', display: '檢驗項目名稱', group: 'labItem', section: 'labcontent' },
    { id: 'itemsep', display: '檢驗項目分隔符', value: separator, group: 'format', section: 'labcontent' }
  ]),
  getDefaultHeaderFormat: () => ([
    { id: 'date_1', display: '日期', group: 'header', section: 'labheader' }
  ]),
  getDefaultItemFormat: () => ([
    { id: 'itemName_2', display: '檢驗項目名稱', group: 'labItem', section: 'labcontent' }
  ]),
  // lab 版「加入預設群組」真的會插入日期-醫院群組(見 labCopyFormat/useFormatEditorState.js)
  headerPresetGroup: {
    items: [
      { id: 'lab_text', value: '[', display: '[', group: 'format', section: 'labheader' },
      { id: 'date', display: '日期', group: 'header', section: 'labheader' }
    ],
    successMessage: '已添加日期醫院群組'
  },
  separatorElementId: 'itemsep'
});

const shapes = [
  { name: 'medication 形狀', buildConfig: buildMedicationConfig },
  { name: 'lab 形狀', buildConfig: buildLabConfig }
];

describe('copyFormat/useFormatEditorState (通用 hook)', () => {
  let setAppSettings;

  beforeEach(() => {
    setAppSettings = vi.fn();
    vi.spyOn(globalThis.chrome.storage.sync, 'set');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  shapes.forEach(({ name, buildConfig }) => {
    describe(name, () => {
      it('appSettings 對應區段不存在時，載入預設格式(呼叫 resetToDefault)', () => {
        const config = buildConfig();
        const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));

        assert.deepEqual(result.current.headerFormat, config.getDefaultHeaderFormat());
        assert.deepEqual(result.current.itemFormat, config.getDefaultItemFormat());
        assert.equal(result.current.separator, config.defaultSeparator);
      });

      it('appSettings 已有已儲存格式時，載入該格式並補上正確 section', () => {
        const config = buildConfig();
        const savedHeader = [{ id: 'hosp_01', display: '醫院', group: 'header' }]; // 故意不帶 section
        const savedItem = [{ id: 'name_01', display: '藥物名稱', group: 'medication', section: config.sections.ITEM }];
        const appSettings = {
          [config.storageSettingsKey]: {
            [config.settingsKeys.headerFormat]: savedHeader,
            [config.settingsKeys.itemFormat]: savedItem,
            [config.settingsKeys.separator]: ' / '
          }
        };

        const { result } = renderHook(() => useFormatEditorState(appSettings, setAppSettings, config));

        assert.equal(result.current.headerFormat.length, 1);
        assert.equal(result.current.headerFormat[0].section, config.sections.HEADER);
        assert.equal(result.current.itemFormat[0].id, 'name_01');
        assert.equal(result.current.separator, ' / ');
      });

      it('addHeaderItem 會加上正確 section 並產生唯一 id', () => {
        const config = buildConfig();
        const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));
        const initialLength = result.current.headerFormat.length; // 預設格式已佔 1 筆

        act(() => {
          result.current.addHeaderItem({ id: 'date', display: '日期', group: 'header' });
        });

        assert.equal(result.current.headerFormat.length, initialLength + 1);
        const added = result.current.headerFormat.at(-1);
        assert.equal(added.section, config.sections.HEADER);
        assert.equal(added.id, 'date_01');
      });

      it('addItemElement 對 space/text 元素會補上 itemPrefix 前綴', () => {
        const config = buildConfig();
        const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));

        act(() => {
          result.current.addItemElement({ id: 'space', display: '(空格)', value: ' ', group: 'format' });
        });

        // itemFormat 初始已含 1 個預設元素(appSettings 為空時載入 getDefaultItemFormat())，
        // 新加入的元素會附加在陣列尾端
        const added = result.current.itemFormat.at(-1);
        assert.equal(added.section, config.sections.ITEM);
        assert.equal(added.id, `${config.itemPrefix}_01`);
        assert.equal(added.value, ' ');
      });

      it('addHeaderCustomText / addItemCustomText 會加入自訂文字並清空 customTextValue', () => {
        const config = buildConfig();
        const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));

        act(() => {
          result.current.setCustomTextValue('ABC');
        });
        act(() => {
          result.current.addHeaderCustomText();
        });

        const addedHeaderText = result.current.headerFormat.at(-1);
        assert.equal(addedHeaderText.value, 'ABC');
        assert.equal(addedHeaderText.display, 'ABC');
        assert.equal(result.current.customTextValue, '');

        act(() => {
          result.current.addItemCustomText('XYZ');
        });
        const addedItemText = result.current.itemFormat.at(-1);
        assert.equal(addedItemText.value, 'XYZ');
        assert.equal(addedItemText.id, `${config.itemPrefix}_02`);
      });

      it('removeHeaderItem / removeItemElement 會移除指定索引的元素', () => {
        const config = buildConfig();
        const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));
        const initialLength = result.current.headerFormat.length; // 預設格式已佔 1 筆

        act(() => {
          result.current.addHeaderItem({ id: 'date', display: '日期', group: 'header' });
          result.current.addHeaderItem({ id: 'hosp', display: '醫院', group: 'header' });
        });
        assert.equal(result.current.headerFormat.length, initialLength + 2);

        act(() => {
          // 移除剛新增的第一筆('date_01'，位於預設格式之後)
          result.current.removeHeaderItem(initialLength);
        });
        assert.equal(result.current.headerFormat.length, initialLength + 1);
        assert.isUndefined(result.current.headerFormat.find(item => item.id === 'date_01'));
        assert.isDefined(result.current.headerFormat.find(item => item.id === 'hosp_02'));
      });

      it('resetToDefault 會還原成預設格式並更新 appSettings', () => {
        const config = buildConfig();
        const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));

        act(() => {
          result.current.addHeaderItem({ id: 'date', display: '日期', group: 'header' });
        });
        assert.equal(result.current.headerFormat.length, 2); // 預設1個 + 新增1個

        act(() => {
          result.current.resetToDefault();
        });

        assert.deepEqual(result.current.headerFormat, config.getDefaultHeaderFormat());
        assert.deepEqual(result.current.itemFormat, config.getDefaultItemFormat());
        assert.equal(result.current.separator, config.defaultSeparator);
        assert.equal(result.current.snackbarOpen, true);
        assert.equal(result.current.snackbarSeverity, 'success');

        // setAppSettings 應以 functional updater 正確寫回對應 storageSettingsKey 區段
        const updater = setAppSettings.mock.calls.at(-1)[0];
        const newSettings = updater({ [config.storageSettingsKey]: { other: 'keep-me' } });
        assert.equal(newSettings[config.storageSettingsKey].other, 'keep-me');
        assert.deepEqual(
          newSettings[config.storageSettingsKey][config.settingsKeys.headerFormat],
          config.getDefaultHeaderFormat()
        );
      });

      it('saveChanges 會把格式與分隔符寫入對應的 storage key(chrome.storage.sync.set)', () => {
        const config = buildConfig();
        const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));

        act(() => {
          result.current.saveChanges({ formatType: 'customHorizontal' });
        });

        const writtenKeys = globalThis.chrome.storage.sync.set.mock.calls.map(call => call[0]);
        const merged = Object.assign({}, ...writtenKeys);

        assert.equal(merged[config.settingsKeys.enableCustomFormat], true);
        assert.equal(merged[config.settingsKeys.formatType], 'customHorizontal');
        assert.equal(merged[config.settingsKeys.separator], config.defaultSeparator);
        assert.deepEqual(merged[config.settingsKeys.headerFormat], config.getDefaultHeaderFormat());
        assert.deepEqual(merged[config.settingsKeys.itemFormat], config.getDefaultItemFormat());
      });

      it('saveChanges 會將非字串分隔符轉為字串(採用較安全的一致行為)', () => {
        const config = buildConfig();
        const appSettings = {
          [config.storageSettingsKey]: {
            [config.settingsKeys.separator]: 5 // 故意塞非字串值
          }
        };
        const { result } = renderHook(() => useFormatEditorState(appSettings, setAppSettings, config));

        act(() => {
          result.current.saveChanges();
        });

        const writtenKeys = globalThis.chrome.storage.sync.set.mock.calls.map(call => call[0]);
        const merged = Object.assign({}, ...writtenKeys);
        assert.strictEqual(merged[config.settingsKeys.separator], '5');
      });

      it('setSeparator 變更時，會同步更新格式陣列中殘留的分隔符元素 value', () => {
        const config = buildConfig();
        const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));

        act(() => {
          result.current.addItemElement({
            id: config.separatorElementId,
            display: '分隔符',
            value: ',',
            group: 'format'
          });
        });

        act(() => {
          result.current.setSeparator(' | ');
        });

        assert.equal(result.current.separator, ' | ');
        const sepItem = result.current.itemFormat.find(item => item.id.startsWith(config.separatorElementId));
        assert.equal(sepItem.value, ' | ');
      });
    });
  });

  it('addHeaderPresetGroup：未提供 headerPresetGroup 時只顯示提示訊息、不新增元素(medication 行為)', () => {
    const config = buildMedicationConfig();
    const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));

    act(() => {
      result.current.addHeaderPresetGroup();
    });

    assert.equal(result.current.headerFormat.length, 1); // 僅預設格式，未新增
    assert.equal(result.current.snackbarSeverity, 'info');
  });

  it('addHeaderPresetGroup：有提供 headerPresetGroup 時會插入預設群組元素(lab 行為)', () => {
    const config = buildLabConfig();
    const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));
    const initialLength = result.current.headerFormat.length;

    act(() => {
      result.current.addHeaderPresetGroup();
    });

    assert.equal(result.current.headerFormat.length, initialLength + config.headerPresetGroup.items.length);
    assert.equal(result.current.snackbarSeverity, 'success');
    assert.equal(result.current.snackbarMessage, config.headerPresetGroup.successMessage);
  });

  it('addHeaderItem：medication config 提供 transformHeaderItem 時會轉換 icd 元素為 icdcode/icdname', () => {
    const config = buildMedicationConfig();
    const { result } = renderHook(() => useFormatEditorState({}, setAppSettings, config));

    act(() => {
      result.current.addHeaderItem({ id: 'icd', display: 'ICD代碼', group: 'header' });
    });

    const added = result.current.headerFormat.at(-1);
    // id 計數器(idCounterRef)與陣列中既有的預設格式項目無關，是各自 hook 實例獨立從 0 開始遞增
    assert.equal(added.id, 'icdcode_01');
  });
});
