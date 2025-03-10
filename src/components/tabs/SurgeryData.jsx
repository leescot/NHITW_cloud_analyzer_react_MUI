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

const SurgeryData = ({ surgeryData }) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>日期</TableCell>
            <TableCell>醫院</TableCell>
            <TableCell>診斷</TableCell>
            <TableCell>手術代碼</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {surgeryData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography color="text.secondary">沒有找到手術資料</Typography>
              </TableCell>
            </TableRow>
          ) : (
            surgeryData.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.hospital}</TableCell>
                <TableCell>{item.diagnosis}</TableCell>
                <TableCell>{item.orderCode}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SurgeryData;
