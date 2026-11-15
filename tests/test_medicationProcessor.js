import {assert} from './lib/chai.js';

import {medicationProcessor} from './src/utils/medicationProcessor.js';

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

  describe('.calculatePerDosage', function () {
    const calc = (...args) => medicationProcessor.calculatePerDosage(...args);

    it('should calculate common daily frequencies', function () {
      assert.equal(calc(28, 'QD', 28), '1');
      assert.equal(calc(84, 'BID', 28), '1.5');
    });

    it('should calculate weekly frequencies in 0.25 units', function () {
      assert.equal(calc(1, 'QW', 7), '1');
      assert.equal(calc(1, 'QW', 28), '0.25');
      assert.equal(calc(3, 'QW', 84), '0.25');
      assert.equal(calc(2, 'QW', 28), '0.5');
      assert.equal(calc(6, 'QW', 28), '1.5');
      assert.equal(calc(4, 'BIW', 28), '0.5');
      assert.equal(calc(6, 'TIW', 28), '0.5');
    });

    it('should return SPECIAL when the weekly per dose is not a valid unit', function () {
      assert.equal(calc(1, 'QW', 56), 'SPECIAL');
      assert.equal(calc(5, 'QW', 28), 'SPECIAL');
    });

    it('should recognize Q1W as once a week', function () {
      assert.equal(calc(1, 'Q1W', 7), '1');
      assert.equal(calc(2, 'Q1W', 28), '0.5');
    });

    it('should always return SPECIAL for injections', function () {
      // Ozempic：1 支多劑量筆，QW 28 天
      assert.equal(calc(1, 'QW', 28, { isInjection: true }), 'SPECIAL');
      assert.equal(calc(3, 'QW', 84, { isInjection: true }), 'SPECIAL');
      assert.equal(calc(1, 'QW', 7, { isInjection: true }), 'SPECIAL');
      // Trulicity：單劑量筆，每週 1 支
      assert.equal(calc(4, 'QW', 28, { isInjection: true }), 'SPECIAL');
      // 胰島素筆
      assert.equal(calc(3, 'BID', 28, { isInjection: true }), 'SPECIAL');
    });

    it('should keep returning empty string for missing days on injections', function () {
      assert.equal(calc(1, 'ST', '', { isInjection: true }), '');
    });
  });

  describe('.isInjectionDrug', function () {
    const isInjection = (...args) => medicationProcessor.isInjectionDrug(...args);

    it('should detect injections by dosage form', function () {
      assert.isTrue(isInjection('Ozempic solution for injection', 'SEMAGLUTIDE , 注射劑 '));
      assert.isTrue(isInjection('Some Drug', 'XXX , 注射劑 '));
    });

    it('should detect injections and pens by name', function () {
      assert.isTrue(isInjection('TRULICITY injection 1.5mg/0.5mL', ''));
      assert.isTrue(isInjection('NovoRapid FlexPen', ''));
      assert.isTrue(isInjection('Tresiba FlexTouch', ''));
      assert.isTrue(isInjection('Humalog Mix 25 100U/ml KwikPen', ''));
      assert.isTrue(isInjection('NOVORAPID PENFILL 3ML, 100 U/ML', ''));
      assert.isTrue(isInjection('Lantus SoloStar', ''));
    });

    it('should not treat oral drugs as injections', function () {
      assert.isFalse(isInjection('DIOVAN (160)', 'VALSARTAN , 一般錠劑膠囊劑 '));
      assert.isFalse(isInjection('Penicillin V', ''));
      assert.isFalse(isInjection('', ''));
      assert.isFalse(isInjection(undefined, undefined));
    });
  });
});
