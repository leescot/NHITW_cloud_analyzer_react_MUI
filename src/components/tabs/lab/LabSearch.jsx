import React from "react";
import { Box, TextField, InputAdornment, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TypographySizeWrapper from "../../utils/TypographySizeWrapper";

const LabSearch = ({
  searchText,
  handleSearchChange,
  generalDisplaySettings,
  labSettings,
  onCopyAll
}) => {
  return (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* 搜尋欄 */}
      <TextField
        size="small"
        placeholder="搜尋檢驗項目名稱、代碼或縮寫..."
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

      {/* 顯示複製全部按鈕，如果設置允許 */}
      {labSettings?.enableLabCopyAll && (
        <Button 
          variant="outlined" 
          size="small" 
          onClick={onCopyAll}
          sx={{ 
            mb: 1, 
            mr: 2, 
            height: '24px',
            position: 'relative',
            fontSize: '0.75rem',
            minWidth: '70px'
          }}
          startIcon={<ContentCopyIcon fontSize="small" />}
        >
          複製
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 2,
              fontSize: '0.6rem',
              lineHeight: 1,
            }}
          >
            All
          </Box>
        </Button>
      )}
    </Box>
  );
};

export default LabSearch; 