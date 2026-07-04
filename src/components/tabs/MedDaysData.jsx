import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const MedDaysData = ({ medDaysData }) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              <TypographySizeWrapper
                textSizeType="content"
              >
                藥品名稱
              </TypographySizeWrapper>
            </TableCell>
            <TableCell align="right">
              <TypographySizeWrapper
                textSizeType="content"
              >
                剩餘天數
              </TypographySizeWrapper>
            </TableCell>
            <TableCell>
              <TypographySizeWrapper
                textSizeType="content"
              >
                到期日
              </TypographySizeWrapper>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {medDaysData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} align="center">
                <TypographySizeWrapper
                  textSizeType="content"
                  color="text.secondary"
                >
                  沒有找到餘藥資料
                </TypographySizeWrapper>
              </TableCell>
            </TableRow>
          ) : (
            medDaysData.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <TypographySizeWrapper
                    textSizeType="content"
                  >
                    {item.drugName}
                  </TypographySizeWrapper>
                </TableCell>
                <TableCell align="right">
                  <TypographySizeWrapper
                    textSizeType="content"
                  >
                    {item.remainingDays}
                  </TypographySizeWrapper>
                </TableCell>
                <TableCell>
                  <TypographySizeWrapper
                    textSizeType="content"
                  >
                    {item.expiryDate}
                  </TypographySizeWrapper>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MedDaysData;
