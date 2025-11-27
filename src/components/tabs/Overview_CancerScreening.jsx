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
    const result = (
      combinedData &&
      combinedData.result_data &&
      Object.keys(combinedData.result_data).length > 0
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

  // Function to render screening item if data is available
  const renderScreeningItem = (type, label) => {
    if (!hasData()) return null;

    const data = combinedData.result_data;

    if (!data[type] || !data[type].subData || !Array.isArray(data[type].subData) || data[type].subData.length === 0) {
      return (
        <Typography
          variant="body2"
          sx={{ fontSize: getTextSize(contentTextSize), mb: 0.5 }}
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
        sx={{ fontSize: getTextSize(contentTextSize), mb: 0.5 }}
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
          四癌篩檢結果
        </Typography>
      </Box>

      {hasData() ? (
        <Box sx={{ pl: 1 }}>
          {renderScreeningItem('colorectal', '糞便潛血')}
          {renderScreeningItem('oralMucosa', '口腔黏膜')}
          {renderScreeningItem('mammography', '乳房攝影')}
          {renderScreeningItem('papSmears', '子宮頸癌')}
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