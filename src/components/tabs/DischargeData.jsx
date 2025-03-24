import React from "react";
import {
  Typography,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";

const DischargeData = ({ dischargeData }) => {
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
    if (!outDate) return "";
    
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

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>住院/出院日期</TableCell>
            <TableCell>醫院</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dischargeData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} align="center">
                <Typography color="text.secondary">
                  沒有找到出院病摘資料
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            dischargeData.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{formatDateRange(item.in_date, item.out_date, index)}</TableCell>
                <TableCell>{item.hospital || item.hosp?.split(';')[0] || ""}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DischargeData;
