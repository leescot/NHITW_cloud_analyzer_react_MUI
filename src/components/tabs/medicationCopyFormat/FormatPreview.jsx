import React, { useMemo, useEffect } from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { previewDrugs, previewHeader, renderElem, ELEMENT_SECTIONS } from './formatEditorConfig';

// Component to render a single element in the preview
const RenderPreviewElement = ({ item, index, drugData }) => {
  // Special handling for section-specific elements
  let baseId = item.id.split('_')[0];
  
  // Extract actual element type for section-specific elements
  if (baseId === 'header' || baseId === 'drug') {
    const parts = item.id.split('_');
    if (parts.length > 1) {
      baseId = parts[1]; // Get the actual element type (e.g., 'text', 'space')
    }
  } else if (item.id.includes('icdcode')) {
    baseId = 'icdcode';
  } else if (item.id.includes('icdname')) {
    baseId = 'icdname';
  }
  
  if (baseId === 'newline') {
    return <br key={index} />;
  }
  
  // For format group elements, prioritize using the value directly
  if (item.group === 'format' && item.value) {
    return <React.Fragment key={index}>{item.value}</React.Fragment>;
  }
  
  // Use renderElem for all other elements
  let displayValue = renderElem(item, index, drugData);
  
  return (
    <React.Fragment key={index}>
      {displayValue}
    </React.Fragment>
  );
};

// Vertical (stacked) preview format
const VerticalPreview = ({ headerFormat, drugFormat, sx }) => {
  return (
    <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap', p: 0.5, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa', ...sx }}>
      {/* Display header format */}
      {headerFormat.map((item, index) => (
        <RenderPreviewElement 
          key={`header-${index}`} 
          item={item} 
          index={`header-${index}`} 
          drugData={previewDrugs[0]} 
        />
      ))}
      
      {/* Always add newline after header for vertical format */}
      <br />
      
      {/* Display each drug's format */}
      {previewDrugs.map((drug, drugIndex) => (
        <React.Fragment key={`drug-${drugIndex}`}>
          {drugFormat.map((item, itemIndex) => (
            <RenderPreviewElement 
              key={`drug-${drugIndex}-${itemIndex}`} 
              item={item} 
              index={`drug-${drugIndex}-${itemIndex}`} 
              drugData={drug} 
            />
          ))}
          {drugIndex < previewDrugs.length - 1 && <br />}
        </React.Fragment>
      ))}
    </Typography>
  );
};

// Horizontal (inline) preview format
const HorizontalPreview = ({ headerFormat, drugFormat, drugSeparator, sx }) => {
  return (
    <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap', p: 0.5, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa', ...sx }}>
      {/* All content in single line with simple structure */}
      <Box sx={{ display: 'inline' }}>
        {/* Header section */}
        {headerFormat.map((item, index) => (
          <RenderPreviewElement 
            key={`header-${index}`} 
            item={item} 
            index={`header-${index}`} 
            drugData={previewDrugs[0]} 
          />
        ))}
        
        {/* Never add line break for horizontal format */}
        <span> </span>
        
        {/* Drugs inline with separators */}
        {previewDrugs.map((drug, drugIndex) => (
          <React.Fragment key={`drug-${drugIndex}`}>
            {/* Add separator between drugs */}
            {drugIndex > 0 && (
              <span>{drugSeparator}</span>
            )}
            
            {/* Drug elements */}
            {drugFormat.map((item, itemIndex) => (
              <RenderPreviewElement 
                key={`drug-${drugIndex}-${itemIndex}`} 
                item={item} 
                index={`drug-${drugIndex}-${itemIndex}`} 
                drugData={drug} 
              />
            ))}
          </React.Fragment>
        ))}
      </Box>
    </Typography>
  );
};

// Combined preview component
const FormatPreview = ({ 
  headerFormat, 
  drugFormat, 
  drugSeparator,
  formatType = 'customVertical', // Add formatType prop with default value
  onFormatTypeChange // Add new prop for handling format type changes
}) => {
  // Validate section assignments for debug purposes
  useEffect(() => {
    // Validate all header elements have the correct section
    headerFormat.forEach(item => {
      if (item.section !== ELEMENT_SECTIONS.HEADER && item.section !== ELEMENT_SECTIONS.BOTH) {
        console.warn(`Header format contains element with incorrect section: ${item.id}`, item);
      }
    });
    
    // Validate all drug elements have the correct section
    drugFormat.forEach(item => {
      if (item.section !== ELEMENT_SECTIONS.DRUG && item.section !== ELEMENT_SECTIONS.BOTH) {
        console.warn(`Drug format contains element with incorrect section: ${item.id}`, item);
      }
    });
  }, [headerFormat, drugFormat]);
  
  // Check for proper bracket formatting
  const hasBracketOpen = headerFormat.some(item => {
    const baseId = item.id.split('_')[0];
    const isText = baseId === 'text' || (baseId === 'header' && item.id.includes('_text'));
    return isText && item.value === '[';
  });
  
  const hasBracketClose = headerFormat.some(item => {
    const baseId = item.id.split('_')[0];
    const isText = baseId === 'text' || (baseId === 'header' && item.id.includes('_text'));
    return isText && item.value === ']';
  });
  
  // 使用 Map 來處理格式型別與選擇狀態，提高可讀性和可擴展性 #zh-TW
  const formatTypesMap = new Map([
    ['customVertical', {
      name: '垂直排列',
      isSelected: formatType === 'customVertical',
      handler: () => onFormatTypeChange && onFormatTypeChange('customVertical')
    }],
    ['customHorizontal', {
      name: '水平排列',
      isSelected: formatType === 'customHorizontal',
      handler: () => onFormatTypeChange && onFormatTypeChange('customHorizontal')
    }]
  ]);
  
  // 從 Map 取得所需的格式型別數據 #zh-TW
  const verticalFormat = formatTypesMap.get('customVertical');
  const horizontalFormat = formatTypesMap.get('customHorizontal');
  
  return (
    <Box sx={{ mb: 0 }}>
      {/* Title moved to parent component to avoid duplication */}
      <Grid container spacing={1}>
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
              drugFormat={drugFormat}
              sx={{
                border: 'none',
                p: 0.5,
                backgroundColor: '#fafafa'
              }}
            />
          </Box>
        </Grid>
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
              drugFormat={drugFormat} 
              drugSeparator={drugSeparator}
              sx={{
                border: 'none',
                p: 0.5,
                backgroundColor: '#fafafa'
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FormatPreview; 