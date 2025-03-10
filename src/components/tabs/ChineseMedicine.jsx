import React from "react";
import { Box, Divider, IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const ChineseMedicine = ({
  groupedChineseMeds,
  chineseMedSettings,
  handleCopyChineseMedications,
  generalDisplaySettings,
}) => {
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
    </>
  );
};

export default ChineseMedicine;
