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
 * - Adult health check data
 * - Cancer screening data
 *
 * This file serves as the integration point for all the separate components.
 */

import React, { useMemo, useEffect } from "react";
import { Grid, Box } from "@mui/material";

// Import individual components
import Overview_RecentDiagnosis from "./Overview_RecentDiagnosis";
import Overview_ImportantMedications from "./Overview_ImportantMedications";
import Overview_LabTests from "./Overview_LabTests";
import Overview_PatientSummary from "./Overview_PatientSummary";
import Overview_AllergyRecords from "./Overview_AllergyRecords";
import Overview_SurgeryRecords from "./Overview_SurgeryRecords";
import Overview_DischargeRecords from "./Overview_DischargeRecords";
import Overview_ImagingTests from "./Overview_ImagingTests";
import Overview_IntegratedHealthData from "./Overview_IntegratedHealthData";

// 導入從配置文件中移出的常數
import { DEFAULT_LAB_TESTS } from '../../config/labTests';
import { DEFAULT_IMAGE_TESTS } from '../../config/imageTests';

const Overview = ({
  dashboardData,
  allergyData,
  surgeryData,
  dischargeData,
  patientSummaryData,
  groupedMedications = [],
  groupedChineseMeds = [],
  groupedLabs = [],
  labData,
  imagingData = { withReport: [], withoutReport: [] },
  adultHealthCheckData = null,
  cancerScreeningData = null,
  hbcvData = null,
  settings = {},
  overviewSettings = {
    medicationTrackingDays: 180,
    labTrackingDays: 90,
    imageTrackingDays: 90,
    focusedLabTests: DEFAULT_LAB_TESTS,
    focusedImageTests: DEFAULT_IMAGE_TESTS,
    enableAcupunctureIndicator: false
  },
  generalDisplaySettings = { titleTextSize: 'medium', contentTextSize: 'medium', noteTextSize: 'small' },
  labSettings = {},
  cloudSettings = { fetchAdultHealthCheck: true, fetchCancerScreening: true, fetchHbcvdata: true }
}) => {
  // Check if components have data
  const hasMedications = useMemo(() => groupedMedications && groupedMedications.length > 0, [groupedMedications]);
  const hasAllergyData = useMemo(() => allergyData && allergyData.length > 0, [allergyData]);
  const hasSurgeryData = useMemo(() => surgeryData && surgeryData.length > 0, [surgeryData]);
  const hasDischargeData = useMemo(() => dischargeData && dischargeData.length > 0, [dischargeData]);


  useEffect(() => {
    console.log("[Overview] adultHealthCheckData prop:", adultHealthCheckData);
    console.log("[Overview] cancerScreeningData prop:", cancerScreeningData);
    console.log("[Overview] hbcvData prop:", hbcvData);
    console.log("[Overview] cloudSettings:", cloudSettings);
  }, [adultHealthCheckData, cancerScreeningData, hbcvData, cloudSettings]);

  return (
    <Box sx={{ p: 0 }}>
      <Grid container spacing={1}>
        {/* 三欄式布局 */}
        {/* 左欄 (1/3) - 包含診斷與重點藥物 */}
        <Grid item xs={12} md={hasMedications ? 4.5 : 3}>
          {/* 近期就醫診斷 */}
          <Overview_RecentDiagnosis
            groupedMedications={groupedMedications}
            groupedChineseMeds={groupedChineseMeds}
            patientSummaryData={patientSummaryData}
            generalDisplaySettings={generalDisplaySettings}
            enableAcupunctureIndicator={overviewSettings.enableAcupunctureIndicator}
          />

          {/* 重點藥物 */}
          <Overview_ImportantMedications
            groupedMedications={groupedMedications}
            settings={settings}
            overviewSettings={overviewSettings}
            generalDisplaySettings={generalDisplaySettings}
          />
        </Grid>

        {/* 重點檢驗 - 中欄 (1/3) */}
        <Grid item xs={12} md={4.5}>
          {/* 整合的健康資料區塊 (成健 / 癌篩 / BC肝) */}
          <Overview_IntegratedHealthData
            adultHealthCheckData={adultHealthCheckData}
            cancerScreeningData={cancerScreeningData}
            hbcvData={hbcvData}
            cloudSettings={cloudSettings}
            generalDisplaySettings={generalDisplaySettings}
          />


          {/* 重點檢驗 */}
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