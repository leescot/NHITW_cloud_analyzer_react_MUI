import React, { useState } from "react";
import { Typography, Box, Divider, IconButton, Tooltip, Paper, Grid, Snackbar } from "@mui/material";
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
  console.log("LabData rendering with lab settings:", labSettings);
  
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

  // 關閉 snackbar 的函數
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // 檢查是否有匹配的自定義項目的輔助函數
  const hasMatchingCustomItems = (group) => {
    if (!completeLabSettings.customCopyItems || !Array.isArray(completeLabSettings.customCopyItems)) {
      return false;
    }

    // 取得所有啟用的檢驗項目代碼
    const enabledOrderCodes = completeLabSettings.customCopyItems
      .filter(item => item.enabled)
      .map(item => item.orderCode);
    
    if (enabledOrderCodes.length === 0) {
      return false;
    }

    // 檢查是否有任何一個檢驗項目符合條件
    return group.labs.some(lab => {
      // 特殊處理 08011C (WBC, Hb, Platelet)
      if (lab.orderCode === '08011C') {
        if (enabledOrderCodes.includes('08011C-WBC') && 
            (lab.itemName?.toLowerCase().includes('wbc') || 
             lab.itemName?.toLowerCase().includes('白血球'))) {
          return true;
        }
        if (enabledOrderCodes.includes('08011C-Hb') && 
            (lab.itemName?.toLowerCase().includes('hb') || 
             lab.itemName?.toLowerCase().includes('hgb') || 
             lab.itemName?.toLowerCase().includes('血色素') || 
             lab.itemName?.toLowerCase().includes('血紅素'))) {
          return true;
        }
        if (enabledOrderCodes.includes('08011C-Platelet') && 
            (lab.itemName?.toLowerCase().includes('plt') || 
             lab.itemName?.toLowerCase().includes('platelet') || 
             lab.itemName?.toLowerCase().includes('血小板'))) {
          return true;
        }
      }
      // 特殊處理 09015C (Cr 和 GFR)
      else if (lab.orderCode === '09015C') {
        if (enabledOrderCodes.includes('09015C')) {
          return true;
        }
      }
      // 特殊處理 09040C (UPCR)
      else if (lab.orderCode === '09040C') {
        if (enabledOrderCodes.includes('09040C') && 
            (lab.abbrName === 'UPCR' || 
             (lab.itemName && (lab.itemName.includes('UPCR') || 
                               lab.itemName.includes('蛋白/肌酸酐比值') ||
                               lab.itemName.includes('protein/Creatinine'))))) {
          return true;
        }
      }
      // 特殊處理 12111C (UACR)
      else if (lab.orderCode === '12111C') {
        if (enabledOrderCodes.includes('12111C') && 
            (lab.abbrName === 'UACR' || 
             (lab.itemName && (lab.itemName.toLowerCase().includes('u-acr') || 
                              lab.itemName.toLowerCase().includes('albumin/creatinine') ||
                              lab.itemName.toLowerCase().includes('/cre'))))) {
          return true;
        }
      }
      // 標準處理其他項目
      else if (enabledOrderCodes.includes(lab.orderCode)) {
        return true;
      }
      
      return false;
    });
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

  // 複製自訂項目的函數
  const handleCopySelectedLabData = (group) => {
    if (!completeLabSettings.customCopyItems || !Array.isArray(completeLabSettings.customCopyItems)) {
      setSnackbarMessage("未找到自訂複製項目清單");
      setSnackbarOpen(true);
      return;
    }

    // 取得所有啟用的檢驗項目代碼
    const enabledOrderCodes = completeLabSettings.customCopyItems
      .filter(item => item.enabled)
      .map(item => item.orderCode);
    
    if (enabledOrderCodes.length === 0) {
      setSnackbarMessage("未選擇任何要複製的檢驗項目");
      setSnackbarOpen(true);
      return;
    }

    // 篩選符合條件的檢驗項目
    const filteredLabs = [];
    
    group.labs.forEach(lab => {
      // 特殊處理 08011C (WBC, Hb, Platelet)
      if (lab.orderCode === '08011C') {
        // 檢查是否有 WBC、Hb、或 Platelet 相關的項目
        if (enabledOrderCodes.includes('08011C-WBC') && 
            (lab.itemName?.toLowerCase().includes('wbc') || 
             lab.itemName?.toLowerCase().includes('白血球'))) {
          filteredLabs.push({...lab, orderCode: '08011C-WBC'});
        }
        if (enabledOrderCodes.includes('08011C-Hb') && 
            (lab.itemName?.toLowerCase().includes('hb') || 
             lab.itemName?.toLowerCase().includes('hgb') || 
             lab.itemName?.toLowerCase().includes('血色素') || 
             lab.itemName?.toLowerCase().includes('血紅素'))) {
          filteredLabs.push({...lab, orderCode: '08011C-Hb'});
        }
        if (enabledOrderCodes.includes('08011C-Platelet') && 
            (lab.itemName?.toLowerCase().includes('plt') || 
             lab.itemName?.toLowerCase().includes('platelet') || 
             lab.itemName?.toLowerCase().includes('血小板'))) {
          filteredLabs.push({...lab, orderCode: '08011C-Platelet'});
        }
      }
      // 特殊處理 09015C (Cr 和 GFR)
      else if (lab.orderCode === '09015C') {
        if (enabledOrderCodes.includes('09015C')) {
          if (lab.abbrName === 'GFR' || 
              (lab.itemName && (lab.itemName.includes('GFR') || 
                                lab.itemName.includes('腎絲球過濾率') || 
                                lab.itemName.includes('Ccr')))) {
            filteredLabs.push({...lab, displayName: 'GFR'});
          } else {
            filteredLabs.push({...lab, displayName: 'Cr'});
          }
        }
      }
      // 特殊處理 09040C (UPCR)
      else if (lab.orderCode === '09040C') {
        if (enabledOrderCodes.includes('09040C') && 
            (lab.abbrName === 'UPCR' || 
             (lab.itemName && (lab.itemName.includes('UPCR') || 
                               lab.itemName.includes('蛋白/肌酸酐比值') ||
                               lab.itemName.includes('protein/Creatinine'))))) {
          filteredLabs.push({...lab, displayName: 'UPCR'});
        }
      }
      // 特殊處理 12111C (UACR)
      else if (lab.orderCode === '12111C') {
        if (enabledOrderCodes.includes('12111C') && 
            (lab.abbrName === 'UACR' || 
             (lab.itemName && (lab.itemName.toLowerCase().includes('u-acr') || 
                              lab.itemName.toLowerCase().includes('albumin/creatinine') ||
                              lab.itemName.toLowerCase().includes('/cre'))))) {
          filteredLabs.push({...lab, displayName: 'UACR'});
        }
      }
      // 標準處理其他項目
      else if (enabledOrderCodes.includes(lab.orderCode)) {
        filteredLabs.push(lab);
      }
    });

    if (filteredLabs.length === 0) {
      setSnackbarMessage("在當前檢驗中未找到指定的項目");
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
        setSnackbarMessage("指定檢驗項目已複製到剪貼簿");
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
      case "byType": return 0; // 特殊情況，按類型分群
      default: return 1; // 'vertical' 或其他情況
    }
  };

  const getStatusColor = (lab) => {
    if (!lab || !completeLabSettings?.highlightAbnormal) return "inherit";
    
    if (lab.valueStatus === "high") return "#c62828"; // 紅色
    if (lab.valueStatus === "low") return "#1b5e20";  // 綠色 (之前是藍色)
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
      {completeLabSettings.enableAbbrev ? (lab.abbrName || lab.itemName) : lab.itemName}{" "}
      <span style={{ fontWeight: 'medium' }}>
        {lab.value}
      </span>
      {completeLabSettings.showUnit && lab.unit && (
        <span style={{ color: "gray" }}>{` ${lab.unit}`}</span>
      )}
      {completeLabSettings.showReference &&
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
      const uniqueKey = `${completeLabSettings.enableAbbrev ? (lab.abbrName || lab.itemName) : lab.itemName}_${lab.value}`;
      
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
                    {hasMatchingCustomItems(group) && (
                      <CopySelectedButton onClick={() => handleCopySelectedLabData(group)} style={copyButtonStyle} />
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
              renderByType(group.labs)
            ) : completeLabSettings.displayFormat === "horizontal" ? (
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