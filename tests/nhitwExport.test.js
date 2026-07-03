import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';

import { dataStore } from '../src/store/dataStore.js';
import { buildShareData, writeShareDataToLocalStorage } from '../src/store/nhitwExport.js';

describe('store/nhitwExport', function () {
  beforeEach(() => {
    dataStore.clearAll();
    localStorage.removeItem('NHITW_DATA');
  });

  afterEach(() => {
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
        'chronicMed',
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

    it('localStorage 寫入失敗時不拋錯(console.error 後靜默)', function () {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      assert.doesNotThrow(() => writeShareDataToLocalStorage({ timestamp: 1 }));
      assert.equal(errSpy.mock.calls.length, 1);
      spy.mockRestore();
      errSpy.mockRestore();
    });
  });
});
