import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Checkbox, Button, Stack, FormControl, Select, MenuItem,
  Typography, Tooltip, TextField, InputAdornment, Popover, FormControlLabel, Divider
} from '@mui/material';
import {
  Add, Visibility, Edit, Delete, PlayArrow, CheckCircle, LocalShipping, Search, Refresh, DoneAll, ViewColumn, UploadFile, Download
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import { useDataSync } from './contexts/DataSyncContext';

function CompactTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const { success, error: showError } = useToast();
  const { updateTrigger } = useDataSync('tickets');
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [filters, setFilters] = useState({ type: 'all', status: 'active', priority: 'all', search: '' });
  const [columnAnchor, setColumnAnchor] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    ticket_id: true,
    type: true,
    site: true,
    status: true,
    priority: true,
    assigned: true,
    date: true
  });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets/');
      setTickets((response || []).filter(t => t.status !== 'approved'));
    } catch (err) {
      showError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateTrigger]);

  const filtered = useMemo(() => {
    let result = tickets;
    
    if (filters.type !== 'all') result = result.filter(t => t.type === filters.type);
    if (filters.status === 'active') result = result.filter(t => !['completed', 'closed', 'approved'].includes(t.status));
    else if (filters.status !== 'all') result = result.filter(t => t.status === filters.status);
    if (filters.priority !== 'all') result = result.filter(t => t.priority === filters.priority);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(t => 
        t.ticket_id?.toLowerCase().includes(s) ||
        t.site_id?.toLowerCase().includes(s) ||
        t.site?.location?.toLowerCase().includes(s) ||
        t.notes?.toLowerCase().includes(s)
      );
    }
    
    return result.sort((a, b) => {
      const pOrder = { emergency: 3, critical: 2, normal: 1 };
      return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
    });
  }, [tickets, filters]);

  const quickAction = async (ticketId, action, e) => {
    e.stopPropagation();
    try {
      if (action === 'in') await api.put(`/tickets/${ticketId}/check-in`, {});
      else if (action === 'out') await api.put(`/tickets/${ticketId}/check-out`, {});
      else if (action === 'parts') await api.patch(`/tickets/${ticketId}/status`, { status: 'needs_parts' });
      success('Updated');
      fetchTickets();
    } catch {
      showError('Failed');
    }
  };

  const bulkApprove = async () => {
    try {
      await Promise.all(Array.from(selected).map(id => api.post(`/tickets/${id}/approve`, { approve: true })));
      success(`Approved ${selected.size}`);
      setSelected(new Set());
      fetchTickets();
    } catch {
      showError('Failed');
    }
  };

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const getStatusColor = (status) => {
    const configs = {
      open: { color: '#1976d2', bg: '#e3f2fd' },
      scheduled: { color: '#9c27b0', bg: '#f3e5f5' },
      checked_in: { color: '#ff9800', bg: '#fff3e0' },
      in_progress: { color: '#ff5722', bg: '#fbe9e7' },
      needs_parts: { color: '#f44336', bg: '#ffebee' },
      completed: { color: '#4caf50', bg: '#e8f5e9' }
    };
    return configs[status] || { color: '#757575', bg: '#f5f5f5' };
  };

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Compact Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" fontWeight="bold">Tickets ({filtered.length})</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/tickets/new')}>
            New Ticket
          </Button>
          <IconButton size="small" title="Export CSV" onClick={() => {
            const headers = ['ticket_id','type','site_id','status','priority','date_created','date_scheduled'];
            const rows = tickets.map(t => headers.map(h => (t[h] ?? '')).join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'tickets.csv'; a.click(); URL.revokeObjectURL(url);
          }}>
            <Download fontSize="small" />
          </IconButton>
          <IconButton size="small" component="label" title="Import CSV">
            <UploadFile fontSize="small" />
            <input type="file" accept=".csv" hidden onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const text = await file.text();
              const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
              const headers = headerLine.split(',');
              let imported = 0;
              for (const line of lines) {
                const cols = line.split(',');
                const record = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
                try { await api.post('/tickets/', record); imported++; } catch {}
              }
              await fetchTickets();
              if (imported === 0) showError('No records imported');
            }} />
          </IconButton>
          <IconButton size="small" onClick={fetchTickets}><Refresh fontSize="small" /></IconButton>
        </Stack>
      </Stack>

      {/* Compact Filters */}
      <Paper sx={{ p: 1, mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {selected.size > 0 ? (
            <>
              <Chip label={`${selected.size} selected`} size="small" onDelete={() => setSelected(new Set())} />
              <Button size="small" variant="contained" startIcon={<DoneAll />} onClick={bulkApprove}>Approve</Button>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">{filtered.length} tickets</Typography>
          )}
          
          <TextField
            size="small"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ width: 200, '& input': { py: 0.5, fontSize: '0.875rem' } }}
          />
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))} sx={{ fontSize: '0.875rem', height: 32 }}>
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="inhouse">Inhouse</MenuItem>
              <MenuItem value="onsite">Onsite</MenuItem>
              <MenuItem value="projects">Projects</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))} sx={{ fontSize: '0.875rem', height: 32 }}>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select value={filters.priority} onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))} sx={{ fontSize: '0.875rem', height: 32 }}>
              <MenuItem value="all">All Priority</MenuItem>
              <MenuItem value="emergency">Emergency</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
          
          <IconButton size="small" onClick={(e) => setColumnAnchor(e.currentTarget)} title="Show/Hide Columns">
            <ViewColumn fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>

      {/* Ultra-Compact Table */}
      <Paper sx={{ flex: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', fontWeight: 'bold', borderBottom: 2, borderColor: '#1976d2' } }}>
                <TableCell padding="checkbox" sx={{ width: 40 }}>
                  <Checkbox size="small" onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map(t => t.ticket_id)) : new Set())} />
                </TableCell>
                {visibleColumns.ticket_id && <TableCell sx={{ width: 100 }}>ID</TableCell>}
                {visibleColumns.type && <TableCell sx={{ width: 60 }}>Type</TableCell>}
                {visibleColumns.site && <TableCell>Site</TableCell>}
                {visibleColumns.status && <TableCell sx={{ width: 100 }}>Status</TableCell>}
                {visibleColumns.priority && <TableCell sx={{ width: 70 }}>Priority</TableCell>}
                {visibleColumns.date && <TableCell sx={{ width: 80 }}>Date</TableCell>}
                {visibleColumns.assigned && <TableCell sx={{ width: 90 }}>Assigned</TableCell>}
                <TableCell sx={{ width: 120 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((t) => {
                const statusCfg = getStatusColor(t.status);
                
                return (
                  <TableRow
                    key={t.ticket_id}
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                    onClick={() => navigate(`/tickets/${t.ticket_id}`)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={selected.has(t.ticket_id)}
                        onChange={() => {
                          const s = new Set(selected);
                          s.has(t.ticket_id) ? s.delete(t.ticket_id) : s.add(t.ticket_id);
                          setSelected(s);
                        }}
                      />
                    </TableCell>
                    
                    {visibleColumns.ticket_id && (
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
                          {t.ticket_id}
                        </Typography>
                      </TableCell>
                    )}
                    
                    {visibleColumns.type && (
                      <TableCell>
                        <Chip label={t.type} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }} />
                      </TableCell>
                    )}
                    
                    {visibleColumns.site && (
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          {t.site?.location || t.site_id}
                        </Typography>
                      </TableCell>
                    )}
                    
                    {visibleColumns.status && (
                      <TableCell>
                        <Chip label={t.status?.replace(/_/g, ' ')} size="small" 
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, color: statusCfg.color, bgcolor: statusCfg.bg }} />
                      </TableCell>
                    )}
                    
                    {visibleColumns.priority && (
                      <TableCell>
                        <Chip label={t.priority} size="small" 
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600,
                          color: t.priority === 'emergency' ? '#f44336' : t.priority === 'critical' ? '#ff9800' : '#4caf50',
                          bgcolor: t.priority === 'emergency' ? '#ffebee' : t.priority === 'critical' ? '#fff3e0' : '#e8f5e9'
                        }} 
                      />
                      </TableCell>
                    )}
                    
                    {visibleColumns.date && (
                      <TableCell>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          {new Date(t.date_scheduled || t.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Typography>
                      </TableCell>
                    )}
                    
                    {visibleColumns.assigned && (
                      <TableCell>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          {t.assigned_user?.name?.split(' ')[0] || '-'}
                        </Typography>
                      </TableCell>
                    )}
                    
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5}>
                        {t.type === 'onsite' && !t.check_in_time && (
                          <Tooltip title="Check In"><IconButton size="small" color="success" onClick={(e) => quickAction(t.ticket_id, 'in', e)} sx={{ p: 0.3 }}>
                            <PlayArrow sx={{ fontSize: 16 }} />
                          </IconButton></Tooltip>
                        )}
                        {t.type === 'onsite' && t.check_in_time && !t.check_out_time && (
                          <Tooltip title="Check Out"><IconButton size="small" color="success" onClick={(e) => quickAction(t.ticket_id, 'out', e)} sx={{ p: 0.3 }}>
                            <CheckCircle sx={{ fontSize: 16 }} />
                          </IconButton></Tooltip>
                        )}
                        <Tooltip title="View"><IconButton size="small" sx={{ p: 0.3 }}>
                          <Visibility sx={{ fontSize: 16 }} />
                        </IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Column Visibility Popover */}
      <Popover
        open={Boolean(columnAnchor)}
        anchorEl={columnAnchor}
        onClose={() => setColumnAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            maxHeight: 500,
            overflow: 'auto'
          }
        }}
      >
        <Box sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>Show/Hide Columns</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.5}>
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.ticket_id} onChange={() => toggleColumn('ticket_id')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Ticket ID</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.type} onChange={() => toggleColumn('type')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Type</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.site} onChange={() => toggleColumn('site')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Site</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.status} onChange={() => toggleColumn('status')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Status</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.priority} onChange={() => toggleColumn('priority')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Priority</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.date} onChange={() => toggleColumn('date')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Date</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.assigned} onChange={() => toggleColumn('assigned')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Assigned</Typography>}
            />
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}

export default CompactTickets;


