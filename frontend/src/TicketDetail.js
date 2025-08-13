import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
  Badge,
  Rating,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Assignment,
  Person,
  Schedule,
  PriorityHigh,
  CheckCircle,
  Cancel,
  Visibility,
  Business,
  LocalShipping,
  Build,
  Phone,
  Email,
  Star,
  Timer,
  Comment,
  AutoAwesome,
  Speed,
  Warning,
  AttachMoney,
  Build as BuildIcon,
  Inventory,
  CheckCircle as CheckCircleIcon,
  Flag,
  FlagOutlined,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from './axiosConfig';
import { useAuth } from './AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import TicketForm from './TicketForm';
import TimeTracker from './components/TimeTracker';
import TicketComments from './components/TicketComments';
import WorkflowAutomation from './components/WorkflowAutomation';

dayjs.extend(relativeTime);

function TicketDetail() {
  const { ticket_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    customer: false,
    workflow: false,
    equipment: false,
    quality: false
  });

  useEffect(() => {
    fetchTicket();
  }, [ticket_id]);

  const fetchTicket = async () => {
    try {
      const response = await api.get(`/tickets/${ticket_id}`);
      setTicket(response || {});
      setLoading(false);
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError('Failed to load ticket');
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditDialog(true);
  };

  const handleCloseEdit = () => {
    setEditDialog(false);
  };

  const handleSubmit = async (values) => {
    if (!ticket_id) {
      setError('No ticket ID provided');
      return;
    }
    
    try {
      const response = await api.put(`/tickets/${ticket_id}`, values);
      setTicket(response || {});
      setSuccessMessage('Ticket updated successfully!');
      setEditDialog(false);
      setError(null);
    } catch (err) {
      setError('Failed to update ticket');
    }
  };

  const handleDelete = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ticket_id) {
      setError('No ticket ID provided');
      return;
    }
    
    try {
      await api.delete(`/tickets/${ticket_id}`, { data: {} });
      navigate('/tickets');
    } catch (err) {
      setError('Failed to delete ticket');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!ticket_id) {
      setError('No ticket ID provided');
      return;
    }
    
    try {
      const response = await api.patch(`/tickets/${ticket_id}/status`, { status: newStatus });
      setTicket(response || {});
      setSuccessMessage(`Status updated to ${newStatus}!`);
      setError(null);
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const handleClaim = async () => {
    if (!ticket_id) {
      setError('No ticket ID provided');
      return;
    }
    
    try {
      const response = await api.put(`/tickets/${ticket_id}`, {
        status: 'in_progress',
        assigned_user_id: user.user_id,
        workflow_step: 'assigned'
      });
      setTicket(response || {});
      setSuccessMessage('Ticket claimed successfully!');
      setError(null);
    } catch (err) {
      setError('Failed to claim ticket');
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getSLAStatus = () => {
    if (!ticket) return 'unknown';
    
    const now = dayjs();
    const created = dayjs(ticket.date_created);
    const hoursSinceCreated = now.diff(created, 'hour');
    
    if (hoursSinceCreated > (ticket.sla_breach_hours || 48)) return 'breached';
    if (hoursSinceCreated > (ticket.sla_target_hours || 24)) return 'warning';
    return 'on_track';
  };

  const getSLAStatusColor = (status) => {
    switch (status) {
      case 'breached': return 'error';
      case 'warning': return 'warning';
      case 'on_track': return 'success';
      default: return 'default';
    }
  };

  const getSLAStatusText = (status) => {
    switch (status) {
      case 'breached': return 'SLA Breached';
      case 'warning': return 'SLA Warning';
      case 'on_track': return 'On Track';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Ticket not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#fafafa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/tickets')}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Ticket {ticket.ticket_id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ticket.inc_number && `INC: ${ticket.inc_number}`}
              {ticket.so_number && ` • SO: ${ticket.so_number}`}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {ticket.assigned_user_id !== user?.user_id && ticket.status === 'open' && (
            <Button
              variant="contained"
              startIcon={<Assignment />}
              onClick={handleClaim}
            >
              Claim Ticket
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEdit}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Ticket Details */}
        <Grid item xs={12} md={8}>
          {/* Basic Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business color="primary" />
                  Basic Information
                </Typography>
                <IconButton onClick={() => toggleSection('basic')}>
                  {expandedSections.basic ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              
              {expandedSections.basic && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Site</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {ticket.site_id} - {ticket.site?.location || 'Unknown Site'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                    <Chip 
                      label={ticket.type} 
                      size="small" 
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip 
                      label={ticket.status} 
                      size="small" 
                      color="primary"
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Priority</Typography>
                    <Chip 
                      label={ticket.priority || 'Not Set'} 
                      size="small" 
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Assigned To</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {ticket.assigned_user?.name || 'Unassigned'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {dayjs(ticket.date_created).format('MMM DD, YYYY HH:mm')}
                    </Typography>
                  </Grid>
                  {ticket.notes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {ticket.notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          {(ticket.customer_name || ticket.customer_phone || ticket.customer_email || ticket.is_vip || ticket.is_urgent) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person color="primary" />
                    Customer Information
                  </Typography>
                  <IconButton onClick={() => toggleSection('customer')}>
                    {expandedSections.customer ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                
                {expandedSections.customer && (
                  <Grid container spacing={2}>
                    {ticket.customer_name && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {ticket.customer_name}
                        </Typography>
                      </Grid>
                    )}
                    {ticket.customer_phone && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {ticket.customer_phone}
                        </Typography>
                      </Grid>
                    )}
                    {ticket.customer_email && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {ticket.customer_email}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">Special Flags</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {ticket.is_vip && (
                          <Chip icon={<Star />} label="VIP" size="small" color="warning" />
                        )}
                        {ticket.is_urgent && (
                          <Chip icon={<Warning />} label="Urgent" size="small" color="error" />
                        )}
                      </Box>
                    </Grid>
                    {ticket.customer_satisfaction && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Customer Satisfaction</Typography>
                        <Rating value={ticket.customer_satisfaction} readOnly size="small" />
                      </Grid>
                    )}
                  </Grid>
                )}
              </CardContent>
            </Card>
          )}

          {/* Equipment & Parts */}
          {(ticket.equipment_affected || ticket.parts_needed || ticket.parts_ordered || ticket.parts_received) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BuildIcon color="primary" />
                    Equipment & Parts
                  </Typography>
                  <IconButton onClick={() => toggleSection('equipment')}>
                    {expandedSections.equipment ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                
                {expandedSections.equipment && (
                  <Grid container spacing={2}>
                    {ticket.equipment_affected && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Equipment Affected</Typography>
                        <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                          {ticket.equipment_affected}
                        </Typography>
                      </Grid>
                    )}
                    {ticket.parts_needed && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Parts Needed</Typography>
                        <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                          {ticket.parts_needed}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={<Switch checked={ticket.parts_ordered || false} disabled />}
                        label="Parts Ordered"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={<Switch checked={ticket.parts_received || false} disabled />}
                        label="Parts Received"
                      />
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quality & Follow-up */}
          {(ticket.quality_score || ticket.follow_up_required || ticket.follow_up_notes) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="primary" />
                    Quality & Follow-up
                  </Typography>
                  <IconButton onClick={() => toggleSection('quality')}>
                    {expandedSections.quality ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                
                {expandedSections.quality && (
                  <Grid container spacing={2}>
                    {ticket.quality_score && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Quality Score</Typography>
                        <Rating value={ticket.quality_score} readOnly size="small" />
                      </Grid>
                    )}
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={<Switch checked={ticket.follow_up_required || false} disabled />}
                        label="Follow-up Required"
                      />
                    </Grid>
                    {ticket.follow_up_date && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Follow-up Date</Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {dayjs(ticket.follow_up_date).format('MMM DD, YYYY')}
                        </Typography>
                      </Grid>
                    )}
                    {ticket.follow_up_notes && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Follow-up Notes</Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {ticket.follow_up_notes}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right Column - Actions & Workflow */}
        <Grid item xs={12} md={4}>
          {/* SLA Status */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Speed color="primary" />
                SLA Status
              </Typography>
              <Chip
                label={getSLAStatusText(getSLAStatus())}
                color={getSLAStatusColor(getSLAStatus())}
                icon={<Speed />}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                Target: {ticket.sla_target_hours || 24}h | Breach: {ticket.sla_breach_hours || 48}h
              </Typography>
            </CardContent>
          </Card>

          {/* Time Tracking */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Timer color="primary" />
                Time Tracking
              </Typography>
              <Grid container spacing={2}>
                {ticket.estimated_hours && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Estimated</Typography>
                    <Typography variant="h6">{ticket.estimated_hours}h</Typography>
                  </Grid>
                )}
                {ticket.actual_hours && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Actual</Typography>
                    <Typography variant="h6" color="success.main">{ticket.actual_hours}h</Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={ticket.is_billable || false} disabled />}
                    label="Billable"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Workflow Automation */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AutoAwesome color="primary" />
                Workflow
              </Typography>
              <Chip
                label={ticket.workflow_step || 'created'}
                variant="outlined"
                sx={{ mb: 2 }}
              />
              {ticket.next_action_required && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Next: {ticket.next_action_required}
                </Typography>
              )}
              {ticket.due_date && (
                <Typography variant="body2" color="text.secondary">
                  Due: {dayjs(ticket.due_date).format('MMM DD, HH:mm')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for Interactive Features */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label="Time Tracker" icon={<Timer />} />
            <Tab label="Comments" icon={<Comment />} />
            <Tab label="Workflow" icon={<AutoAwesome />} />
          </Tabs>
          
          <Box sx={{ mt: 2 }}>
            {selectedTab === 0 && (
              <TimeTracker 
                ticketId={ticket_id} 
                onTimeUpdate={fetchTicket}
              />
            )}
            {selectedTab === 1 && (
              <TicketComments 
                ticketId={ticket_id} 
                onCommentUpdate={fetchTicket}
              />
            )}
            {selectedTab === 2 && (
              <WorkflowAutomation 
                ticket={ticket} 
                onWorkflowUpdate={fetchTicket}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editDialog && (
        <Dialog 
          open={editDialog} 
          onClose={handleCloseEdit} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 }
          }}
        >
          <DialogTitle>Edit Ticket</DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ p: 2 }}>
              <TicketForm
                initialValues={ticket}
                onSubmit={handleSubmit}
                isEdit={true}
              />
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Ticket</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete ticket {ticket.ticket_id}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TicketDetail; 