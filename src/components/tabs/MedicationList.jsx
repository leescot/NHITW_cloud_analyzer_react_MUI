import React, { useState, useEffect } from "react";
import { Typography, Box, Divider, IconButton, Tooltip, Snackbar, RadioGroup, FormControlLabel, Radio, FormControl, Grid, Paper, TextField, InputAdornment } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import ImageIcon from "@mui/icons-material/Image";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";
import { medicationProcessor } from "../../utils/medicationProcessor";

const MedicationList = ({
  groupedMedications,
  settings,
  copyFormat,
  generalDisplaySettings,
}) => {
  // 添加 snackbar 狀態
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  
  // 添加訪問類型過濾狀態
  const [selectedVisitType, setSelectedVisitType] = useState("");
  const [availableVisitTypes, setAvailableVisitTypes] = useState([]);
  const [filteredMedications, setFilteredMedications] = useState(groupedMedications);
  
  // 分類藥物為長期和短期用藥
  const [longTermMeds, setLongTermMeds] = useState([]);
  const [shortTermMeds, setShortTermMeds] = useState([]);
  
  // 添加搜尋功能狀態
  const [searchText, setSearchText] = useState("");
  
  // 獲取可用的訪問類型並設置默認選項
  useEffect(() => {
    // 獲取所有不同的訪問類型
    const visitTypes = new Set();
    let hasOutpatient = false;
    let hasEmergency = false;
    let hasInpatient = false;
    
    groupedMedications.forEach(group => {
      if (group.visitType) {
        visitTypes.add(group.visitType);
        if (group.visitType === "門診") hasOutpatient = true;
        if (group.visitType === "急診") hasEmergency = true;
        if (group.visitType === "住診") hasInpatient = true;
      }
    });
    
    // 轉換為數組
    const typesArray = Array.from(visitTypes);
    setAvailableVisitTypes(typesArray);
    
    // 設置默認選擇
    if (typesArray.length > 1) {
      // 如果同時有門診和急診，默認選擇"門診+急診"
      if (hasOutpatient && hasEmergency) {
        setSelectedVisitType("門診+急診");
      } 
      // 否則如果有門診，默認選擇門診
      else if (hasOutpatient) {
        setSelectedVisitType("門診");
      }
      // 否則選擇第一個可用的類型
      else if (typesArray.length > 0) {
        setSelectedVisitType(typesArray[0]);
      }
    } else {
      // 如果只有一種訪問類型或沒有，設置為空字符串（顯示全部）
      setSelectedVisitType("");
    }
  }, [groupedMedications]);
  
  // 當選擇的訪問類型或搜尋文字變化時過濾藥物
  useEffect(() => {
    // 先用訪問類型過濾
    let visitTypeFiltered = [];
    
    if (!selectedVisitType || selectedVisitType === "顯示所有項目") {
      visitTypeFiltered = groupedMedications;
    } else if (selectedVisitType === "門診+急診") {
      visitTypeFiltered = groupedMedications.filter(
        group => group.visitType === "門診" || group.visitType === "急診" || group.visitType === "藥局"
      );
    } else if (selectedVisitType === "門診") {
      visitTypeFiltered = groupedMedications.filter(
        group => group.visitType === "門診" || group.visitType === "藥局"
      );
    } else {
      visitTypeFiltered = groupedMedications.filter(
        group => group.visitType === selectedVisitType
      );
    }
    
    // 如果有搜尋文字，再進一步過濾藥物
    if (searchText.trim() !== "") {
      const searchLower = searchText.toLowerCase();
      
      // 針對每個藥物組，只保留符合搜尋條件的藥物
      const searchFiltered = visitTypeFiltered.map(group => {
        // 深複製組資料，但不包含medications
        const newGroup = { ...group };
        
        // 過濾藥物，只保留符合搜尋條件的
        newGroup.medications = group.medications.filter(med => 
          (med.name && med.name.toLowerCase().includes(searchLower)) || 
          (med.ingredient && med.ingredient.toLowerCase().includes(searchLower))
        );
        
        return newGroup;
      }).filter(group => group.medications.length > 0); // 只保留有符合藥物的組
      
      setFilteredMedications(searchFiltered);
    } else {
      // 沒有搜尋文字，只用訪問類型過濾
      setFilteredMedications(visitTypeFiltered);
    }
  }, [selectedVisitType, groupedMedications, searchText]);
  
  // 當過濾後的藥物變化時，將其分為長期和短期用藥
  useEffect(() => {
    if (settings.separateShortTermMeds) {
      // 定義長期用藥的閾值（14天）
      const LONG_TERM_THRESHOLD = 14;
      
      // 長期用藥：至少有一種藥物 >= 14天
      const longTerm = filteredMedications.filter(group => 
        group.medications.some(med => parseInt(med.days, 10) >= LONG_TERM_THRESHOLD)
      );
      
      // 短期用藥：所有藥物 < 14天
      const shortTerm = filteredMedications.filter(group => 
        group.medications.every(med => parseInt(med.days, 10) < LONG_TERM_THRESHOLD)
      );
      
      setLongTermMeds(longTerm);
      setShortTermMeds(shortTerm);
    }
  }, [filteredMedications, settings.separateShortTermMeds]);
  
  // 處理訪問類型選擇變化
  const handleVisitTypeChange = (event) => {
    setSelectedVisitType(event.target.value);
  };
  
  // 處理搜尋文字變化
  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };

  // 關閉 snackbar 的函數
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // 複製藥物的函數 - 從 FloatingIcon 移過來
  const handleCopyMedications = (medications, group) => {
    if (settings.copyFormat === "none") {
      return;
    }

    const groupInfo = {
      date: group.date,
      hosp: group.hosp,
      visitType: group.visitType,
      icd_code: group.icd_code,
      icd_name: group.icd_name,
      showDiagnosis: settings.showDiagnosis,
    };

    const formattedText = medicationProcessor.formatMedicationList(
      medications,
      settings.copyFormat,
      groupInfo
    );
    navigator.clipboard
      .writeText(formattedText)
      .then(() => {
        setSnackbarMessage("藥物清單已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy medications: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  // 判斷藥物所屬顏色的函數
  const getMedicationColor = (medication) => {
    if (!settings.enableATC5Colors) return null;
    
    let atc5Code = medication.atc_code;
    
    // Handle cases where the ATC5 code might be in the ATC name
    if (!atc5Code && medication.atc_name) {
      const matches = medication.atc_name.match(/\(([A-Z0-9]+)\)/);
      if (matches && matches[1]) atc5Code = matches[1];
    }
    
    if (!atc5Code) return null;
    
    // 檢查是否有 atc5Groups 設定
    if (!settings.atc5Groups || Object.keys(settings.atc5Groups).length === 0) {
      return null;
    }
    
    // 檢查藥物的 ATC5 代碼是否屬於任何群組
    const group = Object.entries(settings.atc5Groups).find(([groupName, codes]) => {
      const match = codes.some(code => {
        if (code.length === 7) {
          return atc5Code === code; // Exact match for 7-character codes
        } else {
          return atc5Code.startsWith(code); // Prefix match for shorter codes
        }
      });
      return match;
    });
    
    if (!group) return null;
    
    const groupName = group[0];
    
    // 檢查群組是否被分配到顏色
    const colorGroups = settings.atc5ColorGroups || { red: [], orange: [], green: [] };
    
    if (colorGroups.red && colorGroups.red.includes(groupName)) {
      return { name: 'red', color: '#f44336' };
    } else if (colorGroups.orange && colorGroups.orange.includes(groupName)) {
      return { name: 'orange', color: '#ed6c02' };
    } else if (colorGroups.green && colorGroups.green.includes(groupName)) {
      return { name: 'green', color: '#2e7d32' };
    }
    
    return null;
  };

  // 判斷藥物是否應該以粗體顯示的函數
  const shouldBeBold = (medication) => {
    if (!settings.enableATC5Colors) return false;
    
    let atc5Code = medication.atc_code;
    
    if (!atc5Code) return false;
    
    if (!settings.atc5Groups || Object.keys(settings.atc5Groups).length === 0) {
      return false;
    }
    
    const group = Object.entries(settings.atc5Groups).find(([groupName, codes]) => {
      return codes.some(code => {
        if (code.length === 7) {
          return atc5Code === code; // Exact match for 7-character codes
        } else {
          return atc5Code.startsWith(code); // Prefix match for shorter codes
        }
      });
    });
    
    if (!group) return false;
    
    const groupName = group[0];
    
    // 檢查群組是否被分配到顏色
    const colorGroups = settings.atc5ColorGroups || { red: [], orange: [], green: [] };
    
    // 如果藥物屬於任何有顏色的群組（紅色、橘色或綠色），返回 true
    return (
      colorGroups.red.includes(groupName) || 
      colorGroups.orange.includes(groupName) ||
      colorGroups.green.includes(groupName)
    );
  };
  
  // 根據看診類型獲取顏色
  const getVisitTypeColor = (visitType) => {
    switch(visitType) {
      case "急診":
        return "#c62828"; // 較柔和的紅色
      case "住診":
        return "#388e3c"; // 較柔和的綠色
      case "門診":
      default:
        return "primary.main"; // 預設藍色
    }
  };

  // Add new function to handle drug image link click
  const handleDrugImageClick = (drugcode) => {
    if (!drugcode) {
      setSnackbarMessage("無法獲取藥品代碼");
      setSnackbarOpen(true);
      return;
    }
    
    // 打開藥品圖片頁面
    window.open(`chrome-extension://${chrome.runtime.id}/drug-images.html?code=${drugcode}`, '_blank', 'noopener,noreferrer');
    
    setSnackbarMessage("已開啟藥品圖片查看器");
    setSnackbarOpen(true);
  };

  return (
    <>
      {groupedMedications.length === 0 ? (
        <TypographySizeWrapper 
          variant="body2" 
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          color="text.secondary"
        >
          沒有找到用藥資料
        </TypographySizeWrapper>
      ) : (
        <>
          {/* 搜尋欄和訪問類型過濾選項的容器 */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 搜尋欄 */}
            <TextField
              size="small"
              placeholder="可輸入商品名或學名..."
              value={searchText}
              onChange={handleSearchChange}
              sx={{ mb: 1, mr: 2, flexGrow: 1, maxWidth: { xs: '100%', sm: '300px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            {/* 如果有多種訪問類型，顯示過濾選項 */}
            {availableVisitTypes.length > 1 && (
              <FormControl component="fieldset" sx={{ flexGrow: 2 }}>
                <RadioGroup
                  row
                  aria-label="visit-type"
                  name="visit-type"
                  value={selectedVisitType}
                  onChange={handleVisitTypeChange}
                >
                  {/* 門診+急診選項 */}
                  {availableVisitTypes.includes("門診") && availableVisitTypes.includes("急診") && (
                    <FormControlLabel 
                      value="門診+急診" 
                      control={<Radio size="small" />} 
                      label={
                        <TypographySizeWrapper
                          textSizeType="content"
                          generalDisplaySettings={generalDisplaySettings}
                        >
                          門診+急診
                        </TypographySizeWrapper>
                      } 
                    />
                  )}
                  
                  {/* 門診選項 */}
                  {availableVisitTypes.includes("門診") && (
                    <FormControlLabel 
                      value="門診" 
                      control={<Radio size="small" />} 
                      label={
                        <TypographySizeWrapper
                          textSizeType="content"
                          generalDisplaySettings={generalDisplaySettings}
                        >
                          門診
                        </TypographySizeWrapper>
                      } 
                    />
                  )}
                  
                  {/* 急診選項 */}
                  {availableVisitTypes.includes("急診") && (
                    <FormControlLabel 
                      value="急診" 
                      control={<Radio size="small" />} 
                      label={
                        <TypographySizeWrapper
                          textSizeType="content"
                          generalDisplaySettings={generalDisplaySettings}
                        >
                          急診
                        </TypographySizeWrapper>
                      } 
                    />
                  )}
                  
                  {/* 住診選項 */}
                  {availableVisitTypes.includes("住診") && (
                    <FormControlLabel 
                      value="住診" 
                      control={<Radio size="small" />} 
                      label={
                        <TypographySizeWrapper
                          textSizeType="content"
                          generalDisplaySettings={generalDisplaySettings}
                        >
                          住診
                        </TypographySizeWrapper>
                      } 
                    />
                  )}
                  
                  {/* 顯示所有項目選項 */}
                  <FormControlLabel 
                    value="顯示所有項目" 
                    control={<Radio size="small" />} 
                    label={
                      <TypographySizeWrapper
                        textSizeType="content"
                        generalDisplaySettings={generalDisplaySettings}
                      >
                        顯示所有項目
                      </TypographySizeWrapper>
                    } 
                  />
                </RadioGroup>
              </FormControl>
            )}
          </Box>
          
          {filteredMedications.length === 0 ? (
            <TypographySizeWrapper 
              variant="body2" 
              textSizeType="content"
              generalDisplaySettings={generalDisplaySettings}
              color="text.secondary"
            >
              沒有找到符合條件的用藥資料
            </TypographySizeWrapper>
          ) : (
            settings.separateShortTermMeds && (selectedVisitType === "門診+急診" || selectedVisitType === "門診" || (selectedVisitType === "" && availableVisitTypes.length === 1 && availableVisitTypes.includes("門診"))) ? (
              // 兩欄顯示 - 分為長期和短期用藥
              <Grid container spacing={2}>
                {/* 左欄：長期用藥（含有>=14天的藥物） */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <TypographySizeWrapper 
                      variant="h6" 
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                      color="primary.main"
                      gutterBottom
                    >
                      長期用藥（{'\u2265'}14天）
                    </TypographySizeWrapper>
                    
                    {longTermMeds.length === 0 ? (
                      <TypographySizeWrapper 
                        variant="body2" 
                        textSizeType="content"
                        generalDisplaySettings={generalDisplaySettings}
                        color="text.secondary"
                      >
                        無長期用藥
                      </TypographySizeWrapper>
                    ) : (
                      longTermMeds.map((group, index) => (
                        <Box key={index} sx={{ mb: 1.5 }}>
                          <Box>
                            <TypographySizeWrapper 
                              variant="subtitle1" 
                              textSizeType="content"
                              generalDisplaySettings={generalDisplaySettings}
                              color={getVisitTypeColor(group.visitType)}
                              gutterBottom
                            >
                              {group.date} - {group.hosp} {group.visitType && `(${group.visitType})`}
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
                              {copyFormat !== "none" && (
                                <Tooltip title="複製藥物清單">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleCopyMedications(group.medications, group)
                                    }
                                    sx={{ ml: 1, verticalAlign: "middle" }}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TypographySizeWrapper>
                          </Box>

                          {group.medications.map((med, medIndex) => {
                            // 獲取藥物的顏色
                            const medicationColor = getMedicationColor(med);
                            // 檢查藥物是否應該以粗體顯示
                            const isBold = shouldBeBold(med);
                            
                            return (
                              <Box key={medIndex} sx={{ ml: 2, mb: 1 }}>
                                <TypographySizeWrapper 
                                  variant="body2"
                                  textSizeType="content"
                                  generalDisplaySettings={generalDisplaySettings}
                                  sx={{ 
                                    color: medicationColor ? medicationColor.color : 'inherit',
                                    fontWeight: isBold ? 'bold' : 'normal' 
                                  }}
                                >
                                  {med.name}{" "}
                                  {med.perDosage !== "SPECIAL"
                                    ? `${med.perDosage}#`
                                    : `總量${med.dosage}`}{" "}
                                  {med.frequency} {med.days}天
                                  {settings.showGenericName && med.ingredient && (
                                    <TypographySizeWrapper
                                      component="span"
                                      textSizeType="note"
                                      generalDisplaySettings={generalDisplaySettings}
                                      sx={{
                                        color: medicationColor ? medicationColor.color : "text.secondary",
                                        fontStyle: "italic",
                                        ml: 0.8,
                                        fontWeight: isBold ? 'bold' : 'normal'
                                      }}
                                    >
                                      {" "}
                                      {med.ingredient}
                                    </TypographySizeWrapper>
                                  )}
                                  {settings.showATC5Name && med.atc_name && (
                                    <TypographySizeWrapper
                                      component="span"
                                      textSizeType="note"
                                      generalDisplaySettings={generalDisplaySettings}
                                      sx={{
                                        color: medicationColor ? medicationColor.color : "text.secondary",
                                        ml: 0.5,
                                        fontWeight: isBold ? 'bold' : 'normal'
                                      }}
                                    >
                                      {" "}
                                      - {med.atc_name}
                                    </TypographySizeWrapper>
                                  )}
                                  {med.drug_left > 0 && (
                                    <TypographySizeWrapper
                                      component="span"
                                      textSizeType="note"
                                      generalDisplaySettings={generalDisplaySettings}
                                      sx={{ 
                                        color: "secondary.light", 
                                        ml: 0.5 
                                      }}
                                    >
                                      {" "}
                                      (餘{med.drug_left}天)
                                    </TypographySizeWrapper>
                                  )}
                                  {settings.showExternalDrugImage && med.drugcode && (
                                    <Tooltip title="查看藥物圖片">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDrugImageClick(med.drugcode)}
                                        sx={{
                                          ml: 0.5,
                                          opacity: 0.5,
                                          padding: "2px",
                                          display: "inline-flex",
                                          verticalAlign: "text-top", // 或嘗試 "middle"
                                          '&:hover': {
                                            opacity: 1
                                          }
                                        }}
                                      >
                                        <ImageIcon sx={{ 
                                          fontSize: generalDisplaySettings.contentTextSize === 'small' 
                                            ? "14px" 
                                            : generalDisplaySettings.contentTextSize === 'medium' 
                                              ? "16px" 
                                              : "18px" 
                                        }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TypographySizeWrapper>
                              </Box>
                            );
                          })}
                          {index < longTermMeds.length - 1 && (
                            <Divider sx={{ my: 1.0 }} />
                          )}
                        </Box>
                      ))
                    )}
                  </Paper>
                </Grid>
                
                {/* 右欄：短期用藥（全部<14天的藥物） */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <TypographySizeWrapper 
                      variant="h6" 
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                      color="primary.main"
                      gutterBottom
                    >
                      短期用藥（{"<"}14天）
                    </TypographySizeWrapper>
                    
                    {shortTermMeds.length === 0 ? (
                      <TypographySizeWrapper 
                        variant="body2" 
                        textSizeType="content"
                        generalDisplaySettings={generalDisplaySettings}
                        color="text.secondary"
                      >
                        無短期用藥
                      </TypographySizeWrapper>
                    ) : (
                      shortTermMeds.map((group, index) => (
                        <Box key={index} sx={{ mb: 1.5 }}>
                          <Box>
                            <TypographySizeWrapper 
                              variant="subtitle1" 
                              textSizeType="content"
                              generalDisplaySettings={generalDisplaySettings}
                              color={getVisitTypeColor(group.visitType)}
                              gutterBottom
                            >
                              {group.date} - {group.hosp} {group.visitType && `(${group.visitType})`}
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
                              {copyFormat !== "none" && (
                                <Tooltip title="複製藥物清單">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleCopyMedications(group.medications, group)
                                    }
                                    sx={{ ml: 1, verticalAlign: "middle" }}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TypographySizeWrapper>
                          </Box>

                          {group.medications.map((med, medIndex) => {
                            // 獲取藥物的顏色
                            const medicationColor = getMedicationColor(med);
                            // 檢查藥物是否應該以粗體顯示
                            const isBold = shouldBeBold(med);
                            
                            return (
                              <Box key={medIndex} sx={{ ml: 2, mb: 1 }}>
                                <TypographySizeWrapper 
                                  variant="body2"
                                  textSizeType="content"
                                  generalDisplaySettings={generalDisplaySettings}
                                  sx={{ 
                                    color: medicationColor ? medicationColor.color : 'inherit',
                                    fontWeight: isBold ? 'bold' : 'normal' 
                                  }}
                                >
                                  {med.name}{" "}
                                  {med.perDosage !== "SPECIAL"
                                    ? `${med.perDosage}#`
                                    : `總量${med.dosage}`}{" "}
                                  {med.frequency} {med.days}天
                                  {settings.showGenericName && med.ingredient && (
                                    <TypographySizeWrapper
                                      component="span"
                                      textSizeType="note"
                                      generalDisplaySettings={generalDisplaySettings}
                                      sx={{
                                        color: medicationColor ? medicationColor.color : "text.secondary",
                                        fontStyle: "italic",
                                        ml: 0.5,
                                        fontWeight: isBold ? 'bold' : 'normal'
                                      }}
                                    >
                                      {" "}
                                      {med.ingredient}
                                    </TypographySizeWrapper>
                                  )}
                                  {settings.showATC5Name && med.atc_name && (
                                    <TypographySizeWrapper
                                      component="span"
                                      textSizeType="note"
                                      generalDisplaySettings={generalDisplaySettings}
                                      sx={{
                                        color: medicationColor ? medicationColor.color : "text.secondary",
                                        ml: 0.5,
                                        fontWeight: isBold ? 'bold' : 'normal'
                                      }}
                                    >
                                      {" "}
                                      - {med.atc_name}
                                    </TypographySizeWrapper>
                                  )}
                                  {med.drug_left > 0 && (
                                    <TypographySizeWrapper
                                      component="span"
                                      textSizeType="note"
                                      generalDisplaySettings={generalDisplaySettings}
                                      sx={{ 
                                        color: "secondary.light", 
                                        ml: 0.5 
                                      }}
                                    >
                                      {" "}
                                      (餘{med.drug_left}天)
                                    </TypographySizeWrapper>
                                  )}
                                  {settings.showExternalDrugImage && med.drugcode && (
                                    <Tooltip title="查看藥物圖片">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDrugImageClick(med.drugcode)}
                                        sx={{
                                          ml: 0.5,
                                          opacity: 0.5,
                                          padding: "2px",
                                          display: "inline-flex",
                                          verticalAlign: "text-top", // 或嘗試 "middle"
                                          '&:hover': {
                                            opacity: 1
                                          }
                                        }}
                                      >
                                        <ImageIcon sx={{ 
                                          fontSize: generalDisplaySettings.contentTextSize === 'small' 
                                            ? "14px" 
                                            : generalDisplaySettings.contentTextSize === 'medium' 
                                              ? "16px" 
                                              : "18px" 
                                        }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TypographySizeWrapper>
                              </Box>
                            );
                          })}
                          {index < shortTermMeds.length - 1 && (
                            <Divider sx={{ my: 1.0 }} />
                          )}
                        </Box>
                      ))
                    )}
                  </Paper>
                </Grid>
              </Grid>
            ) : (
              filteredMedications.map((group, index) => (
          <Box key={index} sx={{ mb: 1.5 }}>
            <Box>
              <TypographySizeWrapper 
                variant="h6" 
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
                      color={getVisitTypeColor(group.visitType)}
                gutterBottom
              >
                      {group.date} - {group.hosp} {group.visitType && `(${group.visitType})`}
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
                {copyFormat !== "none" && (
                  <Tooltip title="複製藥物清單">
                    <IconButton
                      size="small"
                      onClick={() =>
                        handleCopyMedications(group.medications, group)
                      }
                      sx={{ ml: 1, verticalAlign: "middle" }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TypographySizeWrapper>
            </Box>

            {group.medications.map((med, medIndex) => {
              // 獲取藥物的顏色
              const medicationColor = getMedicationColor(med);
              // 檢查藥物是否應該以粗體顯示
              const isBold = shouldBeBold(med);
              
              return (
                <Box key={medIndex} sx={{ ml: 2, mb: 1 }}>
                  <TypographySizeWrapper 
                    variant="body2"
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                    sx={{ 
                      color: medicationColor ? medicationColor.color : 'inherit',
                      fontWeight: isBold ? 'bold' : 'normal' 
                    }}
                  >
                    {med.name}{" "}
                    {med.perDosage !== "SPECIAL"
                      ? `${med.perDosage}#`
                      : `總量${med.dosage}`}{" "}
                    {med.frequency} {med.days}天
                    {settings.showGenericName && med.ingredient && (
                      <TypographySizeWrapper
                        component="span"
                        textSizeType="note"
                        generalDisplaySettings={generalDisplaySettings}
                        sx={{
                          color: medicationColor ? medicationColor.color : "text.secondary",
                          fontStyle: "italic",
                          ml: 0.5,
                          fontWeight: isBold ? 'bold' : 'normal'
                        }}
                      >
                        {" "}
                        {med.ingredient}
                      </TypographySizeWrapper>
                    )}
                    {settings.showATC5Name && med.atc_name && (
                      <TypographySizeWrapper
                        component="span"
                        textSizeType="note"
                        generalDisplaySettings={generalDisplaySettings}
                        sx={{
                          color: medicationColor ? medicationColor.color : "text.secondary",
                          ml: 0.5,
                          fontWeight: isBold ? 'bold' : 'normal'
                        }}
                      >
                        {" "}
                        - {med.atc_name}
                      </TypographySizeWrapper>
                    )}
                    {med.drug_left > 0 && (
                      <TypographySizeWrapper
                        component="span"
                        textSizeType="note"
                        generalDisplaySettings={generalDisplaySettings}
                        sx={{ 
                          color: "secondary.light", 
                          ml: 0.5 
                        }}
                      >
                        {" "}
                        (餘{med.drug_left}天)
                      </TypographySizeWrapper>
                    )}
                    {settings.showExternalDrugImage && med.drugcode && (
                      <Tooltip title="查看藥物圖片">
                        <IconButton
                          size="small"
                          onClick={() => handleDrugImageClick(med.drugcode)}
                          sx={{
                            ml: 0.5,
                            opacity: 0.5,
                            padding: "2px",
                            display: "inline-flex",
                            verticalAlign: "text-top", // 或嘗試 "middle"
                            '&:hover': {
                              opacity: 1
                            }
                          }}
                        >
                          <ImageIcon sx={{ 
                            fontSize: generalDisplaySettings.contentTextSize === 'small' 
                              ? "14px" 
                              : generalDisplaySettings.contentTextSize === 'medium' 
                                ? "16px" 
                                : "18px" 
                          }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TypographySizeWrapper>
                </Box>
              );
            })}
                  {index < filteredMedications.length - 1 && (
              <Divider sx={{ my: 1.0 }} />
            )}
          </Box>
        ))
            )
          )}
        </>
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

export default MedicationList;