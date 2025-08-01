import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Rating,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Assignment,
  Person,
  Store,
  Schedule,
  Description,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  History,
  Update,
  Close,
  PlayArrow,
  Pause,
  ThumbUp,
  ThumbDown,
  Star,
  StarBorder
} from '@mui/icons-material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from './axiosConfig';
import { useAuth } from './AuthContext';
import dayjs from 'dayjs';

function TicketDetail() {
  const { ticket_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [audits, setAudits] = useState([]);
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [claimDialog, setClaimDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [approvalData, setApprovalData] = useState({
    customerSatisfaction: 0,
    workCompleted: false,
    partsUsed: false,
    notes: '',
    approved: false
  });

  const isAdminOrDispatcher = user && (user.role === 'admin' || user.role === 'dispatcher');

  useEffect(() => {
    fetchTicketData();
  }, [ticket_id]);

  const fetchTicketData = async () => {
    setLoading(true);
    try {
      const [ticketRes, auditsRes, usersRes, sitesRes] = await Promise.all([
        api.get(`/tickets/${ticket_id}`),
        api.get('/audits/'),
        api.get('/users/'),
        api.get('/sites/')
      ]);
      
      setTicket(ticketRes.data);
      setAudits(auditsRes.data.filter(audit => audit.ticket_id === ticket_id));
      setUsers(usersRes.data);
      setSites(sitesRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch ticket data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'closed') {
      setApprovalDialog(true);
      return;
    }
    
    setUpdating(true);
    try {
      await api.patch(`/tickets/${ticket_id}/status`, { status: newStatus });
      await fetchTicketData();
    } catch (err) {
      setError('Failed to update ticket status');
      console.error('Error updating ticket:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleApprovalSubmit = async () => {
    setUpdating(true);
    try {
      const updatedTicket = {
        status: 'approved',
        notes: `${ticket.notes || ''}\n\n--- CLOSURE APPROVAL ---\nCustomer Satisfaction: ${approvalData.customerSatisfaction}/5\nWork Completed: ${approvalData.workCompleted ? 'Yes' : 'No'}\nParts Used: ${approvalData.partsUsed ? 'Yes' : 'No'}\nApproval Notes: ${approvalData.notes}\nApproved: ${approvalData.approved ? 'Yes' : 'No'}\nApproved by: ${user.name}\nApproved on: ${new Date().toLocaleString()}`,
        date_closed: new Date().toISOString().split('T')[0]
      };

      await api.put(`/tickets/${ticket_id}`, updatedTicket);
      setApprovalDialog(false);
      setApprovalData({
        customerSatisfaction: 0,
        workCompleted: false,
        partsUsed: false,
        notes: '',
        approved: false
      });
      await fetchTicketData();
    } catch (err) {
      setError('Failed to approve ticket closure');
      console.error('Error approving ticket:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleClaim = async (selectedUser, notes) => {
    setUpdating(true);
    try {
      const updatedTicket = {
        status: 'in_progress',
        assigned_user_id: selectedUser,
        notes: notes ? `${ticket.notes || ''}\n\n--- CLAIMED ---\n${notes}` : ticket.notes
      };

      await api.put(`/tickets/${ticket_id}`, updatedTicket);
      setClaimDialog(false);
      await fetchTicketData();
    } catch (err) {
      setError('Failed to claim ticket');
      console.error('Error claiming ticket:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setUpdating(true);
    try {
      await api.delete(`/tickets/${ticket_id}`);
      navigate('/tickets');
    } catch (err) {
      setError('Failed to delete ticket');
      console.error('Error deleting ticket:', err);
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'closed': return 'success';
      case 'in_progress': return 'warning';
      case 'open': return 'primary';
      case 'in_progress': return 'info';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'closed': return <CheckCircle />;
      case 'in_progress': return <PlayArrow />;
      case 'open': return <Assignment />;
      case 'in_progress': return <Person />;
      case 'pending': return <Pause />;
      default: return <Assignment />;
    }
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
  const site = sites.find(s => s.site_id === ticket.site_id);
  const isOverdue = ticket.status !== 'closed' && dayjs().diff(dayjs(ticket.date_created), 'day') > 1;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Ticket Details
        </Typography>
        
        <Box display="flex" gap={1}>
          {!ticket.assigned_user_id && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Person />}
              onClick={() => setClaimDialog(true)}
            >
              Claim Ticket
            </Button>
          )}
          
          {isAdminOrDispatcher && (
            <>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                component={Link}
                to={`/tickets/${ticket_id}/edit`}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteDialog(true)}
              >
                Delete
              </Button>
            </>
          )}
          
          <Button
            variant="outlined"
            component={Link}
            to="/tickets"
          >
            Back to Tickets
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Ticket Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {ticket.ticket_id}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {ticket.inc_number && `Incident: ${ticket.inc_number}`}
                  {ticket.so_number && ` • Service Order: ${ticket.so_number}`}
                </Typography>
              </Box>
              
              <Chip
                icon={getStatusIcon(ticket.status)}
                label={ticket.status.replace('_', ' ')}
                color={getStatusColor(ticket.status)}
                size="large"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Site Information
                    </Typography>
                    <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                      <Store sx={{ mr: 1, color: 'primary.main' }} />
                      <Button
                        component={Link}
                        to={`/sites/${ticket.site_id}/edit`}
                        sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                      >
                        <Typography variant="body1" sx={{ textDecoration: 'underline' }}>
                          {ticket.site_id}
                        </Typography>
                      </Button>
                    </Box>
                    {site && (
                      <Typography variant="body2" color="text.secondary">
                        {site.location}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Assignment
                    </Typography>
                    {assignedUser ? (
                      <Box display="flex" alignItems="center">
                        <Person sx={{ mr: 1, color: 'primary.main' }} />
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {assignedUser.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {assignedUser.email} • {assignedUser.role}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        No user assigned
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Ticket Details
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Type</Typography>
                  <Chip label={ticket.type} size="small" color="primary" sx={{ fontWeight: 500 }} />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Priority</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {ticket.priority || 'Not set'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Category</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {ticket.category || 'Not set'}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Timeline
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Created</Typography>
                  <Box display="flex" alignItems="center">
                    <Schedule sx={{ mr: 1, fontSize: 'small' }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {dayjs(ticket.date_created).format('MMM DD, YYYY HH:mm')}
                    </Typography>
                  </Box>
                </Box>
                {ticket.date_scheduled && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Scheduled</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {dayjs(ticket.date_scheduled).format('MMM DD, YYYY HH:mm')}
                    </Typography>
                  </Box>
                )}
                {ticket.date_closed && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Closed</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {dayjs(ticket.date_closed).format('MMM DD, YYYY HH:mm')}
                    </Typography>
                  </Box>
                )}
                {ticket.time_spent && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Time Spent</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {ticket.time_spent} minutes
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>

            {ticket.notes && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Notes
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {ticket.notes}
                  </Typography>
                </Paper>
              </>
            )}
          </Paper>
        </Grid>

        {/* Actions and Status */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Quick Actions
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Change Status
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                {['open', 'in_progress', 'pending', 'closed'].map((status) => (
                  <Button
                    key={status}
                    variant={ticket.status === status ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handleStatusChange(status)}
                    disabled={updating}
                    startIcon={getStatusIcon(status)}
                    sx={{ 
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      fontWeight: ticket.status === status ? 600 : 400
                    }}
                  >
                    {status.replace('_', ' ')}
                  </Button>
                ))}
              </Box>
            </Box>

            {isOverdue && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                This ticket is overdue (created {dayjs().diff(dayjs(ticket.date_created), 'day')} days ago)
              </Alert>
            )}

            {ticket.color_flag && (
              <Chip 
                label={`Flag: ${ticket.color_flag}`} 
                color="warning" 
                sx={{ mb: 1, fontWeight: 500 }}
              />
            )}

            {ticket.special_flag && (
              <Chip 
                label={`Special: ${ticket.special_flag}`} 
                color="error" 
                sx={{ mb: 1, fontWeight: 500 }}
              />
            )}
          </Paper>

          {/* Audit Trail */}
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Recent Activity
            </Typography>
            <List dense>
              {audits.slice(0, 5).map((audit) => (
                <ListItem key={audit.audit_id} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <History fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={audit.field_changed}
                    secondary={`${dayjs(audit.change_time).format('MMM DD, HH:mm')} by ${audit.user_id}`}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItem>
              ))}
              {audits.length === 0 && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    secondary="No recent activity"
                    secondaryTypographyProps={{ fontSize: '0.875rem' }}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Close Ticket - Approval Required</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Customer Satisfaction
              </Typography>
              <Rating
                value={approvalData.customerSatisfaction}
                onChange={(event, newValue) => {
                  setApprovalData(prev => ({ ...prev, customerSatisfaction: newValue }));
                }}
                size="large"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={approvalData.workCompleted}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, workCompleted: e.target.checked }))}
                  />
                }
                label="Work Completed Successfully"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={approvalData.partsUsed}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, partsUsed: e.target.checked }))}
                  />
                }
                label="Parts Were Used"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Closure Notes"
                placeholder="Describe the work completed, any issues resolved, and final status..."
                value={approvalData.notes}
                onChange={(e) => setApprovalData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={approvalData.approved}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, approved: e.target.checked }))}
                  />
                }
                label="I approve closing this ticket"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleApprovalSubmit}
            disabled={updating || !approvalData.approved}
            startIcon={<CheckCircle />}
          >
            {updating ? 'Approving...' : 'Approve & Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Claim Dialog */}
      <Dialog open={claimDialog} onClose={() => setClaimDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Claim Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Assign this ticket to a user to claim it.
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Assign to User</InputLabel>
            <Select
              value={user?.user_id || ''}
              label="Assign to User"
              onChange={() => {}}
            >
              {users.map((u) => (
                <MenuItem key={u.user_id} value={u.user_id}>
                  {u.name} ({u.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (Optional)"
            placeholder="Add any notes about claiming this ticket..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => handleClaim(user?.user_id, '')}
            disabled={updating}
          >
            {updating ? 'Claiming...' : 'Claim Ticket'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete ticket {ticket.ticket_id}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDelete}
            disabled={updating}
          >
            {updating ? 'Deleting...' : 'Delete Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TicketDetail; 