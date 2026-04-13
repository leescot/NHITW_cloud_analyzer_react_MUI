import { useState, useRef } from "react";
import { Box, Popover, Typography } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { useXScale, useYScale, useDrawingArea } from "@mui/x-charts/hooks";

const MIN_WIDTH = 660;
const MAX_WIDTH = 900;
const PX_PER_POINT = 40;
const MIN_PX_GAP = 62; // 足以容納最長數值標籤（~50px）加上間距

// 合併數值標籤與 X 軸日期標籤，共用同一套 pixel-distance 過濾邏輯
// 依優先級排序候選點，相鄰間距 < MIN_PX_GAP 的點略過
const ChartLabels = ({ chartData, candidateIndices }) => {
  const xScale = useXScale();
  const yScale = useYScale();
  const { top, height } = useDrawingArea();
  const dateY = top + height + 22;

  // 依優先級逐一放置，太近則跳過
  const placedX = [];
  const visibleIndices = new Set();
  for (const i of candidateIndices) {
    const x = xScale(chartData[i].label);
    if (x == null) continue;
    if (!placedX.some(px => Math.abs(px - x) < MIN_PX_GAP)) {
      placedX.push(x);
      visibleIndices.add(i);
    }
  }

  return (
    <>
      {chartData.map((d, i) => {
        if (!visibleIndices.has(i)) return null;
        const x = xScale(d.label);
        const y = yScale(d.value);
        if (x == null || y == null) return null;
        const offsetX = i === 0 ? 10 : 0;
        const anchor = i === 0 ? "start" : "middle";
        return (
          <g key={i}>
            <text
              x={x + offsetX}
              y={y - 10}
              textAnchor={anchor}
              fontSize={16}
              fill="#1976d2"
              fontWeight="bold"
              stroke="white"
              strokeWidth={4}
              strokeLinejoin="round"
              paintOrder="stroke"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {d.value}
            </text>
            <text
              x={x}
              y={dateY}
              textAnchor="middle"
              fontSize={13}
              fill="#555"
              stroke="white"
              strokeWidth={3}
              strokeLinejoin="round"
              paintOrder="stroke"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </>
  );
};

// 所有重計算集中在此，只在 hasOpened 後才掛載
const TrendChartContent = ({ chartData, unit }) => {
  const chartWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, chartData.length * PX_PER_POINT));
  const needsScroll = chartWidth >= MAX_WIDTH;

  const refMins = chartData.map(d => d.referenceMin);
  const refMaxs = chartData.map(d => d.referenceMax);
  const hasRefMin = refMins.some(v => v != null);
  const hasRefMax = refMaxs.some(v => v != null);

  const dataValues = chartData.map(d => d.value);
  const validRefMins = refMins.filter(v => v != null);
  const validRefMaxs = refMaxs.filter(v => v != null);
  const effectiveMin = Math.min(...dataValues, ...validRefMins);
  const effectiveMax = Math.max(...dataValues, ...validRefMaxs);
  const rangePad = (effectiveMax - effectiveMin) * 0.15 || effectiveMax * 0.1;
  const yMin = Math.max(0, effectiveMin - rangePad);
  const yMax = effectiveMax + rangePad;

  const series = [
    {
      id: "main",
      data: chartData.map(d => d.value),
      showMark: true,
      color: "#1976d2",
      valueFormatter: (v) => v != null ? `${v}${unit ? ` ${unit}` : ""}` : "",
    },
  ];
  if (hasRefMax) {
    series.push({
      id: "refMax",
      data: refMaxs,
      showMark: false,
      color: "#e57373",
      label: "上限",
      valueFormatter: (v) => v != null ? `${v}${unit ? ` ${unit}` : ""}` : "",
    });
  }
  if (hasRefMin) {
    series.push({
      id: "refMin",
      data: refMins,
      showMark: false,
      color: "#388e3c",
      label: "下限",
      valueFormatter: (v) => v != null ? `${v}${unit ? ` ${unit}` : ""}` : "",
    });
  }

  // 建立候選標籤索引，依重要性排序
  // Tier 1：第一點、最後一點（保證可見）
  // Tier 2：全域最大值、最小值
  // Tier 3：超出上下限的異常點
  const values = chartData.map(d => d.value);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const added = new Set();
  const candidateIndices = [];
  const addIfNew = (i) => { if (!added.has(i)) { added.add(i); candidateIndices.push(i); } };

  addIfNew(0);
  addIfNew(chartData.length - 1);
  chartData.forEach((d, i) => { if (d.value === maxVal || d.value === minVal) addIfNew(i); });
  chartData.forEach((d, i) => {
    const isAbove = d.referenceMax != null && d.value > d.referenceMax;
    const isBelow = d.referenceMin != null && d.value < d.referenceMin;
    if (isAbove || isBelow) addIfNew(i);
  });

  return (
    <Box sx={needsScroll ? { overflowX: "auto", maxWidth: MAX_WIDTH } : {}}>
      <LineChart
        xAxis={[{
          data: chartData.map(d => d.label),
          scaleType: "point",
          tickLabelStyle: { display: "none" },
        }]}
        yAxis={[{ min: yMin, max: yMax, tickLabelStyle: { fontSize: 15 } }]}
        series={series}
        height={420}
        width={chartWidth}
        margin={{ left: 65, right: 55, top: 30, bottom: 65 }}
        slotProps={{ legend: { hidden: true } }}
        tooltip={{ trigger: "axis" }}
        sx={{
          "& svg": { overflow: "visible" },
          "& .MuiLineElement-series-refMax": {
            strokeDasharray: "6 3",
            strokeWidth: 1.5,
          },
          "& .MuiLineElement-series-refMin": {
            strokeDasharray: "6 3",
            strokeWidth: 1.5,
          },
        }}
      >
        <ChartLabels chartData={chartData} candidateIndices={candidateIndices} />
      </LineChart>
    </Box>
  );
};

const LabItemTrendPopover = ({ item, dates, children }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [hasOpened, setHasOpened] = useState(false);
  const closeTimer = useRef(null);

  // 輕量計算：只做資料整理，用於判斷是否要啟用 Popover
  const chartData = [...dates]
    .reverse()
    .map(d => {
      const dateKey = `${d.date}_${d.hosp}`;
      const entry = item.values[dateKey];
      if (!entry) return null;
      const numVal = parseFloat(entry.value);
      if (isNaN(numVal)) return null;
      const parts = d.date.split("-");
      const label = parts.length === 3 ? `${parts[0].slice(2)}/${parts[1]}/${parts[2]}` : d.date;
      return {
        label,
        value: numVal,
        unit: entry.unit || "",
        referenceMin: entry.referenceMin != null ? Number(entry.referenceMin) : null,
        referenceMax: entry.referenceMax != null ? Number(entry.referenceMax) : null,
      };
    })
    .filter(Boolean);

  if (chartData.length < 2) return children;

  const unit = chartData[0]?.unit || "";

  const openPopover = (event) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!hasOpened) setHasOpened(true); // 第一次開啟才觸發重計算與渲染
    setAnchorEl(event.currentTarget);
  };

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setAnchorEl(null), 150);
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <>
      <Box
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onClick={(e) => setAnchorEl(anchorEl ? null : e.currentTarget)}
        sx={{ cursor: "pointer", display: "inline-block" }}
      >
        {children}
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "center", horizontal: "right" }}
        transformOrigin={{ vertical: "center", horizontal: "left" }}
        disableRestoreFocus
        disableScrollLock
        sx={{ pointerEvents: "none" }}
        slotProps={{
          paper: {
            onMouseEnter: cancelClose,
            onMouseLeave: scheduleClose,
            sx: { pointerEvents: "auto", p: 1.5, ml: 2 },
            elevation: 4,
          },
        }}
      >
        <Typography variant="subtitle2" color="primary" sx={{ fontSize: "1.2rem", fontWeight: 600 }}>
          {item.displayName}
          {unit ? ` (${unit})` : ""}
        </Typography>

        {/* hasOpened 後才掛載 TrendChartContent，之後不再卸載，避免重複計算 */}
        {hasOpened && <TrendChartContent chartData={chartData} unit={unit} />}
      </Popover>
    </>
  );
};

export default LabItemTrendPopover;
