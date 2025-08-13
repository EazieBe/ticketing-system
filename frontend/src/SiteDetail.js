import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, CircularProgress, Divider, Accordion, AccordionSummary,
  AccordionDetails, List, ListItem, ListItemText, ListItemIcon, Badge, Tooltip,
  CardActions, Person, Save, Close, ExpandMore, TrendingUp, Error, Info, Phone, LocationOn,
  Paper, Tabs, Tab, ToggleButton, ToggleButtonGroup,
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Pagination,
  Alert, Card, CardContent, Chip, Snackbar
} from '@mui/material';
import {
  Edit, Delete, Visibility, Business, Schedule, CheckCircle, Cancel, Warning,
  LocalShipping, Build, Inventory, Flag, FlagOutlined, Star, StarBorder,
  Notifications, ExpandMore as ExpandMoreIcon, Store, Assignment, Sort, Search, CalendarToday
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import dayjs from 'dayjs';
import SiteForm from './SiteForm';

function SiteDetail() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [site, setSite] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Filtering and pagination
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('');
  const [ticketDateFilter, setTicketDateFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage, setTicketsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('date_created');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Edit state
  const [editDialog, setEditDialog] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // View modes
  const [ticketViewMode, setTicketViewMode] = useState('table'); // 'table' or 'list'

  const handleEdit = () => {
    setEditDialog(true);
  };

  const handleSave = async (values) => {
    try {
      await api.put(`/sites/${site.site_id}`, values);
      setEditDialog(false);
      setEditSuccess(true);
      fetchSiteData();
    } catch (err) {
      console.error('Error updating site:', err);
    }
  };

  const fetchSiteData = async () => {
    try {
      setLoading(true);
      const [siteResponse, ticketsResponse, shipmentsResponse, equipmentResponse] = await Promise.all([
        api.get(`/sites/${siteId}`),
        api.get(`/tickets/?site_id=${siteId}`),
        api.get(`/shipments/?site_id=${siteId}`),
        api.get(`/equipment/?site_id=${siteId}`)
      ]);
      
      setSite(siteResponse || {});
      setTickets(ticketsResponse || []);
      setShipments(shipmentsResponse || []);
      setEquipment(equipmentResponse || []);
    } catch (err) {
      setError('Failed to load site data');
      console.error('Error fetching site data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteData();
  }, [siteId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'primary';
      case 'in_progress': return 'warning';
      case 'pending': return 'default';
      case 'closed': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // Filter and sort tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !ticketSearch || 
      ticket.ticket_id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      ticket.inc_number?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      ticket.type?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      ticket.status?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      ticket.notes?.toLowerCase().includes(ticketSearch.toLowerCase());
    
    const matchesStatus = !ticketStatusFilter || ticket.status === ticketStatusFilter;
    const matchesType = !ticketTypeFilter || ticket.type === ticketTypeFilter;
    const matchesPriority = !ticketPriorityFilter || ticket.priority?.toLowerCase() === ticketPriorityFilter.toLowerCase();
    
    // Date filtering
    let matchesDate = true;
    if (ticketDateFilter && ticket.date_created) {
      const ticketDate = dayjs(ticket.date_created);
      const now = dayjs();
      if (ticketDateFilter === 'today') {
        matchesDate = ticketDate.isSame(now, 'day');
      } else if (ticketDateFilter === 'week') {
        matchesDate = ticketDate.isAfter(now.subtract(7, 'day'));
      } else if (ticketDateFilter === 'month') {
        matchesDate = ticketDate.isAfter(now.subtract(30, 'day'));
      } else if (ticketDateFilter === 'quarter') {
        matchesDate = ticketDate.isAfter(now.subtract(90, 'day'));
      }
    }
    
    // Archive filtering
    const isArchived = ticket.status === 'closed' && dayjs(ticket.date_created).isBefore(dayjs().subtract(30, 'day'));
    const matchesArchive = showArchived ? true : !isArchived;
    
    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesDate && matchesArchive;
  });

  // Sort tickets
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'date_created' || sortBy === 'date_updated') {
      aValue = dayjs(aValue);
      bValue = dayjs(bValue);
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Paginate tickets
  const paginatedTickets = sortedTickets.slice(
    (currentPage - 1) * ticketsPerPage,
    currentPage * ticketsPerPage
  );

  const totalPages = Math.ceil(sortedTickets.length / ticketsPerPage);
  
  // Statistics
  const openTickets = tickets.filter(t => t.status !== 'closed');
  const closedTickets = tickets.filter(t => t.status === 'closed');
  const highPriorityTickets = tickets.filter(t => t.priority?.toLowerCase() === 'high');
  const overdueTickets = tickets.filter(t => {
    if (t.status === 'closed') return false;
    const created = dayjs(t.date_created);
    const now = dayjs();
    return now.diff(created, 'day') > 7; // Overdue if older than 7 days
  });

  // Clickable stat card handlers
  const handleStatCardClick = (filterType, value) => {
    setTicketStatusFilter(filterType === 'status' ? value : '');
    setTicketPriorityFilter(filterType === 'priority' ? value : '');
    setActiveTab(0); // Switch to tickets tab
    setCurrentPage(1);
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
      <CircularProgress />
    </Box>
  );
  
  if (error) return (
    <Box p={3}>
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={fetchSiteData}>Retry</Button>}>
        {error}
      </Alert>
    </Box>
  );

  if (!site) return null;

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Grid container spacing={3}>
        {/* Site Header */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center">
                <Store sx={{ mr: 1.5, color: 'primary.main', fontSize: 24 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {site.site_id}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {site.location || 'Location not specified'}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={handleEdit}
                size="small"
              >
                Edit Site
              </Button>
            </Box>

            {/* Quick Info Grid */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Brand</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {site.brand || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">IP Address</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {site.ip_address || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Main Number</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {site.main_number || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Region</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {site.region || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Address, Equipment, and Notes */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
                    Address
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Service Address</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {site.service_address || 'Not specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">City/State/ZIP</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {site.city && site.state && site.zip 
                        ? `${site.city}, ${site.state} ${site.zip}`
                        : 'Not specified'
                      }
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Manager</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {site.mp || 'Not specified'}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
                    Equipment
                  </Typography>
                  {site.phone_system && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Phone System</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {site.phone_system}
                      </Typography>
                    </Box>
                  )}
                  {site.phone_types && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Phone Types</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {site.phone_types}
                      </Typography>
                    </Box>
                  )}
                  {site.network_equipment && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Network</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {site.network_equipment}
                      </Typography>
                    </Box>
                  )}
                  {site.additional_equipment && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Additional</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {site.additional_equipment}
                      </Typography>
                    </Box>
                  )}
                  {!site.phone_system && !site.phone_types && !site.network_equipment && !site.additional_equipment && (
                    <Typography variant="body2" color="text.secondary">
                      No equipment info
                    </Typography>
                  )}
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
                    Notes
                  </Typography>
                  {site.notes ? (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                      {site.notes}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No general notes
                    </Typography>
                  )}
                  {site.equipment_notes && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">Equipment Notes</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                        {site.equipment_notes}
                      </Typography>
                    </Box>
                  )}
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Clickable Statistics Cards */}
        <Grid item xs={12}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    transform: 'translateY(-2px)', 
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)' 
                  }
                }}
                onClick={() => handleStatCardClick('status', 'open')}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box display="flex" alignItems="center">
                    <Badge badgeContent={openTickets.length} color="primary">
                      <Assignment sx={{ mr: 1, color: 'primary.main' }} />
                    </Badge>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>{openTickets.length}</Typography>
                      <Typography variant="body2" color="text.secondary">Open Tickets</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    transform: 'translateY(-2px)', 
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)' 
                  }
                }}
                onClick={() => handleStatCardClick('status', 'closed')}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box display="flex" alignItems="center">
                    <Badge badgeContent={closedTickets.length} color="success">
                      <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                    </Badge>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>{closedTickets.length}</Typography>
                      <Typography variant="body2" color="text.secondary">Closed Tickets</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    transform: 'translateY(-2px)', 
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)' 
                  }
                }}
                onClick={() => handleStatCardClick('priority', 'high')}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box display="flex" alignItems="center">
                    <Badge badgeContent={highPriorityTickets.length} color="error">
                      <Warning sx={{ mr: 1, color: 'error.main' }} />
                    </Badge>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>{highPriorityTickets.length}</Typography>
                      <Typography variant="body2" color="text.secondary">High Priority</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    transform: 'translateY(-2px)', 
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)' 
                  }
                }}
                onClick={() => handleStatCardClick('overdue', 'overdue')}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box display="flex" alignItems="center">
                    <Badge badgeContent={overdueTickets.length} color="warning">
                      <Schedule sx={{ mr: 1, color: 'warning.main' }} />
                    </Badge>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>{overdueTickets.length}</Typography>
                      <Typography variant="body2" color="text.secondary">Overdue</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Content Tabs */}
        <Grid item xs={12}>
          <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab 
                label={
                  <Box display="flex" alignItems="center">
                    <Assignment sx={{ mr: 1 }} />
                    Tickets ({tickets.length})
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box display="flex" alignItems="center">
                    <LocalShipping sx={{ mr: 1 }} />
                    Shipments ({shipments.length})
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box display="flex" alignItems="center">
                    <Business sx={{ mr: 1 }} />
                    Equipment ({equipment.length})
                  </Box>
                } 
              />
            </Tabs>

            {/* Tickets Tab */}
            {activeTab === 0 && (
              <Box sx={{ p: 3 }}>
                {/* Enhanced Filters */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search tickets..."
                      value={ticketSearch}
                      onChange={(e) => setTicketSearch(e.target.value)}
                      InputProps={{
                        startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={ticketStatusFilter}
                        label="Status"
                        onChange={(e) => setTicketStatusFilter(e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="open">Open</MenuItem>
                        <MenuItem value="assigned">Assigned</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="closed">Closed</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={ticketTypeFilter}
                        label="Type"
                        onChange={(e) => setTicketTypeFilter(e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="hardware">Hardware</MenuItem>
                        <MenuItem value="software">Software</MenuItem>
                        <MenuItem value="network">Network</MenuItem>
                        <MenuItem value="phone">Phone</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={ticketPriorityFilter}
                        label="Priority"
                        onChange={(e) => setTicketPriorityFilter(e.target.value)}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Date</InputLabel>
                      <Select
                        value={ticketDateFilter}
                        label="Date"
                        onChange={(e) => setTicketDateFilter(e.target.value)}
                      >
                        <MenuItem value="">All Time</MenuItem>
                        <MenuItem value="today">Today</MenuItem>
                        <MenuItem value="week">This Week</MenuItem>
                        <MenuItem value="month">This Month</MenuItem>
                        <MenuItem value="quarter">This Quarter</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={3} md={1}>
                    <ToggleButton
                      value="archived"
                      selected={showArchived}
                      onChange={() => setShowArchived(!showArchived)}
                      size="small"
                      sx={{ height: 40 }}
                    >
                      <Tooltip title={showArchived ? "Hide Archived" : "Show Archived"}>
                        <CalendarToday />
                      </Tooltip>
                    </ToggleButton>
                  </Grid>
                </Grid>

                {/* View Controls */}
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <ToggleButtonGroup
                      value={ticketViewMode}
                      exclusive
                      onChange={(e, value) => value && setTicketViewMode(value)}
                      size="small"
                    >
                      <ToggleButton value="table">
                        <Tooltip title="Table View">
                          <Table />
                        </Tooltip>
                      </ToggleButton>
                      <ToggleButton value="list">
                        <Tooltip title="List View">
                          <List />
                        </Tooltip>
                      </ToggleButton>
                    </ToggleButtonGroup>
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={sortBy}
                        label="Sort By"
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <MenuItem value="date_created">Created Date</MenuItem>
                        <MenuItem value="date_updated">Updated Date</MenuItem>
                        <MenuItem value="priority">Priority</MenuItem>
                        <MenuItem value="status">Status</MenuItem>
                        <MenuItem value="type">Type</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <IconButton 
                      size="small" 
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      <Sort sx={{ transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none' }} />
                    </IconButton>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary">
                      {sortedTickets.length} tickets
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={ticketsPerPage}
                        onChange={(e) => setTicketsPerPage(e.target.value)}
                      >
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={25}>25</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                        <MenuItem value={100}>100</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                {/* Tickets Display */}
                {ticketViewMode === 'table' ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Ticket ID</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>INC#</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Updated</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedTickets.map((ticket) => (
                          <TableRow key={ticket.ticket_id} hover>
                            <TableCell>
                              <Button
                                component={Link}
                                to={`/tickets/${ticket.ticket_id}`}
                                size="small"
                                sx={{ textTransform: 'none', fontFamily: 'monospace' }}
                              >
                                {ticket.ticket_id.substring(0, 8)}...
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {ticket.inc_number || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={ticket.type} size="small" color="primary" />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={ticket.status} 
                                size="small" 
                                color={getStatusColor(ticket.status)}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={ticket.priority || 'N/A'} 
                                size="small" 
                                color={getPriorityColor(ticket.priority)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {dayjs(ticket.date_created).format('MM/DD/YY')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {dayjs(ticket.date_updated).format('MM/DD/YY')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton
                                component={Link}
                                to={`/tickets/${ticket.ticket_id}`}
                                size="small"
                              >
                                <Visibility />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <List>
                    {paginatedTickets.map((ticket) => (
                      <React.Fragment key={ticket.ticket_id}>
                        <ListItem>
                          <ListItemIcon>
                            <Assignment color={getStatusColor(ticket.status)} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Button
                                  component={Link}
                                  to={`/tickets/${ticket.ticket_id}`}
                                  size="small"
                                  sx={{ textTransform: 'none', fontFamily: 'monospace' }}
                                >
                                  {ticket.ticket_id.substring(0, 8)}...
                                </Button>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                  {ticket.inc_number || 'N/A'}
                                </Typography>
                                <Chip label={ticket.type} size="small" color="primary" />
                                <Chip 
                                  label={ticket.status} 
                                  size="small" 
                                  color={getStatusColor(ticket.status)}
                                />
                                <Chip 
                                  label={ticket.priority || 'N/A'} 
                                  size="small" 
                                  color={getPriorityColor(ticket.priority)}
                                />
                              </Box>
                            }
                            secondary={
                              <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                                <Typography variant="caption" color="text.secondary">
                                  Created: {dayjs(ticket.date_created).format('MM/DD/YY HH:mm')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Updated: {dayjs(ticket.date_updated).format('MM/DD/YY HH:mm')}
                                </Typography>
                                {ticket.notes && (
                                  <Typography variant="caption" color="text.secondary" sx={{ 
                                    maxWidth: 200, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap' 
                                  }}>
                                    {ticket.notes}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                          <IconButton
                            component={Link}
                            to={`/tickets/${ticket.ticket_id}`}
                            size="small"
                          >
                            <Visibility />
                          </IconButton>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box display="flex" justifyContent="center" mt={3}>
                    <Pagination
                      count={totalPages}
                      page={currentPage}
                      onChange={(e, page) => setCurrentPage(page)}
                      color="primary"
                    />
                  </Box>
                )}
              </Box>
            )}

            {/* Shipments Tab */}
            {activeTab === 1 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Shipments</Typography>
                {shipments.length === 0 ? (
                  <Typography color="text.secondary">No shipments found for this site.</Typography>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Shipment ID</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {shipments.map((shipment) => (
                          <TableRow key={shipment.shipment_id}>
                            <TableCell>{shipment.shipment_id}</TableCell>
                            <TableCell>
                              <Chip label={shipment.status} size="small" color="primary" />
                            </TableCell>
                            <TableCell>{shipment.type}</TableCell>
                            <TableCell>{dayjs(shipment.date_created).format('MM/DD/YY')}</TableCell>
                            <TableCell>
                              <IconButton
                                component={Link}
                                to={`/shipments/${shipment.shipment_id}`}
                                size="small"
                              >
                                <Visibility />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Equipment Tab */}
            {activeTab === 2 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Equipment</Typography>
                {equipment.length === 0 ? (
                  <Typography color="text.secondary">No equipment found for this site.</Typography>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Equipment ID</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {equipment.map((item) => (
                          <TableRow key={item.equipment_id}>
                            <TableCell>{item.equipment_id}</TableCell>
                            <TableCell>{item.type}</TableCell>
                            <TableCell>
                              <Chip label={item.status} size="small" color="primary" />
                            </TableCell>
                            <TableCell>{dayjs(item.date_created).format('MM/DD/YY')}</TableCell>
                            <TableCell>
                              <IconButton
                                component={Link}
                                to={`/equipment/${item.equipment_id}`}
                                size="small"
                              >
                                <Visibility />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialog} 
        onClose={() => setEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Site</DialogTitle>
        <DialogContent>
          <SiteForm
            initialValues={site}
            onSubmit={handleSave}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={editSuccess}
        autoHideDuration={3000}
        onClose={() => setEditSuccess(false)}
      >
        <Alert onClose={() => setEditSuccess(false)} severity="success">
          Site updated successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SiteDetail; 