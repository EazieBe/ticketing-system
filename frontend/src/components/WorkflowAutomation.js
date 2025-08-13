import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Card, CardContent, Chip, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  CircularProgress, Grid, List, ListItem, ListItemText, ListItemIcon,
  Divider, Switch, FormControlLabel, Tooltip, Badge, Stack
} from '@mui/material';
import {
  PlayArrow, Pause, Stop, Person, Business, Assignment, Phone, Build,
  Inventory, Flag, FlagOutlined, Star, StarBorder, Notifications, NotificationsOff,
  ExpandMore, ExpandLess, FilterList, Sort, DragIndicator, Speed, AutoAwesome,
  Info, CheckCircle, Edit, Schedule, Settings
} from '@mui/icons-material';
import {
  Stepper, Step, StepLabel, StepContent
} from '@mui/material';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import useApi from '../hooks/useApi';
import dayjs from 'dayjs';

const workflowSteps = [
  {
    value: 'created',
    label: 'Created',
    description: 'Ticket has been created and is awaiting assignment',
    color: 'primary',
    icon: <Info />
  },
  {
    value: 'assigned',
    label: 'Assigned',
    description: 'Ticket has been assigned to a technician',
    color: 'info',
    icon: <Assignment />
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    description: 'Work has begun on the ticket',
    color: 'warning',
    icon: <PlayArrow />
  },
  {
    value: 'pending_approval',
    label: 'Pending Approval',
    description: 'Ticket requires approval before proceeding',
    color: 'secondary',
    icon: <Business />
  },
  {
    value: 'approved',
    label: 'Approved',
    description: 'Ticket has been approved',
    color: 'success',
    icon: <CheckCircle />
  },
  {
    value: 'completed',
    label: 'Completed',
    description: 'Work has been completed',
    color: 'success',
    icon: <CheckCircle />
  },
  {
    value: 'closed',
    label: 'Closed',
    description: 'Ticket has been closed',
    color: 'default',
    icon: <CheckCircle />
  }
];

const automationRules = [
  {
    id: 'auto_assign',
    name: 'Auto Assignment',
    description: 'Automatically assign tickets based on workload and skills',
    enabled: true
  },
  {
    id: 'sla_escalation',
    name: 'SLA Escalation',
    description: 'Automatically escalate tickets that breach SLA',
    enabled: true
  },
  {
    id: 'status_transition',
    name: 'Status Transitions',
    description: 'Automatically update status based on actions',
    enabled: true
  },
  {
    id: 'approval_workflow',
    name: 'Approval Workflow',
    description: 'Route tickets for approval when required',
    enabled: false
  }
];

function WorkflowAutomation({ ticket, onWorkflowUpdate }) {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [nextActionDialog, setNextActionDialog] = useState(false);
  const [dueDateDialog, setDueDateDialog] = useState(false);
  const [formData, setFormData] = useState({
    nextAction: '',
    dueDate: '',
    notes: ''
  });
  const [editDialog, setEditDialog] = useState(false);
  const [editWorkflow, setEditWorkflow] = useState(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/workflows/');
      setWorkflows(response || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError('Failed to load workflows');
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleStepChange = async (newStep) => {
    if (!ticket) return;

    try {
      setLoading(true);
      const stepValue = workflowSteps[newStep].value;
      
      const updateData = {
        workflow_step: stepValue,
        status: getStatusForWorkflowStep(stepValue)
      };

      await api.put(`/tickets/${ticket.ticket_id}`, updateData);
      
      setActiveStep(newStep);
      setSuccess(`Workflow step updated to ${workflowSteps[newStep].label}`);
      
      if (onWorkflowUpdate) onWorkflowUpdate();
    } catch (err) {
      console.error('Error updating workflow step:', err);
      setError('Failed to update workflow step');
    } finally {
      setLoading(false);
    }
  };

  const getStatusForWorkflowStep = (workflowStep) => {
    const statusMap = {
      'created': 'open',
      'assigned': 'open',
      'in_progress': 'in_progress',
      'pending_approval': 'pending',
      'approved': 'approved',
      'completed': 'closed',
      'closed': 'closed'
    };
    return statusMap[workflowStep] || 'open';
  };

  const handleNextActionUpdate = async () => {
    if (!ticket) return;

    try {
      setLoading(true);
      await api.put(`/tickets/${ticket.ticket_id}`, {
        next_action_required: formData.next_action_required
      });
      
      setNextActionDialog(false);
      setSuccess('Next action updated successfully');
      
      if (onWorkflowUpdate) onWorkflowUpdate();
    } catch (err) {
      console.error('Error updating next action:', err);
      setError('Failed to update next action');
    } finally {
      setLoading(false);
    }
  };

  const handleDueDateUpdate = async () => {
    if (!ticket) return;

    try {
      setLoading(true);
      await api.put(`/tickets/${ticket.ticket_id}`, {
        due_date: formData.due_date
      });
      
      setDueDateDialog(false);
      setSuccess('Due date updated successfully');
      
      if (onWorkflowUpdate) onWorkflowUpdate();
    } catch (err) {
      console.error('Error updating due date:', err);
      setError('Failed to update due date');
    } finally {
      setLoading(false);
    }
  };

  const canUpdateWorkflow = () => {
    return user?.role === 'admin' || user?.role === 'dispatcher' || 
           (user?.user_id === ticket?.assigned_user_id);
  };

  const getSLAStatus = () => {
    if (!ticket) return 'unknown';
    
    const now = dayjs();
    const created = dayjs(ticket.date_created);
    const hoursSinceCreated = now.diff(created, 'hour');
    
    if (hoursSinceCreated > ticket.sla_breach_hours) return 'breached';
    if (hoursSinceCreated > ticket.sla_target_hours) return 'warning';
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

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Workflow Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesome color="primary" />
              Workflow Status
            </Typography>
            <Chip
              label={getSLAStatusText(getSLAStatus())}
              color={getSLAStatusColor(getSLAStatus())}
              icon={<Speed />}
            />
          </Box>

          <Stepper activeStep={activeStep} orientation="vertical">
            {workflowSteps.map((step, index) => (
              <Step key={step.value}>
                <StepLabel
                  icon={step.icon}
                  sx={{
                    '& .MuiStepLabel-iconContainer': {
                      color: index <= activeStep ? `${step.color}.main` : 'grey.400'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">
                      {step.label}
                    </Typography>
                    {index === activeStep && (
                      <Chip label="Current" size="small" color="primary" />
                    )}
                  </Box>
                </StepLabel>
                <StepContent>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>
                  
                  {canUpdateWorkflow() && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {index < workflowSteps.length - 1 && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleStepChange(index + 1)}
                          disabled={loading}
                          startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
                        >
                          Move to {workflowSteps[index + 1].label}
                        </Button>
                      )}
                      
                      {index > 0 && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleStepChange(index - 1)}
                          disabled={loading}
                        >
                          Move to {workflowSteps[index - 1].label}
                        </Button>
                      )}
                    </Box>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Next Actions & Due Dates */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment color="primary" />
                  Next Action
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setNextActionDialog(true)}
                  disabled={!canUpdateWorkflow()}
                >
                  <Edit />
                </IconButton>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {ticket?.next_action_required || 'No next action defined'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule color="primary" />
                  Due Date
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setDueDateDialog(true)}
                  disabled={!canUpdateWorkflow()}
                >
                  <Edit />
                </IconButton>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {ticket?.due_date ? dayjs(ticket.due_date).format('MMM DD, YYYY HH:mm') : 'No due date set'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Automation Rules */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings color="primary" />
            Automation Rules
          </Typography>
          
          <List>
            {automationRules.map((rule, index) => (
              <React.Fragment key={rule.id}>
                <ListItem>
                  <ListItemIcon>
                    <Chip
                      label={rule.enabled ? 'Enabled' : 'Disabled'}
                      color={rule.enabled ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={rule.name}
                    secondary={rule.description}
                  />
                </ListItem>
                {index < automationRules.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Next Action Dialog */}
      <Dialog open={nextActionDialog} onClose={() => setNextActionDialog(false)}>
        <DialogTitle>Update Next Action</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Next Action Required"
            value={formData.next_action_required}
            onChange={(e) => setFormData({ ...formData, next_action_required: e.target.value })}
            placeholder="What needs to happen next?"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNextActionDialog(false)}>Cancel</Button>
          <Button onClick={handleNextActionUpdate} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Due Date Dialog */}
      <Dialog open={dueDateDialog} onClose={() => setDueDateDialog(false)}>
        <DialogTitle>Update Due Date</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Due Date"
            type="datetime-local"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDueDateDialog(false)}>Cancel</Button>
          <Button onClick={handleDueDateUpdate} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WorkflowAutomation; 