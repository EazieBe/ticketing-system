import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';

const defaultValues = {
  name: '',
  sku: '',
  description: '',
  quantity_on_hand: '',
  cost: '',
  location: '',
  barcode: '',
};

function InventoryForm({ initialValues = {}, onSubmit, isEdit = false }) {
  const [values, setValues] = useState({ ...defaultValues, ...initialValues });
  const [error, setError] = useState('');

  const handleChange = e => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!values.name) {
      setError('Name is required');
      return;
    }
    setError('');
    onSubmit(values);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      <Typography variant="h6" gutterBottom>{isEdit ? 'Edit Inventory Item' : 'Add Inventory Item'}</Typography>
      <TextField label="Name" name="name" value={values.name} onChange={handleChange} fullWidth margin="normal" required />
      <TextField label="SKU" name="sku" value={values.sku} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Description" name="description" value={values.description} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Quantity on Hand" name="quantity_on_hand" value={values.quantity_on_hand} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Cost" name="cost" value={values.cost} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Location" name="location" value={values.location} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Barcode" name="barcode" value={values.barcode} onChange={handleChange} fullWidth margin="normal" />
      {error && <Typography color="error">{error}</Typography>}
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>{isEdit ? 'Save Changes' : 'Save'}</Button>
    </Box>
  );
}

export default InventoryForm; 