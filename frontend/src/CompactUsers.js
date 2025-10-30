import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Stack, TextField, InputAdornment, Typography, Chip,
  Popover, FormControlLabel, Checkbox, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import { Add, Visibility, Edit, Search, Refresh, ViewColumn } from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';

function CompactUsers() {
  const navigate = useNavigate();
  const api = useApi();
  const { error: showError } = useToast();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [columnAnchor, setColumnAnchor] = useState(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const apiRef = React.useRef(api);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    role: true,
    phone: true,
    status: true
  });

  // Keep API ref current
  React.useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const fetchUsers = async () => {
    try {
      const response = await apiRef.current.get('/users/?include_inactive=true');
      setUsers(response || []);
    } catch {
      showError('Failed');
    }
  };

  useEffect(() => {
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const handleResetPassword = async (u) => {
    try {
      const res = await api.post(`/users/${u.user_id}/reset_password`);
      setTempPassword(res?.temp_password || '');
      setResetDialog(true);
    } catch (e) {
      showError('Failed to reset password');
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try {
      await api.delete(`/users/${u.user_id}`);
      setUsers(prev => prev.filter(x => x.user_id !== u.user_id));
    } catch (e) {
      showError('Failed to delete user');
    }
  };

  const filtered = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="h6" fontWeight="bold">Users ({filtered.length})</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ width: 200, '& input': { py: 0.5, fontSize: '0.875rem' } }} />
          <IconButton size="small" onClick={(e) => setColumnAnchor(e.currentTarget)} title="Show/Hide Columns">
            <ViewColumn fontSize="small" />
          </IconButton>
          <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/users/new')}>New</Button>
          <IconButton size="small" onClick={fetchUsers}><Refresh fontSize="small" /></IconButton>
        </Stack>
      </Stack>

      <Paper sx={{ flex: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', fontWeight: 'bold', borderBottom: 2, borderColor: '#388e3c' } }}>
                {visibleColumns.name && <TableCell>Name</TableCell>}
                {visibleColumns.email && <TableCell>Email</TableCell>}
                {visibleColumns.role && <TableCell>Role</TableCell>}
                {visibleColumns.phone && <TableCell>Phone</TableCell>}
                {visibleColumns.status && <TableCell>Status</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.user_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/users/${u.user_id}/edit`)}>
                  {visibleColumns.name && <TableCell><Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{u.name}</Typography></TableCell>}
                  {visibleColumns.email && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{u.email}</Typography></TableCell>}
                  {visibleColumns.role && <TableCell><Chip label={u.role} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }} /></TableCell>}
                  {visibleColumns.phone && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{u.phone}</Typography></TableCell>}
                  {visibleColumns.status && <TableCell><Chip label={u.active ? 'Active' : 'Inactive'} size="small" color={u.active ? 'success' : 'default'} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }} /></TableCell>}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" sx={{ p: 0.3 }}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" sx={{ p: 0.3 }} onClick={() => navigate(`/users/${u.user_id}/edit`)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                      <Button size="small" variant="outlined" onClick={() => handleResetPassword(u)}>Reset</Button>
                      
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
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
        PaperProps={{ sx: { maxHeight: 500, overflow: 'auto' } }}
      >
        <Box sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>Show/Hide Columns</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.5}>
            <FormControlLabel control={<Checkbox checked={visibleColumns.name} onChange={() => toggleColumn('name')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Name</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.email} onChange={() => toggleColumn('email')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Email</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.role} onChange={() => toggleColumn('role')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Role</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.phone} onChange={() => toggleColumn('phone')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Phone</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.status} onChange={() => toggleColumn('status')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Status</Typography>} />
          </Stack>
        </Box>
      </Popover>

      <Dialog open={resetDialog} onClose={() => setResetDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Temporary Password</DialogTitle>
        <DialogContent>
          {tempPassword ? (
            <>
              <Typography sx={{ mb: 1 }}>Provide this temporary password to the user. They will be required to change it on first login.</Typography>
              <TextField value={tempPassword} fullWidth InputProps={{ readOnly: true }} />
            </>
          ) : (
            <Alert severity="error">Failed to generate a temporary password.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CompactUsers;
