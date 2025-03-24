import React, { useState } from "react";
import { Typography, Box, Divider, IconButton, Tooltip, Paper, Grid, Snackbar, Checkbox } from "@mui/material";
import { styled } from '@mui/material/styles';
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

// 方法：使用相對定位和絕對定位為圖標添加文字
const IconWithTextOverlay = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const TextOverlay = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  fontSize: '9px',
  fontWeight: 'bold',
  color: theme.palette.primary.contrastText,
  backgroundColor: theme.palette.primary.main,
  padding: '1px 2px',
  borderRadius: '2px',
  lineHeight: 1,
  right: 0,
  bottom: 0
}));

// 複製全部按鈕
const CopyAllButton = ({ onClick, style, showLabel = true }) => {
  return (
    <Tooltip title="複製全部檢驗資料">
      <IconButton onClick={onClick} size="small" sx={style}>
        <IconWithTextOverlay>
          <ContentCopyIcon fontSize="small" color="primary" />
          {showLabel && (
            <TextOverlay sx={{ backgroundColor: 'primary.main' }}>All</TextOverlay>
          )}
        </IconWithTextOverlay>
      </IconButton>
    </Tooltip>
  );
};

// 複製選定項目按鈕
const CopySelectedButton = ({ onClick, style }) => {
  return (
    <Tooltip title="複製選擇的檢驗項目">
      <IconButton onClick={onClick} size="small" sx={style}>
        <IconWithTextOverlay>
          <ContentCopyIcon fontSize="small" color="secondary" />
          <TextOverlay sx={{ backgroundColor: 'secondary.main' }}>Sel</TextOverlay>
        </IconWithTextOverlay>
      </IconButton>
    </Tooltip>
  );
};

const LabData = ({ groupedLabs, settings, labSettings, generalDisplaySettings }) => {
  // console.log("LabData rendering with lab settings:", labSettings);
  
  // Ensure all required properties exist in labSettings with defaults
  const completeLabSettings = {
    displayFormat: 'byType',
    showUnit: false,
    showReference: false,
    enableAbbrev: true, 
    highlightAbnormal: true,
    copyFormat: 'horizontal',
    enableCustomCopy: false,
    customCopyItems: [],
    ...labSettings
  };
  
  // 添加 snackbar 狀態
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  
  // 添加檢驗項目選擇狀態
  // 使用 Map 來追蹤每個組別中選中的項目 { groupIndex: { labId: boolean } }
  const [selectedLabItems, setSelectedLabItems] = useState({});

  // 初始化選擇狀態 (基於 customCopyItems)
  // 當 enableCustomCopy 為 true 時，預先選中 customCopyItems 中的項目
  React.useEffect(() => {
    if (completeLabSettings.enableCustomCopy && groupedLabs.length > 0) {
      const initialSelections = {};
      
      groupedLabs.forEach((group, groupIndex) => {
        initialSelections[groupIndex] = {};
        
        group.labs.forEach((lab, labIndex) => {
          const labId = `${groupIndex}-${labIndex}`;
          let isPreselected = false;
          
          // 檢查此檢驗項目是否在 customCopyItems 中並且啟用
          if (completeLabSettings.customCopyItems && Array.isArray(completeLabSettings.customCopyItems)) {
            const enabledOrderCodes = completeLabSettings.customCopyItems
              .filter(item => item.enabled)
              .map(item => item.orderCode);
            
            // 特殊處理 08011C (WBC, Hb, Platelet)
            if (lab.orderCode === '08011C') {
              if (enabledOrderCodes.includes('08011C-WBC') && 
                  (lab.itemName?.toLowerCase().includes('wbc') || 
                   lab.itemName?.toLowerCase().includes('白血球'))) {
                isPreselected = true;
              }
              if (enabledOrderCodes.includes('08011C-Hb') && 
                  (lab.itemName?.toLowerCase().includes('hb') || 
                   lab.itemName?.toLowerCase().includes('hgb') || 
                   lab.itemName?.toLowerCase().includes('血色素') || 
                   lab.itemName?.toLowerCase().includes('血紅素'))) {
                isPreselected = true;
              }
              if (enabledOrderCodes.includes('08011C-Platelet') && 
                  (lab.itemName?.toLowerCase().includes('plt') || 
                   lab.itemName?.toLowerCase().includes('platelet') || 
                   lab.itemName?.toLowerCase().includes('血小板'))) {
                isPreselected = true;
              }
            }
            // 特殊處理 09015C (Cr 和 GFR)
            else if (lab.orderCode === '09015C') {
              if (enabledOrderCodes.includes('09015C')) {
                isPreselected = true;
              }
            }
            // 特殊處理 09040C (UPCR)
            else if (lab.orderCode === '09040C') {
              if (enabledOrderCodes.includes('09040C') && 
                  (lab.abbrName === 'UPCR' || 
                  (lab.itemName && (lab.itemName.includes('UPCR') || 
                                    lab.itemName.includes('蛋白/肌酸酐比值') ||
                                    lab.itemName.includes('protein/Creatinine'))))) {
                isPreselected = true;
              }
            }
            // 特殊處理 12111C (UACR)
            else if (lab.orderCode === '12111C') {
              if (enabledOrderCodes.includes('12111C') && 
                  (lab.abbrName === 'UACR' || 
                  (lab.itemName && (lab.itemName.toLowerCase().includes('u-acr') || 
                                    lab.itemName.toLowerCase().includes('albumin/creatinine') ||
                                    lab.itemName.toLowerCase().includes('/cre'))))) {
                isPreselected = true;
              }
            }
            // 標準處理其他項目
            else if (enabledOrderCodes.includes(lab.orderCode)) {
              isPreselected = true;
            }
          }
          
          initialSelections[groupIndex][labId] = isPreselected;
        });
      });
      
      setSelectedLabItems(initialSelections);
    }
  }, [completeLabSettings.enableCustomCopy, completeLabSettings.customCopyItems, groupedLabs]);

  // 切換檢驗項目選擇狀態
  const handleToggleLabItem = (groupIndex, labIndex) => {
    const labId = `${groupIndex}-${labIndex}`;
    
    setSelectedLabItems(prev => {
      const updatedSelections = {...prev};
      
      if (!updatedSelections[groupIndex]) {
        updatedSelections[groupIndex] = {};
      }
      
      updatedSelections[groupIndex][labId] = !updatedSelections[groupIndex][labId];
      
      return updatedSelections;
    });
  };

  // 檢查是否有選擇的檢驗項目
  const hasSelectedItems = (groupIndex) => {
    if (!selectedLabItems[groupIndex]) return false;
    
    return Object.values(selectedLabItems[groupIndex]).some(selected => selected);
  };

  // 關閉 snackbar 的函數
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // 複製所有檢驗數據的函數
  const handleCopyAllLabData = (group) => {
    let formattedText = `${group.date} - ${group.hosp}\n`;

    // Changed default behavior to horizontal format
    if (completeLabSettings.copyFormat === "vertical") {
      // Vertical format: each lab item on a new line
      group.labs.forEach((lab) => {
        // Prefer abbrName over itemName if available
        const displayName = lab.abbrName || lab.itemName || lab.orderName;
        let labLine = `${displayName}: ${lab.value}`;
        if (completeLabSettings.showUnit && lab.unit) {
          labLine += ` ${lab.unit}`;
        }
        if (completeLabSettings.showReference) {
          if (lab.referenceMin !== null) {
            labLine += ` (${lab.referenceMin}${lab.referenceMax !== null ? `-${lab.referenceMax}` : ''})`;
          } else if (lab.consultValue) {
            labLine += ` (${lab.consultValue.min}-${lab.consultValue.max})`;
          }
        }
        formattedText += `${labLine}\n`;
      });
    } else {
      // Horizontal format: lab items on the same line, separated by spaces (changed from |)
      let labItems = group.labs.map((lab) => {
        // Prefer abbrName over itemName if available
        const displayName = lab.abbrName || lab.itemName || lab.orderName;
        let labText = `${displayName}: ${lab.value}`;
        if (completeLabSettings.showUnit && lab.unit) {
          labText += ` ${lab.unit}`;
        }
        if (completeLabSettings.showReference) {
          if (lab.referenceMin !== null) {
            labText += ` (${lab.referenceMin}${lab.referenceMax !== null ? `-${lab.referenceMax}` : ''})`;
          } else if (lab.consultValue) {
            labText += ` (${lab.consultValue.min}-${lab.consultValue.max})`;
          }
        }
        return labText;
      });
      formattedText += labItems.join(" ");
    }
    
    navigator.clipboard
      .writeText(formattedText)
      .then(() => {
        setSnackbarMessage("所有檢驗資料已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy lab data: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  // 複製使用者選擇的檢驗數據的函數
  const handleCopyUserSelectedLabData = (group, groupIndex) => {
    if (!selectedLabItems[groupIndex]) {
      setSnackbarMessage("未選擇任何項目進行複製");
      setSnackbarOpen(true);
      return;
    }

    // 篩選出被使用者選中的檢驗項目
    const filteredLabs = group.labs.filter((lab, labIndex) => {
      const labId = `${groupIndex}-${labIndex}`;
      return selectedLabItems[groupIndex][labId];
    });

    if (filteredLabs.length === 0) {
      setSnackbarMessage("未選擇任何項目進行複製");
      setSnackbarOpen(true);
      return;
    }

    // 生成複製文本
    let formattedText = `${group.date} - ${group.hosp}\n`;

    // 根據複製格式處理
    if (completeLabSettings.copyFormat === "vertical") {
      // 直式格式
      filteredLabs.forEach((lab) => {
        // Prefer abbrName over displayName, itemName, and orderName
        const displayName = lab.displayName || lab.abbrName || lab.itemName || lab.orderName;
        let labLine = `${displayName}: ${lab.value}`;
        if (completeLabSettings.showUnit && lab.unit) {
          labLine += ` ${lab.unit}`;
        }
        if (completeLabSettings.showReference) {
          if (lab.referenceMin !== null) {
            labLine += ` (${lab.referenceMin}${lab.referenceMax !== null ? `-${lab.referenceMax}` : ''})`;
          } else if (lab.consultValue) {
            labLine += ` (${lab.consultValue.min}-${lab.consultValue.max})`;
          }
        }
        formattedText += `${labLine}\n`;
      });
    } else {
      // 橫式格式
      let labItems = filteredLabs.map((lab) => {
        // Prefer abbrName over displayName, itemName, and orderName
        const displayName = lab.displayName || lab.abbrName || lab.itemName || lab.orderName;
        let labText = `${displayName}: ${lab.value}`;
        if (completeLabSettings.showUnit && lab.unit) {
          labText += ` ${lab.unit}`;
        }
        if (completeLabSettings.showReference) {
          if (lab.referenceMin !== null) {
            labText += ` (${lab.referenceMin}${lab.referenceMax !== null ? `-${lab.referenceMax}` : ''})`;
          } else if (lab.consultValue) {
            labText += ` (${lab.consultValue.min}-${lab.consultValue.max})`;
          }
        }
        return labText;
      });
      formattedText += labItems.join(" ");
    }
    
    navigator.clipboard
      .writeText(formattedText)
      .then(() => {
        setSnackbarMessage("已選擇的檢驗項目已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy selected lab data: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  // 確定欄數設置 (可以根據需要調整)
  const getColumnCount = () => {
    switch(completeLabSettings.displayFormat) {
      case "twoColumn": return 2;
      case "threeColumn": return 3;
      case "fourColumn": return 4;
      case "byType": return 0; // 特殊情況，按類型分群
      default: return 1; // 'vertical' 或其他情況
    }
  };

  const getStatusColor = (lab) => {
    if (!lab || !completeLabSettings?.highlightAbnormal) return "inherit";
    
    if (lab.valueStatus === "high") return "#c62828"; // 紅色
    if (lab.valueStatus === "low") return "#006400";  // 深綠色 (取代 #1b5e20)
    return "inherit"; // 正常值
  };

  // 生成測試項目顯示
  const renderLabItem = (lab, groupIndex, labIndex) => {
    const labId = `${groupIndex}-${labIndex}`;
    const isSelected = selectedLabItems[groupIndex]?.[labId] || false;
    
    // console.log('Rendering lab item:', lab.itemName, {
    //   formattedReference: lab.formattedReference,
    //   referenceMin: lab.referenceMin,
    //   referenceMax: lab.referenceMax,
    //   consultValue: lab.consultValue,
    //   _rawConsultValue: lab._rawConsultValue
    // });
    
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 0.5 
      }}>
        {completeLabSettings.enableCustomCopy && 
         (completeLabSettings.displayFormat !== 'vertical' && 
          completeLabSettings.displayFormat !== 'horizontal') && (
          <Checkbox 
            checked={isSelected}
            onChange={() => handleToggleLabItem(groupIndex, labIndex)}
            size="small"
            sx={{ 
              p: 0.5, 
              mr: 0.5,
              color: 'rgba(0, 0, 0, 0.25)',
              '&.Mui-checked': {
                color: '#9c64a6', // 淡紫色 (比 secondary.main 更淡)
              }
            }}
          />
        )}
        <TypographySizeWrapper
          variant="body2"
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          style={{
            color: getStatusColor(lab),
            display: "inline-block",
            marginBottom: 0
          }}
        >
          {completeLabSettings.enableAbbrev ? (lab.abbrName || lab.itemName) : lab.itemName}{" "}
          <span style={{ fontWeight: 'medium' }}>
            {lab.value}
          </span>
          {completeLabSettings.showUnit && lab.unit && (
            <span style={{ color: "gray" }}>{` ${lab.unit}`}</span>
          )}
          {completeLabSettings.showReference &&
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
        </TypographySizeWrapper>
      </Box>
    );
  };

  // 生成多欄布局
  const renderMultiColumn = (labs, columnCount, groupIndex) => {
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
                  p: 1.5, 
                  mb: 1, 
                  backgroundColor: 'rgba(0, 0, 0, 0.03)', 
                  borderRadius: 1
                }}
              >
                {columnLabs.map((lab, labIndex) => (
                  <Box key={labIndex} sx={{ mb: 0.5 }}>
                    {renderLabItem(lab, groupIndex, startIndex + labIndex)}
                  </Box>
                ))}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  // 按類型分組並分欄顯示
  const renderByType = (labs, groupIndex) => {
    // 先按類型分組
    const labsByType = {};
    
    // 去除重複項目的邏輯 - 使用 Map 按照 itemName+value 來追蹤重複項
    const processedLabsByType = {};
    
    // 用於追蹤全局索引
    let globalLabIndex = 0;
    
    labs.forEach(lab => {
      const type = lab.type || '其他檢驗';
      
      if (!labsByType[type]) {
        labsByType[type] = [];
        processedLabsByType[type] = new Map();
      }
      
      // 創建唯一標識 - 使用項目名稱和數值組合
      const uniqueKey = `${completeLabSettings.enableAbbrev ? (lab.abbrName || lab.itemName) : lab.itemName}_${lab.value}`;
      
      // 如果這個組合還沒出現過，添加到結果中
      if (!processedLabsByType[type].has(uniqueKey)) {
        labsByType[type].push({...lab, globalIndex: globalLabIndex++});
        processedLabsByType[type].set(uniqueKey, true);
      }
    });
    
    // 檢查是否只有兩種類型的檢驗，並且需要優化空間利用
    const groupKeys = Object.keys(labsByType);
    
    // 四個或以上的類型時，優化為三欄佈局: 兩個最大的類型各佔一欄，其餘合併為一欄
    if (groupKeys.length >= 4) {
      // 對類型按項目數量排序
      const sortedGroups = [...groupKeys].sort((a, b) => labsByType[b].length - labsByType[a].length);
      
      // 取出項目數最多的兩個類型
      const largestGroup = sortedGroups[0];
      const secondLargestGroup = sortedGroups[1];
      
      // 其餘類型
      const remainingGroups = sortedGroups.slice(2);
      
      return (
        <Grid container spacing={2}>
          {/* 最大類型組 */}
          <Grid item xs={12} sm={4} key="largest">
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
                {largestGroup}
              </TypographySizeWrapper>
              {labsByType[largestGroup].map((lab, labIndex) => (
                <Box key={labIndex} sx={{ mb: 0.5 }}>
                  {renderLabItem(lab, groupIndex, lab.globalIndex || labIndex)}
                </Box>
              ))}
            </Paper>
          </Grid>
          
          {/* 第二大類型組 */}
          <Grid item xs={12} sm={4} key="second-largest">
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
                {secondLargestGroup}
              </TypographySizeWrapper>
              {labsByType[secondLargestGroup].map((lab, labIndex) => (
                <Box key={labIndex} sx={{ mb: 0.5 }}>
                  {renderLabItem(lab, groupIndex, lab.globalIndex || labIndex)}
                </Box>
              ))}
            </Paper>
          </Grid>
          
          {/* 其餘類型組合併 */}
          <Grid item xs={12} sm={4} key="remaining">
            <Box>
              {remainingGroups.map((type, typeIndex) => (
                <Paper 
                  key={typeIndex}
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
                  {labsByType[type].map((lab, labIndex) => (
                    <Box key={labIndex} sx={{ mb: 0.5 }}>
                      {renderLabItem(lab, groupIndex, lab.globalIndex || labIndex)}
                    </Box>
                  ))}
                </Paper>
              ))}
            </Box>
          </Grid>
        </Grid>
      );
    }
    else if (groupKeys.length === 2) {
      const group1 = groupKeys[0];
      const group2 = groupKeys[1];
      const group1Count = labsByType[group1].length;
      const group2Count = labsByType[group2].length;
      
      // 確定哪個組更大，哪個更小
      let smallerGroup, largerGroup, smallerCount, largerCount;
      if (group1Count <= group2Count) {
        smallerGroup = group1;
        largerGroup = group2;
        smallerCount = group1Count;
        largerCount = group2Count;
      } else {
        smallerGroup = group2;
        largerGroup = group1;
        smallerCount = group2Count;
        largerCount = group1Count;
      }
      
      // 創建優化的佈局組件
      if (largerCount > 2 * smallerCount) {
        // 情況1: 大組比小組的項目數多於兩倍 - 將大組平均分成兩欄
        const halfLargerCount = Math.ceil(largerCount / 2);
        const firstHalf = labsByType[largerGroup].slice(0, halfLargerCount);
        const secondHalf = labsByType[largerGroup].slice(halfLargerCount);
        
        return (
          <Grid container spacing={2}>
            {/* 小組區域 */}
            <Grid item xs={12} sm={4} key="smaller">
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
                  {smallerGroup}
                </TypographySizeWrapper>
                {labsByType[smallerGroup].map((lab, labIndex) => (
                  <Box key={labIndex} sx={{ mb: 0.5 }}>
                    {renderLabItem(lab, groupIndex, lab.globalIndex || labIndex)}
                  </Box>
                ))}
              </Paper>
            </Grid>
            
            {/* 大組第一欄 */}
            <Grid item xs={12} sm={4} key="larger-1">
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
                  {largerGroup} (一)
                </TypographySizeWrapper>
                {firstHalf.map((lab, labIndex) => (
                  <Box key={labIndex} sx={{ mb: 0.5 }}>
                    {renderLabItem(lab, groupIndex, lab.globalIndex || labIndex)}
                  </Box>
                ))}
              </Paper>
            </Grid>
            
            {/* 大組第二欄 */}
            <Grid item xs={12} sm={4} key="larger-2">
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
                  {largerGroup} (二)
                </TypographySizeWrapper>
                {secondHalf.map((lab, labIndex) => (
                  <Box key={labIndex} sx={{ mb: 0.5 }}>
                    {renderLabItem(lab, groupIndex, lab.globalIndex || labIndex)}
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        );
      } else if (largerCount < 2 * smallerCount) {
        // 情況2: 大組比小組的項目數少於兩倍 - 大組第一欄的項目數等於小組
        const firstPart = labsByType[largerGroup].slice(0, smallerCount);
        const secondPart = labsByType[largerGroup].slice(smallerCount);
        
        return (
          <Grid container spacing={2}>
            {/* 小組區域 */}
            <Grid item xs={12} sm={4} key="smaller">
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
                  {smallerGroup}
                </TypographySizeWrapper>
                {labsByType[smallerGroup].map((lab, labIndex) => (
                  <Box key={labIndex} sx={{ mb: 0.5 }}>
                    {renderLabItem(lab, groupIndex, lab.globalIndex || labIndex)}
                  </Box>
                ))}
              </Paper>
            </Grid>
            
            {/* 大組第一欄 */}
            <Grid item xs={12} sm={4} key="larger-1">
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
                  {largerGroup} (一)
                </TypographySizeWrapper>
                {firstPart.map((lab, labIndex) => (
                  <Box key={labIndex} sx={{ mb: 0.5 }}>
                    {renderLabItem(lab, groupIndex, lab.globalIndex || labIndex)}
                  </Box>
                ))}
              </Paper>
            </Grid>
            
            {/* 大組第二欄 */}
            <Grid item xs={12} sm={4} key="larger-2">
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
                  {largerGroup} (二)
                </TypographySizeWrapper>
                {secondPart.map((lab, labIndex) => (
                  <Box key={labIndex} sx={{ mb: 0.5 }}>
                    {renderLabItem(lab, groupIndex, lab.globalIndex || labIndex)}
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        );
      }
    }
    
    // 超過兩種類型或其他情況 - 使用預設的顯示方式
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
                  {renderLabItem(lab, groupIndex, lab.globalIndex || labIndex)}
                </Box>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  // 複製按鈕樣式
  const copyButtonStyle = { ml: 1 };
  
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
              
                {/* 複製按鈕 - 根據設定決定顯示一個還是兩個 */}
                {completeLabSettings.enableCustomCopy ? (
                  <>
                    <CopyAllButton onClick={() => handleCopyAllLabData(group)} style={copyButtonStyle} showLabel={true} />
                    {/* 當選擇了項目時顯示 Sel 按鈕 */}
                    {hasSelectedItems(index) && (
                      <CopySelectedButton onClick={() => handleCopyUserSelectedLabData(group, index)} style={copyButtonStyle} />
                    )}
                  </>
                ) : (
                  <CopyAllButton onClick={() => handleCopyAllLabData(group)} style={copyButtonStyle} showLabel={false} />
                )}
              </TypographySizeWrapper>
            </Box>

            {/* 根據設置選擇顯示格式 */}
            {completeLabSettings.displayFormat === "byType" ? (
              // 按類型分組顯示
              renderByType(group.labs, index)
            ) : completeLabSettings.displayFormat === "horizontal" ? (
              // 橫式布局 - 所有檢驗連續顯示在同一行
              <Box sx={{ ml: 2, mb: 1 }}>
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
                      {group.labs.map((lab, labIndex) => (
                        <span key={labIndex} style={{ marginRight: '12px' }}>
                          {completeLabSettings.enableAbbrev
                            ? lab.abbrName || lab.itemName
                            : lab.itemName}{" "}
                          <span style={{ fontWeight: 'medium', color: getStatusColor(lab) }}>
                            {lab.value}
                          </span>
                          {completeLabSettings.showUnit && lab.unit && (
                            <span style={{ color: "gray" }}>{` ${lab.unit}`}</span>
                          )}
                          {completeLabSettings.showReference &&
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
                      ))}
                    </div>
                  </TypographySizeWrapper>
                </Paper>
              </Box>
            ) : (
              // 多欄或垂直布局
              <Box sx={{ ml: 2, mb: 1 }}>
                {getColumnCount() > 1
                  ? renderMultiColumn(group.labs, getColumnCount(), index)
                  : (
                    // 垂直布局也使用灰底
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 1.5, 
                        mb: 1, 
                        backgroundColor: 'rgba(0, 0, 0, 0.03)', 
                        borderRadius: 1
                      }}
                    >
                      {group.labs.map((lab, labIndex) => (
                        <Box key={labIndex} sx={{ mb: 0.5 }}>
                          {renderLabItem(lab, index, labIndex)}
                        </Box>
                      ))}
                    </Paper>
                  )
                }
              </Box>
            )}

            {index < groupedLabs.length - 1 && <Divider sx={{ my: 1.5 }} />}
          </Box>
        ))
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};

export default LabData;