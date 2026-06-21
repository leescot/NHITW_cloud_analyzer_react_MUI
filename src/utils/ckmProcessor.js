import {
  CKM_ICD_PREFIXES,
  CKM_ATC_PREFIXES,
  CKM_LAB_CODE_SET,
  CKM_LAB_CODES,
  TREND_ITEM_PATTERNS,
  CKM_IMAGING_REGEX,
} from '../config/ckmDefinitions';

function classifyICD(icdCode) {
  if (!icdCode) return null;
  const code = icdCode.replace(/\./g, '');
  for (const [category, prefixes] of Object.entries(CKM_ICD_PREFIXES)) {
    for (const { prefix } of prefixes) {
      if (code.startsWith(prefix)) return category;
    }
  }
  return null;
}

function classifyATC(atcCode) {
  if (!atcCode) return null;
  for (const [category, { prefixes }] of Object.entries(CKM_ATC_PREFIXES)) {
    if (prefixes.some(p => atcCode.startsWith(p))) return category;
  }
  return null;
}

function getLabGroup(orderCode) {
  for (const [group, items] of Object.entries(CKM_LAB_CODES)) {
    if (items.some(item => item.code === orderCode)) return group;
  }
  return null;
}

function parseLabDate(record) {
  return record.real_inspect_date || record.recipe_date || '';
}

function parseHospName(hospStr) {
  if (!hospStr) return '';
  return hospStr.split(';')[0] || hospStr;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.replace(/-/g, '/').split('/');
  if (parts.length === 3) return `${parts[0].slice(2)}/${parts[1]}/${parts[2]}`;
  return dateStr;
}

function parseDateToSortable(dateStr) {
  if (!dateStr) return '';
  return dateStr.replace(/\//g, '-');
}

function getCKDStageFromEGFR(egfr) {
  if (egfr == null) return null;
  if (egfr >= 90) return 'G1';
  if (egfr >= 60) return 'G2';
  if (egfr >= 45) return 'G3a';
  if (egfr >= 30) return 'G3b';
  if (egfr >= 15) return 'G4';
  return 'G5';
}

function extractTrendData(labRecords, trendKey) {
  const pattern = TREND_ITEM_PATTERNS[trendKey];
  if (!pattern) return [];

  const points = [];
  for (const r of labRecords) {
    if (!pattern.codes.includes(r.order_code)) continue;
    const name = r.assay_item_name || '';
    if (!pattern.namePattern.test(name)) continue;
    const val = parseFloat(r.assay_value);
    if (isNaN(val)) continue;
    const date = parseLabDate(r);
    if (!date) continue;
    points.push({
      label: formatDateLabel(date),
      value: val,
      date,
      sortKey: parseDateToSortable(date),
      unit: r.unit_data || '',
    });
  }

  points.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return points;
}

function extractGlucoseTrend(labRecords) {
  const pattern = TREND_ITEM_PATTERNS.glucose;
  const points = [];
  for (const r of labRecords) {
    if (!pattern.codes.includes(r.order_code)) continue;
    const name = r.assay_item_name || '';
    if (!pattern.namePattern.test(name)) continue;
    const val = parseFloat(r.assay_value);
    if (isNaN(val)) continue;
    const date = parseLabDate(r);
    if (!date) continue;
    const type = r.order_code === '09140C' ? 'PC' : 'AC';
    points.push({
      label: formatDateLabel(date),
      value: val,
      date,
      sortKey: parseDateToSortable(date),
      unit: r.unit_data || 'mg/dL',
      type,
    });
  }
  points.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return points;
}

function parseAbnormalFlag(value, consultValue) {
  if (!consultValue || !value) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;

  const rangeMatch = consultValue.match(/\[([^\]]*)\]\[([^\]]*)\]/);
  if (!rangeMatch) return null;
  const low = parseFloat(rangeMatch[1]);
  const high = parseFloat(rangeMatch[2]);

  if (!isNaN(low) && !isNaN(high)) {
    if (num > high * 1.5) return '↑↑';
    if (num > high) return '↑';
    if (num < low * 0.5 && low > 0) return '↓↓';
    if (num < low) return '↓';
  } else if (!isNaN(high)) {
    if (num > high * 1.5) return '↑↑';
    if (num > high) return '↑';
  } else if (!isNaN(low)) {
    if (num < low * 0.5 && low > 0) return '↓↓';
    if (num < low) return '↓';
  }
  return null;
}

export const ckmProcessor = {
  processCKMData({ groupedMedications, rawLabData, imagingData, dischargeData }) {
    console.log('[CKM] processCKMData called', {
      groupedMedications: groupedMedications?.length,
      rawLabData: rawLabData?.rObject?.length,
      imagingData: imagingData ? (imagingData.withReport?.length || 0) + (imagingData.withoutReport?.length || 0) : 0,
      dischargeData: dischargeData?.length,
    });

    const result = {
      summary: { ckdStage: null, latestEGFR: null, latestHbA1c: null, latestLDL: null, latestUACR: null, latestUPCR: null, lvef: null },
      trends: {
        renal: { egfr: [], uacr: [] },
        glycemic: { hba1c: [], glucose: [] },
        ldl: [],
      },
      diagnoses: { cardiovascular: [], kidney: [], metabolic: [] },
      medications: {},
      labs: {},
      imaging: [],
      ekgAlerts: [],
      hasCKMData: false,
    };

    for (const key of Object.keys(CKM_ATC_PREFIXES)) {
      result.medications[key] = [];
    }
    for (const key of Object.keys(CKM_LAB_CODES)) {
      result.labs[key] = [];
    }

    // === 診斷 ===
    const seenICD = new Map();

    const addDiagnosis = (icdCode, icdName, date, hospital) => {
      const category = classifyICD(icdCode);
      if (!category) return;
      const code = icdCode.replace(/\./g, '');
      if (!seenICD.has(code) || date > seenICD.get(code).date) {
        seenICD.set(code, { icdCode: code, icdName: icdName || '', date, hospital, category });
      }
    };

    if (groupedMedications) {
      for (const group of groupedMedications) {
        const date = group.date || '';
        const hosp = group.hosp || '';
        if (group.icd_code) addDiagnosis(group.icd_code, group.icd_name, date, hosp);
      }
    }

    if (dischargeData) {
      for (const d of dischargeData) {
        const date = d.out_date || d.date || '';
        const hosp = d.hospital || parseHospName(d.hosp) || '';
        if (d.icd_code) addDiagnosis(d.icd_code, d.icd_name || d.icd_cname, date, hosp);
      }
    }

    for (const entry of seenICD.values()) {
      result.diagnoses[entry.category].push(entry);
    }
    for (const cat of Object.keys(result.diagnoses)) {
      result.diagnoses[cat].sort((a, b) => b.date.localeCompare(a.date));
    }

    // === 藥物 ===
    // groupedMedications 來自 medicationProcessor，每個 group 的 medications[] 內欄位為：
    // name, ingredient, dosage, perDosage, frequency, days, atc_code, atc_name, drug_left, drugcode
    if (groupedMedications) {
      const seenDrugs = new Map();
      for (const group of groupedMedications) {
        const meds = group.medications || [];
        for (const med of meds) {
          const atcCode = med.atc_code || '';
          const category = classifyATC(atcCode);
          if (!category) continue;

          const drugCode = med.drugcode || '';
          const date = group.date || '';
          const key = `${category}_${drugCode}`;

          if (!seenDrugs.has(key) || date > seenDrugs.get(key).date) {
            const existing = seenDrugs.get(key);
            const count = existing ? existing.count + 1 : 1;
            seenDrugs.set(key, {
              drugName: med.name || '',
              ingredient: med.ingredient || '',
              dosage: med.perDosage || '',
              frequency: med.frequency || '',
              days: med.days || '',
              date,
              hospital: group.hosp || '',
              drugLeft: med.drug_left ?? 0,
              atcCode,
              category,
              count,
            });
          } else {
            seenDrugs.get(key).count += 1;
          }
        }
      }
      for (const entry of seenDrugs.values()) {
        result.medications[entry.category].push(entry);
      }
      for (const cat of Object.keys(result.medications)) {
        result.medications[cat].sort((a, b) => b.date.localeCompare(a.date));
      }
    }

    // === 檢驗 ===
    const labRecords = rawLabData?.rObject || [];

    // 最近一筆 per order_code+assay_item
    const latestLabs = new Map();
    for (const r of labRecords) {
      if (!CKM_LAB_CODE_SET.has(r.order_code)) continue;
      const group = getLabGroup(r.order_code);
      if (!group) continue;
      const val = r.assay_value;
      if (!val || val.trim() === '') continue;

      const date = parseLabDate(r);
      const key = `${r.order_code}_${r.assay_item_name || ''}`;

      if (!latestLabs.has(key) || date > latestLabs.get(key).date) {
        latestLabs.set(key, {
          code: r.order_code,
          name: r.assay_item_name || r.order_name || '',
          value: val,
          unit: r.unit_data || '',
          date,
          hospital: parseHospName(r.hosp),
          abnormalFlag: parseAbnormalFlag(val, r.consult_value),
          group,
        });
      }
    }
    for (const entry of latestLabs.values()) {
      if (result.labs[entry.group]) {
        result.labs[entry.group].push(entry);
      }
    }
    for (const group of Object.keys(result.labs)) {
      result.labs[group].sort((a, b) => b.date.localeCompare(a.date));
    }

    // === 趨勢 ===
    result.trends.renal.egfr = extractTrendData(labRecords, 'egfr');
    let uacr = extractTrendData(labRecords, 'uacr');
    if (uacr.length === 0) uacr = extractTrendData(labRecords, 'upcr');
    result.trends.renal.uacr = uacr;
    result.trends.glycemic.hba1c = extractTrendData(labRecords, 'hba1c');
    result.trends.glycemic.glucose = extractGlucoseTrend(labRecords);
    result.trends.ldl = extractTrendData(labRecords, 'ldl');

    // === 摘要 ===
    // 優先使用健保署 eGFR，fallback 院所 eGFR
    const nhiEgfr = [];
    const hospEgfr = [];
    for (const r of labRecords) {
      if (r.order_code !== '09015C' && r.order_code !== 'Y00001') continue;
      const name = r.assay_item_name || '';
      if (!/eGFR|GFR|腎絲球/i.test(name)) continue;
      const val = parseFloat(r.assay_value);
      if (isNaN(val)) continue;
      const date = parseLabDate(r);
      const isNHI = (r.assay_method || '') === '健保署計算' || /健保署/i.test(name) || r.order_code === 'Y00001';
      const entry = { value: val, date, sortKey: parseDateToSortable(date), unit: r.unit_data || 'mL/min' };
      if (isNHI) nhiEgfr.push(entry); else hospEgfr.push(entry);
    }
    nhiEgfr.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    hospEgfr.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const egfrForBadge = nhiEgfr.length > 0 ? nhiEgfr[nhiEgfr.length - 1] : (hospEgfr.length > 0 ? hospEgfr[hospEgfr.length - 1] : null);
    if (egfrForBadge) {
      result.summary.latestEGFR = { value: egfrForBadge.value, unit: egfrForBadge.unit, date: egfrForBadge.date };
      result.summary.ckdStage = getCKDStageFromEGFR(egfrForBadge.value);
    }
    const hba1cPoints = result.trends.glycemic.hba1c;
    if (hba1cPoints.length > 0) {
      const latest = hba1cPoints[hba1cPoints.length - 1];
      result.summary.latestHbA1c = { value: latest.value, unit: '%', date: latest.date };
    }
    const ldlPoints = result.trends.ldl;
    if (ldlPoints.length > 0) {
      const latest = ldlPoints[ldlPoints.length - 1];
      result.summary.latestLDL = { value: latest.value, unit: latest.unit || 'mg/dL', date: latest.date };
    }
    const pureUacr = extractTrendData(labRecords, 'uacr');
    if (pureUacr.length > 0) {
      const latest = pureUacr[pureUacr.length - 1];
      result.summary.latestUACR = { value: latest.value, unit: latest.unit || 'mg/g', date: latest.date };
    }
    const pureUpcr = extractTrendData(labRecords, 'upcr');
    if (pureUpcr.length > 0) {
      const latest = pureUpcr[pureUpcr.length - 1];
      result.summary.latestUPCR = { value: latest.value, unit: latest.unit || 'mg/g', date: latest.date };
    }

    // === 影像 ===
    if (imagingData) {
      const allImaging = [...(imagingData.withReport || []), ...(imagingData.withoutReport || [])];
      for (const img of allImaging) {
        const name = img.order_name || img.orderName || '';
        if (!CKM_IMAGING_REGEX.test(name)) continue;
        const hasReport = !!(img.inspect_result || img.inspectResult);
        const reportText = img.inspect_result || img.inspectResult || '';
        result.imaging.push({
          date: img.date || img.real_inspect_date || '',
          hospital: parseHospName(img.hosp) || img.hospital || '',
          orderName: name,
          hasReport,
          reportExcerpt: reportText.length > 200 ? reportText.slice(0, 200) + '...' : reportText,
          reportFull: reportText,
        });
      }
      result.imaging.sort((a, b) => b.date.localeCompare(a.date));

      // EKG 異常關鍵字提取
      const ekgKeywords = /fibrillation|flutter|(?:AV|bundle.branch)\s*block|RBBB|LBBB|CRBBB|bradycardia|tachycardia|infarct|ischemi[ac]|LVH|RVH|hypertrophy|pacemaker|pacing|(?:ST\s*(?:elevation|depression|change))|prolonged\s*QT|WPW|\bVT\b|\bSVT\b|\bPACs?\b|\bPVCs?\b|AVNRT|premature|atrial.?paced|ventricular.?paced/gi;
      const ekgAlerts = [];
      for (const img of result.imaging) {
        if (!img.reportFull) continue;
        const name = (img.orderName || '').toLowerCase();
        if (!/心電圖|ekg|ecg|electrocardiogra/i.test(name)) continue;
        const matches = img.reportFull.match(ekgKeywords);
        if (matches && matches.length > 0) {
          const unique = [...new Set(matches.map(m => m.trim()))];
          ekgAlerts.push({ date: img.date, findings: unique, orderName: img.orderName });
        }
      }
      result.ekgAlerts = ekgAlerts;

      // LVEF 提取：從 echo 報告文字中 regex 抓取
      const lvefPattern = /(?:LVEF|(?<![A-Za-z])EF)\s*[=:：]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:[%％]|(?=\s*[\(（]))/i;
      for (const img of result.imaging) {
        if (!img.reportFull) continue;
        const match = img.reportFull.match(lvefPattern);
        if (match) {
          const val = parseFloat(match[1]);
          if (!isNaN(val) && val > 0 && val <= 100) {
            result.summary.lvef = { value: val, date: img.date, source: img.orderName };
            break;
          }
        }
      }
    }

    // === hasCKMData ===
    result.hasCKMData =
      Object.values(result.diagnoses).some(arr => arr.length > 0) ||
      Object.values(result.medications).some(arr => arr.length > 0) ||
      Object.values(result.labs).some(arr => arr.length > 0) ||
      result.imaging.length > 0;

    console.log('[CKM] result', {
      hasCKMData: result.hasCKMData,
      diagnoses: Object.fromEntries(Object.entries(result.diagnoses).map(([k, v]) => [k, v.length])),
      medications: Object.fromEntries(Object.entries(result.medications).map(([k, v]) => [k, v.length])),
      labs: Object.fromEntries(Object.entries(result.labs).map(([k, v]) => [k, v.length])),
      imaging: result.imaging.length,
      trends: {
        egfr: result.trends.renal.egfr.length,
        uacr: result.trends.renal.uacr.length,
        hba1c: result.trends.glycemic.hba1c.length,
        glucose: result.trends.glycemic.glucose.length,
        ldl: result.trends.ldl.length,
      },
    });

    return result;
  },
};
