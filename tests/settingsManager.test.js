import { describe, it, assert, beforeEach, vi } from 'vitest';

import { dataStore } from '../src/store/dataStore.js';
import { handleDataFetchCompletedSettingsChange, loadAllSettings } from '../src/utils/settingsManager.js';
import { DEFAULT_SETTINGS } from '../src/config/defaultSettings.js';
import { EXPECTED_STORAGE_KEYS } from './fixtures/storageKeys.js';

const makeCurrentSettings = () => ({
  western: { ...DEFAULT_SETTINGS.western },
  chinese: { ...DEFAULT_SETTINGS.chinese },
  lab: { ...DEFAULT_SETTINGS.lab },
  overview: { ...DEFAULT_SETTINGS.overview },
  cloud: { ...DEFAULT_SETTINGS.cloud },
});

const makeEvent = (detail) => ({ detail: { settingsChanged: true, ...detail } });

describe('utils/settingsManager.handleDataFetchCompletedSettingsChange', function () {
  let currentSettings, updateCallback, callbacks;

  beforeEach(() => {
    dataStore.clearAll();
    currentSettings = makeCurrentSettings();
    updateCallback = vi.fn();
    callbacks = {
      reprocessLab: vi.fn(),
      reprocessChineseMed: vi.fn(),
      reprocessMedication: vi.fn(),
    };
  });

  it('labsettings + allSettings：updateCallback 收到映射後的 lab 設定（含 labCopyAllOrder），並以 store 的 labdata 呼叫 reprocessLab', function () {
    const labData = { rObject: [{ ITEM: 'WBC', VALUE: '5.0' }] };
    dataStore.setData('labdata', labData);

    const allSettings = {
      displayLabFormat: 'byItem',
      showLabUnit: true,
      showLabReference: true,
      enableLabAbbrev: false,
      highlightAbnormalLab: false,
      copyLabFormat: 'vertical',
      enableLabChooseCopy: true,
      labChooseCopyItems: ['A', 'B'],
      enableLabCustomCopyFormat: true,
      enableLabCopyAll: true,
      labCopyAllOrder: 'oldToNew',
      itemSeparator: ';',
      customLabHeaderCopyFormat: ['h'],
      customLabItemCopyFormat: ['i'],
    };

    const event = makeEvent({ settingType: 'labsettings', allSettings });
    handleDataFetchCompletedSettingsChange(event, currentSettings, updateCallback, callbacks);

    const expectedLabSettings = {
      displayLabFormat: 'byItem',
      showUnit: true,
      showReference: true,
      enableLabAbbrev: false,
      highlightAbnormal: false,
      copyLabFormat: 'vertical',
      enableLabChooseCopy: true,
      labChooseCopyItems: ['A', 'B'],
      enableLabCustomCopyFormat: true,
      enableLabCopyAll: true,
      labCopyAllOrder: 'oldToNew',
      itemSeparator: ';',
      customLabHeaderCopyFormat: ['h'],
      customLabItemCopyFormat: ['i'],
    };

    assert.equal(updateCallback.mock.calls.length, 1);
    assert.deepEqual(updateCallback.mock.calls[0][0], { ...currentSettings, lab: expectedLabSettings });
    assert.equal(updateCallback.mock.calls[0][0].lab.labCopyAllOrder, 'oldToNew');

    assert.equal(callbacks.reprocessLab.mock.calls.length, 1);
    assert.deepEqual(callbacks.reprocessLab.mock.calls[0], [labData, expectedLabSettings]);
  });

  it('labsettings 單一設定 displayLabFormat：合併進 currentSettings.lab 並以更新後設定呼叫 reprocessLab', function () {
    const labData = { rObject: [{ ITEM: 'HGB' }] };
    dataStore.setData('labdata', labData);

    const event = makeEvent({ settingType: 'labsettings', setting: 'displayLabFormat', value: 'byItem' });
    handleDataFetchCompletedSettingsChange(event, currentSettings, updateCallback, callbacks);

    const expectedLabSettings = { ...currentSettings.lab, displayLabFormat: 'byItem' };

    assert.equal(updateCallback.mock.calls.length, 1);
    assert.deepEqual(updateCallback.mock.calls[0][0], { ...currentSettings, lab: expectedLabSettings });

    assert.equal(callbacks.reprocessLab.mock.calls.length, 1);
    assert.deepEqual(callbacks.reprocessLab.mock.calls[0], [labData, expectedLabSettings]);
  });

  it('chinesemed + allSettings：updateCallback 收到映射後的 chinese 設定，並以 store 的 chinesemed 資料呼叫 reprocessChineseMed', function () {
    const chinesemedData = { rObject: [{ DRUG: '甘草' }] };
    dataStore.setData('chinesemed', chinesemedData);

    const allSettings = {
      chineseMedShowDiagnosis: true,
      chineseMedShowEffectName: true,
      chineseMedDoseFormat: 'perTime',
      chineseMedCopyFormat: 'nameOnly',
    };

    const event = makeEvent({ settingType: 'chinesemed', allSettings });
    handleDataFetchCompletedSettingsChange(event, currentSettings, updateCallback, callbacks);

    const expectedChineseSettings = {
      showDiagnosis: true,
      showEffectName: true,
      doseFormat: 'perTime',
      copyFormat: 'nameOnly',
    };

    assert.equal(updateCallback.mock.calls.length, 1);
    assert.deepEqual(updateCallback.mock.calls[0][0], { ...currentSettings, chinese: expectedChineseSettings });

    assert.equal(callbacks.reprocessChineseMed.mock.calls.length, 1);
    assert.deepEqual(callbacks.reprocessChineseMed.mock.calls[0], [chinesemedData, expectedChineseSettings]);
  });

  it('overview 單一設定 medicationTrackingDays：合併進 currentSettings.overview，並以 store 的 medication 資料 + currentSettings.western 呼叫 reprocessMedication', function () {
    const medicationData = { rObject: [{ DRUG: 'Aspirin' }] };
    dataStore.setData('medication', medicationData);

    const event = makeEvent({ settingType: 'overview', setting: 'medicationTrackingDays', value: 30 });
    handleDataFetchCompletedSettingsChange(event, currentSettings, updateCallback, callbacks);

    const expectedOverviewSettings = { ...currentSettings.overview, medicationTrackingDays: 30 };

    assert.equal(updateCallback.mock.calls.length, 1);
    assert.deepEqual(updateCallback.mock.calls[0][0], { ...currentSettings, overview: expectedOverviewSettings });

    assert.equal(callbacks.reprocessMedication.mock.calls.length, 1);
    assert.deepEqual(callbacks.reprocessMedication.mock.calls[0], [medicationData, currentSettings.western]);
  });

  it('store 為空（clearAll 後）：即使觸發 labsettings/chinesemed/overview 變更，reprocess callbacks 都不會被呼叫', function () {
    // dataStore 已在 beforeEach 中 clearAll，此處不再設值，模擬尚無資料時使用者變更設定

    handleDataFetchCompletedSettingsChange(
      makeEvent({ settingType: 'labsettings', allSettings: { displayLabFormat: 'byItem' } }),
      currentSettings, updateCallback, callbacks
    );
    handleDataFetchCompletedSettingsChange(
      makeEvent({ settingType: 'chinesemed', allSettings: { chineseMedDoseFormat: 'perTime' } }),
      currentSettings, updateCallback, callbacks
    );
    handleDataFetchCompletedSettingsChange(
      makeEvent({ settingType: 'overview', setting: 'medicationTrackingDays', value: 30 }),
      currentSettings, updateCallback, callbacks
    );

    assert.equal(callbacks.reprocessLab.mock.calls.length, 0);
    assert.equal(callbacks.reprocessChineseMed.mock.calls.length, 0);
    assert.equal(callbacks.reprocessMedication.mock.calls.length, 0);
    // updateCallback 本身不受資料是否存在影響，仍會被呼叫三次
    assert.equal(updateCallback.mock.calls.length, 3);
  });

  it('event.detail.settingsChanged 為 falsy 時：updateCallback 與所有 reprocess callbacks 都不會被呼叫', function () {
    const event = { detail: { settingsChanged: false, settingType: 'labsettings', allSettings: { displayLabFormat: 'byItem' } } };
    handleDataFetchCompletedSettingsChange(event, currentSettings, updateCallback, callbacks);

    assert.equal(updateCallback.mock.calls.length, 0);
    assert.equal(callbacks.reprocessLab.mock.calls.length, 0);
    assert.equal(callbacks.reprocessChineseMed.mock.calls.length, 0);
    assert.equal(callbacks.reprocessMedication.mock.calls.length, 0);
  });
});

// 暫時替換 chrome.storage.sync.get,回傳 defaults 疊上 overrides,並記錄請求的 defaults
const withSyncGetStub = async (overrides, fn) => {
  const original = chrome.storage.sync.get;
  let requestedDefaults;
  chrome.storage.sync.get = (defaults, cb) => {
    requestedDefaults = defaults;
    cb({ ...defaults, ...overrides });
  };
  try {
    return { result: await fn(), requestedDefaults };
  } finally {
    chrome.storage.sync.get = original;
  }
};

describe('utils/settingsManager.loadAllSettings(characterization,重構前行為基準)', function () {
  it('向 chrome.storage.sync.get 要求的扁平預設鍵 = 52 鍵快照', async function () {
    const { requestedDefaults } = await withSyncGetStub({}, loadAllSettings);
    assert.deepEqual(Object.keys(requestedDefaults).sort(), EXPECTED_STORAGE_KEYS);
  });

  it('storage 全空(回傳 defaults)時,輸出各 section 與 DEFAULT_SETTINGS 等值', async function () {
    const { result } = await withSyncGetStub({}, loadAllSettings);
    assert.deepEqual(result.western, DEFAULT_SETTINGS.western);
    assert.deepEqual(result.atc5, DEFAULT_SETTINGS.atc5);
    assert.deepEqual(result.chinese, DEFAULT_SETTINGS.chinese);
    assert.deepEqual(result.lab, DEFAULT_SETTINGS.lab);
    assert.deepEqual(result.overview, DEFAULT_SETTINGS.overview);
    assert.deepEqual(result.general, DEFAULT_SETTINGS.general);
    assert.deepEqual(result.cloud, DEFAULT_SETTINGS.cloud);
  });

  it('storage 覆寫值會映射到巢狀結構(含歷史改名鍵與跨 section 同名鍵)', async function () {
    const { result } = await withSyncGetStub({
      chineseMedDoseFormat: 'perTime',
      showLabUnit: true,
      enableATC5Colors: false,
      highlightAbnormalLab: false,
      showDiagnosis: false, // western 的同名鍵
      enableCKMScreening: true,
    }, loadAllSettings);
    assert.equal(result.chinese.doseFormat, 'perTime');
    assert.equal(result.lab.showUnit, true);
    assert.equal(result.atc5.enableColors, false);
    assert.equal(result.lab.highlightAbnormal, false);
    assert.equal(result.western.showDiagnosis, false);
    assert.equal(result.chinese.showDiagnosis, DEFAULT_SETTINGS.chinese.showDiagnosis);
    assert.equal(result.general.enableCKMScreening, true);
  });

  it('falsy 覆寫的退回行為:copyAllOrder/itemSeparator/focused 清單退回預設,其餘 falsy 保留', async function () {
    const { result } = await withSyncGetStub({
      medicationCopyAllOrder: '',
      labCopyAllOrder: '',
      itemSeparator: '',
      focusedLabTests: null,
      focusedImageTests: null,
      drugSeparator: '', // 舊程式「不」退回
      autoOpenPage: false,
    }, loadAllSettings);
    assert.equal(result.western.medicationCopyAllOrder, 'newToOld');
    assert.equal(result.lab.labCopyAllOrder, 'newToOld');
    assert.equal(result.lab.itemSeparator, ',');
    assert.deepEqual(result.overview.focusedLabTests, DEFAULT_SETTINGS.overview.focusedLabTests);
    assert.deepEqual(result.overview.focusedImageTests, DEFAULT_SETTINGS.overview.focusedImageTests);
    assert.equal(result.western.drugSeparator, '');
    assert.equal(result.general.autoOpenPage, false);
  });
});
