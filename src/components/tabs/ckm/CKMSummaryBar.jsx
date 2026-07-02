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
