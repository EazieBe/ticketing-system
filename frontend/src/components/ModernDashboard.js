import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions, Button,
  Chip, IconButton, Avatar, LinearProgress, Stack, Divider, Tooltip,
  Badge, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction,
  useTheme, useMediaQuery, Fade, Zoom, Skeleton, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Checkbox, FormControl, Select, MenuItem
} from '@mui/material';
import {
  Assignment, LocalShipping, Person, Business, CheckCircle, Warning,
  Schedule, TrendingUp, TrendingDown, Refresh, Settings, Visibility,
  PlayArrow, Pause, Stop, Add, MoreVert, Dashboard as DashboardIcon,
  Inventory, Task, Notifications, Wifi, WifiOff, Speed, Analytics,
  Timeline, Assessment, Star, StarBorder, ExpandMore, ExpandLess
} from '@mui/icons-material';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../AuthContext';
import useApi from '../hooks/useApi';
import { useDataSync } from '../contexts/DataSyncContext';
import { useNotifications } from '../contexts/NotificationProvider';

// Widget Components
const StatCard = ({ title, value, change, icon, color, trend, onClick, loading }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  return (
    <Zoom in={true} timeout={300}>
      <Card 
        sx={{ 
          height: '100%', 
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          '&:hover': onClick ? { 
            transform: 'translateY(-2px)', 
            boxShadow: theme.shadows[6] 
          } : {},
          background: isDark 
            ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={onClick}
      >
        {loading ? (
          <CardContent sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="text" sx={{ mt: 1 }} />
          </CardContent>
        ) : (
          <>
            <CardContent sx={{ p: 2, position: 'relative' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color={color} sx={{ mb: 0.5, fontSize: '1.5rem' }}>
                    {value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {title}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: color, width: 36, height: 36 }}>
                  {icon}
                </Avatar>
              </Box>
              
              {change !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {trend === 'up' ? (
                    <TrendingUp color="success" fontSize="small" />
                  ) : trend === 'down' ? (
                    <TrendingDown color="error" fontSize="small" />
                  ) : null}
                  <Typography 
                    variant="body2" 
                    color={trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary'}
                    sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                  >
                    {change > 0 ? '+' : ''}{change}%
                  </Typography>
                </Box>
              )}
            </CardContent>
            
            {/* Decorative element */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 60,
                height: 60,
                background: `linear-gradient(45deg, ${color}20, transparent)`,
                borderRadius: '0 0 0 100%',
                opacity: 0.1
              }}
            />
          </>
        )}
      </Card>
    </Zoom>
  );
};

const QuickActionCard = ({ title, description, icon, color, onClick, badge }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  return (
    <Fade in={true} timeout={500}>
      <Card
        sx={{
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[6]
          },
          background: isDark 
            ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
          position: 'relative'
        }}
        onClick={onClick}
      >
        <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
          <Badge badgeContent={badge} color="error" invisible={!badge}>
            <Avatar sx={{ bgcolor: color, width: 40, height: 40, mx: 'auto', mb: 1 }}>
              {icon}
            </Avatar>
          </Badge>
          <Typography variant="body1" fontWeight="bold" sx={{ mb: 0.5, fontSize: '0.875rem' }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {description}
          </Typography>
        </CardContent>
      </Card>
    </Fade>
  );
};

const RecentActivityCard = ({ title, activities, loading, onViewAll }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  return (
    <Card
      sx={{
        height: '100%',
        background: isDark 
          ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
        position: 'relative'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          <Button size="small" onClick={onViewAll} endIcon={<Visibility />}>
            View All
          </Button>
        </Box>
        
        {loading ? (
          <Box>
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Skeleton variant="rectangular" height={40} />
              </Box>
            ))}
          </Box>
        ) : (
          <List dense>
            {activities.slice(0, 5).map((activity, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: activity.color }}>
                    {activity.icon}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="medium">
                      {activity.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {activity.time}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Chip 
                    label={activity.status} 
                    size="small" 
                    color={activity.statusColor}
                    sx={{ fontSize: '0.65rem' }}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

const PerformanceChart = ({ title, data, loading }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  return (
    <Card
      sx={{
        height: '100%',
        background: isDark 
          ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
        position: 'relative'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
          {title}
        </Typography>
        
        {loading ? (
          <Box>
            <Skeleton variant="rectangular" height={200} />
          </Box>
        ) : (
          <Box sx={{ height: 200, display: 'flex', alignItems: 'end', gap: 1 }}>
            {data.map((item, index) => (
              <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: '100%',
                    height: `${item.value}%`,
                    background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}80 100%)`,
                    borderRadius: '4px 4px 0 0',
                    minHeight: 20,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scaleY(1.05)',
                      boxShadow: `0 4px 8px ${item.color}40`
                    }
                  }}
                />
                <Typography variant="caption" sx={{ mt: 1, fontSize: '0.7rem' }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

function ModernDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { user } = useAuth();
  const { get } = useApi();
  const { success, error: showError } = useToast();
  const { updateTrigger } = useDataSync('tickets');
  const { isConnected } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [widgetSettings, setWidgetSettings] = useState({
    showTickets: true,
    showShipments: true,
    showTasks: true,
    showInventory: true,
    showPerformance: true,
    showActivity: true
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTickets, setSelectedTickets] = useState(new Set());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketsRes, shipmentsRes, tasksRes, inventoryRes] = await Promise.all([
        get('/tickets/'),
        get('/shipments/'),
        get('/tasks/'),
        get('/inventory/')
      ]);
      
      setTickets(ticketsRes || []);
      setShipments(shipmentsRes || []);
      setTasks(tasksRes || []);
      setInventory(inventoryRes || []);
    } catch (err) {
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [get, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData, updateTrigger]);

  const stats = useMemo(() => {
    const activeTickets = tickets.filter(t => !['completed', 'closed', 'archived'].includes(t.status));
    const pendingShipments = shipments.filter(s => s.status === 'pending');
    const activeTasks = tasks.filter(t => t.status === 'active');
    const lowStockItems = inventory.filter(i => i.quantity < 10);
    
    return {
      totalTickets: activeTickets.length,
      completedTickets: tickets.filter(t => t.status === 'completed').length,
      pendingShipments: pendingShipments.length,
      activeTasks: activeTasks.length,
      lowStockItems: lowStockItems.length,
      overdueTickets: tickets.filter(t => {
        const scheduled = t.date_scheduled || t.date_created;
        return scheduled < new Date().toISOString().split('T')[0] && 
               !['completed', 'closed', 'archived'].includes(t.status);
      }).length
    };
  }, [tickets, shipments, tasks, inventory]);

  const recentActivities = useMemo(() => {
    const activities = [];
    
    // Recent tickets
    tickets.slice(0, 3).forEach(ticket => {
      activities.push({
        title: `Ticket ${ticket.ticket_id} - ${ticket.status}`,
        time: new Date(ticket.date_created).toLocaleString(),
        icon: <Assignment />,
        color: '#1976d2',
        status: ticket.status,
        statusColor: ticket.status === 'completed' ? 'success' : 'primary'
      });
    });
    
    // Recent shipments
    shipments.slice(0, 2).forEach(shipment => {
      activities.push({
        title: `Shipment ${shipment.shipment_id} - ${shipment.status}`,
        time: new Date(shipment.date_created).toLocaleString(),
        icon: <LocalShipping />,
        color: '#ff9800',
        status: shipment.status,
        statusColor: shipment.status === 'delivered' ? 'success' : 'warning'
      });
    });
    
    return activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [tickets, shipments]);

  const performanceData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    return last7Days.map(date => {
      const dayTickets = tickets.filter(t => t.date_created?.startsWith(date));
      const completedTickets = dayTickets.filter(t => t.status === 'completed');
      
      return {
        label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        value: Math.max(20, (completedTickets.length / Math.max(1, dayTickets.length)) * 100),
        color: '#4caf50'
      };
    });
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let filtered = tickets.filter(t => !['archived'].includes(t.status));
    if (statusFilter === 'active') {
      filtered = filtered.filter(t => !['completed', 'closed'].includes(t.status));
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    return filtered.sort((a, b) => {
      const pOrder = { emergency: 3, critical: 2, normal: 1 };
      return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
    });
  }, [tickets, statusFilter]);

  const filteredShipments = useMemo(() => {
    let filtered = shipments.filter(s => s.status !== 'archived');
    if (statusFilter === 'active') {
      filtered = filtered.filter(s => !['delivered', 'returned'].includes(s.status));
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    return filtered.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
  }, [shipments, statusFilter]);

  const getStatusColor = (status) => {
    const configs = {
      open: '#2196f3',
      scheduled: '#9c27b0',
      checked_in: '#ff9800',
      in_progress: '#ff5722',
      needs_parts: '#f44336',
      completed: '#4caf50',
      pending: '#ff9800',
      shipped: '#2196f3',
      delivered: '#4caf50',
      returned: '#9c27b0'
    };
    return configs[status] || '#757575';
  };

  const handleSelectAll = (e) => {
    if (activeTab === 0) {
      setSelectedTickets(e.target.checked ? new Set(filteredTickets.map(t => t.ticket_id)) : new Set());
    }
  };

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTickets(newSelected);
  };

  const quickActions = [
    {
      title: 'New Ticket',
      description: 'Create a new support ticket',
      icon: <Add />,
      color: '#1976d2',
      onClick: () => navigate('/tickets/new'),
      badge: null
    },
    {
      title: 'New Shipment',
      description: 'Create a new shipment',
      icon: <LocalShipping />,
      color: '#ff9800',
      onClick: () => navigate('/shipments/new'),
      badge: null
    },
    {
      title: 'Inventory',
      description: 'Manage inventory items',
      icon: <Inventory />,
      color: '#4caf50',
      onClick: () => navigate('/inventory'),
      badge: stats.lowStockItems > 0 ? stats.lowStockItems : null
    },
    {
      title: 'Tasks',
      description: 'View and manage tasks',
      icon: <Task />,
      color: '#9c27b0',
      onClick: () => navigate('/tasks'),
      badge: stats.activeTasks > 0 ? stats.activeTasks : null
    }
  ];

  return (
    <Box sx={{ 
      p: { xs: 2, md: 3 }, 
      minHeight: '100vh',
      background: isDark 
        ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      position: 'relative'
    }}>
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDark 
            ? 'radial-gradient(circle at 20% 50%, rgba(25, 118, 210, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 152, 0, 0.1) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 50%, rgba(25, 118, 210, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 152, 0, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none'
        }}
      />
      
      {/* Header */}
      <Box sx={{ position: 'relative', zIndex: 1, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h3" fontWeight="bold" sx={{ 
              background: isDark 
                ? 'linear-gradient(45deg, #ffffff 30%, #1976d2 90%)'
                : 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}>
              Welcome back, {user?.name}!
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: isConnected ? '#4caf50' : '#f44336',
                animation: isConnected ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } }
              }} />
              {isConnected ? 'Live Updates' : 'Offline Mode'} • {currentTime.toLocaleTimeString()}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <IconButton onClick={fetchData} sx={{ 
              bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
            }}>
              <Refresh />
            </IconButton>
            <IconButton onClick={() => setSettingsOpen(true)} sx={{ 
              bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
            }}>
              <Settings />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ position: 'relative', zIndex: 1, mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Tickets"
            value={stats.totalTickets}
            change={5.2}
            trend="up"
            icon={<Assignment />}
            color="#1976d2"
            loading={loading}
            onClick={() => navigate('/tickets')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Shipments"
            value={stats.pendingShipments}
            change={-2.1}
            trend="down"
            icon={<LocalShipping />}
            color="#ff9800"
            loading={loading}
            onClick={() => navigate('/shipments')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Tasks"
            value={stats.activeTasks}
            change={12.5}
            trend="up"
            icon={<Task />}
            color="#9c27b0"
            loading={loading}
            onClick={() => navigate('/tasks')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Low Stock Items"
            value={stats.lowStockItems}
            change={0}
            trend="neutral"
            icon={<Warning />}
            color="#f44336"
            loading={loading}
            onClick={() => navigate('/inventory')}
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ position: 'relative', zIndex: 1, mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={3}>
          {quickActions.map((action, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <QuickActionCard {...action} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <RecentActivityCard
            title="Recent Activity"
            activities={recentActivities}
            loading={loading}
            onViewAll={() => navigate('/tickets')}
          />
        </Grid>

        {/* Performance Chart */}
        <Grid item xs={12} md={6}>
          <PerformanceChart
            title="Ticket Completion Rate"
            data={performanceData}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* List View with Tabs */}
      <Box sx={{ position: 'relative', zIndex: 1, mt: 4 }}>
        <Card
          sx={{
            background: isDark 
              ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
          }}
        >
          {/* Tabs Header */}
          <Box sx={{ borderBottom: `1px solid ${isDark ? '#333' : '#e0e0e0'}` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, v) => setActiveTab(v)}
                sx={{ minHeight: 40 }}
              >
                <Tab 
                  label={
                    <Badge badgeContent={filteredTickets.length} color="primary" max={999}>
                      <Typography variant="body2" fontWeight="bold">Active Tickets</Typography>
                    </Badge>
                  } 
                />
                <Tab 
                  label={
                    <Badge badgeContent={filteredShipments.length} color="secondary" max={999}>
                      <Typography variant="body2" fontWeight="bold">Shipments</Typography>
                    </Badge>
                  } 
                />
              </Tabs>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    displayEmpty
                    sx={{ height: 32, fontSize: '0.875rem' }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active Only</MenuItem>
                    {activeTab === 0 ? (
                      <>
                        <MenuItem value="open">Open</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="needs_parts">Needs Parts</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                      </>
                    ) : (
                      <>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="shipped">Shipped</MenuItem>
                        <MenuItem value="delivered">Delivered</MenuItem>
                      </>
                    )}
                  </Select>
                </FormControl>
                
                {selectedTickets.size > 0 && activeTab === 0 && (
                  <Chip 
                    label={`${selectedTickets.size} selected`} 
                    size="small" 
                    onDelete={() => setSelectedTickets(new Set())} 
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Table Content */}
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem' } }}>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: isDark ? '#2d2d2d' : '#f5f5f5', fontWeight: 'bold' } }}>
                  {activeTab === 0 && (
                    <TableCell padding="checkbox" sx={{ width: 40 }}>
                      <Checkbox 
                        size="small" 
                        onChange={handleSelectAll}
                        checked={filteredTickets.length > 0 && selectedTickets.size === filteredTickets.length}
                      />
                    </TableCell>
                  )}
                  <TableCell sx={{ width: 100 }}>
                    {activeTab === 0 ? 'Ticket ID' : 'Shipment ID'}
                  </TableCell>
                  <TableCell sx={{ width: 80 }}>Site</TableCell>
                  <TableCell>
                    {activeTab === 0 ? 'Description' : 'Items'}
                  </TableCell>
                  <TableCell sx={{ width: 80 }}>Status</TableCell>
                  <TableCell sx={{ width: 70 }}>Priority</TableCell>
                  <TableCell sx={{ width: 80 }}>Date</TableCell>
                  <TableCell sx={{ width: 100 }}>Assigned</TableCell>
                  <TableCell sx={{ width: 80 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeTab === 0 ? (
                  // Tickets Tab
                  filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No tickets found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow
                        key={ticket.ticket_id}
                        hover
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: isDark ? '#2a2a2a' : '#f5f5f5' } }}
                        onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                      >
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            checked={selectedTickets.has(ticket.ticket_id)}
                            onChange={() => handleSelectItem(ticket.ticket_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
                            {ticket.ticket_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {ticket.site_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.75rem',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {ticket.description || 'No description'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ticket.status?.replace(/_/g, ' ')}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: `${getStatusColor(ticket.status)}20`,
                              color: getStatusColor(ticket.status),
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ticket.priority}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: ticket.priority === 'emergency' ? '#ffebee' : 
                                      ticket.priority === 'critical' ? '#fff3e0' : '#e8f5e9',
                              color: ticket.priority === 'emergency' ? '#f44336' : 
                                     ticket.priority === 'critical' ? '#ff9800' : '#4caf50',
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {ticket.date_created ? 
                              new Date(ticket.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                              : '-'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {ticket.assigned_user?.name || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <IconButton size="small" sx={{ p: 0.5 }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  // Shipments Tab
                  filteredShipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No shipments found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShipments.map((shipment) => (
                      <TableRow
                        key={shipment.shipment_id}
                        hover
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: isDark ? '#2a2a2a' : '#f5f5f5' } }}
                        onClick={() => navigate(`/shipments/${shipment.shipment_id}/edit`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
                            {shipment.shipment_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {shipment.site_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ maxWidth: 200 }}>
                            {shipment.shipment_items && shipment.shipment_items.length > 0 ? (
                              shipment.shipment_items.map((item, index) => (
                                <Typography 
                                  key={index} 
                                  variant="body2" 
                                  sx={{ 
                                    fontSize: '0.75rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    mb: index < shipment.shipment_items.length - 1 ? 0.5 : 0
                                  }}
                                >
                                  {item.quantity}x {item.what_is_being_shipped}
                                </Typography>
                              ))
                            ) : (
                              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {shipment.what_is_being_shipped || 'No items'}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={shipment.status}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: `${getStatusColor(shipment.status)}20`,
                              color: getStatusColor(shipment.status),
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={shipment.shipping_priority || 'normal'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: shipment.shipping_priority === 'urgent' ? '#fff3e0' : 
                                      shipment.shipping_priority === 'critical' ? '#ffebee' : '#e8f5e9',
                              color: shipment.shipping_priority === 'urgent' ? '#ff9800' : 
                                     shipment.shipping_priority === 'critical' ? '#f44336' : '#4caf50',
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {shipment.date_created ? 
                              new Date(shipment.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                              : '-'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {shipment.assigned_user?.name || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <IconButton size="small" sx={{ p: 0.5 }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      {/* Widget Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dashboard Settings</DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Widget Visibility</Typography>
          <Stack spacing={2}>
            {Object.entries(widgetSettings).map(([key, value]) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={value}
                    onChange={(e) => setWidgetSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                  />
                }
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ModernDashboard;
