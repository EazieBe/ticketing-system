import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Avatar, Badge, Tooltip, List, ListItem, ListItemText, ListItemAvatar, Divider
} from '@mui/material';
import {
  Add, Edit, Delete, Visibility, Person, Schedule, CheckCircle, Cancel, Warning,
  LocalShipping, Build, Inventory, Flag, FlagOutlined, Star, StarBorder,
  Notifications, NotificationsOff, ExpandMore, ExpandLess, FilterList, Sort
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useWebSocket from './hooks/useWebSocket';
import dayjs from 'dayjs';
import { 
  Switch, FormControlLabel, 
  DialogContentText, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UserForm from './UserForm';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import DownloadIcon from '@mui/icons-material/Download';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import FilterListIcon from '@mui/icons-material/FilterList';

function Users() {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteUser, setNoteUser] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tempPasswordDialog, setTempPasswordDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const isAdmin = user?.role === 'admin';

  // WebSocket setup - will be configured after fetchUsers is defined

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/');
      setUsers(response || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket callback functions - defined after fetchUsers
  const handleWebSocketMessage = useCallback((data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'user_update' || message.type === 'user_created' || message.type === 'user_deleted') {
        // Use a timeout to avoid calling fetchUsers before it's defined
        setTimeout(() => {
          if (typeof fetchUsers === 'function') {
            fetchUsers();
          }
        }, 100);
      }
    } catch (e) {
      // Handle non-JSON messages
    }
  }, []);

  const { isConnected } = useWebSocket(`ws://192.168.43.50:8000/ws/updates`, handleWebSocketMessage);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAdd = () => {
    setEditUser(null);
    setEditDialog(true);
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setEditDialog(true);
  };

  const handleClose = () => {
    setEditDialog(false);
    setEditUser(null);
  };

  const handleSubmit = async (values) => {
    if (editUser) {
      try {
        const response = await api.put(`/users/${editUser.user_id}`, values);
        setUsers(prevUsers => prevUsers.map(u => 
          u.user_id === editUser.user_id ? response : u
        ));
        handleClose();
        setError(null);
        showToast('User updated successfully', 'success');
      } catch (err) {
        console.error('Error updating user:', err);
        setError('Failed to update user');
        showToast('Failed to update user', 'error');
      }
    } else {
      try {
        const res = await api.post('/users/', values);
        setUsers(prevUsers => [...prevUsers, res]);
        handleClose();
        setError(null);
        showToast('User added successfully', 'success');
        if (res.temp_password) {
          setTempPassword(res.temp_password);
          setTempPasswordDialog(true);
        }
      } catch (err) {
        console.error('Error adding user:', err);
        setError('Failed to add user');
        showToast('Failed to add user', 'error');
      }
    }
  };

  const handleRoleChange = (user, newRole) => {
    api.put(`/users/${user.user_id}`, { 
      name: user.name,
      email: user.email,
      role: newRole,
      phone: user.phone,
      region: user.region,
      preferences: user.preferences
    })
    .then(() => fetchUsers())
    .catch(() => setError('Failed to update user role'));
  };

  const handleActiveToggle = (user) => {
    api.put(`/users/${user.user_id}`, { 
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      region: user.region,
      preferences: user.preferences,
      active: !user.active
    })
    .then(() => fetchUsers())
    .catch(() => setError('Failed to update user status'));
  };

  const handleResetPassword = async (user) => {
    try {
      const res = await api.post(`/users/${user.user_id}/reset_password`);
      setTempPassword(res.data.temp_password);
      setTempPasswordDialog(true);
    } catch {
      setError('Failed to reset password');
    }
  };

  const handleCopy = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } else {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyFeedback('Copied!');
        setTimeout(() => setCopyFeedback(''), 2000);
      } catch (err) {
        setCopyFeedback('Failed to copy');
        setTimeout(() => setCopyFeedback(''), 2000);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleQuickNote = (user) => {
    setNoteUser(user);
    setNoteDialog(true);
  };

  const handleNoteSubmit = () => {
    if (!noteUser || !noteText) return;
    
    const updatedPreferences = noteUser.preferences 
      ? `${noteUser.preferences}\nNote: ${noteText}`
      : `Note: ${noteText}`;
    
    api.put(`/users/${noteUser.user_id}`, { 
      name: noteUser.name,
      email: noteUser.email,
      role: noteUser.role,
      phone: noteUser.phone,
      region: noteUser.region,
      preferences: updatedPreferences,
      active: noteUser.active
    })
    .then(() => {
      setNoteDialog(false);
      setNoteUser(null);
      setNoteText('');
      fetchUsers();
    })
    .catch(() => setError('Failed to add note'));
  };

  const handleDelete = (user) => {
    setDeleteUser(user);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteUser) return;
    
    api.delete(`/users/${deleteUser.user_id}`)
      .then(() => {
        setDeleteDialog(false);
        // Remove the user from the local state immediately
        setUsers(prevUsers => prevUsers.filter(u => u.user_id !== deleteUser.user_id));
        setDeleteUser(null);
        setError(null);
        showToast('User deleted successfully', 'success');
      })
      .catch(() => setError('Failed to delete user'));
  };

  const handleExportCSV = () => {
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Phone', 'Region', 'Active', 'Preferences'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(user => [
        user.user_id,
        `"${user.name}"`,
        `"${user.email}"`,
        user.role,
        `"${user.phone || ''}"`,
        `"${user.region || ''}"`,
        user.active !== false ? 'Yes' : 'No',
        `"${user.preferences || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = !filterRole || user.role === filterRole;
    const matchesSearch = !searchTerm || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRole && matchesSearch;
  });

  const getRowColor = (user) => {
    if (user.active === false) return '#ffebee';
    if (darkMode) return '#424242';
    return '#fff';
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error" action={<Button color="inherit" size="small" onClick={fetchUsers}>Retry</Button>}>{error}</Alert>;
  if (!isAdmin) return <Alert severity="info">You do not have permission to manage users.</Alert>;

  return (
    <Box sx={{ 
      bgcolor: darkMode ? '#121212' : 'background.default',
      color: darkMode ? 'white' : 'text.primary',
      minHeight: '100vh',
      p: 2
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ color: darkMode ? 'white' : 'text.primary' }}>
          Users ({filteredUsers.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ToggleButtonGroup
            value={darkMode ? 'dark' : 'light'}
            exclusive
            onChange={(e, value) => setDarkMode(value === 'dark')}
            size="small"
          >
            <ToggleButton value="light">
              <LightModeIcon />
            </ToggleButton>
            <ToggleButton value="dark">
              <DarkModeIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleAdd}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: darkMode ? '#1e1e1e' : 'background.paper' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Search Users"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Name, email, or phone..."
            size="small"
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filter by Role</InputLabel>
            <Select
              value={filterRole}
              label="Filter by Role"
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="dispatcher">Dispatcher</MenuItem>
              <MenuItem value="tech">Tech</MenuItem>
              <MenuItem value="billing">Billing</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => {
              setFilterRole('');
              setSearchTerm('');
            }}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Table with horizontal scroll */}
      <Paper sx={{ 
        bgcolor: darkMode ? '#1e1e1e' : 'background.paper',
        overflow: 'auto'
      }}>
        <TableContainer sx={{ maxHeight: '70vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: darkMode ? '#424242' : 'background.paper', color: darkMode ? 'white' : 'text.primary' }}>User ID</TableCell>
                <TableCell sx={{ bgcolor: darkMode ? '#424242' : 'background.paper', color: darkMode ? 'white' : 'text.primary' }}>Name</TableCell>
                <TableCell sx={{ bgcolor: darkMode ? '#424242' : 'background.paper', color: darkMode ? 'white' : 'text.primary' }}>Email</TableCell>
                <TableCell sx={{ bgcolor: darkMode ? '#424242' : 'background.paper', color: darkMode ? 'white' : 'text.primary' }}>Role</TableCell>
                <TableCell sx={{ bgcolor: darkMode ? '#424242' : 'background.paper', color: darkMode ? 'white' : 'text.primary' }}>Phone</TableCell>
                <TableCell sx={{ bgcolor: darkMode ? '#424242' : 'background.paper', color: darkMode ? 'white' : 'text.primary' }}>Region</TableCell>
                <TableCell sx={{ bgcolor: darkMode ? '#424242' : 'background.paper', color: darkMode ? 'white' : 'text.primary' }}>Status</TableCell>
                <TableCell sx={{ bgcolor: darkMode ? '#424242' : 'background.paper', color: darkMode ? 'white' : 'text.primary' }}>Preferences</TableCell>
                {isAdmin && <TableCell sx={{ bgcolor: darkMode ? '#424242' : 'background.paper', color: darkMode ? 'white' : 'text.primary' }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.user_id} sx={{ bgcolor: getRowColor(user) }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {user.user_id.substring(0, 8)}...
                      </Typography>
                      <Tooltip title="Copy User ID">
                        <IconButton size="small" onClick={() => handleCopy(user.user_id)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Quick Add Note">
                        <IconButton size="small" onClick={() => handleQuickNote(user)}>
                          <NoteAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{user.email}</Typography>
                      <Tooltip title="Copy Email">
                        <IconButton size="small" onClick={() => handleCopy(user.email)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      size="small" 
                      color={user.role === 'admin' ? 'error' : user.role === 'dispatcher' ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>{user.region || '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.active !== false ? 'Active' : 'Inactive'} 
                      size="small" 
                      color={user.active !== false ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={user.preferences || 'No preferences'}>
                      <Typography variant="body2" sx={{ 
                        maxWidth: 150, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {user.preferences || '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <Tooltip title="Edit User">
                          <IconButton onClick={() => handleEdit(user)} size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton onClick={() => handleDelete(user)} size="small" color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reset Password">
                          <Button size="small" variant="outlined" onClick={() => handleResetPassword(user)}>
                            Reset
                          </Button>
                        </Tooltip>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={user.role}
                            onChange={e => handleRoleChange(user, e.target.value)}
                            size="small"
                          >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="dispatcher">Dispatcher</MenuItem>
                            <MenuItem value="tech">Tech</MenuItem>
                            <MenuItem value="billing">Billing</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={user.active !== false} 
                              onChange={() => handleActiveToggle(user)}
                              size="small"
                            />
                          }
                          label=""
                        />
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {copyFeedback && (
        <Alert severity="success" sx={{ position: 'fixed', top: 80, right: 40, zIndex: 2000 }}>
          {copyFeedback}
        </Alert>
      )}

      {/* Dialogs */}
      <Dialog open={editDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <UserForm initialValues={editUser} onSubmit={handleSubmit} isEdit={!!editUser} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={noteDialog} onClose={() => setNoteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Quick Add Note</DialogTitle>
        <DialogContent>
          <TextField 
            label="Note" 
            value={noteText} 
            onChange={e => setNoteText(e.target.value)} 
            fullWidth 
            multiline 
            minRows={3} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(false)}>Cancel</Button>
          <Button onClick={handleNoteSubmit} variant="contained">Add Note</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user "{deleteUser?.name}" ({deleteUser?.email})?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={tempPasswordDialog} onClose={() => setTempPasswordDialog(false)}>
        <DialogTitle>Temporary Password</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The temporary password for this user is:
          </DialogContentText>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <TextField value={tempPassword} fullWidth InputProps={{ readOnly: true }} />
            <IconButton onClick={() => handleCopy(tempPassword)}><ContentCopyIcon /></IconButton>
          </Box>
          <DialogContentText sx={{ mt: 2 }}>
            Please copy and provide this password to the user. They will be required to change it on first login.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTempPasswordDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Users; 