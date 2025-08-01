import React, { useState } from 'react';
import { TextField, Button, Box, Typography, MenuItem } from '@mui/material';

const statusOptions = [
  'Open',
  'In Progress',
  'Pending',
  'Closed',
  'Awaiting Approval',
];

const defaultValues = {
  title: '',
  description: '',
  assigned_user_id: '',
  ticket_id: '',
  status: 'Open',
  due_date: '',
};

function TaskForm({ initialValues = {}, onSubmit, isEdit = false }) {
  const [values, setValues] = useState({ ...defaultValues, ...initialValues });
  const [error, setError] = useState('');

  const handleChange = e => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!values.title) {
      setError('Title is required');
      return;
    }
    setError('');
    onSubmit(values);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      <Typography variant="h6" gutterBottom>{isEdit ? 'Edit Task' : 'Add Task'}</Typography>
      <TextField label="Title" name="title" value={values.title} onChange={handleChange} fullWidth margin="normal" required />
      <TextField label="Description" name="description" value={values.description} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Assigned User ID" name="assigned_user_id" value={values.assigned_user_id} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Ticket ID" name="ticket_id" value={values.ticket_id} onChange={handleChange} fullWidth margin="normal" />
      <TextField select label="Status" name="status" value={values.status} onChange={handleChange} fullWidth margin="normal">
        {statusOptions.map(option => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
      <TextField label="Due Date" name="due_date" type="date" value={values.due_date} onChange={handleChange} fullWidth margin="normal" InputLabelProps={{ shrink: true }} />
      {error && <Typography color="error">{error}</Typography>}
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>{isEdit ? 'Save Changes' : 'Save'}</Button>
    </Box>
  );
}

export default TaskForm; 