import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Grid, TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Typography, Stack, Autocomplete, Chip, Alert
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import useApi from './hooks/useApi';

function CompactTicketForm({ onSubmit, initialValues, isEdit }) {
  const api = useApi();
  const [values, setValues] = useState({
    site_id: '',
    type: 'onsite',
    status: 'open',
    priority: 'normal',
    inc_number: '',
    so_number: '',
    category: '',
    assigned_user_id: '',
    onsite_tech_id: '',
    date_scheduled: '',
    notes: '',
    ...initialValues
  });
  
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [fieldTechs, setFieldTechs] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, u, ft] = await Promise.all([
          api.get('/sites/'),
          api.get('/users/'),
          api.get('/fieldtechs/')
        ]);
        setSites(s || []);
        setUsers(u || []);
        setFieldTechs(ft || []);
      } catch {}
    };
    load();
  }, [api]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <Paper sx={{ p: 2, maxWidth: 1200 }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 'bold', mb: 2 }}>
        {isEdit ? 'Edit Ticket' : 'New Ticket'}
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={1.5}>
          {/* Row 1 - Core Info */}
          <Grid item xs={6} md={3}>
            <Autocomplete
              size="small"
              options={sites}
              getOptionLabel={(o) => `${o.site_id} - ${o.location}`}
              value={sites.find(s => s.site_id === values.site_id) || null}
              onChange={(e, v) => setValues({ ...values, site_id: v?.site_id || '' })}
              renderInput={(params) => <TextField {...params} label="Site *" required sx={{ '& input': { fontSize: '0.875rem' } }} />}
            />
          </Grid>
          
          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small" required>
              <InputLabel sx={{ fontSize: '0.875rem' }}>Type</InputLabel>
              <Select value={values.type} onChange={(e) => setValues({ ...values, type: e.target.value })} 
                label="Type" sx={{ fontSize: '0.875rem' }}>
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
              <Select value={values.status} onChange={(e) => setValues({ ...values, status: e.target.value })} 
                label="Status" sx={{ fontSize: '0.875rem' }}>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="needs_parts">Needs Parts</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '0.875rem' }}>Priority</InputLabel>
              <Select value={values.priority} onChange={(e) => setValues({ ...values, priority: e.target.value })} 
                label="Priority" sx={{ fontSize: '0.875rem' }}>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Row 2 - Numbers & Schedule */}
          <Grid item xs={6} md={3}>
            <TextField fullWidth size="small" label="INC Number" value={values.inc_number}
              onChange={(e) => setValues({ ...values, inc_number: e.target.value })}
              sx={{ '& input': { fontSize: '0.875rem' } }} />
          </Grid>
          
          <Grid item xs={6} md={3}>
            <TextField fullWidth size="small" label="SO Number" value={values.so_number}
              onChange={(e) => setValues({ ...values, so_number: e.target.value })}
              sx={{ '& input': { fontSize: '0.875rem' } }} />
          </Grid>
          
          {values.type === 'onsite' && (
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Scheduled Date ⭐" type="date" value={values.date_scheduled}
                onChange={(e) => setValues({ ...values, date_scheduled: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ '& input': { fontSize: '0.875rem' }, bgcolor: !values.date_scheduled ? '#fff3e0' : 'white' }} />
            </Grid>
          )}
          
          <Grid item xs={6} md={3}>
            <TextField fullWidth size="small" label="Category" value={values.category}
              onChange={(e) => setValues({ ...values, category: e.target.value })}
              sx={{ '& input': { fontSize: '0.875rem' } }} />
          </Grid>

          {/* Row 3 - Assignment */}
          <Grid item xs={6} md={4}>
            <Autocomplete
              size="small"
              options={users}
              getOptionLabel={(o) => o.name}
              value={users.find(u => u.user_id === values.assigned_user_id) || null}
              onChange={(e, v) => setValues({ ...values, assigned_user_id: v?.user_id || '' })}
              renderInput={(params) => <TextField {...params} label="Assigned To" sx={{ '& input': { fontSize: '0.875rem' } }} />}
            />
          </Grid>
          
          {values.type === 'onsite' && (
            <Grid item xs={6} md={4}>
              <Autocomplete
                size="small"
                options={fieldTechs}
                getOptionLabel={(o) => o.name}
                value={fieldTechs.find(ft => ft.field_tech_id === values.onsite_tech_id) || null}
                onChange={(e, v) => setValues({ ...values, onsite_tech_id: v?.field_tech_id || '' })}
                renderInput={(params) => <TextField {...params} label="Field Tech" sx={{ '& input': { fontSize: '0.875rem' } }} />}
              />
            </Grid>
          )}

          {/* Row 4 - Notes */}
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Notes" multiline rows={3} value={values.notes}
              onChange={(e) => setValues({ ...values, notes: e.target.value })}
              sx={{ '& textarea': { fontSize: '0.875rem' } }} />
          </Grid>

          {/* Alert for onsite without scheduled date */}
          {values.type === 'onsite' && !values.date_scheduled && (
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ py: 0.5 }}>
                <Typography variant="caption">⚠️ Set scheduled date for onsite tickets!</Typography>
              </Alert>
            </Grid>
          )}

          {/* Actions */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => window.history.back()}>
                Cancel
              </Button>
              <Button size="small" variant="contained" startIcon={<Save />} type="submit" disabled={!values.site_id}>
                {isEdit ? 'Update' : 'Create'} Ticket
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}

export default CompactTicketForm;


