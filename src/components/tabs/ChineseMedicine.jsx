import React, { useState, useEffect } from "react";
import { Box, Divider, IconButton, Tooltip, Snackbar, Grid } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";
import { chineseMedProcessor } from "../../utils/chineseMedProcessor";

const ChineseMedicine = ({
  groupedChineseMeds,
  chineseMedSettings,
  generalDisplaySettings,
}) => {
  // 添加 snackbar 狀態
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // 關閉 snackbar 的函數
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // 複製中藥的函數 - 從 FloatingIcon 移過來
  const handleCopyChineseMedications = (medications, group) => {
    const copyText = chineseMedProcessor.getChineseMedicationCopyText(medications, {
      date: group.date,
      hosp: group.hosp,
      days: days,
      icd_code: group.icd_code,
      icd_name: group.icd_name,
      copyFormat: chineseMedSettings.copyFormat,
      showEffectName: chineseMedSettings.showEffectName
    });

    navigator.clipboard.writeText(copyText).then(() => {
      setSnackbarMessage("中藥清單已複製到剪貼簿");
      setSnackbarOpen(true);
    }).catch((err) => {
      console.error("Failed to copy Chinese medications: ", err);
      setSnackbarMessage("複製失敗，請重試");
      setSnackbarOpen(true);
    });
  };

  // 依照每日劑量降序排序藥品
  const sortMedicationsByDailyDosage = (medications) => {
    return [...medications].sort((a, b) => {
      const dosageA = parseFloat(a.dailyDosage) || 0;
      const dosageB = parseFloat(b.dailyDosage) || 0;
      return dosageB - dosageA; // 降序排列
    });
  };

  return (
    <>
      {groupedChineseMeds.length === 0 ? (
        <TypographySizeWrapper 
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          color="text.secondary"
        >
          沒有找到中藥資料
        </TypographySizeWrapper>
      ) : (
        groupedChineseMeds.map((group, index) => {
          // 取得組中第一個藥品的天數
          const days = group.medications && group.medications.length > 0 ? group.medications[0].days : "";
          // 排序藥品
          const sortedMedications = sortMedicationsByDailyDosage(group.medications);
          
          return (
            <Box key={index} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TypographySizeWrapper 
                  variant="h6" 
                  textSizeType="content"
                  generalDisplaySettings={generalDisplaySettings}
                  color="primary" 
                  gutterBottom={false}
                  sx={{ mb: 0 }}
                >
                  {group.date} - {group.hosp}
                </TypographySizeWrapper>
                
                {group.icd_code && (
                  <TypographySizeWrapper
                    component="span"
                    textSizeType="content"
                    variant="h6"
                    generalDisplaySettings={generalDisplaySettings}
                    sx={{
                      color: "text.primary",
                      ml: 1,
                      mb: 0
                    }}
                  >
                    {group.icd_code} {group.icd_name}
                  </TypographySizeWrapper>
                )}
                
                <TypographySizeWrapper
                  component="span"
                  textSizeType="content"
                  variant="h6"
                  generalDisplaySettings={generalDisplaySettings}
                  sx={{
                    color: "text.primary",
                    ml: 1,
                    mb: 0
                  }}
                >
                  {days}天
                </TypographySizeWrapper>
                
                {chineseMedSettings.copyFormat !== "none" && (
                  <Tooltip title="複製中藥清單">
                    <IconButton
                      size="small"
                      onClick={() =>
                        handleCopyChineseMedications(group.medications, group)
                      }
                      sx={{ ml: 1, verticalAlign: "middle", mb: 0 }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {sortedMedications.map((med, medIndex) => (
                <Box key={medIndex} sx={{ ml: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
                  <TypographySizeWrapper 
                    variant="body1"
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                    // 調整這裡的 mr 值可以改變藥名和劑量之間的間距
                    // mr: 1 表示很小的間距，mr: 10 表示很大的間距
                    // 目前設定為 mr: 10，可以根據需要調整
                    sx={{ minWidth: '120px', maxWidth: '200px', mr: 10 }}
                  >
                    {med.name}
                  </TypographySizeWrapper>
                  
                  <TypographySizeWrapper
                    component="span"
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                    sx={{ color: "text.secondary" }}
                  >
                    {med.dailyDosage}g {med.frequency}
                  </TypographySizeWrapper>
                  
                  {chineseMedSettings.showEffectName && med.sosc_name && (
                    <TypographySizeWrapper
                      component="span"
                      textSizeType="note"
                      generalDisplaySettings={generalDisplaySettings}
                      sx={{
                        color: "info.main",
                        ml: 1,
                      }}
                    >
                      - {med.sosc_name}
                    </TypographySizeWrapper>
                  )}
                </Box>
              ))}
              {index < groupedChineseMeds.length - 1 && (
                <Divider sx={{ my: 2 }} />
              )}
            </Box>
          );
        })
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};

export default ChineseMedicine;
