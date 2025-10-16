import React, { useState } from 'react';
import { Paper, Grid, TextField, Button, FormControl, InputLabel, Select, MenuItem, Typography, Stack, Switch, FormControlLabel } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';

function CompactUserForm({ onSubmit, initialValues, isEdit }) {
  const [values, setValues] = useState({
    name: '', email: '', role: 'tech', phone: '', preferences: '{}', password: '',
    must_change_password: false, active: true,
    ...initialValues
  });

  const c = (field, value) => setValues({ ...values, [field]: value });

  return (
    <Paper sx={{ p: 2, maxWidth: 900 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{isEdit ? 'Edit' : 'New'} User</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => window.history.back()}>Cancel</Button>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={() => onSubmit(values)} disabled={!values.name || !values.email}>Save</Button>
        </Stack>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Name *" required value={values.name} onChange={(e) => c('name', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Email *" required type="email" value={values.email} onChange={(e) => c('email', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={4}>
          <FormControl fullWidth size="small" required>
            <InputLabel sx={{ fontSize: '0.875rem' }}>Role</InputLabel>
            <Select value={values.role} onChange={(e) => c('role', e.target.value)} label="Role" sx={{ fontSize: '0.875rem' }}>
              <MenuItem value="tech">Tech</MenuItem>
              <MenuItem value="dispatcher">Dispatcher</MenuItem>
              <MenuItem value="billing">Billing</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={4}><TextField fullWidth size="small" label="Phone" value={values.phone} onChange={(e) => c('phone', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        {!isEdit && (
          <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Password (optional)" type="password" value={values.password || ''} onChange={(e) => c('password', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        )}
        <Grid item xs={6} md={4}>
          <FormControlLabel control={<Switch size="small" checked={values.active} onChange={(e) => c('active', e.target.checked)} />}
            label={<Typography sx={{ fontSize: '0.875rem' }}>Active</Typography>} />
        </Grid>
        <Grid item xs={6} md={4}>
          <FormControlLabel control={<Switch size="small" checked={values.must_change_password} onChange={(e) => c('must_change_password', e.target.checked)} />}
            label={<Typography sx={{ fontSize: '0.875rem' }}>Must Change Password</Typography>} />
        </Grid>
      </Grid>
    </Paper>
  );
}

export default CompactUserForm;

