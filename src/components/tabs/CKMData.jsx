import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Chip, Grid, Tooltip, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Stack,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TypographySizeWrapper from '../utils/TypographySizeWrapper';
import PrintIcon from '@mui/icons-material/Print';
import LabItemTrendPopover from './lab/LabItemTrendPopover';
import { CKM_ATC_PREFIXES } from '../../config/ckmDefinitions';
import { buildNephroReport, renderNephroReportHTML, attachNephroReportHandlers } from '../../utils/nephroReportBuilder';

const CATEGORY_LABELS = { cardiovascular: '心血', kidney: '腎臟', metabolic: '代謝' };
const CATEGORY_COLORS = { cardiovascular: '#c62828', kidney: '#e65100', metabolic: '#1565c0' };

const CKM_LAB_ITEMS = [
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

const TRACKING_DAYS = 180;

const cs = { py: 0.25, px: 0.5 };

function sd(d) { if (!d) return ''; const p = d.replace(/-/g, '/').split('/'); return p.length === 3 ? `${p[1]}/${p[2]}` : d; }

function classifyLabItem(lab) {
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

function getStatusColor(test) {
  if (!test) return 'inherit';
  if (test.valueStatus === 'high') return '#f44336';
  if (test.valueStatus === 'low') return '#3d8c40';
  if (test.valueStatus === undefined && test.isAbnormal) return '#f44336';
  return 'inherit';
}

function getStatusBg(test) {
  if (!test) return 'inherit';
  if (test.valueStatus === 'high') return 'rgba(244,67,54,0.05)';
  if (test.valueStatus === 'low') return 'rgba(76,175,80,0.05)';
  if (test.valueStatus === undefined && test.isAbnormal) return 'rgba(244,67,54,0.05)';
  return 'inherit';
}

const HIGHLIGHT_TERMS = [/diagnosis/i, /impression/i, /(?<![A-Za-z])IMP(?![A-Za-z])/, /interpretation/i, /conclusion/i, /LVEF/i, /\bEF(?![A-Za-z])/, /診斷/];

function highlightReport(content) {
  if (!content) return content;
  let result = content;
  HIGHLIGHT_TERMS.forEach(term => {
    result = result.replace(new RegExp(term.source, 'g' + term.flags), match => `<span style="color:red;font-weight:bold">${match}</span>`);
  });
  return result;
}

function formatOrderName(name) {
  if (!name) return '';
  let f = name.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '');
  if (f.includes(';')) f = f.split(';')[0];
  return f.trim();
}

const KEY_DRUG_CLASSES = [
  { label: 'ACEI', prefixes: ['C09A', 'C09B'] },
  { label: 'ARNI', prefixes: ['C09DX04'] },
  { label: 'ARB', prefixes: ['C09C', 'C09D'] },
  { label: 'MRA', prefixes: ['C03DA', 'C03DB'] },
  { label: 'Statin', prefixes: ['C10AA', 'C10BA', 'C10BX'] },
  { label: 'PCSK9i', prefixes: ['C10AX13', 'C10AX14'] },
  { label: 'SGLT2i', prefixes: ['A10BK', 'A10BD15', 'A10BD19', 'A10BD20', 'A10BD21', 'A10BD23', 'A10BD24', 'A10BD25', 'A10BD27'] },
  { label: 'GLP1', prefixes: ['A10BJ', 'A10AE54', 'A10AE56'] },
];

function getKeyDrugLabel(atcCode) {
  if (!atcCode) return null;
  for (const cls of KEY_DRUG_CLASSES) {
    if (cls.prefixes.some(p => atcCode.startsWith(p))) return cls.label;
  }
  return null;
}

function getRecentKeyDrugs(medications) {
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

const SummaryBar = ({ summary, medications, gds }) => {
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

const SectionTitle = ({ children }) => (
  <Box sx={{ bgcolor:'#e3f2fd', px:0.75, py:0.3, borderRadius:'4px 4px 0 0' }}>
    <Typography variant="caption" sx={{ fontWeight:700, color:'#1565c0' }}>{children}</Typography>
  </Box>
);

const DiagnosisCard = ({ diagnoses, gds }) => {
  const rows = [];
  for (const [cat, label] of Object.entries(CATEGORY_LABELS)) {
    const items = diagnoses[cat];
    if (!items || items.length === 0) continue;
    items.forEach((d, i) => rows.push({ cat, label, isFirst: i===0, span: i===0?items.length:0, ...d }));
  }
  if (rows.length === 0) return null;
  return (
    <Paper variant="outlined" sx={{ borderRadius:1, mb:0.75, overflow:'hidden' }}>
      <SectionTitle>診斷</SectionTitle>
      <Table size="small"><TableBody>
        {rows.map((r,i) => (
          <TableRow key={i}>
            {r.isFirst && (
              <TableCell rowSpan={r.span} sx={{...cs, fontWeight:600, color:CATEGORY_COLORS[r.cat], borderRight:'1px solid #eee', width:36, textAlign:'center', verticalAlign:'top'}}>
                <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds}>{r.label}</TypographySizeWrapper>
              </TableCell>
            )}
            <TableCell sx={{...cs, color:'text.secondary', width:40}}>
              <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds}>{sd(r.date)}</TypographySizeWrapper>
            </TableCell>
            <TableCell sx={cs}>
              <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds}>
                <strong>{r.icdCode}</strong> {r.icdName}
              </TypographySizeWrapper>
            </TableCell>
          </TableRow>
        ))}
      </TableBody></Table>
    </Paper>
  );
};

const MedicationCard = ({ medications, gds }) => {
  const rows = [];
  for (const [cat, {label}] of Object.entries(CKM_ATC_PREFIXES)) {
    const items = medications[cat];
    if (!items || items.length === 0) continue;
    items.forEach((m,i) => rows.push({ cat, label, isFirst:i===0, span:i===0?items.length:0, ...m }));
  }
  if (rows.length === 0) return null;
  return (
    <Paper variant="outlined" sx={{ borderRadius:1, mb:0.75, overflow:'hidden' }}>
      <SectionTitle>藥物</SectionTitle>
      <Table size="small"><TableBody>
        {rows.map((r,i) => (
          <TableRow key={i}>
            {r.isFirst && (
              <TableCell rowSpan={r.span} sx={{...cs, fontWeight:600, color:'#555', borderRight:'1px solid #eee', width:38, textAlign:'center', verticalAlign:'top'}}>
                <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds}>{r.label}</TypographySizeWrapper>
              </TableCell>
            )}
            <TableCell sx={cs}>
              <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds}>
                {r.drugName}
                {(() => { const kl = getKeyDrugLabel(r.atcCode); return kl ? <Chip label={kl} size="small" sx={{height:16, fontSize:'0.55rem', ml:0.5, bgcolor:'#1565c0', color:'#fff', '& .MuiChip-label':{px:0.4}}}/> : null; })()}
                {r.drugLeft > 0 && <Chip label={`餘${r.drugLeft}`} size="small" color="info" variant="outlined" sx={{height:16, fontSize:'0.6rem', ml:0.5, '& .MuiChip-label':{px:0.3}}}/>}
              </TypographySizeWrapper>
              {r.ingredient && (
                <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds} sx={{color:'text.secondary', display:'block'}}>
                  {r.ingredient}
                </TypographySizeWrapper>
              )}
            </TableCell>
            <TableCell sx={{...cs, color:'text.secondary', whiteSpace:'nowrap', width:95}}>
              <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds}>
                {r.dosage&&`${r.dosage}# `}{r.frequency} {r.days}天
              </TypographySizeWrapper>
            </TableCell>
            <TableCell sx={{...cs, color:'text.secondary', width:38}}>
              <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds}>{sd(r.date)}</TypographySizeWrapper>
            </TableCell>
          </TableRow>
        ))}
      </TableBody></Table>
    </Paper>
  );
};

const EXTRA_LAB_ITEMS = [
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

const ExtraLabCard = ({ groupedLabs, gds }) => {
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

const CKMLabTable = ({ groupedLabs, labSettings, gds, enableNephroReport, userInfo }) => {
  const handleOpenNephroReport = () => {
    const report = buildNephroReport(groupedLabs, userInfo);
    if (!report) { alert('無腎臟相關檢驗資料'); return; }
    const html = renderNephroReportHTML(report);
    const win = window.open('', '_blank');
    if (!win) { alert('彈出視窗被封鎖，請允許後再試'); return; }
    win.document.write(html);
    win.document.close();
    attachNephroReportHandlers(win, report.dates.length);
  };
  const { uniqueDates, testsByTypeAndDate, sortedTestTypes, trendItems, trendDates } = useMemo(() => {
    if (!groupedLabs || groupedLabs.length === 0) return { uniqueDates: [], testsByTypeAndDate: {}, sortedTestTypes: [], trendItems: {}, trendDates: [] };

    const now = new Date();
    const cutoff = now.getTime() - TRACKING_DAYS * 24 * 60 * 60 * 1000;
    const recentLabs = groupedLabs.filter(g => {
      const d = new Date(g.date);
      return !isNaN(d.getTime()) && d.getTime() >= cutoff;
    });

    const targetCodes = new Set(CKM_LAB_ITEMS.map(t => t.orderCode));
    const matchingTests = [];

    recentLabs.forEach(labGroup => {
      if (!labGroup.labs || !Array.isArray(labGroup.labs)) return;
      labGroup.labs.forEach(lab => {
        if (!targetCodes.has(lab.orderCode) && lab.orderCode !== '08011C') return;

        const specialCodes = ['09015C', '09040C', '12111C', '08011C', '12193C'];
        if (specialCodes.includes(lab.orderCode)) {
          const displayName = classifyLabItem(lab);
          if (displayName && CKM_LAB_ITEMS.some(t => t.displayName === displayName)) {
            matchingTests.push({ ...lab, date: labGroup.date, hosp: labGroup.hosp, displayName });
          }
        } else if (targetCodes.has(lab.orderCode)) {
          const config = CKM_LAB_ITEMS.find(t => t.orderCode === lab.orderCode && !t.special);
          if (config) {
            matchingTests.push({ ...lab, date: labGroup.date, hosp: labGroup.hosp, displayName: config.displayName });
          }
        }
      });
    });

    if (matchingTests.length === 0) return { uniqueDates: [], testsByTypeAndDate: {}, sortedTestTypes: [], trendItems: {}, trendDates: [] };

    const dates = [...new Set(matchingTests.map(t => t.date))].sort((a, b) => new Date(b) - new Date(a));
    const byTypeAndDate = {};
    CKM_LAB_ITEMS.forEach(t => { byTypeAndDate[t.displayName] = {}; dates.forEach(d => { byTypeAndDate[t.displayName][d] = null; }); });

    matchingTests.forEach(test => {
      if (byTypeAndDate[test.displayName] && dates.includes(test.date)) {
        if (byTypeAndDate[test.displayName][test.date] === null) {
          byTypeAndDate[test.displayName][test.date] = test;
        }
      }
    });

    const nonEmpty = Object.keys(byTypeAndDate).filter(type =>
      Object.values(byTypeAndDate[type]).some(v => v !== null)
    );

    const orderMap = {};
    CKM_LAB_ITEMS.forEach((t, i) => { if (!orderMap[t.displayName]) orderMap[t.displayName] = i; });
    const sorted = nonEmpty.sort((a, b) => (orderMap[a] ?? 999) - (orderMap[b] ?? 999));

    // Build trendItems + trendDates for LabItemTrendPopover — 用全部資料（不限 180 天）
    const allMatchingTests = [];
    groupedLabs.forEach(labGroup => {
      if (!labGroup.labs || !Array.isArray(labGroup.labs)) return;
      labGroup.labs.forEach(lab => {
        if (!targetCodes.has(lab.orderCode) && lab.orderCode !== '08011C') return;
        const specialCodesAll = ['09015C', '09040C', '12111C', '08011C', '12193C'];
        if (specialCodesAll.includes(lab.orderCode)) {
          const dn = classifyLabItem(lab);
          if (dn && CKM_LAB_ITEMS.some(t => t.displayName === dn)) {
            allMatchingTests.push({ ...lab, date: labGroup.date, hosp: labGroup.hosp, displayName: dn });
          }
        } else if (targetCodes.has(lab.orderCode)) {
          const config = CKM_LAB_ITEMS.find(t => t.orderCode === lab.orderCode && !t.special);
          if (config) allMatchingTests.push({ ...lab, date: labGroup.date, hosp: labGroup.hosp, displayName: config.displayName });
        }
      });
    });

    const dateHospSet = new Set();
    const items = {};
    allMatchingTests.forEach(test => {
      const dateKey = `${test.date}_${test.hosp || ''}`;
      dateHospSet.add(JSON.stringify({ date: test.date, hosp: test.hosp || '' }));
      if (!items[test.displayName]) items[test.displayName] = { displayName: test.displayName, values: {} };
      if (!items[test.displayName].values[dateKey]) {
        items[test.displayName].values[dateKey] = {
          value: test.value || test.result || '',
          unit: test.unit || '',
          referenceMin: test.referenceMin != null ? test.referenceMin : null,
          referenceMax: test.referenceMax != null ? test.referenceMax : null,
        };
      }
    });
    const tDates = [...dateHospSet].map(s => JSON.parse(s)).sort((a, b) => new Date(b.date) - new Date(a.date));

    return { uniqueDates: dates, testsByTypeAndDate: byTypeAndDate, sortedTestTypes: sorted, trendItems: items, trendDates: tDates };
  }, [groupedLabs]);

  if (sortedTestTypes.length === 0) return null;
  const highlightAbnormal = labSettings?.highlightAbnormal !== false;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, mb: 0.75, overflow: 'hidden' }}>
      <Box sx={{ bgcolor:'#e3f2fd', px:0.75, py:0.3, borderRadius:'4px 4px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Typography variant="caption" sx={{ fontWeight:700, color:'#1565c0' }}>CKM 檢驗 - {TRACKING_DAYS} 天內</Typography>
        {enableNephroReport && (
          <Tooltip title="開新分頁顯示腎臟檢驗報告（可列印）">
            <IconButton size="small" sx={{ p:0.25, color:'#1565c0' }} onClick={handleOpenNephroReport}>
              <PrintIcon sx={{ fontSize:'1rem' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" stickyHeader sx={{ minWidth: uniqueDates.length > 6 ? (70 + uniqueDates.length * 55) : 'auto' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ position:'sticky', left:0, bgcolor:'background.paper', zIndex:2, ...cs }}>
                <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds} sx={{fontWeight:600}}>項目</TypographySizeWrapper>
              </TableCell>
              {uniqueDates.map(date => (
                <TableCell key={date} align="right" sx={{...cs, whiteSpace:'nowrap'}}>
                  <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds}>{sd(date)}</TypographySizeWrapper>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTestTypes.map(displayName => (
              <TableRow key={displayName}>
                <TableCell sx={{ position:'sticky', left:0, bgcolor:'background.paper', zIndex:1, ...cs, whiteSpace:'nowrap' }}>
                  {(() => {
                    const ti = trendItems[displayName];
                    const numericCount = ti ? Object.values(ti.values).filter(v => v && !isNaN(parseFloat(v.value))).length : 0;
                    if (numericCount >= 2) {
                      return (
                        <LabItemTrendPopover item={ti} dates={trendDates}>
                          <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds} sx={{ textDecoration: 'underline dotted', textDecorationColor: '#bdbdbd', cursor: 'pointer' }}>
                            {displayName}
                          </TypographySizeWrapper>
                        </LabItemTrendPopover>
                      );
                    }
                    return <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds}>{displayName}</TypographySizeWrapper>;
                  })()}
                </TableCell>
                {uniqueDates.map(date => {
                  const test = testsByTypeAndDate[displayName][date];
                  return (
                    <TableCell key={date} align="right" sx={{
                      ...cs,
                      color: highlightAbnormal ? getStatusColor(test) : 'inherit',
                      bgcolor: highlightAbnormal ? getStatusBg(test) : 'inherit',
                    }}>
                      <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds}>
                        {test ? (test.value || test.result || '') : <span style={{color:'#ccc'}}>—</span>}
                      </TypographySizeWrapper>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

const ImagingCard = ({ imaging, ekgAlerts, lvef, gds }) => {
  const [reportDialog, setReportDialog] = useState({ open: false, content: '', title: '' });
  const [copySuccess, setCopySuccess] = useState(false);

  const withReportOnly = useMemo(() => {
    if (!imaging) return [];
    return imaging.filter(img => img.hasReport && img.reportExcerpt);
  }, [imaging]);

  // Build annotation map: match EKG alerts and LVEF to imaging items by date+orderName
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

const CKMData = ({ ckmData, groupedLabs, labSettings, generalDisplaySettings, userInfo }) => {
  if (!ckmData || !ckmData.hasCKMData) {
    return <Box sx={{p:2,textAlign:'center'}}><Typography color="text.secondary">無 CKM 相關資料</Typography></Box>;
  }

  const gds = generalDisplaySettings;
  const enableNephroReport = generalDisplaySettings?.enableNephroReport;

  return (
    <Box sx={{ p: 0.5 }}>
      <SummaryBar summary={ckmData.summary} medications={ckmData.medications} gds={gds} />
      <Grid container spacing={0.75}>
        <Grid item xs={12} md={4.5}>
          <DiagnosisCard diagnoses={ckmData.diagnoses} gds={gds} />
          <MedicationCard medications={ckmData.medications} gds={gds} />
          <ExtraLabCard groupedLabs={groupedLabs} gds={gds} />
        </Grid>
        <Grid item xs={12} md={4.5}>
          <CKMLabTable groupedLabs={groupedLabs} labSettings={labSettings} gds={gds} enableNephroReport={enableNephroReport} userInfo={userInfo} />
        </Grid>
        <Grid item xs={12} md={3}>
          <ImagingCard imaging={ckmData.imaging} ekgAlerts={ckmData.ekgAlerts} lvef={ckmData.summary.lvef} gds={gds} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default CKMData;
