import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Paper, CircularProgress } from '@mui/material';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import api from './axiosConfig';

function ChangePassword({ userId }) {
  const { logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/users/${userId}/change_password`, { new_password: newPassword }, {
        headers: { 'Content-Type': 'application/json' },
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate('/');
      }, 1500);
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper sx={{ p: 4, minWidth: 320 }} elevation={3}>
        <Typography variant="h5" gutterBottom>Change Password</Typography>
        <form onSubmit={handleSubmit}>
          <TextField label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} fullWidth margin="normal" required />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 2 }}>Password changed successfully!</Alert>}
          <Box sx={{ mt: 2, position: 'relative' }}>
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
              Change Password
            </Button>
            {loading && <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-12px', ml: '-12px' }} />}
          </Box>
        </form>
        <Button onClick={logout} sx={{ mt: 2 }} color="secondary">Logout</Button>
      </Paper>
    </Box>
  );
}

export default ChangePassword;