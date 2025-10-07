import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Notifications, ExpandMore as ExpandMoreIcon, Store, Assignment, Sort, Search, CalendarToday,
  OpenInNew, Add
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import dayjs from 'dayjs';
import SiteForm from './SiteForm';
import TicketFilters from './components/TicketFilters';
import { filterTickets, getDefaultFilters } from './utils/filterTickets';
import { useDataSync } from './contexts/DataSyncContext';
import { TimestampDisplay } from './components/TimestampDisplay';
import { getBestTimestamp } from './utils/timezone';

function SiteDetail() {
  const { site_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const { success } = useToast();
  const { updateTrigger: ticketUpdateTrigger } = useDataSync('tickets');
  const { updateTrigger: shipmentUpdateTrigger } = useDataSync('shipments');
  const [site, setSite] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Filtering and pagination - using unified filter system
  const [ticketFilters, setTicketFilters] = useState(getDefaultFilters());
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage, setTicketsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('created_at');
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

  const fetchSiteData = useCallback(async () => {
    // Don't fetch if component is unmounted
    if (!isMountedRef.current) {
      console.log('Component unmounted, skipping site data fetch');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const [siteResponse, ticketsResponse, shipmentsResponse, equipmentResponse] = await Promise.all([
        api.get(`/sites/${site_id}`),
        api.get(`/tickets/?site_id=${site_id}`),
        api.get(`/sites/${site_id}/shipments`),
        api.get(`/equipment/?site_id=${site_id}`)
      ]);
      
      if (isMountedRef.current) {
        setSite(siteResponse || {});
        setTickets(ticketsResponse || []);
        setShipments(shipmentsResponse || []);
        setEquipment(equipmentResponse || []);
      }
    } catch (err) {
      setError('Failed to load site data');
      console.error('Error fetching site data:', err);
    } finally {
      setLoading(false);
    }
  }, [site_id]);

  useEffect(() => {
    fetchSiteData();
  }, [fetchSiteData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-refresh tickets when DataSync triggers update
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const ticketsResponse = await api.get(`/tickets/?site_id=${site_id}`);
        setTickets(ticketsResponse || []);
      } catch (err) {
        console.error('Error auto-refreshing tickets:', err);
      }
    };
    
    if (ticketUpdateTrigger > 0) {
      fetchTickets();
    }
  }, [ticketUpdateTrigger, site_id, api]);

  // Auto-refresh shipments when DataSync triggers update
  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const shipmentsResponse = await api.get(`/sites/${site_id}/shipments`);
        setShipments(shipmentsResponse || []);
      } catch (err) {
        console.error('Error auto-refreshing shipments:', err);
      }
    };
    
    if (shipmentUpdateTrigger > 0) {
      fetchShipments();
    }
  }, [shipmentUpdateTrigger, site_id, api]);

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

  // Filter and sort tickets - using unified filter system
  const filteredTickets = (() => {
    let filtered = filterTickets(tickets, ticketFilters);
    
    // Archive filtering (site-specific)
    if (!showArchived) {
      const isArchived = (ticket) => {
        if (ticket.status !== 'closed') return false;
        const timestamp = getBestTimestamp(ticket, 'tickets');
        return timestamp ? dayjs(timestamp).isBefore(dayjs().subtract(30, 'day')) : false;
      };
      filtered = filtered.filter(ticket => !isArchived(ticket));
    }
    
    return filtered;
  })();

  // Sort tickets
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'created_at' || sortBy === 'date_created' || sortBy === 'date_updated') {
      // For timestamp fields, get the best available timestamp
      if (sortBy === 'created_at' || sortBy === 'date_created') {
        aValue = getBestTimestamp(a, 'tickets');
        bValue = getBestTimestamp(b, 'tickets');
      }
      aValue = aValue ? dayjs(aValue) : dayjs(0);
      bValue = bValue ? dayjs(bValue) : dayjs(0);
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
    const timestamp = getBestTimestamp(t, 'tickets');
    if (!timestamp) return false;
    const created = dayjs(timestamp);
    const now = dayjs();
    return now.diff(created, 'day') > 7; // Overdue if older than 7 days
  });

  // Clickable stat card handlers
  const handleStatCardClick = (filterType, value) => {
    if (filterType === 'status') {
      setTicketFilters({ ...ticketFilters, status: value });
    } else if (filterType === 'priority') {
      setTicketFilters({ ...ticketFilters, priority: value });
    }
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
                {/* Unified Ticket Filters */}
                <Box sx={{ mb: 3 }}>
                  <TicketFilters
                    filters={ticketFilters}
                    onFilterChange={(newFilters) => {
                      setTicketFilters(newFilters);
                      setCurrentPage(1); // Reset to first page when filters change
                    }}
                    compact={true}
                  />
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ToggleButton
                      value="archived"
                      selected={showArchived}
                      onChange={() => setShowArchived(!showArchived)}
                      size="small"
                    >
                      <Tooltip title={showArchived ? "Hide Archived" : "Show Archived"}>
                        <CalendarToday sx={{ mr: 1 }} />
                        {showArchived ? 'Hide' : 'Show'} Archived
                      </Tooltip>
                    </ToggleButton>
                  </Box>
                </Box>

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
                        <MenuItem value="created_at">Created Date</MenuItem>
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
                              <TimestampDisplay 
                                entity={ticket} 
                                entityType="tickets" 
                                format="absolute"
                                variant="body2"
                              />
                            </TableCell>
                            <TableCell>
                              <TimestampDisplay 
                                entity={ticket} 
                                entityType="tickets" 
                                format="absolute"
                                variant="body2"
                                fallback="N/A"
                              />
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
                                  Created: <TimestampDisplay entity={ticket} entityType="tickets" format="absolute" variant="caption" />
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Updated: <TimestampDisplay entity={ticket} entityType="tickets" format="absolute" variant="caption" fallback="N/A" />
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Shipment History</Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<Add />}
                    onClick={() => navigate('/shipments', { state: { newShipmentSiteId: site_id } })}
                  >
                    Add Shipment
                  </Button>
                </Box>
                
                {shipments.length === 0 ? (
                  <Typography color="text.secondary">No shipments found for this site.</Typography>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Shipment ID</TableCell>
                          <TableCell>What is Being Shipped</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Priority</TableCell>
                          <TableCell>Charges</TableCell>
                          <TableCell>Tracking</TableCell>
                          <TableCell>Date Created</TableCell>
                          <TableCell>Date Shipped</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {shipments.map((shipment) => (
                          <TableRow 
                            key={shipment.shipment_id}
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                            }}
                            onClick={() => navigate('/shipments', { state: { editShipmentId: shipment.shipment_id } })}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {shipment.shipment_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {shipment.what_is_being_shipped}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={shipment.status || 'pending'} 
                                size="small" 
                                color={
                                  shipment.status === 'pending' ? 'warning' :
                                  shipment.status === 'shipped' ? 'info' :
                                  shipment.status === 'delivered' ? 'success' : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={shipment.shipping_priority || 'normal'}
                                size="small"
                                color={shipment.shipping_priority === 'urgent' ? 'error' : 
                                       shipment.shipping_priority === 'critical' ? 'error' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                Out: ${shipment.charges_out || 0}<br/>
                                In: ${shipment.charges_in || 0}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {shipment.tracking_number && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="caption" sx={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {shipment.tracking_number}
                                    </Typography>
                                    <Tooltip title="Track on FedEx">
                                      <IconButton 
                                        size="small" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(`https://www.fedex.com/fedextrack/?trknbr=${shipment.tracking_number}`, '_blank');
                                        }}
                                      >
                                        <OpenInNew fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                )}
                                {shipment.return_tracking && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="caption" sx={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      R: {shipment.return_tracking}
                                    </Typography>
                                    <Tooltip title="Track Return on FedEx">
                                      <IconButton 
                                        size="small" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(`https://www.fedex.com/fedextrack/?trknbr=${shipment.return_tracking}`, '_blank');
                                        }}
                                      >
                                        <OpenInNew fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <TimestampDisplay 
                                entity={shipment} 
                                entityType="shipments" 
                                format="absolute"
                                fallback="-"
                              />
                            </TableCell>
                            <TableCell>
                              {shipment.date_shipped ? dayjs(shipment.date_shipped).format('MM/DD/YY') : '-'}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate('/shipments', { state: { editShipmentId: shipment.shipment_id } });
                                    }}
                                  >
                                    <Visibility />
                                  </IconButton>
                                </Tooltip>
                              </Box>
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
                            <TableCell>
                              <TimestampDisplay 
                                entity={item} 
                                entityType="site_equipment" 
                                format="absolute"
                                fallback="N/A"
                              />
                            </TableCell>
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