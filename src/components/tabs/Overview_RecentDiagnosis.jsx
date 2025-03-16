/**
 * Overview_RecentDiagnosis Component
 * 
 * This component displays recent diagnosis information from the past 90 days,
 * categorized by visit type (outpatient/emergency/inpatient).
 * - Outpatient and emergency diagnoses are sorted by frequency (most frequent first)
 * - Inpatient diagnoses show the first occurrence with date
 * - Each category shows up to 5 items, with a tooltip for viewing all if more than 5 items
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
  Divider
} from "@mui/material";
import InfoIcon from '@mui/icons-material/Info';
import GrassIcon from '@mui/icons-material/Grass';
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const Overview_RecentDiagnosis = ({ 
  groupedMedications = [],
  groupedChineseMeds = [],
  generalDisplaySettings = {},
  trackingDays = 90
}) => {
  // Process diagnosis data from medication and Chinese medicine records
  const diagnosisData = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - trackingDays); // 90 days ago
    
    const outpatientDiagnoses = {};
    const emergencyDiagnoses = [];  // Changed from object to array to store date info
    const inpatientDiagnoses = [];
    
    // Process western medications
    groupedMedications.forEach(group => {
      // Skip entries older than the tracking period
      const groupDate = new Date(group.date.replace(/\//g, '-'));
      if (groupDate < cutoffDate) return;
      
      // Skip entries without diagnosis info
      if (!group.icd_code || !group.icd_name) return;
      
      const diagnosisKey = `${group.icd_code}|${group.icd_name}`;
      
      if (group.visitType === "門診") {
        outpatientDiagnoses[diagnosisKey] = {
          count: (outpatientDiagnoses[diagnosisKey]?.count || 0) + 1,
          isChineseMed: false
        };
      } else if (group.visitType === "急診") {
        // For emergency, store the full diagnosis info with date
        emergencyDiagnoses.push({
          date: group.date,
          code: group.icd_code,
          name: group.icd_name,
          key: diagnosisKey,
          isChineseMed: false
        });
      } else if (group.visitType === "住診") {
        // For inpatient, check if this ICD code is already recorded
        const existingEntry = inpatientDiagnoses.find(entry => entry.code === group.icd_code);
        if (!existingEntry) {
          inpatientDiagnoses.push({
            date: group.date,
            code: group.icd_code,
            name: group.icd_name,
            key: diagnosisKey,
            isChineseMed: false
          });
        }
      }
    });
    
    // Process Chinese medications
    groupedChineseMeds.forEach(group => {
      // Skip entries older than the tracking period
      const groupDate = new Date(group.date.replace(/\//g, '-'));
      if (groupDate < cutoffDate) return;
      
      // Skip entries without diagnosis info
      if (!group.icd_code || !group.icd_name) return;
      
      const diagnosisKey = `${group.icd_code}|${group.icd_name}`;
      
      // Use the visitType field to determine the category
      // Chinese med is typically outpatient, but we'll use the field to be sure
      if (group.visitType === "門診") {
        // If diagnosis already exists, increase count but mark as Chinese med
        const existing = outpatientDiagnoses[diagnosisKey];
        outpatientDiagnoses[diagnosisKey] = {
          count: (existing?.count || 0) + 1,
          isChineseMed: true
        };
      } else if (group.visitType === "急診") {
        // For emergency, store the full diagnosis info with date
        emergencyDiagnoses.push({
          date: group.date,
          code: group.icd_code,
          name: group.icd_name,
          key: diagnosisKey,
          isChineseMed: true
        });
      } else if (group.visitType === "住診") {
        // For inpatient, check if this ICD code is already recorded
        const existingEntry = inpatientDiagnoses.find(entry => entry.code === group.icd_code);
        if (!existingEntry) {
          inpatientDiagnoses.push({
            date: group.date,
            code: group.icd_code,
            name: group.icd_name,
            key: diagnosisKey,
            isChineseMed: true
          });
        }
      } else {
        // Default to outpatient for any other visit type
        const existing = outpatientDiagnoses[diagnosisKey];
        outpatientDiagnoses[diagnosisKey] = {
          count: (existing?.count || 0) + 1,
          isChineseMed: true
        };
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
    }).sort((a, b) => b.count - a.count);
    
    // Emergency diagnoses - sort by date (newest first)
    const sortedEmergency = [...emergencyDiagnoses].sort((a, b) => {
      // Handle different date formats (yyyy/mm/dd or yyyy-mm-dd)
      const dateA = new Date(a.date.replace(/\//g, '-'));
      const dateB = new Date(b.date.replace(/\//g, '-'));
      return dateB - dateA;
    });
    
    // Inpatient diagnoses are already an array - sort by date (newest first)
    const sortedInpatient = [...inpatientDiagnoses].sort((a, b) => {
      // Handle different date formats (yyyy/mm/dd or yyyy-mm-dd)
      const dateA = new Date(a.date.replace(/\//g, '-'));
      const dateB = new Date(b.date.replace(/\//g, '-'));
      return dateB - dateA;
    });
    
    return {
      outpatient: sortedOutpatient,
      emergency: sortedEmergency,
      inpatient: sortedInpatient
    };
  }, [groupedMedications, groupedChineseMeds, trackingDays]);
  
  // Check if there's any diagnosis data
  const hasDiagnoses = useMemo(() => {
    return diagnosisData.outpatient.length > 0 || 
           diagnosisData.emergency.length > 0 || 
           diagnosisData.inpatient.length > 0;
  }, [diagnosisData]);
  
  // Render a diagnosis category table row
  const renderDiagnosisCategory = (title, diagnoses, isInpatient = false, isEmergency = false) => {
    // Return nothing if no diagnoses in this category
    if (diagnoses.length === 0) return null;
    
    // Display up to 5 diagnoses, then show tooltip for more
    const visibleDiagnoses = diagnoses.slice(0, 5);
    const hasMore = diagnoses.length > 5;
    
    return (
      <TableRow>
        <TableCell 
          component="th" 
          scope="row" 
          sx={{ 
            width: '20%',
            verticalAlign: 'top',
            borderBottom: 'none', 
            padding: '8px 8px 8px 0', 
            fontWeight: 'bold',
            color: title === "急診" ? "#c62828" : (title === "住診" ? "#388e3c" : "primary.main")
          }}
        >
          <TypographySizeWrapper
            textSizeType="content"
            generalDisplaySettings={generalDisplaySettings}
          >
            {title}
          </TypographySizeWrapper>
        </TableCell>
        <TableCell sx={{ borderBottom: 'none', padding: '8px 0' }}>
          <Box>
            {visibleDiagnoses.map((diagnosis, index) => (
              <Box key={diagnosis.key} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <TypographySizeWrapper
                  textSizeType="content"
                  generalDisplaySettings={generalDisplaySettings}
                  sx={{ mr: 1 }}
                >
                  {isInpatient || isEmergency ? (
                    // For inpatient and emergency, show date and name
                    <>{diagnosis.date}: {diagnosis.name}</>
                  ) : (
                    // For outpatient, show code, name and count
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
                
                {!isInpatient && !isEmergency && diagnosis.count > 1 && (
                  <Badge 
                    badgeContent={diagnosis.count} 
                    color="primary" 
                    sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: '16px', minWidth: '16px' } }}
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
                        {isInpatient ? (
                          <>{diagnosis.date}: {diagnosis.code} {diagnosis.name}</>
                        ) : isEmergency ? (
                          <>{diagnosis.date}: {diagnosis.name}</>
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
          近期就醫診斷 - {trackingDays} 天
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
              {renderDiagnosisCategory("門診", diagnosisData.outpatient)}
              
              {diagnosisData.outpatient.length > 0 && (diagnosisData.emergency.length > 0 || diagnosisData.inpatient.length > 0) && (
                <TableRow>
                  <TableCell colSpan={2} sx={{ padding: '4px 0' }}>
                    <Divider />
                  </TableCell>
                </TableRow>
              )}
              
              {renderDiagnosisCategory("急診", diagnosisData.emergency, false, true)}
              
              {diagnosisData.emergency.length > 0 && diagnosisData.inpatient.length > 0 && (
                <TableRow>
                  <TableCell colSpan={2} sx={{ padding: '4px 0' }}>
                    <Divider />
                  </TableCell>
                </TableRow>
              )}
              
              {renderDiagnosisCategory("住診", diagnosisData.inpatient, true)}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default Overview_RecentDiagnosis;
