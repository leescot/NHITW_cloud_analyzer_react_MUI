import React, { useState, useEffect } from "react";
import {
  Typography,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Box,
  IconButton,
  Tooltip,
  Snackbar,
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const MedicationTable = ({ groupedMedications, settings, generalDisplaySettings }) => {
  // 添加過濾選項的狀態
  const [dayFilter, setDayFilter] = useState("gte14"); // 默認顯示>=14天藥物
  // 追蹤是否有 ATC5 顏色藥物
  const [hasATC5ColoredMeds, setHasATC5ColoredMeds] = useState(false);

  // Use useState for the medication lookup to maintain state between renders
  const [medNameLookup, setMedNameLookup] = useState({});

  // Build medNameLookup when medications change
  useEffect(() => {
    // Create a new lookup object
    const newLookup = {};

    // Populate lookup with medications
    groupedMedications.forEach(group => {
      group.medications.forEach(med => {
        if (!newLookup[med.name]) {
          newLookup[med.name] = [];
        }
        newLookup[med.name].push(med);
      });
    });

    // Update the state with the new lookup
    setMedNameLookup(newLookup);
  }, [groupedMedications]);

  // 判斷藥物所屬顏色的函式 (與 MedicationList 中相同)
  const getMedicationColor = (name) => {
    if (!settings?.enableATC5Colors) return null;

    if (!medNameLookup[name]) {
      return null;
    }

    const allMedInstances = medNameLookup[name];
    // 使用第一個找到的實例進行顏色判斷
    const medication = allMedInstances[0];

    // 只使用 atc_code
    let atc5Code = medication.atc_code;

    // Handle cases where the ATC5 code might be in the ATC name
    if (!atc5Code && medication.atc_name) {
      const matches = medication.atc_name.match(/\(([A-Z0-9]+)\)/);
      if (matches && matches[1]) atc5Code = matches[1];
    }

    if (!atc5Code) {
      return null;
    }

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

    if (!group) {
      return null;
    }

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

  // 檢查是否存在 ATC5 顏色藥物
  useEffect(() => {
    if (!settings?.enableATC5Colors || !medNameLookup ||
        !settings.atc5Groups || Object.keys(settings.atc5Groups).length === 0) {
      setHasATC5ColoredMeds(false);
      return;
    }

    // 檢查是否有任何藥物有 ATC5 顏色
    const hasColoredMeds = Object.keys(medNameLookup).some(name => {
      return getMedicationColor(name) !== null;
    });

    setHasATC5ColoredMeds(hasColoredMeds);

    // 如果沒有 ATC5 顏色藥物且當前選擇的是 "colored_only"，則重設為默認過濾器
    if (!hasColoredMeds && dayFilter === "colored_only") {
      setDayFilter("gte7");
    }
  }, [medNameLookup, settings, dayFilter]);

  // 判斷藥物是否應該以粗體顯示的函式
  const shouldBeBold = (name) => {
    if (!settings?.enableATC5Colors) return false;

    if (!medNameLookup[name]) {
      return false;
    }

    const allMedInstances = medNameLookup[name];

    // 使用第一個找到的實例進行判斷
    const medication = allMedInstances[0];

    // 只使用 atc_code
    let atc5Code = medication.atc_code;

    if (!atc5Code) return false;

    // 檢查是否有 atc5Groups 設定
    if (!settings.atc5Groups || Object.keys(settings.atc5Groups).length === 0) {
      return false;
    }

    // 檢查藥物的 ATC5 代碼是否屬於任何群組
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

  // 處理數據格式化為表格可用的格式
  const processMedicationTableData = (medications) => {
    const medicineMap = new Map();
    const allDateHospPairs = new Set();
    const dateHospToKeyMap = {};
    const keyToDateHospMap = {};

    // 提取處理單個藥物數據的函式
    const processMedicationData = (med, date, hosp, medicineMap) => {
      const medName = med.name;
      // 創建一個唯一的鍵來表示日期和醫院的組合
      const dateHospKey = `${date}__${hosp}`;
      
      // 若藥名不存在於 Map 中，先建立
      if (!medicineMap.has(medName)) {
        medicineMap.set(medName, new Map());
      }
      
      // 擷取藥物的日期醫院組合 Map
      const dateHospMap = medicineMap.get(medName);
      
      // 建立當前藥物的劑量和頻次資訊
      const currentDosageFreq = {
        perDosage: med.perDosage,
        frequency: med.frequency,
      };
      
      // 檢查該日期醫院組合是否已有此藥物的記錄
      if (!dateHospMap.has(dateHospKey)) {
        // 創建新的藥物記錄
        dateHospMap.set(dateHospKey, {
          dosage: med.dosage,
          perDosage: med.perDosage,
          frequency: med.frequency,
          days: med.days,
          drug_left: med.drug_left || 0,
          dosageFreqs: [currentDosageFreq],
        });
      } else {
        // 更新現有記錄
        const existingMed = dateHospMap.get(dateHospKey);
        
        // 檢查是否有重複的劑量和頻次
        const hasDuplicate = existingMed.dosageFreqs.some(
          df => df.perDosage === med.perDosage && df.frequency === med.frequency
        );
        
        // 如果不是重複的，添加到 dosageFreqs 陣列
        if (!hasDuplicate) {
          existingMed.dosageFreqs.push(currentDosageFreq);
        }
        
        // 更新藥物天數和剩餘藥物 (取較大值)
        existingMed.days = Math.max(parseInt(existingMed.days), parseInt(med.days)).toString();
        existingMed.drug_left = Math.max(existingMed.drug_left, med.drug_left || 0);
      }
      
      // 保存日期醫院組合映射
      dateHospToKeyMap[dateHospKey] = { date, hosp };
      keyToDateHospMap[dateHospKey] = { date, hosp };
      
      // 記錄所有日期醫院組合
      allDateHospPairs.add(dateHospKey);
    };

    // 處理所有藥物資料
    medications.forEach((group) => {
      // 處理每個藥物
      group.medications.forEach((med) => {
        processMedicationData(med, group.date, group.hosp, medicineMap);
      });
    });

    // 將日期醫院組合轉換為排序的陣列 (最新日期優先)
    const sortedDateHospKeys = Array.from(allDateHospPairs).sort((a, b) => {
      // 提取日期部分進行比較
      const dateA = a.split('__')[0];
      const dateB = b.split('__')[0];
      // 優先按日期排序
      const dateCompare = dateB.localeCompare(dateA);
      if (dateCompare !== 0) return dateCompare;
      
      // 如果日期相同，則按醫院名稱排序
      const hospA = a.split('__')[1];
      const hospB = b.split('__')[1];
      return hospA.localeCompare(hospB);
    });

    return {
      medicines: medicineMap,
      dateHospKeys: sortedDateHospKeys,
      keyToDateHospMap: keyToDateHospMap,
    };
  };

  // 藥物過濾條件定義 - 集中管理所有過濾條件
  const filterConditions = {
    // 基本過濾條件定義
    definitions: new Map([
      ["all", () => true],
      ["lte7", (days) => days <= 7],
      ["gte7", (days) => days >= 7],
      ["gte14", (days) => days >= 14],
      ["lt7", (days) => days < 7],
      ["lt14", (days) => days < 14],
      ["14_to_28", (days) => days >= 14 && days <= 28],
      ["gt28", (days) => days > 28],
      ["colored_only", (_, medName) => getMedicationColor(medName) !== null]
    ]),
    
    // 擷取過濾函式
    getFilterFunction(filterName) {
      return this.definitions.get(filterName) || (() => true);
    },
    
    // 檢查藥物是否符合過濾條件
    meetsCriteria(filterName, days, medName) {
      const filterFn = this.getFilterFunction(filterName);
      return filterFn(days, medName);
    }
  };
  
  // 對藥物按天數進行過濾的函式
  const filterMedicinesByDays = (medicines) => {
    return Array.from(medicines).filter(([medName, dateHospMap]) => {
      // 檢查藥物是否有任何符合過濾條件的日期記錄
      return Array.from(dateHospMap.values()).some((medData) => {
        const days = parseInt(medData.days) || 0;
        return filterConditions.meetsCriteria(dayFilter, days, medName);
      });
    });
  };

  // 擷取應該顯示的日期醫院組合列
  const getVisibleDateHospKeys = (processedData, filteredMedicines) => {
    if (dayFilter === "all") {
      return processedData.dateHospKeys;
    }

    const keysWithData = new Set();

    filteredMedicines.forEach(([medName, dateHospMap]) => {
      dateHospMap.forEach((medData, key) => {
        const days = parseInt(medData.days) || 0;
        if (filterConditions.meetsCriteria(dayFilter, days, medName)) {
          keysWithData.add(key);
        }
      });
    });

    return processedData.dateHospKeys.filter((key) => keysWithData.has(key));
  };

  // 擷取最近的日期醫院組合
  const getMostRecentDateHospKey = (dateHospMap, medName) => {
    const filteredKeys = Array.from(dateHospMap.entries())
      .filter(([_, medData]) => {
        const days = parseInt(medData.days) || 0;
        return filterConditions.meetsCriteria(dayFilter, days, medName);
      })
      .sort((a, b) => {
        // 日期在鍵值的前面部分
        const dateA = a[0].split('__')[0];
        const dateB = b[0].split('__')[0];
        return dateB.localeCompare(dateA);
      });

    return filteredKeys.length > 0 ? filteredKeys[0][0] : null;
  };

  // 過濾選項變更處理函式
  const handleFilterChange = (event) => {
    setDayFilter(event.target.value);
  };

  // 擷取處理後的資料
  const processedData = processMedicationTableData(groupedMedications);
  const filteredMedicines = filterMedicinesByDays(processedData.medicines);

  // 按最近處方日期排序藥物（最新日期在最上方）
  const sortedFilteredMedicines = Array.from(filteredMedicines).sort((a, b) => {
    const keyA = getMostRecentDateHospKey(a[1], a[0]);
    const keyB = getMostRecentDateHospKey(b[1], b[0]);

    if (!keyA && !keyB) return 0;
    if (!keyA) return 1;
    if (!keyB) return -1;

    // 從鍵中提取日期進行比較
    const dateA = keyA.split('__')[0];
    const dateB = keyB.split('__')[0];

    return dateB.localeCompare(dateA);
  });

  const visibleDateHospKeys = getVisibleDateHospKeys(processedData, sortedFilteredMedicines);

  // Add snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Add snackbar close handler
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Add drug image click handler
  const handleDrugImageClick = (drugcode) => {
    if (!drugcode) {
      setSnackbarMessage("無法擷取藥品代碼");
      setSnackbarOpen(true);
      return;
    }

    // 打開藥品圖片頁面
    window.open(`chrome-extension://${chrome.runtime.id}/drug-images.html?code=${drugcode}`, '_blank', 'noopener,noreferrer');

    setSnackbarMessage("已開啟藥品圖片查看器");
    setSnackbarOpen(true);
  };

  // 在 TableCell 的渲染部分修改為顯示多種頻次
  const renderMultipleDosages = (dosageFreqs) => {
    // 格式化單個劑量頻次的函式
    const formatDosageFrequency = (df) => 
      df.perDosage !== "SPECIAL"
        ? `${df.perDosage}# ${df.frequency}`
        : `總量${df.dosage} ${df.frequency}`;
    
    // 對頻次進行排序，QD 最優先，其次是 Q 開頭的頻次，最後是其他頻次
    const sortedDosageFreqs = [...dosageFreqs].sort((a, b) => {
      // QD 頻次最優先
      if (a.frequency === 'QD' && b.frequency !== 'QD') return -1;
      if (a.frequency !== 'QD' && b.frequency === 'QD') return 1;
      
      // 其次是 Q 開頭的頻次
      const aStartsWithQ = a.frequency.startsWith('Q');
      const bStartsWithQ = b.frequency.startsWith('Q');
      
      if (aStartsWithQ && !bStartsWithQ) return -1;
      if (!aStartsWithQ && bStartsWithQ) return 1;
      
      return 0;
    });
    
    // 將所有劑量頻次格式化為字符串，並用 " + " 連接
    return sortedDosageFreqs.map(formatDosageFrequency).join(" + ");
  };

  // 藥物劑量顯示 Cell 元件 - 封裝單個劑量顯示邏輯
  const MedicationDosageCell = ({ medData, shouldDisplay, generalDisplaySettings }) => {
    if (!shouldDisplay) {
      return null;
    }
    
    // 藥物劑量的顯示邏輯
    const renderDosage = () => {
      if (!medData.dosageFreqs) {
        // 處理舊數據格式
        return medData.perDosage !== "SPECIAL"
          ? `${medData.perDosage}# ${medData.frequency}`
          : `總量${medData.dosage} ${medData.frequency}`;
      }
      
      // 處理新的多劑量格式
      return medData.dosageFreqs.length > 1
        ? renderMultipleDosages(medData.dosageFreqs)
        : (medData.dosageFreqs[0].perDosage !== "SPECIAL"
            ? `${medData.dosageFreqs[0].perDosage}# ${medData.dosageFreqs[0].frequency}`
            : `總量${medData.dosage} ${medData.dosageFreqs[0].frequency}`);
    };
    
    // 用藥天數的顯示邏輯
    const renderDayInfo = () => {
      const hasRemainingDrug = medData.drug_left > 0;
      
      return (
        <TypographySizeWrapper
          variant="caption"
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          sx={{
            display: "block",
            color: "text.secondary",
          }}
        >
          {medData.days}天
          {hasRemainingDrug && (
            <TypographySizeWrapper
              component="span"
              textSizeType="note"
              generalDisplaySettings={generalDisplaySettings}
              sx={{ color: "#1976d2" }}
            >
              {` (餘${medData.drug_left})`}
            </TypographySizeWrapper>
          )}
        </TypographySizeWrapper>
      );
    };
    
    return (
      <>
        <TypographySizeWrapper
          variant="body2"
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          sx={{ whiteSpace: "nowrap" }}
        >
          {renderDosage()}
        </TypographySizeWrapper>
        {renderDayInfo()}
      </>
    );
  };

  // 檢查藥物在特定日期醫院組合是否應該顯示的函式
  const shouldDisplayMedication = (medData, dayFilter, name) => {
    if (!medData) return false;
    
    if (dayFilter === "all") return true;
    
    const days = parseInt(medData.days) || 0;
    return filterConditions.meetsCriteria(dayFilter, days, name);
  };

  return (
    <>
      {groupedMedications.length === 0 ? (
        <TypographySizeWrapper
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          color="text.secondary"
        >
          沒有找到用藥資料
        </TypographySizeWrapper>
      ) : (
        <>
          {/* 添加過濾選項 */}
          <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
            <FormControl component="fieldset">
              <RadioGroup
                row
                name="dayFilter"
                value={dayFilter}
                onChange={handleFilterChange}
              >
                <FormControlLabel
                  value="all"
                  control={<Radio size="small" />}
                  label={
                    <TypographySizeWrapper
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      顯示所有藥物
                    </TypographySizeWrapper>
                  }
                  sx={{ marginY: 0, height: "24px" }}
                />
                <FormControlLabel
                  value="lte7"
                  control={<Radio size="small" />}
                  label={
                    <TypographySizeWrapper
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      只顯示≤7天藥物
                    </TypographySizeWrapper>
                  }
                  sx={{ marginY: 0, height: "24px" }}
                />
                <FormControlLabel
                  value="gte7"
                  control={<Radio size="small" />}
                  label={
                    <TypographySizeWrapper
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      顯示≥7天藥物
                    </TypographySizeWrapper>
                  }
                  sx={{ marginY: 0, height: "24px" }}
                />
                <FormControlLabel
                  value="gte14"
                  control={<Radio size="small" />}
                  label={
                    <TypographySizeWrapper
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      只顯示≥14天藥物
                    </TypographySizeWrapper>
                  }
                  sx={{ marginY: 0, height: "24px" }}
                />
                {hasATC5ColoredMeds && (
                  <FormControlLabel
                    value="colored_only"
                    control={<Radio size="small" />}
                    label={
                      <TypographySizeWrapper
                        textSizeType="content"
                        generalDisplaySettings={generalDisplaySettings}
                      >
                        只顯示ATC5顏色藥物
                      </TypographySizeWrapper>
                    }
                    sx={{ marginY: 0, height: "24px" }}
                  />
                )}
              </RadioGroup>
            </FormControl>
          </Box>

          <TableContainer
            component={Paper}
            sx={{
              maxHeight: "calc(100vh - 250px)",
              width: "100%",
              overflow: "auto",
              border: "1px solid rgba(224, 224, 224, 1)",
              "&::-webkit-scrollbar": {
                width: "12px",
                height: "12px",
                display: "block",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(0,0,0,0.3)",
                borderRadius: "6px",
                border: "2px solid #ffffff",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "rgba(0,0,0,0.05)",
                borderRadius: "6px",
              },
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      position: "sticky",
                      left: 0,
                      zIndex: 3,
                      backgroundColor: "background.paper",
                      minWidth: "120px",
                      maxWidth: "180px",
                    }}
                  >
                    <TypographySizeWrapper
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      藥品名稱
                    </TypographySizeWrapper>
                  </TableCell>
                  {visibleDateHospKeys.map((key) => {
                    const { date, hosp } = processedData.keyToDateHospMap[key];
                    // 清理醫院名稱，只取分號前的部分
                    const hospName = hosp.split(';')[0];
                    
                    return (
                      <TableCell
                        key={key}
                        align="center"
                        sx={{
                          minWidth: "100px",
                          maxWidth: "120px",
                          whiteSpace: "nowrap",
                          padding: "8px 4px",
                        }}
                      >
                        <TypographySizeWrapper
                          variant="body2"
                          textSizeType="content"
                          generalDisplaySettings={generalDisplaySettings}
                          sx={{ fontWeight: "medium" }}
                        >
                          {date}
                        </TypographySizeWrapper>
                        {hospName && (
                          <TypographySizeWrapper
                            variant="caption"
                            textSizeType="note"
                            generalDisplaySettings={generalDisplaySettings}
                            sx={{
                              display: "block",
                              color: "text.secondary",
                            }}
                          >
                            {hospName}
                          </TypographySizeWrapper>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFilteredMedicines.map(([name, dateHospMap]) => {
                  // 擷取藥物的顏色
                  const medicationColor = getMedicationColor(name);
                  // 檢查藥物是否應該以粗體顯示
                  const isBold = shouldBeBold(name);

                  return (
                    <TableRow key={name}>
                      <TableCell
                        sx={{
                          position: "sticky",
                          left: 0,
                          backgroundColor: "background.paper",
                          minWidth: "120px",
                          maxWidth: "180px",
                          color: medicationColor?.color || 'inherit',
                          fontWeight: isBold ? 'bold' : 'normal'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TypographySizeWrapper
                            textSizeType="content"
                            generalDisplaySettings={generalDisplaySettings}
                            sx={{
                              color: medicationColor?.color || 'inherit',
                              fontWeight: isBold ? 'bold' : 'normal'
                            }}
                          >
                            {name}
                          </TypographySizeWrapper>
                          {settings.showExternalDrugImage && medNameLookup[name]?.[0]?.drugcode && (
                            <Tooltip title="查看藥物圖片">
                              <IconButton
                                size="small"
                                onClick={() => handleDrugImageClick(medNameLookup[name][0].drugcode)}
                                sx={{
                                  ml: 0.5,
                                  opacity: 0.5,
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
                        </Box>
                      </TableCell>
                      {visibleDateHospKeys.map((key) => {
                        const medData = dateHospMap.get(key);
                        const shouldDisplay = shouldDisplayMedication(medData, dayFilter, name);
                        
                        return (
                          <TableCell
                            key={key}
                            align="center"
                            sx={{
                              minWidth: "100px",
                              maxWidth: "120px",
                              padding: "6px 4px",
                            }}
                          >
                            <MedicationDosageCell 
                              medData={medData} 
                              shouldDisplay={shouldDisplay} 
                              generalDisplaySettings={generalDisplaySettings} 
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
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

export default MedicationTable;