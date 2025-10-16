import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Stack, TextField, InputAdornment, Typography, Chip,
  Popover, FormControlLabel, Checkbox, Divider
} from '@mui/material';
import { Add, Visibility, Edit, Delete, Search, Refresh, ViewColumn } from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';

function CompactShipments() {
  const navigate = useNavigate();
  const api = useApi();
  const { error: showError } = useToast();
  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState('');
  const [columnAnchor, setColumnAnchor] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    shipment_id: true,
    item: true,
    site: true,
    tracking: true,
    status: true,
    date: true
  });

  const fetchShipments = async () => {
    try {
      const response = await api.get('/shipments/');
      setShipments(response || []);
    } catch {
      showError('Failed to load');
    }
  };

  useEffect(() => {
    fetchShipments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const filtered = shipments.filter(s =>
    !search || s.shipment_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.tracking_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.what_is_being_shipped?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="h6" fontWeight="bold">Shipments ({filtered.length})</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ width: 200, '& input': { py: 0.5, fontSize: '0.875rem' } }} />
          <IconButton size="small" onClick={(e) => setColumnAnchor(e.currentTarget)} title="Show/Hide Columns">
            <ViewColumn fontSize="small" />
          </IconButton>
          <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/shipments/new')}>New</Button>
          <IconButton size="small" onClick={fetchShipments}><Refresh fontSize="small" /></IconButton>
        </Stack>
      </Stack>

      <Paper sx={{ flex: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', fontWeight: 'bold', borderBottom: 2, borderColor: '#f57c00' } }}>
                {visibleColumns.shipment_id && <TableCell>ID</TableCell>}
                {visibleColumns.item && <TableCell>Item</TableCell>}
                {visibleColumns.site && <TableCell>Site</TableCell>}
                {visibleColumns.tracking && <TableCell>Tracking</TableCell>}
                {visibleColumns.status && <TableCell>Status</TableCell>}
                {visibleColumns.date && <TableCell>Date</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.shipment_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/shipments/${s.shipment_id}/edit`)}>
                  {visibleColumns.shipment_id && <TableCell><Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>{s.shipment_id}</Typography></TableCell>}
                  {visibleColumns.item && <TableCell><Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{s.what_is_being_shipped}</Typography></TableCell>}
                  {visibleColumns.site && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.site_id}</Typography></TableCell>}
                  {visibleColumns.tracking && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.tracking_number || '-'}</Typography></TableCell>}
                  {visibleColumns.status && <TableCell><Chip label={s.status} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }} /></TableCell>}
                  {visibleColumns.date && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.date_created ? new Date(s.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</Typography></TableCell>}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton size="small" sx={{ p: 0.3 }} title="View" onClick={() => navigate(`/shipments/${s.shipment_id}/edit`)}>
                        <Visibility sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" sx={{ p: 0.3 }} title="Edit" onClick={() => navigate(`/shipments/${s.shipment_id}/edit`)}>
                        <Edit sx={{ fontSize: 16 }} />
                      </IconButton>
                      <Button size="small" color="error" variant="outlined" onClick={async () => {
                        if (!window.confirm(`Delete shipment ${s.shipment_id}?`)) return;
                        try {
                          await api.delete(`/shipments/${s.shipment_id}`);
                          setShipments(prev => prev.filter(x => x.shipment_id !== s.shipment_id));
                        } catch {
                          showError('Failed to delete shipment');
                        }
                      }}>Delete</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Popover open={Boolean(columnAnchor)} anchorEl={columnAnchor} onClose={() => setColumnAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { maxHeight: 500, overflow: 'auto' } }}>
        <Box sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>Show/Hide Columns</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.5}>
            <FormControlLabel control={<Checkbox checked={visibleColumns.shipment_id} onChange={() => toggleColumn('shipment_id')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Shipment ID</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.item} onChange={() => toggleColumn('item')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Item</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.site} onChange={() => toggleColumn('site')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Site</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.tracking} onChange={() => toggleColumn('tracking')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Tracking</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.status} onChange={() => toggleColumn('status')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Status</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.date} onChange={() => toggleColumn('date')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Date</Typography>} />
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}

export default CompactShipments;
