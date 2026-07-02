import React from "react";
import {
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const Overview_SurgeryRecords = ({ surgeryData = [], generalDisplaySettings, collapsedCount = null }) => {
  // collapsedCount 有值時預設只顯示前 N 筆，點擊可展開/收合
  const [expanded, setExpanded] = React.useState(false);
  const visibleData = collapsedCount && !expanded
    ? surgeryData.slice(0, collapsedCount)
    : surgeryData;
  const hiddenCount = surgeryData.length - visibleData.length;

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
          {visibleData.map((item, index) => (
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
      {collapsedCount && surgeryData.length > collapsedCount && (
        <TypographySizeWrapper
          variant="caption"
          textSizeType="note"
          generalDisplaySettings={generalDisplaySettings}
          onClick={() => setExpanded(!expanded)}
          sx={{ display: 'block', mt: 0.5, color: 'primary.main', cursor: 'pointer' }}
        >
          {expanded ? '收合' : `顯示全部（還有 ${hiddenCount} 筆）`}
        </TypographySizeWrapper>
      )}
    </Paper>
  );
};

export default Overview_SurgeryRecords;