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
  const [dayFilter, setDayFilter] = useState("gte14"); // 默認顯示>=7天藥物
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

  // 判斷藥物所屬顏色的函數 (與 MedicationList 中相同)
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

    // 如果沒有 ATC5 顏色藥物且當前選擇的是 "colored_only"，則重置為默認過濾器
    if (!hasColoredMeds && dayFilter === "colored_only") {
      setDayFilter("gte7");
    }
  }, [medNameLookup, settings, dayFilter]);

  // 判斷藥物是否應該以粗體顯示的函數
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
    const allDates = new Set();
    const dateToHospMap = {};

    medications.forEach((group) => {
      group.medications.forEach((med) => {
        if (!medicineMap.has(med.name)) {
          medicineMap.set(med.name, new Map());
        }
        allDates.add(group.date);
        if (!dateToHospMap[group.date]) {
          dateToHospMap[group.date] = group.hosp;
        }
        medicineMap.get(med.name).set(group.date, {
          dosage: med.dosage,
          perDosage: med.perDosage,
          frequency: med.frequency,
          days: med.days,
          drug_left: med.drug_left || 0,
        });
      });
    });

    // Convert dates to sorted array (newest first)
    const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));

    return {
      medicines: medicineMap,
      dates: sortedDates,
      dateToHospMap,
    };
  };

  // 對藥物按天數進行過濾的函數
  const filterMedicinesByDays = (medicines) => {
    return Array.from(medicines).filter(([medName, dateMap]) => {
      // 檢查藥物是否有任何符合過濾條件的日期記錄
      return Array.from(dateMap.values()).some((medData) => {
        const days = parseInt(medData.days) || 0;
        switch (dayFilter) {
          case "all":
            return true;
          case "gte7":
            return days >= 7;
          case "14_to_28":
            return days >= 14 && days <= 28;
          case "gt28":
            return days > 28;
          case "lt7":
            return days < 7;
          case "lt14":
            return days < 14;
          case "gte14":
            return days >= 14;
          case "colored_only":
            // 只顯示有ATC5顏色的藥物
            return getMedicationColor(medName) !== null;
          default:
            return true;
        }
      });
    });
  };

  // 獲取應該顯示的日期列
  const getVisibleDates = (processedData, filteredMedicines) => {
    if (dayFilter === "all") {
      return processedData.dates;
    }

    const datesWithData = new Set();

    filteredMedicines.forEach(([medName, dateMap]) => {
      dateMap.forEach((medData, date) => {
        const days = parseInt(medData.days) || 0;
        let shouldInclude = false;

        switch (dayFilter) {
          case "lte7":
            shouldInclude = days <= 7;
            break;
          case "gte7":
            shouldInclude = days >= 7;
            break;
          case "gte14":
            shouldInclude = days >= 14;
            break;
          case "colored_only":
            shouldInclude = getMedicationColor(medName) !== null;
            break;
          default:
            shouldInclude = true;
        }

        if (shouldInclude) {
          datesWithData.add(date);
        }
      });
    });

    return processedData.dates.filter((date) => datesWithData.has(date));
  };

  // 過濾選項變更處理函數
  const handleFilterChange = (event) => {
    setDayFilter(event.target.value);
  };

  const getMostRecentDate = (dateMap, medName) => {
    const filteredDates = Array.from(dateMap.entries())
      .filter(([date, medData]) => {
        const days = parseInt(medData.days) || 0;
        switch (dayFilter) {
          case "all":
            return true;
          case "lte7":
            return days <= 7;
          case "gte7":
            return days >= 7;
          case "gte14":
            return days >= 14;
          case "colored_only":
            return true;
          default:
            return true;
        }
      })
      .sort((a, b) => b[0].localeCompare(a[0]));

    return filteredDates.length > 0 ? filteredDates[0][0] : null;
  };

  // 獲取處理後的資料
  const processedData = processMedicationTableData(groupedMedications);
  const filteredMedicines = filterMedicinesByDays(processedData.medicines);

  // 按最近處方日期排序藥物（最新日期在最上方）
  const sortedFilteredMedicines = Array.from(filteredMedicines).sort((a, b) => {
    const dateA = getMostRecentDate(a[1], a[0]);
    const dateB = getMostRecentDate(b[1], b[0]);

    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateB.localeCompare(dateA);
  });

  const visibleDates = getVisibleDates(processedData, sortedFilteredMedicines);

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
                  {visibleDates.map((date) => (
                    <TableCell
                      key={date}
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
                      {processedData.dateToHospMap[date] && (
                        <TypographySizeWrapper
                          variant="caption"
                          textSizeType="note"
                          generalDisplaySettings={generalDisplaySettings}
                          sx={{
                            display: "block",
                            color: "text.secondary",
                          }}
                        >
                          {processedData.dateToHospMap[date]}
                        </TypographySizeWrapper>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFilteredMedicines.map(([name, dateMap]) => {
                  // 獲取藥物的顏色
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
                      {visibleDates.map((date) => {
                        const medData = dateMap.get(date);

                        // 檢查該藥物在該日期是否符合過濾條件
                        const days = medData ? parseInt(medData.days) || 0 : 0;
                        let shouldDisplay = !!medData;

                        if (shouldDisplay && dayFilter !== "all") {
                          switch (dayFilter) {
                            case "lte7":
                              shouldDisplay = days <= 7;
                              break;
                            case "gte7":
                              shouldDisplay = days >= 7;
                              break;
                            case "gte14":
                              shouldDisplay = days >= 14;
                              break;
                            case "colored_only":
                              shouldDisplay = getMedicationColor(name) !== null;
                              break;
                          }
                        }

                        return (
                          <TableCell
                            key={date}
                            align="center"
                            sx={{
                              minWidth: "100px",
                              maxWidth: "120px",
                              padding: "6px 4px",
                            }}
                          >
                            {shouldDisplay ? (
                              <>
                                <TypographySizeWrapper
                                  variant="body2"
                                  textSizeType="content"
                                  generalDisplaySettings={generalDisplaySettings}
                                  sx={{ whiteSpace: "nowrap" }}
                                >
                                  {medData.perDosage !== "SPECIAL"
                                    ? `${medData.perDosage}# ${medData.frequency}`
                                    : `總量${medData.dosage} ${medData.frequency}`}
                                </TypographySizeWrapper>
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
                                  {medData.drug_left > 0 && (
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
                              </>
                            ) : (
                              ""
                            )}
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