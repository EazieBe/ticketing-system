import React from 'react';
import { Chip } from '@mui/material';
import useReadableChip from '../hooks/useReadableChip';
import { getTicketTypeVariant } from '../utils/statusChipConfig';

/**
 * Ticket type chip with consistent colors everywhere: inhouse=green, onsite=blue, projects=info, etc.
 */
function TypeChip({ type, size = 'small', sx = {}, ...props }) {
  const { getChipSx } = useReadableChip();
  const variant = getTicketTypeVariant(type);
  const label = type ? String(type).replace(/_/g, ' ') : '—';
  return (
    <Chip
      label={label}
      size={size}
      sx={{
        height: size === 'small' ? 22 : 28,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        ...getChipSx(variant),
        ...sx,
      }}
      {...props}
    />
  );
}

export default TypeChip;
