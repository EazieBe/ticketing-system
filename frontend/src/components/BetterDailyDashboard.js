import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Tabs, Tab, Card, CardContent, Grid, Chip, Button,
  IconButton, Checkbox, Badge, Tooltip, Pagination, Alert, Stack, TextField,
  FormControl, InputLabel, Select, MenuItem, Avatar, Divider, ToggleButtonGroup,
  ToggleButton, LinearProgress
} from '@mui/material';
import {
  CheckCircle, Warning, PlayArrow, LocalShipping, Refresh, Assignment,
  Done, DoneAll, Person, LocationOn, Schedule, AccessTime, Flag, Error as ErrorIcon,
  TrendingUp, Speed, Inventory, Business, WifiOff, Wifi, CalendarToday
} from '@mui/icons-material';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../AuthContext';
import useApi from '../hooks/useApi';
import useThemeTokens from '../hooks/useThemeTokens';
import StatusChip from './StatusChip';
import PriorityChip from './PriorityChip';
import { useDataSync } from '../contexts/DataSyncContext';
import { useNotifications } from '../contexts/NotificationProvider';
import { TimestampDisplay } from './TimestampDisplay';
import { getBestTimestamp } from '../utils/timezone';
import { getPriorityBorderColor } from '../utils/statusChipConfig';

function BetterDailyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { get, put, patch, post } = useApi();
  const { surfaceDefault, surfacePaper, barCardBg, statusErrorBg, statusWarningBg, codeBlockBg } = useThemeTokens();
  const { success, error: showError } = useToast();
  const { updateTrigger } = useDataSync('tickets');
  const { isConnected } = useNotifications();
  
  // View state
  const [viewMode, setViewMode] = useState('today'); // 'today' or 'all'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Data state
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('active'); // 'all', 'active', specific status
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Update current time every SECOND for truly live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { key: 'all', label: 'All Active', icon: <Assignment />, color: 'primary' },
    { key: 'inhouse', label: 'Inhouse', icon: <Person />, color: '#2e7d32' },
    { key: 'onsite', label: 'Onsite', icon: <LocationOn />, color: '#1976d2' },
    { key: 'needs_parts', label: 'Needs Shipping', icon: <Warning />, color: '#f57c00', isAlert: true },
    { key: 'overdue', label: 'Overdue', icon: <ErrorIcon />, color: '#d32f2f', isAlert: true }
  ];

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      
      if (viewMode === 'today') {
        response = await get(`/tickets/daily/${selectedDate}`);
      } else {
        response = await get(`/tickets/`);
        response = response.filter(t => t.status !== 'approved');
      }
      
      setTickets(response || []);
    } catch (err) {
      showError('Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [get, viewMode, selectedDate, showError]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets, updateTrigger]);

  // Filter and categorize tickets
  const categorizedTickets = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      all: tickets.filter(t => t.status !== 'approved'),
      inhouse: tickets.filter(t => t.type === 'inhouse' && t.status !== 'approved'),
      onsite: tickets.filter(t => t.type === 'onsite' && t.status !== 'approved'),
      needs_parts: tickets.filter(t => t.status === 'needs_parts'),
      overdue: tickets.filter(t => {
        const scheduledDate = t.date_scheduled || t.date_created;
        return scheduledDate < today && !['completed', 'closed', 'approved'].includes(t.status);
      })
    };
  }, [tickets]);

  const activeTickets = categorizedTickets[tabs[activeTab].key] || [];

  // Apply additional filters
  const filteredTickets = useMemo(() => {
    let filtered = activeTickets;
    
    if (statusFilter !== 'all' && statusFilter !== 'active') {
      filtered = filtered.filter(t => t.status === statusFilter);
    } else if (statusFilter === 'active') {
      filtered = filtered.filter(t => !['completed', 'closed', 'approved'].includes(t.status));
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }
    
    // Sort: priority first, then scheduled date
    return filtered.sort((a, b) => {
      const priorityOrder = { emergency: 3, critical: 2, normal: 1, low: 0 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      const aDate = a.date_scheduled || a.date_created;
      const bDate = b.date_scheduled || b.date_created;
      return new Date(aDate) - new Date(bDate);
    });
  }, [activeTickets, statusFilter, priorityFilter]);

  // Pagination
  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, page, itemsPerPage]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  // Quick stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: tickets.filter(t => t.status !== 'approved').length,
      scheduledToday: tickets.filter(t => t.date_scheduled === today).length,
      inProgress: tickets.filter(t => ['in_progress', 'checked_in'].includes(t.status)).length,
      needsParts: tickets.filter(t => t.status === 'needs_parts').length,
      overdue: categorizedTickets.overdue.length,
      completedToday: tickets.filter(t => t.status === 'completed' && t.date_closed === today).length
    };
  }, [tickets, categorizedTickets]);

  // Bulk actions
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedTickets(new Set(paginatedTickets.map(t => t.ticket_id)));
    } else {
      setSelectedTickets(new Set());
    }
  };

  const handleSelectTicket = (ticketId) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedTickets.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedTickets).map(id => post(`/tickets/${id}/approve?approve=true`))
      );
      success(`Approved ${selectedTickets.size} tickets`);
      setSelectedTickets(new Set());
      fetchTickets();
    } catch (err) {
      showError('Failed to approve tickets');
    }
  };

  // Quick actions
  const handleQuickCheckIn = async (ticketId, e) => {
    e.stopPropagation();
    try {
      await put(`/tickets/${ticketId}/check-in`, {});
      success('Tech checked in');
      fetchTickets();
    } catch (err) {
      showError('Failed to check in');
    }
  };

  const handleQuickCheckOut = async (ticketId, e) => {
    e.stopPropagation();
    try {
      await put(`/tickets/${ticketId}/check-out`, {});
      success('Tech checked out');
      fetchTickets();
    } catch (err) {
      showError('Failed to check out');
    }
  };

  const handleQuickNeedsParts = async (ticketId, e) => {
    e.stopPropagation();
    try {
      await patch(`/tickets/${ticketId}/status`, { status: 'needs_parts' });
      success('Marked needs parts');
      fetchTickets();
    } catch (err) {
      showError('Failed to update');
    }
  };

  // Check if tech onsite too long
  const isOnsiteTooLong = (ticket) => {
    if (!ticket.check_in_time || ticket.check_out_time) return false;
    const hours = (currentTime - new Date(ticket.check_in_time)) / (1000 * 60 * 60);
    return hours >= 2;
  };

  const getOnsiteDuration = (ticket) => {
    if (!ticket.check_in_time || ticket.check_out_time) return null;
    const hours = (currentTime - new Date(ticket.check_in_time)) / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  return (
    <Box sx={{ p: 3, backgroundColor: surfaceDefault, minHeight: '100vh' }}>
      {/* Header with Stats */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="white">
              Daily Operations
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" mt={1}>
              <Typography variant="body2" color="rgba(255,255,255,0.9)">
                {currentTime.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#4caf50',
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.3 }
                    }
                  }}
                />
                <Typography variant="body2" color="rgba(255,255,255,0.9)" fontWeight="bold" sx={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
                  {currentTime.toLocaleTimeString()}
                </Typography>
              </Box>
              <Chip
                icon={isConnected ? <Wifi /> : <WifiOff />}
                label={isConnected ? "Live Updates" : "Offline"}
                size="small"
                color={isConnected ? "success" : "default"}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </Stack>
          </Box>
          
          <Stack direction="row" spacing={2}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
              sx={{ bgcolor: barCardBg }}
            >
              <ToggleButton value="today">Today's Schedule</ToggleButton>
              <ToggleButton value="all">All Active</ToggleButton>
            </ToggleButtonGroup>
            
            {viewMode === 'today' && (
              <TextField
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                size="small"
                sx={{ bgcolor: barCardBg, borderRadius: 1 }}
              />
            )}
            
            <IconButton onClick={fetchTickets} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>
        
        {/* Quick Stats Widgets */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: barCardBg }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
                    <Typography variant="caption" color="text.secondary">Total Active</Typography>
                  </Box>
                  <Assignment sx={{ fontSize: 40, color: 'primary.main' }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: barCardBg }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.scheduledToday}</Typography>
                    <Typography variant="caption" color="text.secondary">Scheduled Today</Typography>
                  </Box>
                  <CalendarToday sx={{ fontSize: 40, color: 'warning.main' }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: barCardBg }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="info.main">{stats.inProgress}</Typography>
                    <Typography variant="caption" color="text.secondary">In Progress</Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 40, color: 'info.main' }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: barCardBg, border: stats.needsParts > 0 ? 2 : 0, borderColor: stats.needsParts > 0 ? 'warning.main' : 'transparent' }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="error.main">{stats.needsParts}</Typography>
                    <Typography variant="caption" color="text.secondary">Needs Shipping</Typography>
                  </Box>
                  <LocalShipping sx={{ fontSize: 40, color: 'warning.main' }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: barCardBg, border: stats.overdue > 0 ? 2 : 0, borderColor: stats.overdue > 0 ? 'error.main' : 'transparent' }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="error.main">{stats.overdue}</Typography>
                    <Typography variant="caption" color="text.secondary">Overdue</Typography>
                  </Box>
                  <ErrorIcon sx={{ fontSize: 40, color: 'error.main' }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: barCardBg }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="success.main">{stats.completedToday}</Typography>
                    <Typography variant="caption" color="text.secondary">Done Today</Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable">
          {tabs.map((tab, index) => (
            <Tab
              key={tab.key}
              label={
                <Badge 
                  badgeContent={categorizedTickets[tab.key]?.length || 0} 
                  color={tab.isAlert ? 'error' : 'primary'}
                  max={999}
                >
                  {tab.label}
                </Badge>
              }
              icon={tab.icon}
              iconPosition="start"
              sx={{ color: tab.color }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Toolbar */}
      {selectedTickets.size > 0 || filteredTickets.length > 0 ? (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            {/* Bulk Selection Info */}
            {selectedTickets.size > 0 ? (
              <>
                <Chip 
                  label={`${selectedTickets.size} selected`}
                  color="primary"
                  onDelete={() => setSelectedTickets(new Set())}
                />
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<DoneAll />}
                  onClick={handleBulkApprove}
                >
                  Approve {selectedTickets.size} Tickets
                </Button>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {filteredTickets.length} tickets • Page {page} of {totalPages || 1}
              </Typography>
            )}
            
            {/* Filters */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status Filter</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status Filter">
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active Only</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Priority</InputLabel>
              <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} label="Priority">
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
              </Select>
            </FormControl>
            
            <Button size="small" onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); }}>
              Clear Filters
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tickets Grid - Colorful Cards */}
      {paginatedTickets.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No tickets found. {viewMode === 'today' ? 'Nothing scheduled for this date.' : 'All tickets are approved or no active tickets.'}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {paginatedTickets.map((ticket) => {
            const isSelected = selectedTickets.has(ticket.ticket_id);
            const onsiteTooLong = isOnsiteTooLong(ticket);
            const onsiteDuration = getOnsiteDuration(ticket);
            const isOverdue = categorizedTickets.overdue.some(t => t.ticket_id === ticket.ticket_id);
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={ticket.ticket_id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft: `6px solid ${onsiteTooLong ? '#d32f2f' : isOverdue ? '#ff9800' : getPriorityBorderColor(ticket.priority)}`,
                    bgcolor: onsiteTooLong ? statusErrorBg : isOverdue ? statusWarningBg : surfacePaper,
                    '&:hover': {
                      boxShadow: 8,
                      transform: 'translateY(-4px)'
                    },
                    opacity: isSelected ? 0.7 : 1
                  }}
                  onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Selection Checkbox */}
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={() => handleSelectTicket(ticket.ticket_id)}
                      />
                    </Box>
                    
                    {/* Alert Banner */}
                    {onsiteTooLong && (
                      <Alert severity="error" icon={<Warning />} sx={{ mb: 2, p: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <AccessTime fontSize="small" />
                          <Typography variant="caption" fontWeight="bold">
                            Onsite {onsiteDuration}h - Follow up!
                          </Typography>
                        </Stack>
                      </Alert>
                    )}
                    
                    {isOverdue && !onsiteTooLong && (
                      <Alert severity="warning" sx={{ mb: 2, p: 1 }}>
                        <Typography variant="caption" fontWeight="bold">
                          ⚠️ OVERDUE
                        </Typography>
                      </Alert>
                    )}
                    
                    {/* Ticket Header */}
                    <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap">
                      <TypeChip type={ticket.type} size="small" sx={{ fontWeight: 600 }} />
                      <StatusChip status={ticket.status} entityType="ticket" size="small" sx={{ fontWeight: 600 }} />
                      <PriorityChip priority={ticket.priority} size="small" sx={{ fontWeight: 600 }} />
                    </Stack>
                    
                    {/* Ticket ID */}
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      #{ticket.ticket_id}
                    </Typography>
                    
                    {/* Site Info */}
                    <Stack spacing={0.5} mb={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Business fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="600">
                          {ticket.site?.location || ticket.site_id}
                        </Typography>
                      </Stack>
                      {ticket.site?.city && (
                        <Stack direction="row" spacing={1} alignItems="center" pl={3}>
                          <Typography variant="caption" color="text.secondary">
                            {ticket.site.city}, {ticket.site.state}
                          </Typography>
                        </Stack>
                      )}
                      
                      {/* Scheduled Date */}
                      {ticket.date_scheduled && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Schedule fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            Scheduled: <TimestampDisplay timestamp={ticket.date_scheduled} entityType="tickets" format="date" />
                          </Typography>
                        </Stack>
                      )}
                      
                      {/* Assigned User */}
                      {ticket.assigned_user && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Person fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {ticket.assigned_user.name}
                          </Typography>
                        </Stack>
                      )}
                      
                      {/* Check-in Time */}
                      {ticket.check_in_time && !ticket.check_out_time && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <AccessTime fontSize="small" color="warning" />
                          <Typography variant="caption" color="warning.main" fontWeight="bold">
                            Onsite {onsiteDuration}h
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                    
                    {/* Notes Preview */}
                    {ticket.notes && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          bgcolor: codeBlockBg,
                          p: 1,
                          borderRadius: 1,
                          mb: 2
                        }}
                      >
                        {ticket.notes}
                      </Typography>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Quick Action Buttons */}
                    <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
                      {ticket.type === 'onsite' && !ticket.check_in_time && (
                        <Button
                          fullWidth
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<PlayArrow />}
                          onClick={(e) => handleQuickCheckIn(ticket.ticket_id, e)}
                          sx={{ fontWeight: 600 }}
                        >
                          Check In
                        </Button>
                      )}
                      
                      {ticket.type === 'onsite' && ticket.check_in_time && !ticket.check_out_time && (
                        <Button
                          fullWidth
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={(e) => handleQuickCheckOut(ticket.ticket_id, e)}
                          sx={{ fontWeight: 600 }}
                        >
                          Check Out
                        </Button>
                      )}
                      
                      {!['completed', 'closed', 'approved'].includes(ticket.status) && (
                        <Tooltip title="Mark needs parts">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={(e) => handleQuickNeedsParts(ticket.ticket_id, e)}
                            sx={{ border: 1, borderColor: 'warning.main' }}
                          >
                            <LocalShipping fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={(e, value) => setPage(value)}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Bottom Stats Bar */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: 'background.paper' }}>
        <Stack direction="row" spacing={3} justifyContent="center">
          <Typography variant="body2" color="text.secondary">
            👤 Logged in as: <strong>{user?.name}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            📊 Viewing: <strong>{filteredTickets.length} tickets</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            📅 Date: <strong>{selectedDate}</strong>
          </Typography>
          <Typography variant="body2" color={isConnected ? 'success.main' : 'error.main'}>
            {isConnected ? '🟢 Live Updates' : '🔴 Offline'}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

export default BetterDailyDashboard;


