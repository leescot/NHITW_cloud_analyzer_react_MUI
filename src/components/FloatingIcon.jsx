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
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

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

// Import new indicators
import StatusIndicator from "./indicators/StatusIndicator";
import KidneyStatusIndicator from "./indicators/KidneyStatusIndicator";

// Import new settings
import { DEFAULT_SETTINGS, DEFAULT_GAI_PROMPT } from "../config/defaultSettings";
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
  const [enableGAICopyFormat, setEnableGAICopyFormat] = useState(false);
  const [enableGAIPrompt, setEnableGAIPrompt] = useState(false);
  const [gaiPrompt, setGaiPrompt] = useState("");

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

  // Load GAI copy format setting
  useEffect(() => {
    chrome.storage.sync.get({
      enableGAICopyFormat: false,
      enableGAIPrompt: false,
      gaiPrompt: DEFAULT_GAI_PROMPT
    }, (items) => {
      setEnableGAICopyFormat(items.enableGAICopyFormat);
      setEnableGAIPrompt(items.enableGAIPrompt);
      setGaiPrompt(items.gaiPrompt || DEFAULT_GAI_PROMPT);
      console.log('GAI Copy Format enabled:', items.enableGAICopyFormat);
      console.log('GAI Prompt enabled:', items.enableGAIPrompt);
    });

    // Listen for setting changes
    const handleStorageChange = (changes, area) => {
      if (area === 'sync') {
        if (changes.enableGAICopyFormat) {
          setEnableGAICopyFormat(changes.enableGAICopyFormat.newValue);
          console.log('GAI Copy Format setting changed:', changes.enableGAICopyFormat.newValue);
        }
        if (changes.enableGAIPrompt) {
          setEnableGAIPrompt(changes.enableGAIPrompt.newValue);
          console.log('GAI Prompt setting changed:', changes.enableGAIPrompt.newValue);
        }
        if (changes.gaiPrompt) {
          setGaiPrompt(changes.gaiPrompt.newValue || DEFAULT_GAI_PROMPT);
          console.log('GAI Prompt text changed');
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
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
      // First try to get from JWT token (for cloud data)
      let info = extractUserInfoFromToken();

      // If no info from token, try to get from local data
      if (!info && window.lastInterceptedUserInfo) {
        info = window.lastInterceptedUserInfo;
      }

      setUserInfo(info);
    }
  }, [open]);

  // Update user info when local data is loaded
  useEffect(() => {
    if (window.lastInterceptedUserInfo) {
      setUserInfo(window.lastInterceptedUserInfo);
    }
  }, [groupedMedications, groupedLabs]); // Trigger when data changes

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

  // Handle copying GAI format data
  const handleCopyGAIFormat = () => {
    console.log('handleCopyGAIFormat called');
    console.log('userInfo:', userInfo);
    console.log('patientSummaryData:', patientSummaryData);
    console.log('allergyData:', allergyData);
    console.log('surgeryData:', surgeryData);
    console.log('dischargeData:', dischargeData);
    console.log('hbcvData:', hbcvData);
    console.log('groupedMedications:', groupedMedications);
    console.log('groupedLabs:', groupedLabs);
    console.log('groupedChineseMeds:', groupedChineseMeds);
    console.log('imagingData:', imagingData);

    // Get user info
    const age = userInfo?.age || '未知';
    const gender = userInfo?.gender === 'M' ? 'male' : userInfo?.gender === 'F' ? 'female' : '未知';

    // Build the GAI format text
    let gaiText = `這是一位 ${age} 歲的 ${gender} 性病人，以下是病歷資料\n\n`;

    // Patient Summary - use 'text' field and filter out dental image sentence
    gaiText += `<patientSummary>\n雲端註記資料:\n`;
    if (patientSummaryData && patientSummaryData.length > 0) {
      patientSummaryData.forEach(item => {
        const text = item.text || '';
        // Filter out the dental image sentence
        if (text && !text.includes('此病人於牙科處置紀錄有影像上傳資料')) {
          gaiText += `${text}\n`;
        }
      });
    }
    gaiText += `</patientSummary>\n\n`;

    // Allergy - use correct field names: drugName, symptoms
    gaiText += `<allergy>\n過敏史:\n`;
    if (allergyData && allergyData.length > 0) {
      allergyData.forEach(item => {
        gaiText += `${item.drugName || ''} - ${item.symptoms || ''}\n`;
      });
    }
    gaiText += `</allergy>\n\n`;

    // Surgery - use correct field names: date, hospital, diagnosis
    gaiText += `<surgery>\n開刀史:\n`;
    if (surgeryData && surgeryData.length > 0) {
      surgeryData.forEach(item => {
        gaiText += `${item.date || ''} - ${item.hospital || ''} - ${item.diagnosis || ''}\n`;
      });
    }
    gaiText += `</surgery>\n\n`;

    // Discharge - use correct field names: in_date, out_date, hospital/hosp, icd_code, icd_cname
    gaiText += `<discharge>\n住院史:\n`;
    if (dischargeData && dischargeData.length > 0) {
      dischargeData.forEach(item => {
        const inDate = item.in_date ? new Date(item.in_date).toLocaleDateString('zh-TW') : '';
        const outDate = item.out_date ? new Date(item.out_date).toLocaleDateString('zh-TW') : '';
        const hospital = item.hospital || (item.hosp ? item.hosp.split(';')[0] : '');
        gaiText += `${inDate} - ${outDate} - ${hospital} - ${item.icd_code || ''} ${item.icd_cname || ''}\n`;
      });
    }
    gaiText += `</discharge>\n\n`;

    // HBCV Data - use correct structure: rObject[0].result_data
    gaiText += `<hbcvdata>\nB、C肝炎資料:\n`;
    if (hbcvData && hbcvData.rObject && hbcvData.rObject.length > 0) {
      const actualData = hbcvData.rObject[0];
      if (actualData.result_data && actualData.result_data.length > 0) {
        actualData.result_data.forEach(item => {
          gaiText += `${item.real_inspect_date || ''} - ${item.assay_item_name || ''}: ${item.assay_value || ''}\n`;
        });
      }
      if (actualData.med_data && actualData.med_data.length > 0) {
        actualData.med_data.forEach(item => {
          gaiText += `${item.func_date || ''} - ${item.drug_ing_name || ''}\n`;
        });
      }
    }
    gaiText += `</hbcvdata>\n\n`;

    // Medications - use correct field names: name, perDosage, dosage, frequency, days
    gaiText += `<medication>\n近期用藥記錄:\n`;
    if (groupedMedications && groupedMedications.length > 0) {
      groupedMedications.forEach(group => {
        gaiText += `${group.date || ''} - ${group.hosp || ''}\n`;
        if (group.icd_code || group.icd_name) {
          gaiText += `診斷: ${group.icd_code || ''} ${group.icd_name || ''}\n`;
        }
        if (group.medications && group.medications.length > 0) {
          group.medications.forEach(med => {
            const dosageInfo = med.perDosage !== "SPECIAL"
              ? `${med.perDosage}#`
              : `總量${med.dosage}`;
            let medLine = `  ${med.name || ''} ${dosageInfo} ${med.frequency || ''} ${med.days || ''}天`;
            if (med.ingredient) {
              medLine += ` (${med.ingredient})`;
            }
            gaiText += `${medLine}\n`;
          });
        }
        gaiText += `\n`;
      });
    }
    gaiText += `</medication>\n\n`;

    // Lab Data - use correct field names: itemName, value, unit, reference
    gaiText += `<lab>\n近期檢驗記錄:\n`;
    if (groupedLabs && groupedLabs.length > 0) {
      groupedLabs.forEach(group => {
        gaiText += `${group.date || ''} - ${group.hosp || ''}\n`;
        if (group.labs && group.labs.length > 0) {
          group.labs.forEach(lab => {
            const value = lab.value || '';
            const unit = lab.unit || '';
            const reference = lab.reference || '';
            gaiText += `  ${lab.itemName || ''}: ${value} ${unit}`;
            if (reference) {
              gaiText += ` (參考值: ${reference})`;
            }
            gaiText += `\n`;
          });
        }
        gaiText += `\n`;
      });
    }
    gaiText += `</lab>\n\n`;

    // Chinese Medicine
    gaiText += `<chinesemed>\n近期中藥記錄:\n`;
    if (groupedChineseMeds && groupedChineseMeds.length > 0) {
      groupedChineseMeds.forEach(group => {
        gaiText += `${group.date || ''} - ${group.hosp || ''}\n`;
        if (group.medications && group.medications.length > 0) {
          group.medications.forEach(med => {
            gaiText += `  ${med.drug_name || ''} ${med.dose || ''} ${med.freq_name || ''} ${med.days || ''}天\n`;
          });
        }
        gaiText += `\n`;
      });
    }
    gaiText += `</chinesemed>\n\n`;

    // Imaging - use correct fields and only include items with reports
    gaiText += `<imaging>\n近期影像學報告:\n`;
    if (imagingData) {
      if (imagingData.withReport && imagingData.withReport.length > 0) {
        imagingData.withReport.forEach(item => {
          gaiText += `${item.date || ''} - ${item.hosp || ''} - ${item.orderName || ''}\n`;
          if (item.inspectResult) {
            // Clean up the report result
            let reportResult = item.inspectResult;
            const markers = ["Imaging findings:", "Imaging findings", "Sonographic Findings:", "Sonographic Findings", "報告內容:", "報告內容：", "報告內容"];
            for (const marker of markers) {
              if (reportResult.includes(marker)) {
                reportResult = reportResult.split(marker)[1];
                break;
              }
            }
            gaiText += `  報告: ${reportResult.trim()}\n`;
          }
          gaiText += `\n`;
        });
      }
    }
    gaiText += `</imaging>\n`;

    console.log('Generated GAI text:', gaiText);

    // Copy to clipboard
    navigator.clipboard
      .writeText(gaiText)
      .then(() => {
        setSnackbarMessage("GAI格式資料已複製到剪貼簿");
        setSnackbarOpen(true);
        console.log('GAI format copied successfully');
      })
      .catch((err) => {
        console.error("Failed to copy GAI format: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  // Handle copying GAI format with prompt
  const handleCopyGAIWithPrompt = () => {
    console.log('handleCopyGAIWithPrompt called');

    // First generate the GAI data (reuse the logic from handleCopyGAIFormat)
    const age = userInfo?.age || '未知';
    const gender = userInfo?.gender === 'M' ? 'male' : userInfo?.gender === 'F' ? 'female' : '未知';

    let gaiText = `這是一位 ${age} 歲的 ${gender} 性病人，以下是病歷資料\n\n`;

    // Patient Summary - filter out dental image sentence
    gaiText += `<patientSummary>\n雲端註記資料:\n`;
    if (patientSummaryData && patientSummaryData.length > 0) {
      patientSummaryData.forEach(item => {
        const text = item.text || '';
        // Filter out the dental image sentence
        if (text && !text.includes('此病人於牙科處置紀錄有影像上傳資料')) {
          gaiText += `${text}\n`;
        }
      });
    }
    gaiText += `</patientSummary>\n\n`;

    // Allergy
    gaiText += `<allergy>\n過敏史:\n`;
    if (allergyData && allergyData.length > 0) {
      allergyData.forEach(item => {
        gaiText += `${item.drugName || ''} - ${item.symptoms || ''}\n`;
      });
    }
    gaiText += `</allergy>\n\n`;

    // Surgery
    gaiText += `<surgery>\n開刀史:\n`;
    if (surgeryData && surgeryData.length > 0) {
      surgeryData.forEach(item => {
        gaiText += `${item.date || ''} - ${item.hospital || ''} - ${item.diagnosis || ''}\n`;
      });
    }
    gaiText += `</surgery>\n\n`;

    // Discharge
    gaiText += `<discharge>\n住院史:\n`;
    if (dischargeData && dischargeData.length > 0) {
      dischargeData.forEach(item => {
        const inDate = item.in_date ? new Date(item.in_date).toLocaleDateString('zh-TW') : '';
        const outDate = item.out_date ? new Date(item.out_date).toLocaleDateString('zh-TW') : '';
        const hospital = item.hospital || (item.hosp ? item.hosp.split(';')[0] : '');
        gaiText += `${inDate} - ${outDate} - ${hospital} - ${item.icd_code || ''} ${item.icd_cname || ''}\n`;
      });
    }
    gaiText += `</discharge>\n\n`;

    // HBCV Data
    gaiText += `<hbcvdata>\nB、C肝炎資料:\n`;
    if (hbcvData && hbcvData.rObject && hbcvData.rObject.length > 0) {
      const actualData = hbcvData.rObject[0];
      if (actualData.result_data && actualData.result_data.length > 0) {
        actualData.result_data.forEach(item => {
          gaiText += `${item.real_inspect_date || ''} - ${item.assay_item_name || ''}: ${item.assay_value || ''}\n`;
        });
      }
      if (actualData.med_data && actualData.med_data.length > 0) {
        actualData.med_data.forEach(item => {
          gaiText += `${item.func_date || ''} - ${item.drug_ing_name || ''}\n`;
        });
      }
    }
    gaiText += `</hbcvdata>\n\n`;

    // Medications
    gaiText += `<medication>\n近期用藥記錄:\n`;
    if (groupedMedications && groupedMedications.length > 0) {
      groupedMedications.forEach(group => {
        gaiText += `${group.date || ''} - ${group.hosp || ''}\n`;
        if (group.icd_code || group.icd_name) {
          gaiText += `診斷: ${group.icd_code || ''} ${group.icd_name || ''}\n`;
        }
        if (group.medications && group.medications.length > 0) {
          group.medications.forEach(med => {
            const dosageInfo = med.perDosage !== "SPECIAL"
              ? `${med.perDosage}#`
              : `總量${med.dosage}`;
            let medLine = `  ${med.name || ''} ${dosageInfo} ${med.frequency || ''} ${med.days || ''}天`;
            if (med.ingredient) {
              medLine += ` (${med.ingredient})`;
            }
            gaiText += `${medLine}\n`;
          });
        }
        gaiText += `\n`;
      });
    }
    gaiText += `</medication>\n\n`;

    // Lab Data
    gaiText += `<lab>\n近期檢驗記錄:\n`;
    if (groupedLabs && groupedLabs.length > 0) {
      groupedLabs.forEach(group => {
        gaiText += `${group.date || ''} - ${group.hosp || ''}\n`;
        if (group.labs && group.labs.length > 0) {
          group.labs.forEach(lab => {
            const value = lab.value || '';
            const unit = lab.unit || '';
            const reference = lab.reference || '';
            gaiText += `  ${lab.itemName || ''}: ${value} ${unit}`;
            if (reference) {
              gaiText += ` (參考值: ${reference})`;
            }
            gaiText += `\n`;
          });
        }
        gaiText += `\n`;
      });
    }
    gaiText += `</lab>\n\n`;

    // Chinese Medicine
    gaiText += `<chinesemed>\n近期中藥記錄:\n`;
    if (groupedChineseMeds && groupedChineseMeds.length > 0) {
      groupedChineseMeds.forEach(group => {
        gaiText += `${group.date || ''} - ${group.hosp || ''}\n`;
        if (group.medications && group.medications.length > 0) {
          group.medications.forEach(med => {
            gaiText += `  ${med.drug_name || ''} ${med.dose || ''} ${med.freq_name || ''} ${med.days || ''}天\n`;
          });
        }
        gaiText += `\n`;
      });
    }
    gaiText += `</chinesemed>\n\n`;

    // Imaging
    gaiText += `<imaging>\n近期影像學報告:\n`;
    if (imagingData) {
      if (imagingData.withReport && imagingData.withReport.length > 0) {
        imagingData.withReport.forEach(item => {
          gaiText += `${item.date || ''} - ${item.hosp || ''} - ${item.orderName || ''}\n`;
          if (item.inspectResult) {
            let reportResult = item.inspectResult;
            const markers = ["Imaging findings:", "Imaging findings", "Sonographic Findings:", "Sonographic Findings", "報告內容:", "報告內容：", "報告內容"];
            for (const marker of markers) {
              if (reportResult.includes(marker)) {
                reportResult = reportResult.split(marker)[1];
                break;
              }
            }
            gaiText += `  報告: ${reportResult.trim()}\n`;
          }
          gaiText += `\n`;
        });
      }
    }
    gaiText += `</imaging>\n`;

    // Combine prompt + GAI data with ### markers
    const combinedText = gaiPrompt + '\n###\n' + gaiText + '\n###';

    console.log('Generated combined GAI text with prompt');

    // Copy to clipboard
    navigator.clipboard
      .writeText(combinedText)
      .then(() => {
        setSnackbarMessage("GAI提示詞+資料已複製到剪貼簿");
        setSnackbarOpen(true);
        console.log('GAI format with prompt copied successfully');
      })
      .catch((err) => {
        console.error("Failed to copy GAI format with prompt: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  // Calculate CKD stage
  const gfrValue = extractGFRValue(patientSummaryData);
  const ckdStage = getCKDStage(gfrValue);

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
                  label={userInfo && formatUserInfoDisplay(userInfo) ? formatUserInfoDisplay(userInfo) : "總覽"}
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
                {enableGAICopyFormat && (
                  <Tooltip title="複製XML格式資料">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyGAIFormat();
                      }}
                      sx={{
                        padding: "6px 10px",
                        color: getTabColor(generalDisplaySettings, "help"),
                        "&:hover": {
                          color: getTabSelectedColor(generalDisplaySettings, "help"),
                        },
                      }}
                    >
                      <ContentCopyIcon sx={{ fontSize: "1rem" }} />
                    </IconButton>
                  </Tooltip>
                )}
                {enableGAIPrompt && (
                  <Tooltip title="複製GAI提示詞+資料">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyGAIWithPrompt();
                      }}
                      sx={{
                        padding: "6px 10px",
                        color: getTabColor(generalDisplaySettings, "help"),
                        "&:hover": {
                          color: getTabSelectedColor(generalDisplaySettings, "help"),
                        },
                        position: "relative",
                      }}
                    >
                      <ContentCopyIcon sx={{ fontSize: "1rem" }} />
                      <Box
                        sx={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          backgroundColor: "primary.main",
                          color: "white",
                          borderRadius: "4px",
                          padding: "0px 3px",
                          fontSize: "0.6rem",
                          fontWeight: "bold",
                          lineHeight: 1.2,
                        }}
                      >
                        AI
                      </Box>
                    </IconButton>
                  </Tooltip>
                )}
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