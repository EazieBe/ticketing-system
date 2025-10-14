import React, { useState } from 'react';
import { Paper, Grid, TextField, Button, Typography, Stack } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';

function CompactInventoryForm({ onSubmit, initialValues, isEdit }) {
  const [values, setValues] = useState({
    name: '', sku: '', description: '', quantity_on_hand: 0, cost: '', location: '', barcode: '',
    ...initialValues
  });

  const c = (field, value) => setValues({ ...values, [field]: value });

  return (
    <Paper sx={{ p: 2, maxWidth: 900 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{isEdit ? 'Edit' : 'New'} Item</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => window.history.back()}>Cancel</Button>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={() => onSubmit(values)} disabled={!values.name}>Save</Button>
        </Stack>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Name *" required value={values.name} onChange={(e) => c('name', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="SKU" value={values.sku} onChange={(e) => c('sku', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Barcode" value={values.barcode} onChange={(e) => c('barcode', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Quantity" type="number" value={values.quantity_on_hand} onChange={(e) => c('quantity_on_hand', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Cost ($)" type="number" value={values.cost} onChange={(e) => c('cost', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Location" value={values.location} onChange={(e) => c('location', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} /></Grid>
        <Grid item xs={12}><TextField fullWidth size="small" label="Description" multiline rows={2} value={values.description} onChange={(e) => c('description', e.target.value)} sx={{ '& textarea': { fontSize: '0.875rem' } }} /></Grid>
      </Grid>
    </Paper>
  );
}

export default CompactInventoryForm;

