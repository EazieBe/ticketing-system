import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Stack, TextField, InputAdornment, Typography,
  Popover, FormControlLabel, Checkbox, Divider, CircularProgress
} from '@mui/material';
import { Add, Visibility, Edit, Delete, Search, Refresh, ViewColumn } from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useThemeTokens from './hooks/useThemeTokens';
import { getApiPath } from './apiPaths';

function CompactFieldTechs() {
  const navigate = useNavigate();
  const api = useApi();
  const { tableHeaderBg, rowHoverBg } = useThemeTokens();
  const { error: showError, success } = useToast();
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [columnAnchor, setColumnAnchor] = useState(null);
  const apiRef = React.useRef(api);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    phone: true,
    email: true,
    region: true,
    city: true
  });

  React.useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const fetchTechs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRef.current.get(`${getApiPath('fieldtechs')}/`);
      setTechs(response || []);
    } catch (err) {
      showError(err?.response?.data?.detail || err?.message || 'Failed to load field techs');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchTechs();
  }, [fetchTechs]);

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const filtered = techs.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (e, t) => {
    e.stopPropagation();
    if (!window.confirm(`Delete field tech "${t.name}"?`)) return;
    try {
      await api.delete(`${getApiPath('fieldtechs')}/${t.field_tech_id}`);
      success('Field tech deleted');
      fetchTechs();
    } catch (err) {
      showError(err?.response?.data?.detail || err?.message || 'Failed to delete');
    }
  };

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '0.95rem' }}>Field Techs ({filtered.length})</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ width: 200, '& input': { py: 0.5, fontSize: '0.875rem' } }} />
          <IconButton size="small" onClick={(e) => setColumnAnchor(e.currentTarget)} title="Show/Hide Columns">
            <ViewColumn fontSize="small" />
          </IconButton>
          <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/fieldtechs/new')}>New</Button>
          <IconButton size="small" onClick={fetchTechs}><Refresh fontSize="small" /></IconButton>
        </Stack>
      </Stack>

      <Paper sx={{ flex: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: tableHeaderBg, fontWeight: 'bold', borderBottom: 2, borderColor: 'primary.main' } }}>
                {visibleColumns.name && <TableCell>Name</TableCell>}
                {visibleColumns.phone && <TableCell>Phone</TableCell>}
                {visibleColumns.email && <TableCell>Email</TableCell>}
                {visibleColumns.region && <TableCell>Region</TableCell>}
                {visibleColumns.city && <TableCell>City</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {techs.length === 0 ? 'No field techs yet.' : 'No results match your search.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow
                    key={t.field_tech_id}
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: rowHoverBg } }}
                    onClick={() => navigate(`/fieldtechs/${t.field_tech_id}/edit`)}
                  >
                    {visibleColumns.name && <TableCell><Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{t.name}</Typography></TableCell>}
                    {visibleColumns.phone && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{t.phone || '—'}</Typography></TableCell>}
                    {visibleColumns.email && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{t.email || '—'}</Typography></TableCell>}
                    {visibleColumns.region && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{t.region || '—'}</Typography></TableCell>}
                    {visibleColumns.city && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{[t.city, t.state].filter(Boolean).join(', ') || '—'}</Typography></TableCell>}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" sx={{ p: 0.3 }} title="View" onClick={() => navigate(`/fieldtechs/${t.field_tech_id}/edit`)}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                        <IconButton size="small" sx={{ p: 0.3 }} title="Edit" onClick={() => navigate(`/fieldtechs/${t.field_tech_id}/edit`)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                        <IconButton size="small" sx={{ p: 0.3 }} title="Delete" color="error" onClick={(e) => handleDelete(e, t)}><Delete sx={{ fontSize: 16 }} /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Popover open={Boolean(columnAnchor)} anchorEl={columnAnchor} onClose={() => setColumnAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { maxHeight: 500, overflow: 'auto' } }}>
        <Box sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>Show/Hide Columns</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.5}>
            <FormControlLabel control={<Checkbox checked={visibleColumns.name} onChange={() => toggleColumn('name')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Name</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.phone} onChange={() => toggleColumn('phone')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Phone</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.email} onChange={() => toggleColumn('email')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Email</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.region} onChange={() => toggleColumn('region')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Region</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.city} onChange={() => toggleColumn('city')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>City</Typography>} />
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}

export default CompactFieldTechs;
