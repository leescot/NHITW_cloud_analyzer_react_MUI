import React from 'react';
import { Typography } from '@mui/material';

// Font size mapping for different display settings
const TITLE_TEXT_SIZES = {
  small: '1.25rem', // h6 equivalent (20px)
  medium: '1.5rem',  // h5 equivalent (24px)
  large: '2.125rem' // h4 equivalent (34px)
};

const CONTENT_TEXT_SIZES = {
  small: '0.875rem', // body2 equivalent (14px)
  medium: '1rem',    // body1 equivalent (16px)
  large: '1.125rem'  // subtitle1 equivalent (18px)
};

const NOTE_TEXT_SIZES = {
  small: '0.75rem',  // caption equivalent (12px)
  medium: '0.875rem', // body2 equivalent (14px)
  large: '1rem'      // body1 equivalent (16px)
};

/**
 * A wrapper component for Typography that applies the correct font size based on the variant and generalDisplaySettings
 *
 * @param {Object} props - The component props
 * @param {Object} props.generalDisplaySettings - The general display settings
 * @param {string} props.variant - The Typography variant
 * @param {Object} props.sx - Additional sx styling
 * @param {ReactNode} props.children - The child elements
 * @param {string} props.textSizeType - Manually specify which text size to use ('title', 'content', or 'note')
 * @returns {JSX.Element} - The Typography component with the correct font size
 */
const TypographySizeWrapper = ({
  generalDisplaySettings = { titleTextSize: 'medium', contentTextSize: 'medium', noteTextSize: 'small' },
  variant = 'body1',
  sx = {},
  children,
  textSizeType,
  ...rest
}) => {
  // Ensure generalDisplaySettings is defined
  const settings = generalDisplaySettings || { titleTextSize: 'medium', contentTextSize: 'medium', noteTextSize: 'small' };
  
  // Determine which text size type to use based on variant or explicit textSizeType
  let sizeType = textSizeType;
  
  if (!sizeType) {
    if (variant === 'h6' || variant === 'h5' || variant === 'h4') {
      sizeType = 'title';
    } else if (variant === 'caption') {
      sizeType = 'note';
    } else {
      sizeType = 'content';
    }
  }
  
  // Get the correct font size from the settings
  let fontSize;
  switch (sizeType) {
    case 'title':
      fontSize = TITLE_TEXT_SIZES[settings.titleTextSize || 'medium'];
      break;
    case 'note':
      fontSize = NOTE_TEXT_SIZES[settings.noteTextSize || 'small'];
      break;
    case 'content':
    default:
      fontSize = CONTENT_TEXT_SIZES[settings.contentTextSize || 'medium'];
  }
  
  // Merge the fontSize into the existing sx prop
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