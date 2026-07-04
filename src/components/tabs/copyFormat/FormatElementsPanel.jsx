import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Button,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  GlobalStyles
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

// 拖曳視覺回饋樣式(階段5 Task 6 補上)—— dragDropHandlers.js 用 classList 切換
// `dragging` / `drag-over` 這兩個 class，但 repo 內原本沒有任何對應的 CSS 規則
// (舊 medicationCopyFormat 用 inline style 達成同樣效果；舊 labCopyFormat 雖然也用了
// 這兩個 class，但同樣缺對應樣式，該互動本來就是壞的)。數值對齊舊 medication 版本：
// opacity 0.6、藍色(#1976d2)上邊框 2px。用 <GlobalStyles> 注入，並限定在
// #nhi-floating-root 容器內，避免污染到 NHI 原生頁面的同名 class。
const dragDropGlobalStyles = {
  '#nhi-floating-root .dragging': { opacity: 0.6 },
  '#nhi-floating-root .drag-over': { borderTop: '2px solid #1976d2' }
};

// 通用格式元素面板(階段5 Task 5) —— 由 medicationCopyFormat/FormatElementsPanel.jsx 與
// labCopyFormat/FormatElementsPanel.jsx 合併而來。
//
// 行為取捨 1(已放入格式清單的元素卡片渲染)：medication 版本把 newline / 一般元素的 JSX
// 各寫一份、直接內嵌在主元件 return 裡；lab 版本拆成獨立的 `FormatElement` 子元件，
// 且 drag handler 呼叫都加了 optional chaining(`handleDragStart?.(e, index)`)較不易因
// dragHandlers 未提供而炸掉。採用 lab 的拆分寫法(更精簡、更安全)。
//
// 行為取捨 2(分隔符欄位何時顯示)：medication 版本只要 formatType 是 item 區塊且有
// setSeparator 就一律顯示分隔符欄位；lab 版本只在「水平排列」時才顯示。
// 兩邊都保留，改為 config.separatorVisibility: 'always' | 'horizontalOnly' 開關，
// 不預設偏向任一邊，由呼叫端 config 決定。
//
// 行為取捨 3(右側「可用元素」清單版面)：medication 與 lab 的版面配置(哪些元素放同一列、
// ICD 代碼/名稱特殊處理、檢驗值/參考值排列等)彼此不同且都是各自資料模型專屬的排版，
// 無法無損泛化成同一份通用排版。因此改為 config.renderAvailableElements(...) render function
// 注入點 —— 本次(Task 5)不建立 medicationConfig/labConfig，故本檔僅提供一份「通用但非
// 像素級還原」的 fallback 排版(GenericAvailableElementsList)，確保元件在沒有專屬 render
// function 時仍可運作；Task 6 建立 config 時應各自提供 renderAvailableElements 以完整還原
// 原本排版與行為(不可省略，否則會改變既有 UI)。

const FormatElement = ({
  item,
  elementGroups,
  index,
  onRemove,
  formatClass,
  dragHandlers = {}
}) => {
  const getBgColor = (group) => elementGroups[group]?.lightColor || elementGroups.format.lightColor;

  const {
    handleDragStart,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = dragHandlers;

  const isNewline = item.id.includes('newline');

  return (
    <Box
      className={isNewline ? `newline-item ${formatClass}` : formatClass}
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 0.75,
        border: isNewline ? '1px dashed' : '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: getBgColor(item.group),
        position: 'relative',
        cursor: 'move',
        ...(isNewline ? {
          width: '100%',
          maxWidth: '100% !important',
          mb: 0.5,
          '&:after': {
            content: '"↵"',
            position: 'absolute',
            right: 50,
            color: 'text.secondary',
            fontSize: '1.2rem'
          }
        } : {}),
        '&:hover': {
          boxShadow: 1,
          bgcolor: `${getBgColor(item.group)}e0`
        }
      }}
      draggable
      onDragStart={(e) => handleDragStart?.(e, index)}
      onDragEnter={(e) => handleDragEnter?.(e, index)}
      onDragOver={(e) => handleDragOver?.(e)}
      onDragLeave={(e) => handleDragLeave?.(e, index)}
      onDrop={(e) => handleDrop?.(e)}
      onDragEnd={(e) => handleDragEnd?.(e)}
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
        {isNewline ? item.display : (item.value !== undefined ? item.value : item.display)}
      </Typography>
      <IconButton size="small" onClick={() => onRemove(index)} sx={{ p: 0.25 }}>
        <DeleteIcon sx={{ fontSize: '1rem' }} />
      </IconButton>
    </Box>
  );
};

// Fallback 排版：只在 config 未提供 renderAvailableElements 時使用，見上方「行為取捨 3」。
const GenericAvailableElementsList = ({
  availableElements,
  elementGroups,
  onAddItem,
  localTextValue,
  setLocalTextValue,
  onAddCustomText,
  colorSettings,
  textPlaceholder
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    {availableElements
      .filter(el => el.group !== 'format' || el.id.includes('sep'))
      .map((el, idx) => (
        <Box
          key={`${el.id}-${idx}`}
          sx={{
            bgcolor: elementGroups[el.group]?.lightColor || elementGroups.format.lightColor,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Button
            fullWidth
            size="small"
            variant="text"
            startIcon={<AddIcon sx={{ fontSize: '0.8rem' }} />}
            onClick={() => onAddItem(el)}
            sx={{
              justifyContent: 'flex-start',
              color: 'text.primary',
              fontSize: '0.75rem',
              py: 0.3,
              minHeight: '24px',
              textTransform: 'none'
            }}
          >
            {el.display}
          </Button>
        </Box>
      ))}

    <TextField
      size="small"
      placeholder={textPlaceholder}
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
              onClick={onAddCustomText}
              disabled={!localTextValue.trim()}
              sx={{ color: colorSettings?.addButtonColor || 'secondary.main', padding: '1px' }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        )
      }}
    />
  </Box>
);

const FormatElementsPanel = ({
  title,
  elements,
  formatClass,
  availableElements,
  onAddItem,
  onRemoveItem,
  onAddCustomText,
  onAddPresetGroup,
  formatType, // 'header' | 'item'
  currentFormatType, // 'customVertical' | 'customHorizontal'
  separator,
  setSeparator,
  dragHandlers,
  config
}) => {
  const {
    elementGroups,
    colorSettings,
    labels = {},
    separatorVisibility = 'always',
    itemGroupKey,
    renderAvailableElements
  } = config;

  const [localTextValue, setLocalTextValue] = useState('');

  const isHorizontalFormat = currentFormatType === 'customHorizontal';
  const isItemFormat = formatType === 'item';

  const handleAddCustomText = () => {
    if (localTextValue.trim()) {
      onAddCustomText(localTextValue);
      setLocalTextValue('');
    }
  };

  const showSeparatorField = isItemFormat && !!setSeparator && (
    separatorVisibility === 'always' || (separatorVisibility === 'horizontalOnly' && isHorizontalFormat)
  );

  const availablePanelBgColor = formatType === 'header'
    ? elementGroups.header.lightColor
    : elementGroups[itemGroupKey]?.lightColor;
  const availablePanelHeaderColor = formatType === 'header'
    ? elementGroups.header.color
    : elementGroups[itemGroupKey]?.color;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <GlobalStyles styles={dragDropGlobalStyles} />
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', m: 0 }}>{title}</Typography>

          {showSeparatorField && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant="body2"
                sx={{
                  mr: 1,
                  fontWeight: isHorizontalFormat ? 'medium' : 'normal',
                  color: isHorizontalFormat ? 'primary.main' : 'text.secondary'
                }}
              >
                {labels.separatorLabel || '分隔符:'}
              </Typography>
              <TextField
                size="small"
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                sx={{
                  width: '80px',
                  '& .MuiInputBase-root': {
                    height: '30px',
                    fontSize: '0.8rem'
                  },
                  ...(isHorizontalFormat ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: 'primary.main'
                    }
                  } : {})
                }}
              />
              {isHorizontalFormat && (
                <Typography variant="caption" sx={{ ml: 1, color: 'primary.main', fontSize: '0.7rem' }}>
                  (橫式使用)
                </Typography>
              )}
            </Box>
          )}

          {formatType === 'header' && onAddPresetGroup && labels.presetButtonText && (
            <Button size="small" variant="outlined" color="primary" onClick={onAddPresetGroup}>
              {labels.presetButtonText}
            </Button>
          )}
        </Box>

        <Grid container spacing={1}>
          {/* Left side - Elements List (75%) */}
          <Grid item xs={12} md={9}>
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                minHeight: isItemFormat ? '180px' : '150px',
                maxHeight: isItemFormat ? '180px' : '150px',
                bgcolor: 'background.default',
                borderRadius: 1,
                overflowX: 'auto'
              }}
            >
              {elements.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                  {labels.noElementsText || '尚未設定任何元素，請從右方選擇元素加入'}
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
                      elementGroups={elementGroups}
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
                minHeight: isItemFormat ? '180px' : '150px',
                maxHeight: isItemFormat ? '180px' : '150px',
                bgcolor: availablePanelBgColor,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  bgcolor: availablePanelHeaderColor,
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
                {labels.availableElementsLabel || '可用元素'}
              </Typography>

              <Box sx={{
                flex: 1,
                overflow: 'hidden',
                overflowY: 'auto',
                px: 0.25,
                pb: 0,
                pt: 0,
                mt: 0
              }}>
                {typeof renderAvailableElements === 'function' ? renderAvailableElements({
                  formatType,
                  availableElements,
                  onAddItem,
                  localTextValue,
                  setLocalTextValue,
                  onAddCustomText: handleAddCustomText
                }) : (
                  <GenericAvailableElementsList
                    availableElements={availableElements}
                    elementGroups={elementGroups}
                    onAddItem={onAddItem}
                    localTextValue={localTextValue}
                    setLocalTextValue={setLocalTextValue}
                    onAddCustomText={handleAddCustomText}
                    colorSettings={colorSettings}
                    textPlaceholder={
                      isItemFormat
                        ? (labels.itemTextPlaceholder || '輸入文字')
                        : (labels.headerTextPlaceholder || '輸入文字')
                    }
                  />
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default FormatElementsPanel;
