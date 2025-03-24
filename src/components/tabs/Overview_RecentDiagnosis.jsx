/**
 * Overview_RecentDiagnosis Component
 * 
 * This component displays recent diagnosis information from the past 180 days,
 * categorized by visit type (outpatient/emergency/inpatient).
 * - Outpatient and emergency diagnoses are sorted by frequency (most frequent first)
 * - Inpatient diagnoses show the first occurrence with date
 * - Each category shows up to 5 items, with a tooltip for viewing all if more than 5 items
 * - Vaccine records (ICD Z23-Z27) are displayed separately in their own category
 */

import React, { useMemo } from "react";
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Table, 
  TableBody, 
  TableRow, 
  TableCell,
  Tooltip,
  Badge,
  Divider,
  Chip
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import InfoIcon from '@mui/icons-material/Info';
import GrassIcon from '@mui/icons-material/Grass';
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const Overview_RecentDiagnosis = ({ 
  groupedMedications = [],
  groupedChineseMeds = [],
  generalDisplaySettings = {},
  trackingDays = 180
}) => {
  // Process diagnosis data from medication and Chinese medicine records
  const diagnosisData = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - trackingDays); 
    
    const outpatientDiagnoses = {};
    const emergencyDiagnoses = [];  // Changed from object to array to store date info
    const inpatientDiagnoses = [];
    const vaccineRecords = [];      // New array for vaccine records
    
    // Helper function to safely parse dates in various formats
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      
      // Handle yyyy/mm/dd and yyyy-mm-dd formats
      let normalizedDate = dateStr.replace(/\//g, '-');
      
      // Try parsing the date
      const parsedDate = new Date(normalizedDate);
      
      // Check if date is valid
      if (isNaN(parsedDate.getTime())) {
        return null;
      }
      
      return parsedDate;
    };
    
    // Helper function to check if an ICD code is a vaccine code
    const isVaccineCode = (icdCode) => {
      if (!icdCode) return false;
      
      // Check if it starts with Z23, Z24, Z25, Z26, or Z27
      const normalizedCode = icdCode.toUpperCase();
      return normalizedCode.startsWith('Z23') || 
             normalizedCode.startsWith('Z24') || 
             normalizedCode.startsWith('Z25') || 
             normalizedCode.startsWith('Z26') || 
             normalizedCode.startsWith('Z27');
    };
    
    // Process western medications
    groupedMedications.forEach(group => {
      // Skip entries older than the tracking period
      const groupDate = parseDate(group.date);
      if (!groupDate) {
        return;
      }
      
      if (groupDate < cutoffDate) {
        return;
      }
      
      // Skip entries without diagnosis info
      if (!group.icd_code || !group.icd_name) {
        return;
      }
      
      // Normalize ICD code to handle case sensitivity issues
      const normalizedIcdCode = group.icd_code.toUpperCase();
      
      const diagnosisKey = `${normalizedIcdCode}|${group.icd_name}`;
      
      // 檢查診斷碼和藥物，只有當診斷碼是疫苗相關且至少有一個藥物是J07開頭ATC碼時，才將其視為疫苗記錄
      if (isVaccineCode(normalizedIcdCode)) {
        // 檢查是否有J07開頭的疫苗藥物
        let hasVaccineMedication = false;
        let medicationNames = [];
        
        if (Array.isArray(group.medications) && group.medications.length > 0) {
          // 過濾出有J07開頭ATC碼的藥物
          const vaccineFilteredMeds = group.medications.filter(med => med.atc_code && med.atc_code.startsWith('J07'));
          
          // 如果有J07藥物，則記錄該筆為疫苗記錄
          if (vaccineFilteredMeds.length > 0) {
            hasVaccineMedication = true;
            medicationNames = vaccineFilteredMeds.map(med => med.name || med.drugName || '').filter(Boolean);
          }
        } else if (group.name || group.drugName) {
          // 單一藥物情況
          if (group.atc_code && group.atc_code.startsWith('J07')) {
            hasVaccineMedication = true;
            medicationNames = [group.name || group.drugName];
          }
        }
        
        // 只有當既有疫苗診斷碼又有J07藥物時，才加入疫苗記錄
        if (hasVaccineMedication && medicationNames.length > 0) {
          vaccineRecords.push({
          date: group.date,
          code: normalizedIcdCode,
          name: group.icd_name,
          hospital: group.hosp || group.hospital || '',
          medications: medicationNames,
          key: diagnosisKey,
          isChineseMed: false
        });
        }
      } else {
        // Normal diagnosis processing
        if (group.visitType === "門診" || group.visitType === "藥局") {
          // Always increment the count by 1 for each record
          outpatientDiagnoses[diagnosisKey] = {
            count: (outpatientDiagnoses[diagnosisKey]?.count || 0) + 1,
            isChineseMed: false
          };
        } else if (group.visitType === "急診") {
          // For emergency, just add one entry per record
          emergencyDiagnoses.push({
            date: group.date,
            code: normalizedIcdCode,
            name: group.icd_name,
            key: diagnosisKey,
            isChineseMed: false
          });
        } else if (group.visitType === "住診") {
          // For inpatient, still just record the first occurrence
          const existingEntry = inpatientDiagnoses.find(entry => entry.code === normalizedIcdCode);
          if (!existingEntry) {
            inpatientDiagnoses.push({
              date: group.date,
              code: normalizedIcdCode,
              name: group.icd_name,
              key: diagnosisKey,
              isChineseMed: false
            });
          }
        } else {
          // Default to outpatient for any other visit type (including "藥局" if not caught earlier)
          outpatientDiagnoses[diagnosisKey] = {
            count: (outpatientDiagnoses[diagnosisKey]?.count || 0) + 1,
            isChineseMed: false
          };
        }
      }
    });
    
    // Process Chinese medications - apply the same fix
    groupedChineseMeds.forEach(group => {
      // Skip entries older than the tracking period
      const groupDate = parseDate(group.date);
      if (!groupDate || groupDate < cutoffDate) return;
      
      // Skip entries without diagnosis info
      if (!group.icd_code || !group.icd_name) return;
      
      // Normalize ICD code
      const normalizedIcdCode = group.icd_code.toUpperCase();
      const diagnosisKey = `${normalizedIcdCode}|${group.icd_name}`;
      
      // 檢查診斷碼和藥物，只有當診斷碼是疫苗相關且至少有一個藥物是J07開頭ATC碼時，才將其視為疫苗記錄
      if (isVaccineCode(normalizedIcdCode)) {
        // 檢查是否有J07開頭的疫苗藥物
        let hasVaccineMedication = false;
        let medicationNames = [];
        
        if (Array.isArray(group.medications) && group.medications.length > 0) {
          // 過濾出有J07開頭ATC碼的藥物
          const vaccineFilteredMeds = group.medications.filter(med => med.atc_code && med.atc_code.startsWith('J07'));
          
          // 如果有J07藥物，則記錄該筆為疫苗記錄
          if (vaccineFilteredMeds.length > 0) {
            hasVaccineMedication = true;
            medicationNames = vaccineFilteredMeds.map(med => med.name || med.drugName || '').filter(Boolean);
          }
        } else if (group.name || group.drugName) {
          // 單一藥物情況
          if (group.atc_code && group.atc_code.startsWith('J07')) {
            hasVaccineMedication = true;
            medicationNames = [group.name || group.drugName];
          }
        }
        
        // 只有當既有疫苗診斷碼又有J07藥物時，才加入疫苗記錄
        if (hasVaccineMedication && medicationNames.length > 0) {
          vaccineRecords.push({
          date: group.date,
          code: normalizedIcdCode,
          name: group.icd_name,
          hospital: group.hosp || group.hospital || '',
          medications: medicationNames,
          key: diagnosisKey,
          isChineseMed: true
        });
        }
      } else {
        // Fix: Same approach as with western medications
        if (group.visitType === "門診" || group.visitType === "藥局") {
          // Always increment the count by 1 for each record
          const existing = outpatientDiagnoses[diagnosisKey];
          outpatientDiagnoses[diagnosisKey] = {
            count: (existing?.count || 0) + 1,
            isChineseMed: true
          };
        } else if (group.visitType === "急診") {
          // For emergency, just add one entry per record
          emergencyDiagnoses.push({
            date: group.date,
            code: normalizedIcdCode,
            name: group.icd_name,
            key: diagnosisKey,
            isChineseMed: true
          });
        } else if (group.visitType === "住診") {
          // For inpatient, still just record the first occurrence
          const existingEntry = inpatientDiagnoses.find(entry => entry.code === normalizedIcdCode);
          if (!existingEntry) {
            inpatientDiagnoses.push({
              date: group.date,
              code: normalizedIcdCode,
              name: group.icd_name,
              key: diagnosisKey,
              isChineseMed: true
            });
          }
        } else {
          // Default to outpatient for any other visit type (including "藥局" if not caught earlier)
          const existing = outpatientDiagnoses[diagnosisKey];
          outpatientDiagnoses[diagnosisKey] = {
            count: (existing?.count || 0) + 1,
            isChineseMed: true
          };
        }
      }
    });
    
    // Convert to arrays and sort by frequency (most frequent first)
    const sortedOutpatient = Object.entries(outpatientDiagnoses).map(([key, data]) => {
      const [code, name] = key.split('|');
      return { 
        code, 
        name, 
        count: data.count, 
        isChineseMed: data.isChineseMed,
        key 
      };
    }).sort((a, b) => {
      // First sort by count (descending)
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      // If counts are the same, sort by ICD code (ascending)
      return a.code.localeCompare(b.code);
    });
    
    // Emergency diagnoses - sort by date (newest first)
    const sortedEmergency = [...emergencyDiagnoses].sort((a, b) => {
      // Handle different date formats (yyyy/mm/dd or yyyy-mm-dd)
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      
      // If either date is invalid, fall back to string comparison
      if (!dateA || !dateB) {
        return a.date.localeCompare(b.date);
      }
      
      return dateB - dateA;
    });
    
    // Inpatient diagnoses are already an array - sort by date (newest first)
    const sortedInpatient = [...inpatientDiagnoses].sort((a, b) => {
      // Handle different date formats (yyyy/mm/dd or yyyy-mm-dd)
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      
      // If either date is invalid, fall back to string comparison
      if (!dateA || !dateB) {
        return a.date.localeCompare(b.date);
      }
      
      return dateB - dateA;
    });
    
    // Sort vaccine records by date (newest first)
    const sortedVaccines = [...vaccineRecords].sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      
      if (!dateA || !dateB) {
        return a.date.localeCompare(b.date);
      }
      
      return dateB - dateA;
    });
    
    return {
      outpatient: sortedOutpatient,
      emergency: sortedEmergency,
      inpatient: sortedInpatient,
      vaccines: sortedVaccines
    };
  }, [groupedMedications, groupedChineseMeds, trackingDays]);
  
  // Check if there's any diagnosis data
  const hasDiagnoses = useMemo(() => {
    return diagnosisData.outpatient.length > 0 || 
           diagnosisData.emergency.length > 0 || 
           diagnosisData.inpatient.length > 0 ||
           diagnosisData.vaccines.length > 0;
  }, [diagnosisData]);
  
  // Render a diagnosis category table row
  const renderDiagnosisCategory = (title, diagnoses, isInpatient = false, isEmergency = false, isVaccine = false) => {
    // Return nothing if no diagnoses in this category
    if (diagnoses.length === 0) return null;
    
    // Display up to 5 diagnoses, then show tooltip for more
    const visibleDiagnoses = diagnoses.slice(0, 5);
    const hasMore = diagnoses.length > 5;
    
    // Determine color based on category
    const categoryColor = isEmergency ? "#c62828" : 
                         (isInpatient ? "#388e3c" : 
                         (isVaccine ? "#1565c0" : "primary.main"));
    
    // Get background color (lighter version of the category color)
    const bgColor = isEmergency ? alpha("#c62828", 0.15) : 
                   (isInpatient ? alpha("#388e3c", 0.2) : 
                   (isVaccine ? alpha("#1565c0", 0.18) : alpha("#2196f3", 0.15)));
    
    // Convert full title to single character
    const shortTitle = title === "門診" ? "門" : 
                      (title === "急診" ? "急" : 
                      (title === "住診" ? "住" : 
                      (title === "疫苗" ? "疫" : title)));
    
    return (
      <TableRow>
        <TableCell 
          component="th" 
          scope="row" 
          align="center"
          sx={{ 
            width: '10%',
            verticalAlign: 'middle', // Center the content vertically
            borderBottom: 'none', 
            padding: '8px 2px',
            backgroundColor: bgColor,
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%', // Make it circular
              border: `1px solid ${categoryColor}`,
              backgroundColor: 'white',
              color: categoryColor,
              fontSize: '0.75rem',
              width: '28px',
              height: '28px',
              margin: '0 auto',
              fontWeight: 'bold',
            }}
          >
            <TypographySizeWrapper
              textSizeType="content"
              generalDisplaySettings={generalDisplaySettings}
              sx={{ fontSize: '0.85rem', fontWeight: 'bold', lineHeight: 1 }}
            >
              {shortTitle}
            </TypographySizeWrapper>
          </Box>
        </TableCell>
        <TableCell sx={{ borderBottom: 'none', padding: '8px 0' }}>
          <Box>
            {visibleDiagnoses.map((diagnosis, index) => (
              <Box key={diagnosis.key} sx={{ display: 'flex', alignItems: 'center', mb: 0.8 }}>
                {(isInpatient || isEmergency) && (
                  <Chip 
                    size="small"
                    label={`${diagnosis.date}${diagnosis.hospital ? ` (${diagnosis.hospital})` : ''}`}
                    sx={{ 
                      fontSize: '0.7rem', 
                      height: '20px',
                      mr: 1,
                      bgcolor: 'transparent',
                      border: '1px solid',
                      borderColor: categoryColor,
                      color: categoryColor,
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                )}
                
                {isVaccine && (
                  <Box sx={{ mr: 1 }}>
                    <Chip 
                      size="small"
                      label={diagnosis.date}
                      sx={{ 
                        fontSize: '0.7rem', 
                        height: '20px',
                        mb: 0.3,
                        bgcolor: 'transparent',
                        border: '1px solid',
                        borderColor: categoryColor,
                        color: categoryColor,
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                    {diagnosis.hospital && (
                      <Chip 
                        size="small"
                        label={diagnosis.hospital}
                        sx={{ 
                          fontSize: '0.65rem', 
                          height: '18px',
                          bgcolor: alpha(categoryColor, 0.08),
                          color: categoryColor,
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    )}
                  </Box>
                )}
                
                <TypographySizeWrapper
                  textSizeType="content"
                  generalDisplaySettings={generalDisplaySettings}
                  sx={{ mr: 1 }}
                >
                  {isVaccine ? (
                    // For vaccines, show medication names only (date and hospital now in chip)
                    <>{diagnosis.medications?.join(', ')}</>
                  ) : isInpatient || isEmergency ? (
                    // For inpatient and emergency, show the diagnosis name only
                    <>{diagnosis.name}</>
                  ) : (
                    // For outpatient, show code, name and count (no change)
                    <>{diagnosis.code} {diagnosis.name}</>
                  )}
                </TypographySizeWrapper>
                
                {/* Add Chinese Medicine icon if diagnosis is from Chinese medicine */}
                {diagnosis.isChineseMed && (
                  <Tooltip title="中醫診斷">
                    <GrassIcon
                      fontSize="small"
                      color="primary"
                      sx={{ fontSize: '0.9rem', mr: 1.5, opacity: 0.7 }}
                    />
                  </Tooltip>
                )}
                
                {!isInpatient && !isEmergency && !isVaccine && diagnosis.count > 1 && (
                  <Badge 
                    badgeContent={diagnosis.count} 
                    color="primary" 
                    sx={{ 
                      '& .MuiBadge-badge': { 
                        fontSize: '0.7rem', 
                        height: '16px', 
                        minWidth: '16px',
                        backgroundColor: 'primary.main',
                        color: 'white'
                      } 
                    }}
                  />
                )}
              </Box>
            ))}
            
            {hasMore && (
              <Tooltip 
                title={
                  <Box>
                    {diagnoses.slice(5).map((diagnosis) => (
                      <Box key={diagnosis.key} sx={{ mb: 0.5 }}>
                        {isVaccine ? (
                          <>{diagnosis.date}{diagnosis.hospital ? ` (${diagnosis.hospital})` : ''}: {diagnosis.medications?.join(', ')}</>
                        ) : isInpatient ? (
                          <>{diagnosis.date}{diagnosis.hospital ? ` (${diagnosis.hospital})` : ''}: {diagnosis.name}</>
                        ) : isEmergency ? (
                          <>{diagnosis.date}{diagnosis.hospital ? ` (${diagnosis.hospital})` : ''}: {diagnosis.name}</>
                        ) : (
                          <>{diagnosis.code} {diagnosis.name} ({diagnosis.count})</>
                        )}
                        {diagnosis.isChineseMed && " (中醫)"}
                      </Box>
                    ))}
                  </Box>
                }
                arrow
              >
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <InfoIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                  <TypographySizeWrapper
                    textSizeType="note"
                    generalDisplaySettings={generalDisplaySettings}
                    color="text.secondary"
                  >
                    還有 {diagnoses.length - 5} 筆資料
                  </TypographySizeWrapper>
                </Box>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>
    );
  };
  
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <TypographySizeWrapper
          variant="h6"
          textSizeType="title"
          generalDisplaySettings={generalDisplaySettings}
          gutterBottom
        >
          半年內就醫診斷
        </TypographySizeWrapper>
        
        {!hasDiagnoses ? (
          <TypographySizeWrapper
            textSizeType="content"
            generalDisplaySettings={generalDisplaySettings}
            color="text.secondary"
          >
            無近期診斷資料
          </TypographySizeWrapper>
        ) : (
          <Table size="small" sx={{ '& .MuiTableCell-root': { padding: '4px 8px' } }}>
            <TableBody>
              {/* Render the outpatient diagnoses */}
              {renderDiagnosisCategory("門診", diagnosisData.outpatient)}
              
              {/* Add divider if there are more categories */}
              {diagnosisData.outpatient.length > 0 && 
               (diagnosisData.emergency.length > 0 || 
                diagnosisData.inpatient.length > 0 ||
                diagnosisData.vaccines.length > 0) && (
                <TableRow>
                  <TableCell colSpan={2} sx={{ padding: '4px 0' }}>
                    <Divider />
                  </TableCell>
                </TableRow>
              )}
              
              {/* Render emergency diagnoses */}
              {renderDiagnosisCategory("急診", diagnosisData.emergency, false, true)}
              
              {/* Add divider if needed */}
              {diagnosisData.emergency.length > 0 && 
               (diagnosisData.inpatient.length > 0 || 
                diagnosisData.vaccines.length > 0) && (
                <TableRow>
                  <TableCell colSpan={2} sx={{ padding: '4px 0' }}>
                    <Divider />
                  </TableCell>
                </TableRow>
              )}
              
              {/* Render inpatient diagnoses */}
              {renderDiagnosisCategory("住診", diagnosisData.inpatient, true)}
              
              {/* Add divider before vaccines if needed */}
              {diagnosisData.inpatient.length > 0 && 
               diagnosisData.vaccines.length > 0 && (
                <TableRow>
                  <TableCell colSpan={2} sx={{ padding: '4px 0' }}>
                    <Divider />
                  </TableCell>
                </TableRow>
              )}
              
              {/* Render vaccine records */}
              {renderDiagnosisCategory("疫苗", diagnosisData.vaccines, false, false, true)}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default Overview_RecentDiagnosis;
