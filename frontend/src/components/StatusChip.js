import React from 'react';
import { Chip } from '@mui/material';
import useThemeTokens from '../hooks/useThemeTokens';
import { getTicketStatusStyle, getShipmentStatusStyle, formatStatusLabel } from '../utils/statusChipConfig';

// Explicit text colors for readability: dark text in light mode, light text in dark mode (never white-on-white)
const CHIP_TEXT_COLORS = {
  primary: { light: '#1565c0', dark: '#90caf9' },
  secondary: { light: '#7b1fa2', dark: '#ce93d8' },
  warning: { light: '#e65100', dark: '#ffb74d' },
  error: { light: '#c62828', dark: '#ef9a9a' },
  success: { light: '#2e7d32', dark: '#81c784' },
  neutral: { light: '#616161', dark: 'rgba(255,255,255,0.85)' },
};

/**
 * Consistent, readable status chip for tickets and shipments across the app.
 * Uses shared config and theme tokens; text color is explicit for contrast.
 */
function StatusChip({ status, entityType = 'ticket', size = 'small', sx = {}, ...props }) {
  const tokens = useThemeTokens();
  const isDark = tokens.isDark;

  const style = entityType === 'shipment'
    ? getShipmentStatusStyle(status, tokens)
    : getTicketStatusStyle(status, tokens);

  // Map palette path to explicit readable color (no theme.palette so we never get white-on-white)
  const colorKey = style.color.includes('primary') ? 'primary' : style.color.includes('secondary') ? 'secondary' : style.color.includes('warning') ? 'warning' : style.color.includes('error') ? 'error' : style.color.includes('success') ? 'success' : 'neutral';
  const colorValue = CHIP_TEXT_COLORS[colorKey] ? CHIP_TEXT_COLORS[colorKey][isDark ? 'dark' : 'light'] : CHIP_TEXT_COLORS.neutral[isDark ? 'dark' : 'light'];

  return (
    <Chip
      label={formatStatusLabel(status)}
      size={size}
      sx={{
        height: size === 'small' ? 22 : 28,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        bgcolor: style.bg,
        color: colorValue,
        '& .MuiChip-label': {
          px: 0.75,
        },
        ...sx,
      }}
      {...props}
    />
  );
}

export default StatusChip;
export { formatStatusLabel, getTicketStatusStyle, getShipmentStatusStyle };
