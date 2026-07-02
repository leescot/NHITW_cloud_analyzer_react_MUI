# CKM 整合進 Overview 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依 `docs/superpowers/specs/2026-06-29-ckm-overview-integration-design.md`，將 CKM Tab 的關鍵功能融合進 Overview Tab（SummaryBar、CKM 關鍵用藥、CKM 檢驗合併、右欄 ExtraLab/Imaging 卡片），並移除獨立 CKM Tab。

**Architecture:** 先把 `CKMData.jsx` 內的純邏輯抽到 `src/utils/ckmUtils.js`（可被瀏覽器 Mocha 測試），展示元件抽到 `src/components/tabs/ckm/`。然後逐一改造 Overview 三欄，最後改 FloatingIcon 的 props 傳遞與 Tab 移除。所有 CKM 加強內容以 `enableCKMTab === true` 為總開關，未開啟時 Overview 完全不變。

**Tech Stack:** React 18 + MUI v5、esbuild（content script 打包）、瀏覽器內 Mocha/Chai（`npm run test` → http://localhost:5173/test.html）。

**測試限制（重要）：** 本專案沒有 headless test runner。單元測試只能在瀏覽器執行。因此每個 task 的驗證方式是：`npm run build`（確認可編譯）＋ `npm run lint`；純邏輯的單元測試寫在 `tests/test_ckmUtils.js`，於 Task 8 一併在瀏覽器驗證。**`src/utils/ckmUtils.js` 不可 import 任何 npm 套件**（瀏覽器 ESM 無法解析 bare specifier），只能 import 相對路徑的 `../config/ckmDefinitions`。

**Commit 訊息使用繁體中文**（repo 慣例）。

---

## 資料形狀備忘（給沒有 context 的工程師）

- `groupedMedications`（medicationProcessor 輸出）：`[{ date, hosp, icd_code, icd_name, medications: [{ name, ingredient, perDosage, frequency, days, atc_code, atc_name, drug_left, drugcode, start_date? }] }]`
- `groupedLabs`（labProcessor 輸出）：`[{ date, hosp, labs: [{ orderCode, orderName, itemName, abbrName, assayMethod, value, result, unit, valueStatus, isAbnormal, referenceMin, referenceMax }] }]`
- `ckmData`（ckmProcessor 輸出）：`{ hasCKMData, summary: { ckdStage, latestEGFR, latestHbA1c, latestLDL, latestUACR, latestUPCR, lvef }, diagnoses, medications: { antidiabetic: [...], ... }（六類，項目含 drugName/atcCode/date/dosage）, imaging: [{ date, hospital, orderName, hasReport, reportExcerpt, reportFull }], ekgAlerts: [{ date, findings, orderName }] }`
- `generalDisplaySettings` 內含 `enableCKMTab`、`enableNephroReport`（settingsManager 已放入）。
- `CKM_ATC_PREFIXES`（`src/config/ckmDefinitions.js`）：`{ antidiabetic: {prefixes:['A10'], label:'血糖'}, antihypertensive: {...'血壓'}, diuretic: {...'利尿'}, lipidLowering: {...'血脂'}, antithrombotic: {...'血栓'}, cardiac: {...'心臟'} }`

---

### Task 1: 抽出 CKM 純邏輯到 `src/utils/ckmUtils.js`（含單元測試）

**Files:**
- Create: `src/utils/ckmUtils.js`
- Create: `tests/test_ckmUtils.js`
- Modify: `tests/test.js`（註冊測試檔）

- [x] **Step 1.1: 寫測試檔 `tests/test_ckmUtils.js`**

```js
import {assert} from './lib/chai.js';

import {
  KEY_DRUG_CLASSES,
  CKM_LAB_ITEMS,
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
```

- [x] **Step 1.2: 在 `tests/test.js` 註冊**

在 `await import('./test_patientSummaryProcessor.js');` 之後加一行：

```js
await import('./test_ckmUtils.js');
```

- [x] **Step 1.3: 建立 `src/utils/ckmUtils.js`**

內容如下（`KEY_DRUG_CLASSES`、`getKeyDrugLabel`、`getRecentKeyDrugs`、`CKM_LAB_ITEMS`、`classifyLabItem` 從 `CKMData.jsx` 原封搬移；`getCKMMedicationGroups`、`buildMedKey` 為新增）：

```js
// CKM 共用邏輯（由 CKMData.jsx 抽出，供 Overview 與 CKM 元件共用）
// 注意：本檔會被瀏覽器內 Mocha 測試直接 import，不可 import 任何 npm 套件
import { CKM_ATC_PREFIXES } from '../config/ckmDefinitions';

export const KEY_DRUG_CLASSES = [
  { label: 'ACEI', prefixes: ['C09A', 'C09B'] },
  { label: 'ARNI', prefixes: ['C09DX04'] },
  { label: 'ARB', prefixes: ['C09C', 'C09D'] },
  { label: 'MRA', prefixes: ['C03DA', 'C03DB'] },
  { label: 'Statin', prefixes: ['C10AA', 'C10BA', 'C10BX'] },
  { label: 'PCSK9i', prefixes: ['C10AX13', 'C10AX14'] },
  { label: 'SGLT2i', prefixes: ['A10BK', 'A10BD15', 'A10BD19', 'A10BD20', 'A10BD21', 'A10BD23', 'A10BD24', 'A10BD25', 'A10BD27'] },
  { label: 'GLP1', prefixes: ['A10BJ', 'A10AE54', 'A10AE56'] },
];

export function getKeyDrugLabel(atcCode) {
  if (!atcCode) return null;
  for (const cls of KEY_DRUG_CLASSES) {
    if (cls.prefixes.some(p => atcCode.startsWith(p))) return cls.label;
  }
  return null;
}

// medications: ckmData.medications（六大類 → [{ drugName, atcCode, date, dosage }]）
// 回傳 90 天內每個 KEY_DRUG_CLASSES 類別最早找到的一筆
export function getRecentKeyDrugs(medications) {
  if (!medications) return [];
  const now = new Date();
  const cutoff = now.getTime() - 90 * 24 * 60 * 60 * 1000;
  const found = new Map();

  for (const cat of Object.values(medications)) {
    for (const med of cat) {
      if (!med.date) continue;
      const d = new Date(med.date.replace(/\//g, '-'));
      if (isNaN(d.getTime()) || d.getTime() < cutoff) continue;
      const atc = med.atcCode || '';
      for (const cls of KEY_DRUG_CLASSES) {
        if (cls.prefixes.some(p => atc.startsWith(p)) && !found.has(cls.label)) {
          found.set(cls.label, { label: cls.label, drugName: med.drugName || '', dosage: med.dosage || '', date: med.date });
        }
      }
    }
  }
  return KEY_DRUG_CLASSES.filter(c => found.has(c.label)).map(c => found.get(c.label));
}

export const CKM_LAB_ITEMS = [
  { orderCode: '08011C-Hb', displayName: 'Hb' },
  { orderCode: '09002C', displayName: 'BUN' },
  { orderCode: '09015C', displayName: 'Cr', special: true },
  { orderCode: '09015C', displayName: 'eGFR', special: true },
  { orderCode: '09015C', displayName: 'eGFR(健保署)', special: true },
  { orderCode: '09038C', displayName: 'Alb' },
  { orderCode: '09040C', displayName: 'UPCR', special: true },
  { orderCode: '12111C', displayName: 'UACR', special: true },
  { orderCode: '09005C', displayName: 'Glucose' },
  { orderCode: '09006C', displayName: 'HbA1c' },
  { orderCode: '09001C', displayName: 'Chol' },
  { orderCode: '09004C', displayName: 'TG' },
  { orderCode: '09043C', displayName: 'HDL' },
  { orderCode: '09044C', displayName: 'LDL' },
  { orderCode: '09013C', displayName: 'U.A' },
  { orderCode: '09021C', displayName: 'Na' },
  { orderCode: '09022C', displayName: 'K' },
  { orderCode: '09098B', displayName: 'Tro-T' },
  { orderCode: '09099C', displayName: 'Tro-I' },
  { orderCode: '12193C', displayName: 'NT-proBNP', special: true },
  { orderCode: '12193C', displayName: 'BNP', special: true },
  { orderCode: '09071C', displayName: 'CK-MB' },
  { orderCode: '08079B', displayName: 'D-dimer' },
];

// 需要 classifyLabItem 細分的 orderCode（Cr/eGFR、UPCR、UACR、Hb、BNP/NT-proBNP）
export const CKM_SPECIAL_LAB_CODES = ['09015C', '09040C', '12111C', '08011C', '12193C'];

// lab: labProcessor 輸出的單筆（orderCode/itemName/abbrName/assayMethod）
export function classifyLabItem(lab) {
  const code = lab.orderCode || '';
  const name = (lab.itemName || '').toLowerCase();
  const abbr = (lab.abbrName || '').toLowerCase();
  const method = lab.assayMethod || '';

  if (code === '09015C') {
    const isNHI = method === '健保署計算' || abbr === 'egfr(健保署)';
    const isGFR = isNHI || abbr === 'egfr' || abbr === 'egfr(mdrd)' ||
      name.includes('gfr') || name.includes('腎絲球過濾率') || name.includes('ccr');
    if (isNHI) return 'eGFR(健保署)';
    if (isGFR) return 'eGFR';
    return 'Cr';
  }
  if (code === '09040C') {
    if (abbr === 'upcr' || name.includes('upcr') || name.includes('蛋白/肌酸酐') || name.includes('protein/creatinine')) return 'UPCR';
    return null;
  }
  if (code === '12111C') {
    if (abbr === 'uacr' || name.includes('u-acr') || name.includes('albumin/creatinine') || name.includes('/cre')) return 'UACR';
    return null;
  }
  if (code === '08011C') {
    const n = name + ' ' + abbr;
    if (/\bhb\b|hemoglobin|血色素/.test(n)) return 'Hb';
    return null;
  }
  if (code === '12193C') {
    const n = name + ' ' + abbr;
    if (/nt/i.test(n)) return 'NT-proBNP';
    return 'BNP';
  }
  return null;
}

// 去重 key：優先 drugcode，否則 name + date
export function buildMedKey(med, dateFallback) {
  const drugcode = med.drugcode || med.drug_code || '';
  if (drugcode) return `c_${drugcode}`;
  return `n_${med.name}_${med.start_date || dateFallback || ''}`;
}

// 從 groupedMedications（medicationProcessor 輸出）篩出追蹤天數內的 CKM 相關藥物，
// 按 CKM_ATC_PREFIXES 六大治療群組分類；不受 ATC5 群組設定限制。
// 回傳 { categories: { antidiabetic: [entry], ... }, medKeySet: Set<string> }
// entry: { category, name, genericName, drugcode, atcCode, keyDrugLabel, prescriptions: [{date, hospital, days, drug_left}] }
export function getCKMMedicationGroups(groupedMedications, trackingDays = 90) {
  const categories = {};
  for (const key of Object.keys(CKM_ATC_PREFIXES)) categories[key] = [];
  const medKeySet = new Set();
  if (!groupedMedications || !Array.isArray(groupedMedications)) return { categories, medKeySet };

  const cutoff = Date.now() - trackingDays * 24 * 60 * 60 * 1000;
  const seen = new Map();

  groupedMedications.forEach(group => {
    if (!group.medications || !Array.isArray(group.medications)) return;
    group.medications.forEach(med => {
      const date = med.start_date || group.date || '';
      const d = new Date(String(date).replace(/-/g, '/'));
      if (isNaN(d.getTime()) || d.getTime() < cutoff) return;

      const atc = med.atc_code || '';
      let category = null;
      for (const [cat, { prefixes }] of Object.entries(CKM_ATC_PREFIXES)) {
        if (prefixes.some(p => atc.startsWith(p))) { category = cat; break; }
      }
      if (!category) return;

      const drugcode = med.drugcode || med.drug_code || '';
      medKeySet.add(buildMedKey(med, date));

      const key = `${category}_${drugcode || med.name}`;
      const prescription = {
        date,
        hospital: med.hospital || group.hosp || '',
        days: med.days,
        drug_left: med.drug_left || 0,
      };
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, {
          category,
          name: med.name || '',
          genericName: med.ingredient || '',
          drugcode,
          atcCode: atc,
          keyDrugLabel: getKeyDrugLabel(atc),
          prescriptions: [prescription],
        });
      } else {
        existing.prescriptions.push(prescription);
      }
    });
  });

  for (const entry of seen.values()) {
    entry.prescriptions.sort((a, b) => new Date(b.date) - new Date(a.date));
    categories[entry.category].push(entry);
  }
  for (const cat of Object.keys(categories)) {
    categories[cat].sort((a, b) => new Date(b.prescriptions[0].date) - new Date(a.prescriptions[0].date));
  }
  return { categories, medKeySet };
}
```

- [x] **Step 1.4: 驗證編譯**

Run: `npm run build`
Expected: 成功結束（無 esbuild/vite 錯誤）

Run: `npm run lint`
Expected: 無新增 error（既有 warning 可忽略）

- [x] **Step 1.5: Commit**

```bash
git add src/utils/ckmUtils.js tests/test_ckmUtils.js tests/test.js
git commit -m "refactor: 抽出 CKM 共用邏輯至 ckmUtils 並新增單元測試"
```

---

### Task 2: 抽出共用元件到 `src/components/tabs/ckm/`，`CKMData.jsx` 改用

**Files:**
- Create: `src/components/tabs/ckm/ckmCardUtils.jsx`
- Create: `src/components/tabs/ckm/CKMSummaryBar.jsx`
- Create: `src/components/tabs/ckm/CKMExtraLabCard.jsx`
- Create: `src/components/tabs/ckm/CKMImagingCard.jsx`
- Modify: `src/components/tabs/CKMData.jsx`（刪除搬走的程式碼、改 import）

- [x] **Step 2.1: 建立 `src/components/tabs/ckm/ckmCardUtils.jsx`**

```jsx
// CKM 卡片共用的展示 helpers（由 CKMData.jsx 抽出）
import React from 'react';
import { Box, Typography } from '@mui/material';

export const cs = { py: 0.25, px: 0.5 };

export function sd(d) { if (!d) return ''; const p = d.replace(/-/g, '/').split('/'); return p.length === 3 ? `${p[1]}/${p[2]}` : d; }

export function getStatusColor(test) {
  if (!test) return 'inherit';
  if (test.valueStatus === 'high') return '#f44336';
  if (test.valueStatus === 'low') return '#3d8c40';
  if (test.valueStatus === undefined && test.isAbnormal) return '#f44336';
  return 'inherit';
}

export function getStatusBg(test) {
  if (!test) return 'inherit';
  if (test.valueStatus === 'high') return 'rgba(244,67,54,0.05)';
  if (test.valueStatus === 'low') return 'rgba(76,175,80,0.05)';
  if (test.valueStatus === undefined && test.isAbnormal) return 'rgba(244,67,54,0.05)';
  return 'inherit';
}

const HIGHLIGHT_TERMS = [/diagnosis/i, /impression/i, /(?<![A-Za-z])IMP(?![A-Za-z])/, /interpretation/i, /conclusion/i, /LVEF/i, /\bEF(?![A-Za-z])/, /診斷/];

export function highlightReport(content) {
  if (!content) return content;
  let result = content;
  HIGHLIGHT_TERMS.forEach(term => {
    result = result.replace(new RegExp(term.source, 'g' + term.flags), match => `<span style="color:red;font-weight:bold">${match}</span>`);
  });
  return result;
}

export function formatOrderName(name) {
  if (!name) return '';
  let f = name.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '');
  if (f.includes(';')) f = f.split(';')[0];
  return f.trim();
}

export const SectionTitle = ({ children }) => (
  <Box sx={{ bgcolor: '#e3f2fd', px: 0.75, py: 0.3, borderRadius: '4px 4px 0 0' }}>
    <Typography variant="caption" sx={{ fontWeight: 700, color: '#1565c0' }}>{children}</Typography>
  </Box>
);
```

- [x] **Step 2.2: 建立 `src/components/tabs/ckm/CKMSummaryBar.jsx`**

程式碼與 `CKMData.jsx` 的 `SummaryBar` 完全相同，僅改為獨立檔案 + default export：

```jsx
// CKM 頂部摘要列：90天內關鍵用藥 badge + CKD Stage / 近期檢驗 Chip
import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { getRecentKeyDrugs } from '../../../utils/ckmUtils';

const CKMSummaryBar = ({ summary, medications, gds }) => {
  if (!summary) return null;

  const drugBadges = getRecentKeyDrugs(medications);

  const labChips = [];
  const tc = (key, label, data, color) => labChips.push(<Tooltip key={key} title={data.date || ''} arrow><Chip label={label} size="small" color={color} variant="outlined" sx={{mr:0.5}}/></Tooltip>);
  if (summary.ckdStage) {
    const isAdvanced = ['G3a','G3b','G4','G5'].includes(summary.ckdStage);
    const hasProteinuria = (summary.latestUACR && summary.latestUACR.value > 30) || (summary.latestUPCR && summary.latestUPCR.value > 150);
    if (isAdvanced || hasProteinuria) {
      labChips.push(<Chip key="ckd" label={`CKD ${summary.ckdStage}`} size="small" color={isAdvanced?'error':'warning'} sx={{fontWeight:600,mr:0.5}}/>);
    }
  }
  if (summary.latestEGFR) tc('egfr', `eGFR ${summary.latestEGFR.value}`, summary.latestEGFR, summary.latestEGFR.value<60?'error':'success');
  if (summary.latestHbA1c) tc('hba1c', `HbA1c ${summary.latestHbA1c.value}%`, summary.latestHbA1c, summary.latestHbA1c.value>7?'error':'success');
  if (summary.latestLDL) tc('ldl', `LDL ${summary.latestLDL.value}`, summary.latestLDL, summary.latestLDL.value>100?'error':'success');
  if (summary.latestUACR) tc('uacr', `UACR ${summary.latestUACR.value}`, summary.latestUACR, summary.latestUACR.value>30?'error':'success');
  if (summary.lvef) { const v = summary.lvef.value; tc('lvef', `LVEF ${v}%`, summary.lvef, v<40?'error':v<50?'warning':'success'); }

  if (drugBadges.length === 0 && labChips.length === 0) return null;

  return (
    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', mb:0.5, p:0.5, bgcolor:'#f5f5f5', borderRadius:1, flexWrap:'wrap', gap:0.5 }}>
      {drugBadges.length > 0 && (
        <>
          <Typography variant="caption" sx={{ fontWeight:600, color:'text.secondary', mr:0.25 }}>90天內用藥 -</Typography>
          {drugBadges.map(d => (
            <Tooltip key={d.label} title={`${d.drugName} ${d.dosage ? d.dosage+'#' : ''} ${d.date}`} arrow>
              <Chip label={d.label} size="small" color="primary" variant="outlined" sx={{ mr:0.25, height:22 }} />
            </Tooltip>
          ))}
        </>
      )}
      {drugBadges.length > 0 && labChips.length > 0 && (
        <Typography sx={{ mx:0.5, color:'#bbb', fontSize:'0.9rem' }}>|</Typography>
      )}
      {labChips.length > 0 && (
        <>
          <Typography variant="caption" sx={{ fontWeight:600, color:'text.secondary', mr:0.25 }}>近期檢驗 -</Typography>
          {labChips}
        </>
      )}
    </Box>
  );
};

export default CKMSummaryBar;
```

（`gds` prop 目前未使用但保留簽名，與原版一致。）

- [x] **Step 2.3: 建立 `src/components/tabs/ckm/CKMExtraLabCard.jsx`**

`ExtraLabCard` + `EXTRA_LAB_ITEMS` 原封搬移：

```jsx
// 其他檢驗卡片（TSH、FT4、iPTH、Lp(a) 等）— 由 CKMData.jsx 抽出
import React, { useMemo } from 'react';
import { Paper, Table, TableBody, TableCell, TableRow } from '@mui/material';
import TypographySizeWrapper from '../../utils/TypographySizeWrapper';
import { SectionTitle, cs, sd, getStatusColor } from './ckmCardUtils';

export const EXTRA_LAB_ITEMS = [
  { code: '09112C', name: 'TSH' },
  { code: '09106C', name: 'FT4' },
  { code: '09117C', name: 'T3' },
  { code: '09113C', name: 'Cortisol' },
  { code: '09119B', name: 'ACTH' },
  { code: '09086B', name: 'Insulin' },
  { code: '09128C', name: 'C-peptide' },
  { code: '09114B', name: 'Aldosterone' },
  { code: '27031B', name: 'Aldosterone' },
  { code: '09124B', name: 'Renin' },
  { code: '27032B', name: 'Renin' },
  { code: '09122C', name: 'iPTH' },
  { code: '12164B', name: 'Lp(a)' },
];

const CKMExtraLabCard = ({ groupedLabs, gds }) => {
  const items = useMemo(() => {
    if (!groupedLabs || groupedLabs.length === 0) return [];
    const codeSet = new Set(EXTRA_LAB_ITEMS.map(e => e.code));
    const latest = new Map();

    for (const labGroup of groupedLabs) {
      if (!labGroup.labs) continue;
      for (const lab of labGroup.labs) {
        if (!codeSet.has(lab.orderCode)) continue;
        const val = lab.value || lab.result;
        if (!val) continue;
        const key = lab.orderCode;
        const date = labGroup.date || '';
        if (!latest.has(key) || date > latest.get(key).date) {
          latest.set(key, { code: lab.orderCode, name: lab.abbrName || lab.itemName || '', value: val, unit: lab.unit || '', date, hospital: labGroup.hosp || '', valueStatus: lab.valueStatus, isAbnormal: lab.isAbnormal });
        }
      }
    }

    const result = [];
    for (const def of EXTRA_LAB_ITEMS) {
      const found = latest.get(def.code);
      if (found) result.push({ ...found, displayName: def.name });
    }
    return result;
  }, [groupedLabs]);

  if (items.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, mb: 0.75, overflow: 'hidden' }}>
      <SectionTitle>其他檢驗</SectionTitle>
      <Table size="small"><TableBody>
        {items.map((item, i) => (
          <TableRow key={i} sx={{ '&:last-child td': { borderBottom: 0 } }}>
            <TableCell sx={{ ...cs, color: 'text.secondary', width: '40%' }}>
              <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds}>{item.displayName}</TypographySizeWrapper>
            </TableCell>
            <TableCell sx={{ ...cs, fontWeight: (item.valueStatus === 'high' || item.valueStatus === 'low' || item.isAbnormal) ? 700 : 400, color: getStatusColor(item) }}>
              <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds}>{item.value}</TypographySizeWrapper>
            </TableCell>
            <TableCell sx={{ ...cs, color: 'text.secondary' }}>
              <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds}>{item.unit}</TypographySizeWrapper>
            </TableCell>
            <TableCell sx={{ ...cs, color: 'text.secondary' }}>
              <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds}>{sd(item.date)}</TypographySizeWrapper>
            </TableCell>
          </TableRow>
        ))}
      </TableBody></Table>
    </Paper>
  );
};

export default CKMExtraLabCard;
```

- [x] **Step 2.4: 建立 `src/components/tabs/ckm/CKMImagingCard.jsx`**

`ImagingCard` 原封搬移（含報告 tooltip/dialog、EKG alert 與 LVEF 標註）：

```jsx
// CKM 影像卡片（含 EKG alert / LVEF 標註、報告 tooltip 與 dialog）— 由 CKMData.jsx 抽出
import React, { useState, useMemo } from 'react';
import {
  Paper, Typography, Tooltip, IconButton, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TypographySizeWrapper from '../../utils/TypographySizeWrapper';
import { SectionTitle, highlightReport, formatOrderName } from './ckmCardUtils';

const CKMImagingCard = ({ imaging, ekgAlerts, lvef, gds }) => {
  const [reportDialog, setReportDialog] = useState({ open: false, content: '', title: '' });
  const [copySuccess, setCopySuccess] = useState(false);

  const withReportOnly = useMemo(() => {
    if (!imaging) return [];
    return imaging.filter(img => img.hasReport && img.reportExcerpt);
  }, [imaging]);

  const annotations = useMemo(() => {
    const map = new Map();
    if (ekgAlerts) {
      ekgAlerts.forEach(alert => {
        const key = alert.date;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(alert.findings.join(', '));
      });
    }
    if (lvef) {
      const key = lvef.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(`LVEF ${lvef.value}%`);
    }
    return map;
  }, [ekgAlerts, lvef]);

  if (withReportOnly.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ borderRadius:1, mb:0.75, overflow:'hidden' }}>
      <SectionTitle>影像</SectionTitle>
      <List dense disablePadding>
        {withReportOnly.map((img, i) => {
          const notes = annotations.get(img.date) || [];
          return (
          <ListItem
            key={i}
            sx={{ py: 0.3, borderBottom: i < withReportOnly.length - 1 ? '1px solid #eee' : 0, alignItems: 'flex-start' }}
            secondaryAction={
              <Tooltip
                title={
                  <Typography variant="caption" style={{whiteSpace:'pre-line'}}>
                    <div dangerouslySetInnerHTML={{__html: highlightReport(img.reportExcerpt)}} />
                  </Typography>
                }
              >
                <IconButton size="small" color="primary" onClick={() => setReportDialog({
                  open: true,
                  title: `${formatOrderName(img.orderName)} - ${img.date}`,
                  content: img.reportFull || img.reportExcerpt,
                })}>
                  <DescriptionIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            <ListItemText
              primary={
                <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds}>
                  {formatOrderName(img.orderName)}
                </TypographySizeWrapper>
              }
              secondary={
                <>
                  <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds} color="text.secondary">
                    {img.date} {img.hospital}
                  </TypographySizeWrapper>
                  {notes.length > 0 && (
                    <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds} sx={{ display: 'block', color: 'text.primary' }}>
                      {notes.join('；')}
                    </TypographySizeWrapper>
                  )}
                </>
              }
            />
          </ListItem>
          );
        })}
      </List>

      <Dialog open={reportDialog.open} onClose={() => setReportDialog({...reportDialog, open:false})} maxWidth="md" fullWidth>
        <DialogTitle>
          <TypographySizeWrapper textSizeType="title" generalDisplaySettings={gds}>{reportDialog.title}</TypographySizeWrapper>
        </DialogTitle>
        <DialogContent dividers>
          <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds} style={{whiteSpace:'pre-line'}}>
            <div dangerouslySetInnerHTML={{__html: highlightReport(reportDialog.content)}} />
          </TypographySizeWrapper>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<ContentCopyIcon/>} onClick={() => {
            navigator.clipboard.writeText(reportDialog.content).then(() => { setCopySuccess(true); setTimeout(()=>setCopySuccess(false),2000); });
          }}>{copySuccess ? '已複製' : '複製'}</Button>
          <Button onClick={() => setReportDialog({...reportDialog, open:false})}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CKMImagingCard;
```

- [x] **Step 2.5: 改寫 `src/components/tabs/CKMData.jsx`**

刪除以下已搬走的定義：`CKM_LAB_ITEMS`、`sd`、`classifyLabItem`、`getStatusColor`、`getStatusBg`、`HIGHLIGHT_TERMS`、`highlightReport`、`formatOrderName`、`KEY_DRUG_CLASSES`、`getKeyDrugLabel`、`getRecentKeyDrugs`、`SummaryBar`、`ExtraLabCard`、`EXTRA_LAB_ITEMS`、`ImagingCard`、`SectionTitle`、`cs`。

檔案頂部 import 改為：

```jsx
import React, { useMemo } from 'react';
import {
  Box, Typography, Chip, Grid, Tooltip, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton,
} from '@mui/material';
import TypographySizeWrapper from '../utils/TypographySizeWrapper';
import PrintIcon from '@mui/icons-material/Print';
import LabItemTrendPopover from './lab/LabItemTrendPopover';
import { CKM_ATC_PREFIXES } from '../../config/ckmDefinitions';
import { buildNephroReport, renderNephroReportHTML, attachNephroReportHandlers } from '../../utils/nephroReportBuilder';
import { CKM_LAB_ITEMS, CKM_SPECIAL_LAB_CODES, classifyLabItem, getKeyDrugLabel } from '../../utils/ckmUtils';
import { SectionTitle, cs, sd, getStatusColor, getStatusBg } from './ckm/ckmCardUtils';
import CKMSummaryBar from './ckm/CKMSummaryBar';
import CKMExtraLabCard from './ckm/CKMExtraLabCard';
import CKMImagingCard from './ckm/CKMImagingCard';
```

保留 `CATEGORY_LABELS`、`CATEGORY_COLORS`、`TRACKING_DAYS`、`DiagnosisCard`、`MedicationCard`、`CKMLabTable`。`CKMLabTable` 內兩處 `const specialCodes = [...]` / `specialCodesAll` 直接改用 `CKM_SPECIAL_LAB_CODES`。

主元件 JSX 改用新名稱：

```jsx
      <CKMSummaryBar summary={ckmData.summary} medications={ckmData.medications} gds={gds} />
      ...
          <CKMExtraLabCard groupedLabs={groupedLabs} gds={gds} />
      ...
          <CKMImagingCard imaging={ckmData.imaging} ekgAlerts={ckmData.ekgAlerts} lvef={ckmData.summary.lvef} gds={gds} />
```

（`useState`、`DescriptionIcon`、`ContentCopyIcon`、`Dialog` 系列、`List` 系列、`Stack`、`Button` 若已無使用要一併從 import 移除，跑 lint 確認。）

- [x] **Step 2.6: 驗證編譯**

Run: `npm run build`
Expected: 成功

Run: `npm run lint`
Expected: 無 unused-import / undefined 錯誤

- [x] **Step 2.7: Commit**

```bash
git add src/components/tabs/ckm/ src/components/tabs/CKMData.jsx
git commit -m "refactor: 抽出 CKM SummaryBar/ExtraLabCard/ImagingCard 為共用元件"
```

---

### Task 3: 左欄藥物 — CKM 關鍵用藥群組 + ATC5 去重

**Files:**
- Modify: `src/components/tabs/Overview_ImportantMedications.jsx`

- [x] **Step 3.1: 新增 props 與 CKM 分組計算**

新增 import（檔案頂部）：

```jsx
import { getCKMMedicationGroups, buildMedKey } from "../../utils/ckmUtils";
import { CKM_ATC_PREFIXES } from "../../config/ckmDefinitions";
```

元件簽名加 `enableCKMBadge`：

```jsx
const Overview_ImportantMedications = ({
  groupedMedications = [],
  settings = {},
  overviewSettings = {},
  generalDisplaySettings = { titleTextSize: 'medium', contentTextSize: 'medium', noteTextSize: 'small' },
  enableCKMBadge = false,
}) => {
```

在 `const trackingDays = ...` 之後加：

```jsx
  // CKM 關鍵用藥區：不受 ATC5 群組設定限制，直接以 CKM_ATC_PREFIXES 篩選
  const ckmGroups = enableCKMBadge
    ? getCKMMedicationGroups(groupedMedications, trackingDays)
    : { categories: {}, medKeySet: new Set() };
  const hasCKMSection = enableCKMBadge &&
    Object.values(ckmGroups.categories).some(arr => arr.length > 0);

  // 依 CKM_ATC_PREFIXES 順序攤平為表格列（血糖/血壓/利尿/血脂/血栓/心臟）
  const ckmTableData = [];
  if (hasCKMSection) {
    for (const [cat, { label }] of Object.entries(CKM_ATC_PREFIXES)) {
      const items = ckmGroups.categories[cat] || [];
      items.forEach(med => ckmTableData.push({ categoryLabel: label, medication: med }));
    }
  }
```

- [x] **Step 3.2: ATC5 區去重**

Step 1 收集迴圈中，`if (isWithinLastNDays(dateToCheck, trackingDays)) {` 內、`const colorGroup = ...` 之前加：

```jsx
        // CKM 開啟時，已出現在 CKM 關鍵用藥區的藥物不重複列在 ATC5 色彩群組
        if (enableCKMBadge && ckmGroups.medKeySet.has(buildMedKey(med, dateToCheck))) {
          return;
        }
```

- [x] **Step 3.3: 渲染 CKM 區塊**

CKM 群組 badge 用固定藍色系。在 `getCategoryBadge` 定義後加：

```jsx
  // CKM 治療群組 badge 用色（固定藍色系）
  const CKM_COLOR_INFO = {
    light: alpha('#1565c0', 0.12),
    medium: '#1565c0',
    dark: '#0d47a1',
    name: '藍色'
  };
```

JSX：標題 `關注西藥 - {trackingDays} 天內` 之後、`{hasData ? (` 之前插入 CKM 區塊：

```jsx
      {hasCKMSection && (
        <TableContainer sx={{ mb: hasData || hasMedicationsButNoGroups ? 1.5 : 0 }}>
          <Table size="small" stickyHeader>
            <TableBody>
              {ckmTableData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell
                    align="center"
                    sx={{
                      backgroundColor: CKM_COLOR_INFO.light,
                      paddingTop: 0.5,
                      paddingBottom: 0.5,
                      width: '15%',
                      padding: '4px 1px',
                    }}
                  >
                    {getCategoryBadge(row.categoryLabel, CKM_COLOR_INFO)}
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <TypographySizeWrapper
                        variant="body2"
                        sx={{ fontWeight: 'medium' }}
                        generalDisplaySettings={generalDisplaySettings}
                      >
                        {formatMedicationName(row.medication.name)}
                        {row.medication.keyDrugLabel && (
                          <Chip
                            label={row.medication.keyDrugLabel}
                            size="small"
                            sx={{ height: 16, fontSize: '0.6rem', ml: 0.5, bgcolor: '#1565c0', color: '#fff', '& .MuiChip-label': { px: 0.4 } }}
                          />
                        )}
                        {safeSettings.showExternalDrugImage && row.medication.drugcode && (
                          <Tooltip title="查看藥物圖片">
                            <IconButton
                              size="small"
                              onClick={() => handleDrugImageClick(row.medication.drugcode)}
                              sx={{
                                ml: 0.5,
                                opacity: 0.5,
                                padding: "2px",
                                display: "inline-flex",
                                verticalAlign: "text-top",
                                '&:hover': { opacity: 1 }
                              }}
                            >
                              <ImageIcon sx={{
                                fontSize: generalDisplaySettings.contentTextSize === 'small'
                                  ? "14px"
                                  : generalDisplaySettings.contentTextSize === 'medium'
                                    ? "16px"
                                    : "18px"
                              }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TypographySizeWrapper>
                      {row.medication.genericName && (
                        <TypographySizeWrapper
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.25 }}
                          generalDisplaySettings={generalDisplaySettings}
                        >
                          {row.medication.genericName}
                        </TypographySizeWrapper>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {row.medication.prescriptions.slice(0, 3).map((prescription, i) => {
                        const hasRemainingMed = prescription.drug_left > 0;
                        return (
                          <Tooltip
                            key={i}
                            title={
                              <>
                                {hasRemainingMed ? `餘藥 ${prescription.drug_left} 天` : ''}
                                {prescription.days && (hasRemainingMed ? ' | ' : '') + `用藥 ${prescription.days} 天`}
                              </>
                            }
                            placement="top"
                          >
                            <Chip
                              size="small"
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <span>{`${formatDate(prescription.date)}${prescription.hospital ? ` (${prescription.hospital})` : ''}`}</span>
                                  {hasRemainingMed && (
                                    <Box component="span" sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      ml: 0.5,
                                      fontSize: '0.65rem',
                                      color: CKM_COLOR_INFO.dark
                                    }}>
                                      <LocalPharmacyIcon sx={{ fontSize: '0.75rem', mr: 0.2 }} />
                                      {prescription.drug_left}天
                                    </Box>
                                  )}
                                </Box>
                              }
                              sx={{
                                fontSize: '0.7rem',
                                height: 'auto',
                                minHeight: '20px',
                                bgcolor: hasRemainingMed ? CKM_COLOR_INFO.light : 'transparent',
                                border: '1px solid',
                                borderColor: hasRemainingMed ? CKM_COLOR_INFO.medium : 'grey.300',
                                py: hasRemainingMed ? 0.2 : 0
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                      {row.medication.prescriptions.length > 3 && (
                        <Tooltip title={row.medication.prescriptions.slice(3).map(p => {
                          const hasRemainingMed = p.drug_left > 0;
                          return `${formatDate(p.date)}${p.hospital ? ` (${p.hospital})` : ''}${p.days ? ` | 用藥 ${p.days} 天` : ''}${hasRemainingMed ? ` | 餘藥 ${p.drug_left} 天` : ''}`;
                        }).join('\n')}>
                          <Chip
                            size="small"
                            label={`+${row.medication.prescriptions.length - 3}`}
                            sx={{ fontSize: '0.7rem', height: '20px', bgcolor: 'grey.100' }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
```

- [x] **Step 3.4: 去重後無剩餘藥物則不顯示下方區塊**

原本結尾的三元判斷 `... ) : (  <Box>...暫無資料...</Box> )` 改為：CKM 區已顯示且 ATC5 無資料時不顯示「暫無資料」。把最後的 else 分支：

```jsx
      ) : (
        <Box>
          <TypographySizeWrapper ...>暫無資料</TypographySizeWrapper>
          ...
        </Box>
      )}
```

改為：

```jsx
      ) : hasCKMSection ? null : (
        <Box>
          <TypographySizeWrapper
            variant="caption"
            color="text.secondary"
            generalDisplaySettings={generalDisplaySettings}
          >
            暫無資料
          </TypographySizeWrapper>
        </Box>
      )}
```

- [x] **Step 3.5: 驗證編譯**

Run: `npm run build` → 成功；`npm run lint` → 無新 error

- [x] **Step 3.6: Commit**

```bash
git add src/components/tabs/Overview_ImportantMedications.jsx
git commit -m "feat: Overview 藥物區新增 CKM 關鍵用藥群組並與 ATC5 去重"
```

---

### Task 4: 中欄檢驗 — CKM 項目合併進關注檢驗

**Files:**
- Modify: `src/components/tabs/Overview_LabTests.jsx`

- [x] **Step 4.1: 新增 imports 與 props**

import 區加：

```jsx
import { IconButton, Tooltip } from "@mui/material"; // 併入既有的 @mui/material import
import PrintIcon from "@mui/icons-material/Print";
import { CKM_LAB_ITEMS, CKM_SPECIAL_LAB_CODES, classifyLabItem } from "../../utils/ckmUtils";
import { buildNephroReport, renderNephroReportHTML, attachNephroReportHandlers } from "../../utils/nephroReportBuilder";
```

元件簽名改為：

```jsx
const Overview_LabTests = ({
  groupedLabs = [],
  labData,
  overviewSettings = {},
  generalDisplaySettings,
  labSettings = { highlightAbnormalLab: true },
  enableCKM = false,
  userInfo = null,
}) => {
```

- [x] **Step 4.2: 追蹤天數擴展為 180 天**

```jsx
  // CKM 開啟時追蹤天數擴展為 180 天（取設定值與 180 的較大值）
  const baseTrackingDays = overviewSettings.labTrackingDays || 90;
  const trackingDays = enableCKM ? Math.max(baseTrackingDays, 180) : baseTrackingDays;
```

（取代原本 `const trackingDays = overviewSettings.labTrackingDays || 90;`）

- [x] **Step 4.3: 腎臟報告列印按鈕（標題右側）**

在元件內（`effectiveLabData` 定義之後）加 handler：

```jsx
  // 腎臟報告：開新分頁顯示可列印的腎臟檢驗報告（沿用 CKM Tab 行為）
  const handleOpenNephroReport = () => {
    const report = buildNephroReport(effectiveLabData, userInfo);
    if (!report) { alert('無腎臟相關檢驗資料'); return; }
    const html = renderNephroReportHTML(report);
    const win = window.open('', '_blank');
    if (!win) { alert('彈出視窗被封鎖，請允許後再試'); return; }
    win.document.write(html);
    win.document.close();
    attachNephroReportHandlers(win, report.dates.length);
  };
```

標題 JSX 由：

```jsx
      <TypographySizeWrapper variant="h6" gutterBottom generalDisplaySettings={generalDisplaySettings}>
        關注檢驗 - {trackingDays} 天內
      </TypographySizeWrapper>
```

改為：

```jsx
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <TypographySizeWrapper variant="h6" gutterBottom generalDisplaySettings={generalDisplaySettings}>
          關注檢驗 - {trackingDays} 天內
        </TypographySizeWrapper>
        {enableCKM && generalDisplaySettings?.enableNephroReport && (
          <Tooltip title="開新分頁顯示腎臟檢驗報告（可列印）">
            <IconButton size="small" sx={{ color: '#1565c0' }} onClick={handleOpenNephroReport}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
```

- [x] **Step 4.4: 收集 CKM 追加檢驗項目**

在渲染 IIFE 內、`matchingTests` 標準收集迴圈之後（`if (matchingTests.length > 0) {` 之前）加：

```jsx
          // === CKM 追加項目 ===
          // 使用者 focusedLabTests 未涵蓋（以 orderCode 判斷）的 CKM_LAB_ITEMS 追加到表格底部
          const ckmTests = [];
          let ckmDisplayNames = [];
          if (enableCKM) {
            const enabledCodes = new Set(labTestsConfig.map(t => t.orderCode));
            const extraItems = CKM_LAB_ITEMS.filter(item => !enabledCodes.has(item.orderCode));
            const extraNames = new Set(extraItems.map(i => i.displayName));
            const extraPlainCodes = new Set(extraItems.filter(i => !i.special && i.orderCode !== '08011C-Hb').map(i => i.orderCode));
            const wantHb = extraItems.some(i => i.orderCode === '08011C-Hb');

            recentLabs.forEach(labGroup => {
              if (!labGroup.labs || !Array.isArray(labGroup.labs)) return;
              labGroup.labs.forEach(lab => {
                const code = lab.orderCode;
                if (CKM_SPECIAL_LAB_CODES.includes(code)) {
                  // Cr/eGFR/eGFR(健保署)、UPCR、UACR、Hb、BNP/NT-proBNP 需細分
                  if (code === '08011C' && !wantHb) return;
                  const dn = classifyLabItem(lab);
                  if (!dn || !extraNames.has(dn)) return;
                  ckmTests.push({ ...lab, date: labGroup.date, displayName: dn });
                } else if (extraPlainCodes.has(code)) {
                  const item = extraItems.find(i => i.orderCode === code && !i.special);
                  if (item) ckmTests.push({ ...lab, date: labGroup.date, displayName: item.displayName });
                }
              });
            });

            // 依 CKM_LAB_ITEMS 順序排序追加列
            const ckmOrder = {};
            CKM_LAB_ITEMS.forEach((t, i) => { if (!(t.displayName in ckmOrder)) ckmOrder[t.displayName] = i; });
            ckmDisplayNames = [...new Set(ckmTests.map(t => t.displayName))]
              .sort((a, b) => (ckmOrder[a] ?? 999) - (ckmOrder[b] ?? 999));
          }
```

- [x] **Step 4.5: 合併日期欄與資料結構**

1. 條件 `if (matchingTests.length > 0) {` 改為 `if (matchingTests.length > 0 || ckmTests.length > 0) {`
2. `uniqueDates` 改為由合併後的 tests 計算：

```jsx
            const uniqueDates = [...new Set([...matchingTests, ...ckmTests].map(test => test.date))].sort((a, b) =>
              new Date(b) - new Date(a)
            );
```

3. `allDisplayNames.forEach(...)` 初始化迴圈之後，加 CKM 名稱初始化與填值：

```jsx
            // CKM 追加列初始化與填值（先到先贏，同名不覆蓋）
            ckmDisplayNames.forEach(displayName => {
              if (!testsByTypeAndDate[displayName]) {
                testsByTypeAndDate[displayName] = {};
                uniqueDates.forEach(date => { testsByTypeAndDate[displayName][date] = null; });
              }
            });
            ckmTests.forEach(test => {
              const slot = testsByTypeAndDate[test.displayName];
              if (slot && uniqueDates.includes(test.date) && slot[test.date] === null) {
                slot[test.date] = test;
              }
            });
```

4. `nonEmptyTestTypes` 目前會把 CKM 列也算進去，需把 CKM 列從主列表排除。`nonEmptyTestTypes` 定義後加：

```jsx
            // CKM 追加列獨立呈現在底部，不混入主列表
            const ckmRowNames = ckmDisplayNames.filter(n =>
              nonEmptyTestTypes.includes(n) && !allDisplayNames.includes(n)
            );
            const mainTestTypes = nonEmptyTestTypes.filter(n => !ckmRowNames.includes(n));
```

之後原本使用 `nonEmptyTestTypes` 排序的 `sortedTestTypes` 改為對 `mainTestTypes` 排序（`const sortedTestTypes = mainTestTypes.sort((a, b) => {...})`）。

5. trendItems 建構迴圈 `matchingTests.forEach(test => {...})` 改為 `[...matchingTests, ...ckmTests].forEach(test => {...})`（讓 CKM 列也有趨勢 popover）。

- [x] **Step 4.6: 渲染 CKM 追加列（細分隔線 + 小標題「CKM」）**

`<TableBody>` 中 `sortedTestTypes.map(...)` 之後加：

```jsx
                    {ckmRowNames.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={uniqueDates.length + 1} sx={{ py: 0.2, px: 1, borderTop: '2px solid #90caf9', bgcolor: '#f5f9ff' }}>
                          <TypographySizeWrapper variant="caption" generalDisplaySettings={generalDisplaySettings} sx={{ fontWeight: 700, color: '#1565c0' }}>
                            CKM
                          </TypographySizeWrapper>
                        </TableCell>
                      </TableRow>
                    )}
                    {ckmRowNames.map(displayName => (
                      <TableRow key={displayName}>
                        <TableCell
                          component="th"
                          scope="row"
                          sx={{ py: 0.1, px: 1, position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}
                        >
                          {(() => {
                            const ti = trendItems[displayName];
                            const numericCount = ti ? Object.values(ti.values).filter(v => v && !isNaN(parseFloat(v.value))).length : 0;
                            if (numericCount >= 2) {
                              return (
                                <LabItemTrendPopover item={ti} dates={trendDates}>
                                  <TypographySizeWrapper variant="body2" generalDisplaySettings={generalDisplaySettings} sx={{ textDecoration: 'underline dotted', textDecorationColor: '#bdbdbd', cursor: 'pointer' }}>
                                    {displayName}
                                  </TypographySizeWrapper>
                                </LabItemTrendPopover>
                              );
                            }
                            return <TypographySizeWrapper variant="body2" generalDisplaySettings={generalDisplaySettings}>{displayName}</TypographySizeWrapper>;
                          })()}
                        </TableCell>
                        {uniqueDates.map(date => {
                          const test = testsByTypeAndDate[displayName][date];
                          const cellStyles = {
                            backgroundColor: test ? getStatusBackgroundColor(test, labSettings.highlightAbnormal) : 'inherit',
                            color: test ? getStatusColor(test, labSettings.highlightAbnormal) : 'inherit',
                            py: 0.1, px: 1
                          };
                          return (
                            <TableCell key={date} align="right" sx={cellStyles}>
                              <TypographySizeWrapper variant="body2" generalDisplaySettings={generalDisplaySettings}>
                                {test ? (test.value || test.result || '') : <span style={{ color: '#aaaaaa' }}>—</span>}
                              </TypographySizeWrapper>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
```

- [x] **Step 4.7: 驗證編譯**

Run: `npm run build` → 成功；`npm run lint` → 無新 error

- [x] **Step 4.8: Commit**

```bash
git add src/components/tabs/Overview_LabTests.jsx
git commit -m "feat: Overview 檢驗區合併 CKM 項目、180 天追蹤與腎臟報告列印"
```

---

### Task 5: Overview.jsx — SummaryBar + 右欄重組 + props 串接

**Files:**
- Modify: `src/components/tabs/Overview.jsx`

- [x] **Step 5.1: imports 與 props**

import 區加：

```jsx
import CKMSummaryBar from "./ckm/CKMSummaryBar";
import CKMExtraLabCard from "./ckm/CKMExtraLabCard";
import CKMImagingCard from "./ckm/CKMImagingCard";
```

props 加三個（放在 `cloudSettings` 之後）：

```jsx
  cloudSettings = { fetchAdultHealthCheck: true, fetchCancerScreening: true, fetchHbcvdata: true },
  ckmData = null,
  enableCKMTab = false,
  userInfo = null
}) => {
```

- [x] **Step 5.2: SummaryBar（頂部）**

`return (` 的 `<Box sx={{ p: 0 }}>` 內、`<Grid container spacing={1}>` 之前加：

```jsx
      {/* CKM 摘要列：僅在 CKM 功能開啟且有 CKM 資料時顯示 */}
      {enableCKMTab && ckmData?.hasCKMData && (
        <CKMSummaryBar summary={ckmData.summary} medications={ckmData.medications} gds={generalDisplaySettings} />
      )}
```

- [x] **Step 5.3: 左欄與中欄傳入 CKM props**

`Overview_ImportantMedications` 加 `enableCKMBadge={enableCKMTab}`；
`Overview_LabTests` 加 `enableCKM={enableCKMTab}` 與 `userInfo={userInfo}`。

- [x] **Step 5.4: 右欄條件重組**

右欄 `<Grid container spacing={2} direction="column">` 的內容改為：

```jsx
          <Grid container spacing={2} direction="column">
            {enableCKMTab ? (
              <>
                {/* CKM 開啟：其他檢驗 + CKM 影像 + 手術 + 病患摘要 */}
                <Grid item>
                  <CKMExtraLabCard groupedLabs={groupedLabs} gds={generalDisplaySettings} />
                </Grid>
                {ckmData && (
                  <Grid item>
                    <CKMImagingCard
                      imaging={ckmData.imaging}
                      ekgAlerts={ckmData.ekgAlerts}
                      lvef={ckmData.summary?.lvef}
                      gds={generalDisplaySettings}
                    />
                  </Grid>
                )}
                {hasSurgeryData && (
                  <Grid item>
                    <Overview_SurgeryRecords
                      surgeryData={surgeryData}
                      generalDisplaySettings={generalDisplaySettings}
                    />
                  </Grid>
                )}
                <Grid item>
                  <Overview_PatientSummary
                    patientSummaryData={patientSummaryData}
                    generalDisplaySettings={generalDisplaySettings}
                  />
                </Grid>
              </>
            ) : (
              <>
                {/* 1. 影像檢查 */}
                <Grid item>
                  <Overview_ImagingTests
                    imagingData={imagingData}
                    overviewSettings={overviewSettings}
                    generalDisplaySettings={generalDisplaySettings}
                  />
                </Grid>

                {/* 2. 手術紀錄 - only display if has data */}
                {hasSurgeryData && (
                  <Grid item>
                    <Overview_SurgeryRecords
                      surgeryData={surgeryData}
                      generalDisplaySettings={generalDisplaySettings}
                    />
                  </Grid>
                )}

                {/* 3. 出院紀錄 - only display if has data */}
                {hasDischargeData && (
                  <Grid item>
                    <Overview_DischargeRecords
                      dischargeData={dischargeData}
                      generalDisplaySettings={generalDisplaySettings}
                    />
                  </Grid>
                )}

                {/* 4. 過敏紀錄 - only display if has data */}
                {hasAllergyData && (
                  <Grid item>
                    <Overview_AllergyRecords
                      allergyData={allergyData}
                      generalDisplaySettings={generalDisplaySettings}
                    />
                  </Grid>
                )}

                {/* 5. 病患摘要 */}
                <Grid item>
                  <Overview_PatientSummary
                    patientSummaryData={patientSummaryData}
                    generalDisplaySettings={generalDisplaySettings}
                  />
                </Grid>
              </>
            )}
          </Grid>
```

（注意：`hasAllergyData`、`hasDischargeData` 在 CKM 分支不再使用，但保留計算，lint 不會抱怨。）

- [x] **Step 5.5: 驗證編譯**

Run: `npm run build` → 成功；`npm run lint` → 無新 error

- [x] **Step 5.6: Commit**

```bash
git add src/components/tabs/Overview.jsx
git commit -m "feat: Overview 整合 CKM SummaryBar 與右欄 CKM 卡片"
```

---

### Task 6: FloatingIcon.jsx — 移除 CKM Tab、傳遞新 props

**Files:**
- Modify: `src/components/FloatingIcon.jsx`

- [x] **Step 6.1: 移除 CKM Tab 相關**

1. 刪除 `import CKMData from "./tabs/CKMData";`（保留 `ckmProcessor` import 與 `ckmData` state — Overview 仍需要）。
2. Tab index 計算（原 468-471 行）改為固定值：

```jsx
  // Tab index（CKM 已整合進 Overview，不再有獨立 Tab）
  const helpTabIndex = 7;
  const advancedTabIndex = 8;
```

（刪除 `ckmTabEnabled`、`ckmTabIndex`。）

3. 刪除 Tabs 內整段 `{generalDisplaySettings.enableCKMTab && (<Tab label="CKM" ... />)}`。
4. 刪除整段 CKM TabPanel：

```jsx
          {/* CKM Tab */}
          {ckmTabEnabled && (
            <TabPanel value={tabValue} index={ckmTabIndex}>
              <CKMData ... />
            </TabPanel>
          )}
```

5. 若 `FavoriteIcon` import 因此不再使用，一併刪除（以 lint 確認）。

- [x] **Step 6.2: Overview 傳入新 props**

`<Overview ... />` 呼叫處（`hbcvData={hbcvData}` 之後）加：

```jsx
              ckmData={ckmData}
              enableCKMTab={generalDisplaySettings.enableCKMTab}
              userInfo={userInfo}
```

- [x] **Step 6.3: 驗證編譯**

Run: `npm run build` → 成功；`npm run lint` → 確認無 unused import（`CKMData`、`FavoriteIcon`）殘留

- [x] **Step 6.4: Commit**

```bash
git add src/components/FloatingIcon.jsx
git commit -m "feat: 移除獨立 CKM Tab，CKM 資料改由 Overview 呈現"
```

---

### Task 7: 設定 UI 文字調整

**Files:**
- Modify: `src/components/settings/AdvancedSettings.jsx`

- [x] **Step 7.1: 更新開關文字**

1. `label="開啟 CKM 綜合頁面"` → `label="啟用 CKM 加強 Overview"`
2. `<FormHelperText>整合心血管-腎臟-代謝相關資料於獨立頁面顯示（需重新載入網頁）</FormHelperText>` → `<FormHelperText>將心血管-腎臟-代謝（CKM）相關資料整合顯示於總覽頁面（需重新載入網頁）</FormHelperText>`
3. `<FormHelperText>在 CKM 檢驗標題列顯示「腎臟報告」按鈕，可開新分頁列印</FormHelperText>` → `<FormHelperText>在總覽「關注檢驗」標題列顯示列印按鈕，可開新分頁列印腎臟檢驗報告</FormHelperText>`

- [x] **Step 7.2: 驗證編譯 + Commit**

Run: `npm run build` → 成功

```bash
git add src/components/settings/AdvancedSettings.jsx
git commit -m "docs: 更新 CKM 設定文字為「啟用 CKM 加強 Overview」"
```

---

### Task 8: 最終驗證

- [x] **Step 8.1: 完整建置與 lint**

Run: `npm run build` → 成功
Run: `npm run lint` → 無新 error

- [x] **Step 8.2: 瀏覽器單元測試**

Run: `npm run test`（背景執行，啟動 localhost:5173）
以瀏覽器開啟 `http://localhost:5173/test.html`，確認 `utils/ckmUtils` 區塊全綠、既有測試無退步。

- [x] **Step 8.3: 手動驗證清單（載入 dist/ 為 unpacked extension 或用 localhost 測試頁 + 本地 JSON）**

1. `enableCKMTab = false`：Overview 與改動前完全一致（無 SummaryBar、右欄五區塊照舊、藥物/檢驗照舊）。
2. `enableCKMTab = true` 且病人有 CKM 資料：
   - Overview 頂部出現 SummaryBar（用藥 badge + 檢驗 Chip）
   - 左欄藥物：CKM 六大群組在上（藍色 badge，關鍵藥物有白字藍底 Chip），ATC5 色彩群組在下且無重複藥物
   - 中欄檢驗：標題顯示 180 天內；表格底部有「CKM」分隔標題與追加列；`enableNephroReport` 開啟時標題右側有列印按鈕
   - 右欄：其他檢驗卡 → CKM 影像卡（報告 tooltip/dialog 可用）→ 手術 → 病患摘要；無住院/過敏/通用影像
   - Tab 列不再出現 CKM Tab；「說明」「進階」Tab 功能正常
3. 設定頁「進階功能設定」文字為「啟用 CKM 加強 Overview」。

- [x] **Step 8.4: 完成後**

使用 superpowers:finishing-a-development-branch 決定合併方式。

---

## Self-Review 紀錄

- **Spec coverage:** 區塊一 → Task 2/5；區塊二 → Task 1/3；區塊三 → Task 1/4；區塊四 → Task 2/5；props 表 → Task 5/6；共用抽出表 → Task 1/2；CKM Tab 處置 → Task 6/7。全數對應。
- **`getRecentKeyDrugs` 餵入的是 `ckmData.medications`**（camelCase `atcCode`），`getCKMMedicationGroups` 餵入的是 `groupedMedications`（snake_case `atc_code`）— 兩者欄位命名不同是刻意的，來源資料形狀不同。
- **覆蓋判斷用 orderCode 而非 displayName**：使用者自訂 focusedLabTests 的 displayName 可能與 CKM 定義不同字串，orderCode 比對才穩。
- **`ckmRowNames` 過濾 `!allDisplayNames.includes(n)`**：防止 classifyLabItem 產出的名稱（如 eGFR）與主表 hardcoded 名稱重複成兩列。
