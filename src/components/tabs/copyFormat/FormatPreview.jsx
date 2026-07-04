import React, { useEffect } from 'react';
import { Box, Typography, Grid } from '@mui/material';

// 通用格式預覽元件(階段5 Task 5) —— 由 medicationCopyFormat/FormatPreview.jsx 與
// labCopyFormat/FormatPreview.jsx 合併而來。
//
// 行為取捨 1：medication 版本多包了一層 `RenderPreviewElement`，在呼叫 `renderElem` 之前
// 額外攔截 baseId === 'newline' 並回傳 `<br/>`；lab 版本直接呼叫 `renderElem` 取得字串
// (换行元素會被 renderElem 轉成 '\n' 字元)。由於容器一律有 `whiteSpace: 'pre-wrap'`，
// 純文字 '\n' 與 `<br/>` 視覺效果相同 —— 採用 lab 版本較精簡的直接呼叫寫法，
// 不再需要額外的包裝元件(config.renderElem 已內含所有 icd/section 特殊處理邏輯)。
//
// 行為取捨 2：medication 版本有 useEffect 檢查 header/item 元素的 section 是否正確並
// console.warn；lab 版本沒有。兩邊都保留，改為 config.validateSections 開關(預設 false，
// 避免無主的 console 雜訊；由呼叫端 config 決定是否開啟)。
//
// 行為取捨 3：lab 版本在下方多了兩行說明文字(此為預覽提示 + 目前分隔符/垂直排列提示)，
// medication 版本沒有。兩邊都保留，改為 config.showCaptions 開關(預設 true，對兩種格式
// 都更友善，且不影響任何既有測試或資料流)。

const renderElements = (renderElem, list, itemData, keyPrefix) => list.map((item, index) => (
  <React.Fragment key={`${keyPrefix}-${index}`}>
    {renderElem(item, index, itemData)}
  </React.Fragment>
));

// Vertical (stacked) preview format
const VerticalPreview = ({ headerFormat, itemFormat, renderElem, previewHeaderData, previewItemsData, sx }) => (
  <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap', p: 0.5, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa', ...sx }}>
    {renderElements(renderElem, headerFormat, previewHeaderData, 'header')}

    <br />

    {previewItemsData.map((itemData, itemIndex) => (
      <React.Fragment key={`item-${itemIndex}`}>
        {renderElements(renderElem, itemFormat, itemData, `item-${itemIndex}`)}
        {itemIndex < previewItemsData.length - 1 && <br />}
      </React.Fragment>
    ))}
  </Typography>
);

// Horizontal (inline) preview format
const HorizontalPreview = ({ headerFormat, itemFormat, separator, renderElem, previewHeaderData, previewItemsData, sx }) => (
  <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap', p: 0.5, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa', ...sx }}>
    <Box sx={{ display: 'inline' }}>
      {renderElements(renderElem, headerFormat, previewHeaderData, 'header')}

      <span> </span>

      {previewItemsData.map((itemData, itemIndex) => (
        <React.Fragment key={`item-${itemIndex}`}>
          {itemIndex > 0 && <span>{separator}</span>}
          {renderElements(renderElem, itemFormat, itemData, `item-${itemIndex}`)}
        </React.Fragment>
      ))}
    </Box>
  </Typography>
);

const FormatPreview = ({
  headerFormat,
  itemFormat,
  separator = ',',
  formatType = 'customVertical',
  onFormatTypeChange,
  config
}) => {
  const {
    renderElem,
    sections,
    validateSections = false,
    showCaptions = true,
    previewHeaderData,
    previewItemsData = [],
    itemSeparatorCaption,
    verticalCaption = '每個項目獨立一行顯示'
  } = config;

  useEffect(() => {
    if (!validateSections) return;

    headerFormat.forEach(item => {
      if (item.section !== sections.HEADER && item.section !== sections.BOTH) {
        console.warn(`Header format contains element with incorrect section: ${item.id}`, item);
      }
    });

    itemFormat.forEach(item => {
      if (item.section !== sections.ITEM && item.section !== sections.BOTH) {
        console.warn(`Item format contains element with incorrect section: ${item.id}`, item);
      }
    });
  }, [headerFormat, itemFormat, sections, validateSections]);

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

  const verticalFormat = formatTypesMap.get('customVertical');
  const horizontalFormat = formatTypesMap.get('customHorizontal');

  return (
    <Box sx={{ mb: 0 }}>
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
              itemFormat={itemFormat}
              renderElem={renderElem}
              previewHeaderData={previewHeaderData}
              previewItemsData={previewItemsData}
              sx={{ border: 'none', p: 0.5, backgroundColor: '#fafafa' }}
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
              itemFormat={itemFormat}
              separator={separator}
              renderElem={renderElem}
              previewHeaderData={previewHeaderData}
              previewItemsData={previewItemsData}
              sx={{ border: 'none', p: 0.5, backgroundColor: '#fafafa' }}
            />
          </Box>
        </Grid>
      </Grid>

      {showCaptions && (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            此為預覽，實際複製效果可能略有不同
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatType === 'customHorizontal'
              ? (itemSeparatorCaption ? itemSeparatorCaption(separator) : `分隔符號: "${separator}"`)
              : verticalCaption}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default FormatPreview;
