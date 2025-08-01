import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Assessment,
  Download,
  Refresh,
  FilterList,
  ExpandMore,
  Assignment,
  Store,
  LocalShipping,
  Inventory,
  Build,
  Group,
  Timeline,
  Analytics
} from '@mui/icons-material';
import api from './axiosConfig';
import dayjs from 'dayjs';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [tickets, setTickets] = useState([]);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [fieldTechs, setFieldTechs] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        ticketsRes,
        sitesRes,
        usersRes,
        fieldTechsRes,
        shipmentsRes,
        inventoryRes
      ] = await Promise.all([
        api.get('/tickets/'),
        api.get('/sites/'),
        api.get('/users/'),
        api.get('/fieldtechs/'),
        api.get('/shipments/'),
        api.get('/inventory/')
      ]);

      setTickets(ticketsRes.data);
      setSites(sitesRes.data);
      setUsers(usersRes.data);
      setFieldTechs(fieldTechsRes.data);
      setShipments(shipmentsRes.data);
      setInventory(inventoryRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch report data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by date range
  const getFilteredData = (data, dateField = 'date_created') => {
    const daysAgo = dayjs().subtract(parseInt(dateRange), 'day');
    return data.filter(item => {
      const itemDate = dayjs(item[dateField]);
      return itemDate.isAfter(daysAgo);
    });
  };

  const filteredTickets = getFilteredData(tickets);
  const filteredShipments = getFilteredData(shipments, 'date_shipped');

  // Calculate summary metrics
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const closedTickets = tickets.filter(t => t.status === 'closed').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const overdueTickets = tickets.filter(t => {
    if (t.status === 'closed') return false;
    const created = dayjs(t.date_created);
    return dayjs().diff(created, 'day') > 1;
  }).length;

  const totalSites = sites.length;
  const totalUsers = users.length;
  const totalFieldTechs = fieldTechs.length;
  const totalShipments = shipments.length;
  const totalInventory = inventory.length;

  // Chart data
  const statusData = [
    { name: 'Open', value: openTickets, color: '#1976d2' },
    { name: 'In Progress', value: inProgressTickets, color: '#FFBB28' },
    { name: 'Closed', value: closedTickets, color: '#4caf50' },
    { name: 'Overdue', value: overdueTickets, color: '#f44336' }
  ].filter(item => item.value > 0);

  const ticketTypeData = [
    { name: 'Inhouse', value: tickets.filter(t => t.type === 'inhouse').length },
    { name: 'Onsite', value: tickets.filter(t => t.type === 'onsite').length },
            { name: 'Projects', value: tickets.filter(t => t.type === 'projects').length },
    { name: 'Shipping', value: tickets.filter(t => t.type === 'shipping').length },
    { name: 'Misc', value: tickets.filter(t => t.type === 'misc').length }
  ].filter(item => item.value > 0);

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = dayjs().subtract(11 - i, 'month');
    const monthTickets = tickets.filter(t => {
      const ticketDate = dayjs(t.date_created);
      return ticketDate.month() === month.month() && ticketDate.year() === month.year();
    });
    return {
      month: month.format('MMM'),
      tickets: monthTickets.length,
      closed: monthTickets.filter(t => t.status === 'closed').length
    };
  });

  const topSites = sites.map(site => ({
    name: site.site_id,
    tickets: tickets.filter(t => t.site_id === site.site_id).length,
    location: site.location
  })).sort((a, b) => b.tickets - a.tickets).slice(0, 10);

  const topUsers = users.map(user => ({
    name: user.name,
    tickets: tickets.filter(t => t.assigned_user_id === user.user_id).length
  })).sort((a, b) => b.tickets - a.tickets).slice(0, 10);

  const handleExport = (reportType) => {
    let data = [];
    let filename = '';

    switch (reportType) {
      case 'tickets':
        data = filteredTickets;
        filename = `tickets_report_${dayjs().format('YYYY-MM-DD')}.csv`;
        break;
      case 'sites':
        data = sites;
        filename = `sites_report_${dayjs().format('YYYY-MM-DD')}.csv`;
        break;
      case 'users':
        data = users;
        filename = `users_report_${dayjs().format('YYYY-MM-DD')}.csv`;
        break;
      case 'fieldtechs':
        data = fieldTechs;
        filename = `fieldtechs_report_${dayjs().format('YYYY-MM-DD')}.csv`;
        break;
      case 'shipments':
        data = filteredShipments;
        filename = `shipments_report_${dayjs().format('YYYY-MM-DD')}.csv`;
        break;
      case 'inventory':
        data = inventory;
        filename = `inventory_report_${dayjs().format('YYYY-MM-DD')}.csv`;
        break;
      default:
        return;
    }

    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                label="Date Range"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="7">Last 7 days</MenuItem>
                <MenuItem value="30">Last 30 days</MenuItem>
                <MenuItem value="90">Last 90 days</MenuItem>
                <MenuItem value="365">Last year</MenuItem>
                <MenuItem value="all">All time</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={selectedReport}
                label="Report Type"
                onChange={(e) => setSelectedReport(e.target.value)}
              >
                <MenuItem value="overview">Overview</MenuItem>
                <MenuItem value="tickets">Tickets</MenuItem>
                <MenuItem value="sites">Sites</MenuItem>
                <MenuItem value="users">Users</MenuItem>
                <MenuItem value="fieldtechs">Field Techs</MenuItem>
                <MenuItem value="shipments">Shipments</MenuItem>
                <MenuItem value="inventory">Inventory</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchData}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport(selectedReport)}
              >
                Export {selectedReport}
              </Button>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #1976d2' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assignment sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Total Tickets</Typography>
              </Box>
              <Typography variant="h4">{totalTickets}</Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredTickets.length} in last {dateRange} days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #4caf50' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Store sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Total Sites</Typography>
              </Box>
              <Typography variant="h4">{totalSites}</Typography>
              <Typography variant="body2" color="text.secondary">
                Active locations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #ff9800' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Group sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Total Users</Typography>
              </Box>
              <Typography variant="h4">{totalUsers}</Typography>
              <Typography variant="body2" color="text.secondary">
                System users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #9c27b0' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Build sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">Field Techs</Typography>
              </Box>
              <Typography variant="h4">{totalFieldTechs}</Typography>
              <Typography variant="body2" color="text.secondary">
                Available technicians
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Ticket Status Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Ticket Status Distribution
            </Typography>
            {statusData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Monthly Trend Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Ticket Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Area type="monotone" dataKey="tickets" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="closed" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Sites Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Sites by Ticket Count
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSites}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="tickets" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Users Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Users by Assigned Tickets
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUsers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="tickets" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Detailed Tables */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.slice(0, 10).map((ticket) => (
                <TableRow key={ticket.ticket_id}>
                  <TableCell>
                    <Chip 
                      label={ticket.type} 
                      size="small" 
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>{ticket.ticket_id}</TableCell>
                  <TableCell>
                    <Chip 
                      label={ticket.status} 
                      size="small" 
                      color={
                        ticket.status === 'closed' ? 'success' :
                        ticket.status === 'open' ? 'primary' :
                        ticket.status === 'in_progress' ? 'warning' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>{ticket.assigned_user_id || 'Unassigned'}</TableCell>
                  <TableCell>
                    {dayjs(ticket.date_created).format('MMM DD, YYYY')}
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default Reports; 