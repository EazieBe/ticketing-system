import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  IconButton,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Visibility,
  Edit,
  LocationOn,
  Person,
  CalendarToday,
  Build,
  Home,
  Assignment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatDashboardTimestamp } from '../utils/timezone';

function TicketCard({ ticket, onEdit }) {
  const navigate = useNavigate();

  // Priority colors
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'emergency': return { bg: '#d32f2f', text: '#fff' };
      case 'critical': return { bg: '#f44336', text: '#fff' };
      case 'normal': return { bg: '#2196f3', text: '#fff' };
      default: return { bg: '#757575', text: '#fff' };
    }
  };

  // Status colors
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'scheduled': return 'info';
      case 'completed': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  // Type icons
  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'onsite': return <Build fontSize="small" />;
      case 'inhouse': return <Home fontSize="small" />;
      case 'projects': return <Assignment fontSize="small" />;
      default: return <Build fontSize="small" />;
    }
  };

  const priorityColors = getPriorityColor(ticket.priority);

  return (
    <Card 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 6,
          transform: 'translateY(-2px)'
        },
        borderLeft: `5px solid ${priorityColors.bg}`
      }}
      onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          {/* Left side - Main info */}
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Chip 
                icon={getTypeIcon(ticket.type)}
                label={ticket.type || 'Unknown'}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={ticket.status || 'Unknown'}
                size="small"
                color={getStatusColor(ticket.status)}
              />
              <Chip
                label={ticket.priority || 'Normal'}
                size="small"
                sx={{ 
                  bgcolor: priorityColors.bg, 
                  color: priorityColors.text,
                  fontWeight: 600
                }}
              />
            </Stack>

            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              #{ticket.ticket_id?.substring(0, 8)}
            </Typography>

            <Stack spacing={0.5}>
              {/* Site */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {ticket.site?.location || ticket.site_id || 'No Site'}
                  {ticket.site?.city && ` - ${ticket.site.city}, ${ticket.site.state}`}
                </Typography>
              </Box>

              {/* Assigned User */}
              {ticket.assigned_user_id && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {ticket.assigned_user?.name || ticket.assigned_user_id}
                  </Typography>
                </Box>
              )}

              {/* Date */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {formatDashboardTimestamp(ticket.created_at || ticket.date_created)}
                </Typography>
              </Box>

              {/* INC/SO Numbers */}
              {(ticket.inc_number || ticket.so_number) && (
                <Typography variant="caption" color="text.secondary">
                  {ticket.inc_number && `INC: ${ticket.inc_number}`}
                  {ticket.inc_number && ticket.so_number && ' • '}
                  {ticket.so_number && `SO: ${ticket.so_number}`}
                </Typography>
              )}
            </Stack>
          </Box>

          {/* Right side - Actions */}
          <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View Details">
              <IconButton 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/tickets/${ticket.ticket_id}`);
                }}
              >
                <Visibility />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) onEdit(ticket);
                }}
              >
                <Edit />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Notes preview */}
        {ticket.notes && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              mt: 1, 
              p: 1, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {ticket.notes}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default TicketCard;

