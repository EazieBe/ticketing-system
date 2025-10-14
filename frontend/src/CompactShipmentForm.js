import React, { useState, useEffect } from 'react';
import { Box, Paper, Grid, TextField, Button, FormControl, InputLabel, Select, MenuItem, Typography, Stack, Autocomplete, Switch, FormControlLabel } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import useApi from './hooks/useApi';

function CompactShipmentForm({ onSubmit, initialValues, isEdit }) {
  const api = useApi();
  const [values, setValues] = useState({
    site_id: '', ticket_id: '', item_id: '', what_is_being_shipped: '', shipping_preference: '',
    charges_out: '', charges_in: '', tracking_number: '', return_tracking: '', date_shipped: '',
    date_returned: '', notes: '', source_ticket_type: '', shipping_priority: 'normal',
    parts_cost: 0, total_cost: 0, status: 'pending', remove_from_inventory: false,
    ...initialValues
  });
  
  const [sites, setSites] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, i] = await Promise.all([api.get('/sites/'), api.get('/inventory/')]);
        setSites(s || []); setInventory(i || []);
      } catch {}
    };
    load();
  }, [api]);

  const c = (field, value) => setValues({ ...values, [field]: value });

  return (
    <Paper sx={{ p: 2, maxWidth: 1000 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{isEdit ? 'Edit' : 'New'} Shipment</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => window.history.back()}>Cancel</Button>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={() => onSubmit(values)} disabled={!values.site_id}>Save</Button>
        </Stack>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={6} md={4}>
          <Autocomplete size="small" options={sites} getOptionLabel={(o) => `${o.site_id} - ${o.location}`}
            value={sites.find(s => s.site_id === values.site_id) || null}
            onChange={(e, v) => c('site_id', v?.site_id || '')}
            renderInput={(p) => <TextField {...p} label="Site *" required sx={{ '& input': { fontSize: '0.875rem' } }} />}
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <TextField fullWidth size="small" label="Ticket ID" value={values.ticket_id} onChange={(e) => c('ticket_id', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        <Grid item xs={6} md={4}>
          <Autocomplete size="small" options={inventory} getOptionLabel={(o) => o.name}
            value={inventory.find(i => i.item_id === values.item_id) || null}
            onChange={(e, v) => c('item_id', v?.item_id || '')}
            renderInput={(p) => <TextField {...p} label="Inventory Item" sx={{ '& input': { fontSize: '0.875rem' } }} />}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField fullWidth size="small" label="What's Being Shipped *" required value={values.what_is_being_shipped}
            onChange={(e) => c('what_is_being_shipped', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField fullWidth size="small" label="Shipping Preference" value={values.shipping_preference}
            onChange={(e) => c('shipping_preference', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        <Grid item xs={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: '0.875rem' }}>Priority</InputLabel>
            <Select value={values.shipping_priority} onChange={(e) => c('shipping_priority', e.target.value)} label="Priority" sx={{ fontSize: '0.875rem' }}>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <TextField fullWidth size="small" label="Tracking #" value={values.tracking_number} onChange={(e) => c('tracking_number', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField fullWidth size="small" label="Return Tracking" value={values.return_tracking} onChange={(e) => c('return_tracking', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField fullWidth size="small" label="Charges Out ($)" type="number" value={values.charges_out} onChange={(e) => c('charges_out', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField fullWidth size="small" label="Charges In ($)" type="number" value={values.charges_in} onChange={(e) => c('charges_in', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        
        <Grid item xs={6} md={3}>
          <TextField fullWidth size="small" label="Parts Cost ($)" type="number" value={values.parts_cost} onChange={(e) => c('parts_cost', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField fullWidth size="small" label="Total Cost ($)" type="number" value={values.total_cost} onChange={(e) => c('total_cost', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        <Grid item xs={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: '0.875rem' }}>Status</InputLabel>
            <Select value={values.status} onChange={(e) => c('status', e.target.value)} label="Status" sx={{ fontSize: '0.875rem' }}>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="shipped">Shipped</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="returned">Returned</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={3}>
          <FormControlLabel control={<Switch size="small" checked={values.remove_from_inventory} onChange={(e) => c('remove_from_inventory', e.target.checked)} />}
            label={<Typography sx={{ fontSize: '0.875rem' }}>Remove from Inventory</Typography>} />
        </Grid>
        
        <Grid item xs={12}>
          <TextField fullWidth size="small" label="Notes" multiline rows={2} value={values.notes}
            onChange={(e) => c('notes', e.target.value)} sx={{ '& textarea': { fontSize: '0.875rem' } }} />
        </Grid>
      </Grid>
    </Paper>
  );
}

export default CompactShipmentForm;

