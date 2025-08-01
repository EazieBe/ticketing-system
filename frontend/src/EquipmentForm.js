import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';

const defaultValues = {
  site_id: '',
  type: '',
  make_model: '',
  serial: '',
  install_date: '',
  notes: '',
};

function EquipmentForm({ initialValues = {}, onSubmit, isEdit = false }) {
  const [values, setValues] = useState({ ...defaultValues, ...initialValues });
  const [error, setError] = useState('');

  const handleChange = e => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!values.site_id || !values.type) {
      setError('Site ID and Type are required');
      return;
    }
    setError('');
    onSubmit(values);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      <Typography variant="h6" gutterBottom>{isEdit ? 'Edit Equipment' : 'Add Equipment'}</Typography>
      <TextField label="Site ID" name="site_id" value={values.site_id} onChange={handleChange} fullWidth margin="normal" required />
      <TextField label="Type" name="type" value={values.type} onChange={handleChange} fullWidth margin="normal" required />
      <TextField label="Make/Model" name="make_model" value={values.make_model} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Serial" name="serial" value={values.serial} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Install Date" name="install_date" type="date" value={values.install_date} onChange={handleChange} fullWidth margin="normal" InputLabelProps={{ shrink: true }} />
      <TextField label="Notes" name="notes" value={values.notes} onChange={handleChange} fullWidth margin="normal" />
      {error && <Typography color="error">{error}</Typography>}
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>{isEdit ? 'Save Changes' : 'Save'}</Button>
    </Box>
  );
}

export default EquipmentForm; 