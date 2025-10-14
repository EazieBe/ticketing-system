import React, { useState } from 'react';
import { Box, Paper, Grid, TextField, Button, Typography, Stack } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';

function CompactSiteForm({ onSubmit, initialValues, isEdit }) {
  const [values, setValues] = useState({
    site_id: '', ip_address: '', location: '', brand: '', main_number: '', mp: '',
    service_address: '', city: '', state: '', zip: '', region: '', notes: '',
    equipment_notes: '', phone_system: '', phone_types: '', network_equipment: '', additional_equipment: '',
    ...initialValues
  });

  const c = (field, value) => setValues({ ...values, [field]: value });

  return (
    <Paper sx={{ p: 2, maxWidth: 1200 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
          {isEdit ? 'Edit Site' : 'New Site'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => window.history.back()}>Cancel</Button>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={() => onSubmit(values)} disabled={!values.site_id}>Save</Button>
        </Stack>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Site ID *" required value={values.site_id} onChange={(e) => c('site_id', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Location" value={values.location} onChange={(e) => c('location', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Brand" value={values.brand} onChange={(e) => c('brand', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="IP Address" value={values.ip_address} onChange={(e) => c('ip_address', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Main Phone" value={values.main_number} onChange={(e) => c('main_number', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="MP" value={values.mp} onChange={(e) => c('mp', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="City" value={values.city} onChange={(e) => c('city', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="State" value={values.state} onChange={(e) => c('state', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="ZIP" value={values.zip} onChange={(e) => c('zip', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Region" value={values.region} onChange={(e) => c('region', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Service Address" value={values.service_address} onChange={(e) => c('service_address', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        
        <Grid item xs={12}><TextField fullWidth size="small" label="Notes" multiline rows={2} value={values.notes} onChange={(e) => c('notes', e.target.value)} sx={{ '& textarea': { fontSize: '0.875rem' } }} /></Grid>
        
        <Grid item xs={12}><Typography variant="subtitle2" sx={{ fontSize: '0.9rem', fontWeight: 'bold', mt: 1 }}>Equipment Information</Typography></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Phone System" value={values.phone_system} onChange={(e) => c('phone_system', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Phone Types" value={values.phone_types} onChange={(e) => c('phone_types', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Network Equipment" value={values.network_equipment} onChange={(e) => c('network_equipment', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Additional Equipment" value={values.additional_equipment} onChange={(e) => c('additional_equipment', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={12}><TextField fullWidth size="small" label="Equipment Notes" multiline rows={2} value={values.equipment_notes} onChange={(e) => c('equipment_notes', e.target.value)} sx={{ '& textarea': { fontSize: '0.875rem' } }} /></Grid>
      </Grid>
    </Paper>
  );
}

export default CompactSiteForm;

