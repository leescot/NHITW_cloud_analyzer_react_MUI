import React from "react";
import { Typography, Box, Divider, IconButton, Tooltip, Paper, Grid } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const LabData = ({ groupedLabs, settings, labSettings, handleCopyLabData, generalDisplaySettings }) => {
  console.log("LabData rendering with lab settings:", labSettings);
  
  // 確定欄數設置 (可以根據需要調整)
  const getColumnCount = () => {
    switch(labSettings.displayFormat) {
      case "twoColumn": return 2;
      case "threeColumn": return 3;
      case "byType": return 0; // 特殊情況，按類型分群
      default: return 1; // 'vertical' 或其他情況
    }
  };

  const getStatusColor = (lab) => {
    if (!lab || !labSettings?.highlightAbnormal) return "inherit";
    
    if (lab.valueStatus === "high") return "#f44336"; // 紅色
    if (lab.valueStatus === "low") return "#3d8c40";  // 綠色 (之前是藍色)
    return "inherit"; // 正常值
  };

  // 生成測試項目顯示
  const renderLabItem = (lab) => (
    <TypographySizeWrapper
      variant="body2"
      textSizeType="content"
      generalDisplaySettings={generalDisplaySettings}
      style={{
        color: getStatusColor(lab),
        display: "inline-block",
        marginBottom: "4px"
      }}
    >
      {labSettings.enableAbbrev ? (lab.abbrName || lab.itemName) : lab.itemName}{" "}
      <span style={{ fontWeight: 'medium' }}>
        {lab.value}
      </span>
      {labSettings.showUnit && lab.unit && (
        <span style={{ color: "gray" }}>{` ${lab.unit}`}</span>
      )}
      {labSettings.showReference &&
        lab.referenceMin !== null && (
          <span style={{ color: "gray", fontSize: "0.8em" }}>
            {" "}
            ({lab.referenceMin}
            {lab.referenceMax !== null ? `-${lab.referenceMax}` : ""})
          </span>
        )}
    </TypographySizeWrapper>
  );

  // 生成多欄布局
  const renderMultiColumn = (labs, columnCount) => {
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
              <Box>
                {columnLabs.map((lab, labIndex) => (
                  <Box key={labIndex} sx={{ mb: 0.5 }}>
                    {renderLabItem(lab)}
                  </Box>
                ))}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  // 按類型分組並分欄顯示
  const renderByType = (labs) => {
    // 先按類型分組
    const labsByType = {};
    
    // 去除重複項目的邏輯 - 使用 Map 按照 itemName+value 來追蹤重複項
    const processedLabsByType = {};
    
    labs.forEach(lab => {
      const type = lab.type || '其他檢驗';
      
      if (!labsByType[type]) {
        labsByType[type] = [];
        processedLabsByType[type] = new Map();
      }
      
      // 創建唯一標識 - 使用項目名稱和數值組合
      const uniqueKey = `${labSettings.enableAbbrev ? (lab.abbrName || lab.itemName) : lab.itemName}_${lab.value}`;
      
      // 如果這個組合還沒出現過，添加到結果中
      if (!processedLabsByType[type].has(uniqueKey)) {
        labsByType[type].push(lab);
        processedLabsByType[type].set(uniqueKey, true);
      }
    });
    
    return (
      <Grid container spacing={2}>
        {Object.entries(labsByType).map(([type, typeLabs], typeIndex) => (
          <Grid item xs={12} sm={6} md={4} key={typeIndex}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 1.5, 
                mb: 1.5, 
                backgroundColor: 'rgba(0, 0, 0, 0.03)', 
                borderRadius: 1
              }}
            >
              <TypographySizeWrapper 
                variant="subtitle2" 
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
                sx={{ 
                  mb: 1, 
                  fontWeight: 'bold'
                }}
              >
                {type}
              </TypographySizeWrapper>
              {typeLabs.map((lab, labIndex) => (
                <Box key={labIndex} sx={{ mb: 0.5 }}>
                  {renderLabItem(lab)}
                </Box>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <>
      {groupedLabs.length === 0 ? (
        <TypographySizeWrapper 
          color="text.secondary" 
          variant="body2"
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
        >
          沒有找到檢驗資料
        </TypographySizeWrapper>
      ) : (
        groupedLabs.map((group, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <TypographySizeWrapper 
                variant="subtitle1" 
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
                color="primary" 
                sx={{ flexGrow: 1 }}
              >
                {group.date} - {group.hosp}
                {settings.showDiagnosis && group.icd_code && (
                  <TypographySizeWrapper
                    component="span"
                    textSizeType="note"
                    generalDisplaySettings={generalDisplaySettings}
                    sx={{
                      color: "text.secondary",
                      ml: 1,
                    }}
                  >
                    {group.icd_code} {group.icd_name}
                  </TypographySizeWrapper>
                )}
              
                <Tooltip title="複製檢驗資料">
                  <IconButton
                    size="small"
                    onClick={() => handleCopyLabData(group)}
                    sx={{ ml: 1 }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TypographySizeWrapper>
            </Box>

            {/* 根據設置選擇顯示格式 */}
            {labSettings.displayFormat === "byType" ? (
              // 按類型分組顯示
              renderByType(group.labs)
            ) : labSettings.displayFormat === "horizontal" ? (
              // 橫式布局 - 所有檢驗連續顯示在同一行
              <Box sx={{ ml: 2, mb: 1 }}>
                <TypographySizeWrapper 
                  variant="body2"
                  textSizeType="content"
                  generalDisplaySettings={generalDisplaySettings}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {group.labs.map((lab, labIndex) => (
                      <span key={labIndex} style={{ marginRight: '12px' }}>
                        {labSettings.enableAbbrev
                          ? lab.abbrName || lab.itemName
                          : lab.itemName}{" "}
                        <span style={{ fontWeight: 'medium', color: getStatusColor(lab) }}>
                          {lab.value}
                        </span>
                        {labSettings.showUnit && lab.unit && (
                          <span style={{ color: "gray" }}>{` ${lab.unit}`}</span>
                        )}
                        {labSettings.showReference &&
                          lab.referenceMin !== null && (
                            <span style={{ color: "gray", fontSize: "0.8em" }}>
                              {" "}
                              ({lab.referenceMin}
                              {lab.referenceMax !== null ? `-${lab.referenceMax}` : ""})
                            </span>
                          )}
                      </span>
                    ))}
                  </div>
                </TypographySizeWrapper>
              </Box>
            ) : (
              // 多欄或垂直布局
              <Box sx={{ ml: 2, mb: 1 }}>
                {getColumnCount() > 1
                  ? renderMultiColumn(group.labs, getColumnCount())
                  : (
                    // 原有的垂直布局
                    group.labs.map((lab, labIndex) => (
                      <Box key={labIndex} sx={{ mb: 0.5 }}>
                        {renderLabItem(lab)}
                      </Box>
                    ))
                  )
                }
              </Box>
            )}

            {index < groupedLabs.length - 1 && <Divider sx={{ my: 1.5 }} />}
          </Box>
        ))
      )}
    </>
  );
};

export default LabData;