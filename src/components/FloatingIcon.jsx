import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";

// Import cloud icon
import { cloud_icon } from "../assets/pic_cloud_icon.js";

import { SettingsProvider } from "../contexts/SettingsContext";

// Import header component (tabs Paper + status indicators)
import MainDialogHeader from "./MainDialogHeader";

// Import tab components
import TabPanel from "./tabs/TabPanel";
import Overview from "./tabs/Overview";
import MedicationList from "./tabs/MedicationList";
import MedicationTable from "./tabs/MedicationTable";
import ChineseMedicine from "./tabs/ChineseMedicine";
import LabData from "./tabs/LabData";
import ImagingData from "./tabs/ImagingData";
import MedDaysData from "./tabs/MedDaysData";
import LabTableView from "./tabs/LabTableView";
import Instructions from "./tabs/Instructions";
import AdvancedSettings from "./tabs/AdvancedSettings";

// Import user info utilities
import { useUserInfo } from "../hooks/useUserInfo";
import { useNhiDataState } from "../hooks/useNhiDataState";
import { useSettingsState } from "../hooks/useSettingsState";

// Add a global flag to prevent multiple openings
window.isFloatingIconOpening = false;

const FloatingIcon = () => {
  const [open, setOpen] = useState(false);
  const { userInfo, setUserInfo } = useUserInfo(open);
  const [tabValue, setTabValue] = useState(false);

  // Tab index（CKM 已整合進 Overview，不再有獨立 Tab）
  const helpTabIndex = 7;
  const advancedTabIndex = 8;

  // nhiDataRef：見 useSettingsState.js 檔頭註解，解決 useSettingsState 與
  // useNhiDataState 互相依賴的問題。FloatingIcon 建立空 ref 傳入 useSettingsState，
  // 待 useNhiDataState 執行完成後於本次 render 賦值，listener 皆於非同步事件觸發時
  // 透過 .current 讀取，時序與既有的 appSettingsRef pattern 相同。
  const nhiDataRef = useRef(null);
  const { appSettings, setAppSettings, generalDisplaySettings, appSettingsRef } =
    useSettingsState({ nhiDataRef });

  const nhiData = useNhiDataState({
    appSettingsRef,
    labSettings: appSettings.lab,
    userInfo,
    setUserInfo,
  });
  nhiDataRef.current = nhiData;
  const {
    groupedMedications,
    groupedLabs,
    groupedChineseMeds,
    imagingData,
    allergyData,
    surgeryData,
    dischargeData,
    medDaysData,
    dashboardData,
    adultHealthCheckData,
    cancerScreeningData,
    hbcvData,
    ckmData,
    patientSummaryData,
  } = nhiData;

  // 是否顯示「進階」Tab；同時控制 MainDialogHeader 的頁籤與下方 TabPanel
  const showAdvancedTab =
    appSettings.western.enableMedicationCustomCopyFormat ||
    appSettings.lab.enableLabCustomCopyFormat;

  // Add a function to be exposed globally for auto-opening
  useEffect(() => {
    // Expose the function to open the dialog
    window.openFloatingIconDialog = () => {
      if (!open && !window.isFloatingIconOpening) {
        window.isFloatingIconOpening = true;
        setOpen(true);

        if (generalDisplaySettings.alwaysOpenOverviewTab) {
          setTabValue(false); // Show overview (no tab selected)
        }
        // Reset the flag after a short delay to prevent rapid multiple openings
        setTimeout(() => {
          window.isFloatingIconOpening = false;
        }, 1000);
      }
    };

    return () => {
      // Clean up when component unmounts
      window.openFloatingIconDialog = undefined;
    };
  }, [open, generalDisplaySettings]);

  const handleClick = () => {
    setOpen(true);

    if (generalDisplaySettings.alwaysOpenOverviewTab) {
      setTabValue(false); // Show overview (no tab selected)
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOverviewClick = () => {
    setTabValue(false);
  };

  // Get position styles based on settings
  const getIconPositionStyle = () => {
    const baseStyle = {
      position: "fixed",
      right: "20px",
      zIndex: 1000,
      padding: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "transparent",
    };

    // 使用 Map 來存儲不同位置的樣式
    const positionStyleMap = new Map([
      ["top-right", { ...baseStyle, top: "20px" }],
      ["middle-right", { ...baseStyle, top: "50%", transform: "translateY(-50%)" }],
      ["bottom-right", { ...baseStyle, bottom: "20px" }]
    ]);

    // 返回匹配的樣式或默認值（底部右側）
    return positionStyleMap.get(generalDisplaySettings.floatingIconPosition) ||
      positionStyleMap.get("bottom-right");
  };

  return (
    <SettingsProvider appSettings={appSettings} generalDisplaySettings={generalDisplaySettings}>
      <IconButton style={getIconPositionStyle()} onClick={handleClick}>
        <img
          src={cloud_icon}
          alt="NHI Extractor"
          style={{
            width: "48px",
            height: "48px",
            objectFit: "contain",
          }}
        />
      </IconButton>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: "90vh",
            maxHeight: "90vh",
            minWidth: "800px",
            width: {
              xs: "95%",
              sm: "92%",
              md: "92%",
              lg: "90%",
              xl: "90%",
            },
            display: "flex",
            flexDirection: "column",
            margin: "auto",
          },
        }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            position: "sticky",
            top: 0,
            bgcolor: "background.paper",
            zIndex: 1,
          }}
        >
          <MainDialogHeader
            tabValue={tabValue}
            onTabChange={handleTabChange}
            onOverviewClick={handleOverviewClick}
            userInfo={userInfo}
            groupedMedications={groupedMedications}
            groupedChineseMeds={groupedChineseMeds}
            groupedLabs={groupedLabs}
            imagingData={imagingData}
            medDaysData={medDaysData}
            allergyData={allergyData}
            surgeryData={surgeryData}
            dischargeData={dischargeData}
            patientSummaryData={patientSummaryData}
            showAdvancedTab={showAdvancedTab}
          />
        </DialogTitle>
        <DialogContent sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          {/* Overview - shown when no tab is selected (clicking patient name) */}
          {tabValue === false && (
            <Overview
              dashboardData={dashboardData}
              allergyData={allergyData}
              surgeryData={surgeryData}
              dischargeData={dischargeData}
              patientSummaryData={patientSummaryData}
              groupedMedications={groupedMedications}
              groupedChineseMeds={groupedChineseMeds}
              groupedLabs={groupedLabs}
              labData={groupedLabs}
              imagingData={imagingData}
              settings={{
                ...appSettings.western,
                enableATC5Colors: appSettings.atc5.enableColors,
                atc5Groups: appSettings.atc5.groups,
                atc5ColorGroups: appSettings.atc5.colorGroups,
              }}
              overviewSettings={appSettings.overview}
              labSettings={appSettings.lab}
              cloudSettings={appSettings.cloud}
              adultHealthCheckData={adultHealthCheckData}
              cancerScreeningData={cancerScreeningData}
              hbcvData={hbcvData}
              ckmData={ckmData}
              enableCKMTab={generalDisplaySettings.enableCKMTab}
              userInfo={userInfo}
            />
          )}

          {/* Western Medication List Tab */}
          <TabPanel value={tabValue} index={0}>
            <MedicationList
              groupedMedications={groupedMedications}
              settings={{
                ...appSettings.western,
                enableATC5Colors: appSettings.atc5.enableColors,
                atc5Groups: appSettings.atc5.groups,
                atc5ColorGroups: appSettings.atc5.colorGroups,
              }}
              copyFormat={appSettings.western.medicationCopyFormat}
            />
          </TabPanel>

          {/* Western Medication Table Tab */}
          <TabPanel value={tabValue} index={1}>
            <MedicationTable
              groupedMedications={groupedMedications}
              settings={{
                ...appSettings.western,
                enableATC5Colors: appSettings.atc5.enableColors,
                atc5Groups: appSettings.atc5.groups,
                atc5ColorGroups: appSettings.atc5.colorGroups,
              }}
            />
          </TabPanel>

          {/* Chinese Medicine Tab */}
          <TabPanel value={tabValue} index={2}>
            <ChineseMedicine
              groupedChineseMeds={groupedChineseMeds}
              chineseMedSettings={appSettings.chinese}
            />
          </TabPanel>

          {/* Lab Data Tab */}
          <TabPanel value={tabValue} index={3}>
            <LabData
              groupedLabs={groupedLabs}
              settings={appSettings.western}
              labSettings={appSettings.lab}
            />
          </TabPanel>

          {/* New Lab Table Tab */}
          <TabPanel value={tabValue} index={4}>
            <LabTableView
              groupedLabs={groupedLabs}
              labSettings={appSettings.lab}
            />
          </TabPanel>

          {/* Imaging Data Tab */}
          <TabPanel value={tabValue} index={5}>
            <ImagingData
              imagingData={imagingData}
            />
          </TabPanel>

          {/* MedDays Data Tab */}
          <TabPanel value={tabValue} index={6}>
            <MedDaysData
              medDaysData={medDaysData}
            />
          </TabPanel>

          {/* Instructions Tab */}
          <TabPanel value={tabValue} index={helpTabIndex}>
            <Instructions />
          </TabPanel>

          {/* Advanced Settings Tab */}
          {showAdvancedTab && (
            <TabPanel value={tabValue} index={advancedTabIndex}>
              <AdvancedSettings
                appSettings={appSettings}
                setAppSettings={setAppSettings}
              />
            </TabPanel>
          )}
        </DialogContent>
      </Dialog>
    </SettingsProvider>
  );
};

export default FloatingIcon;