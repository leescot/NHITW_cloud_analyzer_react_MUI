import { describe, it, assert } from 'vitest';

import {medicationProcessor} from '../src/utils/medicationProcessor.js';

describe('utils/medicationProcessor', function () {
  describe('.processMedDaysData', function () {
    it('should return [] for invalid input: undefined', async function () {
      const input = undefined;
      const expected = [];
      assert.deepEqual(await medicationProcessor.processMedicationData(input), expected);
    });

    it('should return [] for invalid input: null', async function () {
      const input = null;
      const expected = [];
      assert.deepEqual(await medicationProcessor.processMedicationData(input), expected);
    });

    it('should return [] for invalid input: no .rObject', async function () {
      const input = {};
      const expected = [];
      assert.deepEqual(await medicationProcessor.processMedicationData(input), expected);
    });

    it('should return [] for invalid input: .rObject is not an Array', async function () {
      const input = {
        rObject: null,
      };
      const expected = [];
      assert.deepEqual(await medicationProcessor.processMedicationData(input), expected);
    });
  });

  describe('.processMedicationData 第三參數 formatSettings（藥物自訂格式設定改經參數傳遞，不再靠 window 側通道）', function () {
    const input = {
      rObject: [{
        PER_DATE: '2024/01/01',
        HOSP_NAME: '示範醫院;門診',
        MED_DESC: 'Aspirin Tablets',
        DOSAGE: '2',
        FREQ_DESC: 'QD',
        MED_DAYS: '7',
        drug_code: 'A001',
      }],
    };

    it('formatSettings.simplifyMedicineName = true 時簡化藥名', async function () {
      const result = await medicationProcessor.processMedicationData(input, null, {
        simplifyMedicineName: true,
      });
      assert.strictEqual(result[0].medications[0].name, 'Aspirin');
    });

    it('formatSettings.simplifyMedicineName = false 時保留原始藥名（驗證參數確實生效，而非讀 window/storage）', async function () {
      const result = await medicationProcessor.processMedicationData(input, null, {
        simplifyMedicineName: false,
      });
      assert.strictEqual(result[0].medications[0].name, 'Aspirin Tablets');
    });

    it('省略 formatSettings（null）時退回 chrome.storage.sync 後備路徑，預設 simplifyMedicineName = true', async function () {
      const result = await medicationProcessor.processMedicationData(input);
      assert.strictEqual(result[0].medications[0].name, 'Aspirin');
    });
  });
});
