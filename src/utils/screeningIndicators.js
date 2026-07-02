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
  tg: { code: '09004C', norm: normTG },
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
