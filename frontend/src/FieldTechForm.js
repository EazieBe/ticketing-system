import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Alert, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';

// U.S. Census Bureau Regional Divisions
const REGIONAL_DIVISIONS = {
  'Northeast': {
    'New England': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT'],
    'Mid-Atlantic': ['NJ', 'NY', 'PA']
  },
  'Midwest': {
    'East North Central': ['IL', 'IN', 'MI', 'OH', 'WI'],
    'West North Central': ['IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD']
  },
  'South': {
    'South Atlantic': ['DE', 'DC', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV'],
    'East South Central': ['AL', 'KY', 'MS', 'TN'],
    'West South Central': ['AR', 'LA', 'OK', 'TX']
  },
  'West': {
    'Mountain': ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY'],
    'Pacific': ['AK', 'CA', 'HI', 'OR', 'WA']
  }
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

function FieldTechForm({ initialValues, onSubmit, isEdit = false }) {
  const [values, setValues] = useState({
    name: '',
    phone: '',
    email: '',
    region: '',
    city: '',
    state: '',
    zip: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [loadingZip, setLoadingZip] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setValues({
        name: initialValues.name || '',
        phone: initialValues.phone || '',
        email: initialValues.email || '',
        region: initialValues.region || '',
        city: initialValues.city || '',
        state: initialValues.state || '',
        zip: initialValues.zip || '',
        notes: initialValues.notes || ''
      });
    }
  }, [initialValues]);

  const getRegionFromState = (stateCode) => {
    for (const [region, divisions] of Object.entries(REGIONAL_DIVISIONS)) {
      for (const [division, states] of Object.entries(divisions)) {
        if (states.includes(stateCode)) {
          return `${region} - ${division}`;
        }
      }
    }
    return '';
  };

  const fetchCityFromZip = async (zipCode) => {
    if (!zipCode || zipCode.length !== 5) return;
    
    setLoadingZip(true);
    try {
      // Using ZIP Code API to get city and state
      const response = await fetch(`https://api.zippopotam.us/US/${zipCode}`);
      if (response.ok) {
        const data = await response.json();
        const place = data.places[0];
        if (place) {
          const stateCode = place['state abbreviation'] || '';
          const region = getRegionFromState(stateCode);
          setValues(prev => ({
            ...prev,
            city: place['place name'] || '',
            state: stateCode,
            region: region
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching city from ZIP:', error);
      // Fallback to manual entry
    } finally {
      setLoadingZip(false);
    }
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');

    // Format as XXX-XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const handleChange = e => {
    const { name, value } = e.target;

    if (name === 'phone') {
      // Format phone number as user types
      const formatted = formatPhoneNumber(value);
      setValues({ ...values, [name]: formatted });
    } else if (name === 'zip') {
      // Auto-fill city and state when ZIP is entered
      setValues({ ...values, [name]: value });
      if (value.length === 5) {
        fetchCityFromZip(value);
      }
    } else if (name === 'state') {
      // Auto-fill region when state is manually changed
      const region = getRegionFromState(value);
      setValues({ ...values, [name]: value, region: region });
    } else {
      setValues({ ...values, [name]: value });
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    setError('');

    // Validation
    if (!values.name.trim()) {
      setError('Name is required');
      return;
    }

    if (values.email && !validateEmail(values.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (values.phone && !validatePhone(values.phone)) {
      setError('Please enter a valid phone number (XXX-XXX-XXXX)');
      return;
    }

    // Clean up values before submitting
    const cleanedValues = {
      ...values,
      name: values.name.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      region: values.region.trim() || null,
      city: values.city.trim() || null,
      state: values.state || null,
      zip: values.zip.trim() || null,
      notes: values.notes.trim() || null,
    };

    onSubmit(cleanedValues);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <TextField
        name="name"
        label="Name *"
        value={values.name}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        helperText="Enter the full name of the field tech"
      />

      <TextField
        name="phone"
        label="Phone"
        value={values.phone}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Format: XXX-XXX-XXXX (auto-formatted)"
        placeholder="555-123-4567"
      />

      <TextField
        name="email"
        label="Email"
        type="email"
        value={values.email}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Enter a valid email address"
      />

      <TextField
        name="zip"
        label="ZIP Code"
        value={values.zip}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="5-digit ZIP code (auto-fills city, state, and region)"
        placeholder="12345"
        inputProps={{ maxLength: 5 }}
      />

      <TextField
        name="city"
        label="City"
        value={values.city}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="City (auto-filled from ZIP code)"
        disabled={loadingZip}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>State</InputLabel>
        <Select
          name="state"
          value={values.state}
          label="State"
          onChange={handleChange}
          disabled={loadingZip}
        >
          <MenuItem value="">
            <em>Select a state</em>
          </MenuItem>
          {US_STATES.map((state) => (
            <MenuItem key={state} value={state}>
              {state}
            </MenuItem>
          ))}
        </Select>
        {loadingZip && <CircularProgress size={20} sx={{ ml: 1 }} />}
      </FormControl>

      <TextField
        name="region"
        label="Region"
        value={values.region}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="U.S. Census Bureau region (auto-filled from state)"
        disabled={loadingZip}
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
        helperText="Additional notes about the field tech"
      />

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button type="submit" variant="contained" color="primary">
          {isEdit ? 'Save Changes' : 'Save Field Tech'}
        </Button>
      </Box>
    </Box>
  );
}

export default FieldTechForm; 