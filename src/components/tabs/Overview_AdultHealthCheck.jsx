import React, { useEffect, useState } from "react";
import { Paper, Typography, Box } from "@mui/material";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";

/**
 * Component for displaying Adult Health Check data
 * 
 * @param {Object} adultHealthCheckData - The adult health check data
 * @param {Object} generalDisplaySettings - Display settings like text sizes
 * @returns {JSX.Element} The component
 */
const Overview_AdultHealthCheck = ({ adultHealthCheckData, generalDisplaySettings = {} }) => {
  // Extract display settings with defaults
  const { titleTextSize = 'medium', contentTextSize = 'medium' } = generalDisplaySettings;

  // State to store the combined data from props or window global
  const [combinedData, setCombinedData] = useState(adultHealthCheckData);
  
  // Check for data in window global as fallback
  useEffect(() => {
    // If prop data exists, use it
    if (adultHealthCheckData) {
      setCombinedData(adultHealthCheckData);
      return;
    }
    
    // Otherwise, try to get data from window global
    if (window.adultHealthCheckData) {
      setCombinedData(window.adultHealthCheckData);
    }
  }, [adultHealthCheckData]);

  // Function to determine if data exists and has results
  const hasData = () => {
    const result = (
      combinedData &&
      combinedData.originalData &&
      combinedData.originalData.robject &&
      combinedData.originalData.robject.result_data &&
      Object.keys(combinedData.originalData.robject.result_data).length > 0
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

  // Function to render health check data if available
  const renderHealthCheckItem = () => {
    if (!hasData()) return null;
    
    const data = combinedData.originalData.robject.result_data;
    
    try {
      // Check if result_data is an array within the data object
      const resultDataArray = Array.isArray(data.result_data) ? data.result_data : data;
      
      // Make sure we have data to display
      if (!resultDataArray || resultDataArray.length === 0) {
        return (
          <Typography 
            variant="body2" 
            sx={{ fontSize: getTextSize(contentTextSize) }}
          >
            無資料
          </Typography>
        );
      }
      
      const latestData = resultDataArray[0]; // Use the first item in the result_data array
      
      return (
        <>
          {/* Title/Date */}
          {latestData.title && (
            <Typography 
              variant="body2" 
              sx={{ fontSize: getTextSize(contentTextSize), mb: 0.5, fontWeight: 'medium' }}
            >
              {latestData.title}
            </Typography>
          )}
          
          {/* Physical measurements */}
          <Typography 
            variant="body2" 
            sx={{ fontSize: getTextSize(contentTextSize), mb: 0.5 }}
          >
            身高 {latestData.height || '--'} 
            {' '}/體重 {latestData.weight || '--'} 
            {' '}/BMI {latestData.bmi || '--'} 
            {' '}/腰圍 {latestData.waistline || '--'}
            {' '}/血壓 {latestData.base_sbp || '--'}/{latestData.base_ebp || '--'}
          </Typography>
          
          {/* Blood lipids and glucose */}
          <Typography 
            variant="body2" 
            sx={{ fontSize: getTextSize(contentTextSize), mb: 0.5 }}
          >
            Chol {latestData.cho || '--'} 
            {' '}/TG {latestData.blod_tg || '--'} 
            {' '}/LDL {latestData.ldl || '--'} 
            {' '}/HDL {latestData.hdl || '--'} 
            {' '}/血糖 {latestData.s_09005c || '--'}
          </Typography>
          
          {/* Kidney function */}
          <Typography 
            variant="body2" 
            sx={{ fontSize: getTextSize(contentTextSize), mb: 0.5 }}
          >
            BUN {latestData.urine_bun || '--'} 
            {' '}/Cr {latestData.blod_creat || '--'} 
            {' '}/GFR {latestData.egfr || '--'} 
            {' '}/尿蛋白 {latestData.urine_protein || '--'}
          </Typography>
          
          {/* Liver function */}
          <Typography 
            variant="body2" 
            sx={{ fontSize: getTextSize(contentTextSize) }}
          >
            GOT {latestData.sgot || '--'} 
            {' '}/GPT {latestData.sgpt || '--'}
          </Typography>
        </>
      );
    } catch (error) {
      return (
        <Typography 
          variant="body2" 
          sx={{ fontSize: getTextSize(contentTextSize) }}
        >
          資料格式錯誤: {error.message}
        </Typography>
      );
    }
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
        <HealthAndSafetyIcon
          sx={{ mr: 1, color: "primary.main", fontSize: "1.5rem" }}
        />
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: "bold",
            fontSize: getTextSize(titleTextSize),
          }}
        >
          成人預防保健
        </Typography>
      </Box>

      {hasData() ? (
        <Box sx={{ pl: 1 }}>
          {renderHealthCheckItem()}
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

export default Overview_AdultHealthCheck; 