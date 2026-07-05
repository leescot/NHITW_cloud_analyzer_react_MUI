import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';

import { dataStore } from '../src/store/dataStore.js';
import {
  buildShareData,
  writeShareDataToLocalStorage,
  NHITW_DATA_WARN_BYTES,
} from '../src/store/nhitwExport.js';
import { _resetDebugCache } from '../src/utils/logger.js';

describe('store/nhitwExport', function () {
  beforeEach(() => {
    dataStore.clearAll();
    localStorage.removeItem('NHITW_DATA');
  });

  afterEach(() => {
    // 斷言失敗時測試內的 mockRestore 不會執行,統一在此還原避免洩漏到後續測試
    vi.restoreAllMocks();
    localStorage.removeItem('NHITW_DATA');
  });

  describe('.buildShareData(統一格式)', function () {
    it('key 順序固定:timestamp 最前、labdata 改名 lab、patientSummary 駝峰、含 labdraw 與 masterMenu', function () {
      const med = { rObject: [{ drug: 'aspirin' }] };
      dataStore.setData('medication', med);
      dataStore.setData('labdata', { rObject: [{ lab: 'x' }] });
      dataStore.setData('patientsummary', { rObject: [{ s: 1 }] });

      const shareData = buildShareData(1234567890);

      assert.deepEqual(Object.keys(shareData), [
        'timestamp', 'medication', 'lab', 'labdraw', 'chinesemed', 'imaging',
        'allergy', 'surgery', 'discharge', 'medDays', 'patientSummary',
        'masterMenu', 'adultHealthCheck', 'cancerScreening', 'hbcvdata',
        'chronicMed', 'truncated',
      ]);
      assert.equal(shareData.timestamp, 1234567890);
      assert.strictEqual(shareData.medication, med);
      assert.deepEqual(shareData.lab, { rObject: [{ lab: 'x' }] });
      assert.deepEqual(shareData.patientSummary, { rObject: [{ s: 1 }] });
    });

    it('未載入的型別輸出 null(維持舊語意,消費端可辨識「無資料」)', function () {
      const shareData = buildShareData(42);
      assert.isNull(shareData.imaging);
      assert.isNull(shareData.masterMenu);
      // JSON 序列化後 null key 保留
      const parsed = JSON.parse(JSON.stringify(shareData));
      assert.property(parsed, 'imaging');
      assert.isNull(parsed.imaging);
    });

    it('不含舊格式殘留的 rehabilitation/acupuncture/specialChineseMedCare/patientsummary(小寫)', function () {
      const shareData = buildShareData(42);
      assert.notProperty(shareData, 'rehabilitation');
      assert.notProperty(shareData, 'acupuncture');
      assert.notProperty(shareData, 'specialChineseMedCare');
      assert.notProperty(shareData, 'patientsummary');
    });

    it('未給 timestamp 時使用當下時間', function () {
      const before = Date.now();
      const shareData = buildShareData();
      assert.isAtLeast(shareData.timestamp, before);
      assert.isAtMost(shareData.timestamp, Date.now());
    });

    it('truncated 標記預設 false(截斷策略未實作前恆為 false,消費端可辨識快照完整性)', function () {
      const shareData = buildShareData(42);
      assert.strictEqual(shareData.truncated, false);
      // JSON 序列化後保留
      const parsed = JSON.parse(JSON.stringify(shareData));
      assert.strictEqual(parsed.truncated, false);
    });
  });

  describe('.writeShareDataToLocalStorage', function () {
    it('寫入 NHITW_DATA key 並 dispatch storage 事件', function () {
      const storageListener = vi.fn();
      window.addEventListener('storage', storageListener);

      writeShareDataToLocalStorage({ timestamp: 1, medication: null });

      const stored = JSON.parse(localStorage.getItem('NHITW_DATA'));
      assert.deepEqual(stored, { timestamp: 1, medication: null });
      assert.equal(storageListener.mock.calls.length, 1);

      window.removeEventListener('storage', storageListener);
    });

    it('localStorage 寫入失敗時不拋錯(console.error 後靜默),錯誤訊息附量測大小', function () {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      assert.doesNotThrow(() => writeShareDataToLocalStorage({ timestamp: 1 }));
      assert.equal(errSpy.mock.calls.length, 1);
      // 訊息需包含估算 bytes,方便現場診斷 quota 問題
      const joined = errSpy.mock.calls[0].map(String).join(' ');
      assert.match(joined, /bytes/);
      spy.mockRestore();
      errSpy.mockRestore();
    });
  });

  describe('.writeShareDataToLocalStorage(大小監控)', function () {
    beforeEach(() => {
      localStorage.setItem('nhitw_debug', '1');
      _resetDebugCache();
    });

    afterEach(() => {
      localStorage.removeItem('nhitw_debug');
      _resetDebugCache();
    });

    it('匯出 NHITW_DATA_WARN_BYTES 警告門檻常數(低於瀏覽器常見 5MB 上限)', function () {
      assert.isNumber(NHITW_DATA_WARN_BYTES);
      assert.isAbove(NHITW_DATA_WARN_BYTES, 0);
      assert.isBelow(NHITW_DATA_WARN_BYTES, 5 * 1024 * 1024);
    });

    it('序列化後估算大小超過門檻時,以 debugLog 發出含大小的警告(資料仍照常寫入)', function () {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      // UTF-16 每字元估 2 bytes:長度取門檻的一半再加 buffer 即超標
      const bigPayload = {
        timestamp: 1,
        medication: 'x'.repeat(Math.ceil(NHITW_DATA_WARN_BYTES / 2) + 64),
      };

      writeShareDataToLocalStorage(bigPayload);

      const warnCalls = logSpy.mock.calls
        .map((args) => args.map(String).join(' '))
        .filter((msg) => msg.includes('NHITW_DATA'));
      assert.equal(warnCalls.length, 1);
      assert.match(warnCalls[0], /bytes/);
      // 超標只警告不阻擋:資料仍完整寫入
      assert.isNotNull(localStorage.getItem('NHITW_DATA'));
      logSpy.mockRestore();
    });

    it('未超過門檻時不發出警告', function () {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      writeShareDataToLocalStorage({ timestamp: 1, medication: null });

      const warnCalls = logSpy.mock.calls
        .map((args) => args.map(String).join(' '))
        .filter((msg) => msg.includes('NHITW_DATA'));
      assert.equal(warnCalls.length, 0);
      logSpy.mockRestore();
    });
  });
});
