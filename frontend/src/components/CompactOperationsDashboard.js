import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Checkbox, Badge, Tooltip, Stack,
  FormControl, Select, MenuItem, ToggleButtonGroup, ToggleButton, Button
} from '@mui/material';
import {
  CheckCircle, Warning, PlayArrow, LocalShipping, Refresh, Assignment,
  DoneAll, Visibility, WifiOff, Wifi, CheckBox as CheckBoxIcon
} from '@mui/icons-material';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../AuthContext';
import useApi from '../hooks/useApi';
import { useDataSync } from '../contexts/DataSyncContext';
import { useNotifications } from '../contexts/NotificationProvider';

function CompactOperationsDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { get, put, patch, post } = useApi();
  const { success, error: showError } = useToast();
  const { updateTrigger } = useDataSync('tickets');
  const { isConnected } = useNotifications();
  
  const [viewMode, setViewMode] = useState('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('active');

  // Live clock - updates every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'inhouse', label: 'Inhouse' },
    { key: 'onsite', label: 'Onsite' },
    { key: 'needs_parts', label: 'Parts', isAlert: true },
    { key: 'overdue', label: 'Overdue', isAlert: true }
  ];

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = viewMode === 'today' 
        ? await get(`/tickets/daily/${selectedDate}`)
        : await get(`/tickets/`);
      setTickets((response || []).filter(t => t.status !== 'approved'));
    } catch (err) {
      showError('Failed to load');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [get, viewMode, selectedDate, showError]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets, updateTrigger]);

  const categorizedTickets = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      all: tickets,
      inhouse: tickets.filter(t => t.type === 'inhouse'),
      onsite: tickets.filter(t => t.type === 'onsite'),
      needs_parts: tickets.filter(t => t.status === 'needs_parts'),
      overdue: tickets.filter(t => {
        const date = t.date_scheduled || t.date_created;
        return date < today && !['completed', 'closed', 'approved'].includes(t.status);
      })
    };
  }, [tickets]);

  const activeTickets = useMemo(() => {
    let filtered = categorizedTickets[tabs[activeTab].key] || [];
    if (statusFilter === 'active') {
      filtered = filtered.filter(t => !['completed', 'closed', 'approved'].includes(t.status));
    }
    return filtered.sort((a, b) => {
      const pOrder = { emergency: 3, critical: 2, normal: 1 };
      return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
    });
  }, [categorizedTickets, activeTab, statusFilter, tabs]);

  const stats = useMemo(() => ({
    total: tickets.length,
    inProgress: tickets.filter(t => ['in_progress', 'checked_in'].includes(t.status)).length,
    needsParts: categorizedTickets.needs_parts.length,
    overdue: categorizedTickets.overdue.length
  }), [tickets, categorizedTickets]);

  const handleSelectAll = (e) => {
    setSelectedTickets(e.target.checked ? new Set(activeTickets.map(t => t.ticket_id)) : new Set());
  };

  const handleBulkApprove = async () => {
    try {
      await Promise.all(Array.from(selectedTickets).map(id => post(`/tickets/${id}/approve`, { approve: true })));
      success(`Approved ${selectedTickets.size}`);
      setSelectedTickets(new Set());
      fetchTickets();
    } catch {
      showError('Failed');
    }
  };

  const quickAction = async (ticketId, action, e) => {
    e.stopPropagation();
    try {
      if (action === 'in') await put(`/tickets/${ticketId}/check-in`, {});
      else if (action === 'out') await put(`/tickets/${ticketId}/check-out`, {});
      else if (action === 'parts') await patch(`/tickets/${ticketId}/status`, { status: 'needs_parts' });
      success('Updated');
      fetchTickets();
    } catch {
      showError('Failed');
    }
  };

  const getStatusChip = (status) => {
    const configs = {
      open: { color: '#2196f3', bg: '#e3f2fd' },
      scheduled: { color: '#9c27b0', bg: '#f3e5f5' },
      checked_in: { color: '#ff9800', bg: '#fff3e0' },
      in_progress: { color: '#ff5722', bg: '#fbe9e7' },
      needs_parts: { color: '#f44336', bg: '#ffebee' },
      completed: { color: '#4caf50', bg: '#e8f5e9' }
    };
    const cfg = configs[status] || { color: '#757575', bg: '#f5f5f5' };
    return { color: cfg.color, bgcolor: cfg.bg };
  };

  const isOnsiteTooLong = (ticket) => {
    if (!ticket.check_in_time || ticket.check_out_time) return false;
    return (currentTime - new Date(ticket.check_in_time)) / 3600000 >= 2;
  };

  const getOnsiteHours = (ticket) => {
    if (!ticket.check_in_time || ticket.check_out_time) return null;
    return ((currentTime - new Date(ticket.check_in_time)) / 3600000).toFixed(1);
  };

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {/* Ultra-Compact Header */}
      <Paper sx={{ p: 1.5, mb: 1, bgcolor: '#1976d2', color: 'white' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={3} alignItems="center">
            <Typography variant="h6" fontWeight="bold">Daily Ops</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4caf50', 
                animation: 'pulse 2s infinite', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } } 
              }} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                {currentTime.toLocaleTimeString()}
              </Typography>
            </Stack>
            <Chip size="small" icon={isConnected ? <Wifi /> : <WifiOff />} 
              label={isConnected ? "Live" : "Offline"} 
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', height: 24 }} />
          </Stack>
          
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Mini Stats */}
            <Chip label={`${stats.total} Total`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
            <Chip label={`${stats.inProgress} Active`} size="small" sx={{ bgcolor: 'rgba(76,175,80,0.3)', color: 'white' }} />
            {stats.needsParts > 0 && <Chip label={`${stats.needsParts} Parts`} size="small" sx={{ bgcolor: '#f57c00', color: 'white' }} />}
            {stats.overdue > 0 && <Chip label={`${stats.overdue} Overdue`} size="small" sx={{ bgcolor: '#f44336', color: 'white' }} />}
            
            <ToggleButtonGroup value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)} size="small" sx={{ bgcolor: 'white', height: 32 }}>
              <ToggleButton value="today" sx={{ px: 2, py: 0.5 }}>Today</ToggleButton>
              <ToggleButton value="all" sx={{ px: 2, py: 0.5 }}>All</ToggleButton>
            </ToggleButtonGroup>
            
            {viewMode === 'today' && (
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} 
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid white', fontSize: '0.875rem' }} />
            )}
            
            <IconButton size="small" onClick={fetchTickets} sx={{ color: 'white' }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      {/* Compact Tabs */}
      <Paper sx={{ mb: 1 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth" sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 1 } }}>
          {tabs.map((tab, i) => (
            <Tab key={tab.key} label={
              <Badge badgeContent={categorizedTickets[tab.key]?.length} color={tab.isAlert ? 'error' : 'primary'} max={999}>
                <Typography variant="body2" fontWeight="bold">{tab.label}</Typography>
              </Badge>
            } />
          ))}
        </Tabs>
      </Paper>

      {/* Toolbar */}
      {(selectedTickets.size > 0 || activeTickets.length > 0) && (
        <Paper sx={{ px: 2, py: 1, mb: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {selectedTickets.size > 0 ? (
              <>
                <Chip label={`${selectedTickets.size} selected`} size="small" onDelete={() => setSelectedTickets(new Set())} />
                <Button size="small" variant="contained" startIcon={<DoneAll />} onClick={handleBulkApprove}>
                  Approve
                </Button>
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">{activeTickets.length} tickets</Typography>
            )}
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} displayEmpty 
                sx={{ height: 32, fontSize: '0.875rem' }}>
                <MenuItem value="active">Active Only</MenuItem>
                <MenuItem value="all">All</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>
      )}

      {/* ULTRA-COMPACT TABLE - Shows 30-50 tickets on one screen */}
      <Paper sx={{ flex: 1, overflow: 'auto' }}>
        <TableContainer sx={{ maxHeight: '100%' }}>
          <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', fontWeight: 'bold', py: 1 } }}>
                <TableCell padding="checkbox" sx={{ width: 40 }}>
                  <Checkbox size="small" onChange={handleSelectAll} 
                    checked={activeTickets.length > 0 && selectedTickets.size === activeTickets.length} />
                </TableCell>
                <TableCell sx={{ width: 30 }}></TableCell>
                <TableCell sx={{ width: 110 }}>ID</TableCell>
                <TableCell sx={{ width: 60 }}>Type</TableCell>
                <TableCell>Site</TableCell>
                <TableCell sx={{ width: 100 }}>Status</TableCell>
                <TableCell sx={{ width: 70 }}>Priority</TableCell>
                <TableCell sx={{ width: 80 }}>Scheduled</TableCell>
                <TableCell sx={{ width: 100 }}>Assigned</TableCell>
                <TableCell sx={{ width: 120 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">No tickets</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                activeTickets.map((t) => {
                  const tooLong = isOnsiteTooLong(t);
                  const hours = getOnsiteHours(t);
                  const isOverdue = categorizedTickets.overdue.some(ot => ot.ticket_id === t.ticket_id);
                  
                  return (
                    <TableRow
                      key={t.ticket_id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        bgcolor: tooLong ? '#ffebee' : isOverdue ? '#fff3e0' : 'white',
                        borderLeft: tooLong ? '3px solid #f44336' : isOverdue ? '3px solid #ff9800' : 'none',
                        '&:hover': { bgcolor: tooLong ? '#ffcdd2' : isOverdue ? '#ffe0b2' : '#f5f5f5' }
                      }}
                      onClick={() => navigate(`/tickets/${t.ticket_id}`)}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox size="small" checked={selectedTickets.has(t.ticket_id)}
                          onChange={() => {
                            const s = new Set(selectedTickets);
                            s.has(t.ticket_id) ? s.delete(t.ticket_id) : s.add(t.ticket_id);
                            setSelectedTickets(s);
                          }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        {tooLong && <Tooltip title={`Onsite ${hours}h!`}><Warning color="error" fontSize="small" /></Tooltip>}
                        {isOverdue && !tooLong && <Tooltip title="Overdue"><Warning color="warning" fontSize="small" /></Tooltip>}
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
                          {t.ticket_id}
                        </Typography>
                        {t.inc_number && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>INC:{t.inc_number}</Typography>}
                      </TableCell>
                      
                      <TableCell>
                        <Chip label={t.type} size="small" sx={{ height: 20, fontSize: '0.65rem', 
                          bgcolor: t.type === 'onsite' ? '#e3f2fd' : '#e8f5e9', 
                          color: t.type === 'onsite' ? '#1976d2' : '#2e7d32', fontWeight: 600 }} />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{t.site?.location || t.site_id}</Typography>
                        {t.site?.city && <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>{t.site.city}</Typography>}
                      </TableCell>
                      
                      <TableCell>
                        <Chip label={t.status?.replace(/_/g, ' ')} size="small" 
                          sx={{ height: 20, fontSize: '0.65rem', ...getStatusChip(t.status), fontWeight: 600 }} />
                      </TableCell>
                      
                      <TableCell>
                        <Chip label={t.priority} size="small" 
                          sx={{ height: 20, fontSize: '0.65rem', 
                            bgcolor: t.priority === 'emergency' ? '#ffebee' : t.priority === 'critical' ? '#fff3e0' : '#e8f5e9',
                            color: t.priority === 'emergency' ? '#f44336' : t.priority === 'critical' ? '#ff9800' : '#4caf50',
                            fontWeight: 600 
                          }} 
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          {t.date_scheduled ? new Date(t.date_scheduled).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{t.assigned_user?.name || '-'}</Typography>
                      </TableCell>
                      
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.5}>
                          {t.type === 'onsite' && !t.check_in_time && (
                            <Tooltip title="Check In"><IconButton size="small" color="success" onClick={(e) => quickAction(t.ticket_id, 'in', e)} sx={{ p: 0.5 }}>
                              <PlayArrow fontSize="small" />
                            </IconButton></Tooltip>
                          )}
                          {t.type === 'onsite' && t.check_in_time && !t.check_out_time && (
                            <Tooltip title="Check Out"><IconButton size="small" color="success" onClick={(e) => quickAction(t.ticket_id, 'out', e)} sx={{ p: 0.5 }}>
                              <CheckCircle fontSize="small" />
                            </IconButton></Tooltip>
                          )}
                          {!['completed', 'closed', 'approved'].includes(t.status) && (
                            <Tooltip title="Needs Parts"><IconButton size="small" color="warning" onClick={(e) => quickAction(t.ticket_id, 'parts', e)} sx={{ p: 0.5 }}>
                              <LocalShipping fontSize="small" />
                            </IconButton></Tooltip>
                          )}
                          <Tooltip title="View Details"><IconButton size="small" sx={{ p: 0.5 }}>
                            <Visibility fontSize="small" />
                          </IconButton></Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Bottom Bar - Compact Stats */}
      <Paper sx={{ px: 2, py: 0.5, bgcolor: '#fafafa', borderTop: 2, borderColor: '#1976d2' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Typography>
          <Typography variant="caption"><strong>{user?.name}</strong> • {user?.role}</Typography>
          <Typography variant="caption" color={isConnected ? 'success.main' : 'error.main'}>
            {isConnected ? '● Connected' : '● Disconnected'}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

export default CompactOperationsDashboard;

