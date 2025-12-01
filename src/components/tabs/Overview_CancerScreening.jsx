import React, { useEffect, useState } from "react";
import { Paper, Typography, Box } from "@mui/material";
import BiotechIcon from "@mui/icons-material/Biotech";

/**
 * Component for displaying Cancer Screening data
 * 
 * @param {Object} cancerScreeningData - The cancer screening data
 * @param {Object} generalDisplaySettings - Display settings like text sizes
 * @returns {JSX.Element} The component
 */
const Overview_CancerScreening = ({ cancerScreeningData, generalDisplaySettings = {} }) => {
  // Extract display settings with defaults
  const { titleTextSize = 'medium', contentTextSize = 'medium' } = generalDisplaySettings;

  // State to store the combined data from props or window global
  const [combinedData, setCombinedData] = useState(cancerScreeningData);

  // Check for data in window global as fallback
  useEffect(() => {
    // If prop data exists, use it
    if (cancerScreeningData) {
      setCombinedData(cancerScreeningData);
      return;
    }

    // Otherwise, try to get data from window global
    if (window.cancerScreeningData) {
      setCombinedData(window.cancerScreeningData);
    }
  }, [cancerScreeningData]);

  // Function to determine if data exists and has results
  const hasData = () => {
    // 檢查新的資料結構：rObject[0] 或 originalData.robject
    if (!combinedData) {
      return false;
    }

    // 嘗試從 rObject 取得資料
    const dataFromRObject = combinedData.rObject && combinedData.rObject[0];
    // 嘗試從 originalData.robject 取得資料
    const dataFromOriginal = combinedData.originalData && combinedData.originalData.robject;
    // 或者直接從 combinedData（舊格式）
    const dataFromDirect = combinedData.colorectal || combinedData.oralMucosa || combinedData.mammography || combinedData.papSmears || combinedData.lungCancer;

    const actualData = dataFromRObject || dataFromOriginal || (dataFromDirect ? combinedData : null);

    // 癌症篩檢的資料結構不同，檢查是否有任何篩檢項目
    const result = (
      actualData &&
      (actualData.colorectal || actualData.oralMucosa || actualData.mammography || actualData.papSmears || actualData.lungCancer)
    );
    return result;
  };

  // Helper function to get text size in pixels
  const getTextSize = (size) => {
    const sizes = {
      small: '0.8rem',
      medium: '0.9rem',
      large: '1rem'
    };
    return sizes[size] || sizes.medium;
  };

  // Helper function to determine text color based on result
  const getResultColor = (result) => {
    if (!result || result === "無資料") {
      return "text.disabled"; // gray
    } else if (result === "異常") {
      return "error.main"; // red
    } else {
      return "text.primary"; // black (default)
    }
  };

  // Function to render screening item if data is available
  const renderScreeningItem = (type, label) => {
    if (!hasData()) return null;

    // 取得實際資料（支援多種格式）
    const dataFromRObject = combinedData.rObject && combinedData.rObject[0];
    const dataFromOriginal = combinedData.originalData && combinedData.originalData.robject;
    const dataFromDirect = (combinedData.colorectal || combinedData.oralMucosa || combinedData.mammography || combinedData.papSmears || combinedData.lungCancer) ? combinedData : null;

    const actualData = dataFromRObject || dataFromOriginal || dataFromDirect;

    if (!actualData) return null;
    const data = actualData;

    if (!data[type] || !data[type].subData || !Array.isArray(data[type].subData) || data[type].subData.length === 0) {
      return (
        <Typography
          variant="body2"
          sx={{
            fontSize: getTextSize(contentTextSize),
            mb: 0.5,
            color: getResultColor("無資料")
          }}
          key={type}
        >
          {label}: 無資料
        </Typography>
      );
    }

    const latestData = data[type].subData[0];

    return (
      <Typography
        variant="body2"
        sx={{
          fontSize: getTextSize(contentTextSize),
          mb: 0.5,
          color: getResultColor(latestData.result)
        }}
        key={type}
      >
        {label}: {latestData.result}
        <Typography
          component="span"
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: getTextSize(contentTextSize) }}
        >
          {' '}{latestData.func_date} {latestData.hosp_abbr}
        </Typography>
      </Typography>
    );
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 1.5,
        mb: 2,
        height: "auto",
        minHeight: hasData() ? "inherit" : "auto",
        overflow: "hidden",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: hasData() ? 1 : 0 }}>
        <BiotechIcon
          sx={{ mr: 1, color: "primary.main", fontSize: "1.5rem" }}
        />
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: "bold",
            fontSize: getTextSize(titleTextSize),
          }}
        >
          癌症篩檢結果
        </Typography>
      </Box>

      {hasData() ? (
        <Box sx={{ pl: 1 }}>
          {renderScreeningItem('colorectal', '糞便潛血')}
          {renderScreeningItem('oralMucosa', '口腔黏膜')}
          {renderScreeningItem('mammography', '乳房攝影')}
          {renderScreeningItem('papSmears', '子宮頸癌')}
          {renderScreeningItem('lungCancer', '肺癌篩檢')}
        </Box>
      ) : (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: getTextSize(contentTextSize), pl: 1, display: "inline-block", ml: 1 }}
        >
          無資料
        </Typography>
      )}
    </Paper>
  );
};

export default Overview_CancerScreening; 