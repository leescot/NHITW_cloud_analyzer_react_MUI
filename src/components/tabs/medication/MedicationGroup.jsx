import React from "react";
import { Box, Divider, IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TypographySizeWrapper from "../../utils/TypographySizeWrapper";
import MedicationItem from "./MedicationItem";
import { getVisitTypeColor, handleCopyMedications } from "./MedicationHelpers";

const MedicationGroup = ({
  group,
  settings,
  copyFormat,
  generalDisplaySettings,
  isLast,
  setSnackbarMessage,
  setSnackbarOpen
}) => {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box>
        <TypographySizeWrapper
          variant="subtitle1"
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          color={getVisitTypeColor(group.visitType)}
          gutterBottom
        >
          {group.date} - {group.hosp} {group.visitType && `(${group.visitType})`}
          {settings.showDiagnosis && group.icd_code && (
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
          {copyFormat !== "none" && (
            <Tooltip title="複製藥物清單">
              <IconButton
                size="small"
                onClick={() =>
                  handleCopyMedications(group.medications, group, settings, setSnackbarMessage, setSnackbarOpen)
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
        <MedicationItem
          key={medIndex}
          med={med}
          settings={settings}
          generalDisplaySettings={generalDisplaySettings}
          setSnackbarMessage={setSnackbarMessage}
          setSnackbarOpen={setSnackbarOpen}
        />
      ))}

      {!isLast && <Divider sx={{ my: 1.0 }} />}
    </Box>
  );
};

export default MedicationGroup;