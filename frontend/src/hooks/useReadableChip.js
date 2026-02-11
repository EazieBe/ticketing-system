import useThemeTokens from './useThemeTokens';

// Explicit text colors for chips so they're never grey-on-grey (readable in light and dark)
const CHIP_TEXT = {
  primary: { light: '#1565c0', dark: '#90caf9' },
  success: { light: '#2e7d32', dark: '#81c784' },
  warning: { light: '#e65100', dark: '#ffb74d' },
  error: { light: '#c62828', dark: '#ef9a9a' },
  info: { light: '#0277bd', dark: '#4fc3f7' },
  secondary: { light: '#7b1fa2', dark: '#ce93d8' },
  neutral: { light: '#616161', dark: 'rgba(255,255,255,0.85)' },
};

/**
 * Returns sx for Chips so they're always readable (dark text on light bg in light mode, light text on dark tint in dark mode).
 * Use for any Chip that currently uses only color="primary" etc. and looks grey-on-grey.
 * @param {string} variant - 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'default'
 * @returns {object} sx object with bgcolor, color, fontWeight, fontSize
 */
export default function useReadableChip() {
  const tokens = useThemeTokens();
  const { isDark, statusInfoBg, statusSuccessBg, statusWarningBg, statusErrorBg, statusNeutralBg } = tokens;

  const getChipSx = (variant, overrides = {}) => {
    const v = variant || 'default';
    const bg = v === 'primary' || v === 'info' ? statusInfoBg
      : v === 'success' ? statusSuccessBg
      : v === 'warning' ? statusWarningBg
      : v === 'error' ? statusErrorBg
      : statusNeutralBg;
    const key = (v === 'default') ? 'neutral' : v;
    const color = CHIP_TEXT[key] ? CHIP_TEXT[key][isDark ? 'dark' : 'light'] : CHIP_TEXT.neutral[isDark ? 'dark' : 'light'];
    return {
      bgcolor: bg,
      color,
      fontWeight: 600,
      fontSize: '0.75rem',
      '& .MuiChip-label': { color: `${color} !important` },
      ...overrides,
    };
  };

  return { getChipSx };
}
