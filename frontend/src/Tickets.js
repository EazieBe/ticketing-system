import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Avatar, Badge, Tooltip, List, ListItem, ListItemText, ListItemAvatar, Divider, TablePagination,
  InputAdornment, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
  Add, Edit, Delete, Visibility, Person, Schedule, CheckCircle, Cancel, Warning,
  LocalShipping, Build, Inventory, Flag, FlagOutlined, Star, StarBorder,
  Notifications, NotificationsOff, ExpandMore, ExpandLess, FilterList, Sort,
  Error, PriorityHigh, Business, Assignment, Phone, Refresh, Search, Clear,
  ViewList, ViewModule, MoreVert
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useWebSocket from './hooks/useWebSocket';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ClickableTicketId from './components/ClickableTicketId';

dayjs.extend(relativeTime);

function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'type', 'status', 'priority'
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    priority: 'all',
    assignedTo: 'all',
    site: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // WebSocket setup - callbacks will be defined after fetchTickets
  const wsUrl = `ws://192.168.43.50:8000/ws/updates`;

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

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
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
      showToast('Error loading tickets', 'error');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  // WebSocket callback functions - defined after fetchTickets
  const handleWebSocketMessage = useCallback((data) => {
    try {
      // Handle both string and object messages
      const message = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Check if message contains ticket-related updates
      if (message && (
        message.type === 'ticket_update' || 
        message.type === 'ticket_created' || 
        message.type === 'ticket_deleted' ||
        (typeof message === 'string' && message.includes('ticket'))
      )) {
        // Use a timeout to avoid calling fetchTickets before it's defined
        setTimeout(() => {
          if (typeof fetchTickets === 'function') {
            fetchTickets();
          }
        }, 100);
      }
    } catch (error) {
      // Only log parsing errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, []);

  const handleWebSocketError = useCallback((error) => {
    // Only log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('WebSocket error:', error);
    }
  }, []);

  const handleWebSocketOpen = useCallback(() => {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('WebSocket connected for tickets');
    }
  }, []);

  const handleWebSocketClose = useCallback((event) => {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('WebSocket disconnected for tickets:', event.code);
    }
  }, []);

  // WebSocket connection
  const { sendMessage } = useWebSocket(wsUrl, handleWebSocketMessage, handleWebSocketError, handleWebSocketOpen, handleWebSocketClose);

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

  useEffect(() => {
    fetchTickets();
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
        showToast('Ticket updated successfully', 'success');
      } else {
        await api.post('/tickets/', values);
        showToast('Ticket created successfully', 'success');
      }
      fetchTickets();
      handleClose();
    } catch (err) {
      console.error('Error saving ticket:', err);
      showToast('Error saving ticket', 'error');
    }
  };

  const handleDelete = (ticket) => {
    setSelectedTicket(ticket);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/tickets/${selectedTicket.ticket_id}`);
      showToast('Ticket deleted successfully', 'success');
      fetchTickets();
      setDeleteDialogOpen(false);
      setSelectedTicket(null);
    } catch (err) {
      console.error('Error deleting ticket:', err);
      showToast('Error deleting ticket', 'error');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await api.put(`/tickets/${ticketId}`, { status: newStatus });
      showToast('Status updated successfully', 'success');
      fetchTickets();
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Error updating status', 'error');
    }
  };

  const handleClaim = async (ticketId) => {
    try {
      await api.put(`/tickets/${ticketId}/claim`, { claimed_by: user.user_id });
      showToast('Ticket claimed successfully', 'success');
      // Use a timeout to ensure fetchTickets is available
      setTimeout(() => {
        if (typeof fetchTickets === 'function') {
          fetchTickets();
        }
      }, 100);
    } catch (err) {
      console.error('Error claiming ticket:', err);
      if (err.response?.status === 422) {
        showToast('Invalid ticket data. Please check the ticket information.', 'error');
      } else {
        showToast('Error claiming ticket', 'error');
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

  // Filter and sort tickets
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = (tickets || []).filter(ticket => {
      // Search filter
      if (filters.search && !ticket.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !ticket.ticket_id.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Type filter
      if (filters.type !== 'all' && ticket.type !== filters.type) {
        return false;
      }
      
      // Status filter
      if (filters.status !== 'all' && ticket.status !== filters.status) {
        return false;
      }
      
      // Priority filter
      if (filters.priority !== 'all' && ticket.priority !== filters.priority) {
        return false;
      }
      
      // Assigned to filter
      if (filters.assignedTo !== 'all' && ticket.assigned_to !== filters.assignedTo) {
        return false;
      }
      
      // Site filter
      if (filters.site !== 'all' && ticket.site_id !== filters.site) {
        return false;
      }
      
      // Date filters
      if (filters.dateFrom && dayjs(ticket.created_at).isBefore(dayjs(filters.dateFrom))) {
        return false;
      }
      
      if (filters.dateTo && dayjs(ticket.created_at).isAfter(dayjs(filters.dateTo))) {
        return false;
      }
      
      return true;
    });

    // Sort by priority first, then by creation date
    filtered.sort((a, b) => {
      const priorityOrder = { emergency: 0, critical: 1, normal: 2 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return filtered;
  }, [tickets, filters, sites]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      status: 'all',
      priority: 'all',
      assignedTo: 'all',
      site: 'all',
      dateFrom: '',
      dateTo: ''
    });
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
          {ticket.assigned_to ? getAssignedUserName(ticket.assigned_to) : 'Unassigned'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap>
          {dayjs(ticket.created_at).format('MMM D, YYYY')}
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

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                label="Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="inhouse">Inhouse</MenuItem>
                <MenuItem value="onsite">Onsite</MenuItem>
                <MenuItem value="projects">Projects</MenuItem>
                <MenuItem value="misc">Misc</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="checked_in">Checked In</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="needs_parts">Needs Parts</MenuItem>
                <MenuItem value="go_back_scheduled">Go-back Scheduled</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
                <MenuItem value="planning">Planning</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                label="Priority"
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearFilters}
              size="small"
            >
              Clear
            </Button>
          </Grid>
        </Grid>
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
        <Grid container spacing={2}>
          {filteredAndSortedTickets
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map(ticket => (
              <Grid item xs={12} sm={6} md={4} key={ticket.ticket_id}>
                <Card sx={{ 
                  border: ticket.priority === 'emergency' ? '2px solid #f44336' : 
                          ticket.priority === 'critical' ? '2px solid #ff9800' : '1px solid #e0e0e0' 
                }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getTypeIcon(ticket.type)}
                        <ClickableTicketId ticketId={ticket.ticket_id} />
                        {getPriorityIcon(ticket.priority)}
                      </Box>
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {ticket.notes ? (ticket.notes.length > 100 ? ticket.notes.substring(0, 100) + '...' : ticket.notes) : 'No description'}
                    </Typography>
                    
                    <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                      <Chip 
                        label={getTypeLabel(ticket.type)} 
                        size="small" 
                        variant="outlined"
                      />
                      <Chip 
                        label={getPriorityLabel(ticket.priority)} 
                        size="small" 
                        color={getPriorityColor(ticket.priority)}
                        variant={ticket.priority === 'normal' ? 'outlined' : 'filled'}
                      />
                      <Chip 
                        label={getStatusLabel(ticket.status)} 
                        size="small" 
                        color={getStatusColor(ticket.status)}
                      />
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary">
                      {getSiteName(ticket.site_id)} • {dayjs(ticket.created_at).format('MMM D, YYYY')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
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