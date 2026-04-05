import { useState, useRef } from "react";
import { Box, Popover, Typography } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { useXScale, useYScale, useDrawingArea } from "@mui/x-charts/hooks";

// 手動渲染 X 軸日期標籤（繞過內建 tick label，避免被 clipPath 遮住）
const XAxisLabels = ({ chartData }) => {
  const xScale = useXScale();
  const { top, height } = useDrawingArea();
  const y = top + height + 22;

  return (
    <>
      {chartData.map((d, i) => {
        const x = xScale(d.label);
        if (x == null) return null;
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize={13}
            fill="#555"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {d.label}
          </text>
        );
      })}
    </>
  );
};

// 定義在元件外，避免每次 render 產生新的 component type reference
// 在 LineChart 的 SVG context 內渲染，透過 chart hooks 取得座標
const DataLabels = ({ chartData }) => {
  const xScale = useXScale();
  const yScale = useYScale();

  return (
    <>
      {chartData.map((d, i) => {
        const x = xScale(d.label);
        const y = yScale(d.value);
        if (x == null || y == null) return null;
        // 第一個點：往右上偏移，避免與Y軸數值重疊
        const offsetX = i === 0 ? 10 : 0;
        const anchor = i === 0 ? "start" : "middle";
        return (
          <text
            key={i}
            x={x + offsetX}
            y={y - 10}
            textAnchor={anchor}
            fontSize={16}
            fill="#1976d2"
            fontWeight="bold"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {d.value}
          </text>
        );
      })}
    </>
  );
};

const LabItemTrendPopover = ({ item, dates, children }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const closeTimer = useRef(null);

  // 將 dates（新→舊）反轉為舊→新，只保留有數值的日期
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

  const refMins = chartData.map(d => d.referenceMin);
  const refMaxs = chartData.map(d => d.referenceMax);
  const hasRefMin = refMins.some(v => v != null);
  const hasRefMax = refMaxs.some(v => v != null);

  // Y 軸範圍：取資料值與上下限的聯集，加 15% padding，不低於 0
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

  const openPopover = (event) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
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

        <LineChart
          xAxis={[{
            data: chartData.map(d => d.label),
            scaleType: "point",
            tickLabelStyle: { display: "none" },
          }]}
          yAxis={[{ min: yMin, max: yMax, tickLabelStyle: { fontSize: 15 } }]}
          series={series}
          height={420}
          width={660}
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
          <DataLabels chartData={chartData} />
          <XAxisLabels chartData={chartData} />
        </LineChart>
      </Popover>
    </>
  );
};

export default LabItemTrendPopover;
