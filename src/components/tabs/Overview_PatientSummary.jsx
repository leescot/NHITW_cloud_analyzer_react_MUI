import React from "react";
import {
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const Overview_PatientSummary = ({ patientSummaryData = [], generalDisplaySettings }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <TypographySizeWrapper variant="h6" gutterBottom generalDisplaySettings={generalDisplaySettings}>
        註記資訊
      </TypographySizeWrapper>
      {patientSummaryData && patientSummaryData.length > 0 ? (
        <List dense disablePadding>
          {patientSummaryData.map((item, index) => {
            // 使用 originalText 屬性來匹配 <span class='red-sign'> 與 </span> 之間的文字
            const regex = /<span class='red-sign'>(.*?)<\/span>/;
            const match = item.originalText ? item.originalText.match(regex) : null;
            const displayText = match ? match[1] : item.text;
            
            return (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemText 
                  primary={
                    <TypographySizeWrapper 
                      variant="body1" 
                      generalDisplaySettings={generalDisplaySettings}
                    >
                      {displayText}
                    </TypographySizeWrapper>
                  } 
                />
              </ListItem>
            );
          })}
        </List>
      ) : (
        <TypographySizeWrapper 
          variant="body1" 
          color="text.secondary"
          generalDisplaySettings={generalDisplaySettings}
        >
          暫無病患摘要資料
        </TypographySizeWrapper>
      )}
    </Paper>
  );
};

export default Overview_PatientSummary; 