/**
 * Overview_VaccineEligibility Component
 *
 * 顯示患者的疫苗適用性建議，包含：
 * - 應施打的疫苗清單
 * - 已施打/未施打狀態（O/X）
 * - 公費/自費資格
 *
 * 基於台灣 ACIP 建議及公費疫苗政策
 */

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Box,
  Tooltip,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import VaccinesIcon from "@mui/icons-material/Vaccines";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

import { evaluateVaccineEligibility } from "../../utils/vaccineEligibilityUtils";
import { extractGFRValue, getCKDStage } from "../../utils/indicatorUtils";

const Overview_VaccineEligibility = ({
  userInfo = null,
  groupedMedications = [],
  patientSummaryData = [],
  hbcvData = null,
  generalDisplaySettings = {},
}) => {
  // 計算 CKD 分期
  const gfrValue = extractGFRValue(patientSummaryData);
  const ckdStage = getCKDStage(gfrValue);

  // 評估疫苗適用性
  const vaccineResults = useMemo(() => {
    return evaluateVaccineEligibility({
      userInfo,
      groupedMedications,
      ckdStage,
      hbcvData,
    });
  }, [userInfo, groupedMedications, ckdStage, hbcvData]);

  // 如果沒有患者資料或無建議疫苗，不顯示
  if (!userInfo || vaccineResults.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        {/* 標題 */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <VaccinesIcon
            sx={{ mr: 1, color: "#1565c0", fontSize: "1.3rem" }}
          />
          <TypographySizeWrapper
            variant="h6"
            textSizeType="title"
            generalDisplaySettings={generalDisplaySettings}
            sx={{ fontWeight: "bold" }}
          >
            建議疫苗
          </TypographySizeWrapper>
        </Box>

        {/* 疫苗表格 */}
        <Table
          size="small"
          sx={{
            "& .MuiTableCell-root": {
              padding: "4px 8px",
              borderBottom: "1px solid",
              borderColor: alpha("#000", 0.08),
            },
          }}
        >
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: alpha("#1565c0", 0.06),
              }}
            >
              <TableCell sx={{ fontWeight: "bold", width: "50%" }}>
                <TypographySizeWrapper
                  textSizeType="note"
                  generalDisplaySettings={generalDisplaySettings}
                  sx={{ fontWeight: "bold", color: "text.secondary" }}
                >
                  應施打疫苗
                </TypographySizeWrapper>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold", width: "25%" }}>
                <TypographySizeWrapper
                  textSizeType="note"
                  generalDisplaySettings={generalDisplaySettings}
                  sx={{ fontWeight: "bold", color: "text.secondary" }}
                >
                  接種狀態
                </TypographySizeWrapper>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold", width: "25%" }}>
                <TypographySizeWrapper
                  textSizeType="note"
                  generalDisplaySettings={generalDisplaySettings}
                  sx={{ fontWeight: "bold", color: "text.secondary" }}
                >
                  費用
                </TypographySizeWrapper>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vaccineResults.map((vaccine) => (
              <TableRow
                key={vaccine.id}
                sx={{
                  "&:hover": {
                    backgroundColor: alpha("#1565c0", 0.04),
                  },
                }}
              >
                {/* 疫苗名稱 */}
                <TableCell>
                  <Tooltip
                    title={vaccine.note || ""}
                    arrow
                    placement="right"
                  >
                    <Box>
                      <TypographySizeWrapper
                        textSizeType="content"
                        generalDisplaySettings={generalDisplaySettings}
                        sx={{ cursor: vaccine.note ? "help" : "default" }}
                      >
                        {vaccine.name}
                      </TypographySizeWrapper>
                    </Box>
                  </Tooltip>
                </TableCell>

                {/* 接種狀態 O/X */}
                <TableCell align="center">
                  {vaccine.isVaccinated ? (
                    <Tooltip
                      title={
                        vaccine.latestDate
                          ? `最近接種：${vaccine.latestDate}`
                          : "已接種"
                      }
                      arrow
                    >
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <TypographySizeWrapper
                          textSizeType="content"
                          generalDisplaySettings={generalDisplaySettings}
                          sx={{
                            color: "#2e7d32",
                            fontWeight: "bold",
                          }}
                        >
                          O
                        </TypographySizeWrapper>
                        {vaccine.latestDate && (
                          <TypographySizeWrapper
                            textSizeType="note"
                            generalDisplaySettings={generalDisplaySettings}
                            sx={{
                              color: "text.secondary",
                              ml: 0.5,
                            }}
                          >
                            {vaccine.latestDate}
                          </TypographySizeWrapper>
                        )}
                      </Box>
                    </Tooltip>
                  ) : (
                    <TypographySizeWrapper
                      textSizeType="content"
                      generalDisplaySettings={generalDisplaySettings}
                      sx={{
                        color: "#c62828",
                        fontWeight: "bold",
                      }}
                    >
                      X
                    </TypographySizeWrapper>
                  )}
                </TableCell>

                {/* 公費/自費 */}
                <TableCell align="center">
                  {vaccine.fundingStatus === "—" ? (
                    <TypographySizeWrapper
                      textSizeType="note"
                      generalDisplaySettings={generalDisplaySettings}
                      sx={{ color: "text.secondary" }}
                    >
                      —
                    </TypographySizeWrapper>
                  ) : (
                    <Chip
                      label={vaccine.fundingStatus}
                      size="small"
                      sx={{
                        height: "22px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        ...(vaccine.fundingStatus === "公費"
                          ? {
                              backgroundColor: alpha("#2e7d32", 0.12),
                              color: "#2e7d32",
                              border: "1px solid",
                              borderColor: alpha("#2e7d32", 0.3),
                            }
                          : {
                              backgroundColor: alpha("#ed6c02", 0.12),
                              color: "#ed6c02",
                              border: "1px solid",
                              borderColor: alpha("#ed6c02", 0.3),
                            }),
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default Overview_VaccineEligibility;
