import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Stack,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Visibility,
  Edit,
  LocationOn,
  Person,
  CalendarToday,
  Build,
  Home,
  Assignment,
  AccessTime,
  Warning
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useThemeTokens from '../hooks/useThemeTokens';
import StatusChip from './StatusChip';
import PriorityChip from './PriorityChip';
import TypeChip from './TypeChip';
import { formatDashboardTimestamp } from '../utils/timezone';
import { getPriorityBorderColor } from '../utils/statusChipConfig';

function TicketCard({ ticket, onEdit }) {
  const navigate = useNavigate();
  const { codeBlockBg } = useThemeTokens();

  // Check if tech has been onsite too long (2+ hours)
  const checkOnsiteDuration = () => {
    if (!ticket.check_in_time || ticket.check_out_time) {
      return null; // Not checked in or already checked out
    }
    
    const checkInTime = new Date(ticket.check_in_time);
    const now = new Date();
    const hoursOnsite = (now - checkInTime) / (1000 * 60 * 60);
    
    if (hoursOnsite >= 2) {
      return {
        isAlert: true,
        hours: hoursOnsite.toFixed(1),
        message: `Tech onsite ${hoursOnsite.toFixed(1)} hours - Follow up!`
      };
    }
    
    return null;
  };

  const onsiteAlert = checkOnsiteDuration();

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
        borderLeft: `5px solid ${onsiteAlert ? '#d32f2f' : getPriorityBorderColor(ticket.priority)}`,
        bgcolor: onsiteAlert ? 'rgba(211, 47, 47, 0.05)' : 'background.paper'
      }}
      onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
    >
      <CardContent>
        {/* ONSITE ALERT - Shows at top if tech has been onsite 2+ hours */}
        {onsiteAlert && (
          <Alert 
            severity="error" 
            icon={<Warning />}
            sx={{ mb: 2, fontWeight: 600 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTime fontSize="small" />
              {onsiteAlert.message}
            </Box>
          </Alert>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          {/* Left side - Main info */}
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <TypeChip type={ticket.type} size="small" />
              <StatusChip status={ticket.status} entityType="ticket" size="small" />
              <PriorityChip priority={ticket.priority} size="small" />
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
              bgcolor: codeBlockBg, 
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

