import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Box, TextField, Alert,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, TablePagination,
  InputAdornment, ToggleButton, ToggleButtonGroup, Grid, Card, CardContent
} from '@mui/material';
import {
  Add, Edit, Visibility, Person, Build, Refresh, Search, Clear,
  ViewList, ViewModule, MoreVert, Error, PriorityHigh, Business, Assignment, Phone
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ClickableTicketId from './components/ClickableTicketId';
import TicketCard from './components/TicketCard';
import TicketFilters from './components/TicketFilters';
import { filterTickets, getDefaultFilters } from './utils/filterTickets';
import { useDataSync } from './contexts/DataSyncContext';

dayjs.extend(relativeTime);

function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const { success, error: showError } = useToast();
  const { updateTrigger } = useDataSync('tickets');
  
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Filters - using unified filter system
  const [filters, setFilters] = useState(getDefaultFilters());

  const getStatusOptions = (ticketType) => {
    const baseStatuses = ['open', 'in_progress', 'completed', 'closed'];
    
    switch (ticketType) {
      case 'inhouse':
        return [...baseStatuses, 'pending'];
      case 'onsite':
        return ['open', 'scheduled', 'checked_in', 'in_progress', 'needs_parts', 'go_back_scheduled', 'completed', 'closed'];
      case 'projects':
        return ['open', 'planning', 'in_progress', 'completed', 'closed'];
      case 'misc':
        return baseStatuses;
      default:
        return baseStatuses;
    }
  };

  const fetchTickets = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await api.get('/tickets/');
      setTickets(response || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      if (err.message.includes('Network error')) {
        setError('Backend server is not running. Please start the server.');
      } else {
        setError('Failed to load tickets');
      }
      showError('Error loading tickets');
      setTickets([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [api, showError]);

  // WebSocket is now handled globally by NotificationProvider and DataSyncContext

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  }, [api]);

  const fetchSites = useCallback(async () => {
    try {
      const response = await api.get('/sites/');
      setSites(response || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setSites([]);
    }
  }, [api]);

  // Initial load with loading spinner
  useEffect(() => {
    fetchTickets(true); // Show loading on initial load
  }, []); // Empty dependency array for initial load only

  // Auto-refresh when DataSync triggers update (no loading spinner)
  useEffect(() => {
    if (updateTrigger > 0) { // Only refresh on real-time updates, not initial load
      fetchTickets(false); // Don't show loading on real-time updates
    }
  }, [updateTrigger]); // Only depend on updateTrigger

  useEffect(() => {
    fetchUsers();
    fetchSites();
    
    // Cleanup function
    return () => {
      // WebSocket cleanup is handled by useWebSocket hook
    };
  }, []);

  const handleAdd = () => {
    navigate('/tickets/new');
  };

  const handleEdit = (ticket) => {
    navigate(`/tickets/${ticket.ticket_id}/edit`);
  };

  const handleClose = () => {
    navigate('/tickets');
  };

  const handleSubmit = async (values) => {
    try {
      if (values.ticket_id) {
        await api.put(`/tickets/${values.ticket_id}`, values);
        success('Ticket updated successfully');
      } else {
        await api.post('/tickets/', values);
        success('Ticket created successfully');
      }
      fetchTickets();
      handleClose();
    } catch (err) {
      console.error('Error saving ticket:', err);
      showError('Error saving ticket');
    }
  };

  const handleDelete = (ticket) => {
    setSelectedTicket(ticket);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/tickets/${selectedTicket.ticket_id}`);
      success('Ticket deleted successfully');
      fetchTickets();
      setDeleteDialogOpen(false);
      setSelectedTicket(null);
    } catch (err) {
      console.error('Error deleting ticket:', err);
      showError('Error deleting ticket');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await api.put(`/tickets/${ticketId}`, { status: newStatus });
      success('Status updated successfully');
      fetchTickets();
    } catch (err) {
      console.error('Error updating status:', err);
      showError('Error updating status');
    }
  };

  const handleClaim = async (ticketId) => {
    try {
      await api.put(`/tickets/${ticketId}/claim`, { claimed_by: user.user_id });
      success('Ticket claimed successfully');
      // Use a timeout to ensure fetchTickets is available
      setTimeout(() => {
        if (typeof fetchTickets === 'function') {
          fetchTickets();
        }
      }, 100);
    } catch (err) {
      console.error('Error claiming ticket:', err);
      if (err.response?.status === 422) {
        showError('Invalid ticket data. Please check the ticket information.');
      } else {
        showError('Error claiming ticket');
      }
    }
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.site_id === siteId);
    return site ? `${site.site_id} - ${site.location || 'Unknown Location'}` : 'Unknown Site';
  };

  const getAssignedUserName = (userId) => {
    const user = users.find(u => u.user_id === userId);
    return user ? user.name : 'Unknown User';
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

  const getPriorityLabel = (priority) => {
    switch (priority) {
              case 'emergency': return 'Error';
      case 'critical': return 'Critical';
      case 'normal': return 'Normal';
      default: return priority;
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
      case 'planning': return 'Planning';
      default: return status;
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
      case 'planning': return 'primary';
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

  // Filter and sort tickets - using unified filter system
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = filterTickets(tickets, filters);

    // Sort by priority first, then by date_created
    filtered.sort((a, b) => {
      const priorityOrder = { emergency: 0, critical: 1, normal: 2 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return new Date(b.created_at || b.date_created) - new Date(a.created_at || a.date_created);
    });

    return filtered;
  }, [tickets, filters]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const renderTicketRow = (ticket) => (
    <TableRow key={ticket.ticket_id} hover>
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          {getTypeIcon(ticket.type)}
          <ClickableTicketId ticketId={ticket.ticket_id} />
          {getPriorityIcon(ticket.priority)}
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap>
          {ticket.notes ? (ticket.notes.length > 50 ? ticket.notes.substring(0, 50) + '...' : ticket.notes) : 'No description'}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip 
          label={getTypeLabel(ticket.type)} 
          size="small" 
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Chip 
          label={getPriorityLabel(ticket.priority)} 
          size="small" 
          color={getPriorityColor(ticket.priority)}
          variant={ticket.priority === 'normal' ? 'outlined' : 'filled'}
        />
      </TableCell>
      <TableCell>
        <Chip 
          label={getStatusLabel(ticket.status)} 
          size="small" 
          color={getStatusColor(ticket.status)}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap>
          {getSiteName(ticket.site_id)}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap>
          {ticket.assigned_user_id ? getAssignedUserName(ticket.assigned_user_id) : 'Unassigned'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap>
          {dayjs(ticket.created_at || ticket.date_created).format('MMM D, YYYY')}
        </Typography>
      </TableCell>
      <TableCell>
        <Box display="flex" gap={1}>
          <IconButton 
            size="small" 
            onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
            title="View Details"
          >
            <Visibility />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handleEdit(ticket)}
            title="Edit Ticket"
          >
            <Edit />
          </IconButton>
          {ticket.status === 'open' && (
            <IconButton 
              size="small" 
              onClick={() => handleClaim(ticket.ticket_id)}
              title="Claim Ticket"
              color="primary"
            >
              <Person />
            </IconButton>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tickets
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchTickets}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
          >
            New Ticket
          </Button>
        </Box>
      </Box>

      {/* Unified Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TicketFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          sites={sites}
        />
      </Paper>

      {/* View Mode Toggle */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          {filteredAndSortedTickets.length} tickets found
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="list">
            <ViewList />
          </ToggleButton>
          <ToggleButton value="cards">
            <ViewModule />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Tickets List */}
      {viewMode === 'list' ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ticket ID</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Site</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedTickets
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(renderTicketRow)}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredAndSortedTickets.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      ) : (
        <Box>
          {filteredAndSortedTickets
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map(ticket => (
              <TicketCard 
                key={ticket.ticket_id} 
                ticket={ticket}
              />
            ))}
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredAndSortedTickets.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

export default Tickets; 