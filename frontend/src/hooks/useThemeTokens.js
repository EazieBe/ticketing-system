import { useTheme } from '@mui/material/styles';

/**
 * Shared theme tokens for consistent light/dark mode across the app.
 * Use this hook in every page, form, table, dialog, and section instead of hardcoded colors.
 */
export default function useThemeTokens() {
  const theme = useTheme();
  const isDark = theme.palette?.mode === 'dark';

  return {
    isDark,
    // Surfaces
    surfacePaper: theme.palette?.background?.paper ?? (isDark ? '#1a1a1a' : '#ffffff'),
    surfaceDefault: theme.palette?.background?.default ?? (isDark ? '#0a0a0a' : '#fafafa'),
    // Table
    tableHeaderBg: isDark ? '#2d2d2d' : '#f5f5f5',
    rowHoverBg: isDark ? '#2a2a2a' : '#f5f5f5',
    // Code / monospace blocks (Audit, import results)
    codeBlockBg: isDark ? '#252525' : '#f5f5f5',
    codeBlockBgAlt: isDark ? '#1f1f1f' : '#fafafa',
    // Borders
    divider: theme.palette?.divider ?? (isDark ? '#333333' : '#e0e0e0'),
    border: isDark ? '1px solid #333333' : '1px solid #e0e0e0',
    // Status tints (backgrounds that work in both modes)
    statusWarningBg: isDark ? 'rgba(255, 152, 0, 0.2)' : '#fff3e0',
    statusErrorBg: isDark ? 'rgba(244, 67, 54, 0.2)' : '#ffebee',
    statusSuccessBg: isDark ? 'rgba(76, 175, 80, 0.2)' : '#e8f5e9',
    statusInfoBg: isDark ? 'rgba(33, 150, 243, 0.2)' : '#e3f2fd',
    statusNeutralBg: isDark ? 'rgba(255,255,255,0.08)' : '#f5f5f5',
    // Optional/empty field highlight (e.g. unscheduled date)
    optionalFieldBg: isDark ? 'rgba(255, 152, 0, 0.15)' : '#fff3e0',
    // Avatar/icon placeholder (replaces grey.100 in dark)
    avatarBg: isDark ? 'rgba(255,255,255,0.1)' : 'grey.100',
    avatarIcon: isDark ? 'rgba(255,255,255,0.7)' : 'grey.500',
    // Card/panel on colored bar (e.g. Daily Ops top bar)
    barCardBg: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.2)',
    // Toast / feedback (success)
    toastSuccessBg: isDark ? 'rgba(76, 175, 80, 0.25)' : '#e8f5e9',
    toastSuccessBorder: isDark ? '1px solid rgba(76, 175, 80, 0.5)' : '1px solid #4caf50',
  };
}
