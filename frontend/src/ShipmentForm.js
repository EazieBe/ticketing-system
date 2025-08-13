import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Box, Typography, Alert,
  CircularProgress, Grid, Chip, IconButton, Tooltip
} from '@mui/material';
import {
  LocalShipping, Schedule, CheckCircle, Cancel, Warning, Build, Inventory,
  Flag, FlagOutlined, Star, StarBorder, Notifications, NotificationsOff
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import dayjs from 'dayjs';

function ShipmentForm({ initialValues, onSubmit, isEdit = false }) {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [values, setValues] = useState({
    site_id: '',
    tracking_number: '',
    carrier: '',
    status: 'pending',
    estimated_delivery: '',
    actual_delivery: '',
    notes: '',
    ...initialValues
  });
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingSites, setLoadingSites] = useState(false);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await api.get('/sites/');
      setSites(response || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setSites([]);
    }
  };

  const handleChange = e => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    setError('');

    // Validation
    if (!values.site_id) {
      setError('Site ID is required');
      return;
    }

    if (!values.what_is_being_shipped.trim()) {
      setError('What is being shipped is required');
      return;
    }

    // Validate numeric fields
    if (values.charges_out && isNaN(parseFloat(values.charges_out))) {
      setError('Charges Out must be a valid number');
      return;
    }

    if (values.charges_in && isNaN(parseFloat(values.charges_in))) {
      setError('Charges In must be a valid number');
      return;
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
      tracking_number: values.tracking_number.trim() || null,
      return_tracking: values.return_tracking.trim() || null,
      date_shipped: values.date_shipped || null,
      date_returned: values.date_returned || null,
      notes: values.notes.trim() || null,
    };

    onSubmit(cleanedValues);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <FormControl fullWidth margin="normal" required>
        <InputLabel>Site *</InputLabel>
        <Select
          name="site_id"
          value={values.site_id}
          label="Site *"
          onChange={handleChange}
          disabled={loadingSites}
        >
          <MenuItem value="">
            <em>
              {loadingSites ? 'Loading sites...' : 'Select a site'}
            </em>
          </MenuItem>
          {sites.map((site) => (
            <MenuItem key={site.site_id} value={site.site_id}>
              {site.site_id} - {site.location}
            </MenuItem>
          ))}
        </Select>
        {loadingSites && <CircularProgress size={20} sx={{ ml: 1 }} />}
      </FormControl>

      <TextField
        name="ticket_id"
        label="Ticket ID"
        value={values.ticket_id}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Associated ticket ID (optional)"
      />

      <TextField
        name="item_id"
        label="Item ID"
        value={values.item_id}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Associated inventory item ID (optional)"
      />

      <TextField
        name="what_is_being_shipped"
        label="What is Being Shipped *"
        value={values.what_is_being_shipped}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        helperText="Description of what is being shipped"
      />

      <TextField
        name="shipping_preference"
        label="Shipping Preference"
        value={values.shipping_preference}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Shipping method preference"
      />

      <TextField
        name="charges_out"
        label="Charges Out"
        value={values.charges_out}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Outgoing charges"
      />

      <TextField
        name="charges_in"
        label="Charges In"
        value={values.charges_in}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Incoming charges"
      />

      <TextField
        name="tracking_number"
        label="Tracking Number"
        value={values.tracking_number}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Outgoing tracking number"
      />

      <TextField
        name="return_tracking"
        label="Return Tracking"
        value={values.return_tracking}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Return tracking number"
      />

      <TextField
        name="date_shipped"
        label="Date Shipped"
        type="date"
        value={values.date_shipped}
        onChange={handleChange}
        fullWidth
        margin="normal"
        InputLabelProps={{ shrink: true }}
        helperText="Date item was shipped"
      />

      <TextField
        name="date_returned"
        label="Date Returned"
        type="date"
        value={values.date_returned}
        onChange={handleChange}
        fullWidth
        margin="normal"
        InputLabelProps={{ shrink: true }}
        helperText="Date item was returned"
      />

      <TextField
        name="notes"
        label="Notes"
        value={values.notes}
        onChange={handleChange}
        fullWidth
        margin="normal"
        multiline
        minRows={3}
        helperText="Additional notes about the shipment"
      />

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button type="submit" variant="contained" color="primary">
          {isEdit ? 'Save Changes' : 'Save Shipment'}
        </Button>
      </Box>
    </Box>
  );
}

export default ShipmentForm; 