/**
 * Overview_RecentDiagnosis Component
 *
 * 此組件顯示過去180天的最近診斷信息，
 * 按訪問類型分類（門診/急診/住診）。
 * - 門診和急診診斷按頻率排序（最頻繁的優先）
 * - 住診診斷顯示首次發生日期
 * - 每個類別最多顯示5項，如果超過5項則顯示查看全部提示
 * - 疫苗記錄（ICD Z23-Z27）單獨顯示在各自的類別中
 */

import React, { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Badge,
  Divider,
  Chip
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import InfoIcon from '@mui/icons-material/Info';
import GrassIcon from '@mui/icons-material/Grass';
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const Overview_RecentDiagnosis = ({
  groupedMedications = [],
  groupedChineseMeds = [],
  generalDisplaySettings = {},
  trackingDays = 180
}) => {
  // 處理來自藥物和中藥記錄的診斷數據
  const diagnosisData = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - trackingDays);

    const outpatientDiagnoses = {};
    const emergencyDiagnoses = [];  // 從物件改為數組以存儲日期信息
    const inpatientDiagnoses = [];
    const vaccineRecords = [];      // 疫苗記錄的新數組

    // 輔助函數，用於安全解析各種格式的日期
    const parseDate = (dateStr) => {
      if (!dateStr) return null;

      // 處理 yyyy/mm/dd 和 yyyy-mm-dd 格式
      let normalizedDate = dateStr.replace(/\//g, '-');

      // 嘗試解析日期
      const parsedDate = new Date(normalizedDate);

      // 檢查日期是否有效
      if (isNaN(parsedDate.getTime())) {
        return null;
      }

      return parsedDate;
    };

    // 輔助函數，檢查 ICD 代碼是否為疫苗代碼
    const isVaccineCode = (icdCode) => {
      if (!icdCode) return false;

      // 檢查是否以 Z23、Z24、Z25、Z26 或 Z27 開頭
      const normalizedCode = icdCode.toUpperCase();
      return normalizedCode.startsWith('Z23') ||
             normalizedCode.startsWith('Z24') ||
             normalizedCode.startsWith('Z25') ||
             normalizedCode.startsWith('Z26') ||
             normalizedCode.startsWith('Z27');
    };

    // 使用 Map 來定義不同訪問類型的處理邏輯
    const visitTypeHandlers = new Map([
      ["門診", (diagnosisKey, isChineseMed) => {
        outpatientDiagnoses[diagnosisKey] = {
          count: (outpatientDiagnoses[diagnosisKey]?.count || 0) + 1,
          isChineseMed
        };
      }],
      ["藥局", (diagnosisKey, isChineseMed) => {
        outpatientDiagnoses[diagnosisKey] = {
          count: (outpatientDiagnoses[diagnosisKey]?.count || 0) + 1,
          isChineseMed
        };
      }],
      ["急診", (diagnosisKey, isChineseMed, group, normalizedIcdCode) => {
        emergencyDiagnoses.push({
          date: group.date,
          code: normalizedIcdCode,
          name: group.icd_name,
          key: diagnosisKey,
          isChineseMed,
          hospital: group.hosp || group.hospital || ''
        });
      }],
      ["住診", (diagnosisKey, isChineseMed, group, normalizedIcdCode) => {
        const existingEntry = inpatientDiagnoses.find(entry => entry.code === normalizedIcdCode);
        if (!existingEntry) {
          inpatientDiagnoses.push({
            date: group.date,
            code: normalizedIcdCode,
            name: group.icd_name,
            key: diagnosisKey,
            isChineseMed,
            hospital: group.hosp || group.hospital || ''
          });
        }
      }]
    ]);

    // 設定默認處理邏輯（用於未分類的訪問類型）
    const defaultHandler = (diagnosisKey, isChineseMed) => {
      outpatientDiagnoses[diagnosisKey] = {
        count: (outpatientDiagnoses[diagnosisKey]?.count || 0) + 1,
        isChineseMed
      };
    };

    // 處理疫苗記錄的輔助函數
    const processVaccineRecord = (group, normalizedIcdCode, diagnosisKey, isChineseMed) => {
      // 檢查是否有J07開頭的疫苗藥物
      let hasVaccineMedication = false;
      let medicationNames = [];

      if (Array.isArray(group.medications) && group.medications.length > 0) {
        // 過濾出有J07開頭ATC碼的藥物
        const vaccineFilteredMeds = group.medications.filter(med => med.atc_code && med.atc_code.startsWith('J07'));

        // 如果有J07藥物，則記錄該筆為疫苗記錄
        if (vaccineFilteredMeds.length > 0) {
          hasVaccineMedication = true;
          medicationNames = vaccineFilteredMeds.map(med => med.name || med.drugName || '').filter(Boolean);
        }
      } else if (group.atc_code && group.atc_code.startsWith('J07')) {
        // 單一藥物情況
        hasVaccineMedication = true;
        medicationNames = [group.name || group.drugName].filter(Boolean);
      }

      // 只有當既有疫苗診斷碼又有J07藥物時，才加入疫苗記錄
      if (hasVaccineMedication && medicationNames.length > 0) {
        vaccineRecords.push({
          date: group.date,
          code: normalizedIcdCode,
          name: group.icd_name,
          hospital: group.hosp || group.hospital || '',
          medications: medicationNames,
          key: diagnosisKey,
          isChineseMed
        });
        return true;
      }
      return false;
    };

    // 處理西藥
    const processMedication = (group, isChineseMed = false) => {
      // 跳過跟踪期間之前的條目
      const groupDate = parseDate(group.date);
      if (!groupDate || groupDate < cutoffDate) {
        return;
      }

      // 跳過沒有診斷信息的條目
      if (!group.icd_code || !group.icd_name) {
        return;
      }

      // 規範化 ICD 代碼以處理大小寫敏感性問題
      const normalizedIcdCode = group.icd_code.toUpperCase();
      const diagnosisKey = `${normalizedIcdCode}|${group.icd_name}`;

      // 檢查診斷碼是否為疫苗相關
      if (isVaccineCode(normalizedIcdCode)) {
        // 處理疫苗記錄
        const isProcessed = processVaccineRecord(group, normalizedIcdCode, diagnosisKey, isChineseMed);
        if (isProcessed) return;
      }

      // 使用 Map 選擇適當的處理邏輯
      const handler = visitTypeHandlers.get(group.visitType) || defaultHandler;
      handler(diagnosisKey, isChineseMed, group, normalizedIcdCode);
    };

    // 處理西藥
    groupedMedications.forEach(group => processMedication(group, false));
    
    // 處理中藥
    groupedChineseMeds.forEach(group => processMedication(group, true));

    // 使用Map定義每種類別的排序邏輯
    const sorters = new Map([
      ["outpatient", (data) => {
        return Object.entries(data).map(([key, data]) => {
          const [code, name] = key.split('|');
          return {
            code,
            name,
            count: data.count,
            isChineseMed: data.isChineseMed,
            key
          };
        }).sort((a, b) => {
          // 先按計數排序（降序）
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          // 如果計數相同，按 ICD 代碼排序（升序）
          return a.code.localeCompare(b.code);
        });
      }],
      ["emergency", (data) => {
        return [...data].sort((a, b) => {
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          
          if (!dateA || !dateB) {
            return a.date.localeCompare(b.date);
          }
          
          return dateB - dateA;
        });
      }],
      ["inpatient", (data) => {
        return [...data].sort((a, b) => {
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          
          if (!dateA || !dateB) {
            return a.date.localeCompare(b.date);
          }
          
          return dateB - dateA;
        });
      }],
      ["vaccines", (data) => {
        return [...data].sort((a, b) => {
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          
          if (!dateA || !dateB) {
            return a.date.localeCompare(b.date);
          }
          
          return dateB - dateA;
        });
      }]
    ]);

    return {
      outpatient: sorters.get("outpatient")(outpatientDiagnoses),
      emergency: sorters.get("emergency")(emergencyDiagnoses),
      inpatient: sorters.get("inpatient")(inpatientDiagnoses),
      vaccines: sorters.get("vaccines")(vaccineRecords)
    };
  }, [groupedMedications, groupedChineseMeds, trackingDays]);

  // 檢查是否有診斷數據
  const hasDiagnoses = useMemo(() => {
    return diagnosisData.outpatient.length > 0 ||
           diagnosisData.emergency.length > 0 ||
           diagnosisData.inpatient.length > 0 ||
           diagnosisData.vaccines.length > 0;
  }, [diagnosisData]);

  // 使用Map來定義類別顯示配置
  const categoryConfig = new Map([
    ["門診", { 
      shortTitle: "門", 
      color: "primary.main", 
      bgColor: alpha("#2196f3", 0.15),
      isInpatient: false, 
      isEmergency: false, 
      isVaccine: false 
    }],
    ["急診", { 
      shortTitle: "急", 
      color: "#c62828", 
      bgColor: alpha("#c62828", 0.15),
      isInpatient: false, 
      isEmergency: true, 
      isVaccine: false 
    }],
    ["住診", { 
      shortTitle: "住", 
      color: "#388e3c", 
      bgColor: alpha("#388e3c", 0.2),
      isInpatient: true, 
      isEmergency: false, 
      isVaccine: false 
    }],
    ["疫苗", { 
      shortTitle: "疫", 
      color: "#1565c0", 
      bgColor: alpha("#1565c0", 0.18),
      isInpatient: false, 
      isEmergency: false, 
      isVaccine: true 
    }]
  ]);

  // 渲染診斷類別表格行
  const renderDiagnosisCategory = (title, diagnoses) => {
    // 如果此類別中沒有診斷，則不返回任何內容
    if (diagnoses.length === 0) return null;

    // 顯示最多5個診斷，然後顯示更多提示
    const visibleDiagnoses = diagnoses.slice(0, 5);
    const hasMore = diagnoses.length > 5;

    // 從Map中獲取類別配置
    const config = categoryConfig.get(title) || categoryConfig.get("門診"); // 默認為門診配置
    const { shortTitle, color, bgColor, isInpatient, isEmergency, isVaccine } = config;

    return (
      <TableRow>
        <TableCell
          component="th"
          scope="row"
          align="center"
          sx={{
            width: '10%',
            verticalAlign: 'middle',
            borderBottom: 'none',
            padding: '8px 2px',
            backgroundColor: bgColor,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: `1px solid ${color}`,
              backgroundColor: 'white',
              color: color,
              fontSize: '0.75rem',
              width: '28px',
              height: '28px',
              margin: '0 auto',
              fontWeight: 'bold',
            }}
          >
            <TypographySizeWrapper
              textSizeType="content"
              generalDisplaySettings={generalDisplaySettings}
              sx={{ fontSize: '0.85rem', fontWeight: 'bold', lineHeight: 1 }}
            >
              {shortTitle}
            </TypographySizeWrapper>
          </Box>
        </TableCell>
        <TableCell sx={{ borderBottom: 'none', padding: '8px 0' }}>
          <Box>
            {visibleDiagnoses.map((diagnosis, index) => (
              <Box key={diagnosis.key} sx={{ display: 'flex', alignItems: 'center', mb: 0.8 }}>
                {(isInpatient || isEmergency) && (
                  <Chip
                    size="small"
                    label={`${diagnosis.date}${diagnosis.hospital ? ` (${diagnosis.hospital})` : ''}`}
                    sx={{
                      fontSize: '0.7rem',
                      height: '20px',
                      mr: 1,
                      bgcolor: 'transparent',
                      border: '1px solid',
                      borderColor: color,
                      color: color,
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                )}

                {isVaccine && (
                  <Box sx={{ mr: 1 }}>
                    <Chip
                      size="small"
                      label={diagnosis.date}
                      sx={{
                        fontSize: '0.7rem',
                        height: '20px',
                        mb: 0.3,
                        bgcolor: 'transparent',
                        border: '1px solid',
                        borderColor: color,
                        color: color,
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                    {diagnosis.hospital && (
                      <Chip
                        size="small"
                        label={diagnosis.hospital}
                        sx={{
                          fontSize: '0.65rem',
                          height: '18px',
                          bgcolor: alpha(color, 0.08),
                          color: color,
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    )}
                  </Box>
                )}

                <TypographySizeWrapper
                  textSizeType="content"
                  generalDisplaySettings={generalDisplaySettings}
                  sx={{ mr: 1 }}
                >
                  {isVaccine ? (
                    // 對於疫苗，僅顯示藥物名稱（日期和醫院現在在芯片中）
                    <>{diagnosis.medications?.join(', ')}</>
                  ) : isInpatient || isEmergency ? (
                    // 對於住院和急診，僅顯示診斷名稱
                    <>{diagnosis.name}</>
                  ) : (
                    // 對於門診，顯示代碼、名稱和計數（無變化）
                    <>{diagnosis.code} {diagnosis.name}</>
                  )}
                </TypographySizeWrapper>

                {/* 如果診斷來自中醫，添加中醫圖標 */}
                {diagnosis.isChineseMed && (
                  <Tooltip title="中醫診斷">
                    <GrassIcon
                      fontSize="small"
                      color="primary"
                      sx={{ fontSize: '0.9rem', mr: 1.5, opacity: 0.7 }}
                    />
                  </Tooltip>
                )}

                {!isInpatient && !isEmergency && !isVaccine && diagnosis.count > 1 && (
                  <Badge
                    badgeContent={diagnosis.count}
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.7rem',
                        height: '16px',
                        minWidth: '16px',
                        backgroundColor: 'primary.main',
                        color: 'white'
                      }
                    }}
                  />
                )}
              </Box>
            ))}

            {hasMore && (
              <Tooltip
                title={
                  <Box>
                    {diagnoses.slice(5).map((diagnosis) => (
                      <Box key={diagnosis.key} sx={{ mb: 0.5 }}>
                        {isVaccine ? (
                          <>{diagnosis.date}{diagnosis.hospital ? ` (${diagnosis.hospital})` : ''}: {diagnosis.medications?.join(', ')}</>
                        ) : isInpatient ? (
                          <>{diagnosis.date}{diagnosis.hospital ? ` (${diagnosis.hospital})` : ''}: {diagnosis.name}</>
                        ) : isEmergency ? (
                          <>{diagnosis.date}{diagnosis.hospital ? ` (${diagnosis.hospital})` : ''}: {diagnosis.name}</>
                        ) : (
                          <>{diagnosis.code} {diagnosis.name} ({diagnosis.count})</>
                        )}
                        {diagnosis.isChineseMed && " (中醫)"}
                      </Box>
                    ))}
                  </Box>
                }
                arrow
              >
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <InfoIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                  <TypographySizeWrapper
                    textSizeType="note"
                    generalDisplaySettings={generalDisplaySettings}
                    color="text.secondary"
                  >
                    還有 {diagnoses.length - 5} 筆資料
                  </TypographySizeWrapper>
                </Box>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <TypographySizeWrapper
          variant="h6"
          textSizeType="title"
          generalDisplaySettings={generalDisplaySettings}
          gutterBottom
        >
          半年內就醫診斷
        </TypographySizeWrapper>

        {!hasDiagnoses ? (
          <TypographySizeWrapper
            textSizeType="content"
            generalDisplaySettings={generalDisplaySettings}
            color="text.secondary"
          >
            無近期診斷資料
          </TypographySizeWrapper>
        ) : (
          <Table size="small" sx={{ '& .MuiTableCell-root': { padding: '4px 8px' } }}>
            <TableBody>
              {/* 渲染門診診斷 */}
              {renderDiagnosisCategory("門診", diagnosisData.outpatient)}

              {/* 添加分隔線（如果有更多類別） */}
              {diagnosisData.outpatient.length > 0 &&
               (diagnosisData.emergency.length > 0 ||
                diagnosisData.inpatient.length > 0 ||
                diagnosisData.vaccines.length > 0) && (
                <TableRow>
                  <TableCell colSpan={2} sx={{ padding: '4px 0' }}>
                    <Divider />
                  </TableCell>
                </TableRow>
              )}

              {/* 渲染急診診斷 */}
              {renderDiagnosisCategory("急診", diagnosisData.emergency)}

              {/* 如果需要添加分隔線 */}
              {diagnosisData.emergency.length > 0 &&
               (diagnosisData.inpatient.length > 0 ||
                diagnosisData.vaccines.length > 0) && (
                <TableRow>
                  <TableCell colSpan={2} sx={{ padding: '4px 0' }}>
                    <Divider />
                  </TableCell>
                </TableRow>
              )}

              {/* 渲染住院診斷 */}
              {renderDiagnosisCategory("住診", diagnosisData.inpatient)}

              {/* 添加疫苗前的分隔線（如果需要） */}
              {diagnosisData.inpatient.length > 0 &&
               diagnosisData.vaccines.length > 0 && (
                <TableRow>
                  <TableCell colSpan={2} sx={{ padding: '4px 0' }}>
                    <Divider />
                  </TableCell>
                </TableRow>
              )}

              {/* 渲染疫苗記錄 */}
              {renderDiagnosisCategory("疫苗", diagnosisData.vaccines)}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default Overview_RecentDiagnosis;