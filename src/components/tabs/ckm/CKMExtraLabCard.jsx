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
