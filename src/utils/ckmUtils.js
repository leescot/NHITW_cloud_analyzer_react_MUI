// CKM 共用邏輯（由 CKMData.jsx 抽出，供 Overview 與 CKM 元件共用）
// 注意：本檔會被瀏覽器內 Mocha 測試直接 import，不可 import 任何 npm 套件
import { CKM_ATC_PREFIXES } from '../config/ckmDefinitions.js';

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
