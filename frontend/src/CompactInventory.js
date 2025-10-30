import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Stack, TextField, InputAdornment, Typography, Chip,
  Popover, FormControlLabel, Checkbox, Divider
} from '@mui/material';
import { Add, Visibility, Edit, Search, Refresh, ViewColumn, Delete } from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import { useAuth } from './AuthContext';
import { canDelete } from './utils/permissions';

function CompactInventory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const { error: showError } = useToast();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [columnAnchor, setColumnAnchor] = useState(null);
  const apiRef = React.useRef(api);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    sku: true,
    barcode: true,
    quantity: true,
    cost: true,
    location: true
  });

  // Keep API ref current
  React.useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const fetchItems = async () => {
    try {
      const response = await apiRef.current.get('/inventory/');
      setItems(response || []);
    } catch {
      showError('Failed');
    }
  };

  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const handleDelete = async (itemId, itemName) => {
    if (!window.confirm(`Delete inventory item "${itemName}"? This action cannot be undone.`)) return;
    
    try {
      await apiRef.current.delete(`/inventory/${itemId}`);
      setItems(prev => prev.filter(item => item.item_id !== itemId));
    } catch (error) {
      showError('Failed to delete inventory item');
    }
  };

  const filtered = items.filter(i =>
    !search || i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.sku?.toLowerCase().includes(search.toLowerCase()) ||
    i.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="h6" fontWeight="bold">Inventory ({filtered.length})</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ width: 200, '& input': { py: 0.5, fontSize: '0.875rem' } }} />
          <IconButton size="small" onClick={(e) => setColumnAnchor(e.currentTarget)} title="Show/Hide Columns">
            <ViewColumn fontSize="small" />
          </IconButton>
          <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/inventory/new')}>New</Button>
          <IconButton size="small" onClick={fetchItems}><Refresh fontSize="small" /></IconButton>
        </Stack>
      </Stack>

      <Paper sx={{ flex: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', fontWeight: 'bold', borderBottom: 2, borderColor: '#7b1fa2' } }}>
                {visibleColumns.name && <TableCell>Name</TableCell>}
                {visibleColumns.sku && <TableCell>SKU</TableCell>}
                {visibleColumns.barcode && <TableCell>Barcode</TableCell>}
                {visibleColumns.quantity && <TableCell>Qty</TableCell>}
                {visibleColumns.cost && <TableCell>Cost</TableCell>}
                {visibleColumns.location && <TableCell>Location</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.item_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/inventory/${i.item_id}/edit`)}>
                  {visibleColumns.name && <TableCell><Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{i.name}</Typography></TableCell>}
                  {visibleColumns.sku && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{i.sku}</Typography></TableCell>}
                  {visibleColumns.barcode && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{i.barcode}</Typography></TableCell>}
                  {visibleColumns.quantity && <TableCell><Chip label={i.quantity_on_hand} size="small" color={i.quantity_on_hand < 10 ? 'error' : 'default'} sx={{ height: 18, fontSize: '0.65rem' }} /></TableCell>}
                  {visibleColumns.cost && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>${i.cost}</Typography></TableCell>}
                  {visibleColumns.location && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{i.location}</Typography></TableCell>}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" sx={{ p: 0.3 }}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" sx={{ p: 0.3 }} onClick={() => navigate(`/inventory/${i.item_id}/edit`)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                      {canDelete(user) && (
                        <IconButton size="small" sx={{ p: 0.3 }} onClick={() => handleDelete(i.item_id, i.name)} color="error"><Delete sx={{ fontSize: 16 }} /></IconButton>
                      )}
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
            <FormControlLabel control={<Checkbox checked={visibleColumns.name} onChange={() => toggleColumn('name')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Name</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.sku} onChange={() => toggleColumn('sku')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>SKU</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.barcode} onChange={() => toggleColumn('barcode')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Barcode</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.quantity} onChange={() => toggleColumn('quantity')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Quantity</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.cost} onChange={() => toggleColumn('cost')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Cost</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.location} onChange={() => toggleColumn('location')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Location</Typography>} />
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}

export default CompactInventory;
