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
  return (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* 搜尋欄 */}
      <TextField
        size="small"
        placeholder="可輸入商品名或學名..."
        value={searchText}
        onChange={handleSearchChange}
        sx={{ mb: 1, mr: 2, flexGrow: 1, maxWidth: { xs: '100%', sm: '300px' } }}
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
            {/* 門診+急診選項 */}
            {availableVisitTypes.includes("門診") && availableVisitTypes.includes("急診") && (
              <FormControlLabel 
                value="門診+急診" 
                control={<Radio size="small" />} 
                label={
                  <TypographySizeWrapper
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                  >
                    門診+急診
                  </TypographySizeWrapper>
                } 
              />
            )}
            
            {/* 門診選項 */}
            {availableVisitTypes.includes("門診") && (
              <FormControlLabel 
                value="門診" 
                control={<Radio size="small" />} 
                label={
                  <TypographySizeWrapper
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                  >
                    門診
                  </TypographySizeWrapper>
                } 
              />
            )}
            
            {/* 急診選項 */}
            {availableVisitTypes.includes("急診") && (
              <FormControlLabel 
                value="急診" 
                control={<Radio size="small" />} 
                label={
                  <TypographySizeWrapper
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                  >
                    急診
                  </TypographySizeWrapper>
                } 
              />
            )}
            
            {/* 住診選項 */}
            {availableVisitTypes.includes("住診") && (
              <FormControlLabel 
                value="住診" 
                control={<Radio size="small" />} 
                label={
                  <TypographySizeWrapper
                    textSizeType="content"
                    generalDisplaySettings={generalDisplaySettings}
                  >
                    住診
                  </TypographySizeWrapper>
                } 
              />
            )}
            
            {/* 顯示所有項目選項 */}
            <FormControlLabel 
              value="顯示所有項目" 
              control={<Radio size="small" />} 
              label={
                <TypographySizeWrapper
                  textSizeType="content"
                  generalDisplaySettings={generalDisplaySettings}
                >
                  顯示所有項目
                </TypographySizeWrapper>
              } 
            />
          </RadioGroup>
        </FormControl>
      )}
    </Box>
  );
};

export default MedicationFilters; 