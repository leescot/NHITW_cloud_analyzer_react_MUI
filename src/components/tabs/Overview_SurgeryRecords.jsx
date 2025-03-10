import React from "react";
import {
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const Overview_SurgeryRecords = ({ surgeryData = [], generalDisplaySettings }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <TypographySizeWrapper 
        variant="h6" 
        textSizeType="title"
        generalDisplaySettings={generalDisplaySettings}
        gutterBottom
      >
        手術紀錄
      </TypographySizeWrapper>
      {surgeryData && surgeryData.length > 0 ? (
        <List dense disablePadding>
          {surgeryData.map((item, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemText 
                primary={
                  <TypographySizeWrapper
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                  >
                    {`${item.date || '日期未知'} ${item.hospital || '醫院未知'}`}
                  </TypographySizeWrapper>
                }
                secondary={
                  <TypographySizeWrapper
                    textSizeType="note"
                    generalDisplaySettings={generalDisplaySettings}
                    color="text.secondary"
                  >
                    {item.diagnosis || "診斷未知"}
                  </TypographySizeWrapper>
                }
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <TypographySizeWrapper 
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          color="text.secondary"
        >
          暫無手術紀錄
        </TypographySizeWrapper>
      )}
    </Paper>
  );
};

export default Overview_SurgeryRecords; 