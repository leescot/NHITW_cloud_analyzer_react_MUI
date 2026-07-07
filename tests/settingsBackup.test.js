// tests/settingsBackup.test.js
import { describe, it, assert } from 'vitest';

import { SETTINGS_SCHEMA, buildStorageDefaults } from '../src/config/settingsSchema.js';
import { EXPECTED_STORAGE_KEYS } from './fixtures/storageKeys.js';
import {
  SETTINGS_EXPORT_FORMAT,
  SETTINGS_EXPORT_VERSION,
  buildSettingsExport,
  parseSettingsImport,
} from '../src/utils/settingsBackup.js';

describe('utils/settingsBackup', function () {
  const FIXED_TIME = '2026-07-07T06:30:00.000Z';
  const defaultOf = (storageKey) =>
    SETTINGS_SCHEMA.find((e) => e.storageKey === storageKey).defaultValue;

  describe('.buildSettingsExport', function () {
    it('信封欄位齊全,settings 恰為 schema 全部 storageKey(52 鍵快照)', function () {
      const exp = buildSettingsExport(buildStorageDefaults(), FIXED_TIME);
      assert.strictEqual(exp.format, SETTINGS_EXPORT_FORMAT);
      assert.strictEqual(exp.version, SETTINGS_EXPORT_VERSION);
      assert.strictEqual(exp.exportedAt, FIXED_TIME);
      assert.deepEqual(Object.keys(exp.settings).sort(), EXPECTED_STORAGE_KEYS);
    });

    it('取用傳入值;缺鍵以預設補齊;白名單外的輸入鍵不外洩', function () {
      const exp = buildSettingsExport({ simplifyMedicineName: false, notASetting: 'x' }, FIXED_TIME);
      assert.strictEqual(exp.settings.simplifyMedicineName, false);
      assert.notProperty(exp.settings, 'notASetting');
      assert.strictEqual(exp.settings.enableATC5Colors, defaultOf('enableATC5Colors'));
    });

    it('歷史改名鍵以 storage 鍵名原樣出現', function () {
      const exp = buildSettingsExport(buildStorageDefaults(), FIXED_TIME);
      assert.property(exp.settings, 'enableATC5Colors');
      assert.property(exp.settings, 'atc5Groups');
      assert.property(exp.settings, 'chineseMedCopyFormat');
      assert.notProperty(exp.settings, 'atc5.enableColors');
    });
  });

  describe('.parseSettingsImport — 信封驗證(拒絕時一個鍵都不回)', function () {
    it('非物件 / 陣列 / format 不符 / 缺 settings → 拒絕', function () {
      assert.isFalse(parseSettingsImport(null).ok);
      assert.isFalse(parseSettingsImport([1]).ok);
      assert.isFalse(parseSettingsImport({ format: 'other', version: 1, settings: {} }).ok);
      assert.isFalse(parseSettingsImport({ format: SETTINGS_EXPORT_FORMAT, version: 1 }).ok);
    });

    it('version 過新 → 拒絕並提示更新;version 非正整數 → 拒絕', function () {
      const r = parseSettingsImport({ format: SETTINGS_EXPORT_FORMAT, version: 2, settings: {} });
      assert.isFalse(r.ok);
      assert.match(r.error, /更新/);
      assert.isFalse(parseSettingsImport({ format: SETTINGS_EXPORT_FORMAT, version: 0, settings: {} }).ok);
      assert.isFalse(parseSettingsImport({ format: SETTINGS_EXPORT_FORMAT, version: '1', settings: {} }).ok);
    });
  });

  describe('.parseSettingsImport — 全量還原語意', function () {
    it('export → import round-trip 恆等(warnings 為空)', function () {
      const flat = { ...buildStorageDefaults(), simplifyMedicineName: false, medicationTrackingDays: 180 };
      const r = parseSettingsImport(buildSettingsExport(flat, FIXED_TIME));
      assert.isTrue(r.ok);
      assert.deepEqual(r.settings, flat);
      assert.lengthOf(r.warnings, 0);
    });

    it('檔內只有部分鍵 → 其餘鍵重設為預設(輸出恆為完整 52 鍵)', function () {
      const r = parseSettingsImport({
        format: SETTINGS_EXPORT_FORMAT, version: 1,
        settings: { simplifyMedicineName: false },
      });
      assert.isTrue(r.ok);
      assert.deepEqual(Object.keys(r.settings).sort(), EXPECTED_STORAGE_KEYS);
      assert.strictEqual(r.settings.simplifyMedicineName, false);
      assert.deepEqual(r.settings.atc5Groups, defaultOf('atc5Groups'));
    });

    it('未知鍵忽略 + warning(向後相容:較新版本的匯出檔可匯入)', function () {
      const r = parseSettingsImport({
        format: SETTINGS_EXPORT_FORMAT, version: 1,
        settings: { simplifyMedicineName: false, futureOverviewCheckItems: ['x'] },
      });
      assert.isTrue(r.ok);
      assert.notProperty(r.settings, 'futureOverviewCheckItems');
      assert.strictEqual(r.settings.simplifyMedicineName, false);
      assert.lengthOf(r.warnings, 1);
      assert.match(r.warnings[0], /未知設定/);
    });

    it('型別不符 → 該鍵回預設 + warning;陣列鍵用 Array.isArray 判斷', function () {
      const r = parseSettingsImport({
        format: SETTINGS_EXPORT_FORMAT, version: 1,
        settings: { simplifyMedicineName: 'yes', focusedLabTests: 'not-an-array' },
      });
      assert.isTrue(r.ok);
      assert.strictEqual(r.settings.simplifyMedicineName, defaultOf('simplifyMedicineName'));
      assert.deepEqual(r.settings.focusedLabTests, defaultOf('focusedLabTests'));
      assert.lengthOf(r.warnings, 1);
      assert.match(r.warnings[0], /型別不符/);
    });
  });
});
