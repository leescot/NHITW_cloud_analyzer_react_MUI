/**
 * Overview Component
 * 
 * This component displays an overview of patient information by integrating several smaller components:
 * - Important medications (filtered by ATC5 groups and colors)
 * - Patient summary data
 * - Lab test results
 * - Allergy records
 * - Surgery records
 * - Discharge records
 * - Imaging tests
 * 
 * This file serves as the integration point for all the separate components.
 */

import React, { useMemo } from "react";
import { Grid, Box } from "@mui/material";

// Import individual components
import Overview_ImportantMedications from "./Overview_ImportantMedications";
import Overview_LabTests from "./Overview_LabTests";
import Overview_PatientSummary from "./Overview_PatientSummary";
import Overview_AllergyRecords from "./Overview_AllergyRecords";
import Overview_SurgeryRecords from "./Overview_SurgeryRecords";
import Overview_DischargeRecords from "./Overview_DischargeRecords";
import Overview_ImagingTests from "./Overview_ImagingTests";
import { DEFAULT_LAB_TESTS, DEFAULT_IMAGE_TESTS } from '../settings/OverviewSettings';

const Overview = ({ 
  dashboardData, 
  allergyData, 
  surgeryData, 
  dischargeData, 
  patientSummaryData,
  groupedMedications = [],
  groupedLabs = [],
  labData,
  imagingData = { withReport: [], withoutReport: [] },
  settings = {},
  overviewSettings = { 
    medicationTrackingDays: 90, 
    labTrackingDays: 90, 
    imageTrackingDays: 90,
    focusedLabTests: DEFAULT_LAB_TESTS,
    focusedImageTests: DEFAULT_IMAGE_TESTS
  },
  generalDisplaySettings = { titleTextSize: 'medium', contentTextSize: 'medium', noteTextSize: 'small' },
  labSettings = {}
}) => {
  // Check if components have data
  const hasMedications = useMemo(() => groupedMedications && groupedMedications.length > 0, [groupedMedications]);
  const hasAllergyData = useMemo(() => allergyData && allergyData.length > 0, [allergyData]);
  const hasSurgeryData = useMemo(() => surgeryData && surgeryData.length > 0, [surgeryData]);
  const hasDischargeData = useMemo(() => dischargeData && dischargeData.length > 0, [dischargeData]);

  return (
    <Box sx={{ p: 0 }}>
      <Grid container spacing={1}>
        {/* 三欄式布局 */}
        {/* 重點藥物 - 左欄 (1/3) - If no data, reduce width */}
        <Grid item xs={12} md={hasMedications ? 4.5 : 3}>
          <Overview_ImportantMedications 
            groupedMedications={groupedMedications} 
            settings={settings}
            overviewSettings={overviewSettings}
            generalDisplaySettings={generalDisplaySettings}
          />
        </Grid>
        
        {/* 重點檢驗 - 中欄 (1/3) */}
        <Grid item xs={12} md={4.5}>
          <Overview_LabTests 
            groupedLabs={groupedLabs}
            labData={labData}
            overviewSettings={overviewSettings}
            generalDisplaySettings={generalDisplaySettings}
            labSettings={labSettings}
          />
        </Grid>
        
        {/* 右欄 (1/3) - 包含其他資訊的垂直堆疊 */}
        <Grid item xs={12} md={3}>
          <Grid container spacing={2} direction="column">
            {/* 1. 影像檢查 */}
            <Grid item>
              <Overview_ImagingTests
                imagingData={imagingData}
                overviewSettings={overviewSettings}
                generalDisplaySettings={generalDisplaySettings}
              />
            </Grid>

            {/* 2. 手術紀錄 - only display if has data */}
            {hasSurgeryData && (
              <Grid item>
                <Overview_SurgeryRecords 
                  surgeryData={surgeryData} 
                  generalDisplaySettings={generalDisplaySettings}
                />
              </Grid>
            )}

            {/* 3. 出院紀錄 - only display if has data */}
            {hasDischargeData && (
              <Grid item>
                <Overview_DischargeRecords 
                  dischargeData={dischargeData} 
                  generalDisplaySettings={generalDisplaySettings}
                />
              </Grid>
            )}

            {/* 4. 過敏紀錄 - only display if has data */}
            {hasAllergyData && (
              <Grid item>
                <Overview_AllergyRecords 
                  allergyData={allergyData} 
                  generalDisplaySettings={generalDisplaySettings}
                />
              </Grid>
            )}

            {/* 5. 病患摘要 */}
            <Grid item>
              <Overview_PatientSummary 
                patientSummaryData={patientSummaryData} 
                generalDisplaySettings={generalDisplaySettings}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Overview;