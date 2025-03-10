import React from "react";
import { Typography, Box, Divider, IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const MedicationList = ({
  groupedMedications,
  settings,
  copyFormat,
  handleCopyMedications,
  generalDisplaySettings,
}) => {
  // 判斷藥物所屬顏色的函數
  const getMedicationColor = (medication) => {
    if (!settings.enableATC5Colors) return null;
    
    let atc5Code = medication.atc_code;
    
    // Handle cases where the ATC5 code might be in the ATC name
    if (!atc5Code && medication.atc_name) {
      const matches = medication.atc_name.match(/\(([A-Z0-9]+)\)/);
      if (matches && matches[1]) atc5Code = matches[1];
    }
    
    if (!atc5Code) return null;
    
    // 檢查是否有 atc5Groups 設定
    if (!settings.atc5Groups || Object.keys(settings.atc5Groups).length === 0) {
      return null;
    }
    
    // 檢查藥物的 ATC5 代碼是否屬於任何群組
    const group = Object.entries(settings.atc5Groups).find(([groupName, codes]) => {
      const match = codes.some(code => {
        if (code.length === 7) {
          return atc5Code === code; // Exact match for 7-character codes
        } else {
          return atc5Code.startsWith(code); // Prefix match for shorter codes
        }
      });
      return match;
    });
    
    if (!group) return null;
    
    const groupName = group[0];
    
    // 檢查群組是否被分配到顏色
    const colorGroups = settings.atc5ColorGroups || { red: [], orange: [], green: [] };
    
    if (colorGroups.red && colorGroups.red.includes(groupName)) {
      return { name: 'red', color: '#f44336' };
    } else if (colorGroups.orange && colorGroups.orange.includes(groupName)) {
      return { name: 'orange', color: '#ff9800' };
    } else if (colorGroups.green && colorGroups.green.includes(groupName)) {
      return { name: 'green', color: '#4caf50' };
    }
    
    return null;
  };

  // 判斷藥物是否應該以粗體顯示的函數
  const shouldBeBold = (medication) => {
    if (!settings.enableATC5Colors) return false;
    
    let atc5Code = medication.atc_code;
    
    if (!atc5Code) return false;
    
    if (!settings.atc5Groups || Object.keys(settings.atc5Groups).length === 0) {
      return false;
    }
    
    const group = Object.entries(settings.atc5Groups).find(([groupName, codes]) => {
      return codes.some(code => {
        if (code.length === 7) {
          return atc5Code === code; // Exact match for 7-character codes
        } else {
          return atc5Code.startsWith(code); // Prefix match for shorter codes
        }
      });
    });
    
    if (!group) return false;
    
    const groupName = group[0];
    
    // 檢查群組是否被分配到顏色
    const colorGroups = settings.atc5ColorGroups || { red: [], orange: [], green: [] };
    
    // 如果藥物屬於任何有顏色的群組（紅色、橘色或綠色），返回 true
    return (
      colorGroups.red.includes(groupName) || 
      colorGroups.orange.includes(groupName) ||
      colorGroups.green.includes(groupName)
    );
  };

  return (
    <>
      {groupedMedications.length === 0 ? (
        <TypographySizeWrapper 
          variant="body2" 
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          color="text.secondary"
        >
          沒有找到用藥資料
        </TypographySizeWrapper>
      ) : (
        groupedMedications.map((group, index) => (
          <Box key={index} sx={{ mb: 1.5 }}>
            <Box>
              <TypographySizeWrapper 
                variant="h6" 
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
                color="primary" 
                gutterBottom
              >
                {group.date} - {group.hosp}
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
                        handleCopyMedications(group.medications, group)
                      }
                      sx={{ ml: 1, verticalAlign: "middle" }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TypographySizeWrapper>
            </Box>

            {group.medications.map((med, medIndex) => {
              // 獲取藥物的顏色
              const medicationColor = getMedicationColor(med);
              // 檢查藥物是否應該以粗體顯示
              const isBold = shouldBeBold(med);
              
              return (
                <Box key={medIndex} sx={{ ml: 2, mb: 1 }}>
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
                          ml: 0.5,
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
                          color: "info.main", 
                          ml: 0.5 
                        }}
                      >
                        {" "}
                        (餘 {med.drug_left}天)
                      </TypographySizeWrapper>
                    )}
                  </TypographySizeWrapper>
                </Box>
              );
            })}
            {index < groupedMedications.length - 1 && (
              <Divider sx={{ my: 1.0 }} />
            )}
          </Box>
        ))
      )}
    </>
  );
};

export default MedicationList;