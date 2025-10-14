import React, { useState, useEffect } from 'react';
import { Paper, Grid, TextField, Button, FormControl, InputLabel, Select, MenuItem, Typography, Stack, Autocomplete } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import useApi from './hooks/useApi';

function CompactTaskForm({ onSubmit, initialValues, isEdit }) {
  const api = useApi();
  const [values, setValues] = useState({
    ticket_id: '', assigned_user_id: '', description: '', status: 'open', due_date: '',
    ...initialValues
  });
  
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await api.get('/users/');
        setUsers(u || []);
      } catch {}
    };
    load();
  }, [api]);

  const c = (field, value) => setValues({ ...values, [field]: value });

  return (
    <Paper sx={{ p: 2, maxWidth: 800 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{isEdit ? 'Edit' : 'New'} Task</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => window.history.back()}>Cancel</Button>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={() => onSubmit(values)} disabled={!values.description}>Save</Button>
        </Stack>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label="Ticket ID" value={values.ticket_id} onChange={(e) => c('ticket_id', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Autocomplete size="small" options={users} getOptionLabel={(o) => o.name}
            value={users.find(u => u.user_id === values.assigned_user_id) || null}
            onChange={(e, v) => c('assigned_user_id', v?.user_id || '')}
            renderInput={(p) => <TextField {...p} label="Assigned To" sx={{ '& input': { fontSize: '0.875rem' } }} />}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: '0.875rem' }}>Status</InputLabel>
            <Select value={values.status} onChange={(e) => c('status', e.target.value)} label="Status" sx={{ fontSize: '0.875rem' }}>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label="Due Date" type="date" value={values.due_date}
            onChange={(e) => c('due_date', e.target.value)} InputLabelProps={{ shrink: true }} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth size="small" label="Description *" required multiline rows={3} value={values.description}
            onChange={(e) => c('description', e.target.value)} sx={{ '& textarea': { fontSize: '0.875rem' } }} />
        </Grid>
      </Grid>
    </Paper>
  );
}

export default CompactTaskForm;

