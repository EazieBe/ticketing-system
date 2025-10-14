import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Grid, TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Typography, Stack, Autocomplete, Tabs, Tab, Switch, FormControlLabel, Alert
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import useApi from './hooks/useApi';

function CompactTicketFormComplete({ onSubmit, initialValues, isEdit }) {
  const api = useApi();
  const [activeTab, setActiveTab] = useState(0);
  const [values, setValues] = useState({
    // Core fields
    site_id: '', inc_number: '', so_number: '', type: 'onsite', status: 'open', priority: 'normal',
    assigned_user_id: '', onsite_tech_id: '', date_created: '', date_scheduled: '',
    date_closed: '', time_spent: '', notes: '', special_flag: '',
    // Claim/Check fields
    claimed_by: '', claimed_at: '', check_in_time: '', check_out_time: '', onsite_duration_minutes: '',
    billing_rate: 0, total_cost: 0,
    // Workflow fields
    estimated_hours: '', actual_hours: '', start_time: '', end_time: '', is_billable: true,
    requires_approval: false, approved_by: '', approved_at: '', rejection_reason: '',
    workflow_step: 'created', next_action_required: '', due_date: '',
    // Equipment/Parts
    equipment_affected: '', parts_needed: '', parts_ordered: false, parts_received: false,
    // Quality
    quality_score: '', follow_up_required: false, follow_up_date: '', follow_up_notes: '',
    ...initialValues
  });
  
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [fieldTechs, setFieldTechs] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, u, ft] = await Promise.all([api.get('/sites/'), api.get('/users/'), api.get('/fieldtechs/')]);
        setSites(s || []); setUsers(u || []); setFieldTechs(ft || []);
      } catch {}
    };
    load();
  }, [api]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  const c = (field, value) => setValues({ ...values, [field]: value });

  return (
    <Paper sx={{ p: 2, maxHeight: '90vh', overflow: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
          {isEdit ? 'Edit Ticket' : 'New Ticket'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => window.history.back()}>Cancel</Button>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={handleSubmit} disabled={!values.site_id}>Save</Button>
        </Stack>
      </Stack>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Basic" sx={{ minWidth: 80, fontSize: '0.875rem' }} />
        <Tab label="Assignment" sx={{ minWidth: 80, fontSize: '0.875rem' }} />
        <Tab label="Parts/Billing" sx={{ minWidth: 80, fontSize: '0.875rem' }} />
        <Tab label="Quality" sx={{ minWidth: 80, fontSize: '0.875rem' }} />
      </Tabs>

      <form onSubmit={handleSubmit}>
        {/* TAB 0: BASIC INFO */}
        {activeTab === 0 && (
          <Grid container spacing={1.5}>
            <Grid item xs={6} md={3}>
              <Autocomplete size="small" options={sites} getOptionLabel={(o) => `${o.site_id} - ${o.location}`}
                value={sites.find(s => s.site_id === values.site_id) || null}
                onChange={(e, v) => c('site_id', v?.site_id || '')}
                renderInput={(p) => <TextField {...p} label="Site *" required sx={{ '& input': { fontSize: '0.875rem' } }} />}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small" required>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Type</InputLabel>
                <Select value={values.type} onChange={(e) => c('type', e.target.value)} label="Type" sx={{ fontSize: '0.875rem' }}>
                  <MenuItem value="inhouse">Inhouse</MenuItem>
                  <MenuItem value="onsite">Onsite</MenuItem>
                  <MenuItem value="projects">Projects</MenuItem>
                  <MenuItem value="misc">Misc</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.875rem' }}>Status</InputLabel>
                <Select value={values.status} onChange={(e) => c('status', e.target.value)} label="Status" sx={{ fontSize: '0.875rem' }}>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="checked_in">Checked In</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="needs_parts">Needs Parts</MenuItem>
                  <MenuItem value="go_back_scheduled">Go Back Scheduled</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.875rem' }}>Priority</InputLabel>
                <Select value={values.priority} onChange={(e) => c('priority', e.target.value)} label="Priority" sx={{ fontSize: '0.875rem' }}>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="INC Number" value={values.inc_number} onChange={(e) => c('inc_number', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="SO Number" value={values.so_number} onChange={(e) => c('so_number', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            
            {values.type === 'onsite' && (
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="Scheduled Date ⭐" type="date" value={values.date_scheduled}
                  onChange={(e) => c('date_scheduled', e.target.value)} InputLabelProps={{ shrink: true }}
                  sx={{ '& input': { fontSize: '0.875rem' }, bgcolor: !values.date_scheduled ? '#fff3e0' : 'white' }} />
                {!values.date_scheduled && <Alert severity="warning" sx={{ mt: 0.5, py: 0 }}><Typography variant="caption">Set scheduled date for onsite!</Typography></Alert>}
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Notes" multiline rows={3} value={values.notes}
                onChange={(e) => c('notes', e.target.value)} sx={{ '& textarea': { fontSize: '0.875rem' } }} />
            </Grid>
          </Grid>
        )}

        {/* TAB 1: ASSIGNMENT */}
        {activeTab === 1 && (
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <Autocomplete size="small" options={users} getOptionLabel={(o) => `${o.name} (${o.role})`}
                value={users.find(u => u.user_id === values.assigned_user_id) || null}
                onChange={(e, v) => c('assigned_user_id', v?.user_id || '')}
                renderInput={(p) => <TextField {...p} label="Assigned Internal User" sx={{ '& input': { fontSize: '0.875rem' } }} />}
              />
            </Grid>
            {values.type === 'onsite' && (
              <Grid item xs={12} md={6}>
                <Autocomplete size="small" options={fieldTechs} getOptionLabel={(o) => `${o.name} - ${o.region}`}
                  value={fieldTechs.find(ft => ft.field_tech_id === values.onsite_tech_id) || null}
                  onChange={(e, v) => c('onsite_tech_id', v?.field_tech_id || '')}
                  renderInput={(p) => <TextField {...p} label="Field Tech" sx={{ '& input': { fontSize: '0.875rem' } }} />}
                />
              </Grid>
            )}
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Estimated Hours" type="number" value={values.estimated_hours}
                onChange={(e) => c('estimated_hours', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Actual Hours" type="number" value={values.actual_hours}
                onChange={(e) => c('actual_hours', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Time Spent (min)" type="number" value={values.time_spent}
                onChange={(e) => c('time_spent', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Due Date" type="datetime-local" value={values.due_date}
                onChange={(e) => c('due_date', e.target.value)} InputLabelProps={{ shrink: true }} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Next Action Required" value={values.next_action_required}
                onChange={(e) => c('next_action_required', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControlLabel control={<Switch size="small" checked={values.is_billable} onChange={(e) => c('is_billable', e.target.checked)} />}
                label={<Typography sx={{ fontSize: '0.875rem' }}>Billable</Typography>} />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControlLabel control={<Switch size="small" checked={values.requires_approval} onChange={(e) => c('requires_approval', e.target.checked)} />}
                label={<Typography sx={{ fontSize: '0.875rem' }}>Requires Approval</Typography>} />
            </Grid>
          </Grid>
        )}

        {/* TAB 2: PARTS/BILLING */}
        {activeTab === 2 && (
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Equipment Affected" value={values.equipment_affected}
                onChange={(e) => c('equipment_affected', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Parts Needed" value={values.parts_needed}
                onChange={(e) => c('parts_needed', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControlLabel control={<Switch size="small" checked={values.parts_ordered} onChange={(e) => c('parts_ordered', e.target.checked)} />}
                label={<Typography sx={{ fontSize: '0.875rem' }}>Parts Ordered</Typography>} />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControlLabel control={<Switch size="small" checked={values.parts_received} onChange={(e) => c('parts_received', e.target.checked)} />}
                label={<Typography sx={{ fontSize: '0.875rem' }}>Parts Received</Typography>} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Billing Rate ($/hr)" type="number" value={values.billing_rate}
                onChange={(e) => c('billing_rate', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Total Cost ($)" type="number" value={values.total_cost}
                onChange={(e) => c('total_cost', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
          </Grid>
        )}

        {/* TAB 3: QUALITY */}
        {activeTab === 3 && (
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Quality Score" type="number" value={values.quality_score}
                onChange={(e) => c('quality_score', e.target.value)} inputProps={{ min: 1, max: 10 }} sx={{ '& input': { fontSize: '0.875rem' } }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Switch size="small" checked={values.follow_up_required} onChange={(e) => c('follow_up_required', e.target.checked)} />}
                label={<Typography sx={{ fontSize: '0.875rem' }}>Follow-up Required</Typography>} />
            </Grid>
            {values.follow_up_required && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth size="small" label="Follow-up Date" type="date" value={values.follow_up_date}
                    onChange={(e) => c('follow_up_date', e.target.value)} InputLabelProps={{ shrink: true }} sx={{ '& input': { fontSize: '0.875rem' } }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Follow-up Notes" multiline rows={2} value={values.follow_up_notes}
                    onChange={(e) => c('follow_up_notes', e.target.value)} sx={{ '& textarea': { fontSize: '0.875rem' } }} />
                </Grid>
              </>
            )}
          </Grid>
        )}
      </form>
    </Paper>
  );
}

export default CompactTicketFormComplete;
