import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, Checkbox, Toolbar, Tooltip,
  Pagination, ToggleButtonGroup, ToggleButton, Badge, Alert, Stack, TextField,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  CheckCircle, Warning, PlayArrow, LocalShipping, ViewList, ViewModule,
  Refresh, CheckBox, CheckBoxOutlineBlank, Assignment, Done, DoneAll
} from '@mui/icons-material';
import { useToast } from '../contexts/ToastContext';
import useApi from '../hooks/useApi';
import { useDataSync } from '../contexts/DataSyncContext';
import { TimestampDisplay } from './TimestampDisplay';

function ImprovedDailyDashboard() {
  const navigate = useNavigate();
  const { get, put, patch, post } = useApi();
  const { success, error: showError } = useToast();
  const { updateTrigger } = useDataSync('tickets');
  
  // View state
  const [viewMode, setViewMode] = useState('today'); // 'today' or 'all'
  const [displayMode, setDisplayMode] = useState('compact'); // 'compact' or 'detailed'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState(0);
  
  // Data state
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(25);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const tabs = [
    { key: 'all', label: 'All', icon: <Assignment /> },
    { key: 'inhouse', label: 'Inhouse', badge: 0 },
    { key: 'onsite', label: 'Onsite', badge: 0 },
    { key: 'needs_parts', label: 'Needs Shipping', icon: <Warning />, isAlert: true, badge: 0 },
    { key: 'overdue', label: 'Overdue', icon: <Warning />, isAlert: true, badge: 0 }
  ];

  // Fetch tickets based on view mode
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      
      if (viewMode === 'today') {
        // Get tickets for selected date (scheduled for today + overdue)
        response = await get(`/tickets/daily/${selectedDate}`);
      } else {
        // Get all active tickets (not approved)
        response = await get(`/tickets/`);
        // Filter out approved
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

  // Filter tickets by active tab and filters
  const filteredTickets = useMemo(() => {
    let filtered = tickets;
    
    // Tab filter
    const currentTab = tabs[activeTab].key;
    if (currentTab === 'inhouse') {
      filtered = filtered.filter(t => t.type === 'inhouse');
    } else if (currentTab === 'onsite') {
      filtered = filtered.filter(t => t.type === 'onsite');
    } else if (currentTab === 'needs_parts') {
      filtered = filtered.filter(t => t.status === 'needs_parts');
    } else if (currentTab === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(t => {
        const scheduledDate = t.date_scheduled || t.date_created;
        return scheduledDate < today && !['completed', 'closed', 'approved'].includes(t.status);
      });
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }
    
    return filtered;
  }, [tickets, activeTab, statusFilter, priorityFilter, tabs]);

  // Update tab badges
  const tabsWithCounts = useMemo(() => {
    return tabs.map(tab => {
      let count = 0;
      if (tab.key === 'all') {
        count = tickets.length;
      } else if (tab.key === 'inhouse') {
        count = tickets.filter(t => t.type === 'inhouse').length;
      } else if (tab.key === 'onsite') {
        count = tickets.filter(t => t.type === 'onsite').length;
      } else if (tab.key === 'needs_parts') {
        count = tickets.filter(t => t.status === 'needs_parts').length;
      } else if (tab.key === 'overdue') {
        const today = new Date().toISOString().split('T')[0];
        count = tickets.filter(t => {
          const scheduledDate = t.date_scheduled || t.date_created;
          return scheduledDate < today && !['completed', 'closed', 'approved'].includes(t.status);
        }).length;
      }
      return { ...tab, badge: count };
    });
  }, [tickets, tabs]);

  // Pagination
  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredTickets.slice(start, end);
  }, [filteredTickets, page, itemsPerPage]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  // Bulk selection
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = new Set(paginatedTickets.map(t => t.ticket_id));
      setSelectedTickets(newSelected);
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

  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedTickets.size === 0) return;
    
    try {
      await Promise.all(
        Array.from(selectedTickets).map(ticketId =>
          post(`/tickets/${ticketId}/approve`, { approve: true })
        )
      );
      success(`Approved ${selectedTickets.size} tickets`);
      setSelectedTickets(new Set());
      fetchTickets();
    } catch (err) {
      showError('Failed to approve some tickets');
    }
  };

  const handleBulkCheckIn = async () => {
    if (selectedTickets.size === 0) return;
    
    try {
      await Promise.all(
        Array.from(selectedTickets).map(ticketId =>
          put(`/tickets/${ticketId}/check-in`, {})
        )
      );
      success(`Checked in ${selectedTickets.size} techs`);
      setSelectedTickets(new Set());
      fetchTickets();
    } catch (err) {
      showError('Failed to check in some techs');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'error',
      scheduled: 'info',
      checked_in: 'warning',
      in_progress: 'warning',
      pending: 'default',
      needs_parts: 'error',
      completed: 'success',
      closed: 'default'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      normal: 'default',
      critical: 'warning',
      emergency: 'error'
    };
    return colors[priority] || 'default';
  };

  // Check if tech onsite too long
  const isOnsiteTooLong = (ticket) => {
    if (!ticket.check_in_time || ticket.check_out_time) return false;
    const hoursOnsite = (new Date() - new Date(ticket.check_in_time)) / (1000 * 60 * 60);
    return hoursOnsite >= 2;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Daily Operations
        </Typography>
        
        <Stack direction="row" spacing={2}>
          {/* View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="today">
              Today's Schedule
            </ToggleButton>
            <ToggleButton value="all">
              All Active
            </ToggleButton>
          </ToggleButtonGroup>
          
          {/* Date Picker (only for today mode) */}
          {viewMode === 'today' && (
            <TextField
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              size="small"
              sx={{ width: 170 }}
            />
          )}
          
          <IconButton onClick={fetchTickets} color="primary">
            <Refresh />
          </IconButton>
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable">
          {tabsWithCounts.map((tab, index) => (
            <Tab
              key={tab.key}
              label={
                <Badge badgeContent={tab.badge} color={tab.isAlert ? 'error' : 'primary'}>
                  {tab.label}
                </Badge>
              }
              icon={tab.icon}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Toolbar */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {/* Bulk Actions */}
          {selectedTickets.size > 0 && (
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
                Approve Selected
              </Button>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<PlayArrow />}
                onClick={handleBulkCheckIn}
              >
                Check In Selected
              </Button>
            </>
          )}
          
          {/* Filters */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="needs_parts">Needs Parts</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} label="Priority">
              <MenuItem value="all">All Priorities</MenuItem>
              <MenuItem value="emergency">Emergency</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
            </Select>
          </FormControl>
          
          {/* Display Mode */}
          <ToggleButtonGroup
            value={displayMode}
            exclusive
            onChange={(e, newMode) => newMode && setDisplayMode(newMode)}
            size="small"
          >
            <ToggleButton value="compact">
              <Tooltip title="Compact View">
                <ViewList />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="detailed">
              <Tooltip title="Detailed View">
                <ViewModule />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            Showing {paginatedTickets.length} of {filteredTickets.length} tickets
          </Typography>
        </Stack>
      </Paper>

      {/* Tickets Table - Compact View for Hundreds of Tickets */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>Loading...</Box>
      ) : paginatedTickets.length === 0 ? (
        <Alert severity="info">No tickets found for this view</Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedTickets.size > 0 && selectedTickets.size < paginatedTickets.length}
                      checked={paginatedTickets.length > 0 && selectedTickets.size === paginatedTickets.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell><strong>Alert</strong></TableCell>
                  <TableCell><strong>Ticket ID</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Site</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Priority</strong></TableCell>
                  <TableCell><strong>Scheduled</strong></TableCell>
                  <TableCell><strong>Assigned To</strong></TableCell>
                  <TableCell><strong>Quick Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTickets.map((ticket) => {
                  const isSelected = selectedTickets.has(ticket.ticket_id);
                  const onsiteTooLong = isOnsiteTooLong(ticket);
                  
                  return (
                    <TableRow
                      key={ticket.ticket_id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        bgcolor: onsiteTooLong ? 'rgba(211, 47, 47, 0.05)' : 'inherit',
                        borderLeft: onsiteTooLong ? '4px solid #d32f2f' : 'none'
                      }}
                      onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectTicket(ticket.ticket_id)}
                        />
                      </TableCell>
                      
                      <TableCell>
                        {onsiteTooLong && (
                          <Tooltip title="Tech onsite 2+ hours!">
                            <Warning color="error" />
                          </Tooltip>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {ticket.ticket_id}
                        </Typography>
                        {(ticket.inc_number || ticket.so_number) && (
                          <Typography variant="caption" color="text.secondary">
                            {ticket.inc_number && `INC: ${ticket.inc_number}`}
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Chip label={ticket.type} size="small" variant="outlined" />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {ticket.site?.location || ticket.site_id}
                        </Typography>
                        {ticket.site?.city && (
                          <Typography variant="caption" color="text.secondary">
                            {ticket.site.city}, {ticket.site.state}
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={ticket.status?.replace(/_/g, ' ')} 
                          size="small" 
                          color={getStatusColor(ticket.status)}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={ticket.priority}
                          size="small"
                          color={getPriorityColor(ticket.priority)}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <TimestampDisplay 
                          timestamp={ticket.date_scheduled || ticket.date_created}
                          entityType="tickets"
                          format="date"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {ticket.assigned_user?.name || '-'}
                        </Typography>
                      </TableCell>
                      
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.5}>
                          {ticket.type === 'onsite' && !ticket.check_in_time && (
                            <Tooltip title="Check In">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={async () => {
                                  try {
                                    await put(`/tickets/${ticket.ticket_id}/check-in`, {});
                                    success('Tech checked in');
                                    fetchTickets();
                                  } catch (err) {
                                    showError('Failed');
                                  }
                                }}
                              >
                                <PlayArrow fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {ticket.type === 'onsite' && ticket.check_in_time && !ticket.check_out_time && (
                            <Tooltip title="Check Out">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={async () => {
                                  try {
                                    await put(`/tickets/${ticket.ticket_id}/check-out`, {});
                                    success('Tech checked out');
                                    fetchTickets();
                                  } catch (err) {
                                    showError('Failed');
                                  }
                                }}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {!['completed', 'closed', 'approved'].includes(ticket.status) && (
                            <Tooltip title="Needs Parts">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={async () => {
                                  try {
                                    await patch(`/tickets/${ticket.ticket_id}/status`, { status: 'needs_parts' });
                                    success('Marked needs parts');
                                    fetchTickets();
                                  } catch (err) {
                                    showError('Failed');
                                  }
                                }}
                              >
                                <LocalShipping fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

export default ImprovedDailyDashboard;

