import React from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Paper, 
  TextField, 
  Button, 
  FormGroup,
  FormControlLabel,
  Checkbox,
  List, 
  ListItem,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  Divider
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { elementGroups, colorSettings, ELEMENT_SECTIONS } from './formatEditorConfig';

// Component for displaying format elements
const FormatElementsPanel = ({
  title,
  elements,
  formatClass,
  availableElements,
  customTextValue,
  setCustomTextValue,
  onAddItem,
  onRemoveItem,
  onAddCustomText,
  onAddPresetGroup,
  presetButtonText,
  dragHandlers,
  formatType,
  drugSeparator,
  setDrugSeparator,
  currentFormatType
}) => {
  // Add separate state for header and drug text inputs
  const [localTextValue, setLocalTextValue] = React.useState('');
  
  // Update local state when parent state changes
  React.useEffect(() => {
    setLocalTextValue(''); // Reset on format type change
  }, [formatType]);
  
  // Handler for local text changes that doesn't update parent state directly
  const handleTextChange = (e) => {
    const newValue = e.target.value;
    setLocalTextValue(newValue);
  };
  
  // Handle custom text addition with format-specific context
  const handleAddCustomText = () => {
    if (localTextValue.trim()) {
      // Pass the local text value to the correct handler
      onAddCustomText(localTextValue);
      // Clear the local input after adding
      setLocalTextValue('');
    }
  };
  
  // Check if horizontal format is selected
  const isHorizontalFormat = currentFormatType === 'customHorizontal';
  
  // Generate drug separator settings section (only for drug format)
  const renderDrugSeparatorSettings = () => {
    if (formatType === 'drug' && setDrugSeparator) {
      return (
        <Box 
          sx={{ 
            mt: 2, 
            mb: 2,
            p: 1,
            borderRadius: 1,
            border: '1px solid',
            borderColor: isHorizontalFormat ? 'primary.main' : 'divider',
            bgcolor: isHorizontalFormat ? 'rgba(25, 118, 210, 0.05)' : 'transparent'
          }}
        >
          <Typography 
            variant="subtitle2" 
            sx={{ 
              mb: 1, 
              fontWeight: isHorizontalFormat ? 'bold' : 'normal',
              color: isHorizontalFormat ? 'primary.main' : 'text.primary'
            }}
          >
            藥物分隔符設定 {isHorizontalFormat && '(橫式格式使用)'}
          </Typography>
          
          <TextField
            fullWidth
            size="small"
            label="藥物間分隔符號"
            value={drugSeparator}
            onChange={(e) => setDrugSeparator(e.target.value)}
            helperText={isHorizontalFormat ? "在橫式格式中，此分隔符號將用於分隔藥物" : "僅用於橫式格式"}
            FormHelperTextProps={{
              sx: { color: isHorizontalFormat ? 'primary.main' : 'text.secondary' }
            }}
            sx={{
              bgcolor: 'background.paper',
              '& .MuiOutlinedInput-root': {
                borderColor: isHorizontalFormat ? 'primary.main' : 'inherit'
              }
            }}
          />
        </Box>
      );
    }
    return null;
  };

  // Determine element's group color
  const getElementGroupColor = (item, intensity = 'color') => {
    // 從ID獲取基本ID部分
    const baseId = item.id.split('_')[0];
    
    // Handle section-specific elements
    let groupKey = item.group || 'format';
    
    // For section-specific elements, extract the actual element type
    if (baseId === 'header' || baseId === 'drug') {
      const parts = item.id.split('_');
      if (parts.length > 1 && parts[1] === 'text' || parts[1] === 'space') {
        groupKey = 'format';
      }
    }
    
    // 使用 Map 數據結構代替 switch-case 語句 #zh-TW
    const colorIntensityMap = new Map([
      ['lightColor', elementGroups[groupKey]?.lightColor || '#f5f5f550'],
      ['mediumColor', elementGroups[groupKey]?.mediumColor || '#f5f5f580'],
      ['color', elementGroups[groupKey]?.color || '#f5f5f5']
    ]);
    
    // 返回對應強度的顏色，如果找不到則使用默認的 color 值 #zh-TW
    return colorIntensityMap.get(intensity) || colorIntensityMap.get('color');
  };

  // Filter elements by group and section
  const groupedElements = {};
  
  // Group available elements
  availableElements.forEach(elem => {
    const group = elem.group;
    if (!groupedElements[group]) {
      groupedElements[group] = [];
    }
    
    // Only add elements that belong to the current format type's section
    const elemSection = elem.section || (formatType === 'header' ? ELEMENT_SECTIONS.HEADER : ELEMENT_SECTIONS.DRUG);
    const isCorrectSection = formatType === 'header' 
      ? elemSection === ELEMENT_SECTIONS.HEADER || elemSection === ELEMENT_SECTIONS.BOTH
      : elemSection === ELEMENT_SECTIONS.DRUG || elemSection === ELEMENT_SECTIONS.BOTH;
    
    if (isCorrectSection) {
      groupedElements[group].push(elem);
    }
  });
  
  // Create an ElementButton component for consistency
  const ElementButton = ({ item }) => {
    // Add the item with the appropriate section
    const handleAddItem = () => {
      let itemToAdd = { ...item };
      
      // Ensure the section property is set correctly
      if (!itemToAdd.section) {
        itemToAdd.section = formatType === 'header' ? ELEMENT_SECTIONS.HEADER : ELEMENT_SECTIONS.DRUG;
      }
      
      // Fix any section prefix in ID if needed
      const baseId = itemToAdd.id.split('_')[0];
      if (baseId === 'space' || baseId === 'text') {
        // Add section prefix to ID if not already there
        if (formatType === 'header' && baseId === itemToAdd.id) {
          itemToAdd.id = 'header_' + itemToAdd.id;
        } else if (formatType === 'drug' && baseId === itemToAdd.id) {
          itemToAdd.id = 'drug_' + itemToAdd.id;
        }
        
        // For format group elements, make sure the value is set
        if (itemToAdd.group === 'format') {
          // Ensure value is preserved or set as needed
          if (baseId === 'space' && !itemToAdd.value) {
            itemToAdd.value = ' ';
          } else if (baseId === 'text' && !itemToAdd.value) {
            itemToAdd.value = itemToAdd.display;
          }
        }
      }
      
      onAddItem(itemToAdd);
    };
    
    return (
      <Button
        fullWidth
        size="small"
        variant="text"
        startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
        onClick={handleAddItem}
        sx={{
          justifyContent: 'flex-start',
          color: 'text.primary',
          fontSize: '0.75rem',
          py: 0.3,
          minHeight: '24px',
          textTransform: 'none'
        }}
      >
        {item.display}
      </Button>
    );
  };

  // Generate header elements in specific order
  const renderHeaderElements = () => {
    // 使用 Map 來優化元素查找而非多個 if 條件 #zh-TW
    const findElement = (id, group) => {
      // For header-specific elements, check for both regular and prefixed versions
      return groupedElements[group]?.find(item => 
        item.id === id || 
        item.id === 'header_' + id || 
        (item.id.startsWith(id) && item.section === ELEMENT_SECTIONS.HEADER)
      );
    };
    
    // 使用 Map 儲存所有需要查找的元素，提高代碼可讀性 #zh-TW
    const elementsMap = new Map([
      ['dateElement', findElement('date', 'header')],
      ['hospElement', findElement('hosp', 'header')],
      ['icdCodeElement', findElement('icdcode', 'header')],
      ['icdNameElement', findElement('icdname', 'header')],
      ['spaceElement', findElement('space', 'format') || findElement('header_space', 'format')],
      ['textElement', findElement('text', 'format') || findElement('header_text', 'format')]
    ]);
    
    const dateElement = elementsMap.get('dateElement');
    const hospElement = elementsMap.get('hospElement');
    const icdCodeElement = elementsMap.get('icdCodeElement');
    const icdNameElement = elementsMap.get('icdNameElement');
    const spaceElement = elementsMap.get('spaceElement');
    const textElement = elementsMap.get('textElement');
    
    return (
      <>
        {/* Row 1: Date and ICD Code */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
          {dateElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <ElementButton item={dateElement} />
            </Box>
          )}
          {icdCodeElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <ElementButton item={icdCodeElement} />
            </Box>
          )}
        </Box>
        
        {/* Row 2: Hospital and ICD Name */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
          {hospElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <ElementButton item={hospElement} />
            </Box>
          )}
          {icdNameElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <ElementButton item={icdNameElement} />
            </Box>
          )}
        </Box>
        
        {/* Row 3: Space and text input together */}
        <Box sx={{ display: 'flex', flexDirection: 'column', mb: 0 }}>
          {/* Space button */}
          {spaceElement && (
            <Box sx={{ 
              mb: 0.5, 
              bgcolor: elementGroups.format.mediumColor, 
              borderRadius: 1, 
              border: '1px solid', 
              borderColor: 'divider' 
            }}>
              <ElementButton item={spaceElement} />
            </Box>
          )}
          
          {/* Text input directly below space */}
          <TextField
            size="small"
            placeholder="輸入標題文字"
            value={localTextValue}
            onChange={handleTextChange}
            sx={{ 
              fontSize: '0.8rem',
              height: '28px',
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fff',
                height: '28px',
                '& input': {
                  padding: '2px 8px'
                }
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleAddCustomText}
                    disabled={!localTextValue.trim()}
                    sx={{ color: colorSettings.addButtonColor, padding: '1px' }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>
      </>
    );
  };

  // Generate drug elements in specific order
  const renderDrugElements = () => {
    // 使用 Map 來優化元素查找而非多個 if 條件 #zh-TW
    const findElement = (id, group) => {
      // For drug-specific elements, check for both regular and prefixed versions
      return groupedElements[group]?.find(item => 
        item.id === id || 
        item.id === 'drug_' + id || 
        (item.id.startsWith(id) && item.section === ELEMENT_SECTIONS.DRUG)
      );
    };
    
    // 使用 Map 儲存所有需要查找的元素，提高代碼可讀性和維護性 #zh-TW
    const elementsMap = new Map([
      ['nameElement', findElement('name', 'medication')],
      ['simplifiedNameElement', findElement('simplifiedname', 'medication')],
      ['ingredientElement', findElement('ingredient', 'medication')],
      ['perDosageElement', findElement('perDosage', 'dosage')],
      ['frequencyElement', findElement('frequency', 'dosage')],
      ['daysElement', findElement('days', 'dosage')],
      ['spaceElement', findElement('space', 'format') || findElement('drug_space', 'format')]
    ]);
    
    const nameElement = elementsMap.get('nameElement');
    const simplifiedNameElement = elementsMap.get('simplifiedNameElement');
    const ingredientElement = elementsMap.get('ingredientElement');
    const perDosageElement = elementsMap.get('perDosageElement');
    const frequencyElement = elementsMap.get('frequencyElement');
    const daysElement = elementsMap.get('daysElement');
    const spaceElement = elementsMap.get('spaceElement');
    
    return (
      <>
        {/* Row 1: Name and PerDosage */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
          {nameElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.medication.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <ElementButton item={nameElement} />
            </Box>
          )}
          {perDosageElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.dosage.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <ElementButton item={perDosageElement} />
            </Box>
          )}
        </Box>
        
        {/* Row 2: Simplified Name and Frequency */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
          {simplifiedNameElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.medication.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <ElementButton item={simplifiedNameElement} />
            </Box>
          )}
          {frequencyElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.dosage.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <ElementButton item={frequencyElement} />
            </Box>
          )}
        </Box>
        
        {/* Row 3: Ingredient and Days */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
          {ingredientElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.medication.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <ElementButton item={ingredientElement} />
            </Box>
          )}
          {daysElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.dosage.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <ElementButton item={daysElement} />
            </Box>
          )}
        </Box>
        
        {/* Row 4: Space and text input (removed newline) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', mb: 0 }}>
          {/* Space element only - removed newline */}
          <Box sx={{ mb: 0.5 }}>
            {spaceElement && (
              <Box sx={{ 
                width: '100%',
                bgcolor: elementGroups.format.mediumColor, 
                borderRadius: 1, 
                border: '1px solid', 
                borderColor: 'divider' 
              }}>
                <ElementButton item={spaceElement} />
              </Box>
            )}
          </Box>
          
          {/* Text input below space element */}
          <TextField
            size="small"
            placeholder="輸入藥物文字"
            value={localTextValue}
            onChange={handleTextChange}
            sx={{ 
              fontSize: '0.8rem',
              height: '28px',
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fff',
                height: '28px',
                '& input': {
                  padding: '2px 8px'
                }
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleAddCustomText}
                    disabled={!localTextValue.trim()}
                    sx={{ color: colorSettings.addButtonColor, padding: '1px' }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>
      </>
    );
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', m: 0 }}>{title}</Typography>
          
          {/* Drug separator inline with title for drug format */}
          {formatType === 'drug' && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  mr: 1,
                  fontWeight: isHorizontalFormat ? 'medium' : 'normal',
                  color: isHorizontalFormat ? 'primary.main' : 'text.secondary'
                }}
              >
                藥物分隔符:
              </Typography>
              <TextField
                size="small"
                value={drugSeparator}
                onChange={(e) => setDrugSeparator(e.target.value)}
                sx={{ 
                  width: '80px',
                  '& .MuiInputBase-root': {
                    height: '30px',
                    fontSize: '0.8rem'
                  },
                  ...(isHorizontalFormat ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: 'primary.main',
                    }
                  } : {})
                }}
              />
              {isHorizontalFormat && (
                <Typography 
                  variant="caption" 
                  sx={{ ml: 1, color: 'primary.main', fontSize: '0.7rem' }}
                >
                  (橫式使用)
                </Typography>
              )}
            </Box>
          )}
        </Box>
        
        {/* Two-column layout for both header and drug format */}
        <Grid container spacing={1}>
          {/* Left side - Elements List (75%) */}
          <Grid item xs={12} md={9}>
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                minHeight: formatType === 'drug' ? '180px' : '150px',
                maxHeight: formatType === 'drug' ? '180px' : '150px',
                bgcolor: 'background.default',
                borderRadius: 1,
                overflowX: 'auto'
              }}
            >
              {elements.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                  尚未設定任何元素，請從右方選擇元素加入
                </Typography>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 1,
                  [`& > .${formatClass}`]: {
                    flex: '0 0 auto',
                    minWidth: '80px',
                    maxWidth: '150px'
                  },
                  '& > .newline-item': {
                    flexBasis: '100%',
                    height: 0
                  }
                }}>
                  {elements.map((item, index) => {
                    const baseId = item.id.split('_')[0];
                    const isNewline = baseId === 'newline' || 
                                     (baseId === 'drug' && item.id.split('_')[1] === 'newline');
                    
                    if (isNewline) {
                      return (
                        <Box 
                          key={index}
                          className={`newline-item ${formatClass}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 0.75,
                            border: '1px dashed',
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: getElementGroupColor(item, 'color'),
                            position: 'relative',
                            cursor: 'move',
                            width: '100%',
                            maxWidth: '100% !important',
                            mb: 0.5,
                            '&:after': {
                              content: '"↵"',
                              position: 'absolute',
                              right: 50,
                              color: 'text.secondary',
                              fontSize: '1.2rem'
                            },
                            '&:hover': {
                              boxShadow: 1,
                              bgcolor: getElementGroupColor(item, 'mediumColor')
                            },
                          }}
                          draggable
                          onDragStart={(e) => dragHandlers.handleDragStart(e, index)}
                          onDragEnter={(e) => dragHandlers.handleDragEnter(e, index)}
                          onDragOver={dragHandlers.handleDragOver}
                          onDragLeave={(e) => dragHandlers.handleDragLeave(e, index)}
                          onDrop={dragHandlers.handleDrop}
                          onDragEnd={dragHandlers.handleDragEnd}
                        >
                          <DragIndicatorIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                          <Typography
                            variant="body2"
                            sx={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {item.display}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveItem(index);
                            }}
                            sx={{ p: 0.25 }}
                          >
                            <DeleteIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </Box>
                      );
                    }
                    
                    return (
                      <Box
                        key={index}
                        className={formatClass}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          p: 0.75,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: getElementGroupColor(item, 'color'),
                          position: 'relative',
                          cursor: 'move',
                          '&:hover': {
                            boxShadow: 1,
                            bgcolor: getElementGroupColor(item, 'mediumColor')
                          },
                        }}
                        draggable
                        onDragStart={(e) => dragHandlers.handleDragStart(e, index)}
                        onDragEnter={(e) => dragHandlers.handleDragEnter(e, index)}
                        onDragOver={dragHandlers.handleDragOver}
                        onDragLeave={(e) => dragHandlers.handleDragLeave(e, index)}
                        onDrop={dragHandlers.handleDrop}
                        onDragEnd={dragHandlers.handleDragEnd}
                      >
                        <DragIndicatorIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                        <Typography
                          variant="body2"
                          sx={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.display}
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveItem(index);
                          }}
                          sx={{ p: 0.25 }}
                        >
                          <DeleteIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Right side - Available Elements (25%) */}
          <Grid item xs={12} md={3}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 0.25, 
                height: 'auto',
                minHeight: formatType === 'drug' ? '180px' : '150px', // Increased height for drug format
                maxHeight: formatType === 'drug' ? '180px' : '150px', // Increased height for drug format
                bgcolor: formatType === 'header' ? elementGroups.header.lightColor : elementGroups.medication.lightColor,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  bgcolor: formatType === 'header' ? elementGroups.header.color : elementGroups.medication.color,
                  px: 0.5,
                  py: 0.2,
                  borderRadius: 1,
                  display: 'block',
                  textAlign: 'center',
                  mb: 0.2,
                  fontSize: '0.7rem',
                  lineHeight: 1.2
                }}
              >
                可用元素
              </Typography>
              
              {/* Elements in specific layout */}
              <Box sx={{ 
                flex: 1, 
                overflow: 'hidden', 
                overflowY: 'auto',
                px: 0.25, 
                pb: 0, 
                pt: 0,
                mt: 0
              }}>
                {formatType === 'header' ? renderHeaderElements() : renderDrugElements()}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default FormatElementsPanel;