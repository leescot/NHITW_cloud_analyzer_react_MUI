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
  // 移除未成對的殘留括號（例如「超音波心臟圖 )」）
  f = f.replace(/[()（）]/g, ' ');
  return f.replace(/\s{2,}/g, ' ').trim();
}

export const SectionTitle = ({ children }) => (
  <Box sx={{ bgcolor: '#e3f2fd', px: 0.75, py: 0.3, borderRadius: '4px 4px 0 0' }}>
    <Typography variant="caption" sx={{ fontWeight: 700, color: '#1565c0' }}>{children}</Typography>
  </Box>
);
