import React, { useState } from "react";
import { Box, Divider, IconButton, Tooltip, Snackbar } from "@mui/material";
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
    if (chineseMedSettings.copyFormat === "none") {
      return;
    }

    const groupInfo = {
      date: group.date,
      hosp: group.hosp,
      icd_code: group.icd_code,
      icd_name: group.icd_name,
      showDiagnosis: chineseMedSettings.showDiagnosis,
      showEffectName: chineseMedSettings.showEffectName,
    };

    const formattedText = chineseMedProcessor.formatChineseMedList(
      medications,
      chineseMedSettings.copyFormat,
      groupInfo
    );
    navigator.clipboard
      .writeText(formattedText)
      .then(() => {
        setSnackbarMessage("中藥清單已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy Chinese medications: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
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
        groupedChineseMeds.map((group, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Box>
              <TypographySizeWrapper 
                variant="h6" 
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
                color="primary" 
                gutterBottom
              >
                {group.date} - {group.hosp}
                {chineseMedSettings.showDiagnosis && group.icd_code && (
                  <TypographySizeWrapper
                    component="span"
                    textSizeType="note"
                    generalDisplaySettings={generalDisplaySettings}
                    sx={{
                      color: "text.secondary",
                      ml: 1,
                    }}
                  >
                    {group.icd_code} {group.icd_name}
                  </TypographySizeWrapper>
                )}
                {chineseMedSettings.copyFormat !== "none" && (
                  <Tooltip title="複製中藥清單">
                    <IconButton
                      size="small"
                      onClick={() =>
                        handleCopyChineseMedications(group.medications, group)
                      }
                      sx={{ ml: 1, verticalAlign: "middle" }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TypographySizeWrapper>
            </Box>

            {group.medications.map((med, medIndex) => (
              <Box key={medIndex} sx={{ ml: 2, mb: 1 }}>
                <TypographySizeWrapper 
                  variant="body1"
                  textSizeType="content"
                  generalDisplaySettings={generalDisplaySettings}
                >
                  {med.name} {med.isMulti && "(複方)"}
                  <TypographySizeWrapper
                    component="span"
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                    sx={{ color: "text.secondary", ml: 1 }}
                  >
                    {med.perDosage === "SPECIAL"
                      ? `總量${med.dosage}`
                      : `${med.perDosage}#`}{" "}
                    {med.frequency} / {med.days}天
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
                </TypographySizeWrapper>
              </Box>
            ))}
            {index < groupedChineseMeds.length - 1 && (
              <Divider sx={{ my: 2 }} />
            )}
          </Box>
        ))
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
