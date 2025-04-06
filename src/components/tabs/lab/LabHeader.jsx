import React from "react";
import { Box } from "@mui/material";
import TypographySizeWrapper from "../../utils/TypographySizeWrapper";
import { CopyAllButton, CopySelectedButton } from "../../utils/lab/IconComponents";
import { formatDate } from "../../utils/lab/LabUtilities";

const LabHeader = ({
  group,
  index,
  settings,
  labSettings,
  generalDisplaySettings,
  handleCopyAllLabData,
  handleCopyUserSelectedLabData,
  hasSelectedItems
}) => {
  const copyButtonStyle = { ml: 1 };

  return (
    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
      <TypographySizeWrapper
        variant="subtitle1"
        textSizeType="content"
        generalDisplaySettings={generalDisplaySettings}
        color="primary"
        sx={{ flexGrow: 1 }}
      >
        {/* 將日期格式從 YYYY-MM-DD 轉換為 YYYY/MM/DD */}
        {formatDate(group.date)} - {group.hosp}
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

        {/* 複製按鈕 - 根據設定決定顯示一個還是兩個 */}
        {labSettings.enableLabChooseCopy ? (
          <>
            <CopyAllButton onClick={() => handleCopyAllLabData(group)} style={copyButtonStyle} showLabel={true} />
            {/* 當選擇了項目時顯示 Sel 按鈕 */}
            {hasSelectedItems(index) && (
              <CopySelectedButton onClick={() => handleCopyUserSelectedLabData(group, index)} style={copyButtonStyle} />
            )}
          </>
        ) : (
          <CopyAllButton onClick={() => handleCopyAllLabData(group)} style={copyButtonStyle} showLabel={false} />
        )}
      </TypographySizeWrapper>
    </Box>
  );
};

export default LabHeader;