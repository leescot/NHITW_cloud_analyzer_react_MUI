import React from "react";
import { Box, Grid, Paper } from "@mui/material";
import TypographySizeWrapper from "../../utils/TypographySizeWrapper";
import LabItemDisplay from "./LabItemDisplay";

// 垂直布局元件 - 單欄顯示
export const VerticalLayout = ({
  labs,
  groupIndex,
  selectedLabItems,
  handleToggleLabItem,
  generalDisplaySettings,
  labSettings
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        mb: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 1
      }}
    >
      {labs.map((lab, labIndex) => (
        <Box key={labIndex} sx={{ mb: 0.15 }}>
          <LabItemDisplay
            lab={lab}
            groupIndex={groupIndex}
            labIndex={labIndex}
            selectedLabItems={selectedLabItems}
            handleToggleLabItem={handleToggleLabItem}
            generalDisplaySettings={generalDisplaySettings}
            labSettings={labSettings}
          />
        </Box>
      ))}
    </Paper>
  );
};

// 橫式布局元件 - 所有檢驗連續顯示在同一行
export const HorizontalLayout = ({
  labs,
  groupIndex,
  generalDisplaySettings,
  labSettings
}) => {
  const { enableLabAbbrev, showUnit, showReference, highlightAbnormal } = labSettings;

  // 使用 Map 來映射狀態和顏色 - 提高可讀性和效率
  const statusColorMap = new Map([
    ["high", "#c62828"], // 紅色
    ["low", "#006400"],  // 深綠色
    ["default", "inherit"] // 正常值
  ]);

  // 這個布局不會顯示複選框，只處理橫式排列
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 1
      }}
    >
      <TypographySizeWrapper
        variant="body2"
        textSizeType="content"
        generalDisplaySettings={generalDisplaySettings}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {labs.map((lab, labIndex) => {
            // 使用 Map 取代 if-else 結構的 getStatusColor 函式
            const getStatusColor = () => {
              if (!lab || !highlightAbnormal) return "inherit";
              return statusColorMap.get(lab.valueStatus) || statusColorMap.get("default");
            };

            return (
              <span key={labIndex} style={{ marginRight: '12px' }}>
                {enableLabAbbrev
                  ? lab.abbrName || lab.itemName
                  : lab.itemName}{" "}
                <span style={{ fontWeight: 'medium', color: getStatusColor() }}>
                  {lab.value}
                </span>
                {showUnit && lab.unit && (
                  <span style={{ color: "gray" }}>{` ${lab.unit}`}</span>
                )}
                {showReference &&
                  (lab.formattedReference ? (
                    <span style={{ color: "gray", fontSize: "0.8em" }}>
                      {" "}
                      ({lab.formattedReference})
                    </span>
                  ) : lab.referenceMin !== null ? (
                    <span style={{ color: "gray", fontSize: "0.8em" }}>
                      {" "}
                      ({lab.referenceMin}
                      {lab.referenceMax !== null ? `-${lab.referenceMax}` : ""})
                    </span>
                  ) : null)}
              </span>
            );
          })}
        </div>
      </TypographySizeWrapper>
    </Paper>
  );
};

// 多欄布局元件
export const MultiColumnLayout = ({
  labs,
  columnCount,
  groupIndex,
  selectedLabItems,
  handleToggleLabItem,
  generalDisplaySettings,
  labSettings
}) => {
  // 計算每欄要顯示的項目數
  const itemsPerColumn = Math.ceil(labs.length / columnCount);

  return (
    <Grid container spacing={2}>
      {Array.from({ length: columnCount }).map((_, colIndex) => {
        const startIndex = colIndex * itemsPerColumn;
        const endIndex = Math.min(startIndex + itemsPerColumn, labs.length);
        const columnLabs = labs.slice(startIndex, endIndex);

        return (
          <Grid item xs={12} sm={12 / columnCount} key={colIndex}>
            <Paper
              elevation={0}
              sx={{
                p: 1.25,
                mb: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                borderRadius: 1
              }}
            >
              {columnLabs.map((lab, labIndex) => (
                <Box key={labIndex} sx={{ mb: 0.15 }}>
                  <LabItemDisplay
                    lab={lab}
                    groupIndex={groupIndex}
                    labIndex={startIndex + labIndex}
                    selectedLabItems={selectedLabItems}
                    handleToggleLabItem={handleToggleLabItem}
                    generalDisplaySettings={generalDisplaySettings}
                    labSettings={labSettings}
                  />
                </Box>
              ))}
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
};