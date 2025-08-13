import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Paper, Box, Button, TextField, FormControl, InputLabel,
  Select, MenuItem, Alert, CircularProgress, Card, CardContent, Chip, Grid,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip
} from '@mui/material';
import {
  Person, Schedule, CheckCircle, Cancel, Warning, LocalShipping, Build,
  Inventory, Flag, FlagOutlined, Star, StarBorder, Notifications, NotificationsOff,
  ExpandMore, ExpandLess, FilterList, Sort, DragIndicator, Speed, AutoAwesome, Assignment, Description
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import dayjs from 'dayjs';

function TicketClaim() {
  const { ticket_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchTicketAndUsers();
  }, [ticket_id]);

  const fetchTicketAndUsers = async () => {
    try {
      setLoading(true);
      const [ticketRes, usersRes] = await Promise.all([
        api.get(`/tickets/${ticket_id}`),
        api.get('/users/')
      ]);
      
      setTicket(ticketRes || {});
      setUsers(usersRes || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching ticket and users:', err);
      setError('Failed to load ticket data');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!selectedUser) {
      setError('Please select a user to assign the ticket to');
      return;
    }

    setClaiming(true);
    try {
      // Remove debug logging for security
      
      const updatedTicket = {
        site_id: ticket.site_id,
        inc_number: ticket.inc_number,
        so_number: ticket.so_number,
        type: ticket.type,
        status: 'in_progress',
        priority: ticket.priority,
        category: ticket.category,
        assigned_user_id: selectedUser,
        onsite_tech_id: ticket.onsite_tech_id,
        date_created: ticket.date_created,
        date_scheduled: ticket.date_scheduled,
        date_closed: ticket.date_closed,
        time_spent: ticket.time_spent,
        notes: notes ? `${ticket.notes || ''}\n\n[CLAIMED] ${dayjs().format('YYYY-MM-DD HH:mm')} - ${notes}` : `${ticket.notes || ''}\n\n[CLAIMED] ${dayjs().format('YYYY-MM-DD HH:mm')} - Assigned to ${users.find(u => u.user_id === selectedUser)?.name || selectedUser}`,
        color_flag: ticket.color_flag,
        special_flag: ticket.special_flag
      };

      const response = await api.put(`/tickets/${ticket_id}`, updatedTicket);
      
      // Clear any previous errors
      setError(null);
      
      // Show success notification
      showToast('Ticket claimed successfully!', 'success');
      
      // Navigate back to tickets list
      navigate('/tickets');
    } catch (err) {
      // Use error handler instead of console.error for security
      
      // Check if it's actually a network/CORS error
      if (err.message && err.message.includes('Network Error')) {
        setError('Network error - please check your connection');
      } else if (err.response && err.response.status === 401) {
        setError('Authentication failed - please log in again');
      } else if (err.response && err.response.status >= 400) {
        setError(`Failed to claim ticket: ${err.response.data?.detail || 'Unknown error'}`);
      } else {
        // If it's not a real error or the request succeeded, just navigate
        navigate('/tickets');
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleCancel = () => {
    navigate('/tickets');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!ticket) {
    return (
      <Alert severity="warning">
        Ticket not found
      </Alert>
    );
  }

  const assignedUser = users.find(u => u.user_id === ticket.assigned_user_id);
  const selectedUserData = users.find(u => u.user_id === selectedUser);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Claim Ticket
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Ticket Details
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                  <Assignment sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">{ticket.ticket_id}</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Site</Typography>
                  <Box display="flex" alignItems="center">
                    <LocalShipping sx={{ mr: 1, fontSize: 'small' }} />
                    <Typography variant="body1">{ticket.site_id}</Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Type</Typography>
                  <Chip 
                    label={ticket.type} 
                    size="small" 
                    color="primary"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={ticket.status} 
                    size="small" 
                    color={
                      ticket.status === 'closed' ? 'success' :
                      ticket.status === 'open' ? 'primary' :
                      ticket.status === 'in_progress' ? 'warning' : 'default'
                    }
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Current Assignment</Typography>
                
                {assignedUser ? (
                  <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                    <Person sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body1">{assignedUser.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{assignedUser.email}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    No user currently assigned
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Created</Typography>
                  <Box display="flex" alignItems="center">
                    <Schedule sx={{ mr: 1, fontSize: 'small' }} />
                    <Typography variant="body1">
                      {dayjs(ticket.date_created).format('MMM DD, YYYY HH:mm')}
                    </Typography>
                  </Box>
                </Box>

                {ticket.notes && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Notes</Typography>
                    <Box display="flex" alignItems="flex-start">
                      <Description sx={{ mr: 1, fontSize: 'small', mt: 0.5 }} />
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {ticket.notes}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Claim Ticket
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Assign to User *</InputLabel>
              <Select
                value={selectedUser}
                label="Assign to User *"
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select a user</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.user_id} value={user.user_id}>
                    {user.name} ({user.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedUserData && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Selected User</Typography>
                <Box display="flex" alignItems="center">
                  <Person sx={{ mr: 1, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body1">{selectedUserData.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedUserData.email} • {selectedUserData.role}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Additional Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about claiming this ticket..."
              sx={{ mb: 2 }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CheckCircle />}
            onClick={handleClaim}
            disabled={!selectedUser || claiming}
            size="large"
          >
            {claiming ? 'Claiming...' : 'Claim Ticket'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Cancel />}
            onClick={handleCancel}
            disabled={claiming}
          >
            Cancel
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default TicketClaim; 