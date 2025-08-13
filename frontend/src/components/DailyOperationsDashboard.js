import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Badge
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  CheckCircle,
  Schedule,
  Person,
  Phone,
  LocationOn,
  Warning,
  Error,
  Info,
  Refresh
} from '@mui/icons-material';
import { useToast } from '../contexts/ToastContext';
import useApi from '../hooks/useApi';
import useWebSocket from '../hooks/useWebSocket';
import LoadingSpinner from './LoadingSpinner';

function DailyOperationsDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [tickets, setTickets] = useState({
    inhouse: [],
    onsite: [],
    projects: [],
    misc: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { get, put, loading: apiLoading } = useApi();
  const { success, error: showError } = useToast();

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket(`ws://${window.location.hostname}:8000/ws/updates`, {
    onMessage: (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'ticket' || message.includes('ticket')) {
          fetchDailyTickets();
        }
      } catch (e) {
        // Handle non-JSON messages
      }
    }
  });

  const ticketTypes = [
    { key: 'inhouse', label: 'Inhouse Tickets', icon: <Person /> },
    { key: 'onsite', label: 'Onsite Tickets', icon: <LocationOn /> },
    { key: 'projects', label: 'Projects', icon: <Schedule /> },
    { key: 'misc', label: 'Misc Tickets', icon: <Info /> }
  ];

  const fetchDailyTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await get(`/tickets/daily/${selectedDate}`);
      
      // Group tickets by type
      const groupedTickets = {
        inhouse: [],
        onsite: [],
        projects: [],
        misc: []
      };

      response.forEach(ticket => {
        if (groupedTickets[ticket.type]) {
          groupedTickets[ticket.type].push(ticket);
        }
      });

      // Sort each group by priority (emergency/critical first)
      Object.keys(groupedTickets).forEach(type => {
        groupedTickets[type].sort((a, b) => {
          const priorityOrder = { emergency: 3, critical: 2, normal: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
      });

      setTickets(groupedTickets);
      setError(null);
    } catch (err) {
      setError('Failed to fetch daily tickets');
      showError('Failed to fetch daily tickets');
    } finally {
      setLoading(false);
    }
  }, [get, selectedDate, showError]);

  useEffect(() => {
    fetchDailyTickets();
  }, [fetchDailyTickets]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleClaimTicket = async (ticketId) => {
    try {
      await put(`/tickets/${ticketId}/claim`, { claimed_by: 'current_user_id' });
      success('Ticket claimed successfully');
      fetchDailyTickets();
    } catch (err) {
      showError('Failed to claim ticket');
    }
  };

  const handleCheckIn = async (ticketId) => {
    try {
      await put(`/tickets/${ticketId}/check-in`, {
        check_in_time: new Date().toISOString(),
        onsite_tech_id: 'tech_id'
      });
      success('Tech checked in successfully');
      fetchDailyTickets();
    } catch (err) {
      showError('Failed to check in tech');
    }
  };

  const handleCheckOut = async (ticketId) => {
    try {
      await put(`/tickets/${ticketId}/check-out`, {
        check_out_time: new Date().toISOString(),
        is_completed: true
      });
      success('Tech checked out successfully');
      fetchDailyTickets();
    } catch (err) {
      showError('Failed to check out tech');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'error';
      case 'critical': return 'warning';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'default';
      case 'scheduled': return 'info';
      case 'checked_in': return 'warning';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'needs_parts': return 'error';
      default: return 'default';
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const renderTicketTable = (ticketList) => {
    if (ticketList.length === 0) {
      return (
        <Box p={3} textAlign="center">
          <Typography variant="body2" color="textSecondary">
            No tickets for this type today
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Priority</TableCell>
              <TableCell>Site</TableCell>
              <TableCell>INC#</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Onsite Tech</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ticketList.map((ticket) => (
              <TableRow key={ticket.ticket_id} hover>
                <TableCell>
                  <Chip
                    label={ticket.priority}
                    color={getPriorityColor(ticket.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{ticket.site?.location || 'N/A'}</TableCell>
                <TableCell>{ticket.inc_number || 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label={ticket.status}
                    color={getStatusColor(ticket.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{ticket.assigned_user?.name || 'Unassigned'}</TableCell>
                <TableCell>{ticket.onsite_tech?.name || 'N/A'}</TableCell>
                <TableCell>
                  {ticket.onsite_duration_minutes ? 
                    formatDuration(ticket.onsite_duration_minutes) : 'N/A'
                  }
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    {ticket.type === 'inhouse' && ticket.status === 'open' && (
                      <Tooltip title="Claim Ticket">
                        <IconButton
                          size="small"
                          onClick={() => handleClaimTicket(ticket.ticket_id)}
                          color="primary"
                        >
                          <Person />
                        </IconButton>
                      </Tooltip>
                    )}
                    {ticket.type === 'onsite' && ticket.status === 'scheduled' && (
                      <Tooltip title="Check In">
                        <IconButton
                          size="small"
                          onClick={() => handleCheckIn(ticket.ticket_id)}
                          color="primary"
                        >
                          <PlayArrow />
                        </IconButton>
                      </Tooltip>
                    )}
                    {ticket.type === 'onsite' && ticket.status === 'checked_in' && (
                      <Tooltip title="Check Out">
                        <IconButton
                          size="small"
                          onClick={() => handleCheckOut(ticket.ticket_id)}
                          color="success"
                        >
                          <Stop />
                        </IconButton>
                      </Tooltip>
                    )}
                    {ticket.status === 'completed' && (
                      <Tooltip title="Completed">
                        <IconButton size="small" color="success" disabled>
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Daily Operations Dashboard
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Typography variant="body2" color="textSecondary">
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDailyTickets}
            disabled={apiLoading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="h6">Date:</Typography>
            </Grid>
            <Grid item>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          {ticketTypes.map((type, index) => (
            <Tab
              key={type.key}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  {type.icon}
                  <span>{type.label}</span>
                  <Badge
                    badgeContent={tickets[type.key]?.length || 0}
                    color="primary"
                    max={99}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>

        <Box p={2}>
          {renderTicketTable(tickets[ticketTypes[activeTab].key])}
        </Box>
      </Paper>
    </Box>
  );
}

export default DailyOperationsDashboard; 