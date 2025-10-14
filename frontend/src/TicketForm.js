import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container, Typography, TextField, Button, Box, FormControl, InputLabel, Select, MenuItem,
  Chip, Divider, Tooltip, Accordion, AccordionSummary, AccordionDetails, InputAdornment,
  ToggleButton, ToggleButtonGroup, Badge, Stack, Alert, Card, CardContent, IconButton,
  Grid, Autocomplete, Rating, Switch, FormControlLabel, CircularProgress
} from '@mui/material';
import {
  Add, Business, Schedule, PriorityHigh, Star, StarBorder, PlayArrow, Stop, Pause,
  AttachMoney, Flag, FlagOutlined, ThumbUp, ThumbDown, Comment, Visibility, VisibilityOff,
  Assignment, ExpandMore, LocationOn, Info, Person, Phone, Email, Timer, Speed, Warning,
  CheckCircle, Build, Inventory, Category, Description
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import dayjs from 'dayjs';
import { getCurrentUTCTimestamp } from './utils/timezone';

const typeOptions = [
  { value: 'inhouse', label: 'In-House', icon: '🏢', color: '#1976d2' },
  { value: 'onsite', label: 'Onsite', icon: '📍', color: '#388e3c' },
  { value: 'projects', label: 'Projects', icon: '📋', color: '#7b1fa2' },
  { value: 'misc', label: 'MISC', icon: '🔧', color: '#5d4037' }
];

// Status options based on ticket type - matching backend schema
const getStatusOptions = (ticketType) => {
  const allStatuses = [
    { value: 'open', label: 'Open', color: 'primary' },
    { value: 'scheduled', label: 'Scheduled', color: 'info' },
    { value: 'checked_in', label: 'Checked In', color: 'warning' },
    { value: 'in_progress', label: 'In Progress', color: 'secondary' },
    { value: 'pending', label: 'Pending', color: 'warning' },
    { value: 'needs_parts', label: 'Needs Parts', color: 'error' },
    { value: 'go_back_scheduled', label: 'Go Back Scheduled', color: 'info' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'closed', label: 'Closed', color: 'success' }
  ];
  
  // Filter statuses based on ticket type for better UX
  switch (ticketType) {
    case 'inhouse':
      return allStatuses.filter(s => ['open', 'in_progress', 'pending', 'completed', 'closed'].includes(s.value));
    case 'onsite':
      return allStatuses.filter(s => ['open', 'scheduled', 'checked_in', 'in_progress', 'needs_parts', 'completed', 'closed'].includes(s.value));
    case 'projects':
      return allStatuses.filter(s => ['open', 'scheduled', 'in_progress', 'pending', 'completed', 'closed'].includes(s.value));
    case 'misc':
      return allStatuses.filter(s => ['open', 'in_progress', 'pending', 'completed', 'closed'].includes(s.value));
    default:
      return allStatuses;
  }
};

const priorityOptions = [
  { value: 'normal', label: 'Normal', color: 'success' },
  { value: 'critical', label: 'Critical', color: 'warning' },
  { value: 'emergency', label: 'Emergency', color: 'error' }
];

const impactOptions = [
  { value: 'low', label: 'Low', color: 'success' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'high', label: 'High', color: 'error' },
  { value: 'critical', label: 'Critical', color: 'error' }
];

const businessPriorityOptions = [
  { value: 'low', label: 'Low', color: 'success' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'high', label: 'High', color: 'error' },
  { value: 'urgent', label: 'Urgent', color: 'error' }
];

const workflowSteps = [
  { value: 'created', label: 'Created', color: 'primary' },
  { value: 'assigned', label: 'Assigned', color: 'info' },
  { value: 'in_progress', label: 'In Progress', color: 'warning' },
  { value: 'pending_approval', label: 'Pending Approval', color: 'secondary' },
  { value: 'approved', label: 'Approved', color: 'success' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'closed', label: 'Closed', color: 'default' }
];

function TicketForm({ initialValues, onSubmit, isEdit = false }) {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const { user } = useAuth();
  const api = useApi();
  const { success, error: showError } = useToast();
  const [values, setValues] = useState({
    site_id: '',
    inc_number: '',
    so_number: '',
    type: '',
    status: '',
    priority: '',
    category: '',
    assigned_user_id: '',
    onsite_tech_id: '',
    date_created: '',
    date_scheduled: '',
    date_closed: '',
    time_spent: '',
    notes: '',
    color_flag: '',
    special_flag: '',
    
    // Enhanced Workflow Fields
    estimated_hours: '',
    actual_hours: '',
    start_time: '',
    end_time: '',
    is_billable: true,
    requires_approval: false,
    approved_by: '',
    approved_at: '',
    rejection_reason: '',
    
    // Enhanced SLA Management Fields
    sla_target_hours: 24,
    sla_breach_hours: 48,
    customer_impact: 'medium',
    business_priority: 'medium',
    
    // New Workflow Fields
    workflow_step: 'created',
    next_action_required: '',
    due_date: '',
    is_urgent: false,
    is_vip: false,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    
    // Equipment and Parts
    equipment_affected: '',
    parts_needed: '',
    parts_ordered: false,
    parts_received: false,
    
    // Quality and Follow-up
    quality_score: 0,
    customer_satisfaction: 0,
    follow_up_required: false,
    follow_up_date: '',
    follow_up_notes: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    customer: false,
    workflow: false,
    equipment: false,
    quality: false
  });

  useEffect(() => {
    if (initialValues) {
      setValues({
        site_id: initialValues.site_id || '',
        inc_number: initialValues.inc_number || '',
        so_number: initialValues.so_number || '',
        type: initialValues.type || '',
        status: initialValues.status || '',
        priority: initialValues.priority || '',
        category: initialValues.category || '',
        assigned_user_id: initialValues.assigned_user_id || '',
        onsite_tech_id: initialValues.onsite_tech_id || '',
        date_created: initialValues.date_created || '',
        date_scheduled: initialValues.date_scheduled || '',
        date_closed: initialValues.date_closed || '',
        time_spent: initialValues.time_spent || '',
        notes: initialValues.notes || '',
        color_flag: initialValues.color_flag || '',
        special_flag: initialValues.special_flag || '',
        
        // Enhanced Workflow Fields
        estimated_hours: initialValues.estimated_hours || '',
        actual_hours: initialValues.actual_hours || '',
        start_time: initialValues.start_time || '',
        end_time: initialValues.end_time || '',
        is_billable: initialValues.is_billable !== undefined ? initialValues.is_billable : true,
        requires_approval: initialValues.requires_approval || false,
        approved_by: initialValues.approved_by || '',
        approved_at: initialValues.approved_at || '',
        rejection_reason: initialValues.rejection_reason || '',
        
        // Enhanced SLA Management Fields
        sla_target_hours: initialValues.sla_target_hours || 24,
        sla_breach_hours: initialValues.sla_breach_hours || 48,
        customer_impact: initialValues.customer_impact || 'medium',
        business_priority: initialValues.business_priority || 'medium',
        
        // New Workflow Fields
        workflow_step: initialValues.workflow_step || 'created',
        next_action_required: initialValues.next_action_required || '',
        due_date: initialValues.due_date || '',
        is_urgent: initialValues.is_urgent || false,
        is_vip: initialValues.is_vip || false,
        customer_name: initialValues.customer_name || '',
        customer_phone: initialValues.customer_phone || '',
        customer_email: initialValues.customer_email || '',
        
        // Equipment and Parts
        equipment_affected: initialValues.equipment_affected || '',
        parts_needed: initialValues.parts_needed || '',
        parts_ordered: initialValues.parts_ordered || false,
        parts_received: initialValues.parts_received || false,
        
        // Quality and Follow-up
        quality_score: initialValues.quality_score || 0,
        customer_satisfaction: initialValues.customer_satisfaction || 0,
        follow_up_required: initialValues.follow_up_required || false,
        follow_up_date: initialValues.follow_up_date || '',
        follow_up_notes: initialValues.follow_up_notes || ''
      });
    }
  }, [initialValues]);

  const fetchSites = useCallback(async () => {
    setLoadingSites(true);
    try {
      const response = await api.get('/sites/');
      setSites(response || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
      setSites([]);
    } finally {
      setLoadingSites(false);
    }
  }, [api]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get('/users/');
      setUsers(response || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [api]);

  // Fetch sites and users when component mounts
  useEffect(() => {
    fetchSites();
    fetchUsers();
  }, [fetchSites, fetchUsers]);

  const handleChange = (field, value) => {
    setValues(prev => {
      const newValues = { ...prev, [field]: value };
      
      // When ticket type changes, reset status to 'open' and update available status options
      if (field === 'type') {
        newValues.status = 'open';
        newValues.workflow_step = 'created';
      }
      
      return newValues;
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with values:', values);
    
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!values.site_id || values.site_id.trim() === '') {
        throw new Error('Site is required');
      }
      if (!values.type || values.type.trim() === '') {
        throw new Error('Type is required');
      }
      if (!values.status || values.status.trim() === '') {
        throw new Error('Status is required');
      }
      if (!values.notes || values.notes.trim() === '') {
        throw new Error('Notes are required');
      }

      // Clean up values
      const cleanedValues = {
        site_id: values.site_id.trim(),
        type: values.type.trim(),
        status: values.status.trim(),
        notes: values.notes.trim(),
        date_created: getCurrentUTCTimestamp().split('T')[0] // Set current date if not provided
      };
      
      // Add optional fields if they have values
      if (values.inc_number?.trim()) cleanedValues.inc_number = values.inc_number.trim();
      if (values.so_number?.trim()) cleanedValues.so_number = values.so_number.trim();
      if (values.priority?.trim()) cleanedValues.priority = values.priority.trim();
      if (values.category?.trim()) cleanedValues.category = values.category.trim();
      if (values.assigned_user_id?.trim()) cleanedValues.assigned_user_id = values.assigned_user_id.trim();
      if (values.onsite_tech_id?.trim()) cleanedValues.onsite_tech_id = values.onsite_tech_id.trim();
      if (values.date_created) cleanedValues.date_created = values.date_created.split('T')[0];
      if (values.date_scheduled) cleanedValues.date_scheduled = values.date_scheduled.split('T')[0];
      if (values.date_closed) cleanedValues.date_closed = values.date_closed.split('T')[0];
      if (values.time_spent) cleanedValues.time_spent = parseInt(values.time_spent) || 0;
      if (values.notes?.trim()) cleanedValues.notes = values.notes.trim();
      if (values.color_flag?.trim()) cleanedValues.color_flag = values.color_flag.trim();
      if (values.special_flag?.trim()) cleanedValues.special_flag = values.special_flag.trim();
      
      // Enhanced Workflow Fields
      if (values.estimated_hours) cleanedValues.estimated_hours = parseInt(values.estimated_hours) || 0;
      if (values.actual_hours) cleanedValues.actual_hours = parseInt(values.actual_hours) || 0;
      if (values.start_time) cleanedValues.start_time = values.start_time;
      if (values.end_time) cleanedValues.end_time = values.end_time;
      cleanedValues.is_billable = values.is_billable;
      cleanedValues.requires_approval = values.requires_approval;
      if (values.approved_by?.trim()) cleanedValues.approved_by = values.approved_by.trim();
      if (values.approved_at) cleanedValues.approved_at = values.approved_at;
      if (values.rejection_reason?.trim()) cleanedValues.rejection_reason = values.rejection_reason.trim();
      
      // Enhanced SLA Management Fields
      if (values.sla_target_hours) cleanedValues.sla_target_hours = parseInt(values.sla_target_hours) || 24;
      if (values.sla_breach_hours) cleanedValues.sla_breach_hours = parseInt(values.sla_breach_hours) || 48;
      cleanedValues.customer_impact = values.customer_impact;
      cleanedValues.business_priority = values.business_priority;
      
      // New Workflow Fields
      cleanedValues.workflow_step = values.workflow_step;
      if (values.next_action_required?.trim()) cleanedValues.next_action_required = values.next_action_required.trim();
      if (values.due_date) cleanedValues.due_date = values.due_date;
      cleanedValues.is_urgent = values.is_urgent;
      cleanedValues.is_vip = values.is_vip;
      if (values.customer_name?.trim()) cleanedValues.customer_name = values.customer_name.trim();
      if (values.customer_phone?.trim()) cleanedValues.customer_phone = values.customer_phone.trim();
      if (values.customer_email?.trim()) cleanedValues.customer_email = values.customer_email.trim();
      
      // Equipment and Parts
      if (values.equipment_affected?.trim()) cleanedValues.equipment_affected = values.equipment_affected.trim();
      if (values.parts_needed?.trim()) cleanedValues.parts_needed = values.parts_needed.trim();
      cleanedValues.parts_ordered = values.parts_ordered;
      cleanedValues.parts_received = values.parts_received;
      
      // Quality and Follow-up
      if (values.quality_score) cleanedValues.quality_score = parseInt(values.quality_score) || 0;
      if (values.customer_satisfaction) cleanedValues.customer_satisfaction = parseInt(values.customer_satisfaction) || 0;
      cleanedValues.follow_up_required = values.follow_up_required;
      if (values.follow_up_date) cleanedValues.follow_up_date = values.follow_up_date.split('T')[0];
      if (values.follow_up_notes?.trim()) cleanedValues.follow_up_notes = values.follow_up_notes.trim();

      console.log('Submitting ticket with cleaned values:', cleanedValues);
      console.log('onSubmit function:', onSubmit);
      console.log('onSubmit type:', typeof onSubmit);
      
      if (onSubmit && typeof onSubmit === 'function') {
        console.log('Calling onSubmit function...');
        try {
          await onSubmit(cleanedValues);
          console.log('onSubmit function completed');
        } catch (submitError) {
          console.error('Error in onSubmit function:', submitError);
          throw submitError;
        }
      } else {
        console.error('onSubmit function is not provided or is not a function');
        setError('Form submission handler is not configured');
      }
    } catch (err) {
      console.error('Form validation error:', err.message);
      setError(err.message || 'Failed to save ticket');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const option = typeOptions.find(opt => opt.value === type);
    return option?.icon || '📋';
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Basic Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment color="primary" />
              Basic Information
            </Typography>
            <IconButton onClick={() => toggleSection('basic')}>
              {expandedSections.basic ? <ExpandMore /> : <ExpandMore sx={{ transform: 'rotate(-90deg)' }} />}
            </IconButton>
          </Box>
          
          {expandedSections.basic && (
            <Grid container spacing={2}>
              {/* Site Selection */}
              <Grid item xs={12} md={6}>
                <Box>
                  <Autocomplete
                    options={sites}
                    getOptionLabel={(option) => `${option.site_id} - ${option.location}`}
                    value={sites.find(site => site.site_id === values.site_id) || null}
                    onChange={(event, newValue) => {
                      handleChange('site_id', newValue?.site_id || '');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Site *"
                        required
                        placeholder="Search sites..."
                        error={!values.site_id && values.site_id !== ''}
                        helperText={!values.site_id ? "Select a site to associate this ticket with" : "This ticket will be linked to the selected site"}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <LocationOn sx={{ mr: 1, color: values.site_id ? 'success.main' : 'action.active' }} />
                              {params.InputProps.startAdornment}
                            </>
                          )
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {option.site_id}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.location} • {option.city}, {option.state}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    loading={loadingSites}
                    noOptionsText="No sites found"
                  />
                  {values.site_id && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        This ticket will be visible on the <strong>{sites.find(s => s.site_id === values.site_id)?.site_id}</strong> site details page
                      </Typography>
                    </Alert>
                  )}
                </Box>
              </Grid>

              {/* Ticket Numbers */}
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="INC Number"
                      value={values.inc_number}
                      onChange={(e) => handleChange('inc_number', e.target.value)}
                      placeholder="INC-2024-001"
                      InputProps={{
                        startAdornment: <Info sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="SO Number"
                      value={values.so_number}
                      onChange={(e) => handleChange('so_number', e.target.value)}
                      placeholder="SO-2024-001"
                      InputProps={{
                        startAdornment: <Assignment sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Type and Status */}
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Type *</InputLabel>
                      <Select
                        value={values.type}
                        label="Type *"
                        onChange={(e) => handleChange('type', e.target.value)}
                        startAdornment={
                          values.type && (
                            <Box sx={{ mr: 1, fontSize: '1.2rem' }}>
                              {getTypeIcon(values.type)}
                            </Box>
                          )
                        }
                      >
                        {typeOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <span>{option.icon}</span>
                              {option.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Status *</InputLabel>
                      <Select
                        value={values.status}
                        label="Status *"
                        onChange={(e) => handleChange('status', e.target.value)}
                      >
                        {getStatusOptions(values.type).map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            <Chip 
                              label={option.label} 
                              size="small" 
                              color={option.color}
                              sx={{ mr: 1 }}
                            />
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Grid>

              {/* Priority and Category */}
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={values.priority}
                        label="Priority"
                        onChange={(e) => handleChange('priority', e.target.value)}
                      >
                        {priorityOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            <Chip 
                              label={option.label} 
                              size="small" 
                              color={option.color}
                              sx={{ mr: 1 }}
                            />
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Category"
                      value={values.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      placeholder="Hardware, Software, etc."
                      InputProps={{
                        startAdornment: <Category sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* SCHEDULED DATE - For Onsite Tickets */}
              {(values.type === 'onsite' || values.type === 'projects') && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={values.type === 'onsite' ? "Scheduled Date ⭐" : "Scheduled Date"}
                    type="date"
                    value={values.date_scheduled}
                    onChange={(e) => handleChange('date_scheduled', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    helperText={values.type === 'onsite' ? "⭐ When is field tech visiting? Ticket shows on this date!" : "When is this scheduled?"}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: values.type === 'onsite' ? 'rgba(33, 150, 243, 0.08)' : 'inherit',
                        ...(values.type === 'onsite' && !values.date_scheduled && {
                          borderColor: 'warning.main',
                          borderWidth: 2
                        })
                      }
                    }}
                  />
                  {values.type === 'onsite' && !values.date_scheduled && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      <strong>Important:</strong> Set scheduled date so this ticket appears on the correct day!
                    </Alert>
                  )}
                </Grid>
              )}

              {/* Assignment */}
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Autocomplete
                      options={users}
                      getOptionLabel={(option) => option.name || option.username}
                      value={users.find(user => user.user_id === values.assigned_user_id) || null}
                      onChange={(event, newValue) => {
                        handleChange('assigned_user_id', newValue?.user_id || '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Assigned To"
                          placeholder="Select user..."
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                          }}
                        />
                      )}
                      loading={loadingUsers}
                      noOptionsText="No users found"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Autocomplete
                      options={users}
                      getOptionLabel={(option) => option.name || option.username}
                      value={users.find(user => user.user_id === values.onsite_tech_id) || null}
                      onChange={(event, newValue) => {
                        handleChange('onsite_tech_id', newValue?.user_id || '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Onsite Tech"
                          placeholder="Select tech..."
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                          }}
                        />
                      )}
                      loading={loadingUsers}
                      noOptionsText="No users found"
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Time Tracking */}
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Estimated Hours"
                      type="number"
                      value={values.estimated_hours}
                      onChange={(e) => handleChange('estimated_hours', e.target.value)}
                      InputProps={{
                        startAdornment: <Timer sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Actual Hours"
                      type="number"
                      value={values.actual_hours}
                      onChange={(e) => handleChange('actual_hours', e.target.value)}
                      InputProps={{
                        startAdornment: <Timer sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={values.is_billable}
                          onChange={(e) => handleChange('is_billable', e.target.checked)}
                        />
                      }
                      label="Billable"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person color="primary" />
              Customer Information
            </Typography>
            <IconButton onClick={() => toggleSection('customer')}>
              {expandedSections.customer ? <ExpandMore /> : <ExpandMore sx={{ transform: 'rotate(-90deg)' }} />}
            </IconButton>
          </Box>
          
          {expandedSections.customer && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={values.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                  placeholder="Customer contact name"
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Customer Phone"
                  value={values.customer_phone}
                  onChange={(e) => handleChange('customer_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  InputProps={{
                    startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Customer Email"
                  value={values.customer_email}
                  onChange={(e) => handleChange('customer_email', e.target.value)}
                  placeholder="customer@example.com"
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={values.is_urgent}
                        onChange={(e) => handleChange('is_urgent', e.target.checked)}
                      />
                    }
                    label="Urgent"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={values.is_vip}
                        onChange={(e) => handleChange('is_vip', e.target.checked)}
                      />
                    }
                    label="VIP Customer"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2">Customer Satisfaction:</Typography>
                  <Rating
                    value={values.customer_satisfaction}
                    onChange={(event, newValue) => {
                      handleChange('customer_satisfaction', newValue);
                    }}
                    size="small"
                  />
                </Box>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Workflow & SLA */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Speed color="primary" />
              Workflow & SLA Management
            </Typography>
            <IconButton onClick={() => toggleSection('workflow')}>
              {expandedSections.workflow ? <ExpandMore /> : <ExpandMore sx={{ transform: 'rotate(-90deg)' }} />}
            </IconButton>
          </Box>
          
          {expandedSections.workflow && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Workflow Step</InputLabel>
                  <Select
                    value={values.workflow_step}
                    label="Workflow Step"
                    onChange={(e) => handleChange('workflow_step', e.target.value)}
                  >
                    {workflowSteps.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        <Chip 
                          label={option.label} 
                          size="small" 
                          color={option.color}
                          sx={{ mr: 1 }}
                        />
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Next Action Required"
                  value={values.next_action_required}
                  onChange={(e) => handleChange('next_action_required', e.target.value)}
                  placeholder="What needs to happen next?"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Due Date"
                  type="datetime-local"
                  value={values.due_date ? values.due_date.slice(0, 16) : ''}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.requires_approval}
                      onChange={(e) => handleChange('requires_approval', e.target.checked)}
                    />
                  }
                  label="Requires Approval"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SLA Target (hours)"
                  type="number"
                  value={values.sla_target_hours}
                  onChange={(e) => handleChange('sla_target_hours', e.target.value)}
                  InputProps={{
                    startAdornment: <Speed sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SLA Breach (hours)"
                  type="number"
                  value={values.sla_breach_hours}
                  onChange={(e) => handleChange('sla_breach_hours', e.target.value)}
                  InputProps={{
                    startAdornment: <Warning sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Customer Impact</InputLabel>
                  <Select
                    value={values.customer_impact}
                    label="Customer Impact"
                    onChange={(e) => handleChange('customer_impact', e.target.value)}
                  >
                    {impactOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        <Chip 
                          label={option.label} 
                          size="small" 
                          color={option.color}
                          sx={{ mr: 1 }}
                        />
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Business Priority</InputLabel>
                  <Select
                    value={values.business_priority}
                    label="Business Priority"
                    onChange={(e) => handleChange('business_priority', e.target.value)}
                  >
                    {businessPriorityOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        <Chip 
                          label={option.label} 
                          size="small" 
                          color={option.color}
                          sx={{ mr: 1 }}
                        />
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Equipment & Parts */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Build color="primary" />
              Equipment & Parts
            </Typography>
            <IconButton onClick={() => toggleSection('equipment')}>
              {expandedSections.equipment ? <ExpandMore /> : <ExpandMore sx={{ transform: 'rotate(-90deg)' }} />}
            </IconButton>
          </Box>
          
          {expandedSections.equipment && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Equipment Affected"
                  value={values.equipment_affected}
                  onChange={(e) => handleChange('equipment_affected', e.target.value)}
                  placeholder="Describe the equipment involved in this ticket..."
                  InputProps={{
                    startAdornment: <Build sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Parts Needed"
                  value={values.parts_needed}
                  onChange={(e) => handleChange('parts_needed', e.target.value)}
                  placeholder="List the parts required for this ticket..."
                  InputProps={{
                    startAdornment: <Inventory sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.parts_ordered}
                      onChange={(e) => handleChange('parts_ordered', e.target.checked)}
                    />
                  }
                  label="Parts Ordered"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.parts_received}
                      onChange={(e) => handleChange('parts_received', e.target.checked)}
                    />
                  }
                  label="Parts Received"
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Quality & Follow-up */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="primary" />
              Quality & Follow-up
            </Typography>
            <IconButton onClick={() => toggleSection('quality')}>
              {expandedSections.quality ? <ExpandMore /> : <ExpandMore sx={{ transform: 'rotate(-90deg)' }} />}
            </IconButton>
          </Box>
          
          {expandedSections.quality && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2">Quality Score:</Typography>
                  <Rating
                    value={values.quality_score}
                    onChange={(event, newValue) => {
                      handleChange('quality_score', newValue);
                    }}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.follow_up_required}
                      onChange={(e) => handleChange('follow_up_required', e.target.checked)}
                    />
                  }
                  label="Follow-up Required"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Follow-up Date"
                  type="date"
                  value={values.follow_up_date}
                  onChange={(e) => handleChange('follow_up_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={!values.follow_up_required}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Follow-up Notes"
                  value={values.follow_up_notes}
                  onChange={(e) => handleChange('follow_up_notes', e.target.value)}
                  placeholder="Notes for follow-up..."
                  disabled={!values.follow_up_required}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description color="primary" />
            Description & Notes
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Notes"
            value={values.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Describe the issue, steps to reproduce, and any relevant details..."
            helperText="Provide detailed information about the ticket"
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{ borderRadius: 2 }}
        >
          {loading ? 'Saving...' : (isEdit ? 'Update Ticket' : 'Create Ticket')}
        </Button>
      </Box>
    </Box>
  );
}

export default TicketForm; 