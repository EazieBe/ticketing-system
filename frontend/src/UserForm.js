import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

// Predefined regions for consistency
const REGIONS = [
  'North', 'South', 'East', 'West', 'Central', 'Northeast', 'Northwest', 'Southeast', 'Southwest',
  'Metro', 'Rural', 'Urban', 'Suburban'
];

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'tech', label: 'Tech' },
  { value: 'billing', label: 'Billing' },
];

function UserForm({ initialValues, onSubmit, isEdit = false }) {
  const [values, setValues] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    region: '',
    preferences: '',
    password: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialValues) {
      setValues({
        name: initialValues.name || '',
        email: initialValues.email || '',
        role: initialValues.role || '',
        phone: initialValues.phone || '',
        region: initialValues.region || '',
        preferences: initialValues.preferences || '',
        password: ''
      });
    }
  }, [initialValues]);

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

    if (!values.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(values.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!values.role) {
      setError('Role is required');
      return;
    }

    if (!isEdit && !values.password) {
      setError('Password is required for new users');
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
      email: values.email.trim(),
      role: values.role,
      phone: values.phone.trim() || null,
      region: values.region.trim() || null,
      preferences: values.preferences.trim() || null,
    };

    // Only include password for new users
    if (!isEdit && values.password) {
      cleanedValues.password = values.password;
    }

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
        helperText="Enter the full name of the user"
      />

      <TextField
        name="email"
        label="Email *"
        type="email"
        value={values.email}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        helperText="Enter a valid email address"
      />

      <FormControl fullWidth margin="normal" required>
        <InputLabel>Role *</InputLabel>
        <Select
          name="role"
          value={values.role}
          label="Role *"
          onChange={handleChange}
        >
          <MenuItem value="">
            <em>Select a role</em>
          </MenuItem>
          {roleOptions.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {!isEdit && (
        <TextField
          name="password"
          label="Password *"
          type="password"
          value={values.password}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          helperText="Enter a password for the new user"
        />
      )}

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

      <FormControl fullWidth margin="normal">
        <InputLabel>Region</InputLabel>
        <Select
          name="region"
          value={values.region}
          label="Region"
          onChange={handleChange}
        >
          <MenuItem value="">
            <em>Select a region</em>
          </MenuItem>
          {REGIONS.map((region) => (
            <MenuItem key={region} value={region}>
              {region}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        name="preferences"
        label="Preferences"
        value={values.preferences}
        onChange={handleChange}
        fullWidth
        margin="normal"
        multiline
        minRows={3}
        helperText="User preferences (JSON format for dark mode, font size, etc.)"
      />

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button type="submit" variant="contained" color="primary">
          {isEdit ? 'Save Changes' : 'Save User'}
        </Button>
      </Box>
    </Box>
  );
}

export default UserForm; 