import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  TextField,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SortIcon from '@mui/icons-material/Sort';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import TextFormatIcon from '@mui/icons-material/TextFormat';
import { elementGroups, ELEMENT_SECTIONS } from './formatEditorConfig';

// Format element component
const FormatElement = ({ 
  item, 
  index, 
  onRemove, 
  formatClass,
  dragHandlers = {}
}) => {
  // Function to get background color based on element group
  const getBgColor = (group) => {
    return elementGroups[group]?.lightColor || elementGroups.format.lightColor;
  };

  // Destructure drag handlers for cleaner code
  const { 
    handleDragStart, 
    handleDragEnter, 
    handleDragOver, 
    handleDragLeave, 
    handleDrop, 
    handleDragEnd 
  } = dragHandlers;

  const isNewline = item.id.includes('newline');

  // Use specific styling for newline elements
  if (isNewline) {
    return (
      <Box 
        className={`newline-item ${formatClass}`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 0.75,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: getBgColor(item.group),
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
            bgcolor: `${getBgColor(item.group)}e0`
          },
        }}
        draggable
        onDragStart={(e) => handleDragStart(e, index)}
        onDragEnter={(e) => handleDragEnter(e, index)}
        onDragOver={handleDragOver}
        onDragLeave={(e) => handleDragLeave(e, index)}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
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
          onClick={() => onRemove(index)}
          sx={{ p: 0.25 }}
        >
          <DeleteIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>
    );
  }

  // Regular elements
  return (
    <Box
      className={formatClass}
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 0.75,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: getBgColor(item.group),
        position: 'relative',
        cursor: 'move',
        '&:hover': {
          boxShadow: 1,
          bgcolor: `${getBgColor(item.group)}e0`,
        }
      }}
      draggable={true}
      onDragStart={(e) => handleDragStart && handleDragStart(e, index)}
      onDragEnter={(e) => handleDragEnter && handleDragEnter(e, index)}
      onDragOver={(e) => handleDragOver && handleDragOver(e)}
      onDragLeave={(e) => handleDragLeave && handleDragLeave(e, index)}
      onDrop={(e) => handleDrop && handleDrop(e)}
      onDragEnd={(e) => handleDragEnd && handleDragEnd(e)}
    >
      <DragIndicatorIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.value !== undefined ? item.value : item.display}
      </Typography>
      <IconButton 
        size="small" 
        onClick={() => onRemove(index)}
        sx={{ p: 0.25 }}
      >
        <DeleteIcon sx={{ fontSize: '1rem' }} />
      </IconButton>
    </Box>
  );
};

// Format elements panel component
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
  formatType,
  currentFormatType,
  itemSeparator,
  setItemSeparator,
  dragHandlers
}) => {
  // 狀態管理
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [tempCustomText, setTempCustomText] = useState('');
  const [separatorDialogOpen, setSeparatorDialogOpen] = useState(false);
  const [tempSeparator, setTempSeparator] = useState(itemSeparator || ', ');
  // Add local text value for input field
  const [localTextValue, setLocalTextValue] = useState('');
  
  const isHorizontalFormat = currentFormatType === 'customHorizontal';
  
  // Get the element section based on format type
  const getElementSection = () => {
    return formatType === 'header' ? ELEMENT_SECTIONS.LABHEADER : ELEMENT_SECTIONS.LABCONTENT;
  };

  // 函式處理器
  const handleCloseTextDialog = () => {
    setTextDialogOpen(false);
  };

  const handleAddCustomText = () => {
    if (localTextValue.trim()) {
      onAddCustomText(localTextValue);
      setLocalTextValue('');
    }
  };

  const handleOpenSeparatorDialog = () => {
    console.log(`FormatElementsPanel: Opening separator dialog. Current separator: "${itemSeparator || ', '}"`);
    setTempSeparator(itemSeparator || ', ');
    setSeparatorDialogOpen(true);
  };

  const handleCloseSeparatorDialog = () => {
    setSeparatorDialogOpen(false);
  };

  const handleSaveSeparator = () => {
    if (setItemSeparator) {
      console.log(`FormatElementsPanel: Updating itemSeparator from "${itemSeparator}" to "${tempSeparator}"`);
      
      // Ensure we're passing a string and use a default if empty
      const sanitizedSeparator = String(tempSeparator || ', ');
      
      // Ensure the separator is visible in logs by showing escaped characters
      const loggableSeparator = sanitizedSeparator
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      
      console.log(`FormatElementsPanel: Final sanitized separator: "${loggableSeparator}" (${typeof sanitizedSeparator})`);
      
      // Call the setter function
      setItemSeparator(sanitizedSeparator);
      
      // Verify the value was updated in the local state
      setTimeout(() => {
        console.log(`FormatElementsPanel: After update, itemSeparator is now: "${itemSeparator}"`);
      }, 0);
      
      // Close the dialog after saving
      setSeparatorDialogOpen(false);
    } else {
      console.warn("FormatElementsPanel: setItemSeparator function is not available");
      setSeparatorDialogOpen(false);
    }
  };

  // Generate header elements in specific order
  const renderHeaderElements = () => {
    // Find element by ID and section
    const findElement = (id, group) => {
      return availableElements.find(item => 
        (item.id === id || item.id === 'header_' + id) && 
        item.section === ELEMENT_SECTIONS.LABHEADER
      );
    };
    
    const dateElement = findElement('date', 'header');
    const hospElement = findElement('hosp', 'header');
    const spaceElement = findElement('space', 'format') || findElement('header_space', 'format');
    const textElement = findElement('text', 'format') || findElement('header_text', 'format');

    // Function to add an element to the format
    const addElement = (item) => {
      if (item) {
        let itemToAdd = {...item};
        // Ensure section is correct
        if (!itemToAdd.section) {
          itemToAdd.section = ELEMENT_SECTIONS.LABHEADER;
        }
        onAddItem(itemToAdd);
      }
    };
    
    return (
      <>
        {/* Row 1: Date and Hospital */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
          {dateElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Button
                fullWidth
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
                onClick={() => addElement(dateElement)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.primary',
                  fontSize: '0.75rem',
                  py: 0.3,
                  minHeight: '24px',
                  textTransform: 'none'
                }}
              >
                {dateElement.display}
              </Button>
            </Box>
          )}
          {hospElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.header.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Button
                fullWidth
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
                onClick={() => addElement(hospElement)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.primary',
                  fontSize: '0.75rem',
                  py: 0.3,
                  minHeight: '24px',
                  textTransform: 'none'
                }}
              >
                {hospElement.display}
              </Button>
            </Box>
          )}
        </Box>
        
        {/* Space element */}
        {spaceElement && (
          <Box sx={{ 
            mb: 0.5, 
            bgcolor: elementGroups.format.mediumColor, 
            borderRadius: 1, 
            border: '1px solid', 
            borderColor: 'divider' 
          }}>
            <Button
              fullWidth
              size="small"
              variant="text"
              startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
              onClick={() => addElement(spaceElement)}
              sx={{
                justifyContent: 'flex-start',
                color: 'text.primary',
                fontSize: '0.75rem',
                py: 0.3,
                minHeight: '24px',
                textTransform: 'none'
              }}
            >
              {spaceElement.display}
            </Button>
          </Box>
        )}
        
        {/* Text input field */}
        <TextField
          size="small"
          placeholder="輸入標題文字"
          value={localTextValue}
          onChange={(e) => setLocalTextValue(e.target.value)}
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
                  sx={{ color: elementGroups.format.color, padding: '1px' }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </>
    );
  };

  // Generate lab elements in specific order
  const renderLabElements = () => {
    // Find element by ID and section
    const findElement = (id, group) => {
      return availableElements.find(item => 
        (item.id === id || item.id === 'lab_' + id) && 
        item.section === ELEMENT_SECTIONS.LABCONTENT
      );
    };
    
    const itemNameElement = findElement('itemName', 'labItem');
    const orderCodeElement = findElement('orderCode', 'labItem');
    const valueElement = findElement('value', 'labValue');
    const unitElement = findElement('unit', 'labValue');
    const consultValueElement = findElement('consultValue', 'labValue');
    const spaceElement = findElement('space', 'format') || findElement('lab_space', 'format');
    
    // Function to add an element to the format
    const addElement = (item) => {
      if (item) {
        let itemToAdd = {...item};
        // Ensure section is correct
        if (!itemToAdd.section) {
          itemToAdd.section = ELEMENT_SECTIONS.LABCONTENT;
        }
        onAddItem(itemToAdd);
      }
    };
    
    return (
      <>
        {/* Row 1: Item Name and Value */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
          {itemNameElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.labItem.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Button
                fullWidth
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
                onClick={() => addElement(itemNameElement)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.primary',
                  fontSize: '0.75rem',
                  py: 0.3,
                  minHeight: '24px',
                  textTransform: 'none'
                }}
              >
                {itemNameElement.display}
              </Button>
            </Box>
          )}
          {valueElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.labValue.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Button
                fullWidth
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
                onClick={() => addElement(valueElement)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.primary',
                  fontSize: '0.75rem',
                  py: 0.3,
                  minHeight: '24px',
                  textTransform: 'none'
                }}
              >
                {valueElement.display}
              </Button>
            </Box>
          )}
        </Box>
        
        {/* Row 2: Order Code and Unit */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
          {orderCodeElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.labItem.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Button
                fullWidth
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
                onClick={() => addElement(orderCodeElement)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.primary',
                  fontSize: '0.75rem',
                  py: 0.3,
                  minHeight: '24px',
                  textTransform: 'none'
                }}
              >
                {orderCodeElement.display}
              </Button>
            </Box>
          )}
          {unitElement && (
            <Box sx={{ flex: 1, bgcolor: elementGroups.labValue.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Button
                fullWidth
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
                onClick={() => addElement(unitElement)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.primary',
                  fontSize: '0.75rem',
                  py: 0.3,
                  minHeight: '24px',
                  textTransform: 'none'
                }}
              >
                {unitElement.display}
              </Button>
            </Box>
          )}
        </Box>
        
        {/* Row 3: Consult Value and Space */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 0.5 }}>
          {consultValueElement && (
            <Box sx={{ bgcolor: elementGroups.labValue.lightColor, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Button
                fullWidth
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
                onClick={() => addElement(consultValueElement)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.primary',
                  fontSize: '0.75rem',
                  py: 0.3,
                  minHeight: '24px',
                  textTransform: 'none'
                }}
              >
                {consultValueElement.display}
              </Button>
            </Box>
          )}
          {spaceElement && (
            <Box sx={{ 
              bgcolor: elementGroups.format.mediumColor, 
              borderRadius: 1, 
              border: '1px solid', 
              borderColor: 'divider' 
            }}>
              <Button
                fullWidth
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
                onClick={() => addElement(spaceElement)}
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.primary',
                  fontSize: '0.75rem',
                  py: 0.3,
                  minHeight: '24px',
                  textTransform: 'none'
                }}
              >
                {spaceElement.display}
              </Button>
            </Box>
          )}
        </Box>
        
        {/* Text input field */}
        <TextField
          size="small"
          placeholder="輸入檢驗項目文字"
          value={localTextValue}
          onChange={(e) => setLocalTextValue(e.target.value)}
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
                  sx={{ color: elementGroups.format.color, padding: '1px' }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </>
    );
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', m: 0 }}>{title}</Typography>
          
          {/* Lab separator settings - only for lab content in horizontal mode */}
          {formatType === 'lab' && currentFormatType === 'customHorizontal' && setItemSeparator && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  mr: 1,
                  fontWeight: isHorizontalFormat ? 'medium' : 'normal',
                  color: isHorizontalFormat ? 'primary.main' : 'text.secondary'
                }}
              >
                檢驗項目分隔字元:
              </Typography>
              <TextField
                size="small"
                value={itemSeparator}
                onChange={(e) => setItemSeparator(e.target.value)}
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
          
          {/* Add preset group button for header format */}
          {formatType === 'header' && onAddPresetGroup && (
            <Button 
              size="small" 
              variant="outlined" 
              color="primary"
              onClick={onAddPresetGroup}
            >
              加入基本日期組合
            </Button>
          )}
        </Box>
        
        <Divider sx={{ mb: 1 }} />
        
        {/* Two-column layout */}
        <Grid container spacing={1}>
          {/* Left side - Elements List (75%) */}
          <Grid item xs={12} md={9}>
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                minHeight: formatType === 'lab' ? '180px' : '150px',
                maxHeight: formatType === 'lab' ? '180px' : '150px',
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
                  {elements.map((item, index) => (
                    <FormatElement
                      key={`${item.id}-${index}`}
                      item={item}
                      index={index}
                      onRemove={onRemoveItem}
                      formatClass={formatClass}
                      dragHandlers={dragHandlers}
                    />
                  ))}
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
                minHeight: formatType === 'lab' ? '180px' : '150px',
                maxHeight: formatType === 'lab' ? '180px' : '150px',
                bgcolor: formatType === 'header' ? elementGroups.header.lightColor : elementGroups.labItem.lightColor,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  bgcolor: formatType === 'header' ? elementGroups.header.color : elementGroups.labItem.color,
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
                {formatType === 'header' ? renderHeaderElements() : renderLabElements()}
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Custom text dialog */}
        <Dialog open={textDialogOpen} onClose={handleCloseTextDialog}>
          <DialogTitle>添加自訂文字</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="文字內容"
              fullWidth
              variant="outlined"
              value={tempCustomText}
              onChange={(e) => setTempCustomText(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTextDialog}>取消</Button>
            <Button onClick={handleAddCustomText} variant="contained">添加</Button>
          </DialogActions>
        </Dialog>
        
        {/* Separator dialog */}
        <Dialog open={separatorDialogOpen} onClose={handleCloseSeparatorDialog}>
          <DialogTitle>設定檢驗項目分隔字元</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="分隔字元"
              fullWidth
              variant="outlined"
              value={tempSeparator}
              onChange={(e) => setTempSeparator(e.target.value)}
              helperText="此分隔字元會在水平格式下用於分隔檢驗項目"
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              常用分隔字元: 逗號加空格 ", " 或是斜線加空格 " / "
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseSeparatorDialog}>取消</Button>
            <Button onClick={handleSaveSeparator} variant="contained">儲存</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default FormatElementsPanel; 