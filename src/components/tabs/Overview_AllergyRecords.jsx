import React from "react";
import {
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Box,
} from "@mui/material";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const Overview_AllergyRecords = ({ allergyData = [], generalDisplaySettings }) => {
  // Filter out duplicate drug names in allergyData
  const uniqueAllergyData = allergyData && allergyData.length > 0
    ? allergyData.reduce((unique, item) => {
        // Check if this drug name is already in our unique array
        const exists = unique.find(
          uniqueItem => uniqueItem.drugName === item.drugName
        );

        if (!exists) {
          // Create a new item with modified symptoms text if needed
          const newItem = {
            ...item,
            symptoms: item.symptoms === "未記錄" ? "未記錄症狀" : item.symptoms
          };
          unique.push(newItem);
        }
        return unique;
      }, [])
    : [];

  return (
    <Paper sx={{ p: 2 }}>
      <TypographySizeWrapper variant="h6" gutterBottom generalDisplaySettings={generalDisplaySettings}>
        過敏紀錄
      </TypographySizeWrapper>
      {uniqueAllergyData.length > 0 ? (
        <List dense disablePadding>
          {uniqueAllergyData.map((item, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TypographySizeWrapper
                      variant="body1"
                      component="span"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      {item.drugName || "藥物未知"}
                    </TypographySizeWrapper>
                    <TypographySizeWrapper
                      variant="caption"
                      component="span"
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      {item.symptoms || "症狀未知"}
                    </TypographySizeWrapper>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <TypographySizeWrapper
          variant="body1"
          color="text.secondary"
          generalDisplaySettings={generalDisplaySettings}
        >
          暫無過敏紀錄
        </TypographySizeWrapper>
      )}
    </Paper>
  );
};

export default Overview_AllergyRecords;