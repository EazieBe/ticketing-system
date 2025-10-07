import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Assignment,
  Person,
  Business,
  Phone,
  Refresh,
  Visibility,
  Error,
  PriorityHigh,
  Add,
  Build
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import useApi from './hooks/useApi';
import { useToast } from './contexts/ToastContext';
import { formatDashboardTimestamp, getBestTimestamp } from './utils/timezone';
import ClickableTicketId from './components/ClickableTicketId';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const { success, error: showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const [tickets, setTickets] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [timeRange] = useState('today'); // 'today', 'week', 'month'

  const fetchDailyTickets = useCallback(async () => {
    // Don't fetch if component is unmounted
    if (!isMountedRef.current) {
      console.log('Component unmounted, skipping daily tickets fetch');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const today = new Date();
      const date = timeRange === 'today' ? today.toISOString().split('T')[0] : 
                   timeRange === 'week' ? new Date(today.setDate(today.getDate() - today.getDay())).toISOString().split('T')[0] :
                   new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      
      const response = await api.get(`/tickets/daily/${date}`);
      if (isMountedRef.current) {
        setTickets(response || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching daily tickets:', err);
      setError('Failed to load daily tickets');
      showError('Error loading daily tickets');
      setTickets([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
      }, [api, timeRange, showError]);

  useEffect(() => {
    fetchDailyTickets();
  }, [fetchDailyTickets]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleClaim = async (ticketId) => {
    try {
      await api.put(`/tickets/${ticketId}/claim`, { claimed_by: user.user_id });
              success('Ticket claimed successfully');
      fetchDailyTickets(); // Refresh data
    } catch (err) {
      console.error('Error claiming ticket:', err);
              showError('Failed to claim ticket');
    }
  };

  const handleCheckIn = async (ticketId) => {
    try {
      await api.put(`/tickets/${ticketId}/check-in`);
              success('Ticket checked in successfully');
      fetchDailyTickets(); // Refresh data
    } catch (err) {
      console.error('Error checking in ticket:', err);
              showError('Failed to check in ticket');
    }
  };

  const handleCheckOut = async (ticketId) => {
    try {
      await api.put(`/tickets/${ticketId}/check-out`);
              success('Ticket checked out successfully');
      fetchDailyTickets(); // Refresh data
    } catch (err) {
      console.error('Error checking out ticket:', err);
              showError('Failed to check out ticket');
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'emergency': return 'Emergency';
      case 'critical': return 'Critical';
      case 'normal': return 'Normal';
      default: return priority;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'default';
      case 'scheduled': return 'primary';
      case 'checked_in': return 'warning';
      case 'in_progress': return 'info';
      case 'pending': return 'secondary';
      case 'needs_parts': return 'error';
      case 'go_back_scheduled': return 'warning';
      case 'completed': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'error';
      case 'critical': return 'warning';
      case 'normal': return 'default';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'emergency': return <Error fontSize="small" />;
      case 'critical': return <PriorityHigh fontSize="small" />;
      default: return null;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'inhouse': return <Build />;
      case 'onsite': return <Business />;
      case 'projects': return <Assignment />;
      case 'misc': return <Phone />;
      default: return <Assignment />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'inhouse': return 'Inhouse';
      case 'onsite': return 'Onsite';
      case 'projects': return 'Projects';
      case 'misc': return 'Misc';
      default: return type;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'open': return 'Open';
      case 'scheduled': return 'Scheduled';
      case 'checked_in': return 'Checked In';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'needs_parts': return 'Needs Parts';
      case 'go_back_scheduled': return 'Go-back Scheduled';
      case 'completed': return 'Completed';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const ticketTypes = ['inhouse', 'onsite', 'projects', 'misc'];
  const typeLabels = ['Inhouse', 'Onsite', 'Projects', 'Misc'];

  const filteredTickets = (tickets || []).filter(ticket => {
    if (selectedTab === 0) return true; // All tickets
    return ticket.type === ticketTypes[selectedTab - 1];
  });

  const sortedTickets = filteredTickets.sort((a, b) => {
    // Emergency first, then critical, then normal
    const priorityOrder = { emergency: 0, critical: 1, normal: 2 };
    const aPriority = priorityOrder[a.priority] || 2;
    const bPriority = priorityOrder[b.priority] || 2;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Then by creation date (newest first)
    const aTimestamp = getBestTimestamp(a, 'tickets');
    const bTimestamp = getBestTimestamp(b, 'tickets');
    return new Date(bTimestamp || 0) - new Date(aTimestamp || 0);
  });

  const renderTicketCard = (ticket) => (
    <Card key={ticket.ticket_id} sx={{ mb: 1, border: ticket.priority === 'emergency' ? '2px solid #f44336' : 
                                       ticket.priority === 'critical' ? '2px solid #ff9800' : '1px solid #e0e0e0' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              {getTypeIcon(ticket.type)}
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                <ClickableTicketId ticketId={ticket.ticket_id} />
              </Typography>
              {getPriorityIcon(ticket.priority)}
              <Chip 
                label={getPriorityLabel(ticket.priority)} 
                size="small" 
                color={getPriorityColor(ticket.priority)}
                variant={ticket.priority === 'normal' ? 'outlined' : 'filled'}
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {ticket.title}
            </Typography>
            
            <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
              <Chip 
                label={getTypeLabel(ticket.type)} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                label={getStatusLabel(ticket.status)} 
                size="small" 
                color={getStatusColor(ticket.status)}
              />
              {ticket.claimed_by && (
                <Chip 
                  label={`Claimed by ${ticket.claimed_user?.name || 'Unknown'}`} 
                  size="small" 
                  variant="outlined"
                  icon={<Person />}
                />
              )}
            </Box>
            
            <Typography variant="caption" color="text.secondary">
              Created: {formatDashboardTimestamp(getBestTimestamp(ticket, 'tickets'))}
            </Typography>
          </Box>
          
          <Box display="flex" flexDirection="column" gap={1}>
            <IconButton 
              size="small" 
              onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
              title="View Details"
            >
              <Visibility />
            </IconButton>
            
            {ticket.status === 'open' && (
              <Button 
                size="small" 
                variant="contained" 
                onClick={() => handleClaim(ticket.ticket_id)}
                title="Claim Ticket"
              >
                Claim
              </Button>
            )}
            
            {ticket.status === 'scheduled' && ticket.type === 'onsite' && (
              <Button 
                size="small" 
                variant="contained" 
                color="warning"
                onClick={() => handleCheckIn(ticket.ticket_id)}
                title="Check In"
              >
                Check In
              </Button>
            )}
            
            {ticket.status === 'checked_in' && (
              <Button 
                size="small" 
                variant="contained" 
                color="info"
                onClick={() => handleCheckOut(ticket.ticket_id)}
                title="Check Out"
              >
                Check Out
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchDailyTickets}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Daily Operations Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDailyTickets}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/tickets/new')}
          >
            New Ticket
          </Button>
        </Box>
      </Box>

      <Box mb={3}>
        <Tabs 
          value={selectedTab} 
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`All Tickets (${tickets.length})`} />
          <Tab label={`Inhouse (${tickets.filter(t => t.type === 'inhouse').length})`} />
          <Tab label={`Onsite (${tickets.filter(t => t.type === 'onsite').length})`} />
          <Tab label={`Projects (${tickets.filter(t => t.type === 'projects').length})`} />
          <Tab label={`Misc (${tickets.filter(t => t.type === 'misc').length})`} />
        </Tabs>
      </Box>

      <Box mb={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {selectedTab === 0 ? 'All Tickets' : typeLabels[selectedTab - 1]} - {timeRange === 'today' ? 'Today' : 
             timeRange === 'week' ? 'This Week' : 'This Month'}
          </Typography>
          
          {sortedTickets.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No tickets found for the selected period.
              </Typography>
            </Box>
          ) : (
            <Box>
              {sortedTickets.map(renderTicketCard)}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default Dashboard; 