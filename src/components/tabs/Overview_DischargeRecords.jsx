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
  // 檢查日期是否在另一住院期間內（切帳情況）
  const isDateInOtherStayPeriod = (currentIndex, date) => {
    if (!date) return false;

    const currentDate = new Date(date);

    // 檢查是否在其他住院區間內
    return dischargeData.some((item, index) => {
      // 跳過自己和無住院日或出院日的記錄
      if (index === currentIndex || !item.in_date || !item.out_date) return false;

      const startDate = new Date(item.in_date);
      const endDate = new Date(item.out_date);

      // 檢查當前日期是否在這個住院期間內
      return currentDate >= startDate && currentDate <= endDate;
    });
  };

  // Format date function to handle the specific date format requirements
  const formatDateRange = (inDate, outDate, index) => {
    if (!outDate) return "日期未知";

    // 如果只有出院日期而沒有住院日期
    if (!inDate) {
      const outDateObj = new Date(outDate);
      const outYear = outDateObj.getFullYear();
      const outMonth = outDateObj.getMonth() + 1;
      const outDay = outDateObj.getDate();

      // 檢查是否為切帳情況
      if (isDateInOtherStayPeriod(index, outDate)) {
        return `${outYear}/${outMonth}/${outDay} (切帳)`;
      } else {
        return `${outYear}/${outMonth}/${outDay} (出院日)`;
      }
    }

    // Parse the ISO dates
    const inDateObj = new Date(inDate);
    const outDateObj = new Date(outDate);

    const inYear = inDateObj.getFullYear();
    const inMonth = inDateObj.getMonth() + 1; // JavaScript months are 0-indexed
    const inDay = inDateObj.getDate();

    const outYear = outDateObj.getFullYear();
    const outMonth = outDateObj.getMonth() + 1;
    const outDay = outDateObj.getDate();

    // Check if years are different
    if (inYear !== outYear) {
      return `${inYear}/${inMonth}/${inDay}~${outYear}/${outMonth}/${outDay}`;
    } else {
      return `${inYear}/${inMonth}/${inDay}~${outMonth}/${outDay}`;
    }
  };

  // 處理開啟出院病摘的函式
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
                    {`${formatDateRange(item.in_date, item.out_date, index)} ${item.hospital || item.hosp?.split(';')[0] || '醫院未知'}`}
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