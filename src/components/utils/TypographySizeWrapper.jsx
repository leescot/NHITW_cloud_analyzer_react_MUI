import React from 'react';
import { Typography } from '@mui/material';

// 不同顯示設置的字體大小映射
const TITLE_TEXT_SIZES = {
  small: '1.25rem', // h6 等效 (20px)
  medium: '1.5rem',  // h5 等效 (24px)
  large: '2.125rem' // h4 等效 (34px)
};

const CONTENT_TEXT_SIZES = {
  small: '0.875rem', // body2 等效 (14px)
  medium: '1rem',    // body1 等效 (16px)
  large: '1.125rem'  // subtitle1 等效 (18px)
};

const NOTE_TEXT_SIZES = {
  small: '0.75rem',  // caption 等效 (12px)
  medium: '0.875rem', // body2 等效 (14px)
  large: '1rem'      // body1 等效 (16px)
};

// 變體到文字大小類型的映射
const VARIANT_TO_SIZE_TYPE = new Map([
  ['h6', 'title'],
  ['h5', 'title'],
  ['h4', 'title'],
  ['caption', 'note'],
  // 其他變體預設為 'content'
]);

// 文字大小類型到對應尺寸集合的映射
const SIZE_TYPE_TO_SIZES = new Map([
  ['title', TITLE_TEXT_SIZES],
  ['note', NOTE_TEXT_SIZES],
  ['content', CONTENT_TEXT_SIZES],
]);

/**
 * 一個 Typography 的包裝組件，根據變體和一般顯示設置應用正確的字體大小
 *
 * @param {Object} props - 組件屬性
 * @param {Object} props.generalDisplaySettings - 一般顯示設置
 * @param {string} props.variant - Typography 變體
 * @param {Object} props.sx - 額外的 sx 樣式
 * @param {ReactNode} props.children - 子元素
 * @param {string} props.textSizeType - 手動指定使用哪種文字大小（'title'、'content' 或 'note'）
 * @returns {JSX.Element} - 具有正確字體大小的 Typography 組件
 */
const TypographySizeWrapper = ({
  generalDisplaySettings = { titleTextSize: 'medium', contentTextSize: 'medium', noteTextSize: 'small' },
  variant = 'body1',
  sx = {},
  children,
  textSizeType,
  ...rest
}) => {
  // 確保 generalDisplaySettings 已定義
  const settings = generalDisplaySettings || { titleTextSize: 'medium', contentTextSize: 'medium', noteTextSize: 'small' };

  // 根據變體或明確的 textSizeType 確定要使用的文字大小類型
  const sizeType = textSizeType || VARIANT_TO_SIZE_TYPE.get(variant) || 'content';

  // 從設置中擷取正確的字體大小
  const sizeMap = SIZE_TYPE_TO_SIZES.get(sizeType);
  
  // 根據 sizeType 擷取相應的設置屬性名
  const settingKey = `${sizeType}TextSize`;
  const sizeSetting = settings[settingKey] || (sizeType === 'title' ? 'medium' : sizeType === 'note' ? 'small' : 'medium');
  
  const fontSize = sizeMap[sizeSetting];

  // 將 fontSize 合併到現有的 sx 屬性中
  const updatedSx = {
    ...sx,
    fontSize
  };

  return (
    <Typography variant={variant} sx={updatedSx} {...rest}>
      {children}
    </Typography>
  );
};

export default TypographySizeWrapper;