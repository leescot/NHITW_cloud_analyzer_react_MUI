const NEPHRO_CATEGORIES = {
  '●腎功能': ['BUN', 'Cr', 'eGFR', 'eGFR(健保署)', 'Cystatin C', 'eGFR(Cr-CysC)', 'UPCR', 'UACR'],
  '●電解質': ['Na', 'K', 'Ca', 'P', 'U.A'],
  '●血糖': ['Glucose', 'HbA1c'],
  '●營養與血脂': ['Alb', 'Chol', 'LDL', 'HDL', 'TG'],
  '●肝功能': ['GOT', 'GPT'],
  '●血液': ['Hb', 'WBC', 'Platelet'],
};

const DISPLAY_NAMES = {
  'BUN': '尿素氮 BUN',
  'Cr': '肌酸酐 Cr',
  'eGFR': '腎絲球過濾率 eGFR',
  'eGFR(健保署)': '腎絲球過濾率(健保署)',
  'Cystatin C': '胱抑素C Cystatin C',
  'eGFR(Cr-CysC)': '腎絲球過濾率(Cr-CysC)',
  'UPCR': '蛋白尿 UPCR',
  'UACR': '白蛋白尿 UACR',
  'Na': '鈉 Na',
  'K': '鉀 K',
  'Ca': '鈣 Ca',
  'P': '磷 P',
  'U.A': '尿酸',
  'Glucose': '血糖',
  'HbA1c': '糖化血色素 HbA1c',
  'Alb': '白蛋白 Alb',
  'Chol': '總膽固醇',
  'LDL': '低密度脂蛋白 LDL',
  'HDL': '高密度脂蛋白 HDL',
  'TG': '三酸甘油脂 TG',
  'GOT': 'GOT',
  'GPT': 'GPT',
  'Hb': '血色素 Hb',
  'WBC': '白血球 WBC',
  'Platelet': '血小板',
};

const ORDER_CODE_MAP = {
  '09002C': 'BUN',
  '09015C': null, // special: Cr / eGFR / eGFR(健保署)
  '08133B': 'Cystatin C',
  '09040C': null, // special: UPCR
  '12111C': null, // special: UACR
  '09021C': 'Na',
  '09022C': 'K',
  '09011C': 'Ca',
  '09012C': 'P',
  '09013C': 'U.A',
  '09005C': 'Glucose',
  '09006C': 'HbA1c',
  '09038C': 'Alb',
  '09001C': 'Chol',
  '09044C': 'LDL',
  '09043C': 'HDL',
  '09004C': 'TG',
  '09025C': 'GOT',
  '09026C': 'GPT',
  '08011C': null, // special: Hb/WBC/Platelet
};

function classifyLab(lab) {
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
    if (/\bwbc\b|白血球/.test(n)) return 'WBC';
    if (/platelet|plt|血小板/.test(n)) return 'Platelet';
    return null;
  }
  return ORDER_CODE_MAP[code] || null;
}

export function buildNephroReport(groupedLabs, userInfo) {
  if (!groupedLabs || groupedLabs.length === 0) return null;

  const targetCodes = new Set(Object.keys(ORDER_CODE_MAP));
  const matchingTests = [];

  groupedLabs.forEach(labGroup => {
    if (!labGroup.labs) return;
    labGroup.labs.forEach(lab => {
      if (!targetCodes.has(lab.orderCode) && lab.orderCode !== '08011C') return;
      const displayName = classifyLab(lab);
      if (!displayName) return;
      matchingTests.push({
        displayName,
        value: lab.value || lab.result || '',
        unit: lab.unit || '',
        date: labGroup.date,
        hosp: labGroup.hosp || '',
        valueStatus: lab.valueStatus,
        isAbnormal: lab.isAbnormal,
        referenceMin: lab.referenceMin,
        referenceMax: lab.referenceMax,
      });
    });
  });

  if (matchingTests.length === 0) return null;

  const dates = [...new Set(matchingTests.map(t => t.date))].sort((a, b) => new Date(b) - new Date(a));

  const allItems = Object.values(NEPHRO_CATEGORIES).flat();
  const byItemAndDate = {};
  allItems.forEach(item => { byItemAndDate[item] = {}; });

  matchingTests.forEach(test => {
    if (!byItemAndDate[test.displayName]) return;
    if (!byItemAndDate[test.displayName][test.date]) {
      byItemAndDate[test.displayName][test.date] = test;
    }
  });

  // CKD-EPI 2021 Cr-CysC eGFR 計算
  const sex = userInfo?.gender || '';
  const isFemale = sex === 'F' || sex === '女';
  let age = userInfo?.age;
  if (age == null && userInfo?.birthday && userInfo.birthday.length === 7) {
    const rocYear = parseInt(userInfo.birthday.substring(0, 3), 10);
    const adYear = rocYear + 1911;
    age = new Date().getFullYear() - adYear;
  }

  byItemAndDate['eGFR(Cr-CysC)'] = {};
  if (age != null) {
    dates.forEach(d => {
      const crEntry = byItemAndDate['Cr']?.[d];
      const cysEntry = byItemAndDate['Cystatin C']?.[d];
      if (!crEntry || !cysEntry) return;
      const scr = parseFloat(crEntry.value);
      const cys = parseFloat(cysEntry.value);
      if (isNaN(scr) || isNaN(cys) || scr <= 0 || cys <= 0) return;

      const K = isFemale ? 0.7 : 0.9;
      const alpha = isFemale ? -0.219 : -0.144;
      const minScrK = Math.min(scr / K, 1);
      const maxScrK = Math.max(scr / K, 1);
      const minCys = Math.min(cys / 0.8, 1);
      const maxCys = Math.max(cys / 0.8, 1);
      let eGFR = 135 * Math.pow(minScrK, alpha) * Math.pow(maxScrK, -0.544)
        * Math.pow(minCys, -0.323) * Math.pow(maxCys, -0.778)
        * Math.pow(0.9961, age);
      if (isFemale) eGFR *= 0.963;
      const val = Number(eGFR.toFixed(1));

      byItemAndDate['eGFR(Cr-CysC)'][d] = {
        displayName: 'eGFR(Cr-CysC)',
        value: val.toString(),
        unit: 'mL/min',
        date: d,
        valueStatus: val < 60 ? 'low' : undefined,
      };
    });
  }

  const nonEmptyItems = allItems.filter(item =>
    Object.values(byItemAndDate[item] || {}).some(v => v)
  );

  const rows = [];
  for (const [category, items] of Object.entries(NEPHRO_CATEGORIES)) {
    const catItems = items.filter(i => nonEmptyItems.includes(i));
    if (catItems.length === 0) continue;
    rows.push({ isCategory: true, displayName: category });
    catItems.forEach(item => {
      rows.push({ isCategory: false, displayName: item, values: byItemAndDate[item] || {} });
    });
  }

  const dateHospMap = {};
  dates.forEach(d => {
    const hosps = matchingTests.filter(t => t.date === d).map(t => t.hosp).filter(Boolean);
    const counts = {};
    hosps.forEach(h => { counts[h] = (counts[h] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    dateHospMap[d] = sorted.length > 0 ? sorted[0][0] : '';
  });

  return { dates, rows, userInfo, dateHospMap };
}

export function renderNephroReportHTML(reportData) {
  if (!reportData) return '';

  const { dates, rows, userInfo, dateHospMap } = reportData;
  const name = userInfo?.name || '';
  const userId = userInfo?.userId || '';
  const gender = userInfo?.gender || '';
  const age = userInfo?.age != null ? `${userInfo.age}歲` : '';
  const patientLine = [name, gender, age].filter(Boolean).join(' ');

  function formatDate(d) {
    if (!d) return '';
    const p = d.replace(/-/g, '/').split('/');
    if (p.length === 3) return `${p[0]}/${p[1]}/${p[2]}`;
    return d;
  }
  function shortDate(d) {
    if (!d) return '';
    const p = d.replace(/-/g, '/').split('/');
    if (p.length === 3) return `<div style="font-size:0.85em;color:#666">${p[0]}</div><div>${p[1]}/${p[2]}</div>`;
    return d;
  }

  function cellStyle(test) {
    if (!test) return '';
    if (test.valueStatus === 'high' || (test.valueStatus === undefined && test.isAbnormal)) return 'color:#f44336;font-weight:bold;background:#ffebee';
    if (test.valueStatus === 'low') return 'color:#4caf50;font-weight:bold;background:#e8f5e9';
    return '';
  }

  function shortHosp(h) {
    if (!h) return '';
    return h.replace(/醫院|醫學中心|分院|附設醫院/g, '').split(';')[0].slice(0, 5);
  }

  const dateHeaders = dates.map(d => {
    const hosp = shortHosp(dateHospMap[d] || '');
    return `<th style="text-align:center;padding:4px 6px;border:1px solid #ccc;min-width:55px">${shortDate(d)}${hosp ? `<div style="font-size:0.75em;color:#888;font-weight:normal">${hosp}</div>` : ''}</th>`;
  }).join('');

  const bodyRows = rows.map(row => {
    if (row.isCategory) {
      return `<tr><td colspan="${dates.length + 1}" style="font-weight:bold;background:#e0e0e0;padding:5px 8px;border:1px solid #ccc;print-color-adjust:exact;-webkit-print-color-adjust:exact">${row.displayName}</td></tr>`;
    }
    const cells = dates.map(d => {
      const test = row.values[d];
      const val = test ? test.value : '—';
      const style = test ? cellStyle(test) : 'color:#ccc';
      return `<td style="text-align:center;padding:3px 6px;border:1px solid #ccc;${style}">${val}</td>`;
    }).join('');
    const label = DISPLAY_NAMES[row.displayName] || row.displayName;
    return `<tr><td style="padding:3px 8px 3px 1.5em;border:1px solid #ccc;font-weight:500;white-space:nowrap">${label}</td>${cells}</tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<title>腎臟科檢驗報告</title>
<style>
  body { margin:0; font-family:'Roboto','Helvetica','Arial','Microsoft JhengHei',sans-serif; font-size:13px; }
  #toolbar { position:fixed; top:8px; right:12px; display:flex; gap:8px; z-index:10; }
  #toolbar button { padding:6px 14px; font-size:14px; cursor:pointer; border:1px solid #ccc; border-radius:4px; background:#fff; }
  #toolbar button:hover { background:#f0f0f0; }
  #content { padding:12px 16px; }
  .patient-line { text-align:center; font-size:1.3rem; font-weight:bold; margin:8px 0 12px; }
  table { border-collapse:collapse; width:100%; }
  .controls { background:#f5f5f5; padding:8px 12px; margin-bottom:10px; border-radius:4px; display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
  .controls label { font-size:13px; cursor:pointer; display:inline-flex; align-items:center; gap:3px; }
  .controls span { font-size:13px; color:#333; }
  @media print {
    #toolbar { display:none; }
    .controls { display:none; }
    @page { size:A4; margin:0.6cm; }
    #content { padding:0; }
    table { font-size:11pt; }
    th, td { padding:3px 6px !important; }
  }
</style>
</head>
<body>
<div id="toolbar">
  <button id="print-btn">🖨 列印</button>
  <button id="close-btn">✕ 關閉</button>
</div>
<div id="content">
  <h2 style="margin:0;text-align:center">腎臟相關檢驗報告</h2>
  <div class="patient-line">${patientLine}　列印日期：${new Date().toLocaleDateString('zh-TW')}</div>
  <div class="controls" id="controls">
    <span>顯示組數：</span>
    ${[4, 5, 6, 7, 8].filter(n => n <= dates.length).map(n => `<label><input type="radio" name="dc" value="${n}" ${n === Math.min(6, dates.length) ? 'checked' : ''}>${n}</label>`).join('')}
    ${dates.length > 4 ? '<label><input type="radio" name="dc" value="-1">全部</label>' : ''}
  </div>
  <table id="reportTable">
    <thead><tr><th style="text-align:left;padding:4px 8px;border:1px solid #ccc;width:120px">檢驗項目</th>${dateHeaders}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</div>
</body>
</html>`;
}

export function attachNephroReportHandlers(win, dateCount) {
  var doc = win.document;
  doc.getElementById('print-btn').addEventListener('click', function() { win.print(); });
  doc.getElementById('close-btn').addEventListener('click', function() { win.close(); });

  var radios = doc.querySelectorAll('input[name="dc"]');
  function update() {
    var checked = doc.querySelector('input[name="dc"]:checked');
    if (!checked) return;
    var val = parseInt(checked.value);
    var show = val === -1 ? dateCount : val;
    var ths = doc.querySelectorAll('#reportTable thead th');
    for (var i = 1; i < ths.length; i++) ths[i].style.display = i <= show ? '' : 'none';
    var trs = doc.querySelectorAll('#reportTable tbody tr');
    trs.forEach(function(tr) {
      var tds = tr.querySelectorAll('td');
      if (tds.length <= 1) return;
      for (var i = 1; i < tds.length; i++) tds[i].style.display = i <= show ? '' : 'none';
    });
  }
  radios.forEach(function(r) { r.addEventListener('change', update); });
  update();
}
