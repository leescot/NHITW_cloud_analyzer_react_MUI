import React from "react";
import { Grid, Paper } from "@mui/material";
import TypographySizeWrapper from "../../utils/TypographySizeWrapper";
import MedicationGroup from "./MedicationGroup";

const MedicationTermGroups = ({
  longTermMeds,
  shortTermMeds,
  settings,
  medicationCopyFormat,
  generalDisplaySettings,
  setSnackbarMessage,
  setSnackbarOpen
}) => {
  return (
    <Grid container spacing={2}>
      {/* 左欄：長期用藥（含有>=14天的藥物） */}
      <Grid item xs={12} md={6}>
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <TypographySizeWrapper
            variant="h6"
            textSizeType="content"
            generalDisplaySettings={generalDisplaySettings}
            color="primary.main"
            gutterBottom
          >
            長期用藥（{'\u2265'}14天）
          </TypographySizeWrapper>

          {longTermMeds.length === 0 ? (
            <TypographySizeWrapper
              variant="body2"
              textSizeType="content"
              generalDisplaySettings={generalDisplaySettings}
              color="text.secondary"
            >
              無長期用藥
            </TypographySizeWrapper>
          ) : (
            longTermMeds.map((group, index) => (
              <MedicationGroup
                key={index}
                group={group}
                settings={settings}
                copyFormat={medicationCopyFormat}
                generalDisplaySettings={generalDisplaySettings}
                isLast={index === longTermMeds.length - 1}
                setSnackbarMessage={setSnackbarMessage}
                setSnackbarOpen={setSnackbarOpen}
              />
            ))
          )}
        </Paper>
      </Grid>

      {/* 右欄：短期用藥（全部<14天的藥物） */}
      <Grid item xs={12} md={6}>
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <TypographySizeWrapper
            variant="h6"
            textSizeType="content"
            generalDisplaySettings={generalDisplaySettings}
            color="primary.main"
            gutterBottom
          >
            短期用藥（{"<"}14天）
          </TypographySizeWrapper>

          {shortTermMeds.length === 0 ? (
            <TypographySizeWrapper
              variant="body2"
              textSizeType="content"
              generalDisplaySettings={generalDisplaySettings}
              color="text.secondary"
            >
              無短期用藥
            </TypographySizeWrapper>
          ) : (
            shortTermMeds.map((group, index) => (
              <MedicationGroup
                key={index}
                group={group}
                settings={settings}
                copyFormat={medicationCopyFormat}
                generalDisplaySettings={generalDisplaySettings}
                isLast={index === shortTermMeds.length - 1}
                setSnackbarMessage={setSnackbarMessage}
                setSnackbarOpen={setSnackbarOpen}
              />
            ))
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default MedicationTermGroups;