import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Button,
  Avatar,
  AvatarGroup,
  Badge,
  Tooltip,
  LinearProgress,
  Divider,
  Alert,
  CircularProgress,
  Skeleton,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Paper,
  Tabs,
  Tab,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Assignment,
  Person,
  Schedule,
  CheckCircle,
  Cancel,
  Warning,
  TrendingUp,
  TrendingDown,
  Speed,
  Business,
  LocalShipping,
  Build,
  Phone,
  NetworkCheck,
  Refresh,
  Visibility,
  Edit,
  MoreVert,
  CalendarToday,
  Notifications,
  NotificationsOff,
  Star,
  StarBorder,
  Flag,
  FlagOutlined,
  ExpandMore,
  ExpandLess,
  FilterList,
  Download,
  Assessment,
  Timeline,
  Analytics,
  Dashboard as DashboardIcon,
  Today,
  ViewWeek,
  CalendarViewMonth,
  CalendarMonth
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from './axiosConfig';
import { useAuth } from './AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ClickableTicketId from './components/ClickableTicketId';

dayjs.extend(relativeTime);

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    tickets: [],
    sites: [],
    users: [],
    analytics: null
  });
  const [timeRange, setTimeRange] = useState('week'); // 'today', 'week', 'month', 'year'
  const [showMyTickets, setShowMyTickets] = useState(true);
  const [expandedSections, setExpandedSections] = useState(new Set(['overview', 'recent']));

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, sitesRes, usersRes, analyticsRes] = await Promise.all([
        api.get('/tickets/'),
        api.get('/sites/'),
        api.get('/users/'),
        api.get('/analytics/performance')
      ]);
      
      setData({
        tickets: ticketsRes.data,
        sites: sitesRes.data,
        users: usersRes.data,
        analytics: analyticsRes.data
      });
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSectionExpanded = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Filter data based on time range
  const filteredData = useMemo(() => {
    const now = dayjs();
    let startDate;
    
    switch (timeRange) {
      case 'today':
        startDate = now.startOf('day');
        break;
      case 'week':
        startDate = now.subtract(7, 'day');
        break;
      case 'month':
        startDate = now.subtract(30, 'day');
        break;
      case 'year':
        startDate = now.subtract(365, 'day');
        break;
      default:
        startDate = now.subtract(7, 'day');
    }

    const filteredTickets = data.tickets.filter(ticket => {
      const ticketDate = dayjs(ticket.date_created);
      return ticketDate.isAfter(startDate);
    });

    return {
      tickets: filteredTickets,
      sites: data.sites,
      users: data.users,
      analytics: data.analytics
    };
  }, [data, timeRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const tickets = filteredData.tickets;
    const myTickets = showMyTickets ? tickets.filter(t => t.assigned_user_id === user?.user_id) : tickets;
    
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
    const closedTickets = tickets.filter(t => t.status === 'closed').length;
    const myOpenTickets = myTickets.filter(t => t.status === 'open').length;
    const myInProgressTickets = myTickets.filter(t => t.status === 'in_progress').length;
    
    const avgResolutionTime = tickets.length > 0 ? 
      tickets.reduce((sum, t) => sum + (t.time_spent || 0), 0) / tickets.length : 0;
    
    const highPriorityTickets = tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
    const overdueTickets = tickets.filter(t => {
      if (t.status === 'closed' || t.status === 'archived') return false;
      const created = dayjs(t.date_created);
      return dayjs().diff(created, 'day') > 7;
    }).length;

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      closedTickets,
      myOpenTickets,
      myInProgressTickets,
      avgResolutionTime,
      highPriorityTickets,
      overdueTickets
    };
  }, [filteredData, showMyTickets, user]);

  // Get recent tickets
  const recentTickets = useMemo(() => {
    const tickets = showMyTickets ? 
      filteredData.tickets.filter(t => t.assigned_user_id === user?.user_id) :
      filteredData.tickets;
    
    return tickets
      .sort((a, b) => dayjs(b.date_created).valueOf() - dayjs(a.date_created).valueOf())
      .slice(0, 5);
  }, [filteredData, showMyTickets, user]);

  // Get site name helper
  const getSiteName = (siteId) => {
    const site = filteredData.sites.find(s => s.site_id === siteId);
    return site ? site.site_name : 'Unknown Site';
  };

  // Get user name helper
  const getUserName = (userId) => {
    const user = filteredData.users.find(u => u.user_id === userId);
    return user ? user.name : 'Unknown User';
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#1976d2';
      case 'in_progress': return '#388e3c';
      case 'pending': return '#ff9800';
      case 'closed': return '#757575';
      case 'approved': return '#4caf50';
      default: return '#666';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'high': return '#f44336';
      case 'urgent': return '#9c27b0';
      default: return '#666';
    }
  };

  const renderMetricCard = (title, value, icon, color, subtitle, trend) => (
    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color, mb: 1 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ 
            backgroundColor: color + '20', 
            borderRadius: 2, 
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </Box>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            {trend > 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              {Math.abs(trend)}% from last period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderTicketCard = (ticket) => (
    <Card 
      key={ticket.ticket_id}
      sx={{ 
        mb: 1, 
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: 2
        }
      }}
      onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ClickableTicketId ticketId={ticket.ticket_id} />
              {ticket.inc_number && (
                <Chip 
                  label={ticket.inc_number} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
              {getSiteName(ticket.site_id)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip 
                label={ticket.type} 
                size="small" 
                sx={{ 
                  backgroundColor: getStatusColor(ticket.status) + '20',
                  color: getStatusColor(ticket.status),
                  fontWeight: 600
                }}
              />
              {ticket.priority && (
                <Chip 
                  label={ticket.priority} 
                  size="small" 
                  sx={{ 
                    backgroundColor: getPriorityColor(ticket.priority) + '20',
                    color: getPriorityColor(ticket.priority),
                    fontWeight: 600
                  }}
                />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
              {getUserName(ticket.assigned_user_id).charAt(0)}
            </Avatar>
            <Typography variant="caption" color="text.secondary">
              {dayjs(ticket.date_created).fromNow()}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="rectangular" width={120} height={40} />
        </Box>
        <Grid container spacing={3}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Skeleton variant="rectangular" height={120} />
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
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={showMyTickets}
                onChange={(e) => setShowMyTickets(e.target.checked)}
                size="small"
              />
            }
            label="My Tickets Only"
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDashboardData}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Time Range Selector */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Tabs 
            value={timeRange} 
            onChange={(e, value) => setTimeRange(value)}
            sx={{ '& .MuiTab-root': { borderRadius: 1 } }}
          >
            <Tab value="today" label="Today" icon={<Today />} />
            <Tab value="week" label="This Week" icon={<ViewWeek />} />
            <Tab value="month" label="This Month" icon={<CalendarViewMonth />} />
            <Tab value="year" label="This Year" icon={<CalendarMonth />} />
          </Tabs>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Overview Metrics */}
      <Box sx={{ mb: 3 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 2,
            cursor: 'pointer'
          }}
          onClick={() => toggleSectionExpanded('overview')}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment /> Overview
          </Typography>
          <IconButton size="small">
            {expandedSections.has('overview') ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        
        {expandedSections.has('overview') && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Total Tickets',
                metrics.totalTickets,
                <Assignment sx={{ color: '#1976d2' }} />,
                '#1976d2',
                `${timeRange} period`
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Open Tickets',
                metrics.openTickets,
                <Warning sx={{ color: '#ff9800' }} />,
                '#ff9800',
                `${Math.round((metrics.openTickets / metrics.totalTickets) * 100)}% of total`
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'In Progress',
                metrics.inProgressTickets,
                <Speed sx={{ color: '#388e3c' }} />,
                '#388e3c',
                `${Math.round((metrics.inProgressTickets / metrics.totalTickets) * 100)}% of total`
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Closed',
                metrics.closedTickets,
                <CheckCircle sx={{ color: '#4caf50' }} />,
                '#4caf50',
                `${Math.round((metrics.closedTickets / metrics.totalTickets) * 100)}% of total`
              )}
            </Grid>
          </Grid>
        )}
      </Box>

      {/* My Work Section */}
      {showMyTickets && (
        <Box sx={{ mb: 3 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 2,
              cursor: 'pointer'
            }}
            onClick={() => toggleSectionExpanded('mywork')}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person /> My Work
            </Typography>
            <IconButton size="small">
              {expandedSections.has('mywork') ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          {expandedSections.has('mywork') && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                {renderMetricCard(
                  'My Open',
                  metrics.myOpenTickets,
                  <Assignment sx={{ color: '#1976d2' }} />,
                  '#1976d2',
                  'Assigned to me'
                )}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderMetricCard(
                  'My In Progress',
                  metrics.myInProgressTickets,
                  <Speed sx={{ color: '#388e3c' }} />,
                  '#388e3c',
                  'Currently working'
                )}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderMetricCard(
                  'High Priority',
                  metrics.highPriorityTickets,
                  <Flag sx={{ color: '#f44336' }} />,
                  '#f44336',
                  'Urgent tickets'
                )}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderMetricCard(
                  'Overdue',
                  metrics.overdueTickets,
                  <Warning sx={{ color: '#ff9800' }} />,
                  '#ff9800',
                  'Past 7 days'
                )}
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* Recent Tickets */}
      <Box sx={{ mb: 3 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 2,
            cursor: 'pointer'
          }}
          onClick={() => toggleSectionExpanded('recent')}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timeline /> Recent Tickets
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/tickets');
            }}
          >
            View All
          </Button>
        </Box>
        
        {expandedSections.has('recent') && (
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              {recentTickets.length > 0 ? (
                <Stack spacing={1}>
                  {recentTickets.map(ticket => renderTicketCard(ticket))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No recent tickets found
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Speed /> Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                cursor: 'pointer', 
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
              onClick={() => navigate('/tickets')}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Assignment sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  View Tickets
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage all tickets
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                cursor: 'pointer', 
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
              onClick={() => navigate('/sites')}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Business sx={{ fontSize: 40, color: '#388e3c', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  View Sites
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage customer sites
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                cursor: 'pointer', 
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
              onClick={() => navigate('/users')}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Person sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  View Users
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage team members
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                cursor: 'pointer', 
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
              onClick={() => navigate('/reports')}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Analytics sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Reports
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View analytics & reports
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default Dashboard; 