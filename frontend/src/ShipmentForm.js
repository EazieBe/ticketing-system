


import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Box, Typography, Alert,
  CircularProgress, Grid, Chip, IconButton, Tooltip, FormControlLabel, Checkbox
} from '@mui/material';
import {
  LocalShipping, Schedule, CheckCircle, Cancel, Warning, Build, Inventory,
  Flag, FlagOutlined, Star, StarBorder, Notifications, NotificationsOff,
  OpenInNew
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';

function ShipmentForm({ initialValues, onSubmit, isEdit = false, onClose }) {
  const { user } = useAuth();
  const api = useApi();
  const { success, error: showError } = useToast();
  const [values, setValues] = useState({
    site_id: '',
    ticket_id: '',
    item_id: '',
    what_is_being_shipped: '',
    shipping_preference: '',
    charges_out: '',
    charges_in: '',
    tracking_number: '',
    return_tracking: '',
    notes: '',
    shipping_priority: 'normal',
    parts_cost: '',
    remove_from_inventory: false,
    ...initialValues
  });
  const [sites, setSites] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [suggestedItem, setSuggestedItem] = useState(null);

  useEffect(() => {
    fetchSites();
    fetchInventoryItems();
  }, []);

  useEffect(() => {
    // Update suggested inventory item when description changes
    if (!values.what_is_being_shipped) {
      setSuggestedItem(null);
      return;
    }
    
    const searchTerm = values.what_is_being_shipped.toLowerCase();
    const found = inventoryItems.find(item => 
      item.name.toLowerCase().includes(searchTerm) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm)) ||
      (item.description && item.description.toLowerCase().includes(searchTerm))
    );
    setSuggestedItem(found || null);
  }, [values.what_is_being_shipped, inventoryItems]);

  const fetchSites = async () => {
    try {
      setLoadingSites(true);
      const response = await api.get('/sites/');
      setSites(response || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      setLoadingInventory(true);
      const response = await api.get('/inventory/');
      setInventoryItems(response || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setInventoryItems([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    setError('');

    // Validation
    if (!values.site_id) {
      setError('Site is required');
      return;
    }

    if (!values.what_is_being_shipped.trim()) {
      setError('What is being shipped is required');
      return;
    }

    // Validate numeric fields
    const numericFields = ['charges_out', 'charges_in', 'parts_cost'];
    for (const field of numericFields) {
      if (values[field] && isNaN(parseFloat(values[field]))) {
        setError(`${field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a valid number`);
        return;
      }
    }

    // Clean up values before submitting
    const cleanedValues = {
      ...values,
      site_id: values.site_id,
      ticket_id: values.ticket_id.trim() || null,
      item_id: values.item_id.trim() || null,
      what_is_being_shipped: values.what_is_being_shipped.trim(),
      shipping_preference: values.shipping_preference.trim() || null,
      charges_out: values.charges_out ? parseFloat(values.charges_out) : null,
      charges_in: values.charges_in ? parseFloat(values.charges_in) : null,
      parts_cost: values.parts_cost ? parseFloat(values.parts_cost) : null,
      tracking_number: values.tracking_number.trim() || null,
      return_tracking: values.return_tracking.trim() || null,
      notes: values.notes.trim() || null,
      remove_from_inventory: values.remove_from_inventory,
      status: 'pending'
    };

    onSubmit(cleanedValues);
  };

  const openFedExTracking = (trackingNumber) => {
    if (trackingNumber) {
      window.open(`https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`, '_blank');
    }
  };

  const getSelectedSite = () => {
    return sites.find(site => site.site_id === values.site_id);
  };

  const getSelectedItem = () => {
    return inventoryItems.find(item => item.item_id === values.item_id);
  };

  if (loadingSites || loadingInventory) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={2}>
        {/* Site Selection */}
        <Grid item xs={12}>
          <Box>
            <FormControl fullWidth required error={!values.site_id}>
              <InputLabel>Site *</InputLabel>
              <Select
                name="site_id"
                value={values.site_id}
                onChange={handleChange}
                label="Site *"
              >
                {sites.map(site => (
                  <MenuItem key={site.site_id} value={site.site_id}>
                    {site.site_id} - {site.location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!values.site_id && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                Site selection is required - this shipment will be linked to the selected site
              </Typography>
            )}
            {getSelectedSite() && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  This shipment will be visible on the <strong>{getSelectedSite().site_id}</strong> site details page
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {getSelectedSite().location} | {getSelectedSite().city}, {getSelectedSite().state}
                </Typography>
              </Alert>
            )}
          </Box>
        </Grid>

        {/* What is being shipped */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="What is being shipped"
            name="what_is_being_shipped"
            value={values.what_is_being_shipped}
            onChange={handleChange}
            multiline
            rows={2}
            helperText="Describe what you are shipping (e.g., 'Avaya 9508 Phone', 'Network Cable', etc.)"
          />
          {suggestedItem && !values.item_id && (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                Suggested inventory item: <strong>{suggestedItem.name}</strong>
                <Button 
                  size="small" 
                  onClick={() => setValues(prev => ({ ...prev, item_id: suggestedItem.item_id }))}
                  sx={{ ml: 1 }}
                >
                  Link This Item
                </Button>
              </Typography>
            </Alert>
          )}
        </Grid>

        {/* Inventory Item Selection */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Link to Inventory Item (Optional)</InputLabel>
            <Select
              name="item_id"
              value={values.item_id}
              onChange={handleChange}
              label="Link to Inventory Item (Optional)"
            >
              <MenuItem value="">
                <em>None - Not in inventory</em>
              </MenuItem>
              {inventoryItems.map(item => (
                <MenuItem key={item.item_id} value={item.item_id}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      SKU: {item.sku || 'N/A'} | Qty: {item.quantity_on_hand} | Cost: ${item.cost}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Linking to an inventory item allows automatic quantity updates when shipped
          </Typography>
        </Grid>

        {/* Remove from inventory checkbox */}
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Checkbox
                name="remove_from_inventory"
                checked={values.remove_from_inventory}
                onChange={handleChange}
                disabled={!values.item_id}
              />
            }
            label="Remove from inventory when shipped"
          />
          {values.item_id && (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              This will reduce the quantity by 1 when shipment status is changed to "shipped"
            </Typography>
          )}
        </Grid>

        {/* Ticket ID */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Ticket ID (Optional)"
            name="ticket_id"
            value={values.ticket_id}
            onChange={handleChange}
          />
        </Grid>

        {/* Shipping Priority */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Shipping Priority</InputLabel>
            <Select
              name="shipping_priority"
              value={values.shipping_priority}
              onChange={handleChange}
              label="Shipping Priority"
            >
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Charges */}
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            step="0.01"
            label="Charges Out ($)"
            name="charges_out"
            value={values.charges_out}
            onChange={handleChange}
            InputProps={{
              startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>,
            }}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            step="0.01"
            label="Charges In ($)"
            name="charges_in"
            value={values.charges_in}
            onChange={handleChange}
            InputProps={{
              startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>,
            }}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            step="0.01"
            label="Parts Cost ($)"
            name="parts_cost"
            value={values.parts_cost}
            onChange={handleChange}
            InputProps={{
              startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>,
            }}
          />
        </Grid>

        {/* Tracking Numbers */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Outbound Tracking Number"
            name="tracking_number"
            value={values.tracking_number}
            onChange={handleChange}
            InputProps={{
              endAdornment: values.tracking_number && (
                <IconButton
                  size="small"
                  onClick={() => openFedExTracking(values.tracking_number)}
                  title="Track on FedEx"
                >
                  <OpenInNew fontSize="small" />
                </IconButton>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Return Tracking Number"
            name="return_tracking"
            value={values.return_tracking}
            onChange={handleChange}
            InputProps={{
              endAdornment: values.return_tracking && (
                <IconButton
                  size="small"
                  onClick={() => openFedExTracking(values.return_tracking)}
                  title="Track on FedEx"
                >
                  <OpenInNew fontSize="small" />
                </IconButton>
              ),
            }}
          />
        </Grid>

        {/* Shipping Preference */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Shipping Preference"
            name="shipping_preference"
            value={values.shipping_preference}
            onChange={handleChange}
            placeholder="e.g., Ground, Express, Overnight"
          />
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            name="notes"
            value={values.notes}
            onChange={handleChange}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={loading}>
          {isEdit ? 'Update' : 'Create'} Shipment
        </Button>
      </Box>
    </Box>
  );
}

export default ShipmentForm; 