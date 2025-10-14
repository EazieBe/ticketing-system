import React, { useState } from 'react';
import { Paper, Grid, TextField, Button, Typography, Stack } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';

function CompactFieldTechForm({ onSubmit, initialValues, isEdit }) {
  const [values, setValues] = useState({
    name: '', phone: '', email: '', region: '', city: '', state: '', zip: '', notes: '',
    ...initialValues
  });

  const c = (field, value) => setValues({ ...values, [field]: value });

  return (
    <Paper sx={{ p: 2, maxWidth: 900 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{isEdit ? 'Edit' : 'New'} Field Tech</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => window.history.back()}>Cancel</Button>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={() => onSubmit(values)} disabled={!values.name}>Save</Button>
        </Stack>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Name *" required value={values.name} onChange={(e) => c('name', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Phone" value={values.phone} onChange={(e) => c('phone', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Email" type="email" value={values.email} onChange={(e) => c('email', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Region" value={values.region} onChange={(e) => c('region', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="City" value={values.city} onChange={(e) => c('city', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="State" value={values.state} onChange={(e) => c('state', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="ZIP" value={values.zip} onChange={(e) => c('zip', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={12}><TextField fullWidth size="small" label="Notes" multiline rows={2} value={values.notes} onChange={(e) => c('notes', e.target.value)} sx={{ '& textarea': { fontSize: '0.875rem' } }} /></Grid>
      </Grid>
    </Paper>
  );
}

export default CompactFieldTechForm;

