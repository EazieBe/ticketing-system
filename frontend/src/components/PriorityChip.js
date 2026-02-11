import React from 'react';
import { Chip } from '@mui/material';
import useReadableChip from '../hooks/useReadableChip';
import { getPriorityVariant, getShippingPriorityVariant } from '../utils/statusChipConfig';

/**
 * Priority chip with the same color everywhere: normal = green, critical = orange, emergency = red.
 * Use for ticket priority and shipment shipping_priority so they match across all pages.
 */
function PriorityChip({ priority, type = 'ticket', size = 'small', sx = {}, ...props }) {
  const { getChipSx } = useReadableChip();
  const variant = type === 'shipment' ? getShippingPriorityVariant(priority) : getPriorityVariant(priority);
  const label = priority && String(priority).replace(/_/g, ' ') || 'Normal';
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

export default PriorityChip;
