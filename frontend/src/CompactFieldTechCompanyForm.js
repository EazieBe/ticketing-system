import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper, Grid, TextField, Button, Typography, Stack, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Box
} from '@mui/material';
import { Save, Cancel, Add, Delete, Person } from '@mui/icons-material';
import useApi from './hooks/useApi';
import { getApiPath } from './apiPaths';

const emptyTech = () => ({ name: '', tech_number: '', phone: '', email: '', service_radius_miles: '' });

function CompactFieldTechCompanyForm({ onSubmit, initialValues, isEdit, isSaving = false }) {
  const api = useApi();
  const [states, setStates] = useState([]);
  const RADIUS_OPTIONS = [25, 50, 75, 100, 150, 200];
  const [values, setValues] = useState({
    company_name: '',
    company_number: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    service_radius_miles: '',
    ...initialValues
  });
  const [techs, setTechs] = useState(
    (initialValues && initialValues.techs && initialValues.techs.length)
      ? initialValues.techs.map(t => ({
          field_tech_id: t.field_tech_id,
          name: t.name || '',
          tech_number: t.tech_number || '',
          phone: t.phone || '',
          email: t.email || '',
          service_radius_miles: t.service_radius_miles ?? ''
        }))
      : [emptyTech()]
  );
  const [zipLookupLoading, setZipLookupLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`${getApiPath('fieldtechCompanies')}/states`);
        if (!cancelled) setStates(res || []);
      } catch (_) {
        if (!cancelled) setStates([]);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  const set = (field, value) => setValues(prev => ({ ...prev, [field]: value }));

  const lookupZip = useCallback(async (zip) => {
    const z = (zip || '').toString().trim();
    if (!z || z.length < 5) return;
    setZipLookupLoading(true);
    try {
      const res = await api.get(`${getApiPath('fieldtechCompanies')}/zip/${z}`);
      if (res && (res.city != null || res.state != null)) {
        setValues(prev => ({
          ...prev,
          city: res.city != null ? res.city : prev.city,
          state: res.state != null ? res.state : prev.state
        }));
      }
    } catch (_) {}
    setZipLookupLoading(false);
  }, [api]);

  const addTech = () => setTechs(prev => [...prev, emptyTech()]);
  const removeTech = (index) => {
    if (techs.length <= 1) return;
    setTechs(prev => prev.filter((_, i) => i !== index));
  };
  const setTech = (index, field, value) => {
    setTechs(prev => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = () => {
    const techsToSend = techs.filter(t => (t.name || '').trim());
    onSubmit({ ...values, techs: techsToSend });
  };

  return (
    <Paper sx={{ p: 2, maxWidth: 960 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
          {isEdit ? 'Edit' : 'New'} Company
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => window.history.back()} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={handleSubmit} disabled={!values.company_name || isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </Stack>
      </Stack>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Company address (region is derived from state). ZIP auto-fills city/state.
      </Typography>
      <Grid container spacing={1.5}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            label="Company name *"
            required
            value={values.company_name}
            onChange={(e) => set('company_name', e.target.value)}
            sx={{ '& input': { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            label="Company number"
            value={values.company_number}
            onChange={(e) => set('company_number', e.target.value)}
            sx={{ '& input': { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Address"
            value={values.address}
            onChange={(e) => set('address', e.target.value)}
            sx={{ '& input': { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            label="ZIP"
            value={values.zip}
            onChange={(e) => set('zip', e.target.value)}
            onBlur={() => lookupZip(values.zip)}
            placeholder="12345"
            helperText={zipLookupLoading ? 'Looking up...' : 'Blur to fill city/state'}
            sx={{ '& input': { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            label="City"
            value={values.city}
            onChange={(e) => set('city', e.target.value)}
            sx={{ '& input': { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>State</InputLabel>
            <Select
              value={values.state && states.some((s) => s.value === values.state) ? values.state : ''}
              label="State"
              onChange={(e) => set('state', e.target.value)}
              displayEmpty
              sx={{ fontSize: '0.875rem' }}
            >
              <MenuItem value="">—</MenuItem>
              {states.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField
            fullWidth
            size="small"
            label="Region"
            value={values.region || ''}
            disabled
            helperText="From state"
            sx={{ '& input': { fontSize: '0.875rem' } }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Service radius (miles)</InputLabel>
            <Select
              value={values.service_radius_miles !== undefined && values.service_radius_miles !== null && values.service_radius_miles !== '' ? values.service_radius_miles : ''}
              label="Service radius (miles)"
              onChange={(e) => set('service_radius_miles', e.target.value === '' ? null : Number(e.target.value))}
              sx={{ fontSize: '0.875rem' }}
            >
              <MenuItem value="">—</MenuItem>
              {RADIUS_OPTIONS.map((m) => (
                <MenuItem key={m} value={m}>{m} mi</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">Area covered from this address (map rings)</Typography>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Notes"
            multiline
            rows={2}
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            sx={{ '& textarea': { fontSize: '0.875rem' } }}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Techs at this company</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Name</TableCell>
              <TableCell>Tech #</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Radius (mi)</TableCell>
              <TableCell width={60} />
            </TableRow>
          </TableHead>
          <TableBody>
            {techs.map((t, i) => (
              <TableRow key={i}>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Tech name"
                    value={t.name}
                    onChange={(e) => setTech(i, 'name', e.target.value)}
                    sx={{ '& input': { fontSize: '0.8rem' } }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="—"
                    value={t.tech_number}
                    onChange={(e) => setTech(i, 'tech_number', e.target.value)}
                    sx={{ '& input': { fontSize: '0.8rem' } }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Phone"
                    value={t.phone}
                    onChange={(e) => setTech(i, 'phone', e.target.value)}
                    sx={{ '& input': { fontSize: '0.8rem' } }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Email"
                    value={t.email}
                    onChange={(e) => setTech(i, 'email', e.target.value)}
                    sx={{ '& input': { fontSize: '0.8rem' } }}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={t.service_radius_miles ?? ''}
                    onChange={(e) => setTech(i, 'service_radius_miles', e.target.value === '' ? '' : Number(e.target.value))}
                    displayEmpty
                    sx={{ minWidth: 72, fontSize: '0.8rem' }}
                  >
                    <MenuItem value="">—</MenuItem>
                    {RADIUS_OPTIONS.map((m) => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => removeTech(i)} disabled={techs.length <= 1} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button size="small" startIcon={<Add />} onClick={addTech}>Add tech</Button>
    </Paper>
  );
}

export default CompactFieldTechCompanyForm;
