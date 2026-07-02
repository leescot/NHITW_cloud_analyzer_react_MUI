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

const CATEGORY_LABELS = { cardiovascular: '心血', kidney: '腎臟', metabolic: '代謝' };
const CATEGORY_COLORS = { cardiovascular: '#c62828', kidney: '#e65100', metabolic: '#1565c0' };

const TRACKING_DAYS = 180;

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

        if (CKM_SPECIAL_LAB_CODES.includes(lab.orderCode)) {
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
        if (CKM_SPECIAL_LAB_CODES.includes(lab.orderCode)) {
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

const CKMData = ({ ckmData, groupedLabs, labSettings, generalDisplaySettings, userInfo }) => {
  if (!ckmData || !ckmData.hasCKMData) {
    return <Box sx={{p:2,textAlign:'center'}}><Typography color="text.secondary">無 CKM 相關資料</Typography></Box>;
  }

  const gds = generalDisplaySettings;
  const enableNephroReport = generalDisplaySettings?.enableNephroReport;

  return (
    <Box sx={{ p: 0.5 }}>
      <CKMSummaryBar summary={ckmData.summary} medications={ckmData.medications} groupedLabs={groupedLabs} userInfo={userInfo} gds={gds} />
      <Grid container spacing={0.75}>
        <Grid item xs={12} md={4.5}>
          <DiagnosisCard diagnoses={ckmData.diagnoses} gds={gds} />
          <MedicationCard medications={ckmData.medications} gds={gds} />
          <CKMExtraLabCard groupedLabs={groupedLabs} gds={gds} />
        </Grid>
        <Grid item xs={12} md={4.5}>
          <CKMLabTable groupedLabs={groupedLabs} labSettings={labSettings} gds={gds} enableNephroReport={enableNephroReport} userInfo={userInfo} />
        </Grid>
        <Grid item xs={12} md={3}>
          <CKMImagingCard imaging={ckmData.imaging} ekgAlerts={ckmData.ekgAlerts} lvef={ckmData.summary.lvef} gds={gds} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default CKMData;
