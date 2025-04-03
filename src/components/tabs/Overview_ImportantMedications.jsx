import React, { useEffect } from "react";
import {
  Typography,
  Paper,
  List,
  ListItem,
  Box,
  Chip,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  IconButton,
  Snackbar,
} from "@mui/material";
// Import icons for medication categories
import MedicationIcon from '@mui/icons-material/Medication';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import HealingIcon from '@mui/icons-material/Healing';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ImageIcon from '@mui/icons-material/Image';
import { isWithinLast90Days, getMedicationColorGroup, formatDate } from "./Overview_utils";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

// Import default settings to use as fallbacks
import { DEFAULT_SETTINGS } from "../../config/defaultSettings";
import { DEFAULT_ATC5_GROUPS, DEFAULT_ATC5_COLOR_GROUPS } from "../../config/medicationGroups";

const Overview_ImportantMedications = ({
  groupedMedications = [],
  settings = {},
  overviewSettings = {},
  generalDisplaySettings = { titleTextSize: 'medium', contentTextSize: 'medium', noteTextSize: 'small' }
}) => {
  // Get tracking days from overviewSettings, fall back to 90 days if not set
  const trackingDays = overviewSettings.medicationTrackingDays || 90;

  // Create a safe settings object with defaults if settings are corrupted
  const safeSettings = {
    simplifyMedicineName: settings.simplifyMedicineName !== undefined ? settings.simplifyMedicineName : DEFAULT_SETTINGS.western.simplifyMedicineName,
    showGenericName: settings.showGenericName !== undefined ? settings.showGenericName : DEFAULT_SETTINGS.western.showGenericName,
    showDiagnosis: settings.showDiagnosis !== undefined ? settings.showDiagnosis : DEFAULT_SETTINGS.western.showDiagnosis,
    showATC5Name: settings.showATC5Name !== undefined ? settings.showATC5Name : DEFAULT_SETTINGS.western.showATC5Name,
    enableATC5Colors: settings.enableATC5Colors !== undefined ? settings.enableATC5Colors : DEFAULT_SETTINGS.atc5.enableColors,
    showExternalDrugImage: settings.showExternalDrugImage !== undefined ? settings.showExternalDrugImage : DEFAULT_SETTINGS.western.showExternalDrugImage,
    atc5Groups: settings.atc5Groups || DEFAULT_ATC5_GROUPS,
    atc5ColorGroups: settings.atc5ColorGroups || DEFAULT_ATC5_COLOR_GROUPS
  };

  // For debugging
  // console.log('Settings passed:', settings);
  // console.log('Safe settings created:', safeSettings);

  // Filter out medications from the past tracking days, by color groups, and consolidate same medications
  // Step 1: Extract all medications within the tracking period with their color groups
  const recentMedications = [];

  groupedMedications.forEach(group => {
    if (!group.medications || !Array.isArray(group.medications)) {
      return;
    }

    group.medications.forEach(med => {
      const dateToCheck = med.start_date || group.date;

      // Using configurable tracking days instead of hardcoded 90
      if (isWithinLastNDays(dateToCheck, trackingDays)) {
        // Use the safeSettings object here
        const colorGroup = getMedicationColorGroup(med, safeSettings);

        if (colorGroup) {
          recentMedications.push({
            ...med,
            start_date: dateToCheck,
            hospital: med.hospital || group.hosp,
            drug_left: med.drug_left || 0,  // Add drug_left property (default to 0 if not present)
            drugcode: med.drugcode || med.drug_code || '',  // Ensure drugcode is preserved
            colorGroup
          });
        }
      }
    });
  });

  // isWithinLastNDays 函數重構使用 Map 來處理不同的日期格式
  function isWithinLastNDays(dateStr, days) {
    if (!dateStr) {
      return false;
    }

    // 嘗試解析日期字符串
    let date;
    try {
      // 先嘗試直接解析
      date = new Date(dateStr);

      // 如果無效，嘗試常見格式轉換
      if (isNaN(date.getTime())) {
        // 定義處理不同格式的策略 Map
        const dateParsingStrategies = new Map([
          // 處理包含 '/' 的日期格式
          [() => dateStr.includes('/'), () => {
            const parts = dateStr.split('/');
            // 假設 YYYY/MM/DD 如果第一部分是 4 位數
            return parts[0].length === 4 
              ? new Date(parts[0], parts[1] - 1, parts[2])
              : new Date(parts[2], parts[1] - 1, parts[0]); // 否則假設 DD/MM/YYYY
          }],
          // 處理包含 '-' 的日期格式
          [() => dateStr.includes('-'), () => new Date(dateStr.replace(/-/g, '/'))]
        ]);

        // 執行第一個匹配的策略
        for (const [condition, parser] of dateParsingStrategies) {
          if (condition()) {
            date = parser();
            break;
          }
        }
      }
    } catch (e) {
      return false;
    }

    // 驗證日期是否有效
    if (isNaN(date.getTime())) {
      return false;
    }

    const now = new Date();

    // 計算閾值日期（N 天前）
    const timeThreshold = now.getTime() - days * 24 * 60 * 60 * 1000;

    // 檢查日期是否在閾值之後
    return date.getTime() >= timeThreshold;
  }

  // Step 2: Group identical medications
  const groupedByName = {};

  recentMedications.forEach(med => {
    if (!med.colorGroup) {
      return;
    }

    const key = `${med.name}_${med.colorGroup?.groupName || 'unknown'}_${med.colorGroup?.colorName || 'unknown'}`;

    if (!groupedByName[key]) {
      groupedByName[key] = {
        name: med.name,
        days: med.days,
        drugcode: med.drugcode || med.drug_code || '',  // Include drugcode
        colorGroup: med.colorGroup,
        prescriptions: []
      };
    }

    groupedByName[key].prescriptions.push({
      date: med.start_date,
      hospital: med.hospital,
      days: med.days,
      drug_left: med.drug_left || 0,  // Include drug_left in prescriptions
      drugcode: med.drugcode || med.drug_code || ''  // Include drugcode in prescriptions
    });
  });

  // Step 3: Organize by color and group
  const colorGroupedMeds = {};

  Object.values(groupedByName).forEach(med => {
    if (!med.colorGroup) {
      return;
    }

    const { colorGroup } = med;
    const { colorName } = colorGroup;

    if (!colorGroupedMeds[colorName]) {
      colorGroupedMeds[colorName] = {
        colorValue: colorGroup.color,
        groups: {}
      };
    }

    if (!colorGroupedMeds[colorName].groups[colorGroup.groupName]) {
      colorGroupedMeds[colorName].groups[colorGroup.groupName] = [];
    }

    // Sort prescriptions by date (newest first)
    med.prescriptions.sort((a, b) => new Date(b.date) - new Date(a.date));

    colorGroupedMeds[colorName].groups[colorGroup.groupName].push(med);
  });

  // If we have recent medications but no color groups, create a simplified view
  const hasMedicationsButNoGroups = recentMedications.length > 0 && Object.keys(colorGroupedMeds).length === 0;

  // Create a simplified medication list for the fallback view
  const simplifiedMedList = hasMedicationsButNoGroups ?
    recentMedications.map(med => ({
      name: med.name,
      date: med.start_date,
      hospital: med.hospital,
      days: med.days,
      drug_left: med.drug_left || 0,  // Include drug_left in simplified list
      drugcode: med.drugcode || med.drug_code || ''  // Include drugcode in simplified list
    })) : [];

  // Sort by date (newest first) if we're using the fallback
  if (hasMedicationsButNoGroups) {
    simplifiedMedList.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Force the component to render even with empty data for debugging
  const hasData = Object.keys(colorGroupedMeds).length > 0;

  // Prepare data for table with rowSpan for ATC5 groups
  const tableData = [];

  if (hasData) {
    // Define color priority order
    const colorPriority = ['red', 'orange', 'green'];

    // Sort colors by priority
    const sortedColors = Object.entries(colorGroupedMeds)
      .sort((a, b) => {
        const indexA = colorPriority.indexOf(a[0]);
        const indexB = colorPriority.indexOf(b[0]);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });

    // Build table data with sorted colors
    sortedColors.forEach(([colorName, colorData]) => {
      Object.entries(colorData.groups).forEach(([groupName, medications]) => {
        // First medication in group
        if (medications.length > 0) {
          tableData.push({
            isGroupHeader: true,
            colorName,
            colorValue: colorData.colorValue,
            groupName,
            rowSpan: medications.length,
            medication: medications[0]
          });

          // Rest of medications in this group
          for (let i = 1; i < medications.length; i++) {
            tableData.push({
              isGroupHeader: false,
              medication: medications[i]
            });
          }
        }
      });
    });
  }

  // 修改 getColorInfo 函數，使用 Map 代替 if-else
  const getColorInfo = (colorName) => {
    const colorMap = new Map([
      ['red', {
        light: alpha('#f44336', 0.15),
        medium: '#e53935',
        dark: '#b71c1c',
        name: '紅色'
      }],
      ['orange', {
        light: alpha('#ff9800', 0.18),
        medium: '#fb8c00',
        dark: '#e65100',
        name: '橘色'
      }],
      ['green', {
        light: alpha('#4caf50', 0.2),
        medium: '#43a047',
        dark: '#1b5e20',
        name: '綠色'
      }]
    ]);

    // 返回對應顏色或預設灰色
    return colorMap.get(colorName) || {
      light: alpha('#e0e0e0', 0.3),
      medium: '#bdbdbd',
      dark: '#757575',
      name: '灰色'
    };
  };

  // 修改 getCategoryIcon 函數，使用 Map 代替 if-else
  const getCategoryIcon = (groupName) => {
    const iconMap = new Map([
      ['NSAID', <MedicationIcon fontSize="small" sx={{ fontSize: '0.85rem' }} />],
      ['ACEI', <LocalPharmacyIcon fontSize="small" sx={{ fontSize: '0.85rem' }} />],
      ['ARB', <HealingIcon fontSize="small" sx={{ fontSize: '0.85rem' }} />],
      ['STATIN', <HealthAndSafetyIcon fontSize="small" sx={{ fontSize: '0.85rem' }} />]
    ]);

    // 返回對應圖標或預設藥物圖標
    return iconMap.get(groupName) || <MedicationIcon fontSize="small" sx={{ fontSize: '0.85rem' }} />;
  };

  // Helper function to create category badge
  const getCategoryBadge = (groupName, colorInfo) => {
    // Special styling for NSAID (red category)
    const isNSAID = groupName === 'NSAID';
    const bgColor = isNSAID ? alpha('#f44336', 0.1) : '#fff';
    const textColor = isNSAID ? colorInfo.dark : colorInfo.dark;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '16px',
          border: `1px solid ${colorInfo.medium}`,
          backgroundColor: bgColor,
          color: textColor,
          fontSize: '0.65rem',
          py: 0.3,
          px: 0.75,
          gap: 0.5,
          whiteSpace: 'nowrap',
          width: 'fit-content',
          margin: '0 auto',
          minWidth: '45px',
          height: '22px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <Box component="span" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
          {groupName}
        </Box>
      </Box>
    );
  };

  // Add state for snackbar
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState("");

  // Helper function to format medication name
  const formatMedicationName = (name) => {
    if (!name) return null;

    // Find parenthesized content
    const regex = /\(([^)]+)\)/g;
    let match;
    let lastIndex = 0;
    const parts = [];

    while ((match = regex.exec(name)) !== null) {
      // Add text before the parenthesis
      if (match.index > lastIndex) {
        parts.push({
          text: name.substring(lastIndex, match.index),
          isParenthesized: false
        });
      }

      // Add parenthesized text
      parts.push({
        text: `(${match[1]})`,
        isParenthesized: true
      });

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text after the last parenthesis
    if (lastIndex < name.length) {
      parts.push({
        text: name.substring(lastIndex),
        isParenthesized: false
      });
    }

    // If no parentheses were found, return the original name
    if (parts.length === 0) {
      return <span>{name}</span>;
    }

    // Return formatted parts
    return (
      <>
        {parts.map((part, i) =>
          part.isParenthesized ? (
            <TypographySizeWrapper
              key={i}
              component="span"
              textSizeType="note"
              generalDisplaySettings={generalDisplaySettings}
              sx={{
                color: "text.secondary",
              }}
            >
              {part.text}
            </TypographySizeWrapper>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </>
    );
  };

  // Add handler for drug image click
  const handleDrugImageClick = (drugcode) => {
    // console.log("Opening drug image for drugcode:", drugcode);
    if (!drugcode) {
      setSnackbarMessage("無法獲取藥品代碼");
      setSnackbarOpen(true);
      return;
    }

    try {
      // Open drug image viewer
      window.open(`chrome-extension://${chrome.runtime.id}/drug-images.html?code=${drugcode}`, '_blank', 'noopener,noreferrer');

      setSnackbarMessage("已開啟藥品圖片查看器");
    } catch (error) {
      console.error("Error opening drug image:", error);
      setSnackbarMessage("開啟藥品圖片失敗: " + error.message);
    }
    setSnackbarOpen(true);
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Paper sx={{ p: 2, height: "auto" }}>
      <TypographySizeWrapper variant="h6" gutterBottom generalDisplaySettings={generalDisplaySettings}>
        關注西藥 - {trackingDays} 天內
      </TypographySizeWrapper>
      {hasData ? (
        <TableContainer>
          <Table size="small" stickyHeader>
            {/* <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '15%', textAlign: 'center' }}>
                  <TypographySizeWrapper variant="body1" generalDisplaySettings={generalDisplaySettings}>

                  </TypographySizeWrapper>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '32%' }}>
                  <TypographySizeWrapper variant="body1" generalDisplaySettings={generalDisplaySettings}>
                    藥物
                  </TypographySizeWrapper>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '48%' }}>
                  <TypographySizeWrapper variant="body1" generalDisplaySettings={generalDisplaySettings}>
                    日期+院所
                  </TypographySizeWrapper>
                </TableCell>
              </TableRow>
            </TableHead> */}
            <TableBody>
              {tableData.map((row, index) => {
                // Get color information for this row
                const colorInfo = row.isGroupHeader ? getColorInfo(row.colorName) : null;

                return (
                  <TableRow key={index} sx={{
                    '& > *': { borderBottom: row.isGroupHeader && index < tableData.length - 1 && tableData[index + 1].isGroupHeader === false ? 0 : 1 },
                  }}>
                    <TableCell
                      align="center"
                      sx={{
                        backgroundColor: row.isGroupHeader ? colorInfo.light : (() => {
                          // Find the parent group for this medication to get its background color
                          let parentIndex = index;
                          while (parentIndex >= 0 && !tableData[parentIndex].isGroupHeader) {
                            parentIndex--;
                          }

                          if (parentIndex >= 0) {
                            const parentRow = tableData[parentIndex];
                            const parentColorInfo = getColorInfo(parentRow.colorName);
                            return parentColorInfo.light;
                          }

                          return 'transparent';
                        })(),
                        fontWeight: row.isGroupHeader ? 'bold' : 'normal',
                        paddingTop: 0.5,
                        paddingBottom: 0.5,
                        width: '15%',
                        padding: '4px 1px',
                      }}
                    >
                      {row.isGroupHeader ? (
                        getCategoryBadge(row.groupName, colorInfo)
                      ) : (
                        // For non-header rows, find the parent group and show its badge
                        (() => {
                          // Find the parent group for this medication
                          let parentIndex = index;
                          while (parentIndex >= 0 && !tableData[parentIndex].isGroupHeader) {
                            parentIndex--;
                          }

                          if (parentIndex >= 0) {
                            const parentRow = tableData[parentIndex];
                            const parentColorInfo = getColorInfo(parentRow.colorName);

                            // Apply same badge
                            return getCategoryBadge(parentRow.groupName, parentColorInfo);
                          }

                          return null;
                        })()
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 0.75 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <TypographySizeWrapper
                          variant="body2"
                          sx={{ fontWeight: 'medium' }}
                          generalDisplaySettings={generalDisplaySettings}
                        >
                          {formatMedicationName(row.medication.name)}
                          {safeSettings.showExternalDrugImage && row.medication.drugcode && (
                            <Tooltip title="查看藥物圖片">
                              <IconButton
                                size="small"
                                onClick={() => handleDrugImageClick(row.medication.drugcode)}
                                sx={{
                                  ml: 0.5,
                                  opacity: 0.5,
                                  padding: "2px",
                                  display: "inline-flex",
                                  verticalAlign: "text-top",
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
                        {row.medication.genericName && (
                          <TypographySizeWrapper
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.25 }}
                            generalDisplaySettings={generalDisplaySettings}
                          >
                            {row.medication.genericName}
                          </TypographySizeWrapper>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 0.75 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {row.medication.prescriptions.slice(0, 3).map((prescription, i) => {
                          // Determine if this prescription has remaining medication
                          const hasRemainingMed = prescription.drug_left > 0;
                          // Get color information for this row to use for highlighting
                          const chipColorInfo = (() => {
                            if (!hasRemainingMed) return null;

                            // Find the parent group for this medication to get its color
                            let parentIndex = index;
                            while (parentIndex >= 0 && !tableData[parentIndex].isGroupHeader) {
                              parentIndex--;
                            }

                            if (parentIndex >= 0) {
                              return getColorInfo(tableData[parentIndex].colorName);
                            }

                            return null;
                          })();

                          return (
                            <Tooltip
                              key={i}
                              title={
                                <>
                                  {hasRemainingMed ? `餘藥 ${prescription.drug_left} 天` : ''}
                                  {prescription.days && (hasRemainingMed ? ' | ' : '') + `用藥 ${prescription.days} 天`}
                                </>
                              }
                              placement="top"
                            >
                              <Chip
                                size="small"
                                label={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <span>{`${formatDate(prescription.date)}${prescription.hospital ? ` (${prescription.hospital})` : ''}`}</span>
                                    {hasRemainingMed && (
                                      <Box component="span" sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        ml: 0.5,
                                        fontSize: '0.65rem',
                                        color: chipColorInfo?.dark || 'text.secondary'
                                      }}>
                                        <LocalPharmacyIcon sx={{ fontSize: '0.75rem', mr: 0.2 }} />
                                        {prescription.drug_left}天
                                      </Box>
                                    )}
                                  </Box>
                                }
                                sx={{
                                  fontSize: '0.7rem',
                                  height: 'auto',
                                  minHeight: '20px',
                                  bgcolor: hasRemainingMed ? chipColorInfo?.light || 'transparent' : 'transparent',
                                  border: '1px solid',
                                  borderColor: hasRemainingMed ? chipColorInfo?.medium || 'grey.300' : 'grey.300',
                                  py: hasRemainingMed ? 0.2 : 0
                                }}
                              />
                            </Tooltip>
                          );
                        })}
                        {row.medication.prescriptions.length > 3 && (
                          <Tooltip title={row.medication.prescriptions.slice(3).map(p => {
                            const hasRemainingMed = p.drug_left > 0;
                            return `${formatDate(p.date)}${p.hospital ? ` (${p.hospital})` : ''}${p.days ? ` | 用藥 ${p.days} 天` : ''}${hasRemainingMed ? ` | 餘藥 ${p.drug_left} 天` : ''}`;
                          }).join('\n')}>
                            <Chip
                              size="small"
                              label={`+${row.medication.prescriptions.length - 3}`}
                              sx={{
                                fontSize: '0.7rem',
                                height: '20px',
                                bgcolor: 'grey.100',
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : hasMedicationsButNoGroups ? (
        // Fallback view using table format for simplified medication list
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>藥物名稱</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '60%' }}>使用日期資訊</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {simplifiedMedList.slice(0, 10).map((med, index) => {
                const hasRemainingMed = med.drug_left > 0;

                return (
                  <TableRow key={index}>
                    <TableCell sx={{ py: 0.75 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <TypographySizeWrapper
                          variant="body2"
                          sx={{ fontWeight: 'medium' }}
                          generalDisplaySettings={generalDisplaySettings}
                        >
                          {formatMedicationName(med.name)}
                          {safeSettings.showExternalDrugImage && med.drugcode && (
                            <Tooltip title="查看藥物圖片">
                              <IconButton
                                size="small"
                                onClick={() => handleDrugImageClick(med.drugcode)}
                                sx={{
                                  ml: 0.5,
                                  opacity: 0.5,
                                  padding: "2px",
                                  display: "inline-flex",
                                  verticalAlign: "text-top",
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
                        {med.days && (
                          <TypographySizeWrapper
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.25 }}
                            generalDisplaySettings={generalDisplaySettings}
                          >
                            {med.days}天
                          </TypographySizeWrapper>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 0.75 }}>
                      <Tooltip title={hasRemainingMed ? `餘藥 ${med.drug_left} 天${med.days ? ` | 用藥 ${med.days} 天` : ''}` : med.days ? `用藥 ${med.days} 天` : ''}>
                        <Chip
                          size="small"
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <span>{`${formatDate(med.date)}${med.hospital ? ` (${med.hospital})` : ''}`}</span>
                              {hasRemainingMed && (
                                <Box component="span" sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  ml: 0.5,
                                  fontSize: '0.65rem',
                                  color: 'text.secondary'
                                }}>
                                  <LocalPharmacyIcon sx={{ fontSize: '0.75rem', mr: 0.2 }} />
                                  {med.drug_left}天
                                </Box>
                              )}
                            </Box>
                          }
                          sx={{
                            fontSize: '0.7rem',
                            height: 'auto',
                            minHeight: '20px',
                            bgcolor: hasRemainingMed ? alpha('#bdbdbd', 0.2) : 'transparent',
                            border: '1px solid',
                            borderColor: 'grey.300',
                            py: hasRemainingMed ? 0.2 : 0
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {simplifiedMedList.length > 10 && (
            <TypographySizeWrapper
              variant="caption"
              color="text.secondary"
              generalDisplaySettings={generalDisplaySettings}
            >
              還有 {simplifiedMedList.length - 10} 筆資料未顯示
            </TypographySizeWrapper>
          )}
        </TableContainer>
      ) : (
        <Box>
          <TypographySizeWrapper
            variant="caption"
            color="text.secondary"
            generalDisplaySettings={generalDisplaySettings}
          >
            暫無資料
          </TypographySizeWrapper>
          {/* <TypographySizeWrapper
            variant="caption"
            color="text.secondary"
            generalDisplaySettings={generalDisplaySettings}
            sx={{ display: 'block', mt: 1 }}
          >
            Debug Info: Input medications: {groupedMedications.length}, Recent: {recentMedications.length},
            Unique: {Object.keys(groupedByName).length}, Colors: {Object.keys(colorGroupedMeds).length}
          </TypographySizeWrapper> */}
        </Box>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Paper>
  );
};

export default Overview_ImportantMedications;