import { describe, it, assert } from 'vitest';

import {
  SETTINGS_SCHEMA,
  buildStorageDefaults,
  structureFromFlat,
  sectionFromFlat,
  storageDefaultsForSection,
} from '../src/config/settingsSchema.js';
import { DEFAULT_SETTINGS } from '../src/config/defaultSettings.js';
import { EXPECTED_STORAGE_KEYS, RENAMED_KEY_MAP } from './fixtures/storageKeys.js';

describe('config/settingsSchema', function () {
  it('schema 涵蓋 DEFAULT_SETTINGS 全部鍵,storage 鍵與 54 鍵快照一致', function () {
    assert.deepEqual(Object.keys(buildStorageDefaults()).sort(), EXPECTED_STORAGE_KEYS);
  });

  it('storageKey 不重複(不同 section 的同名巢狀鍵靠改名表區分)', function () {
    const keys = SETTINGS_SCHEMA.map(e => e.storageKey);
    assert.equal(new Set(keys).size, keys.length);
  });

  it('歷史改名鍵依 RENAMED_KEY_MAP 映射,其餘 storage 鍵 = 巢狀鍵名', function () {
    for (const entry of SETTINGS_SCHEMA) {
      const expected = RENAMED_KEY_MAP[`${entry.section}.${entry.key}`] ?? entry.key;
      assert.equal(entry.storageKey, expected, `${entry.section}.${entry.key}`);
    }
  });

  it('buildStorageDefaults 的每個值 === DEFAULT_SETTINGS 對應值(同一參考)', function () {
    const flat = buildStorageDefaults();
    for (const entry of SETTINGS_SCHEMA) {
      assert.strictEqual(flat[entry.storageKey], DEFAULT_SETTINGS[entry.section][entry.key]);
    }
  });

  it('structureFromFlat(預設扁平) 與 DEFAULT_SETTINGS 深度相等', function () {
    assert.deepEqual(structureFromFlat(buildStorageDefaults()), DEFAULT_SETTINGS);
  });

  it('structureFromFlat 覆寫值映射到正確 section(含改名鍵與跨 section 同名鍵)', function () {
    const flat = { ...buildStorageDefaults(), chineseMedDoseFormat: 'perTime', showDiagnosis: false };
    const nested = structureFromFlat(flat);
    assert.equal(nested.chinese.doseFormat, 'perTime');
    assert.equal(nested.western.showDiagnosis, false);
    assert.equal(nested.chinese.showDiagnosis, DEFAULT_SETTINGS.chinese.showDiagnosis);
  });

  it('falsyFallback 鍵在 falsy 值時退回預設,其餘 falsy 保留(對齊舊 loadAllSettings 行為)', function () {
    const flat = {
      ...buildStorageDefaults(),
      medicationCopyAllOrder: '', labCopyAllOrder: '', itemSeparator: '',
      focusedLabTests: null, focusedImageTests: null,
      drugSeparator: '', autoOpenPage: false,
    };
    const nested = structureFromFlat(flat);
    assert.equal(nested.western.medicationCopyAllOrder, 'newToOld');
    assert.equal(nested.lab.labCopyAllOrder, 'newToOld');
    assert.equal(nested.lab.itemSeparator, ',');
    assert.deepEqual(nested.overview.focusedLabTests, DEFAULT_SETTINGS.overview.focusedLabTests);
    assert.deepEqual(nested.overview.focusedImageTests, DEFAULT_SETTINGS.overview.focusedImageTests);
    assert.equal(nested.western.drugSeparator, '');
    assert.equal(nested.general.autoOpenPage, false);
  });

  it('sectionFromFlat 只回傳該 section 的巢狀鍵', function () {
    const flat = { ...buildStorageDefaults(), chineseMedShowEffectName: true };
    const chinese = sectionFromFlat('chinese', flat);
    assert.deepEqual(Object.keys(chinese).sort(), Object.keys(DEFAULT_SETTINGS.chinese).sort());
    assert.equal(chinese.showEffectName, true);
  });

  it('storageDefaultsForSection 回傳該 section 的扁平預設(UI 元件用)', function () {
    assert.deepEqual(storageDefaultsForSection('general'), {
      autoOpenPage: false,
      titleTextSize: 'small',
      contentTextSize: 'small',
      noteTextSize: 'small',
      floatingIconPosition: 'middle-right',
      alwaysOpenOverviewTab: true,
      useColorfulTabs: true,
      enableCKMTab: false,
      enableNephroReport: false,
      enableCKMScreening: false,
    });
  });
});
