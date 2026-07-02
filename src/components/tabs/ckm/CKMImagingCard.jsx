// CKM 影像卡片（含 EKG alert / LVEF 標註、報告 tooltip 與 dialog）— 由 CKMData.jsx 抽出
import React, { useState, useMemo } from 'react';
import {
  Paper, Typography, Tooltip, IconButton, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Chip,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TypographySizeWrapper from '../../utils/TypographySizeWrapper';
import { SectionTitle, highlightReport, formatOrderName } from './ckmCardUtils';

const CKMImagingCard = ({ imaging, ekgAlerts, lvef, gds }) => {
  const [reportDialog, setReportDialog] = useState({ open: false, content: '', title: '' });
  const [copySuccess, setCopySuccess] = useState(false);

  const withReportOnly = useMemo(() => {
    if (!imaging) return [];
    return imaging.filter(img => img.hasReport && img.reportExcerpt);
  }, [imaging]);

  // Build annotation map: match EKG alerts and LVEF to imaging items by date
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
                    <div dangerouslySetInnerHTML={{__html: highlightReport(img.reportFull || img.reportExcerpt)}} />
                  </Typography>
                }
                slotProps={{
                  tooltip: {
                    sx: {
                      maxWidth: 600,
                      bgcolor: '#fff',
                      color: 'rgba(0, 0, 0, 0.87)',
                      border: '1px solid #e0e0e0',
                      boxShadow: 3,
                    },
                  },
                }}
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
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                  <TypographySizeWrapper textSizeType="content" generalDisplaySettings={gds}>
                    {formatOrderName(img.orderName)}
                  </TypographySizeWrapper>
                  <Chip
                    size="small"
                    label={`${img.date}${img.hospital ? ` ${img.hospital}` : ''}`}
                    sx={{ fontSize: '0.7rem', height: 'auto', minHeight: '20px', bgcolor: 'transparent', border: '1px solid', borderColor: 'grey.300' }}
                  />
                </Box>
              }
              secondary={
                notes.length > 0 ? (
                  <TypographySizeWrapper textSizeType="note" generalDisplaySettings={gds} sx={{ display: 'block', color: 'text.primary' }}>
                    {notes.join('；')}
                  </TypographySizeWrapper>
                ) : null
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

export default CKMImagingCard;
