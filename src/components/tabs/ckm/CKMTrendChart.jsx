import React from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LineChart } from '@mui/x-charts/LineChart';

const CHART_HEIGHT = 300;
const MIN_WIDTH = 500;
const MAX_WIDTH = 900;
const PX_PER_POINT = 45;

const DualAxisTrendChart = ({ title, leftData, rightData, leftLabel, rightLabel, leftColor, rightColor, leftUnit, rightUnit, referenceLines }) => {
  if (leftData.length < 2 && rightData.length < 2) return null;

  const dateMap = new Map();
  for (const p of leftData) {
    if (!dateMap.has(p.date)) dateMap.set(p.date, { date: p.date, label: p.label, sortKey: p.sortKey });
  }
  for (const p of rightData) {
    if (!dateMap.has(p.date)) dateMap.set(p.date, { date: p.date, label: p.label, sortKey: p.sortKey });
  }
  const allDates = [...dateMap.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const labels = allDates.map(d => d.label);

  const leftMap = new Map(leftData.map(p => [p.date, p.value]));
  const rightMap = new Map(rightData.map(p => [p.date, p.value]));
  const leftValues = allDates.map(d => leftMap.get(d.date) ?? null);
  const rightValues = allDates.map(d => rightMap.get(d.date) ?? null);

  const dataCount = Math.max(leftData.length, rightData.length);
  const chartWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dataCount * PX_PER_POINT));
  const needsScroll = chartWidth >= MAX_WIDTH;

  const series = [];
  const yAxis = [];

  if (leftData.length >= 2) {
    yAxis.push({
      id: 'left',
      scaleType: 'linear',
      position: 'left',
      label: `${leftLabel} (${leftUnit})`,
      tickLabelStyle: { fontSize: 12 },
    });
    series.push({
      id: 'left',
      yAxisId: 'left',
      data: leftValues,
      label: leftLabel,
      showMark: true,
      color: leftColor,
      connectNulls: true,
      valueFormatter: v => v != null ? `${v} ${leftUnit}` : '',
    });
  }

  if (rightData.length >= 2) {
    yAxis.push({
      id: 'right',
      scaleType: 'linear',
      position: 'right',
      label: `${rightLabel} (${rightUnit})`,
      tickLabelStyle: { fontSize: 12 },
    });
    series.push({
      id: 'right',
      yAxisId: 'right',
      data: rightValues,
      label: rightLabel,
      showMark: true,
      color: rightColor,
      connectNulls: true,
      valueFormatter: v => v != null ? `${v} ${rightUnit}` : '',
    });
  }

  if (yAxis.length === 0) return null;

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0.5 }}>
        <Box sx={needsScroll ? { overflowX: 'auto', maxWidth: MAX_WIDTH } : {}}>
          <LineChart
            xAxis={[{
              data: labels,
              scaleType: 'point',
              tickLabelStyle: { fontSize: 11, angle: -45 },
            }]}
            yAxis={yAxis}
            series={series}
            height={CHART_HEIGHT}
            width={chartWidth}
            margin={{ left: 60, right: rightData.length >= 2 ? 60 : 20, top: 20, bottom: 50 }}
            tooltip={{ trigger: 'axis' }}
            slotProps={{ legend: { hidden: false, position: { vertical: 'top', horizontal: 'right' } } }}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

const SingleAxisTrendChart = ({ title, data, label, color, unit, referenceValues }) => {
  if (data.length < 2) return null;

  const labels = data.map(d => d.label);
  const values = data.map(d => d.value);
  const chartWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, data.length * PX_PER_POINT));
  const needsScroll = chartWidth >= MAX_WIDTH;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const allVals = [...values, ...(referenceValues || [])];
  const rangeMin = Math.min(...allVals);
  const rangeMax = Math.max(...allVals);
  const pad = (rangeMax - rangeMin) * 0.15 || rangeMax * 0.1;

  const series = [
    {
      id: 'main',
      data: values,
      label,
      showMark: true,
      color,
      valueFormatter: v => v != null ? `${v} ${unit}` : '',
    },
  ];

  if (referenceValues) {
    for (const ref of referenceValues) {
      series.push({
        id: `ref_${ref.value}`,
        data: Array(values.length).fill(ref.value),
        label: ref.label,
        showMark: false,
        color: ref.color || '#e57373',
        valueFormatter: v => v != null ? `${v} ${unit}` : '',
      });
    }
  }

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0.5 }}>
        <Box sx={needsScroll ? { overflowX: 'auto', maxWidth: MAX_WIDTH } : {}}>
          <LineChart
            xAxis={[{
              data: labels,
              scaleType: 'point',
              tickLabelStyle: { fontSize: 11, angle: -45 },
            }]}
            yAxis={[{
              min: Math.max(0, rangeMin - pad),
              max: rangeMax + pad,
              tickLabelStyle: { fontSize: 12 },
            }]}
            series={series}
            height={CHART_HEIGHT}
            width={chartWidth}
            margin={{ left: 60, right: 20, top: 20, bottom: 50 }}
            tooltip={{ trigger: 'axis' }}
            slotProps={{
              legend: { hidden: false, position: { vertical: 'top', horizontal: 'right' } },
            }}
            sx={{
              '& .MuiLineElement-series-ref_100': { strokeDasharray: '6 3', strokeWidth: 1.5 },
              '& .MuiLineElement-series-ref_70': { strokeDasharray: '6 3', strokeWidth: 1.5 },
            }}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

const CKMTrendChart = ({ trends }) => {
  if (!trends) return null;

  const hasRenal = trends.renal.egfr.length >= 2 || trends.renal.uacr.length >= 2;
  const hasGlycemic = trends.glycemic.hba1c.length >= 2 || trends.glycemic.glucose.length >= 2;
  const hasLDL = trends.ldl.length >= 2;

  if (!hasRenal && !hasGlycemic && !hasLDL) return null;

  return (
    <Box sx={{ mb: 1 }}>
      {hasRenal && (
        <DualAxisTrendChart
          title="腎功能趨勢"
          leftData={trends.renal.egfr}
          rightData={trends.renal.uacr}
          leftLabel="eGFR"
          rightLabel={trends.renal.uacr.length > 0 ? 'UACR' : 'UPCR'}
          leftColor="#1976d2"
          rightColor="#ed6c02"
          leftUnit="mL/min"
          rightUnit="mg/g"
        />
      )}
      {hasGlycemic && (
        <DualAxisTrendChart
          title="血糖代謝趨勢"
          leftData={trends.glycemic.hba1c}
          rightData={trends.glycemic.glucose}
          leftLabel="HbA1c"
          rightLabel="Glucose"
          leftColor="#9c27b0"
          rightColor="#2e7d32"
          leftUnit="%"
          rightUnit="mg/dL"
        />
      )}
      {hasLDL && (
        <SingleAxisTrendChart
          title="LDL 趨勢"
          data={trends.ldl}
          label="LDL"
          color="#d32f2f"
          unit="mg/dL"
          referenceValues={[
            { value: 100, label: '一般目標 (100)', color: '#ed6c02' },
            { value: 70, label: '高風險目標 (70)', color: '#d32f2f' },
          ]}
        />
      )}
    </Box>
  );
};

export default CKMTrendChart;
