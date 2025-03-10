import React from "react";
import {
  Paper,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip,
  Tooltip,
} from "@mui/material";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const Overview_DischargeRecords = ({ dischargeData = [], generalDisplaySettings }) => {
  // 處理開啟出院病摘的函數
  const handleOpenMedicalAbstract = (mdsFile) => {
    if (!mdsFile) {
      console.warn('無法開啟病摘：缺少檔案資訊');
      return;
    }
    
    // 建立要儲存的資料物件
    const data = {
      fileName: mdsFile,
      apiName: "imue0070"
    };
    
    // 儲存資料至 sessionStorage
    sessionStorage.setItem("ShowXml", JSON.stringify(data));
    
    // 定義視窗參數
    const windowOptions = "directories=no,location=no,scrollbars=yes,menubar=no,toolbar=no,titlebar=no,status=no,resizable=yes,height=600,width=1300,top=250,left=50,right=50";
    
    // 開啟新視窗
    window.open('https://medcloud2.nhi.gov.tw/imu/IMUE1000/ShowXml', '_blank', windowOptions, 'false');
  };

  return (
    <Paper sx={{ p: 2 }}>
      <TypographySizeWrapper 
        variant="h6" 
        textSizeType="title"
        generalDisplaySettings={generalDisplaySettings}
        gutterBottom
      >
        出院紀錄
      </TypographySizeWrapper>
      {dischargeData && dischargeData.length > 0 ? (
        <List dense disablePadding>
          {dischargeData.map((item, index) => (
            <ListItem 
              key={index} 
              sx={{ py: 0.5 }}
              secondaryAction={
                item.mds_file ? (
                  <Tooltip title="開啟出院病摘">
                    <Box component="span" sx={{ display: 'inline-block' }}>
                      <Chip
                        label="病摘"
                        size="small"
                        color="primary"
                        onClick={() => handleOpenMedicalAbstract(item.mds_file)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </Box>
                  </Tooltip>
                ) : null
              }
            >
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
                    {`${item.icd_code || '無代碼'} ${item.icd_cname || '無診斷'}`}
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
          暫無出院紀錄
        </TypographySizeWrapper>
      )}
    </Paper>
  );
};

export default Overview_DischargeRecords; 