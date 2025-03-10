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
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>出院日期</TableCell>
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
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.hospital}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DischargeData;
