import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Box, TextField, FormControl, InputLabel, Select, MenuItem, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress, Grid,
  Card, CardContent, Avatar, Badge, Tooltip, List, ListItem, ListItemText, Divider, TablePagination
} from '@mui/material';
import {
  Visibility, Edit, Delete, Person, Schedule, CheckCircle, Cancel, Warning,
  LocalShipping, Build, Inventory, Flag, FlagOutlined, Star, StarBorder,
  Notifications, NotificationsOff, ExpandMore, ExpandLess, FilterList, Sort,
  Assignment, Store, Group, Info, History, Refresh, Download, Timeline, Search
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useWebSocket from './hooks/useWebSocket';
import dayjs from 'dayjs';

function Audit() {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterField, setFilterField] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [users, setUsers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    user: 'all',
    action: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // WebSocket setup - will be configured after fetchAudits is defined

  const fetchAudits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/audits/');
      setAudits(response || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching audits:', err);
      setError('Failed to load audit logs');
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket callback functions - defined after fetchAudits
  const handleWebSocketMessage = useCallback((data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'audit_update' || message.type === 'audit_created') {
        // Use a timeout to avoid calling fetchAudits before it's defined
        setTimeout(() => {
          if (typeof fetchAudits === 'function') {
            fetchAudits();
          }
        }, 100);
      }
    } catch (e) {
      // Handle non-JSON messages
    }
  }, []);

  const { isConnected } = useWebSocket(`ws://192.168.43.50:8000/ws/updates`, handleWebSocketMessage);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
    fetchUsers();
  }, []);

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'ticket': return <Assignment />;
      case 'site': return <Store />;
      case 'shipment': return <LocalShipping />;
      case 'inventory': return <Inventory />;
      case 'field_tech': return <Build />;
      case 'user': return <Group />;
      default: return <Info />;
    }
  };

  const getEntityColor = (entityType) => {
    switch (entityType) {
      case 'ticket': return 'primary';
      case 'site': return 'success';
      case 'shipment': return 'warning';
      case 'inventory': return 'info';
      case 'field_tech': return 'secondary';
      case 'user': return 'error';
      default: return 'default';
    }
  };

  const getChangeType = (oldValue, newValue) => {
    if (!oldValue && newValue) return 'created';
    if (oldValue && !newValue) return 'deleted';
    return 'updated';
  };

  const getChangeColor = (oldValue, newValue) => {
    const changeType = getChangeType(oldValue, newValue);
    switch (changeType) {
      case 'created': return 'success';
      case 'deleted': return 'error';
      case 'updated': return 'warning';
      default: return 'default';
    }
  };

  const filteredAudits = audits.filter(audit => {
    const matchesSearch = !searchTerm || 
      audit.field_changed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.old_value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.new_value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(audit.user_id).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUser = !filterUser || audit.user_id === filterUser;
    const matchesEntity = !filterEntity || audit.ticket_id?.includes(filterEntity) || 
                         audit.ticket_id === null; // For non-ticket audits
    const matchesField = !filterField || audit.field_changed === filterField;
    
    const matchesDateFrom = !dateFrom || dayjs(audit.change_time).isAfter(dayjs(dateFrom));
    const matchesDateTo = !dateTo || dayjs(audit.change_time).isBefore(dayjs(dateTo));

    return matchesSearch && matchesUser && matchesEntity && matchesField && 
           matchesDateFrom && matchesDateTo;
  });

  const paginatedAudits = filteredAudits.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const uniqueFields = [...new Set(audits.map(audit => audit.field_changed).filter(Boolean))];
  const uniqueEntities = [...new Set(audits.map(audit => audit.ticket_id).filter(Boolean))];

  // Function to get user name from user ID
  const getUserName = (userId) => {
    if (!userId) return 'System';
    const user = users.find(u => u.user_id === userId);
    return user ? user.name : userId;
  };

  // Function to format old/new values for better display
  const formatValue = (value, fieldChanged) => {
    if (!value) return '-';
    
    // For user-related fields, try to show user names
    if (fieldChanged === 'user_delete' || fieldChanged === 'user_create' || fieldChanged === 'user_update') {
      return getUserName(value);
    }
    
    return value;
  };

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Entity', 'Field', 'Old Value', 'New Value', 'Change Type'],
      ...filteredAudits.map(audit => [
        dayjs(audit.change_time).format('YYYY-MM-DD HH:mm:ss'),
        getUserName(audit.user_id),
        audit.ticket_id || 'N/A',
        audit.field_changed,
        formatValue(audit.old_value, audit.field_changed),
        formatValue(audit.new_value, audit.field_changed),
        getChangeType(audit.old_value, audit.new_value)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAuditClick = (audit) => {
    setSelectedAudit(audit);
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
        Audit Log
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
            <TextField
              fullWidth
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search field, values, or user..."
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>User</InputLabel>
              <Select
                value={filterUser}
                label="User"
                onChange={(e) => setFilterUser(e.target.value)}
              >
                <MenuItem value="">All Users</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.user_id} value={user.user_id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Field</InputLabel>
              <Select
                value={filterField}
                label="Field"
                onChange={(e) => setFilterField(e.target.value)}
              >
                <MenuItem value="">All Fields</MenuItem>
                {uniqueFields.map((field) => (
                  <MenuItem key={field} value={field}>
                    {field}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Entity</InputLabel>
              <Select
                value={filterEntity}
                label="Entity"
                onChange={(e) => setFilterEntity(e.target.value)}
              >
                <MenuItem value="">All Entities</MenuItem>
                {uniqueEntities.map((entity) => (
                  <MenuItem key={entity} value={entity}>
                    {entity}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchAudits}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
              >
                Export
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

        {showFilters && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date From"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date To"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Stats */}
      <Box sx={{ mb: 2 }}>
        <Chip 
          label={`${audits.length} total entries`} 
          color="primary" 
          sx={{ mr: 1 }}
        />
        <Chip 
          label={`${filteredAudits.length} filtered results`} 
          color="info" 
          sx={{ mr: 1 }}
        />
        <Chip 
          label={`${uniqueFields.length} unique fields`} 
          color="secondary"
        />
      </Box>

      {/* Audit Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Field</TableCell>
                <TableCell>Change</TableCell>
                <TableCell>Old Value</TableCell>
                <TableCell>New Value</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedAudits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No audit entries found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAudits.map((audit) => (
                  <TableRow 
                    key={audit.audit_id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleAuditClick(audit)}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Timeline sx={{ mr: 1, fontSize: 'small' }} />
                        {dayjs(audit.change_time).format('MMM DD, YYYY HH:mm')}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Person sx={{ mr: 1, fontSize: 'small' }} />
                        {getUserName(audit.user_id)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {getEntityIcon(audit.ticket_id ? 'ticket' : 'other')}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {audit.ticket_id || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={audit.field_changed} 
                        size="small" 
                        color={getEntityColor('ticket')}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getChangeType(audit.old_value, audit.new_value)} 
                        size="small" 
                        color={getChangeColor(audit.old_value, audit.new_value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {formatValue(audit.old_value, audit.field_changed)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {formatValue(audit.new_value, audit.field_changed)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <Info />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredAudits.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Audit Detail Dialog */}
      <Dialog 
        open={!!selectedAudit} 
        onClose={() => setSelectedAudit(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedAudit && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <History sx={{ mr: 1 }} />
                Audit Entry Details
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Basic Information</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Audit ID</Typography>
                          <Typography variant="body1">{selectedAudit.audit_id}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Timestamp</Typography>
                          <Typography variant="body1">
                            {dayjs(selectedAudit.change_time).format('MMMM DD, YYYY HH:mm:ss')}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">User</Typography>
                          <Typography variant="body1">{getUserName(selectedAudit.user_id)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Entity</Typography>
                          <Typography variant="body1">{selectedAudit.ticket_id || 'N/A'}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Change Details</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">Field Changed</Typography>
                          <Chip 
                            label={selectedAudit.field_changed} 
                            color="primary" 
                            sx={{ mt: 1 }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Old Value</Typography>
                          <Typography variant="body1" sx={{ 
                            fontFamily: 'monospace', 
                            backgroundColor: 'grey.100', 
                            p: 1, 
                            borderRadius: 1,
                            wordBreak: 'break-word'
                          }}>
                            {selectedAudit.old_value || 'null'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">New Value</Typography>
                          <Typography variant="body1" sx={{ 
                            fontFamily: 'monospace', 
                            backgroundColor: 'grey.100', 
                            p: 1, 
                            borderRadius: 1,
                            wordBreak: 'break-word'
                          }}>
                            {selectedAudit.new_value || 'null'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">Change Type</Typography>
                          <Chip 
                            label={getChangeType(selectedAudit.old_value, selectedAudit.new_value)} 
                            color={getChangeColor(selectedAudit.old_value, selectedAudit.new_value)}
                            sx={{ mt: 1 }}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedAudit(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default Audit; 