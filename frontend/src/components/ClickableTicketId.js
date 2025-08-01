import React from 'react';
import { Button } from '@mui/material';
import { Link } from 'react-router-dom';

function ClickableTicketId({ ticketId, truncate = true, variant = 'text' }) {
  const displayId = truncate ? `${ticketId.substring(0, 8)}...` : ticketId;
  
  return (
    <Button
      component={Link}
      to={`/tickets/${ticketId}`}
      sx={{ 
        textTransform: 'none', 
        p: 0, 
        minWidth: 'auto',
        fontWeight: 600,
        color: 'primary.main',
        textDecoration: 'underline',
        fontSize: 'inherit'
      }}
      variant={variant}
    >
      {displayId}
    </Button>
  );
}

export default ClickableTicketId; 