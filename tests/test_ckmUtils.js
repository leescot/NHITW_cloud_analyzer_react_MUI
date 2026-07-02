import {assert} from './lib/chai.js';

import {
  getKeyDrugLabel,
  getRecentKeyDrugs,
  classifyLabItem,
  getCKMMedicationGroups,
  buildMedKey,
} from './src/utils/ckmUtils.js';

// 產生 N 天前的 YYYY/MM/DD 字串（測試相對日期用）
function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

describe('utils/ckmUtils', function () {
  describe('.getKeyDrugLabel', function () {
    it('should return null for empty input', function () {
      assert.isNull(getKeyDrugLabel(null));
      assert.isNull(getKeyDrugLabel(''));
    });
    it('should classify ACEI / ARB / SGLT2i / Statin / ARNI', function () {
      assert.equal(getKeyDrugLabel('C09AA05'), 'ACEI');
      assert.equal(getKeyDrugLabel('C09CA01'), 'ARB');
      assert.equal(getKeyDrugLabel('A10BK03'), 'SGLT2i');
      assert.equal(getKeyDrugLabel('C10AA05'), 'Statin');
      assert.equal(getKeyDrugLabel('C09DX04'), 'ARNI');
    });
    it('should return null for non-key ATC', function () {
      assert.isNull(getKeyDrugLabel('N02BE01'));
    });
  });

  describe('.getRecentKeyDrugs', function () {
    it('should return [] for empty input', function () {
      assert.deepEqual(getRecentKeyDrugs(null), []);
      assert.deepEqual(getRecentKeyDrugs({}), []);
    });
    it('should pick key drugs within 90 days and skip old ones', function () {
      const medications = {
        antidiabetic: [
          { drugName: 'Forxiga', atcCode: 'A10BK01', date: daysAgo(10), dosage: '1' },
        ],
        antihypertensive: [
          { drugName: 'OldARB', atcCode: 'C09CA01', date: daysAgo(120), dosage: '1' },
        ],
      };
      const result = getRecentKeyDrugs(medications);
      assert.deepEqual(result.map(r => r.label), ['SGLT2i']);
      assert.equal(result[0].drugName, 'Forxiga');
    });
  });

  describe('.classifyLabItem', function () {
    it('should split 09015C into Cr / eGFR / eGFR(健保署)', function () {
      assert.equal(classifyLabItem({ orderCode: '09015C', itemName: 'Creatinine', abbrName: 'Cr' }), 'Cr');
      assert.equal(classifyLabItem({ orderCode: '09015C', itemName: 'eGFR', abbrName: 'eGFR' }), 'eGFR');
      assert.equal(classifyLabItem({ orderCode: '09015C', itemName: 'eGFR', abbrName: '', assayMethod: '健保署計算' }), 'eGFR(健保署)');
    });
    it('should split 12193C into BNP / NT-proBNP', function () {
      assert.equal(classifyLabItem({ orderCode: '12193C', itemName: 'NT-proBNP', abbrName: '' }), 'NT-proBNP');
      assert.equal(classifyLabItem({ orderCode: '12193C', itemName: 'BNP', abbrName: '' }), 'BNP');
    });
    it('should return Hb only for hemoglobin-like 08011C items', function () {
      assert.equal(classifyLabItem({ orderCode: '08011C', itemName: 'Hemoglobin', abbrName: 'Hb' }), 'Hb');
      assert.isNull(classifyLabItem({ orderCode: '08011C', itemName: 'WBC', abbrName: 'WBC' }));
    });
    it('should return null for unknown codes', function () {
      assert.isNull(classifyLabItem({ orderCode: '09999C', itemName: 'X' }));
    });
  });

  describe('.getCKMMedicationGroups', function () {
    it('should return empty categories for invalid input', function () {
      const { categories, medKeySet } = getCKMMedicationGroups(null, 90);
      assert.deepEqual(categories.antidiabetic, []);
      assert.equal(medKeySet.size, 0);
    });
    it('should group CKM meds by treatment category within tracking days', function () {
      const grouped = [
        {
          date: daysAgo(5), hosp: '甲院',
          medications: [
            { name: 'Forxiga', atc_code: 'A10BK01', drugcode: 'D001', days: 28, drug_left: 0, ingredient: 'dapagliflozin' },
            { name: 'Panadol', atc_code: 'N02BE01', drugcode: 'D999', days: 3, drug_left: 0 },
          ],
        },
        {
          date: daysAgo(200), hosp: '乙院',
          medications: [
            { name: 'OldMed', atc_code: 'C09CA01', drugcode: 'D002', days: 28, drug_left: 0 },
          ],
        },
      ];
      const { categories, medKeySet } = getCKMMedicationGroups(grouped, 90);
      assert.equal(categories.antidiabetic.length, 1);
      assert.equal(categories.antidiabetic[0].name, 'Forxiga');
      assert.equal(categories.antidiabetic[0].keyDrugLabel, 'SGLT2i');
      assert.equal(categories.antihypertensive.length, 0, 'old med should be excluded');
      assert.isTrue(medKeySet.has('c_D001'));
      assert.isFalse(medKeySet.has('c_D999'), 'non-CKM med should not be in medKeySet');
    });
    it('should merge multiple prescriptions of the same drug into one entry', function () {
      const grouped = [
        { date: daysAgo(5), hosp: '甲院', medications: [{ name: 'Forxiga', atc_code: 'A10BK01', drugcode: 'D001', days: 28 }] },
        { date: daysAgo(35), hosp: '甲院', medications: [{ name: 'Forxiga', atc_code: 'A10BK01', drugcode: 'D001', days: 28 }] },
      ];
      const { categories } = getCKMMedicationGroups(grouped, 90);
      assert.equal(categories.antidiabetic.length, 1);
      assert.equal(categories.antidiabetic[0].prescriptions.length, 2);
      // prescriptions sorted newest first
      assert.equal(categories.antidiabetic[0].prescriptions[0].date, daysAgo(5));
    });
  });

  describe('.buildMedKey', function () {
    it('should prefer drugcode', function () {
      assert.equal(buildMedKey({ drugcode: 'D001', name: 'X' }, '2026/01/01'), 'c_D001');
    });
    it('should fall back to name + date', function () {
      assert.equal(buildMedKey({ name: 'X' }, '2026/01/01'), 'n_X_2026/01/01');
    });
  });
});
