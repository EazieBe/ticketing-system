import React, { useState, useEffect } from 'react';
import { 
  TextField, Button, Box, Alert, FormControl, InputLabel, Select, MenuItem, 
  CircularProgress, Grid, Typography, Divider, Chip, Tooltip, Autocomplete,
  Card, CardContent, Accordion, AccordionSummary, AccordionDetails, Switch,
  FormControlLabel, InputAdornment
} from '@mui/material';
import { 
  Warning, Speed, Business, Person, Assignment, Schedule, 
  ExpandMore, Info, PriorityHigh, Category, Description, LocationOn
} from '@mui/icons-material';
import api from './axiosConfig';

const typeOptions = [
  { value: 'inhouse', label: 'In-House', icon: '🏢' },
  { value: 'onsite', label: 'Onsite', icon: '📍' },
  { value: 'shipping', label: 'Shipping', icon: '📦' },
  { value: 'projects', label: 'Projects', icon: '📋' },
  { value: 'nro', label: 'NRO', icon: '⚡' },
  { value: 'misc', label: 'MISC', icon: '🔧' }
];

// Status options based on ticket type
const getStatusOptions = (ticketType) => {
  switch (ticketType) {
    case 'inhouse':
      return [
        { value: 'open', label: 'Open', color: 'primary' },
        { value: 'in_progress', label: 'In Progress', color: 'info' },
        { value: 'pending', label: 'Pending', color: 'warning' },
        { value: 'closed', label: 'Closed', color: 'success' },
        { value: 'approved', label: 'Approved', color: 'success' }
      ];
    case 'onsite':
      return [
        { value: 'open', label: 'Open', color: 'primary' },
        { value: 'checked_in', label: 'Checked In', color: 'info' },
        { value: 'closed', label: 'Closed', color: 'success' },
        { value: 'return', label: 'Return', color: 'warning' },
        { value: 'approved', label: 'Approved', color: 'success' }
      ];
    case 'shipping':
      return [
        { value: 'open', label: 'Open', color: 'primary' },
        { value: 'in_progress', label: 'In Progress', color: 'info' },
        { value: 'shipped', label: 'Shipped', color: 'success' },
        { value: 'delivered', label: 'Delivered', color: 'success' },
        { value: 'closed', label: 'Closed', color: 'success' }
      ];
    case 'projects':
      return [
        { value: 'open', label: 'Open', color: 'primary' },
        { value: 'planning', label: 'Planning', color: 'info' },
        { value: 'in_progress', label: 'In Progress', color: 'warning' },
        { value: 'review', label: 'Review', color: 'secondary' },
        { value: 'completed', label: 'Completed', color: 'success' }
      ];
    case 'nro':
      return [
        { value: 'open', label: 'Open', color: 'primary' },
        { value: 'in_progress', label: 'In Progress', color: 'info' },
        { value: 'pending', label: 'Pending', color: 'warning' },
        { value: 'closed', label: 'Closed', color: 'success' }
      ];
    case 'misc':
      return [
        { value: 'open', label: 'Open', color: 'primary' },
        { value: 'in_progress', label: 'In Progress', color: 'info' },
        { value: 'pending', label: 'Pending', color: 'warning' },
        { value: 'closed', label: 'Closed', color: 'success' }
      ];
    default:
      return [
        { value: 'open', label: 'Open', color: 'primary' },
        { value: 'in_progress', label: 'In Progress', color: 'info' },
        { value: 'pending', label: 'Pending', color: 'warning' },
        { value: 'closed', label: 'Closed', color: 'success' }
      ];
  }
};

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'success' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'high', label: 'High', color: 'error' },
  { value: 'urgent', label: 'Urgent', color: 'error' }
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

function TicketForm({ initialValues, onSubmit, isEdit = false }) {
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
    // SLA Management Fields
    sla_target_hours: 24,
    sla_breach_hours: 48,
    customer_impact: 'medium',
    business_priority: 'medium'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
        // SLA Management Fields
        sla_target_hours: initialValues.sla_target_hours || 24,
        sla_breach_hours: initialValues.sla_breach_hours || 48,
        customer_impact: initialValues.customer_impact || 'medium',
        business_priority: initialValues.business_priority || 'medium'
      });
    }
  }, [initialValues]);

  // Fetch sites and users when component mounts
  useEffect(() => {
    fetchSites();
    fetchUsers();
  }, []);

  const fetchSites = async () => {
    setLoadingSites(true);
    try {
      const response = await api.get('/sites/');
      setSites(response.data);
    } catch (error) {
      console.error('Error fetching sites:', error);
      setSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (field, value) => {
    setValues(prev => {
      const newValues = { ...prev, [field]: value };
      
      // When ticket type changes, reset status to 'open' and update available status options
      if (field === 'type') {
        newValues.status = 'open';
      }
      
      return newValues;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with values:', values);
    
    // Prevent submission if form is not properly initialized
    if (!values.site_id && !values.type && !values.status) {
      console.log('Form not properly initialized, preventing submission');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      console.log('Validating site_id:', values.site_id, 'type:', values.type, 'status:', values.status);
      
      if (!values.site_id || values.site_id.trim() === '') {
        console.log('Site validation failed - site_id is empty');
        throw new Error('Site is required');
      }
      if (!values.type || values.type.trim() === '') {
        console.log('Type validation failed - type is empty');
        throw new Error('Type is required');
      }
      if (!values.status || values.status.trim() === '') {
        console.log('Status validation failed - status is empty');
        throw new Error('Status is required');
      }

      // Clean up values - ensure required fields are not empty strings
      const cleanedValues = {
        site_id: values.site_id.trim(),
        type: values.type.trim(),
        status: values.status.trim()
      };
      
      // Only add optional fields if they have values
      if (values.inc_number?.trim()) cleanedValues.inc_number = values.inc_number.trim();
      if (values.so_number?.trim()) cleanedValues.so_number = values.so_number.trim();
      if (values.priority?.trim()) cleanedValues.priority = values.priority.trim();
      if (values.category?.trim()) cleanedValues.category = values.category.trim();
      if (values.assigned_user_id?.trim()) cleanedValues.assigned_user_id = values.assigned_user_id.trim();
      if (values.onsite_tech_id?.trim()) cleanedValues.onsite_tech_id = values.onsite_tech_id.trim();
      if (values.date_created) cleanedValues.date_created = values.date_created.split('T')[0]; // Convert to YYYY-MM-DD
      if (values.date_scheduled) cleanedValues.date_scheduled = values.date_scheduled.split('T')[0]; // Convert to YYYY-MM-DD
      if (values.date_closed) cleanedValues.date_closed = values.date_closed.split('T')[0]; // Convert to YYYY-MM-DD
      if (values.time_spent) cleanedValues.time_spent = parseInt(values.time_spent) || 0;
      if (values.notes?.trim()) cleanedValues.notes = values.notes.trim();
      if (values.color_flag?.trim()) cleanedValues.color_flag = values.color_flag.trim();
      if (values.special_flag?.trim()) cleanedValues.special_flag = values.special_flag.trim();
      if (values.sla_target_hours) cleanedValues.sla_target_hours = parseInt(values.sla_target_hours) || 24;
      if (values.sla_breach_hours) cleanedValues.sla_breach_hours = parseInt(values.sla_breach_hours) || 48;
      if (values.customer_impact) cleanedValues.customer_impact = values.customer_impact;
      if (values.business_priority) cleanedValues.business_priority = values.business_priority;

      console.log('Submitting ticket with cleaned values:', cleanedValues);
      await onSubmit(cleanedValues);
    } catch (err) {
      console.error('Form validation error:', err.message);
      setError(err.message || 'Failed to save ticket');
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact) => {
    const option = impactOptions.find(opt => opt.value === impact);
    return option?.color || 'default';
  };

  const getPriorityColor = (priority) => {
    const option = priorityOptions.find(opt => opt.value === priority);
    return option?.color || 'default';
  };

  const getStatusColor = (status) => {
    // Get all possible status options and find the matching one
    const allStatusOptions = [
      ...getStatusOptions('inhouse'),
      ...getStatusOptions('onsite'),
      ...getStatusOptions('shipping'),
      ...getStatusOptions('projects'),
      ...getStatusOptions('nro'),
      ...getStatusOptions('misc')
    ];
    const option = allStatusOptions.find(opt => opt.value === status);
    return option?.color || 'default';
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
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment color="primary" />
            Basic Information
          </Typography>
          
          <Grid container spacing={2}>
            {/* Site Selection */}
            <Grid item xs={12} md={6}>
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
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <LocationOn sx={{ mr: 1, color: 'action.active' }} />
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
                filterOptions={(options, { inputValue }) => {
                  const searchTerm = inputValue.toLowerCase();
                  return options.filter(option => 
                    option.site_id.toLowerCase().includes(searchTerm) ||
                    option.location.toLowerCase().includes(searchTerm) ||
                    option.city?.toLowerCase().includes(searchTerm) ||
                    option.state?.toLowerCase().includes(searchTerm)
                  );
                }}
              />
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

            {/* Dates */}
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Created Date"
                    type="datetime-local"
                    value={values.date_created ? values.date_created.slice(0, 16) : ''}
                    onChange={(e) => handleChange('date_created', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Scheduled Date"
                    type="datetime-local"
                    value={values.date_scheduled ? values.date_scheduled.slice(0, 16) : ''}
                    onChange={(e) => handleChange('date_scheduled', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Time Spent (hours)"
                    type="number"
                    value={values.time_spent}
                    onChange={(e) => handleChange('time_spent', e.target.value)}
                    InputProps={{
                      startAdornment: <Schedule sx={{ mr: 1, color: 'action.active' }} />
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
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

      {/* Advanced Options */}
      <Accordion expanded={showAdvanced} onChange={() => setShowAdvanced(!showAdvanced)}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Speed color="primary" />
            Advanced Options
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* SLA Management */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                SLA Management
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
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
                <Grid item xs={6}>
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
                <Grid item xs={6}>
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
                <Grid item xs={6}>
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
            </Grid>

            {/* Flags and Additional Info */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Additional Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Color Flag"
                    value={values.color_flag}
                    onChange={(e) => handleChange('color_flag', e.target.value)}
                    placeholder="Red, Yellow, Green, etc."
                    helperText="Visual indicator for ticket priority"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Special Flag"
                    value={values.special_flag}
                    onChange={(e) => handleChange('special_flag', e.target.value)}
                    placeholder="VIP, Urgent, etc."
                    helperText="Special handling instructions"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={values.date_closed ? true : false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleChange('date_closed', new Date().toISOString().split('T')[0]); // Convert to YYYY-MM-DD format
                          } else {
                            handleChange('date_closed', '');
                          }
                        }}
                      />
                    }
                    label="Mark as Closed"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

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