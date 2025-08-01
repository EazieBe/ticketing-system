import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Avatar,
  AvatarGroup,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Fab,
  Skeleton,
  Grid,
  Stack,
  AlertTitle
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Assignment,
  Person,
  Schedule,
  PriorityHigh,
  CheckCircle,
  Cancel,
  Visibility,
  Edit,
  Delete,
  Archive,
  Unarchive,
  Refresh,
  Clear,
  Download,
  Upload,
  Business,
  LocalShipping,
  Build,
  Phone,
  NetworkCheck,
  ExpandMore,
  ExpandLess,
  Sort,
  ViewList,
  ViewModule,
  DragIndicator,
  Star,
  StarBorder,
  Notifications,
  NotificationsOff,
  Flag,
  FlagOutlined
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from './axiosConfig';
import { useAuth } from './AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import TicketForm from './TicketForm';

dayjs.extend(relativeTime);

function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTicket, setDeleteTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  
  // Modern UI State
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'
  const [groupBy, setGroupBy] = useState('status'); // 'status', 'type', 'priority', 'assigned'
  const [sortBy, setSortBy] = useState('date_created'); // 'date_created', 'priority', 'status'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [expandedGroups, setExpandedGroups] = useState(new Set(['open', 'in_progress']));
  
  // Filtering and Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssigned, setFilterAssigned] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  
  // Context Menus
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const typeOptions = [
    { value: 'inhouse', label: 'In House', icon: '🏢', color: '#1976d2' },
    { value: 'onsite', label: 'On Site', icon: '📍', color: '#388e3c' },
    { value: 'shipping', label: 'Shipping', icon: '📦', color: '#f57c00' },
    { value: 'projects', label: 'Projects', icon: '📋', color: '#7b1fa2' },
    { value: 'nro', label: 'NRO', icon: '⚡', color: '#d32f2f' },
    { value: 'misc', label: 'Misc', icon: '🔧', color: '#5d4037' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: '#4caf50', icon: '🟢' },
    { value: 'medium', label: 'Medium', color: '#ff9800', icon: '🟡' },
    { value: 'high', label: 'High', color: '#f44336', icon: '🔴' },
    { value: 'urgent', label: 'Urgent', color: '#9c27b0', icon: '🟣' }
  ];

  const getStatusOptions = (ticketType) => {
    const baseOptions = [
      { value: 'open', label: 'Open', color: '#1976d2', icon: '🔵' },
      { value: 'in_progress', label: 'In Progress', color: '#388e3c', icon: '🟢' },
      { value: 'pending', label: 'Pending', color: '#ff9800', icon: '🟡' },
      { value: 'closed', label: 'Closed', color: '#757575', icon: '⚫' }
    ];

    if (ticketType === 'inhouse') {
      return [...baseOptions, { value: 'approved', label: 'Approved', color: '#4caf50', icon: '✅' }];
    } else if (ticketType === 'onsite') {
      return [...baseOptions, 
        { value: 'checked_in', label: 'Checked In', color: '#00bcd4', icon: '📍' },
        { value: 'return_visit', label: 'Return Visit', color: '#ff9800', icon: '🔄' }
      ];
    } else if (ticketType === 'shipping') {
      return [...baseOptions,
        { value: 'shipped', label: 'Shipped', color: '#00bcd4', icon: '📦' },
        { value: 'delivered', label: 'Delivered', color: '#4caf50', icon: '📬' }
      ];
    } else if (ticketType === 'projects') {
      return [...baseOptions,
        { value: 'planning', label: 'Planning', color: '#00bcd4', icon: '📋' },
        { value: 'review', label: 'Review', color: '#ff9800', icon: '👀' },
        { value: 'completed', label: 'Completed', color: '#4caf50', icon: '✅' }
      ];
    }
    
    return baseOptions;
  };

  useEffect(() => {
    fetchTickets();
    fetchUsers();
    fetchSites();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get('/tickets/');
      setTickets(response.data);
    } catch (err) {
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await api.get('/sites/');
      setSites(response.data);
    } catch (err) {
      console.error('Failed to load sites:', err);
    }
  };

  const handleAdd = () => {
    setEditingTicket(null);
    setDialog(true);
  };

  const handleEdit = (ticket) => {
    setEditingTicket(ticket);
    setDialog(true);
  };

  const handleClose = () => {
    setDialog(false);
    setEditingTicket(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingTicket) {
        const response = await api.put(`/tickets/${editingTicket.ticket_id}`, values);
        // Update the ticket in the local state immediately
        setTickets(prevTickets => prevTickets.map(t => 
          t.ticket_id === editingTicket.ticket_id ? response.data : t
        ));
        setSuccessMessage('Ticket updated successfully!');
      } else {
        const response = await api.post('/tickets/', values);
        // Add the new ticket to the local state immediately
        setTickets(prevTickets => [...prevTickets, response.data]);
        setSuccessMessage('Ticket created successfully!');
      }
      handleClose();
      setError(null);
    } catch (err) {
      setError('Failed to save ticket');
    }
  };

  const handleDelete = (ticket) => {
    setDeleteTicket(ticket);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTicket) return;
    
    try {
      await api.delete(`/tickets/${deleteTicket.ticket_id}`, { data: {} });
      setDeleteDialog(false);
      // Remove the ticket from the local state immediately
      setTickets(prevTickets => prevTickets.filter(t => t.ticket_id !== deleteTicket.ticket_id));
      setDeleteTicket(null);
      setSuccessMessage('Ticket deleted successfully!');
      setError(null);
    } catch (err) {
      setError('Failed to delete ticket');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const response = await api.patch(`/tickets/${ticketId}/status`, { status: newStatus });
      // Update the ticket in the local state immediately
      setTickets(prevTickets => prevTickets.map(t => 
        t.ticket_id === ticketId ? response.data : t
      ));
      setSuccessMessage(`Ticket status updated to ${newStatus}!`);
      setError(null);
    } catch (err) {
      setError('Failed to update ticket status');
    }
  };

  const handleClaim = async (ticketId) => {
    try {
      const response = await api.put(`/tickets/${ticketId}`, {
        status: 'in_progress',
        assigned_user_id: user.user_id
      });
      // Update the ticket in the local state immediately
      setTickets(prevTickets => prevTickets.map(t => 
        t.ticket_id === ticketId ? response.data : t
      ));
      setSuccessMessage('Ticket claimed successfully!');
      setError(null);
    } catch (err) {
      setError('Failed to claim ticket');
    }
  };

  const getSiteName = (siteId) => {
    if (!siteId || !sites || sites.length === 0) {
      return 'Unknown Site';
    }
    const site = sites.find(s => s.site_id === siteId);
    return site ? site.location : 'Unknown Site';
  };

  const getAssignedUserName = (userId) => {
    if (!userId || !users || users.length === 0) {
      return 'Unassigned';
    }
    const user = users.find(u => u.user_id === userId);
    return user ? user.name : 'Unassigned';
  };

  const getTypeLabel = (type) => {
    const option = typeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  const getPriorityLabel = (priority) => {
    const option = priorityOptions.find(opt => opt.value === priority);
    return option ? option.label : priority;
  };

  const getStatusLabel = (status) => {
    const option = getStatusOptions('').find(opt => opt.value === status);
    return option ? option.label : status;
  };

  // Filter and sort tickets
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = tickets.filter(ticket => {
      if (!ticket) return false;
      
      try {
        const matchesSearch = !searchTerm || 
          (ticket.ticket_id && ticket.ticket_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (ticket.inc_number && ticket.inc_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (ticket.site_id && getSiteName(ticket.site_id).toLowerCase().includes(searchTerm.toLowerCase())) ||
          (ticket.notes && ticket.notes.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
        const matchesType = filterType === 'all' || ticket.type === filterType;
        const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
        const matchesAssigned = filterAssigned === 'all' || ticket.assigned_user_id === filterAssigned;
        const matchesArchive = showArchived ? true : ticket.status !== 'archived';

        return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesAssigned && matchesArchive;
      } catch (error) {
        console.error('Error filtering ticket:', error, ticket);
        return false;
      }
    });

    // Sort tickets
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'date_created' || sortBy === 'date_updated' || sortBy === 'date_scheduled') {
        aValue = dayjs(aValue);
        bValue = dayjs(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tickets, searchTerm, filterStatus, filterType, filterPriority, filterAssigned, showArchived, sortBy, sortOrder, sites, users]);

  // Group tickets
  const groupedTickets = useMemo(() => {
    const groups = {};
    
    filteredAndSortedTickets.forEach(ticket => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'status':
          groupKey = ticket.status || 'unknown';
          break;
        case 'type':
          groupKey = ticket.type || 'unknown';
          break;
        case 'priority':
          groupKey = ticket.priority || 'unknown';
          break;
        case 'assigned':
          groupKey = ticket.assigned_user_id || 'unassigned';
          break;
        default:
          groupKey = ticket.status || 'unknown';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(ticket);
    });
    
    return groups;
  }, [filteredAndSortedTickets, groupBy]);

  const handleExportCSV = () => {
    const headers = ['Ticket ID', 'INC#', 'Site', 'Type', 'Status', 'Priority', 'Assigned To', 'Created Date', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedTickets.map(ticket => [
        ticket.ticket_id,
        ticket.inc_number || '',
        getSiteName(ticket.site_id),
        ticket.type || '',
        ticket.status || '',
        ticket.priority || '',
        getAssignedUserName(ticket.assigned_user_id),
        dayjs(ticket.date_created).format('MM/DD/YYYY'),
        (ticket.notes || '').replace(/"/g, '""')
      ].map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets_${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterType('all');
    setFilterPriority('all');
    setFilterAssigned('all');
    setShowArchived(false);
  };

  const toggleGroupExpanded = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const handleContextMenu = (event, ticket) => {
    event.preventDefault();
    setContextMenu(event.currentTarget);
    setSelectedTicket(ticket);
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
    setSelectedTicket(null);
  };

  const renderTicketCard = (ticket) => {
    const typeOption = typeOptions.find(opt => opt.value === ticket.type);
    const priorityOption = priorityOptions.find(opt => opt.value === ticket.priority);
    const statusOption = getStatusOptions(ticket.type).find(opt => opt.value === ticket.status);
    
    return (
      <Card 
        key={ticket.ticket_id}
        sx={{ 
          mb: 2, 
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3
          },
          border: ticket.assigned_user_id === user?.user_id ? '2px solid #1976d2' : '1px solid #e0e0e0'
        }}
        onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#666' }}>
                {ticket.ticket_id.substring(0, 8)}...
              </Typography>
              {ticket.inc_number && (
                <Chip 
                  label={ticket.inc_number} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, ticket);
              }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>
          
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            {getSiteName(ticket.site_id)}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={typeOption?.label || ticket.type} 
              size="small" 
              sx={{ 
                backgroundColor: typeOption?.color + '20', 
                color: typeOption?.color,
                fontWeight: 600
              }}
            />
            <Chip 
              label={statusOption?.label || ticket.status} 
              size="small" 
              sx={{ 
                backgroundColor: statusOption?.color + '20', 
                color: statusOption?.color,
                fontWeight: 600
              }}
            />
            {ticket.priority && (
              <Chip 
                label={priorityOption?.label || ticket.priority} 
                size="small" 
                sx={{ 
                  backgroundColor: priorityOption?.color + '20', 
                  color: priorityOption?.color,
                  fontWeight: 600
                }}
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                {getAssignedUserName(ticket.assigned_user_id).charAt(0)}
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                {getAssignedUserName(ticket.assigned_user_id)}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {dayjs(ticket.date_created).fromNow()}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderGroupHeader = (groupKey, tickets) => {
    let title = '';
    let color = '#666';
    let icon = '📋';
    
    switch (groupBy) {
      case 'status':
        const statusOption = getStatusOptions('').find(opt => opt.value === groupKey);
        title = statusOption?.label || groupKey;
        color = statusOption?.color || '#666';
        icon = statusOption?.icon || '📋';
        break;
      case 'type':
        const typeOption = typeOptions.find(opt => opt.value === groupKey);
        title = typeOption?.label || groupKey;
        color = typeOption?.color || '#666';
        icon = typeOption?.icon || '📋';
        break;
      case 'priority':
        const priorityOption = priorityOptions.find(opt => opt.value === groupKey);
        title = priorityOption?.label || groupKey;
        color = priorityOption?.color || '#666';
        icon = priorityOption?.icon || '📋';
        break;
      case 'assigned':
        title = groupKey === 'unassigned' ? 'Unassigned' : getAssignedUserName(groupKey);
        color = '#666';
        icon = groupKey === 'unassigned' ? '👤' : '👥';
        break;
    }
    
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2,
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
          mb: 2,
          cursor: 'pointer'
        }}
        onClick={() => toggleGroupExpanded(groupKey)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ color, fontWeight: 600 }}>
            {icon} {title}
          </Typography>
          <Badge badgeContent={tickets.length} color="primary" />
        </Box>
        <IconButton size="small">
          {expandedGroups.has(groupKey) ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="rectangular" width={120} height={40} />
        </Box>
        <Grid container spacing={2}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#fafafa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ color: '#1a1a1a' }}>
          Tickets
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportCSV}
            sx={{ borderRadius: 2 }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            sx={{ borderRadius: 2 }}
          >
            New Ticket
          </Button>
        </Box>
      </Box>

      {/* Filters and Controls */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                select
                fullWidth
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                select
                fullWidth
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Type"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="all">All Types</MenuItem>
                {typeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={clearFilters}
                fullWidth
                sx={{ borderRadius: 2 }}
              >
                Clear
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, value) => value && setViewMode(value)}
                size="small"
              >
                <ToggleButton value="cards">
                  <ViewModule />
                </ToggleButton>
                <ToggleButton value="list">
                  <ViewList />
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Tickets Display */}
      {viewMode === 'cards' ? (
        <Box>
          {Object.entries(groupedTickets).map(([groupKey, groupTickets]) => (
            <Box key={groupKey}>
              {renderGroupHeader(groupKey, groupTickets)}
              {expandedGroups.has(groupKey) && (
                <Grid container spacing={2}>
                  {groupTickets.map(ticket => (
                    <Grid item xs={12} md={4} key={ticket.ticket_id}>
                      {renderTicketCard(ticket)}
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          ))}
        </Box>
      ) : (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              List view coming soon...
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleAdd}
      >
        <Add />
      </Fab>

      {/* Dialogs */}
      {dialog && (
        <Dialog 
          open={dialog} 
          onClose={handleClose} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 }
          }}
        >
          <DialogTitle>
            {editingTicket ? 'Edit Ticket' : 'Create New Ticket'}
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ p: 2 }}>
              <TicketForm
                initialValues={editingTicket}
                onSubmit={async (values) => {
                  await handleSubmit(values);
                  handleClose();
                }}
                isEdit={!!editingTicket}
              />
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Ticket</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete ticket {deleteTicket?.ticket_id}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={contextMenu}
        open={Boolean(contextMenu)}
        onClose={handleContextMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedTicket) {
            navigate(`/tickets/${selectedTicket.ticket_id}`);
          }
          handleContextMenuClose();
        }}>
          <Visibility sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedTicket) {
            handleEdit(selectedTicket);
          }
          handleContextMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedTicket) {
            handleClaim(selectedTicket.ticket_id);
          }
          handleContextMenuClose();
        }}>
          <Assignment sx={{ mr: 1 }} /> Claim
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          if (selectedTicket) {
            handleDelete(selectedTicket);
          }
          handleContextMenuClose();
        }}>
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default Tickets; 