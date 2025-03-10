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

const AllergyData = ({ allergyData }) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>日期</TableCell>
            <TableCell>藥物名稱</TableCell>
            <TableCell>過敏症狀</TableCell>
            <TableCell>嚴重程度</TableCell>
            <TableCell>醫院</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {allergyData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Typography color="text.secondary">沒有找到過敏資料</Typography>
              </TableCell>
            </TableRow>
          ) : (
            allergyData.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.drugName}</TableCell>
                <TableCell>{item.symptoms}</TableCell>
                <TableCell>{item.severity}</TableCell>
                <TableCell>{item.hospital}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AllergyData;
