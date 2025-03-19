import React from 'react';
import { Box } from '@mui/material';

// Line spacing mapping for different display settings
const LINE_SPACING = {
  narrow: '0.25rem', // 4px
  medium: '0.5rem',  // 8px
  wide: '0.75rem'    // 12px
};

/**
 * A wrapper component that applies the correct line spacing based on the generalDisplaySettings
 *
 * @param {Object} props - The component props
 * @param {Object} props.generalDisplaySettings - The general display settings
 * @param {Object} props.sx - Additional sx styling
 * @param {ReactNode} props.children - The child elements
 * @returns {JSX.Element} - The Box component with the correct margin bottom for line spacing
 */
const LineSpacingWrapper = ({
  generalDisplaySettings = { lineSpacingHeight: 'medium' },
  sx = {},
  children,
  ...rest
}) => {
  // Ensure generalDisplaySettings is defined
  const settings = generalDisplaySettings || { lineSpacingHeight: 'medium' };
  
  // Get the correct line spacing from the settings
  const marginBottom = LINE_SPACING[settings.lineSpacingHeight || 'medium'];
  
  // Merge the marginBottom into the existing sx prop
  const updatedSx = {
    ...sx,
    mb: marginBottom
  };
  
  return (
    <Box sx={updatedSx} {...rest}>
      {children}
    </Box>
  );
};

export default LineSpacingWrapper; 