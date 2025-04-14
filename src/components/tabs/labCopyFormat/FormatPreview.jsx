import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper
} from '@mui/material';
import { renderElem, previewLabItems } from './formatEditorConfig';

// Vertical (stacked) preview format
const VerticalPreview = ({ headerFormat, itemFormat, sx }) => {
  return (
    <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap', p: 0.5, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa', ...sx }}>
      {/* Display header format */}
      {headerFormat.map((item, index) => (
        <React.Fragment key={`header-${index}`}>
          {renderElem(item, index)}
        </React.Fragment>
      ))}
      
      {/* Always add newline after header for vertical format */}
      <br />
      
      {/* Display each lab item's format */}
      {previewLabItems.map((item, itemIndex) => (
        <React.Fragment key={`lab-${itemIndex}`}>
          {itemFormat.map((formatItem, formatIndex) => (
            <React.Fragment key={`lab-${itemIndex}-${formatIndex}`}>
              {renderElem(formatItem, formatIndex, item)}
            </React.Fragment>
          ))}
          {itemIndex < previewLabItems.length - 1 && <br />}
        </React.Fragment>
      ))}
    </Typography>
  );
};

// Horizontal (inline) preview format
const HorizontalPreview = ({ headerFormat, itemFormat, itemSeparator, sx }) => {
  return (
    <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap', p: 0.5, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa', ...sx }}>
      {/* All content in single line with simple structure */}
      <Box sx={{ display: 'inline' }}>
        {/* Header section */}
        {headerFormat.map((item, index) => (
          <React.Fragment key={`header-${index}`}>
            {renderElem(item, index)}
          </React.Fragment>
        ))}
        
        {/* Never add line break for horizontal format */}
        <span> </span>
        
        {/* Lab items inline with separators */}
        {previewLabItems.map((labItem, itemIndex) => (
          <React.Fragment key={`lab-${itemIndex}`}>
            {/* Add separator between items */}
            {itemIndex > 0 && (
              <span>{itemSeparator}</span>
            )}
            
            {/* Lab item elements */}
            {itemFormat.map((formatItem, formatIndex) => (
              <React.Fragment key={`lab-${itemIndex}-${formatIndex}`}>
                {renderElem(formatItem, formatIndex, labItem)}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </Box>
    </Typography>
  );
};

const FormatPreview = ({ 
  headerFormat, 
  itemFormat, 
  itemSeparator = ', ', 
  formatType = "customVertical",
  onFormatTypeChange
}) => {
  // 使用useEffect記錄formatType的變化以便調試
  useEffect(() => {
    console.log(`FormatPreview: formatType changed to ${formatType}`);
  }, [formatType]);
  
  // Format type map for easier management
  const formatTypesMap = {
    customVertical: {
      name: '垂直排列',
      isSelected: formatType === 'customVertical',
      handler: () => onFormatTypeChange && onFormatTypeChange('customVertical')
    },
    customHorizontal: {
      name: '水平排列',
      isSelected: formatType === 'customHorizontal',
      handler: () => onFormatTypeChange && onFormatTypeChange('customHorizontal')
    }
  };
  
  const verticalFormat = formatTypesMap.customVertical;
  const horizontalFormat = formatTypesMap.customHorizontal;

  return (
    <Box sx={{ mb: 0 }}>
      <Grid container spacing={1}>
        {/* Vertical preview on the left */}
        <Grid item xs={12} md={6}>
          <Box 
            onClick={verticalFormat.handler}
            sx={{ 
              border: verticalFormat.isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
              borderRadius: 1,
              p: 0.5,
              mb: 0.5,
              backgroundColor: verticalFormat.isSelected ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
              cursor: 'pointer',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              },
              transition: 'all 0.2s'
            }}
          >
            <Typography 
              variant="subtitle2" 
              align="center" 
              sx={{ 
                mb: 0.25,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: verticalFormat.isSelected ? 'rgba(25, 118, 210, 0.1)' : '#f5f5f5',
                color: verticalFormat.isSelected ? 'primary.main' : 'text.primary',
                fontWeight: verticalFormat.isSelected ? 'bold' : 'normal'
              }}
            >
              {verticalFormat.name} {verticalFormat.isSelected && <>(已選擇)</>}
            </Typography>
            <VerticalPreview 
              headerFormat={headerFormat} 
              itemFormat={itemFormat}
              sx={{
                border: 'none',
                p: 0.5,
                backgroundColor: '#fafafa'
              }}
            />
          </Box>
        </Grid>
        
        {/* Horizontal preview on the right */}
        <Grid item xs={12} md={6}>
          <Box 
            onClick={horizontalFormat.handler}
            sx={{ 
              border: horizontalFormat.isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
              borderRadius: 1,
              p: 0.5,
              mb: 0.5,
              backgroundColor: horizontalFormat.isSelected ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
              cursor: 'pointer',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              },
              transition: 'all 0.2s'
            }}
          >
            <Typography 
              variant="subtitle2" 
              align="center" 
              sx={{ 
                mb: 0.25,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: horizontalFormat.isSelected ? 'rgba(25, 118, 210, 0.1)' : '#f5f5f5',
                color: horizontalFormat.isSelected ? 'primary.main' : 'text.primary',
                fontWeight: horizontalFormat.isSelected ? 'bold' : 'normal'
              }}
            >
              {horizontalFormat.name} {horizontalFormat.isSelected && <>(已選擇)</>}
            </Typography>
            <HorizontalPreview 
              headerFormat={headerFormat} 
              itemFormat={itemFormat} 
              itemSeparator={itemSeparator}
              sx={{
                border: 'none',
                p: 0.5,
                backgroundColor: '#fafafa'
              }}
            />
          </Box>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          此為預覽，實際複製效果可能略有不同
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatType === 'customHorizontal' ? 
            `檢驗項目分隔符號: "${itemSeparator}"` : 
            '每個檢驗項目獨立一行顯示'}
        </Typography>
      </Box>
    </Box>
  );
};

export default FormatPreview; 