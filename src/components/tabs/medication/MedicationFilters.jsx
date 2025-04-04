import React from "react";
import { Box, TextField, InputAdornment, FormControl, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TypographySizeWrapper from "../../utils/TypographySizeWrapper";

const MedicationFilters = ({
  searchText,
  handleSearchChange,
  selectedVisitType,
  handleVisitTypeChange,
  availableVisitTypes,
  generalDisplaySettings
}) => {
  // 使用 Map 來定義訪問類型選項及其渲染條件
  const visitTypeOptions = new Map([
    // 門診+急診選項，需要同時有門診和急診類型可用
    ['門診+急診', {
      condition: () => availableVisitTypes.includes("門診") && availableVisitTypes.includes("急診"),
      label: '門診+急診'
    }],
    // 門診選項
    ['門診', {
      condition: () => availableVisitTypes.includes("門診"),
      label: '門診'
    }],
    // 急診選項
    ['急診', {
      condition: () => availableVisitTypes.includes("急診"),
      label: '急診'
    }],
    // 住診選項
    ['住診', {
      condition: () => availableVisitTypes.includes("住診"),
      label: '住診'
    }],
    // 顯示所有項目選項，總是顯示
    ['顯示所有項目', {
      condition: () => true,
      label: '顯示所有項目'
    }]
  ]);

  // 創建 Radio 按鈕選項
  const createRadioOptions = () => {
    const options = [];
    
    // 遍歷 Map 生成選項
    for (const [value, { condition, label }] of visitTypeOptions.entries()) {
      // 檢查選項是否應該顯示
      if (condition()) {
        options.push(
          <FormControlLabel
            key={value}
            value={value}
            control={<Radio size="small" />}
            label={
              <TypographySizeWrapper
                textSizeType="content"
                generalDisplaySettings={generalDisplaySettings}
              >
                {label}
              </TypographySizeWrapper>
            }
          />
        );
      }
    }
    
    return options;
  };

  return (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* 搜尋欄 */}
      <TextField
        size="small"
        placeholder="可輸入商品名或學名..."
        value={searchText}
        onChange={handleSearchChange}
        sx={{ 
          mb: 1, 
          mr: 2, 
          flexGrow: 1, 
          maxWidth: { xs: '100%', sm: '300px' },
          '& .MuiInputBase-root': {
            height: '24px'
          } 
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* 如果有多種訪問類型，顯示過濾選項 */}
      {availableVisitTypes.length > 1 && (
        <FormControl component="fieldset" sx={{ flexGrow: 2 }}>
          <RadioGroup
            row
            aria-label="visit-type"
            name="visit-type"
            value={selectedVisitType}
            onChange={handleVisitTypeChange}
          >
            {createRadioOptions()}
          </RadioGroup>
        </FormControl>
      )}
    </Box>
  );
};

export default MedicationFilters;