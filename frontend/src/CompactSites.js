import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Stack, TextField, InputAdornment, Typography, Popover,
  FormControlLabel, Checkbox, Divider
} from '@mui/material';
import { Add, Visibility, Edit, Delete, Search, Refresh, ViewColumn, UploadFile, Download } from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';

function CompactSites() {
  const navigate = useNavigate();
  const api = useApi();
  const { success, error: showError } = useToast();
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState('');
  const [columnAnchor, setColumnAnchor] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    site_id: true,
    ip_address: true,
    location: true,
    city_state: true,
    brand: true,
    phone: true,
    region: true
  });

  const fetchSites = async () => {
    try {
      const response = await api.get('/sites/');
      setSites(response || []);
    } catch {
      showError('Failed to load sites');
    }
  };

  useEffect(() => {
    fetchSites();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const filtered = sites.filter(s =>
    !search || s.site_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase()) ||
    s.ip_address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="h6" fontWeight="bold">Sites ({filtered.length})</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ width: 200, '& input': { py: 0.5, fontSize: '0.875rem' } }} />
          <IconButton size="small" onClick={(e) => setColumnAnchor(e.currentTarget)} title="Show/Hide Columns">
            <ViewColumn fontSize="small" />
          </IconButton>
          <IconButton size="small" title="Export CSV" onClick={() => {
            const headers = ['site_id','ip_address','location','city','state','zip','brand','region'];
            const rows = sites.map(s => headers.map(h => (s[h] ?? '')).join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'sites.csv'; a.click(); URL.revokeObjectURL(url);
          }}>
            <Download fontSize="small" />
          </IconButton>
          <IconButton size="small" component="label" title="Import CSV">
            <UploadFile fontSize="small" />
            <input type="file" accept=".csv" hidden onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const text = await file.text();
              const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
              const headers = headerLine.split(',');
              let imported = 0;
              for (const line of lines) {
                const cols = line.split(',');
                const record = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
                try { await api.post('/sites/', record); imported++; } catch {}
              }
              await fetchSites();
              if (imported === 0) showError('No records imported');
            }} />
          </IconButton>
          <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/sites/new')}>New Site</Button>
          <IconButton size="small" onClick={fetchSites}><Refresh fontSize="small" /></IconButton>
        </Stack>
      </Stack>

      <Paper sx={{ flex: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', fontWeight: 'bold', borderBottom: 2, borderColor: '#2e7d32' } }}>
                {visibleColumns.site_id && <TableCell>Site ID</TableCell>}
                {visibleColumns.ip_address && <TableCell>IP Address</TableCell>}
                {visibleColumns.location && <TableCell>Location</TableCell>}
                {visibleColumns.city_state && <TableCell>City, State</TableCell>}
                {visibleColumns.brand && <TableCell>Brand</TableCell>}
                {visibleColumns.phone && <TableCell>Phone</TableCell>}
                {visibleColumns.region && <TableCell>Region</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.site_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/sites/${s.site_id}`)}>
                  {visibleColumns.site_id && (
                    <TableCell><Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>{s.site_id}</Typography></TableCell>
                  )}
                  {visibleColumns.ip_address && (
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>{s.ip_address || 'N/A'}</Typography></TableCell>
                  )}
                  {visibleColumns.location && (
                    <TableCell><Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{s.location}</Typography></TableCell>
                  )}
                  {visibleColumns.city_state && (
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.city}, {s.state}</Typography></TableCell>
                  )}
                  {visibleColumns.brand && (
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.brand}</Typography></TableCell>
                  )}
                  {visibleColumns.phone && (
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.main_number}</Typography></TableCell>
                  )}
                  {visibleColumns.region && (
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.region}</Typography></TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" sx={{ p: 0.3 }} onClick={() => navigate(`/sites/${s.site_id}`)}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" sx={{ p: 0.3 }} onClick={() => navigate(`/sites/${s.site_id}/edit`)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" sx={{ p: 0.3 }} onClick={async () => {
                        if (!window.confirm(`Delete site ${s.site_id}? This will remove related tickets and shipments.`)) return;
                        try {
                          await api.delete(`/sites/${s.site_id}`);
                          setSites(prev => prev.filter(x => x.site_id !== s.site_id));
                        } catch {
                          showError('Failed to delete site');
                        }
                      }}><Delete sx={{ fontSize: 16 }} color="error" /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Column Visibility Popover */}
      <Popover
        open={Boolean(columnAnchor)}
        anchorEl={columnAnchor}
        onClose={() => setColumnAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            maxHeight: 500,
            overflow: 'auto'
          }
        }}
      >
        <Box sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>Show/Hide Columns</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.5}>
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.site_id} onChange={() => toggleColumn('site_id')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Site ID</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.ip_address} onChange={() => toggleColumn('ip_address')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>IP Address</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.location} onChange={() => toggleColumn('location')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Location</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.city_state} onChange={() => toggleColumn('city_state')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>City, State</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.brand} onChange={() => toggleColumn('brand')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Brand</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.phone} onChange={() => toggleColumn('phone')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Phone</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.region} onChange={() => toggleColumn('region')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Region</Typography>}
            />
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}

export default CompactSites;


