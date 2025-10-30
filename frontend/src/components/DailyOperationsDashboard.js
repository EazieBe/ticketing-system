import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Card,
  CardContent,
  Grid,
  Badge,
  TextField,
  InputAdornment,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  CheckCircle,
  Schedule,
  Person,
  LocationOn,
  Info,
  Refresh,
  Visibility,
  Edit,
  LocalShipping,
  Add,
  Search,
  Warning,
  Error,
  CheckCircleOutline,
  Pending,
  Assignment,
  Business,
  Inventory,
  CalendarToday,
  AccessTime,
  Flag,
  FlagOutlined,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useToast } from '../contexts/ToastContext';
import useApi from '../hooks/useApi';
import LoadingSpinner from './LoadingSpinner';
import TicketFilters from './TicketFilters';
import { filterTickets, getDefaultFilters } from '../utils/filterTickets';
import { useDataSync } from '../contexts/DataSyncContext';
import { useNotifications } from '../contexts/NotificationProvider';
import { TimestampDisplay } from './TimestampDisplay';
import { getBestTimestamp, getCurrentUTCTimestamp } from '../utils/timezone';

function DailyOperationsDashboard() {
  const navigate = useNavigate();
  const { updateTrigger: ticketUpdateTrigger } = useDataSync('tickets');
  const { updateTrigger: shipmentUpdateTrigger } = useDataSync('shipments');
  const { isConnected } = useNotifications();
  const [activeTab, setActiveTab] = useState(0);
  const [tickets, setTickets] = useState({
    inhouse: [],
    onsite: [],
    projects: [],
    misc: []
  });
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getCurrentUTCTimestamp().split('T')[0]);
  const [filters, setFilters] = useState(getDefaultFilters());
  const [showCompleted, setShowCompleted] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quickStats, setQuickStats] = useState({
    totalTickets: 0,
    completedToday: 0,
    pendingTickets: 0,
    urgentTickets: 0,
    totalShipments: 0,
    pendingShipments: 0
  });

  const { get, put, loading: apiLoading } = useApi();
  const { success, error: showError } = useToast();

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const ticketTypes = [
    { key: 'inhouse', label: 'Inhouse Tickets', icon: <Person /> },
    { key: 'onsite', label: 'Onsite Tickets', icon: <LocationOn /> },
    { key: 'projects', label: 'Projects', icon: <Schedule /> },
    { key: 'misc', label: 'Misc Tickets', icon: <Info /> },
    { key: 'needs_shipping', label: 'Needs Shipping', icon: <Warning />, color: 'warning' },
    { key: 'shipping', label: 'Shipping', icon: <LocalShipping /> }
  ];

  const fetchDailyTickets = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const [ticketsResponse, shipmentsResponse] = await Promise.all([
        get(`/tickets/daily/${selectedDate}`),
        get('/shipments/')
      ]);
      
      // Group tickets by type
      const groupedTickets = {
        inhouse: [],
        onsite: [],
        projects: [],
        misc: [],
        needs_shipping: [] // Special view for tickets needing parts
      };

      // Filter out archived tickets - they go to history only
      ticketsResponse.forEach(ticket => {
        // Skip archived tickets - they're in history now
        if (ticket.status === 'archived') {
          return;
        }
        
        // Group tickets needing parts into special "needs_shipping" view
        if (ticket.status === 'needs_parts') {
          groupedTickets.needs_shipping.push(ticket);
        }
        
        // Also add to their normal type group
        if (groupedTickets[ticket.type]) {
          groupedTickets[ticket.type].push(ticket);
        }
      });

      // Sort each group by priority (emergency/critical first)
      Object.keys(groupedTickets).forEach(type => {
        groupedTickets[type].sort((a, b) => {
          const priorityOrder = { emergency: 4, critical: 3, high: 2, normal: 1, low: 0 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
      });

      // Calculate quick stats
      const allTickets = ticketsResponse;
      const today = getCurrentUTCTimestamp().split('T')[0];
      const completedToday = allTickets.filter(t => 
        t.status === 'completed' && getBestTimestamp(t, 'tickets')?.startsWith(today)
      ).length;
      const pendingTickets = allTickets.filter(t => 
        ['open', 'scheduled', 'in_progress'].includes(t.status)
      ).length;
      const urgentTickets = allTickets.filter(t => 
        ['emergency', 'critical'].includes(t.priority)
      ).length;
      const pendingShipments = (shipmentsResponse || []).filter(s => 
        s.status === 'pending'
      ).length;

      setQuickStats({
        totalTickets: allTickets.length,
        completedToday,
        pendingTickets,
        urgentTickets,
        totalShipments: (shipmentsResponse || []).length,
        pendingShipments
      });

      setTickets(groupedTickets);
      setShipments(shipmentsResponse || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch daily data');
      showError('Failed to fetch daily data');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [get, selectedDate, showError]);

  // Filter and search functionality - using unified filter system
  const filteredTickets = useMemo(() => {
    const allTickets = Object.values(tickets).flat();
    let filtered = filterTickets(allTickets, filters);
    
    // Always filter out approved tickets (they're historical only)
    filtered = filtered.filter(ticket => ticket.status !== 'approved');
    
    // Show completed toggle (dashboard-specific)
    if (!showCompleted) {
      filtered = filtered.filter(ticket => ticket.status !== 'completed');
    }
    
    return filtered;
  }, [tickets, filters, showCompleted]);

  const filteredShipments = useMemo(() => {
    return shipments.filter(shipment => {
      const matchesSearch = !filters.search || 
        shipment.shipment_id?.toLowerCase().includes(filters.search.toLowerCase()) ||
        shipment.what_is_being_shipped?.toLowerCase().includes(filters.search.toLowerCase()) ||
        shipment.site_id?.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesSearch;
    });
  }, [shipments, filters.search]);

  // Helper functions
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'error';
      case 'critical': return 'warning';
      case 'high': return 'info';
      case 'normal': return 'default';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'scheduled': return 'warning';
      case 'open': return 'default';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'emergency': return <Error />;
      case 'critical': return <Warning />;
      case 'high': return <Flag />;
      case 'normal': return <FlagOutlined />;
      case 'low': return <CheckCircleOutline />;
      default: return <Info />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'in_progress': return <PlayArrow />;
      case 'scheduled': return <Schedule />;
      case 'open': return <Pending />;
      default: return <Info />;
    }
  };

  // These functions are now replaced by TimestampDisplay component
  // Keeping formatDateTime for backward compatibility with currentTime display
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Handler functions
  const handleViewTicket = (ticketId) => {
    navigate(`/tickets/${ticketId}`);
  };

  const handleEditTicket = (ticketId) => {
    navigate(`/tickets/${ticketId}/edit`);
  };

  const handleViewShipment = (shipmentId) => {
    navigate(`/shipments/${shipmentId}`);
  };

  const handleEditShipment = (shipmentId) => {
    navigate(`/shipments/${shipmentId}/edit`);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // WebSocket setup
  // WebSocket is now handled globally by NotificationProvider
  // This component just listens to updateTriggers from DataSyncContext

  // Initial load with loading spinner
  useEffect(() => {
    fetchDailyTickets(true); // Show loading on initial load
  }, [fetchDailyTickets]);

  // Auto-refresh when DataSync triggers update (no loading spinner)
  useEffect(() => {
    if (ticketUpdateTrigger > 0 || shipmentUpdateTrigger > 0) {
      fetchDailyTickets(false); // Don't show loading on real-time updates
    }
  }, [ticketUpdateTrigger, shipmentUpdateTrigger, fetchDailyTickets]);

  // Enhanced render functions
  const renderEnhancedTicketTable = (ticketList) => {
    if (ticketList.length === 0) {
      return (
        <Box p={4} textAlign="center">
          <Avatar sx={{ bgcolor: 'grey.100', width: 64, height: 64, mx: 'auto', mb: 2 }}>
            <Assignment sx={{ fontSize: 32, color: 'grey.500' }} />
          </Avatar>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No tickets found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {filters.search ? 'Try adjusting your search criteria' : 'Create a new ticket to get started'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/tickets/new')}
            sx={{ mt: 2 }}
          >
            Create Ticket
          </Button>
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
            {ticketList.map((ticket) => (
          <Grid item xs={12} md={6} lg={4} key={ticket.ticket_id}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
                onClick={() => handleViewTicket(ticket.ticket_id)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {ticket.inc_number || 'No INC#'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {ticket.site_id ? `${ticket.site_id}${ticket.site?.location ? ' - ' + ticket.site.location : ''}` : 'No Site'}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                  <Chip
                      icon={getPriorityIcon(ticket.priority)}
                    label={ticket.priority}
                    color={getPriorityColor(ticket.priority)}
                    size="small"
                  />
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    {ticket.site?.location || 'No Site'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <Person sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    {ticket.assigned_user?.name || 'Unassigned'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Chip
                    icon={getStatusIcon(ticket.status)}
                    label={ticket.status}
                    color={getStatusColor(ticket.status)}
                    size="small"
                  />
                  <Typography variant="caption" color="textSecondary">
                    <AccessTime sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    <TimestampDisplay entity={ticket} entityType="tickets" format="absolute" variant="caption" />
                  </Typography>
                </Box>

                {ticket.description && (
                  <Typography 
                    variant="body2" 
                    color="textSecondary"
                    sx={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {ticket.description}
                  </Typography>
                )}

                <Box display="flex" justifyContent="flex-end" mt={2}>
                      <IconButton
                        size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewTicket(ticket.ticket_id);
                    }}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTicket(ticket.ticket_id);
                    }}
                      >
                        <Edit />
                      </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderEnhancedShipmentTable = () => {
    if (shipments.length === 0) {
      return (
        <Box p={4} textAlign="center">
          <Avatar sx={{ bgcolor: 'grey.100', width: 64, height: 64, mx: 'auto', mb: 2 }}>
            <LocalShipping sx={{ fontSize: 32, color: 'grey.500' }} />
          </Avatar>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No shipments found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Create a new shipment to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/shipments/new')}
            sx={{ mt: 2 }}
          >
            Create Shipment
          </Button>
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
        {shipments.map((shipment) => (
          <Grid item xs={12} md={6} lg={4} key={shipment.shipment_id}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => handleViewShipment(shipment.shipment_id)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {shipment.shipment_id}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {shipment.what_is_being_shipped || 'Unknown Item'}
                    </Typography>
                  </Box>
                  <Chip
                    label={shipment.status}
                    color={getStatusColor(shipment.status)}
                          size="small"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    {shipment.site_id || 'No Site'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <AccessTime sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    <TimestampDisplay entity={shipment} entityType="shipments" format="absolute" variant="body2" />
                  </Typography>
                </Box>

                {shipment.notes && (
                  <Typography 
                    variant="body2" 
                    color="textSecondary"
                    sx={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {shipment.notes}
                  </Typography>
                )}

                <Box display="flex" justifyContent="flex-end" mt={2}>
                        <IconButton
                          size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewShipment(shipment.shipment_id);
                    }}
                  >
                    <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditShipment(shipment.shipment_id);
                    }}
                  >
                    <Edit />
                        </IconButton>
                  </Box>
              </CardContent>
            </Card>
          </Grid>
            ))}
      </Grid>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <DashboardIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Daily Operations Dashboard
        </Typography>
            <Typography variant="body2" color="textSecondary">
              {formatDateTime(currentTime)} • {isConnected ? '🟢 Live Updates' : '🔴 Offline'}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDailyTickets}
            disabled={apiLoading}
            size="large"
          >
            Refresh Data
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/tickets/new')}
            size="large"
          >
            New Ticket
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Quick Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {quickStats.totalTickets}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Tickets
                  </Typography>
                </Box>
                <Assignment sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {quickStats.urgentTickets}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Urgent
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {quickStats.pendingTickets}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Pending
                  </Typography>
                </Box>
                <Pending sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {quickStats.completedToday}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Completed Today
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {quickStats.totalShipments}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Shipments
                  </Typography>
                </Box>
                <LocalShipping sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {quickStats.pendingShipments}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Pending Ship
                  </Typography>
                </Box>
                <LocalShipping sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TicketFilters
                filters={filters}
                onFilterChange={setFilters}
                compact={true}
              />
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showCompleted}
                      onChange={(e) => setShowCompleted(e.target.checked)}
                    />
                  }
                  label="Show Completed Tickets"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Enhanced Tabs Section */}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600
            }
          }}
        >
          {ticketTypes.map((type, index) => (
            <Tab
              key={type.key}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  {type.icon}
                  {type.label}
                  <Badge
                    badgeContent={type.key === 'shipping' ? shipments.length : (tickets[type.key]?.length || 0)} 
                    color="primary"
                    max={99}
                  />
                </Box>
              }
              value={index}
            />
          ))}
        </Tabs>

        {ticketTypes.map((type, index) => (
          <Box
            key={type.key}
            role="tabpanel"
            hidden={activeTab !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
          >
            {activeTab === index && (
              <Box sx={{ p: 3 }}>
                {type.key === 'shipping' ? (
                  renderEnhancedShipmentTable()
                ) : (
                  renderEnhancedTicketTable(tickets[type.key] || [])
                )}
              </Box>
            )}
        </Box>
        ))}
      </Paper>

      {/* Speed Dial for Quick Actions */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
        open={speedDialOpen}
      >
        <SpeedDialAction
          icon={<Add />}
          tooltipTitle="New Ticket"
          onClick={() => navigate('/tickets/new')}
        />
        <SpeedDialAction
          icon={<LocalShipping />}
          tooltipTitle="New Shipment"
          onClick={() => navigate('/shipments/new')}
        />
        <SpeedDialAction
          icon={<Business />}
          tooltipTitle="New Site"
          onClick={() => navigate('/sites/new')}
        />
        <SpeedDialAction
          icon={<Inventory />}
          tooltipTitle="Add Inventory"
          onClick={() => navigate('/inventory/new')}
        />
      </SpeedDial>
    </Box>
  );
}

export default DailyOperationsDashboard; 