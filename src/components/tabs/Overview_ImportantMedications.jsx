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
} from "@mui/material";
// Import icons for medication categories
import MedicationIcon from '@mui/icons-material/Medication';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import HealingIcon from '@mui/icons-material/Healing';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { isWithinLast90Days, getMedicationColorGroup, formatDate } from "./Overview_utils";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

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
    simplifyMedicineName: settings.simplifyMedicineName !== undefined ? settings.simplifyMedicineName : true,
    showGenericName: settings.showGenericName !== undefined ? settings.showGenericName : false,
    showDiagnosis: settings.showDiagnosis !== undefined ? settings.showDiagnosis : true,
    showATC5Name: settings.showATC5Name !== undefined ? settings.showATC5Name : false,
    enableATC5Colors: settings.enableATC5Colors !== undefined ? settings.enableATC5Colors : true,
    atc5Groups: settings.atc5Groups || {
      NSAID: ['M01AA', 'M01AB', 'M01AC', 'M01AE', 'M01AG', 'M01AH'],
      ACEI: ['C09AA', 'C09BA', 'C09BB'],
      ARB: ['C09CA', 'C09DA', 'C09DB'],
      STATIN: ['C10AA', 'C10BA', 'C10BX']
    },
    atc5ColorGroups: settings.atc5ColorGroups || {
      red: ['NSAID'],
      orange: ['ARB', 'ACEI', 'STATIN'],
      green: []
    }
  };
  
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
            colorGroup
          });
        }
      }
    });
  });
  
  // Helper function to check if date is within last N days
  function isWithinLastNDays(dateStr, days) {
    if (!dateStr) {
      return false;
    }
    
    // Parse the date string, handling different formats
    let date;
    try {
      // First try direct parsing
      date = new Date(dateStr);
      
      // If invalid, try common format transformations
      if (isNaN(date.getTime())) {
        // Try DD/MM/YYYY format
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          // Assume YYYY/MM/DD if first part is 4 digits
          if (parts[0].length === 4) {
            date = new Date(parts[0], parts[1] - 1, parts[2]);
          } else {
            // Otherwise assume DD/MM/YYYY
            date = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        }
        // Try YYYY-MM-DD format
        else if (dateStr.includes('-')) {
          date = new Date(dateStr.replace(/-/g, '/'));
        }
      }
    } catch (e) {
      return false;
    }
    
    // Verify the date is valid
    if (isNaN(date.getTime())) {
      return false;
    }
    
    const now = new Date();
    
    // Calculate the threshold date (N days ago)
    const timeThreshold = now.getTime() - days * 24 * 60 * 60 * 1000;
    
    // Check if the date is after the threshold
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
        colorGroup: med.colorGroup,
        prescriptions: []
      };
    }
    
    groupedByName[key].prescriptions.push({
      date: med.start_date,
      hospital: med.hospital,
      days: med.days
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
      days: med.days
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
    Object.entries(colorGroupedMeds).forEach(([colorName, colorData]) => {
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

  // Helper function to get color info based on ATC5 group
  const getColorInfo = (colorName) => {
    const colorMap = {
      'red': {
        light: alpha('#f44336', 0.15),
        medium: '#e53935',
        dark: '#b71c1c',
        name: '紅色'
      },
      'orange': {
        light: alpha('#ff9800', 0.18),
        medium: '#fb8c00',
        dark: '#e65100',
        name: '橘色'
      },
      'green': {
        light: alpha('#4caf50', 0.2),
        medium: '#43a047',
        dark: '#1b5e20',
        name: '綠色'
      }
    };
    
    return colorMap[colorName] || {
      light: alpha('#e0e0e0', 0.3),
      medium: '#bdbdbd',
      dark: '#757575',
      name: '灰色'
    };
  };

  // Helper function to get the appropriate icon for each group
  const getCategoryIcon = (groupName) => {
    const iconMap = {
      'NSAID': <MedicationIcon fontSize="small" sx={{ fontSize: '0.85rem' }} />,
      'ACEI': <LocalPharmacyIcon fontSize="small" sx={{ fontSize: '0.85rem' }} />,
      'ARB': <HealingIcon fontSize="small" sx={{ fontSize: '0.85rem' }} />,
      'STATIN': <HealthAndSafetyIcon fontSize="small" sx={{ fontSize: '0.85rem' }} />
    };
    
    return iconMap[groupName] || <MedicationIcon fontSize="small" sx={{ fontSize: '0.85rem' }} />;
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

  return (
    <Paper sx={{ p: 2, height: "100%" }}>
      <TypographySizeWrapper variant="h6" gutterBottom generalDisplaySettings={generalDisplaySettings}>
        關注西藥 - {trackingDays} 天內
      </TypographySizeWrapper>
      {hasData ? (
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '15%', textAlign: 'center' }}>
                  <TypographySizeWrapper variant="body1" generalDisplaySettings={generalDisplaySettings}>
                    分類
                  </TypographySizeWrapper>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '32%' }}>
                  <TypographySizeWrapper variant="body1" generalDisplaySettings={generalDisplaySettings}>
                    藥物名稱
                  </TypographySizeWrapper>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '48%' }}>
                  <TypographySizeWrapper variant="body1" generalDisplaySettings={generalDisplaySettings}>
                    使用日期資訊
                  </TypographySizeWrapper>
                </TableCell>
              </TableRow>
            </TableHead>
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
                          {row.medication.name}
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
                        {row.medication.prescriptions.slice(0, 3).map((prescription, i) => (
                          <Chip 
                            key={i}
                            size="small"
                            label={`${formatDate(prescription.date)}${prescription.hospital ? ` (${prescription.hospital})` : ''}`}
                            sx={{ 
                              fontSize: '0.7rem', 
                              height: '20px',
                              bgcolor: 'transparent',
                              border: '1px solid',
                              borderColor: 'grey.300',
                            }}
                          />
                        ))}
                        {row.medication.prescriptions.length > 3 && (
                          <Tooltip title={row.medication.prescriptions.slice(3).map(p => 
                            `${formatDate(p.date)}${p.hospital ? ` (${p.hospital})` : ''}`
                          ).join('\n')}>
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
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>藥物名稱</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '60%' }}>使用日期資訊</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {simplifiedMedList.slice(0, 10).map((med, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ py: 0.75 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <TypographySizeWrapper 
                        variant="body2" 
                        sx={{ fontWeight: 'medium' }}
                        generalDisplaySettings={generalDisplaySettings}
                      >
                        {med.name}
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
                    <Chip 
                      size="small"
                      label={`${formatDate(med.date)}${med.hospital ? ` (${med.hospital})` : ''}`}
                      sx={{ 
                        fontSize: '0.7rem', 
                        height: '20px',
                        bgcolor: 'transparent',
                        border: '1px solid',
                        borderColor: 'grey.300',
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
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
    </Paper>
  );
};

export default Overview_ImportantMedications;