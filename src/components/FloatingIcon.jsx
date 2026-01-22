import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Divider,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip,
  Fab,
} from "@mui/material";
// import CloseIcon from "@mui/icons-material/Close";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HealingIcon from "@mui/icons-material/Healing";
import GrassIcon from "@mui/icons-material/Grass";
// import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";

// Import cloud icon
import { cloud_icon } from "../assets/pic_cloud_icon.js";

// 導入數據和設置管理模組
import {
  collectDataSources,
  handleAllData,
  reprocessData,
} from "../utils/dataManager";
import {
  loadAllSettings,
  listenForSettingsChanges,
  listenForMessages,
  listenForDataFetchCompletion,
  handleDataFetchCompletedSettingsChange,
} from "../utils/settingsManager";

// 引入標籤顏色工具函數
import { getTabColor, getTabSelectedColor } from "../utils/tabColorUtils";

// import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Snackbar from "@mui/material/Snackbar";
// import VisibilityIcon from '@mui/icons-material/Visibility';
// import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DEFAULT_LAB_TESTS } from "../config/labTests";
import { DEFAULT_IMAGE_TESTS } from "../config/imageTests";

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

import HomeIcon from "@mui/icons-material/Home";
import MedicationIcon from "@mui/icons-material/Medication";
import ScienceIcon from "@mui/icons-material/Science";
import ImageIcon from "@mui/icons-material/Image";
import InventoryIcon from "@mui/icons-material/Inventory";

import TableChartIcon from "@mui/icons-material/TableChart";
import TableViewIcon from "@mui/icons-material/TableView";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import BiotechIcon from "@mui/icons-material/Biotech";

// Import new tools
import {
  extractGFRValue,
  getCKDStage,
  hasRecentCTScan,
  hasRecentMRIScan,
} from "../utils/indicatorUtils";
import {
  TITLE_TEXT_SIZES,
  CONTENT_TEXT_SIZES,
  NOTE_TEXT_SIZES,
} from "../utils/textSizeUtils";
import { checkAcupunctureEligibility } from "../utils/acupunctureChecker";

// Import new indicators
import StatusIndicator from "./indicators/StatusIndicator";
import KidneyStatusIndicator from "./indicators/KidneyStatusIndicator";
import AcupunctureIndicator from "./indicators/AcupunctureIndicator";

// Import new settings
import { DEFAULT_SETTINGS } from "../config/defaultSettings";
import { DEFAULT_ATC5_GROUPS } from "../config/medicationGroups";

// Import user info utilities
import {
  extractUserInfoFromToken,
  formatUserInfoDisplay,
} from "../utils/userInfoUtils";

// 刪除未使用的組件和函數，或移動到實際使用它們的地方
// ImagingTable, getLabStatusColor, getLabValueColor

// Add a global flag to prevent multiple openings
window.isFloatingIconOpening = false;

const FloatingIcon = () => {
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [groupedMedications, setGroupedMedications] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [groupedLabs, setGroupedLabs] = useState([]);
  const [groupedChineseMeds, setGroupedChineseMeds] = useState([]);
  const [imagingData, setImagingData] = useState({
    withReport: [],
    withoutReport: [],
  });
  const [allergyData, setAllergyData] = useState([]);
  const [surgeryData, setSurgeryData] = useState([]);
  const [dischargeData, setDischargeData] = useState([]);
  const [medDaysData, setMedDaysData] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    visitCount: 0,
    diagnoses: [],
    recentMedications: { western: [], chinese: [] },
    labSummary: {},
  });
  const [adultHealthCheckData, setAdultHealthCheckData] = useState(null);
  const [cancerScreeningData, setCancerScreeningData] = useState(null);
  const [hbcvData, setHbcvData] = useState(null);
  const [generalDisplaySettings, setGeneralDisplaySettings] = useState(
    DEFAULT_SETTINGS.general
  );

  // Use the cached default value as the initial state
  const [appSettings, setAppSettings] = useState({
    western: DEFAULT_SETTINGS.western,
    atc5: DEFAULT_SETTINGS.atc5,
    chinese: DEFAULT_SETTINGS.chinese,
    lab: DEFAULT_SETTINGS.lab,
    overview: DEFAULT_SETTINGS.overview,
    display: DEFAULT_SETTINGS.display,
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [patientSummaryData, setPatientSummaryData] = useState([]);

  // 新增響應式布局檢測
  const theme = useTheme();
  const isNarrowScreen = useMediaQuery(theme.breakpoints.down("lg"));

  // 統一初始化設置和監聽器
  useEffect(() => {
    // 初始化所有設置
    const initializeSettings = async () => {
      const allSettings = await loadAllSettings();
      setAppSettings({
        western: allSettings.western,
        atc5: allSettings.atc5,
        chinese: allSettings.chinese,
        lab: allSettings.lab,
        overview: allSettings.overview,
        display: allSettings.display,
        cloud: allSettings.cloud,
      });
      setGeneralDisplaySettings(allSettings.general);
    };

    initializeSettings();

    // 設置變更監聽處理函數
    const removeSettingsListener = listenForSettingsChanges((newSettings) => {
      // 更新所有設置狀態
      setAppSettings({
        western: newSettings.western,
        atc5: newSettings.atc5,
        chinese: newSettings.chinese,
        lab: newSettings.lab,
        overview: newSettings.overview,
        display: newSettings.display,
        cloud: newSettings.cloud,
      });
      setGeneralDisplaySettings(newSettings.general);

      // 根據需要重新處理各種數據
      if (window.lastInterceptedLabData) {
        reprocessData(
          "lab",
          window.lastInterceptedLabData,
          newSettings.lab,
          setGroupedLabs
        );
      }
      if (window.lastInterceptedMedicationData?.rObject) {
        reprocessData(
          "medication",
          window.lastInterceptedMedicationData,
          newSettings.western,
          setGroupedMedications
        );
      }
      if (window.lastInterceptedChineseMedData) {
        reprocessData(
          "chinesemed",
          window.lastInterceptedChineseMedData,
          newSettings.chinese,
          setGroupedChineseMeds
        );
      }
    });

    // 消息監聽處理函數
    const removeMessageListener = listenForMessages((message) => {
      if (message.action === "settingChanged" && message.allSettings) {
        // 觸發設置重新加載
        initializeSettings();
      }

      // 處理切換到自訂設定標籤的消息
      if (message.action === "switchToCustomFormatTab") {
        // 如果對話框未打開，先打開它
        if (!open) {
          setOpen(true);
        }
        // 只有當自訂設定已啟用時才切換到指定的標籤
        if (typeof message.tabIndex === 'number' && appSettings.western.enableMedicationCustomCopyFormat) {
          setTabValue(message.tabIndex);
        }
      }

      // 處理切換到檢驗自訂格式編輯器的消息
      if (message.action === "switchToLabCustomFormatTab") {
        // 如果對話框未打開，先打開它
        if (!open) {
          setOpen(true);
        }
        // 只有當自訂設定已啟用時才切換到指定的標籤
        if (typeof message.tabIndex === 'number' && appSettings.lab.enableLabCustomCopyFormat) {
          setTabValue(message.tabIndex);
        }
      }

      // 處理打開自訂格式編輯器的消息
      if (message.action === "openCustomFormatEditor") {
        if (!open) {
          setOpen(true);
        }
        // 自訂設定標籤的索引是 9，只有當自訂設定已啟用時才切換
        if (appSettings.western.enableMedicationCustomCopyFormat) {
          setTabValue(9);
        }
      }

      // 處理打開檢驗自訂格式編輯器的消息
      if (message.action === "openLabCustomFormatEditor") {
        if (!open) {
          setOpen(true);
        }
        // 只有當檢驗自訂設定已啟用時才切換
        if (appSettings.lab.enableLabCustomCopyFormat) {
          setTabValue(9);
        }
      }
    });

    // 數據加載完成事件監聽處理函數
    const removeDataFetchCompletionListener = listenForDataFetchCompletion(
      (event) => {
        // 處理設置變更
        if (event.detail?.settingsChanged) {
          // 準備回調函數
          const callbacks = {
            reprocessMedication: (data, settings) =>
              reprocessData(
                "medication",
                data,
                settings,
                setGroupedMedications
              ),
            reprocessLab: (data, settings) =>
              reprocessData("lab", data, settings, setGroupedLabs),
            reprocessChineseMed: (data, settings) =>
              reprocessData(
                "chinesemed",
                data,
                settings,
                setGroupedChineseMeds
              ),
          };

          // 使用設置管理器處理設置變更
          handleDataFetchCompletedSettingsChange(
            event,
            appSettings,
            setAppSettings,
            callbacks
          );
        } else {
          // 非設置相關事件，重新處理所有數據
          handleData();
        }
      }
    );

    // 清理函數
    return () => {
      removeSettingsListener();
      removeMessageListener();
      removeDataFetchCompletionListener();
    };
  }, []);

  // 在組件載入時處理資料
  const handleData = async () => {
    // 使用dataManager收集資料來源
    const dataSources = collectDataSources();

    // 創建所有setter函數的對象
    const setters = {
      setGroupedMedications,
      setGroupedLabs,
      setGroupedChineseMeds,
      setImagingData,
      setAllergyData,
      setSurgeryData,
      setDischargeData,
      setMedDaysData,
      setPatientSummaryData,
      setDashboardData,
      setAdultHealthCheckData,
      setCancerScreeningData,
      setHbcvData,
    };

    // 使用dataManager處理所有資料
    await handleAllData(dataSources, appSettings, setters);
  };

  // 初始數據加載
  useEffect(() => {
    // 初次執行
    handleData();
  }, [appSettings.lab]); // 保留對 lab 設置的依賴，以便在 lab 設置變更時重新處理數據

  // Add a function to be exposed globally for auto-opening
  useEffect(() => {
    // Expose the function to open the dialog
    window.openFloatingIconDialog = () => {
      if (!open && !window.isFloatingIconOpening) {
        window.isFloatingIconOpening = true;
        setOpen(true);

        if (generalDisplaySettings.alwaysOpenOverviewTab) {
          setTabValue(0); // Always set to Overview tab (index 0) if setting is enabled
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

  // Extract user information when the dialog opens or data changes
  useEffect(() => {
    if (open) {
      const info = extractUserInfoFromToken();
      setUserInfo(info);
    }
  }, [open]);

  const handleClick = () => {
    setOpen(true);

    if (generalDisplaySettings.alwaysOpenOverviewTab) {
      setTabValue(0); // Always set to Overview tab (index 0) if setting is enabled
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Calculate CKD stage
  const gfrValue = extractGFRValue(patientSummaryData);
  const ckdStage = getCKDStage(gfrValue);

  // Build diagnosis data for acupuncture checking
  const diagnosisDataForAcupuncture = React.useMemo(() => {
    const outpatient = [];
    const emergency = [];
    const inpatient = [];

    // Process western medications
    groupedMedications.forEach(group => {
      if (!group.icd_code || !group.icd_name) return;

      const diagnosisItem = {
        code: group.icd_code.toUpperCase(),
        name: group.icd_name || group.icd_cname,
        count: 1
      };

      if (group.visitType === '急診') {
        emergency.push({ ...diagnosisItem, date: group.date || group.drug_date });
      } else if (group.visitType === '住診') {
        inpatient.push({ ...diagnosisItem, date: group.date || group.drug_date });
      } else {
        outpatient.push({ ...diagnosisItem, date: group.date || group.drug_date });
      }
    });

    // Process Chinese medications
    groupedChineseMeds.forEach(group => {
      if (!group.icd_code || !group.icd_name) return;

      const diagnosisItem = {
        code: group.icd_code.toUpperCase(),
        name: group.icd_name || group.icd_cname,
        count: 1
      };

      if (group.visitType === '急診') {
        emergency.push({ ...diagnosisItem, date: group.date || group.drug_date });
      } else if (group.visitType === '住診') {
        inpatient.push({ ...diagnosisItem, date: group.date || group.drug_date });
      } else {
        outpatient.push({ ...diagnosisItem, date: group.date || group.drug_date });
      }
    });

    return { outpatient, emergency, inpatient };
  }, [groupedMedications, groupedChineseMeds]);

  // Check acupuncture eligibility (only if enabled)
  const acupunctureEligibility = React.useMemo(() => {
    if (!appSettings.overview?.enableAcupunctureIndicator) {
      return null;
    }
    return checkAcupunctureEligibility(diagnosisDataForAcupuncture);
  }, [diagnosisDataForAcupuncture, appSettings.overview?.enableAcupunctureIndicator]);

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
    <>
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
          <Box
            sx={{
              display: "flex",
              flexDirection: isNarrowScreen ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isNarrowScreen ? "stretch" : "center",
            }}
          >
            {/* 頁籤區域 */}
            <Paper
              sx={{
                flex: "1 1 auto",
                width: "100%",
                backgroundColor: "#f5f9ff", // Light blue background
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* User Info Display - shown before tabs, not selectable */}
              {userInfo && formatUserInfoDisplay(userInfo) && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 2,
                    py: 0.75,
                    fontWeight: "bold",
                    color: "#1976d2",
                    fontSize:
                      (generalDisplaySettings &&
                        generalDisplaySettings.contentTextSize &&
                        CONTENT_TEXT_SIZES[
                        generalDisplaySettings.contentTextSize
                        ]) ||
                      CONTENT_TEXT_SIZES["medium"],
                    borderRight: "1px solid #e0e0e0",
                    flexShrink: 0,
                  }}
                >
                  {formatUserInfoDisplay(userInfo)}
                </Box>
              )}
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                TabIndicatorProps={{
                  style: {
                    backgroundColor: "#1976d2", // Primary blue for the indicator
                    height: 2, // Thinner indicator
                  },
                }}
                sx={{
                  minHeight: "36px", // Reduced from default 48px
                  flex: 1,
                  "& .MuiTab-root": {
                    minHeight: "36px", // Reduced tab height
                    padding: "6px 12px", // Reduced padding
                    fontSize:
                      (generalDisplaySettings &&
                        generalDisplaySettings.contentTextSize &&
                        CONTENT_TEXT_SIZES[
                        generalDisplaySettings.contentTextSize
                        ]) ||
                      CONTENT_TEXT_SIZES["medium"], // Use contentTextSize with fallback
                    fontWeight: "medium",
                    "&:hover": {
                      opacity: 1,
                      color: "#0d47a1", // Darker blue on hover for all tabs
                    },
                    "&.Mui-selected": {
                      fontWeight: "bold",
                    },
                  },
                }}
              >
                <Tab
                  label="總覽"
                  icon={<HomeIcon sx={{ fontSize: "1rem" }} />}
                  iconPosition="start"
                  sx={{
                    padding: "6px 10px",
                    color: getTabColor(generalDisplaySettings, "overview"),
                    "&.Mui-selected": {
                      color: getTabSelectedColor(generalDisplaySettings, "overview"),
                    },
                  }}
                />
                <Tab
                  label={`西藥 (${groupedMedications.length})`}
                  icon={<MedicationIcon sx={{ fontSize: "1rem" }} />}
                  iconPosition="start"
                  sx={{
                    padding: "6px 10px",
                    color:
                      groupedMedications.length > 0 ? getTabColor(generalDisplaySettings, "medication") : "#9e9e9e",
                    "&.Mui-selected": {
                      color:
                        groupedMedications.length > 0 ? getTabSelectedColor(generalDisplaySettings, "medication") : "#616161",
                    },
                  }}
                />
                <Tab
                  icon={<TableChartIcon sx={{ fontSize: "1.125rem" }} />}
                  aria-label="西藥表格檢視"
                  sx={{
                    minWidth: "60px", // Narrower width for icon-only tab
                    padding: "6px 6px",
                    color:
                      groupedMedications.length > 0 ? getTabColor(generalDisplaySettings, "medication") : "#9e9e9e",
                    "&.Mui-selected": {
                      color:
                        groupedMedications.length > 0 ? getTabSelectedColor(generalDisplaySettings, "medication") : "#616161",
                    },
                  }}
                />
                <Tab
                  label={`中藥 (${groupedChineseMeds.length})`}
                  icon={<GrassIcon sx={{ fontSize: "1rem" }} />}
                  iconPosition="start"
                  sx={{
                    padding: "6px 10px",
                    color:
                      groupedChineseMeds.length > 0 ? getTabColor(generalDisplaySettings, "chineseMed") : "#9e9e9e",
                    "&.Mui-selected": {
                      color:
                        groupedChineseMeds.length > 0 ? getTabSelectedColor(generalDisplaySettings, "chineseMed") : "#616161",
                    },
                  }}
                />
                <Tab
                  label={`檢驗 (${groupedLabs.length})`}
                  icon={<ScienceIcon sx={{ fontSize: "1rem" }} />}
                  iconPosition="start"
                  sx={{
                    padding: "6px 10px",
                    color: groupedLabs.length > 0 ? getTabColor(generalDisplaySettings, "lab") : "#9e9e9e",
                    "&.Mui-selected": {
                      color: groupedLabs.length > 0 ? getTabSelectedColor(generalDisplaySettings, "lab") : "#616161",
                    },
                  }}
                />
                <Tab
                  icon={<TableViewIcon sx={{ fontSize: "1.125rem" }} />}
                  aria-label="檢驗表格檢視"
                  sx={{
                    minWidth: "60px", // Narrower width for icon-only tab
                    padding: "6px 6px",
                    color: groupedLabs.length > 0 ? getTabColor(generalDisplaySettings, "lab") : "#9e9e9e",
                    "&.Mui-selected": {
                      color: groupedLabs.length > 0 ? getTabSelectedColor(generalDisplaySettings, "lab") : "#616161",
                    },
                  }}
                />
                <Tab
                  label={`影像 (${imagingData.withReport.length +
                    imagingData.withoutReport.length
                    })`}
                  icon={<ImageIcon sx={{ fontSize: "1rem" }} />}
                  iconPosition="start"
                  sx={{
                    padding: "6px 10px",
                    color:
                      imagingData.withReport.length +
                        imagingData.withoutReport.length >
                        0
                        ? getTabColor(generalDisplaySettings, "imaging")
                        : "#9e9e9e",
                    "&.Mui-selected": {
                      color:
                        imagingData.withReport.length +
                          imagingData.withoutReport.length >
                          0
                          ? getTabSelectedColor(generalDisplaySettings, "imaging")
                          : "#616161",
                    },
                  }}
                />
                <Tab
                  label={`餘藥 (${medDaysData.length})`}
                  icon={<InventoryIcon sx={{ fontSize: "1rem" }} />}
                  iconPosition="start"
                  sx={{
                    padding: "6px 10px",
                    color: medDaysData.length > 0 ? getTabColor(generalDisplaySettings, "medDays") : "#9e9e9e",
                    "&.Mui-selected": {
                      color: medDaysData.length > 0 ? getTabSelectedColor(generalDisplaySettings, "medDays") : "#616161",
                    },
                  }}
                />
                <Tab
                  label="說明"
                  icon={<HelpOutlineIcon sx={{ fontSize: "1rem" }} />}
                  iconPosition="start"
                  sx={{
                    padding: "6px 10px",
                    color: getTabColor(generalDisplaySettings, "help"),
                    "&.Mui-selected": {
                      color: getTabSelectedColor(generalDisplaySettings, "help"),
                    },
                  }}
                />
                {(appSettings.western.enableMedicationCustomCopyFormat || appSettings.lab.enableLabCustomCopyFormat) && (
                  <Tab
                    label="進階"
                    icon={<SettingsIcon sx={{ fontSize: "1rem" }} />}
                    iconPosition="start"
                    sx={{
                      padding: "6px 10px",
                      color: getTabColor(generalDisplaySettings, "settings"),
                      "&.Mui-selected": {
                        color: getTabSelectedColor(generalDisplaySettings, "settings"),
                      },
                    }}
                  />
                )}
              </Tabs>
            </Paper>

            {/* 狀態指示器區域 - 使用導入的指示器組件 */}
            <Box
              sx={{
                display: "flex",
                mt: isNarrowScreen ? 1 : 0,
                ml: isNarrowScreen ? 0 : 2,
                justifyContent: isNarrowScreen ? "flex-end" : "flex-start",
                flexWrap: "wrap",
              }}
            >
              {ckdStage && (
                <KidneyStatusIndicator
                  stage={ckdStage}
                  fontSize={generalDisplaySettings.noteTextSize}
                />
              )}
              {/* 針灸指示器 */}
              {acupunctureEligibility && acupunctureEligibility.highlyComplex.isEligible && (
                <AcupunctureIndicator
                  type="highly"
                  matchedDiagnoses={acupunctureEligibility.highlyComplex.matchedDiagnoses}
                  fontSize={generalDisplaySettings.noteTextSize}
                />
              )}
              {acupunctureEligibility && acupunctureEligibility.moderateComplex.isEligible && (
                <AcupunctureIndicator
                  type="moderate"
                  matchedDiagnoses={acupunctureEligibility.moderateComplex.matchedDiagnoses}
                  fontSize={generalDisplaySettings.noteTextSize}
                />
              )}
              {hasRecentCTScan(imagingData) && (
                <StatusIndicator
                  label="CT"
                  hasData={true}
                  icon={MonitorHeartIcon}
                  fontSize={generalDisplaySettings.noteTextSize}
                  tooltipTitle="90天內有CT檢查"
                />
              )}
              {hasRecentMRIScan(imagingData) && (
                <StatusIndicator
                  label="MRI"
                  hasData={true}
                  icon={BiotechIcon}
                  fontSize={generalDisplaySettings.noteTextSize}
                  tooltipTitle="90天內有MRI檢查"
                />
              )}
              <StatusIndicator
                label="過敏"
                hasData={allergyData && allergyData.length > 0}
                icon={WarningAmberIcon}
                fontSize={generalDisplaySettings.noteTextSize}
              />
              <StatusIndicator
                label="手術"
                hasData={surgeryData && surgeryData.length > 0}
                icon={HealingIcon}
                fontSize={generalDisplaySettings.noteTextSize}
              />
              <StatusIndicator
                label="出院"
                hasData={dischargeData && dischargeData.length > 0}
                icon={LocalHospitalIcon}
                fontSize={generalDisplaySettings.noteTextSize}
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
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
              generalDisplaySettings={generalDisplaySettings}
              labSettings={appSettings.lab}
              cloudSettings={appSettings.cloud}
              adultHealthCheckData={adultHealthCheckData}
              cancerScreeningData={cancerScreeningData}
              hbcvData={hbcvData}
            />
          </TabPanel>

          {/* Western Medication List Tab */}
          <TabPanel value={tabValue} index={1}>
            <MedicationList
              groupedMedications={groupedMedications}
              settings={{
                ...appSettings.western,
                enableATC5Colors: appSettings.atc5.enableColors,
                atc5Groups: appSettings.atc5.groups,
                atc5ColorGroups: appSettings.atc5.colorGroups,
              }}
              copyFormat={appSettings.western.medicationCopyFormat}
              generalDisplaySettings={generalDisplaySettings}
            />
          </TabPanel>

          {/* Western Medication Table Tab */}
          <TabPanel value={tabValue} index={2}>
            <MedicationTable
              groupedMedications={groupedMedications}
              settings={{
                ...appSettings.western,
                enableATC5Colors: appSettings.atc5.enableColors,
                atc5Groups: appSettings.atc5.groups,
                atc5ColorGroups: appSettings.atc5.colorGroups,
              }}
              generalDisplaySettings={generalDisplaySettings}
            />
          </TabPanel>

          {/* Chinese Medicine Tab */}
          <TabPanel value={tabValue} index={3}>
            <ChineseMedicine
              groupedChineseMeds={groupedChineseMeds}
              chineseMedSettings={appSettings.chinese}
              generalDisplaySettings={generalDisplaySettings}
            />
          </TabPanel>

          {/* Lab Data Tab */}
          <TabPanel value={tabValue} index={4}>
            <LabData
              groupedLabs={groupedLabs}
              settings={appSettings.western}
              labSettings={appSettings.lab}
              generalDisplaySettings={generalDisplaySettings}
            />
          </TabPanel>

          {/* New Lab Table Tab */}
          <TabPanel value={tabValue} index={5}>
            <LabTableView
              groupedLabs={groupedLabs}
              labSettings={appSettings.lab}
              generalDisplaySettings={generalDisplaySettings}
            />
          </TabPanel>

          {/* Imaging Data Tab */}
          <TabPanel value={tabValue} index={6}>
            <ImagingData
              imagingData={imagingData}
              generalDisplaySettings={generalDisplaySettings}
            />
          </TabPanel>

          {/* MedDays Data Tab */}
          <TabPanel value={tabValue} index={7}>
            <MedDaysData
              medDaysData={medDaysData}
              generalDisplaySettings={generalDisplaySettings}
            />
          </TabPanel>

          {/* Instructions Tab */}
          <TabPanel value={tabValue} index={8}>
            <Instructions generalDisplaySettings={generalDisplaySettings} />
          </TabPanel>

          {/* Advanced Settings Tab */}
          {(appSettings.western.enableMedicationCustomCopyFormat || appSettings.lab.enableLabCustomCopyFormat) && (
            <TabPanel value={tabValue} index={9}>
              <AdvancedSettings
                appSettings={appSettings}
                setAppSettings={setAppSettings}
                generalDisplaySettings={generalDisplaySettings}
              />
            </TabPanel>
          )}
        </DialogContent>
      </Dialog>
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

export default FloatingIcon;