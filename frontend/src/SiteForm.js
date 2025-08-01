import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Alert, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const STATE_NAMES_TO_CODES = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

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

function SiteForm({ initialValues, onSubmit, isEdit = false }) {
  const [values, setValues] = useState({
    site_id: '',
    ip_address: '',
    location: '',
    brand: '',
    main_number: '',
    mp: '',
    service_address: '',
    city: '',
    state: '',
    zip: '',
    region: '',
    notes: '',
    equipment_notes: '',
    phone_system: '',
    phone_types: '',
    network_equipment: '',
    additional_equipment: ''
  });
  const [error, setError] = useState('');
  const [loadingZip, setLoadingZip] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setValues({
        site_id: initialValues.site_id || '',
        ip_address: initialValues.ip_address || '',
        location: initialValues.location || '',
        brand: initialValues.brand || '',
        main_number: initialValues.main_number || '',
        mp: initialValues.mp || '',
        service_address: initialValues.service_address || '',
        city: initialValues.city || '',
        state: initialValues.state || '',
        zip: initialValues.zip || '',
        region: initialValues.region || '',
        notes: initialValues.notes || '',
        equipment_notes: initialValues.equipment_notes || '',
        phone_system: initialValues.phone_system || '',
        phone_types: initialValues.phone_types || '',
        network_equipment: initialValues.network_equipment || '',
        additional_equipment: initialValues.additional_equipment || ''
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

  const updateRegionFromCityState = (city, state) => {
    if (state) {
      const region = getRegionFromState(state);
      setValues(prev => ({
        ...prev,
        region: region
      }));
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

  const validatePhone = (phone) => {
    const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const validateIP = (ip) => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  const handleChange = e => {
    const { name, value } = e.target;

    if (name === 'main_number') {
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
      // Handle state input (full name or abbreviation)
      let stateCode = value;
      if (value.length > 2) {
        // Full state name provided, convert to code
        stateCode = STATE_NAMES_TO_CODES[value] || value;
      }
      // Auto-fill region when state is manually changed
      const region = getRegionFromState(stateCode);
      setValues({ ...values, [name]: stateCode, region: region });
    } else if (name === 'city') {
      // Update region when city is changed (if state is already set)
      setValues({ ...values, [name]: value });
      updateRegionFromCityState(value, values.state);
    } else {
      setValues({ ...values, [name]: value });
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    setError('');

    // Validation
    if (!values.site_id.trim()) {
      setError('Site ID is required');
      return;
    }

    if (!values.location.trim()) {
      setError('Location is required');
      return;
    }

    if (values.ip_address && !validateIP(values.ip_address)) {
      setError('Please enter a valid IP address');
      return;
    }

    if (values.main_number && !validatePhone(values.main_number)) {
      setError('Please enter a valid phone number (XXX-XXX-XXXX)');
      return;
    }

    // Clean up values before submitting
    const cleanedValues = {
      ...values,
      site_id: values.site_id.trim(),
      ip_address: values.ip_address.trim() || null,
      location: values.location.trim(),
      brand: values.brand.trim() || null,
      main_number: values.main_number.trim() || null,
      mp: values.mp.trim() || null,
      service_address: values.service_address.trim() || null,
      city: values.city.trim() || null,
      state: values.state || null,
      zip: values.zip.trim() || null,
      region: values.region.trim() || null,
      notes: values.notes.trim() || null,
      equipment_notes: values.equipment_notes.trim() || null,
      phone_system: values.phone_system.trim() || null,
      phone_types: values.phone_types.trim() || null,
      network_equipment: values.network_equipment.trim() || null,
      additional_equipment: values.additional_equipment.trim() || null,
    };

    onSubmit(cleanedValues);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <TextField
        name="site_id"
        label="Site ID *"
        value={values.site_id}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        disabled={isEdit}
        helperText="Unique identifier for the site"
      />

      <TextField
        name="ip_address"
        label="IP Address"
        value={values.ip_address}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Enter a valid IP address (e.g., 192.168.1.1)"
        placeholder="192.168.1.1"
      />

      <TextField
        name="location"
        label="Location *"
        value={values.location}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        helperText="Site location or name"
      />

      <TextField
        name="brand"
        label="Brand"
        value={values.brand}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Brand or company name"
      />

      <TextField
        name="main_number"
        label="Main Number"
        value={values.main_number}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Format: XXX-XXX-XXXX (auto-formatted)"
        placeholder="555-123-4567"
      />

      <TextField
        name="mp"
        label="MP"
        value={values.mp}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="MP identifier or reference"
      />

      <TextField
        name="service_address"
        label="Service Address"
        value={values.service_address}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Physical service address"
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

      <TextField
        name="state"
        label="State"
        value={values.state}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="State (auto-filled from ZIP code, or enter full name/abbreviation)"
        placeholder="Florida or FL"
        disabled={loadingZip}
      />
      {loadingZip && <CircularProgress size={20} sx={{ ml: 1 }} />}

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
        label="General Notes"
        value={values.notes}
        onChange={handleChange}
        fullWidth
        margin="normal"
        multiline
        minRows={3}
        helperText="General notes about the site"
      />

      <TextField
        name="phone_system"
        label="Phone System"
        value={values.phone_system}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Type of phone system (e.g., Avaya, Cisco, Mitel)"
      />

      <TextField
        name="phone_types"
        label="Phone Types"
        value={values.phone_types}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Types of phones (e.g., IP phones, analog phones, wireless)"
      />

      <TextField
        name="network_equipment"
        label="Network Equipment"
        value={values.network_equipment}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Network switches, routers, access points, etc."
      />

      <TextField
        name="additional_equipment"
        label="Additional Equipment"
        value={values.additional_equipment}
        onChange={handleChange}
        fullWidth
        margin="normal"
        helperText="Other equipment on site (POS systems, printers, etc.)"
      />

      <TextField
        name="equipment_notes"
        label="Equipment Notes"
        value={values.equipment_notes}
        onChange={handleChange}
        fullWidth
        margin="normal"
        multiline
        minRows={3}
        helperText="Detailed notes about equipment configuration, issues, or special requirements"
      />

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button type="submit" variant="contained" color="primary">
          {isEdit ? 'Save Changes' : 'Save Site'}
        </Button>
      </Box>
    </Box>
  );
}

export default SiteForm; 