import { describe, it, assert } from 'vitest';

import { getAbbreviation } from '../src/utils/labProcessorModules/abbreviationUtils.js';

// 以 .test_data(173 個真實個案)實際出現的 assay_item_name 為基礎的回歸測試。
// 對照分析:12111C 名為 'UACR' 的項目(×22)與 09040C '尿液蛋白/肌酸酐比值'(×13)
// 原本被 getAbbreviation 漏判/誤判,見 DOC/04 技術債對應項。
describe('labProcessorModules/abbreviationUtils.getAbbreviation', function () {
  describe('12111C(尿液微量白蛋白)— UACR 判定', function () {
    it('純文字 "UACR" 應判為 UACR(修復前落空回 null)', function () {
      assert.strictEqual(getAbbreviation('12111C', '', 'UACR'), 'UACR');
    });

    it('"Albumin/Creatinine 比值" 判為 UACR', function () {
      assert.strictEqual(getAbbreviation('12111C', '', 'Albumin/Creatinine 比值'), 'UACR');
    });

    it('"ALB/CRE" 判為 UACR', function () {
      assert.strictEqual(getAbbreviation('12111C', '', 'ALB/CRE'), 'UACR');
    });

    it('分母尿肌酐 "Urine creatinine" 不應被判為 UACR', function () {
      assert.notStrictEqual(getAbbreviation('12111C', '', 'Urine creatinine'), 'UACR');
    });

    it('尿微白蛋白 "Urine microalbumin" 仍判為 Albumin(U)', function () {
      assert.strictEqual(getAbbreviation('12111C', '', 'Urine microalbumin'), 'Albumin(U)');
    });
  });

  describe('09040C(尿液總蛋白)— UPCR 判定', function () {
    it('中文 "尿液蛋白/肌酸酐比值" 應判為 UPCR(修復前誤判為 T.Protein(U))', function () {
      assert.strictEqual(getAbbreviation('09040C', '', '尿液蛋白/肌酸酐比值'), 'UPCR');
    });

    it('英文 "Urine protein/Creatinine ratio(UPCR)" 仍判為 UPCR', function () {
      assert.strictEqual(getAbbreviation('09040C', '', 'Urine protein/Creatinine ratio(UPCR)'), 'UPCR');
    });

    it('"TP/CRE" 仍判為 UPCR', function () {
      assert.strictEqual(getAbbreviation('09040C', '', 'TP/CRE'), 'UPCR');
    });

    it('分母尿肌酐 "Urine creatinine" 仍判為 Cr(Urine)', function () {
      assert.strictEqual(getAbbreviation('09040C', '', 'Urine creatinine'), 'Cr(Urine)');
    });

    it('尿液總蛋白 "Micro Total Protein_Urine" 仍判為 T.Protein(U)', function () {
      assert.strictEqual(getAbbreviation('09040C', '', 'Micro Total Protein_Urine'), 'T.Protein(U)');
    });
  });
});
