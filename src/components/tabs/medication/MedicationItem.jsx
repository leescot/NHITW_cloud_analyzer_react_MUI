import React from "react";
import { Box, Tooltip, IconButton } from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import TypographySizeWrapper from "../../utils/TypographySizeWrapper";
import { getMedicationColor, shouldBeBold, handleDrugImageClick } from "./MedicationHelpers";

const MedicationItem = ({
  med,
  settings,
  generalDisplaySettings,
  setSnackbarMessage,
  setSnackbarOpen
}) => {
  // 獲取藥物的顏色
  const medicationColor = getMedicationColor(med, settings);
  // 檢查藥物是否應該以粗體顯示
  const isBold = shouldBeBold(med, settings);

  return (
    <Box sx={{ ml: 2, mb: 1 }}>
      <TypographySizeWrapper
        variant="body2"
        textSizeType="content"
        generalDisplaySettings={generalDisplaySettings}
        sx={{
          color: medicationColor ? medicationColor.color : 'inherit',
          fontWeight: isBold ? 'bold' : 'normal'
        }}
      >
        {med.name}{" "}
        {med.perDosage !== "SPECIAL"
          ? `${med.perDosage}#`
          : `總量${med.dosage}`}{" "}
        {med.frequency} {med.days}天
        {settings.showGenericName && med.ingredient && (
          <TypographySizeWrapper
            component="span"
            textSizeType="note"
            generalDisplaySettings={generalDisplaySettings}
            sx={{
              color: medicationColor ? medicationColor.color : "text.secondary",
              fontStyle: "italic",
              ml: 0.8,
              fontWeight: isBold ? 'bold' : 'normal'
            }}
          >
            {" "}
            {med.ingredient}
          </TypographySizeWrapper>
        )}
        {settings.showATC5Name && med.atc_name && (
          <TypographySizeWrapper
            component="span"
            textSizeType="note"
            generalDisplaySettings={generalDisplaySettings}
            sx={{
              color: medicationColor ? medicationColor.color : "text.secondary",
              ml: 0.5,
              fontWeight: isBold ? 'bold' : 'normal'
            }}
          >
            {" "}
            - {med.atc_name}
          </TypographySizeWrapper>
        )}
        {med.drug_left > 0 && (
          <TypographySizeWrapper
            component="span"
            textSizeType="note"
            generalDisplaySettings={generalDisplaySettings}
            sx={{
              color: "secondary.light",
              ml: 0.5
            }}
          >
            {" "}
            (餘{med.drug_left}天)
          </TypographySizeWrapper>
        )}
        {settings.showExternalDrugImage && med.drugcode && (
          <Tooltip title="查看藥物圖片">
            <IconButton
              size="small"
              onClick={() => handleDrugImageClick(med.drugcode, setSnackbarMessage, setSnackbarOpen)}
              sx={{
                ml: 0.5,
                opacity: 0.5,
                padding: "2px",
                display: "inline-flex",
                verticalAlign: "text-top", // 或嘗試 "middle"
                '&:hover': {
                  opacity: 1
                }
              }}
            >
              <ImageIcon sx={{
                fontSize: generalDisplaySettings.contentTextSize === 'small'
                  ? "14px"
                  : generalDisplaySettings.contentTextSize === 'medium'
                    ? "16px"
                    : "18px"
              }} />
            </IconButton>
          </Tooltip>
        )}
      </TypographySizeWrapper>
    </Box>
  );
};

export default MedicationItem;