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
import CloseIcon from "@mui/icons-material/Close";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HealingIcon from "@mui/icons-material/Healing";
import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
import { medicationProcessor } from "../utils/medicationProcessor";
import { labProcessor } from "../utils/labProcessor";
import { chineseMedProcessor } from "../utils/chineseMedProcessor";
import { imagingProcessor } from "../utils/imagingProcessor";
import { allergyProcessor } from "../utils/allergyProcessor";
import { surgeryProcessor } from "../utils/surgeryProcessor";
import { dischargeProcessor } from "../utils/dischargeProcessor";
import { medDaysProcessor } from "../utils/medDaysProcessor";
import { dashboardProcessor } from "../utils/dashboardProcessor";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Snackbar from "@mui/material/Snackbar";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DEFAULT_LAB_TESTS, DEFAULT_IMAGE_TESTS } from './settings/OverviewSettings';

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

import HomeIcon from '@mui/icons-material/Home';
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
import ImageIcon from '@mui/icons-material/Image';
import InventoryIcon from '@mui/icons-material/Inventory';

import TableChartIcon from '@mui/icons-material/TableChart';
import TableViewIcon from '@mui/icons-material/TableView';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import BiotechIcon from '@mui/icons-material/Biotech';

// Import patient summary processor
import { patientSummaryProcessor } from "../utils/patientSummaryProcessor";

// Font size mapping for different display settings
const TITLE_TEXT_SIZES = {
  small: '1.25rem', // h6 equivalent (20px)
  medium: '1.5rem',  // h5 equivalent (24px)
  large: '2.125rem' // h4 equivalent (34px)
};

const CONTENT_TEXT_SIZES = {
  small: '0.875rem', // body2 equivalent (14px)
  medium: '1rem',    // body1 equivalent (16px)
  large: '1.125rem'  // subtitle1 equivalent (18px)
};

const NOTE_TEXT_SIZES = {
  small: '0.75rem',  // caption equivalent (12px)
  medium: '0.875rem', // body2 equivalent (14px)
  large: '1rem'      // body1 equivalent (16px)
};

// Define DEFAULT_ATC5_GROUPS
const DEFAULT_ATC5_GROUPS = {
  NSAID: ['M01AA', 'M01AB', 'M01AC', 'M01AE', 'M01AG', 'M01AH'],
  ACEI: ['C09AA', 'C09BA', 'C09BB', 'C09BX'],
  ARB: ['C09CA', 'C09DA', 'C09DB', 'C09DX'],
  STATIN: ['C10AA', 'C10BA', 'C10BX'],
  SGLT2: ['A10BK', 'A10BD15', 'A10BD16', 'A10BD19', 'A10BD20', 'A10BD21', 'A10BD25', 'A10BD27', 'A10BD29', 'A10BD30'],
  GLP1: ['A10BJ', 'A10AE54', 'A10AE56'],
};

// Consolidated default settings
const DEFAULT_SETTINGS = {
  western: {
    simplifyMedicineName: true,
    showGenericName: false,
    showDiagnosis: true,
    showATC5Name: false,
    copyFormat: "nameWithDosageVertical",
  },
  atc5: {
    enableColors: true,
    groups: DEFAULT_ATC5_GROUPS,
    colorGroups: {
      red: ['NSAID'],
      orange: ['ARB','ACEI','STATIN'],
      green: [],
    },
  },
  chinese: {
    showDiagnosis: false,
    showEffectName: false,
    copyFormat: "nameWithDosageVertical",
  },
  lab: {
    displayFormat: "byType",
    showUnit: false,
    showReference: false,
    enableAbbrev: true,
    highlightAbnormal: true,
    copyFormat: "horizontal",
  },
  overview: {
    medicationTrackingDays: 100,
    labTrackingDays: 180,
    imageTrackingDays: 180,
    focusedLabTests: DEFAULT_LAB_TESTS,
    focusedImageTests: DEFAULT_IMAGE_TESTS
  },
  general: {
    autoOpenPage: false,
    titleTextSize: 'medium',
    contentTextSize: 'medium',
    noteTextSize: 'small',
    floatingIconPosition: 'top-right',
    alwaysOpenOverviewTab: true
  }
};

// ImagingTable 組件
const ImagingTable = ({ data, hasReport }) => (
  <TableContainer component={Paper}>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>日期</TableCell>
          <TableCell>醫院</TableCell>
          <TableCell>檢查項目</TableCell>
          {hasReport && <TableCell>報告結果</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index}>
            <TableCell>{item.date}</TableCell>
            <TableCell>{item.hosp}</TableCell>
            <TableCell>{item.orderName}</TableCell>
            {hasReport && <TableCell>{item.inspectResult}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

// Helper function to extract GFR value from patient summary data
const extractGFRValue = (patientSummaryData) => {
  if (!patientSummaryData || patientSummaryData.length === 0) return null;
  
  // Search through all summary items
  for (const item of patientSummaryData) {
    if (!item.originalText) continue;
    
    // Look for the GFR text pattern
    const gfrPattern = /最近一筆eGFR值為\[(\d+)\]/;
    const match = item.originalText.match(gfrPattern);
    
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  
  return null;
};

// Helper function to determine CKD stage based on GFR value
const getCKDStage = (gfrValue) => {
  if (gfrValue === null) return null;
  
  if (gfrValue >= 30 && gfrValue < 60) {
    return 3;
  } else if (gfrValue >= 15 && gfrValue < 30) {
    return 4;
  } else if (gfrValue < 15) {
    return 5;
  }
  
  return null; // No CKD or data not available
};

// Status indicator component
const StatusIndicator = ({ label, hasData, icon, fontSize, tooltipTitle }) => {
  // Use NOTE_TEXT_SIZES with a default in case fontSize is not provided
  const fontSizeValue = NOTE_TEXT_SIZES[fontSize] || NOTE_TEXT_SIZES['small'];
  
  return (
    <Tooltip title={tooltipTitle || (hasData ? `有${label}資料` : `無${label}資料`)}>
      <Chip
        icon={React.createElement(icon)}
        label={label}
        size="small"
        color={hasData ? "success" : "default"}
        variant={hasData ? "filled" : "outlined"}
        sx={{ 
          mx: 0.5,
          '& .MuiChip-label': {
            fontSize: fontSizeValue
          }
        }}
      />
    </Tooltip>
  );
};

// Kidney status indicator component
const KidneyStatusIndicator = ({ stage, fontSize }) => {
  if (stage === null) return null;
  
  // Use NOTE_TEXT_SIZES with a default in case fontSize is not provided
  const fontSizeValue = NOTE_TEXT_SIZES[fontSize] || NOTE_TEXT_SIZES['small'];
  
  // Determine color based on stage
  let color;
  switch(stage) {
    case 3:
      color = "warning"; // Orange for Stage 3
      break;
    case 4:
    case 5:
      color = "error"; // Red for Stage 4-5
      break;
    default:
      color = "default";
  }
  
  return (
    <Tooltip title={`慢性腎臟病 Stage ${stage}`}>
      <Chip
        icon={<ReportRoundedIcon />}
        label={`CKD${stage}`}
        size="small"
        color={color}
        sx={{ 
          mx: 0.5,
          '& .MuiChip-label': {
            fontSize: fontSizeValue
          }
        }}
      />
    </Tooltip>
  );
};

// 添加一個函數來獲取狀態顏色
const getLabStatusColor = (valueStatus, highlightAbnormal) => {
  if (!highlightAbnormal) return null;
  
  if (valueStatus === "high") return "#f44336"; // 紅色
  if (valueStatus === "low") return "#2196f3";  // 藍色
  return null; // 正常值
};

const getLabValueColor = (lab, settings) => {
  if (!lab || !settings?.highlightAbnormalLab) return "inherit";
  
  if (lab.valueStatus === "high") return "#f44336"; // 紅色
  if (lab.valueStatus === "low") return "#2196f3";  // 藍色
  
  // 向後兼容：如果沒有 valueStatus 但有 isAbnormal
  if (lab.valueStatus === undefined && lab.isAbnormal) return "#f44336";
  
  return "inherit"; // 正常值
};

const FloatingIcon = () => {
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [groupedMedications, setGroupedMedications] = useState([]);
  const [groupedLabs, setGroupedLabs] = useState([]);
  const [groupedChineseMeds, setGroupedChineseMeds] = useState([]);
  const [imagingData, setImagingData] = useState({ withReport: [], withoutReport: [] });
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
  const [generalDisplaySettings, setGeneralDisplaySettings] = useState(DEFAULT_SETTINGS.general);
  
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
  const isNarrowScreen = useMediaQuery(theme.breakpoints.down('lg'));

  // 在組件載入時處理資料
  useEffect(() => {
    const handleData = () => {
      const dataSources = {
        medication: window.lastInterceptedMedicationData,
        labData: window.lastInterceptedLabData,
        chinesemed: window.lastInterceptedChineseMedData,
        imaging: window.lastInterceptedImagingData,
        allergy: window.lastInterceptedAllergyData,
        surgery: window.lastInterceptedSurgeryData,
        discharge: window.lastInterceptedDischargeData,
        medDays: window.lastInterceptedMedDaysData,
        patientsummary: window.lastInterceptedPatientSummaryData,
        patientSummary: window.lastInterceptedPatientSummaryData || window.lastInterceptedPatientSummaryData
      };

      if (dataSources.medication?.rObject) {
        medicationProcessor
          .processMedicationData(dataSources.medication)
          .then((processed) => {
            setGroupedMedications(processed);
          });
      }
      if (dataSources.labData?.rObject) {
        const processedLabs = labProcessor.processLabData(
          dataSources.labData, 
          appSettings.lab
        );
        setGroupedLabs(processedLabs);
      }
      if (dataSources.chinesemed?.rObject) {
        setGroupedChineseMeds(
          chineseMedProcessor.processChineseMedData(dataSources.chinesemed)
        );
      }
      if (dataSources.imaging?.rObject) {
        setImagingData(
          imagingProcessor.processImagingData(dataSources.imaging)
        );
      }
      if (dataSources.allergy?.rObject) {
        setAllergyData(
          allergyProcessor.processAllergyData(dataSources.allergy)
        );
      }
      if (dataSources.surgery?.rObject) {
        setSurgeryData(
          surgeryProcessor.processSurgeryData(dataSources.surgery)
        );
      }
      if (dataSources.discharge?.rObject) {
        setDischargeData(
          dischargeProcessor.processDischargeData(dataSources.discharge)
        );
      }
      if (dataSources.medDays?.rObject) {
        setMedDaysData(
          medDaysProcessor.processMedDaysData(dataSources.medDays)
        );
      }
      if (dataSources.patientsummary?.rObject) {
        const processedData = patientSummaryProcessor.processPatientSummaryData(dataSources.patientsummary);
        setPatientSummaryData(processedData);
      } else if (dataSources.patientSummary?.rObject) {
        // Try with capital S as fallback
        const processedData = patientSummaryProcessor.processPatientSummaryData(dataSources.patientSummary);
        setPatientSummaryData(processedData);
      } else {
        console.log("Lab Data - No patient summary data found");
      }
      if (dataSources.medication?.rObject && dataSources.chinesemed?.rObject) {
        setDashboardData(
          dashboardProcessor.processDashboardData({
            medicationData: dataSources.medication,
            chineseMedData: dataSources.chinesemed,
          })
        );
      }
    };

    // 初次執行
    handleData();

    // 監聽資料完成事件
    window.addEventListener("dataFetchCompleted", handleData);

    return () => {
      window.removeEventListener("dataFetchCompleted", handleData);
    };
  }, [appSettings.lab]);

  // Fetch the user's settings from storage, falling back to defaults when needed
  useEffect(() => {
    // Fetch settings from Chrome storage
    
    chrome.storage.sync.get(
      {
        // Western medication settings
        simplifyMedicineName: DEFAULT_SETTINGS.western.simplifyMedicineName,
        showGenericName: DEFAULT_SETTINGS.western.showGenericName,
        showDiagnosis: DEFAULT_SETTINGS.western.showDiagnosis,
        showATC5Name: DEFAULT_SETTINGS.western.showATC5Name,
        copyFormat: DEFAULT_SETTINGS.western.copyFormat,
        // ATC5 Color settings
        enableATC5Colors: DEFAULT_SETTINGS.atc5.enableColors,
        atc5Groups: DEFAULT_SETTINGS.atc5.groups,
        atc5ColorGroups: DEFAULT_SETTINGS.atc5.colorGroups,
        // Chinese medicine settings
        chineseMedShowDiagnosis: DEFAULT_SETTINGS.chinese.showDiagnosis,
        chineseMedShowEffectName: DEFAULT_SETTINGS.chinese.showEffectName,
        chineseMedCopyFormat: DEFAULT_SETTINGS.chinese.copyFormat,
        // Lab settings
        labDisplayFormat: DEFAULT_SETTINGS.lab.displayFormat,
        showLabUnit: DEFAULT_SETTINGS.lab.showUnit,
        showLabReference: DEFAULT_SETTINGS.lab.showReference,
        enableLabAbbrev: DEFAULT_SETTINGS.lab.enableAbbrev,
        highlightAbnormalLab: DEFAULT_SETTINGS.lab.highlightAbnormal,
        labCopyFormat: DEFAULT_SETTINGS.lab.copyFormat,
        // Overview settings
        medicationTrackingDays: DEFAULT_SETTINGS.overview.medicationTrackingDays,
        labTrackingDays: DEFAULT_SETTINGS.overview.labTrackingDays,
        imageTrackingDays: DEFAULT_SETTINGS.overview.imageTrackingDays,
        focusedLabTests: DEFAULT_SETTINGS.overview.focusedLabTests,
        focusedImageTests: DEFAULT_SETTINGS.overview.focusedImageTests
      },
      (items) => {
        // Update all settings in the consolidated structure
        setAppSettings({
          western: {
            simplifyMedicineName: items.simplifyMedicineName,
            showGenericName: items.showGenericName,
            showDiagnosis: items.showDiagnosis,
            showATC5Name: items.showATC5Name,
            copyFormat: items.copyFormat,
          },
          atc5: {
            enableColors: items.enableATC5Colors,
            groups: items.atc5Groups,
            colorGroups: items.atc5ColorGroups,
          },
          chinese: {
            showDiagnosis: items.chineseMedShowDiagnosis,
            showEffectName: items.chineseMedShowEffectName,
            copyFormat: items.chineseMedCopyFormat,
          },
          lab: {
            displayFormat: items.labDisplayFormat,
            showUnit: items.showLabUnit,
            showReference: items.showLabReference,
            enableAbbrev: items.enableLabAbbrev,
            highlightAbnormal: items.highlightAbnormalLab,
            copyFormat: items.labCopyFormat,
          },
          overview: {
            medicationTrackingDays: items.medicationTrackingDays,
            labTrackingDays: items.labTrackingDays,
            imageTrackingDays: items.imageTrackingDays,
            focusedLabTests: items.focusedLabTests || DEFAULT_LAB_TESTS,
            focusedImageTests: items.focusedImageTests || DEFAULT_IMAGE_TESTS
          }
        });
      }
    );
  }, []);

  // Update the useEffect hook for settings changes
  useEffect(() => {
    // First, import the DEFAULT_ATC5_GROUPS from the same location it's defined
    const DEFAULT_ATC5_GROUPS = {
      NSAID: ['M01AA', 'M01AB', 'M01AC', 'M01AE', 'M01AG', 'M01AH'],
      ACEI: ['C09AA', 'C09BA', 'C09BB'],
      ARB: ['C09CA', 'C09DA', 'C09DB'],
      STATIN: ['C10AA', 'C10BA', 'C10BX'],
      SGLT2: ['A10BK', 'A10BD19'],
      GLP1: ['A10BJ', 'A10BX'],
    };

    chrome.storage.sync.get(
      {
        // Western medication settings
        simplifyMedicineName: DEFAULT_SETTINGS.western.simplifyMedicineName,
        showGenericName: DEFAULT_SETTINGS.western.showGenericName,
        showDiagnosis: DEFAULT_SETTINGS.western.showDiagnosis,
        showATC5Name: DEFAULT_SETTINGS.western.showATC5Name,
        copyFormat: DEFAULT_SETTINGS.western.copyFormat,
        // ATC5 Color settings
        enableATC5Colors: DEFAULT_SETTINGS.atc5.enableColors,
        atc5Groups: DEFAULT_SETTINGS.atc5.groups,
        atc5ColorGroups: DEFAULT_SETTINGS.atc5.colorGroups,
        // Chinese medicine settings
        chineseMedShowDiagnosis: DEFAULT_SETTINGS.chinese.showDiagnosis,
        chineseMedShowEffectName: DEFAULT_SETTINGS.chinese.showEffectName,
        chineseMedCopyFormat: DEFAULT_SETTINGS.chinese.copyFormat,
        // Lab settings
        labDisplayFormat: DEFAULT_SETTINGS.lab.displayFormat,
        showLabUnit: DEFAULT_SETTINGS.lab.showUnit,
        showLabReference: DEFAULT_SETTINGS.lab.showReference,
        enableLabAbbrev: DEFAULT_SETTINGS.lab.enableAbbrev,
        highlightAbnormalLab: DEFAULT_SETTINGS.lab.highlightAbnormal,
        labCopyFormat: DEFAULT_SETTINGS.lab.copyFormat,
        // Overview settings
        medicationTrackingDays: DEFAULT_SETTINGS.overview.medicationTrackingDays,
        labTrackingDays: DEFAULT_SETTINGS.overview.labTrackingDays,
        imageTrackingDays: DEFAULT_SETTINGS.overview.imageTrackingDays,
        focusedLabTests: DEFAULT_SETTINGS.overview.focusedLabTests,
        focusedImageTests: DEFAULT_SETTINGS.overview.focusedImageTests
      },
      (items) => {
        // Update all settings in the consolidated structure
        setAppSettings({
          western: {
            simplifyMedicineName: items.simplifyMedicineName,
            showGenericName: items.showGenericName,
            showDiagnosis: items.showDiagnosis,
            showATC5Name: items.showATC5Name,
            copyFormat: items.copyFormat,
          },
          atc5: {
            enableColors: items.enableATC5Colors,
            groups: items.atc5Groups,
            colorGroups: items.atc5ColorGroups,
          },
          chinese: {
            showDiagnosis: items.chineseMedShowDiagnosis,
            showEffectName: items.chineseMedShowEffectName,
            copyFormat: items.chineseMedCopyFormat,
          },
          lab: {
            displayFormat: items.labDisplayFormat,
            showUnit: items.showLabUnit,
            showReference: items.showLabReference,
            enableAbbrev: items.enableLabAbbrev,
            highlightAbnormal: items.highlightAbnormalLab,
            copyFormat: items.labCopyFormat,
          },
          overview: {
            medicationTrackingDays: items.medicationTrackingDays,
            labTrackingDays: items.labTrackingDays,
            imageTrackingDays: items.imageTrackingDays,
            focusedLabTests: items.focusedLabTests || DEFAULT_LAB_TESTS,
            focusedImageTests: items.focusedImageTests || DEFAULT_IMAGE_TESTS
          }
        });
      }
    );

    // 更新儲存變更處理函數
    const handleStorageChange = (changes, area) => {
      if (area === "sync") {
        // When settings change, get all settings
        chrome.storage.sync.get(
          {
            // Western medication settings
            simplifyMedicineName: DEFAULT_SETTINGS.western.simplifyMedicineName,
            showGenericName: DEFAULT_SETTINGS.western.showGenericName,
            showDiagnosis: DEFAULT_SETTINGS.western.showDiagnosis,
            showATC5Name: DEFAULT_SETTINGS.western.showATC5Name,
            copyFormat: DEFAULT_SETTINGS.western.copyFormat,
            // ATC5 Color settings
            enableATC5Colors: DEFAULT_SETTINGS.atc5.enableColors,
            atc5Groups: DEFAULT_SETTINGS.atc5.groups,
            atc5ColorGroups: DEFAULT_SETTINGS.atc5.colorGroups,
            // Chinese medicine settings
            chineseMedShowDiagnosis: DEFAULT_SETTINGS.chinese.showDiagnosis,
            chineseMedShowEffectName: DEFAULT_SETTINGS.chinese.showEffectName,
            chineseMedCopyFormat: DEFAULT_SETTINGS.chinese.copyFormat,
            // Lab settings
            labDisplayFormat: DEFAULT_SETTINGS.lab.displayFormat,
            showLabUnit: DEFAULT_SETTINGS.lab.showUnit,
            showLabReference: DEFAULT_SETTINGS.lab.showReference,
            enableLabAbbrev: DEFAULT_SETTINGS.lab.enableAbbrev,
            highlightAbnormalLab: DEFAULT_SETTINGS.lab.highlightAbnormal,
            labCopyFormat: DEFAULT_SETTINGS.lab.copyFormat,
            // Overview settings
            medicationTrackingDays: DEFAULT_SETTINGS.overview.medicationTrackingDays,
            labTrackingDays: DEFAULT_SETTINGS.overview.labTrackingDays,
            imageTrackingDays: DEFAULT_SETTINGS.overview.imageTrackingDays,
            focusedLabTests: DEFAULT_SETTINGS.overview.focusedLabTests,
            focusedImageTests: DEFAULT_SETTINGS.overview.focusedImageTests
          },
          (items) => {
            // Update all settings in the consolidated structure
            setAppSettings({
              western: {
                simplifyMedicineName: items.simplifyMedicineName,
                showGenericName: items.showGenericName,
                showDiagnosis: items.showDiagnosis,
                showATC5Name: items.showATC5Name,
                copyFormat: items.copyFormat,
              },
              atc5: {
                enableColors: items.enableATC5Colors,
                groups: items.atc5Groups,
                colorGroups: items.atc5ColorGroups,
              },
              chinese: {
                showDiagnosis: items.chineseMedShowDiagnosis,
                showEffectName: items.chineseMedShowEffectName,
                copyFormat: items.chineseMedCopyFormat,
              },
              lab: {
                displayFormat: items.labDisplayFormat,
                showUnit: items.showLabUnit,
                showReference: items.showLabReference,
                enableAbbrev: items.enableLabAbbrev,
                highlightAbnormal: items.highlightAbnormalLab,
                copyFormat: items.labCopyFormat,
              },
              overview: {
                medicationTrackingDays: items.medicationTrackingDays,
                labTrackingDays: items.labTrackingDays,
                imageTrackingDays: items.imageTrackingDays,
                focusedLabTests: items.focusedLabTests || DEFAULT_LAB_TESTS,
                focusedImageTests: items.focusedImageTests || DEFAULT_IMAGE_TESTS
              }
            });
          }
        );
      }
    };

    // 註冊監聽器
    chrome.storage.onChanged.addListener(handleStorageChange);

    // 監聽來自 popup 的直接設定變更消息
    const handleMessage = (message) => {
      if (message.action === "settingChanged") {
        // 使用完整設定物件更新設定，而不僅是變更的設定
        if (message.allSettings) {
          // 更新西藥設定
          if (!message.setting.startsWith("chineseMed")) {
            const newSettings = {
              simplifyMedicineName: message.allSettings.simplifyMedicineName,
              showGenericName: message.allSettings.showGenericName,
              showDiagnosis: message.allSettings.showDiagnosis,
              showATC5Name: message.allSettings.showATC5Name,
              enableATC5Colors: message.allSettings.enableATC5Colors,
              atc5Groups: message.allSettings.atc5Groups,
              atc5ColorGroups: message.allSettings.atc5ColorGroups,
            };
            setAppSettings(prevSettings => ({
              ...prevSettings,
              western: newSettings
            }));

            if (message.setting === "copyFormat") {
              setAppSettings(prevSettings => ({
                ...prevSettings,
                western: {
                  ...prevSettings.western,
                  copyFormat: message.value
                }
              }));
            }

            // 使用更新後的設定重新處理藥物數據
            if (window.lastInterceptedMedicationData?.rObject) {
              const processingSettings = {
                simplifyMedicineName: newSettings.simplifyMedicineName,
                showGenericName: newSettings.showGenericName,
                showDiagnosis: newSettings.showDiagnosis,
                showATC5Name: newSettings.showATC5Name,
                enableATC5Colors: newSettings.enableATC5Colors,
                atc5Groups: newSettings.atc5Groups,
                atc5ColorGroups: newSettings.atc5ColorGroups,
              };
              
              medicationProcessor
                .processMedicationData(window.lastInterceptedMedicationData, processingSettings)
                .then((processed) => {
                  setGroupedMedications(processed);
                });
            }
          }
          // 中藥設定處理 (保持原有邏輯)
          else {
            // ... 現有中藥設定處理代碼 ...
          }
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  useEffect(() => {
  }, [appSettings.chinese]);

  // Load lab settings
  useEffect(() => {
    chrome.storage.sync.get({
      labDisplayFormat: "byType",
      showLabUnit: false,
      showLabReference: false,
      enableLabAbbrev: true,
      highlightAbnormalLab: true,
      labCopyFormat: "horizontal",
    }, (items) => {
      setAppSettings(prevSettings => ({
        ...prevSettings,
        lab: {
          ...prevSettings.lab,
          displayFormat: items.labDisplayFormat,
          showUnit: items.showLabUnit,
          showReference: items.showLabReference,
          enableAbbrev: items.enableLabAbbrev,
          highlightAbnormal: items.highlightAbnormalLab,
          copyFormat: items.labCopyFormat,
        }
      }));
    });
  }, []);
  
  // Load general display settings
  useEffect(() => {
    chrome.storage.sync.get({
      autoOpenPage: DEFAULT_SETTINGS.general.autoOpenPage,
      titleTextSize: DEFAULT_SETTINGS.general.titleTextSize,
      contentTextSize: DEFAULT_SETTINGS.general.contentTextSize,
      noteTextSize: DEFAULT_SETTINGS.general.noteTextSize,
      floatingIconPosition: DEFAULT_SETTINGS.general.floatingIconPosition,
      alwaysOpenOverviewTab: DEFAULT_SETTINGS.general.alwaysOpenOverviewTab
    }, (items) => {
      setGeneralDisplaySettings({
        autoOpenPage: items.autoOpenPage,
        titleTextSize: items.titleTextSize,
        contentTextSize: items.contentTextSize,
        noteTextSize: items.noteTextSize,
        floatingIconPosition: items.floatingIconPosition,
        alwaysOpenOverviewTab: items.alwaysOpenOverviewTab
      });
    });
  }, []);

  // Update lab settings and reprocess data when settings change
  useEffect(() => {
    const handleLabSettingsChange = (changes, area) => {
      if (area === "sync") {
        const labSettingsChanged = [
          "labDisplayFormat",
          "showLabUnit",
          "showLabReference",
          "enableLabAbbrev",
          "highlightAbnormalLab",
          "labCopyFormat",
        ].some(key => changes[key]);

        if (labSettingsChanged) {
          chrome.storage.sync.get({
            labDisplayFormat: DEFAULT_SETTINGS.lab.displayFormat,
            showLabUnit: DEFAULT_SETTINGS.lab.showUnit,
            showLabReference: DEFAULT_SETTINGS.lab.showReference,
            enableLabAbbrev: DEFAULT_SETTINGS.lab.enableAbbrev,
            highlightAbnormalLab: DEFAULT_SETTINGS.lab.highlightAbnormal,
            labCopyFormat: DEFAULT_SETTINGS.lab.copyFormat,
          }, (items) => {
            // Update the lab settings state
            const updatedLabSettings = {
              displayFormat: items.labDisplayFormat,
              showUnit: items.showLabUnit,
              showReference: items.showLabReference,
              enableAbbrev: items.enableLabAbbrev,
              highlightAbnormal: items.highlightAbnormalLab,
              copyFormat: items.labCopyFormat,
            };
            
            setAppSettings(prevSettings => ({
              ...prevSettings,
              lab: updatedLabSettings
            }));
            
            // Reprocess lab data with new settings
            if (window.lastInterceptedLabData) {
              const processedLabs = labProcessor.processLabData(
                window.lastInterceptedLabData, 
                updatedLabSettings
              );
              setGroupedLabs(processedLabs);
            }
          });
        }
      }
    };

    chrome.storage.onChanged.addListener(handleLabSettingsChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleLabSettingsChange);
    };
  }, []);

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

  const handleCopyMedications = (medications, group) => {
    if (appSettings.western.copyFormat === "none") {
      return;
    }

    const groupInfo = {
      date: group.date,
      hosp: group.hosp,
      icd_code: group.icd_code,
      icd_name: group.icd_name,
      showDiagnosis: appSettings.western.showDiagnosis,
    };

    const formattedText = medicationProcessor.formatMedicationList(
      medications,
      appSettings.western.copyFormat,
      groupInfo
    );
    navigator.clipboard
      .writeText(formattedText)
      .then(() => {
        setSnackbarMessage("藥物清單已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy medications: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  const handleCopyChineseMedications = (medications, group) => {
    if (appSettings.chinese.copyFormat === "none") {
      return;
    }

    const groupInfo = {
      date: group.date,
      hosp: group.hosp,
      icd_code: group.icd_code,
      icd_name: group.icd_name,
      showDiagnosis: appSettings.chinese.showDiagnosis,
      showEffectName: appSettings.chinese.showEffectName,
    };

    const formattedText = chineseMedProcessor.formatChineseMedList(
      medications,
      appSettings.chinese.copyFormat,
      groupInfo
    );
    navigator.clipboard
      .writeText(formattedText)
      .then(() => {
        setSnackbarMessage("中藥清單已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy Chinese medications: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Update the data fetch completed event listener
  useEffect(() => {
    const handleDataFetchCompleted = (event) => {
      // Handle setting changes
      if (event.detail?.settingsChanged) {
        // For Chinese medicine settings, refresh with all current settings
        if (
          event.detail.settingType === "chinesemed" &&
          event.detail.allSettings
        ) {
          // Update all Chinese med settings at once
          const newChineseMedSettings = {
            showDiagnosis: event.detail.allSettings.chineseMedShowDiagnosis,
            showEffectName: event.detail.allSettings.chineseMedShowEffectName,
            copyFormat: event.detail.allSettings.chineseMedCopyFormat,
          };

          setAppSettings(prevSettings => ({
            ...prevSettings,
            chinese: newChineseMedSettings
          }));

          // Refresh Chinese medicine display if data exists
          if (window.lastInterceptedChineseMedData) {
            setGroupedChineseMeds(
              chineseMedProcessor.processChineseMedData(
                window.lastInterceptedChineseMedData
              )
            );
          }
        }
        
        // Handle lab settings changes
        if (event.detail.settingType === "labsettings" && event.detail.allSettings) {
          // Update all lab settings at once
          const newLabSettings = {
            labDisplayFormat: event.detail.allSettings.labDisplayFormat,
            showLabUnit: event.detail.allSettings.showLabUnit,
            showLabReference: event.detail.allSettings.showLabReference,
            enableLabAbbrev: event.detail.allSettings.enableLabAbbrev,
            highlightAbnormalLab: event.detail.allSettings.highlightAbnormalLab,
            labCopyFormat: event.detail.allSettings.labCopyFormat,
          };

          setAppSettings(prevSettings => ({
            ...prevSettings,
            lab: newLabSettings
          }));

          // Refresh lab display if data exists
          if (window.lastInterceptedLabData) {
            const processedLabs = labProcessor.processLabData(
              window.lastInterceptedLabData, 
              newLabSettings
            );
            setGroupedLabs(processedLabs);
          }
        } else if (event.detail.settingType === "labsettings") {
          // Create updated settings object
          const updatedSettings = {
            ...appSettings.lab,
            [event.detail.setting]: event.detail.value
          };
          
          // Update state
          setAppSettings(prevSettings => ({
            ...prevSettings,
            lab: updatedSettings
          }));
          
          // Reprocess data with new settings
          if (window.lastInterceptedLabData) {
            const processedLabs = labProcessor.processLabData(
              window.lastInterceptedLabData, 
              updatedSettings
            );
            setGroupedLabs(processedLabs);
          }
        }
        
        // Handle overview settings changes
        if (event.detail.settingType === "overview" && event.detail.allSettings) {
          // Update overview settings
          const newOverviewSettings = {
            medicationTrackingDays: event.detail.allSettings.medicationTrackingDays,
            labTrackingDays: event.detail.allSettings.labTrackingDays,
            imageTrackingDays: event.detail.allSettings.imageTrackingDays,
            focusedLabTests: event.detail.allSettings.focusedLabTests || DEFAULT_LAB_TESTS,
            focusedImageTests: event.detail.allSettings.focusedImageTests || DEFAULT_IMAGE_TESTS
          };
          
          // Save current settings before update
          setAppSettings(prevSettings => {
            // Force reprocess medication data when tracking days change - USING CURRENT SETTINGS
            if (window.lastInterceptedMedicationData?.rObject) {
              // Using current, intact settings object
              const currentSettings = {
                simplifyMedicineName: appSettings.western.simplifyMedicineName,
                showGenericName: appSettings.western.showGenericName,
                showDiagnosis: appSettings.western.showDiagnosis,
                showATC5Name: appSettings.western.showATC5Name,
                enableATC5Colors: appSettings.atc5.enableColors,
                atc5Groups: appSettings.atc5.groups,
                atc5ColorGroups: appSettings.atc5.colorGroups,
              };
              
              medicationProcessor
                .processMedicationData(window.lastInterceptedMedicationData, currentSettings)
                .then((processed) => {
                  setGroupedMedications(processed);
                });
            }
            
            return {
              ...prevSettings,
              overview: newOverviewSettings
            };
          });
          
        } else if (event.detail.settingType === "overview") {
          // Create updated settings object
          const updatedSettings = {
            ...appSettings.overview,
            [event.detail.setting]: event.detail.value
          };
          
          // Update state
          setAppSettings(prevSettings => ({
            ...prevSettings,
            overview: updatedSettings
          }));
          
          // If this is a specific setting change like tracking days
          if (event.detail.setting === "medicationTrackingDays" || 
              event.detail.setting === "labTrackingDays" ||
              event.detail.setting === "imageTrackingDays" ||
              event.detail.setting === "focusedLabTests" ||
              event.detail.setting === "focusedImageTests") {
            
            // Update just the changed setting
            setAppSettings(prevSettings => ({
              ...prevSettings,
              overview: {
                ...prevSettings.overview,
                [event.detail.setting]: event.detail.value
              }
            }));
            
            // Process data with new settings if needed
            if (window.lastInterceptedMedicationData?.rObject) {
              medicationProcessor
                .processMedicationData(window.lastInterceptedMedicationData, appSettings.western)
                .then((processed) => {
                  setGroupedMedications(processed);
                });
            }
          }
        }
        
        // Handle general display settings changes
        if (event.detail.settingType === "generalDisplay" && event.detail.allSettings) {
          // Update general display settings
          const newGeneralDisplaySettings = {
            autoOpenPage: event.detail.allSettings.autoOpenPage,
            titleTextSize: event.detail.allSettings.titleTextSize,
            contentTextSize: event.detail.allSettings.contentTextSize,
            noteTextSize: event.detail.allSettings.noteTextSize,
            floatingIconPosition: event.detail.allSettings.floatingIconPosition,
            alwaysOpenOverviewTab: event.detail.allSettings.alwaysOpenOverviewTab
          };
          
          // Update state
          setGeneralDisplaySettings(newGeneralDisplaySettings);
        } else if (event.detail.settingType === "generalDisplay") {
          // Create updated settings object for single setting change
          const updatedSettings = {
            ...generalDisplaySettings,
            [event.detail.setting]: event.detail.value
          };
          
          // Update state
          setGeneralDisplaySettings(updatedSettings);
        }
      }
    };

    window.addEventListener("dataFetchCompleted", handleDataFetchCompleted);

    return () => {
      window.removeEventListener(
        "dataFetchCompleted",
        handleDataFetchCompleted
      );
    };
  }, [appSettings.overview, generalDisplaySettings]);

  // Update the handleCopyLabData function to use horizontal format by default
  const handleCopyLabData = (group) => {
    let formattedText = `${group.date} - ${group.hosp}\n`;

    // Changed default behavior to horizontal format
    if (appSettings.lab.copyFormat === "vertical") {
      // Vertical format: each lab item on a new line
      group.labs.forEach((lab) => {
        // Use order_name as fallback if itemName is null
        const displayName = lab.itemName || lab.orderName;
        let labLine = `${displayName}: ${lab.value}`;
        if (appSettings.lab.showUnit && lab.unit) {
          labLine += ` ${lab.unit}`;
        }
        if (appSettings.lab.showReference) {
          if (lab.referenceMin !== null) {
            labLine += ` (${lab.referenceMin}${lab.referenceMax !== null ? `-${lab.referenceMax}` : ''})`;
          } else if (lab.consultValue) {
            labLine += ` (${lab.consultValue.min}-${lab.consultValue.max})`;
          }
        }
        formattedText += `${labLine}\n`;
      });
    } else {
      // Horizontal format: lab items on the same line, separated by spaces
      let labItems = group.labs.map((lab) => {
        // Use order_name as fallback if itemName is null
        const displayName = lab.itemName || lab.orderName;
        let labText = `${displayName}: ${lab.value}`;
        if (appSettings.lab.showUnit && lab.unit) {
          labText += ` ${lab.unit}`;
        }
        if (appSettings.lab.showReference) {
          if (lab.referenceMin !== null) {
            labText += ` (${lab.referenceMin}${lab.referenceMax !== null ? `-${lab.referenceMax}` : ''})`;
          } else if (lab.consultValue) {
            labText += ` (${lab.consultValue.min}-${lab.consultValue.max})`;
          }
        }
        return labText;
      });
      formattedText += labItems.join(" | ");
    }
    
    navigator.clipboard
      .writeText(formattedText)
      .then(() => {
        setSnackbarMessage("檢驗資料已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy lab data: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  // Calculate CKD stage in the render section
  const gfrValue = extractGFRValue(patientSummaryData);
  const ckdStage = getCKDStage(gfrValue);

  // Get position styles based on settings
  const getIconPositionStyle = () => {
    const baseStyle = {
      position: "fixed",
      right: "20px",
      zIndex: 1000,
      backgroundColor: "#1976d2",
      color: "white",
    };
    
    switch (generalDisplaySettings.floatingIconPosition) {
      case 'top-right':
        return { ...baseStyle, top: "20px" };
      case 'middle-right':
        return { ...baseStyle, top: "50%", transform: "translateY(-50%)" };
      case 'bottom-right':
        return { ...baseStyle, bottom: "20px" };
      default:
        return { ...baseStyle, bottom: "20px" }; // Default to bottom-right
    }
  };

  // 檢查是否有 90 天內的 CT 檢查
  const hasRecentCTScan = () => {
    if (!imagingData || (!imagingData.withReport && !imagingData.withoutReport)) {
      return false;
    }
    
    const ctOrderCodes = ['33072B', '33070B'];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // 檢查有報告的影像
    const hasCtInReports = imagingData.withReport.some(item => {
      const scanDate = new Date(item.date);
      return ctOrderCodes.includes(item.order_code) && scanDate >= ninetyDaysAgo;
    });
    
    // 檢查無報告的影像
    const hasCtInPending = imagingData.withoutReport.some(item => {
      const scanDate = new Date(item.date);
      return ctOrderCodes.includes(item.order_code) && scanDate >= ninetyDaysAgo;
    });
    
    return hasCtInReports || hasCtInPending;
  };

  // 檢查是否有 90 天內的 MRI 檢查
  const hasRecentMRIScan = () => {
    if (!imagingData || (!imagingData.withReport && !imagingData.withoutReport)) {
      return false;
    }
    
    const mriOrderCodes = ['33085B', '33084B'];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // 檢查有報告的影像
    const hasMriInReports = imagingData.withReport.some(item => {
      const scanDate = new Date(item.date);
      return mriOrderCodes.includes(item.order_code) && scanDate >= ninetyDaysAgo;
    });
    
    // 檢查無報告的影像
    const hasMriInPending = imagingData.withoutReport.some(item => {
      const scanDate = new Date(item.date);
      return mriOrderCodes.includes(item.order_code) && scanDate >= ninetyDaysAgo;
    });
    
    return hasMriInReports || hasMriInPending;
  };

  return (
    <>
      <IconButton
        style={getIconPositionStyle()}
        onClick={handleClick} 
      >
        <MedicalServicesIcon />
      </IconButton>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
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
              xl: "90%"
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
          <Box sx={{ 
            display: 'flex', 
            flexDirection: isNarrowScreen ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: isNarrowScreen ? 'stretch' : 'center' 
          }}>
            {/* 頁籤區域 */}
          <Paper 
            sx={{ 
              flex: '1 1 auto', 
              width: '100%',
              backgroundColor: '#f5f9ff', // Light blue background
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
            }}
          >
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              TabIndicatorProps={{
                style: {
                  backgroundColor: '#1976d2', // Primary blue for the indicator
                  height: 2, // Thinner indicator
                }
              }}
              sx={{
                minHeight: '36px', // Reduced from default 48px
                '& .MuiTab-root': {
                  minHeight: '36px', // Reduced tab height
                  padding: '6px 12px', // Reduced padding
                  fontSize: generalDisplaySettings && 
                           generalDisplaySettings.contentTextSize && 
                           CONTENT_TEXT_SIZES[generalDisplaySettings.contentTextSize] || 
                           CONTENT_TEXT_SIZES['medium'], // Use contentTextSize with fallback
                  fontWeight: 'medium',
                  '&:hover': {
                    opacity: 1,
                  },
                  '&.Mui-selected': {
                    fontWeight: 'bold',
                  },
                },
              }}
            >
              <Tab 
                label="總覽" 
                icon={<HomeIcon sx={{ fontSize: '1rem' }} />} 
                iconPosition="start" 
                sx={{ padding: '6px 10px' }}
              />
              <Tab 
                label={`西藥 (${groupedMedications.length})`} 
                icon={<MedicationIcon sx={{ fontSize: '1rem' }} />} 
                iconPosition="start"
                sx={{ 
                  color: groupedMedications.length > 0 ? '#0d47a1' : 'text.secondary', // Darker blue
                  padding: '6px 10px',
                }}
              />
              <Tab 
                icon={<TableChartIcon sx={{ fontSize: '1.125rem' }} />}
                aria-label="西藥表格檢視"
                sx={{ 
                  minWidth: '40px', // Narrower width for icon-only tab
                  color: groupedMedications.length > 0 ? '#0d47a1' : 'text.secondary', // Darker blue
                  padding: '6px 6px',
                }}
              />
              <Tab 
                label={`中藥 (${groupedChineseMeds.length})`} 
                icon={<HealingIcon sx={{ fontSize: '1rem' }} />} 
                iconPosition="start"
                sx={{ 
                  color: groupedChineseMeds.length > 0 ? '#2e7d32' : 'text.secondary', // Darker green
                  padding: '6px 10px',
                }}
              />
              <Tab 
                label={`檢驗 (${groupedLabs.length})`} 
                icon={<ScienceIcon sx={{ fontSize: '1rem' }} />} 
                iconPosition="start"
                sx={{ 
                  color: groupedLabs.length > 0 ? '#e65100' : 'text.secondary', // Darker orange
                  padding: '6px 10px',
                }}
              />
              <Tab 
                icon={<TableViewIcon sx={{ fontSize: '1.125rem' }} />}
                aria-label="檢驗表格檢視"
                sx={{ 
                  minWidth: '40px', // Narrower width for icon-only tab
                  color: groupedLabs.length > 0 ? '#e65100' : 'text.secondary', // Darker orange
                  padding: '6px 6px',
                }}
              />
              <Tab 
                label={`影像 (${imagingData.withReport.length + imagingData.withoutReport.length})`} 
                icon={<ImageIcon sx={{ fontSize: '1rem' }} />} 
                iconPosition="start"
                sx={{ 
                  color: (imagingData.withReport.length + imagingData.withoutReport.length) > 0 ? '#4a148c' : 'text.secondary', // Darker purple
                  padding: '6px 10px',
                }}
              />
              <Tab 
                label={`餘藥 (${medDaysData.length})`} 
                icon={<InventoryIcon sx={{ fontSize: '1rem' }} />} 
                iconPosition="start"
                sx={{ 
                  color: medDaysData.length > 0 ? '#880e4f' : 'text.secondary', // Darker pink
                  padding: '6px 10px',
                }}
              />
            </Tabs>
          </Paper>
            
            {/* 狀態指示器，在窄螢幕上放到下面一行並靠右對齊 */}
            <Box sx={{ 
              display: 'flex', 
              mt: isNarrowScreen ? 1 : 0,
              ml: isNarrowScreen ? 0 : 2,
              justifyContent: isNarrowScreen ? 'flex-end' : 'flex-start',
              flexWrap: 'wrap'
            }}>
              {ckdStage && <KidneyStatusIndicator stage={ckdStage} fontSize={generalDisplaySettings.noteTextSize} />}
              {hasRecentCTScan() && (
                <StatusIndicator 
                  label="CT" 
                  hasData={true} 
                  icon={MonitorHeartIcon}
                  fontSize={generalDisplaySettings.noteTextSize}
                  tooltipTitle="90天內有CT檢查"
                />
              )}
              {hasRecentMRIScan() && (
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
              groupedLabs={groupedLabs}
              labData={groupedLabs}
              imagingData={imagingData}
              settings={{
                ...appSettings.western,
                enableATC5Colors: appSettings.atc5.enableColors,
                atc5Groups: appSettings.atc5.groups,
                atc5ColorGroups: appSettings.atc5.colorGroups
              }}
              overviewSettings={appSettings.overview}
              generalDisplaySettings={generalDisplaySettings}
              labSettings={appSettings.lab}
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
                atc5ColorGroups: appSettings.atc5.colorGroups
              }}
              copyFormat={appSettings.western.copyFormat}
              handleCopyMedications={handleCopyMedications}
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
                atc5ColorGroups: appSettings.atc5.colorGroups
              }}
              generalDisplaySettings={generalDisplaySettings}
            />
          </TabPanel>

          {/* Chinese Medicine Tab */}
          <TabPanel value={tabValue} index={3}>
            <ChineseMedicine
              groupedChineseMeds={groupedChineseMeds}
              chineseMedSettings={appSettings.chinese}
              handleCopyChineseMedications={handleCopyChineseMedications}
              generalDisplaySettings={generalDisplaySettings}
            />
          </TabPanel>

          {/* Lab Data Tab */}
          <TabPanel value={tabValue} index={4}>
            <LabData
              groupedLabs={groupedLabs}
              settings={appSettings.western}
              labSettings={appSettings.lab}
              handleCopyLabData={handleCopyLabData}
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
