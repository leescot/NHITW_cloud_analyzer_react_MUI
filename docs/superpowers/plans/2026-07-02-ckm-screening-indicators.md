# CKM SummaryBar 篩檢指標 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依 `docs/superpowers/specs/2026-07-02-ckm-screening-indicators-design.md`，在 CKM SummaryBar 新增第三區塊「篩檢」，計算並以三色 chip 顯示 FIB-4、TyG、KFRE、HOMA-IR。

**Architecture:** 純計算邏輯放在新檔 `src/utils/screeningIndicators.js`（可被瀏覽器 Mocha 測試）。成分檢驗值從 `groupedLabs` 撈、eGFR/UACR 沿用 `ckmData.summary`、age/sex 來自 `userInfo`；計算在 `CKMSummaryBar.jsx` 以 `useMemo` 進行，避免動到 ckmProcessor。新增單一設定 `enableCKMScreening`（放在 generalDisplaySettings）控制顯示。

**Tech Stack:** React 18 + MUI v6、esbuild（content script 打包）、瀏覽器內 Mocha/Chai。

**測試限制（重要）：** 無 headless runner。純邏輯測試寫在 `tests/test_screeningIndicators.js`，於 Task 5 用 Node 快速煙霧測試 + 瀏覽器 `npm run test` 驗證。**`src/utils/screeningIndicators.js` 不可 import 任何 npm 套件**（瀏覽器 ESM 無法解析 bare specifier），本檔為純函數、無任何 import。

**Commit 訊息使用繁體中文。**

---

## 資料形狀備忘

- `groupedLabs`（labProcessor 輸出）：`[{ date:'YYYY/MM/DD', hosp, labs: [{ orderCode, orderName, itemName, abbrName, assayMethod, value, result, unit, valueStatus, isAbnormal }] }]`
- `ckmData.summary.latestEGFR` / `latestUACR`：`{ value:number, unit:string, date:string }` 或 `null`
- `userInfo`：`{ name, userId, gender:'M'|'F'|'男'|'女', birthday, age:number }` 或 `null`
- 成分代碼：AST=`09025C`、ALT=`09026C`、TG=`09004C`、Glucose=`09005C`、Insulin=`09086B`、Platelet=`08011C`（項目名 `/platelet|血小板/i`，單位 x10³/µL 數值直接用）

參考計算值（Task 1 測試對照）：
- FIB-4(age50, AST40, ALT30, PLT200) = 50×40/(200×√30) ≈ **1.826**
- TyG(TG150, Glu100) = ln(150×100/2) ≈ **8.923**
- HOMA-IR(Ins15, Glu100) = 15×100/405 ≈ **3.704**
- KFRE(age50, male1, eGFR45, UACR100) non-NA → **5y ≈ 0.0329（3.29%）、2y ≈ 0.0086（0.86%）**

---

### Task 1: 純計算函數 `screeningIndicators.js`（TDD）

**Files:**
- Create: `src/utils/screeningIndicators.js`
- Create: `tests/test_screeningIndicators.js`
- Modify: `tests/test.js`（註冊測試檔）

- [ ] **Step 1.1: 寫測試檔 `tests/test_screeningIndicators.js`**

```js
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
```

- [ ] **Step 1.2: 在 `tests/test.js` 註冊**

在 `await import('./test_ckmUtils.js');` 之後加一行：

```js
await import('./test_screeningIndicators.js');
```

- [ ] **Step 1.3: 建立 `src/utils/screeningIndicators.js`**

```js
// CKM 篩檢指標計算（FIB-4 / TyG / KFRE / HOMA-IR）
// 注意：本檔會被瀏覽器內 Mocha 測試直接 import，不可 import 任何 npm 套件

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// 單位防呆：換算為公式所需單位
function normGlucose(value, unit) {
  const n = toNum(value); if (n == null) return null;
  return unit && /mmol/i.test(unit) ? n * 18 : n;        // mmol/L → mg/dL
}
function normTG(value, unit) {
  const n = toNum(value); if (n == null) return null;
  return unit && /mmol/i.test(unit) ? n * 88.57 : n;     // mmol/L → mg/dL
}
function normInsulin(value, unit) {
  const n = toNum(value); if (n == null) return null;
  return unit && /pmol/i.test(unit) ? n / 6.945 : n;     // pmol/L → µU/mL
}
function normUacr(value, unit) {
  const n = toNum(value); if (n == null) return null;
  return unit && /mg\/mmol/i.test(unit) ? n * 8.84 : n;  // mg/mmol → mg/g
}

// ---- 純公式 ----

export function computeFib4(age, ast, alt, platelet) {
  if (![age, ast, alt, platelet].every(x => Number.isFinite(x) && x > 0)) return null;
  return (age * ast) / (platelet * Math.sqrt(alt));
}
export function fib4Band(value, age) {
  const lowCut = age >= 65 ? 2.0 : 1.3;
  if (value < lowCut) return 'low';
  if (value <= 2.67) return 'mid';
  return 'high';
}

export function computeTyg(tg, glucose) {
  if (![tg, glucose].every(x => Number.isFinite(x) && x > 0)) return null;
  return Math.log(tg * glucose / 2);
}
export function tygBand(value) {
  if (value < 8.5) return 'low';
  if (value < 9.0) return 'mid';
  return 'high';
}

export function computeHomaIr(insulin, glucose) {
  if (![insulin, glucose].every(x => Number.isFinite(x) && x > 0)) return null;
  return insulin * glucose / 405;
}
export function homaIrBand(value) {
  if (value < 2.0) return 'low';
  if (value < 2.5) return 'mid';
  return 'high';
}

export function computeKfre(age, male, eGFR, uacr) {
  if (![age, eGFR, uacr].every(x => Number.isFinite(x) && x > 0)) return null;
  if (male !== 0 && male !== 1) return null;
  const LP = -0.2201 * (age / 10 - 7.036)
    + 0.2467 * (male - 0.5642)
    - 0.5567 * (eGFR / 5 - 7.222)
    + 0.4510 * (Math.log(uacr) - 5.137);
  const e = Math.exp(LP);
  return { risk2y: 1 - Math.pow(0.9832, e), risk5y: 1 - Math.pow(0.9365, e) };
}
export function kfreBand(risk5y) {
  if (risk5y < 0.05) return 'low';
  if (risk5y < 0.15) return 'mid';
  return 'high';
}

// ---- 判讀文字 ----

function fib4Note(v, age) {
  const b = fib4Band(v, age);
  if (b === 'high') return 'FIB-4 >2.67：進階纖維化風險較高';
  if (b === 'mid') return 'FIB-4 灰區，建議進一步評估';
  return 'FIB-4 低風險';
}
function tygNote(v) {
  const b = tygBand(v);
  if (b === 'high') return 'TyG ≥9.0：心代謝風險偏高（非診斷）';
  if (b === 'mid') return 'TyG 8.5–8.9：可能胰島素阻抗（非診斷）';
  return 'TyG 較低';
}
function homaIrNote(v) {
  if (v >= 3.0) return 'HOMA-IR ≥3.0：明顯胰島素阻抗';
  if (v >= 2.5) return 'HOMA-IR ≥2.5：可能胰島素阻抗';
  if (v >= 2.0) return 'HOMA-IR 2.0–2.5：邊緣';
  return 'HOMA-IR 較低';
}
function kfreNote(risk5y) {
  const b = kfreBand(risk5y);
  if (b === 'high') return '≥15% 高風險';
  if (b === 'mid') return '5–15%，建議腎臟科追蹤/轉介';
  return '<5% 較低';
}

// ---- 資料抽取 ----

const COMP = {
  ast: { code: '09025C' },
  alt: { code: '09026C' },
  tg:  { code: '09004C', norm: normTG },
  glu: { code: '09005C', norm: normGlucose },
  ins: { code: '09086B', norm: normInsulin },
  plt: { code: '08011C', match: (l) => /platelet|血小板/i.test((l.itemName || '') + ' ' + (l.abbrName || '')) },
};

// groupedLabs → 依日期彙整成分值，回傳新到舊排序的陣列
function extractByDate(groupedLabs) {
  const byDate = new Map();
  for (const g of (groupedLabs || [])) {
    const date = g.date || '';
    const ms = new Date(String(date).replace(/-/g, '/')).getTime();
    if (!Number.isFinite(ms)) continue;
    if (!byDate.has(date)) byDate.set(date, { date, ms });
    const slot = byDate.get(date);
    for (const lab of (g.labs || [])) {
      for (const [key, def] of Object.entries(COMP)) {
        if (lab.orderCode !== def.code) continue;
        if (def.match && !def.match(lab)) continue;
        if (slot[key] != null) continue; // 同日第一筆有效值優先
        const raw = lab.value != null ? lab.value : lab.result;
        const v = def.norm ? def.norm(raw, lab.unit) : toNum(raw);
        if (v != null && v > 0) slot[key] = v;
      }
    }
  }
  return [...byDate.values()].sort((a, b) => b.ms - a.ms);
}

// ---- 主入口 ----

export function computeScreeningIndicators({ groupedLabs, summary, userInfo }) {
  const dates = extractByDate(groupedLabs);
  const age = userInfo && Number.isFinite(userInfo.age) ? userInfo.age : null;
  const sexRaw = (userInfo && userInfo.gender) || '';
  const male = (sexRaw === 'M' || sexRaw === '男') ? 1 : ((sexRaw === 'F' || sexRaw === '女') ? 0 : null);

  const result = { fib4: null, tyg: null, kfre: null, homaIr: null };

  // FIB-4：最近一個同時具備 AST+ALT+PLT 的日期
  if (age != null) {
    const d = dates.find(x => x.ast != null && x.alt != null && x.plt != null);
    if (d) {
      const v = computeFib4(age, d.ast, d.alt, d.plt);
      if (v != null) result.fib4 = {
        value: v, label: `FIB-4 ${v.toFixed(2)}`, band: fib4Band(v, age), note: fib4Note(v, age),
        inputs: [
          { name: 'AST', value: d.ast, date: d.date },
          { name: 'ALT', value: d.alt, date: d.date },
          { name: 'PLT', value: d.plt, date: d.date },
          { name: 'Age', value: age, date: '' },
        ],
      };
    }
  }

  // TyG：最近一個同時具備 TG+Glucose 的日期
  {
    const d = dates.find(x => x.tg != null && x.glu != null);
    if (d) {
      const v = computeTyg(d.tg, d.glu);
      if (v != null) result.tyg = {
        value: v, label: `TyG ${v.toFixed(1)}`, band: tygBand(v), note: tygNote(v),
        inputs: [{ name: 'TG', value: d.tg, date: d.date }, { name: 'Glucose', value: d.glu, date: d.date }],
      };
    }
  }

  // HOMA-IR：最近一筆 insulin，配對 ±7 天內最近 glucose
  {
    const insList = dates.filter(x => x.ins != null);
    const gluList = dates.filter(x => x.glu != null);
    if (insList.length && gluList.length) {
      const ins = insList[0];
      let best = null;
      for (const g of gluList) {
        const diff = Math.abs(g.ms - ins.ms) / 86400000;
        if (diff <= 7 && (best == null || diff < best.diff)) best = { g, diff };
      }
      if (best) {
        const v = computeHomaIr(ins.ins, best.g.glu);
        if (v != null) result.homaIr = {
          value: v, label: `HOMA-IR ${v.toFixed(1)}`, band: homaIrBand(v), note: homaIrNote(v),
          inputs: [{ name: 'Insulin', value: ins.ins, date: ins.date }, { name: 'Glucose', value: best.g.glu, date: best.g.date }],
        };
      }
    }
  }

  // KFRE：eGFR<60 且有 UACR
  if (age != null && male != null && summary && summary.latestEGFR && summary.latestUACR) {
    const eGFR = toNum(summary.latestEGFR.value);
    const uacr = normUacr(summary.latestUACR.value, summary.latestUACR.unit);
    if (eGFR != null && eGFR < 60 && uacr != null && uacr > 0) {
      const k = computeKfre(age, male, eGFR, uacr);
      if (k != null) {
        const pct5 = Math.round(k.risk5y * 100);
        result.kfre = {
          value: k.risk5y, label: `KFRE 5y ${pct5}%`, band: kfreBand(k.risk5y),
          note: `2年 ${(k.risk2y * 100).toFixed(1)}% / 5年 ${(k.risk5y * 100).toFixed(1)}%；${kfreNote(k.risk5y)}`,
          inputs: [
            { name: 'eGFR', value: eGFR, date: summary.latestEGFR.date },
            { name: 'UACR', value: uacr, date: summary.latestUACR.date },
          ],
        };
      }
    }
  }

  return result;
}
```

- [ ] **Step 1.4: Node 煙霧測試（驗證公式）**

建立暫存檔 `scratchpad/screen_check.mjs`（用絕對路徑 import），內容驗證上方參考值，執行：

```bash
node -e "import('file:///D:/github/NHITW_cloud_analyzer_react_MUI/src/utils/screeningIndicators.js').then(m=>{
  const near=(a,b,e=0.005)=>Math.abs(a-b)<=e;
  console.log('FIB4', m.computeFib4(50,40,30,200).toFixed(3));
  console.log('TyG', m.computeTyg(150,100).toFixed(3));
  console.log('HOMA', m.computeHomaIr(15,100).toFixed(3));
  const k=m.computeKfre(50,1,45,100);
  console.log('KFRE5y', (k.risk5y*100).toFixed(2), '2y', (k.risk2y*100).toFixed(2));
})"
```

Expected: `FIB4 1.826`、`TyG 8.923`、`HOMA 3.704`、`KFRE5y 3.29 2y 0.86`

- [ ] **Step 1.5: 編譯 + lint**

Run: `npm run build` → 成功
Run: `npx eslint src/utils/screeningIndicators.js tests/test_screeningIndicators.js` → 僅可能有 `'React' unused` 之類既有樣式警告，無 undefined

- [ ] **Step 1.6: Commit**

```bash
git add src/utils/screeningIndicators.js tests/test_screeningIndicators.js tests/test.js
git commit -m "feat: 新增 CKM 篩檢指標計算（FIB-4/TyG/KFRE/HOMA-IR）與單元測試"
```

---

### Task 2: CKMSummaryBar 渲染第三區塊

**Files:**
- Modify: `src/components/tabs/ckm/CKMSummaryBar.jsx`

- [ ] **Step 2.1: 改寫 `CKMSummaryBar.jsx`**

整檔改為（新增 `useMemo`、`groupedLabs`/`userInfo` props、第三區塊）：

```jsx
// CKM 頂部摘要列：90天內關鍵用藥 badge / 近期檢驗 Chip / 篩檢指標
import React, { useMemo } from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { getRecentKeyDrugs } from '../../../utils/ckmUtils';
import { computeScreeningIndicators } from '../../../utils/screeningIndicators';

const BAND_COLOR = { low: 'success', mid: 'warning', high: 'error' };
const Sep = () => <Typography sx={{ mx: 0.5, color: '#bbb', fontSize: '0.9rem' }}>|</Typography>;

// eslint-disable-next-line no-unused-vars
const CKMSummaryBar = ({ summary, medications, groupedLabs, userInfo, gds }) => {
  // hooks 必須在任何 early return 之前
  const screening = useMemo(() => {
    if (!gds?.enableCKMScreening) return [];
    const r = computeScreeningIndicators({ groupedLabs, summary, userInfo });
    return ['fib4', 'tyg', 'kfre', 'homaIr'].map(k => r[k]).filter(Boolean);
  }, [gds, groupedLabs, summary, userInfo]);

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

  if (drugBadges.length === 0 && labChips.length === 0 && screening.length === 0) return null;

  const buildScreenTitle = (s) => (
    <span style={{ whiteSpace: 'pre-line' }}>
      {s.inputs.map(i => `${i.name} ${i.value}${i.date ? ` (${i.date})` : ''}`).join('\n')}
      {'\n'}{s.note}
    </span>
  );

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
      {drugBadges.length > 0 && labChips.length > 0 && <Sep />}
      {labChips.length > 0 && (
        <>
          <Typography variant="caption" sx={{ fontWeight:600, color:'text.secondary', mr:0.25 }}>近期檢驗 -</Typography>
          {labChips}
        </>
      )}
      {(drugBadges.length > 0 || labChips.length > 0) && screening.length > 0 && <Sep />}
      {screening.length > 0 && (
        <>
          <Typography variant="caption" sx={{ fontWeight:600, color:'text.secondary', mr:0.25 }}>篩檢 -</Typography>
          {screening.map(s => (
            <Tooltip key={s.label} title={buildScreenTitle(s)} arrow>
              <Chip label={s.label} size="small" color={BAND_COLOR[s.band]} variant="outlined" sx={{ mr:0.25, height:22 }} />
            </Tooltip>
          ))}
        </>
      )}
    </Box>
  );
};

export default CKMSummaryBar;
```

- [ ] **Step 2.2: 編譯 + lint**

Run: `npm run build` → 成功
Run: `npx eslint src/components/tabs/ckm/CKMSummaryBar.jsx` 2>&1 | grep -E "no-undef|react-hooks" → 無輸出（無 undefined、無 hooks 規則違反）

- [ ] **Step 2.3: Commit**

```bash
git add src/components/tabs/ckm/CKMSummaryBar.jsx
git commit -m "feat: CKMSummaryBar 新增篩檢指標第三區塊"
```

---

### Task 3: Overview 與 CKMData 傳入 groupedLabs / userInfo

**Files:**
- Modify: `src/components/tabs/Overview.jsx`
- Modify: `src/components/tabs/CKMData.jsx`

- [ ] **Step 3.1: `Overview.jsx` — SummaryBar 補傳 props**

將：

```jsx
      {enableCKMTab && ckmData?.hasCKMData && (
        <CKMSummaryBar summary={ckmData.summary} medications={ckmData.medications} gds={generalDisplaySettings} />
      )}
```

改為：

```jsx
      {enableCKMTab && ckmData?.hasCKMData && (
        <CKMSummaryBar
          summary={ckmData.summary}
          medications={ckmData.medications}
          groupedLabs={groupedLabs}
          userInfo={userInfo}
          gds={generalDisplaySettings}
        />
      )}
```

- [ ] **Step 3.2: `CKMData.jsx` — SummaryBar 補傳 props**

將：

```jsx
      <CKMSummaryBar summary={ckmData.summary} medications={ckmData.medications} gds={gds} />
```

改為：

```jsx
      <CKMSummaryBar summary={ckmData.summary} medications={ckmData.medications} groupedLabs={groupedLabs} userInfo={userInfo} gds={gds} />
```

（`groupedLabs`、`userInfo` 已是 `CKMData` 現有 props，無需再改簽名。）

- [ ] **Step 3.3: 編譯 + Commit**

Run: `npm run build` → 成功

```bash
git add src/components/tabs/Overview.jsx src/components/tabs/CKMData.jsx
git commit -m "feat: Overview/CKMData 傳入 groupedLabs 與 userInfo 供篩檢指標計算"
```

---

### Task 4: 設定 `enableCKMScreening` 串接

**Files:**
- Modify: `src/config/defaultSettings.js`
- Modify: `src/utils/settingsManager.js`
- Modify: `src/components/settings/AdvancedSettings.jsx`

- [ ] **Step 4.1: `defaultSettings.js` — 新增預設值**

在 `general` 區塊 `enableNephroReport: false,` 之後加：

```js
    enableCKMScreening: false,
```

- [ ] **Step 4.2: `settingsManager.js` — 三處串接**

(a) `chrome.storage.sync.get` 的預設物件，`enableNephroReport: DEFAULT_SETTINGS.general.enableNephroReport,` 之後加：

```js
      enableCKMScreening: DEFAULT_SETTINGS.general.enableCKMScreening,
```

(b) `allSettings.general` 映射，`enableNephroReport: items.enableNephroReport,` 之後加：

```js
          enableCKMScreening: items.enableCKMScreening,
```

(c) `handleGeneralDisplaySettingsChange` 的 `newGeneralDisplaySettings`，`enableNephroReport: event.detail.allSettings.enableNephroReport,` 之後加：

```js
      enableCKMScreening: event.detail.allSettings.enableCKMScreening,
```

- [ ] **Step 4.3: `AdvancedSettings.jsx` — state 與 UI 開關**

(a) `useState` 初值物件，`enableNephroReport: false,` 之後加 `enableCKMScreening: false,`
(b) `chrome.storage.sync.get` 預設物件，`enableNephroReport: false,` 之後加 `enableCKMScreening: false,`
(c) `setSettings({...})` 映射，`enableNephroReport: items.enableNephroReport,` 之後加 `enableCKMScreening: items.enableCKMScreening,`
(d) 確保 `AdvancedSettings.jsx` 頂部已 import `Chip`（若既有 import 未含則加入 `Chip`）：檢查 `from "@mui/material"` 的匯入清單，缺少時補上 `Chip`。

(e) UI：在 `{settings.enableCKMTab && (<Box sx={{ ml: 4, mt: 0.5 }}>` 內、腎臟報告 FormControlLabel/FormHelperText 之後，新增（label 後方帶實驗性質「β」badge）：

```jsx
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableCKMScreening}
                  onChange={(e) => {
                    handleLocalSettingChange("enableCKMScreening", e.target.checked);
                  }}
                  size="small"
                />
              }
              label={
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  顯示篩檢指標（FIB-4/TyG/KFRE/HOMA-IR）
                  <Chip
                    label="β"
                    size="small"
                    sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#f57c00', color: '#fff', '& .MuiChip-label': { px: 0.5 } }}
                  />
                </Box>
              }
            />
            <FormHelperText>實驗性功能：在總覽 CKM 摘要列顯示肝腎心代謝篩檢指標（需重新載入網頁）</FormHelperText>
```

（`Box` 通常已在該檔 import；若無則一併補入。`β` badge 用橘色 `#f57c00` 標示實驗性質。）

- [ ] **Step 4.4: 編譯 + Commit**

Run: `npm run build` → 成功

```bash
git add src/config/defaultSettings.js src/utils/settingsManager.js src/components/settings/AdvancedSettings.jsx
git commit -m "feat: 新增 enableCKMScreening 設定開關控制篩檢指標顯示"
```

---

### Task 5: Mock 資料補 AST + 最終驗證

**Files:**
- Modify: `.test_data/ckm_mock_patient.json`

- [ ] **Step 5.1: 在 mock 補一筆 2026/05/11 的 AST（09025C）**

用 Node 以現有 05/11 的 ALT 記錄為模板，複製後改成 AST，插到其後：

```bash
node -e "
const fs=require('fs');
const p='D:/github/NHITW_cloud_analyzer_react_MUI/.test_data/ckm_mock_patient.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
const rObj=j.lab.rObject;
const i=rObj.findIndex(r=>r.order_code==='09026C'&&(r.real_inspect_date||'')==='2026/05/11');
if(i<0){console.error('ALT template not found');process.exit(1);}
const ast={...rObj[i],
  order_code:'09025C',
  order_name:'血清麩胺酸苯醋酸轉氨基脢 ;(S-GOT/AST)',
  assay_item_name:'AST(GOT)',
  assay_value:'28',
  consult_value:'[10~40][]'};
if(rObj.some(r=>r.order_code==='09025C'&&(r.real_inspect_date||'')==='2026/05/11')){console.log('AST already present');process.exit(0);}
rObj.splice(i+1,0,ast);
fs.writeFileSync(p,JSON.stringify(j,null,2));
console.log('inserted AST 09025C 2026/05/11 =28');
"
```

Expected: `inserted AST 09025C 2026/05/11 =28`

- [ ] **Step 5.2: 完整建置**

Run: `npm run build`
Expected: 成功

- [ ] **Step 5.3: 瀏覽器單元測試**

Run: `npm run test`（背景執行），開 `http://localhost:5173/test.html`，確認 `utils/screeningIndicators` 區塊全綠、既有測試無退步。

- [ ] **Step 5.4: 手動驗證清單**

載入 `dist/`（或 localhost 測試頁 + 匯入 `.test_data/ckm_mock_patient.json`）：

1. `enableCKMTab=true` 但 `enableCKMScreening=false`：SummaryBar 只有前兩區塊，無「篩檢」。
2. `enableCKMScreening=true`：SummaryBar 出現第三區塊「篩檢 -」，mock 病人應顯示：
   - `FIB-4`（AST28/ALT17/PLT177 同為 05/11 + age）
   - `TyG`（TG87/Glucose191 05/11）→ 偏高（紅）
   - `HOMA-IR`（Insulin18.5 05/10 配 Glucose191 05/11，差 1 天）→ 偏高（紅）
   - `KFRE 5y x%`（若 mock eGFR<60 且有 UACR；eGFR 44.x 於 02/09）
   - hover 每個 chip 顯示所用數值+日期+判讀
3. `enableCKMTab=false`：整個 SummaryBar 不出現（維持既有行為）。
4. 設定頁「進階功能設定」在 CKM 開啟時出現「顯示篩檢指標」子開關。

- [ ] **Step 5.5: Commit**

```bash
git add .test_data/ckm_mock_patient.json
git commit -m "test: mock 病人補 2026/05/11 AST 使 FIB-4 可示範"
```

- [ ] **Step 5.6: 完成後**

使用 superpowers:finishing-a-development-branch 決定後續（本分支 feature-CKM 之前選擇保留）。

---

## Self-Review 紀錄

- **Spec coverage:** 資料來源/代碼→Task 1（COMP）；時間窗（同日/±7天/KFRE 放寬）→Task 1 orchestration + Task 1 測試；四公式+切點→Task 1；單位防呆→Task 1（norm* + 測試）；顯示三區塊+著色+tooltip+算不出不顯示→Task 2；props 串接→Task 3；設定開關→Task 4；mock AST→Task 5。全數對應。
- **Type consistency:** `computeScreeningIndicators` 回傳 `{fib4,tyg,kfre,homaIr}`，各為 `{value,label,band,note,inputs}`；band ∈ `low/mid/high`；`BAND_COLOR` 對應 success/warning/error。Task 2 使用的欄位（label/band/inputs/note）與 Task 1 定義一致。
- **KFRE UACR 單位**：主入口對 `summary.latestUACR.value` 套 `normUacr`（ckmProcessor 存的是 mg/g，正常不轉換；防 mg/mmol）。
- **Hooks 規則**：`useMemo` 置於 `if (!summary) return null;` 之前，避免條件式呼叫 hook。
- **Placeholder 掃描**：無 TBD/TODO，所有步驟含完整程式碼與預期輸出。
