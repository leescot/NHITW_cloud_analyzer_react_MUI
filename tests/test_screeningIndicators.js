import {assert} from './lib/chai.js';

import {
  computeFib4, fib4Band,
  computeTyg, tygBand,
  computeHomaIr, homaIrBand,
  computeKfre, kfreBand,
  computeScreeningIndicators,
} from './src/utils/screeningIndicators.js';

function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
const near = (a, b, eps = 0.005) => Math.abs(a - b) <= eps;

describe('utils/screeningIndicators', function () {
  describe('.computeFib4 / .fib4Band', function () {
    it('should compute FIB-4 correctly', function () {
      assert.isTrue(near(computeFib4(50, 40, 30, 200), 1.826), 'FIB-4 ~1.826');
    });
    it('should return null for non-positive / missing inputs', function () {
      assert.isNull(computeFib4(50, 40, 0, 200));
      assert.isNull(computeFib4(NaN, 40, 30, 200));
    });
    it('should band by cutoffs (age <65)', function () {
      assert.equal(fib4Band(1.0, 50), 'low');
      assert.equal(fib4Band(2.0, 50), 'mid');
      assert.equal(fib4Band(3.0, 50), 'high');
    });
    it('should use <2.0 low cutoff when age >=65', function () {
      assert.equal(fib4Band(1.8, 70), 'low');
      assert.equal(fib4Band(2.2, 70), 'mid');
    });
  });

  describe('.computeTyg / .tygBand', function () {
    it('should compute TyG correctly', function () {
      assert.isTrue(near(computeTyg(150, 100), 8.923));
    });
    it('should band by cutoffs', function () {
      assert.equal(tygBand(8.0), 'low');
      assert.equal(tygBand(8.7), 'mid');
      assert.equal(tygBand(9.5), 'high');
    });
  });

  describe('.computeHomaIr / .homaIrBand', function () {
    it('should compute HOMA-IR correctly', function () {
      assert.isTrue(near(computeHomaIr(15, 100), 3.704));
    });
    it('should band by cutoffs', function () {
      assert.equal(homaIrBand(1.5), 'low');
      assert.equal(homaIrBand(2.2), 'mid');
      assert.equal(homaIrBand(3.0), 'high');
    });
  });

  describe('.computeKfre / .kfreBand', function () {
    it('should compute non-NA 2y/5y risk', function () {
      const k = computeKfre(50, 1, 45, 100);
      assert.isTrue(near(k.risk5y, 0.0329), '5y ~3.29%');
      assert.isTrue(near(k.risk2y, 0.0086), '2y ~0.86%');
    });
    it('should return null for invalid inputs', function () {
      assert.isNull(computeKfre(50, 1, 45, 0), 'uacr 0');
      assert.isNull(computeKfre(50, 2, 45, 100), 'male must be 0/1');
    });
    it('should band 5y risk by CKD G3 cutoffs', function () {
      assert.equal(kfreBand(0.03), 'low');
      assert.equal(kfreBand(0.10), 'mid');
      assert.equal(kfreBand(0.20), 'high');
    });
  });

  describe('.computeScreeningIndicators', function () {
    const userInfo = { age: 50, gender: 'M' };

    it('should compute FIB-4 and TyG only from a same-date draw', function () {
      const groupedLabs = [{
        date: daysAgo(3),
        labs: [
          { orderCode: '09025C', value: '40', unit: 'U/L' },        // AST
          { orderCode: '09026C', value: '30', unit: 'U/L' },        // ALT
          { orderCode: '08011C', itemName: 'Platelet', value: '200', unit: 'x10^3/uL' },
          { orderCode: '09004C', value: '150', unit: 'mg/dL' },     // TG
          { orderCode: '09005C', value: '100', unit: 'mg/dL' },     // Glucose
        ],
      }];
      const r = computeScreeningIndicators({ groupedLabs, summary: null, userInfo });
      assert.isNotNull(r.fib4);
      assert.isTrue(near(r.fib4.value, 1.826));
      assert.isNotNull(r.tyg);
      assert.isTrue(near(r.tyg.value, 8.923));
      assert.isNull(r.kfre, 'no summary → no KFRE');
      assert.isNull(r.homaIr, 'no insulin → no HOMA-IR');
    });

    it('should NOT compute FIB-4 when components span different dates', function () {
      const groupedLabs = [
        { date: daysAgo(3), labs: [{ orderCode: '09025C', value: '40', unit: 'U/L' }] },
        { date: daysAgo(10), labs: [{ orderCode: '09026C', value: '30', unit: 'U/L' }, { orderCode: '08011C', itemName: '血小板', value: '200', unit: 'x10^3/uL' }] },
      ];
      const r = computeScreeningIndicators({ groupedLabs, summary: null, userInfo });
      assert.isNull(r.fib4);
    });

    it('should pair HOMA-IR insulin with glucose within 7 days but not 8', function () {
      const within = [
        { date: daysAgo(2), labs: [{ orderCode: '09086B', value: '15', unit: 'uIU/mL' }] },
        { date: daysAgo(5), labs: [{ orderCode: '09005C', value: '100', unit: 'mg/dL' }] },
      ];
      assert.isNotNull(computeScreeningIndicators({ groupedLabs: within, summary: null, userInfo }).homaIr);

      const beyond = [
        { date: daysAgo(2), labs: [{ orderCode: '09086B', value: '15', unit: 'uIU/mL' }] },
        { date: daysAgo(11), labs: [{ orderCode: '09005C', value: '100', unit: 'mg/dL' }] },
      ];
      assert.isNull(computeScreeningIndicators({ groupedLabs: beyond, summary: null, userInfo }).homaIr);
    });

    it('should compute KFRE only when eGFR<60 and UACR present', function () {
      const summaryLow = { latestEGFR: { value: 45, date: daysAgo(5) }, latestUACR: { value: 100, date: daysAgo(5) } };
      assert.isNotNull(computeScreeningIndicators({ groupedLabs: [], summary: summaryLow, userInfo }).kfre);

      const summaryHigh = { latestEGFR: { value: 80, date: daysAgo(5) }, latestUACR: { value: 100, date: daysAgo(5) } };
      assert.isNull(computeScreeningIndicators({ groupedLabs: [], summary: summaryHigh, userInfo }).kfre, 'eGFR>=60 → no KFRE');
    });

    it('should convert mmol/L glucose and pmol/L insulin', function () {
      const groupedLabs = [{
        date: daysAgo(1),
        labs: [
          { orderCode: '09086B', value: '104.2', unit: 'pmol/L' },  // ~15 uIU/mL
          { orderCode: '09005C', value: '5.55', unit: 'mmol/L' },   // ~100 mg/dL
        ],
      }];
      const r = computeScreeningIndicators({ groupedLabs, summary: null, userInfo });
      assert.isNotNull(r.homaIr);
      assert.isTrue(near(r.homaIr.value, 3.704, 0.05));
    });

    it('should skip FIB-4 when age missing', function () {
      const groupedLabs = [{ date: daysAgo(1), labs: [
        { orderCode: '09025C', value: '40' }, { orderCode: '09026C', value: '30' },
        { orderCode: '08011C', itemName: 'Platelet', value: '200' },
      ] }];
      assert.isNull(computeScreeningIndicators({ groupedLabs, summary: null, userInfo: { gender: 'M' } }).fib4);
    });
  });
});
