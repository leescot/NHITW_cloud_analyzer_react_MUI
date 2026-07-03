/* eslint-disable react/prop-types -- 專案未使用 PropTypes(全 repo 該規則有 ~2100 個未修告警,實質未執行) */
import {
  Box,
  Paper,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from "@mui/material";

import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HealingIcon from "@mui/icons-material/Healing";
import GrassIcon from "@mui/icons-material/Grass";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MedicationIcon from "@mui/icons-material/Medication";
import ScienceIcon from "@mui/icons-material/Science";
import ImageIcon from "@mui/icons-material/Image";
import InventoryIcon from "@mui/icons-material/Inventory";
import TableChartIcon from "@mui/icons-material/TableChart";
import TableViewIcon from "@mui/icons-material/TableView";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import BiotechIcon from "@mui/icons-material/Biotech";

// 引入標籤顏色工具函數
import { getTabColor, getTabSelectedColor } from "../utils/tabColorUtils";

// Import new tools
import {
  extractGFRValue,
  getCKDStage,
  hasRecentCTScan,
  hasRecentMRIScan,
} from "../utils/indicatorUtils";
import { CONTENT_TEXT_SIZES } from "../utils/textSizeUtils";

// Import new indicators
import StatusIndicator from "./indicators/StatusIndicator";
import KidneyStatusIndicator from "./indicators/KidneyStatusIndicator";

// Import user info utilities
import { formatUserInfoDisplay } from "../utils/userInfoUtils";

import { useGeneralDisplaySettings } from "../contexts/SettingsContext";

const MainDialogHeader = ({
  tabValue,
  onTabChange,
  onOverviewClick,
  userInfo,
  groupedMedications,
  groupedChineseMeds,
  groupedLabs,
  imagingData,
  medDaysData,
  allergyData,
  surgeryData,
  dischargeData,
  patientSummaryData,
  showAdvancedTab,
}) => {
  const generalDisplaySettings = useGeneralDisplaySettings();

  // 新增響應式布局檢測
  const theme = useTheme();
  const isNarrowScreen = useMediaQuery(theme.breakpoints.down("lg"));

  // Calculate CKD stage
  const gfrValue = extractGFRValue(patientSummaryData);
  const ckdStage = getCKDStage(gfrValue);

  return (
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
        {/* User Info Display - clickable to show overview */}
        {userInfo && formatUserInfoDisplay(userInfo) && (
          <Box
            onClick={onOverviewClick}
            sx={{
              display: "flex",
              alignItems: "center",
              px: 2,
              py: 0.75,
              fontWeight: "bold",
              color: tabValue === false ? "#0d47a1" : "#1976d2",
              fontSize:
                (generalDisplaySettings &&
                  generalDisplaySettings.contentTextSize &&
                  CONTENT_TEXT_SIZES[
                  generalDisplaySettings.contentTextSize
                  ]) ||
                CONTENT_TEXT_SIZES["medium"],
              borderRight: "1px solid #e0e0e0",
              borderBottom: tabValue === false ? "2px solid #1976d2" : "2px solid transparent",
              flexShrink: 0,
              cursor: "pointer",
              "&:hover": {
                color: "#0d47a1",
                backgroundColor: "rgba(25, 118, 210, 0.04)",
              },
            }}
          >
            {formatUserInfoDisplay(userInfo)}
          </Box>
        )}
        <Tabs
          value={tabValue}
          onChange={onTabChange}
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
          {showAdvancedTab && (
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
  );
};

export default MainDialogHeader;
