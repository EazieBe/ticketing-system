import React, { useState, useEffect, useCallback } from 'react';
import { Paper, Grid, TextField, Button, FormControl, InputLabel, Select, MenuItem, Typography, Stack, Autocomplete, Switch, FormControlLabel, Box, IconButton, Divider } from '@mui/material';
import { Save, Cancel, Add, Delete } from '@mui/icons-material';
import useApi from './hooks/useApi';
import useThemeTokens from './hooks/useThemeTokens';

function CompactShipmentForm({ onSubmit, initialValues, isEdit, showHeader = true }) {
  const api = useApi();
  const { border } = useThemeTokens();
  const [values, setValues] = useState({
    site_id: '', ticket_id: '', item_id: '', what_is_being_shipped: '', shipping_preference: '',
    charges_out: '', charges_in: '', tracking_number: '', return_tracking: '', date_shipped: '',
    date_returned: '', notes: '', source_ticket_type: '', shipping_priority: 'normal',
    parts_cost: 0, total_cost: 0, status: 'pending', remove_from_inventory: true, quantity: 1,
    ...initialValues
  });

  const [inventory, setInventory] = useState([]);
  const [sites, setSites] = useState([]);
  const [siteInput, setSiteInput] = useState('');
  const [isSiteSelected, setIsSiteSelected] = useState(false);
  const [siteLoading, setSiteLoading] = useState(false);
  const lastQueryRef = React.useRef('');
  const apiRef = React.useRef(api);
  const [siteOpen, setSiteOpen] = useState(false);
  
  // Multiple items support
  const [items, setItems] = useState([
    {
      id: 1,
      item_id: '',
      quantity: 1,
      what_is_being_shipped: '',
      remove_from_inventory: true,
      notes: '',
      selectedInventoryItem: null
    }
  ]);

  // Update form values when initialValues change (for editing) - separate from sites dependency
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      console.log('Setting initialValues:', initialValues);
      setValues(prev => ({ ...prev, ...initialValues }));
      
      // Handle existing shipment items for editing
      if (initialValues.shipment_items && Array.isArray(initialValues.shipment_items)) {
        console.log('Setting existing items:', initialValues.shipment_items);
        const existingItems = initialValues.shipment_items.map((item, index) => ({
          id: index + 1,
          item_id: item.item_id || '',
          quantity: item.quantity || 1,
          what_is_being_shipped: item.what_is_being_shipped || '',
          remove_from_inventory: item.remove_from_inventory !== false,
          notes: item.notes || '',
          selectedInventoryItem: null // Will be set when inventory loads
        }));
        console.log('Mapped existing items:', existingItems);
        setItems(existingItems);
      }
    }
  }, [initialValues]);

  // Handle site input separately to avoid resetting form data
  useEffect(() => {
    if (initialValues?.site_id) {
      // If we have the site in our sites array, use it
      const existingSite = sites.find(s => s.site_id === initialValues.site_id);
      if (existingSite) {
        setSiteInput(`${existingSite.site_id} - ${existingSite.location || ''}`);
        setIsSiteSelected(true);
      } else {
        // Otherwise, fetch the site details
        apiRef.current.get(`/sites/${initialValues.site_id}`).then((s) => {
          if (s) {
            setSites(prev => prev.find(p => p.site_id === s.site_id) ? prev : [s, ...prev]);
            setSiteInput(`${s.site_id} - ${s.location || ''}`);
            setIsSiteSelected(true);
          }
        }).catch(() => {
          // If fetch fails, just show the site_id
          setSiteInput(initialValues.site_id);
          setIsSiteSelected(false);
        });
      }
    }
  }, [initialValues?.site_id, sites]);

  // Keep API ref current
  React.useEffect(() => {
    apiRef.current = api;
  }, [api]);


  const load = async () => {
    try {
      const [i] = await Promise.all([apiRef.current.get('/inventory/')]);
      console.log('Loaded inventory items:', i);
      setInventory(i || []);
    } catch (e) {
      console.error('Error loading inventory:', e);
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set selectedInventoryItem for existing items when inventory loads
  useEffect(() => {
    if (inventory.length > 0 && items.some(item => item.item_id && !item.selectedInventoryItem)) {
      console.log('Setting selectedInventoryItem for items:', items);
      setItems(prev => prev.map(item => {
        if (item.item_id && !item.selectedInventoryItem) {
          const inventoryItem = inventory.find(inv => inv.item_id === item.item_id);
          console.log(`Found inventory item for ${item.item_id}:`, inventoryItem);
          return { ...item, selectedInventoryItem: inventoryItem || null };
        }
        return item;
      }));
    }
  }, [inventory, items]); // Add items dependency back to ensure it runs when items change


  // Debounced site search as user types
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = siteInput?.trim();
      if (!q || q.length < 1) return;
      
      // Don't search if a site is selected and input contains " - "
      if (isSiteSelected && q.includes(' - ')) return;
      
      setSiteLoading(true);
      lastQueryRef.current = q;
      setSiteOpen(true);
      try {
        if (/^\d{4}$/.test(q)) {
          try {
            const exact = await apiRef.current.get(`/sites/${encodeURIComponent(q)}`);
            if (lastQueryRef.current === q && exact) {
              var exactResult = exact;
            }
          } catch {}
        }
        const isNumeric = /^\d+$/.test(q);
        const limit = q.length >= 3 ? (isNumeric ? 500 : 200) : 50;
        const res = await apiRef.current.get(`/sites/lookup?prefix=${encodeURIComponent(q)}&limit=${limit}`);
        let options = Array.isArray(res) ? res : [];
        if (options.length < Math.min(limit, 10)) {
          const broad = await apiRef.current.get(`/sites/?search=${encodeURIComponent(q)}&limit=${limit}`);
          if (Array.isArray(broad)) {
            const seen = new Set(options.map(o => o.site_id));
            options = options.concat(broad.filter(b => !seen.has(b.site_id)));
          }
        }
        if (typeof exactResult === 'object' && exactResult?.site_id) {
          const seen = new Set();
          const merged = [exactResult, ...options].filter(o => {
            const id = o?.site_id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          options = merged;
        }
        if (lastQueryRef.current === q) {
          setSites(options);
        }
      } catch {}
      setSiteLoading(false);
    }, 150);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteInput, isSiteSelected]);

  const c = (field, value) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Form field update: ${field} = ${value}`);
    }
    setValues(prev => ({ ...prev, [field]: value }));
  };

  // Item management functions
  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    setItems(prev => [...prev, {
      id: newId,
      item_id: '',
      quantity: 1,
      what_is_being_shipped: '',
      remove_from_inventory: true,
      notes: '',
      selectedInventoryItem: null
    }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleItemInventoryChange = (id, selectedItem) => {
    updateItem(id, 'selectedInventoryItem', selectedItem);
    updateItem(id, 'item_id', selectedItem?.item_id || '');
    updateItem(id, 'what_is_being_shipped', selectedItem?.name || '');
  };

  // Validation function
  const isFormValid = () => {
    return values.site_id && 
           items.length > 0 && 
           items.every(item => item.item_id && item.what_is_being_shipped);
  };

  // Form submission handler
  const handleSubmit = () => {
    // Create a summary description for the shipment based on items
    const itemDescriptions = items
      .filter(item => item.what_is_being_shipped)
      .map(item => `${item.quantity}x ${item.what_is_being_shipped}`)
      .join(', ');
    
    // Clean the data before submission
    const cleanedValues = {
      ...values,
      // Convert empty strings to null for optional fields
      ticket_id: values.ticket_id && values.ticket_id.trim() !== '' ? values.ticket_id : null,
      // Convert empty strings to null for optional numeric fields
      charges_out: values.charges_out && values.charges_out.trim() !== '' ? parseFloat(values.charges_out) : null,
      charges_in: values.charges_in && values.charges_in.trim() !== '' ? parseFloat(values.charges_in) : null,
      parts_cost: values.parts_cost && values.parts_cost.trim() !== '' ? parseFloat(values.parts_cost) : null,
      total_cost: values.total_cost && values.total_cost.trim() !== '' ? parseFloat(values.total_cost) : null,
      // Convert empty strings to null for optional date fields
      date_shipped: values.date_shipped && values.date_shipped.trim() !== '' ? values.date_shipped : null,
      date_returned: values.date_returned && values.date_returned.trim() !== '' ? values.date_returned : null,
      // Ensure required fields are set
      what_is_being_shipped: itemDescriptions || 'Multiple items'
    };
    
    const submissionData = {
      ...cleanedValues,
      items: items.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity,
        what_is_being_shipped: item.what_is_being_shipped,
        remove_from_inventory: item.remove_from_inventory,
        notes: item.notes
      }))
    };
    onSubmit(submissionData);
  };

  return (
    <Paper sx={{ p: 2, maxWidth: 1000 }}>
      {showHeader && (
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{isEdit ? 'Edit' : 'New'} Shipment</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => window.location.href = '/shipments'}>Cancel</Button>
            <Button size="small" variant="contained" startIcon={<Save />} onClick={handleSubmit} disabled={!isFormValid()}>Save</Button>
          </Stack>
        </Stack>
      )}

      <Grid container spacing={1.5}>
        <Grid item xs={6} md={4}>
          <Autocomplete
            key={values.site_id}
            size="small"
            freeSolo
            inputValue={siteInput}
            open={siteOpen}
            onOpen={() => {
              setSiteOpen(Boolean(siteInput?.trim()) || sites.length > 0);
            }}
            onClose={() => setSiteOpen(false)}
            selectOnFocus
            clearOnBlur={false}
            options={sites}
            getOptionLabel={(o) => (o && typeof o === 'object') ? `${o.site_id} - ${o.location || ''}` : String(o || '')}
            isOptionEqualToValue={(o, v) => (o?.site_id || o) === (v?.site_id || v)}
            value={sites.find(s => s.site_id === values.site_id) || null}
            onChange={(e, v) => {
              if (v && typeof v === 'object') {
                setIsSiteSelected(true);
                c('site_id', v.site_id || '');
                setSiteInput(`${v.site_id} - ${v.location || ''}`);
                setSiteOpen(false);
              } else if (typeof v === 'string' && /^\d{4}$/.test(v) && !sites.find(s => s.site_id === v)) {
                // Only fetch if it's a 4-digit string AND not already in our sites array
                setIsSiteSelected(false);
                c('site_id', v);
                apiRef.current.get(`/sites/${encodeURIComponent(v)}`).then((s) => {
                  if (s) {
                    setSites((prev) => (prev.find(p => p.site_id === s.site_id) ? prev : [s, ...prev]));
                    setSiteInput(`${s.site_id} - ${s.location || ''}`);
                    setIsSiteSelected(true);
                    setSiteOpen(false);
                  }
                }).catch(() => {});
              } else if (v == null) {
                setIsSiteSelected(false);
                c('site_id', '');
              }
            }}
            onInputChange={(e, input) => {
              setSiteInput(input);
              setIsSiteSelected(false);
              setSiteOpen(Boolean(input?.trim()));
            }}
            includeInputInList
            autoHighlight
            filterOptions={(options, state) => {
              const q = (state.inputValue || '').toLowerCase().trim();
              if (!q) return options;
              const isDigits = /^\d+$/.test(q);
              const starts = [];
              const rest = [];
              for (const o of options) {
                const id = String(o?.site_id || '').toLowerCase();
                const loc = String(o?.location || '').toLowerCase();
                const hay = isDigits ? id : `${id} ${loc}`;
                if (!hay.includes(q)) continue;
                (id.startsWith(q) ? starts : rest).push(o);
              }
              return [...starts, ...rest].slice(0, 200);
            }}
            loading={siteLoading}
            loadingText="Searching sites..."
            noOptionsText={(siteInput && siteInput.length >= 1) ? 'No matches' : 'Type to search sites'}
            renderInput={(p) => (
              <TextField {...p} label="Site *" required placeholder="Type site ID or location"
                sx={{ '& input': { fontSize: '0.875rem' } }} />
            )}
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <TextField fullWidth size="small" label="Ticket ID" value={values.ticket_id} onChange={(e) => c('ticket_id', e.target.value)} sx={{ '& input': { fontSize: '0.875rem' } }} />
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Items to Ship</Typography>
          {items.map((item, index) => (
            <Box key={item.id} sx={{ mb: 2, p: 2, border, borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2">Item {index + 1}</Typography>
                {items.length > 1 && (
                  <IconButton size="small" onClick={() => removeItem(item.id)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </Stack>
              
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    key={`inventory-${item.id}-${item.item_id}`}
                    size="small"
                    options={inventory}
                    getOptionLabel={(option) => option ? `${option.item_id} - ${option.name}` : ''}
                    value={item.selectedInventoryItem || inventory.find(inv => inv.item_id === item.item_id) || null}
                    onChange={(e, value) => handleItemInventoryChange(item.id, value)}
                    renderInput={(params) => (
                      <TextField {...params} label="Inventory Item *" required />
                    )}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Quantity"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value || '1', 10)))}
                  />
                </Grid>
                <Grid item xs={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="What's Being Shipped *"
                    required
                    value={item.what_is_being_shipped}
                    onChange={(e) => updateItem(item.id, 'what_is_being_shipped', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Notes"
                    value={item.notes}
                    onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={item.remove_from_inventory}
                        onChange={(e) => updateItem(item.id, 'remove_from_inventory', e.target.checked)}
                      />
                    }
                    label="Remove from Inventory"
                  />
                </Grid>
              </Grid>
            </Box>
          ))}
          
          <Button
            startIcon={<Add />}
            onClick={addItem}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          >
            Add Item
          </Button>
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
        
        <Grid item xs={12}>
          <TextField fullWidth size="small" label="Notes" multiline rows={2} value={values.notes}
            onChange={(e) => c('notes', e.target.value)} sx={{ '& textarea': { fontSize: '0.875rem' } }} />
        </Grid>
      </Grid>
      
      {!showHeader && (
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={handleSubmit} disabled={!isFormValid()}>Save</Button>
        </Stack>
      )}
    </Paper>
  );
}

export default CompactShipmentForm;

