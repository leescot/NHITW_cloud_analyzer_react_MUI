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
          {patientSummaryData
            // 過濾掉收案資訊（已經在「就醫診斷與收案」中顯示）
            .filter(item => !item.originalText || !item.originalText.includes('擷取來源為VPN院所登載資料'))
            .map((item, index) => {
              // 使用 originalText 屬性來匹配所有 <span class='red-sign'> 與 </span> 之間的文字
              const regex = /<span class='red-sign'>(.*?)<\/span>/g;
              const matches = [];
              let match;

              if (item.originalText) {
                while ((match = regex.exec(item.originalText)) !== null) {
                  matches.push(match[1]);
                }
              }

              const displayText = matches.length > 0 ? matches.join('、') : item.text;

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