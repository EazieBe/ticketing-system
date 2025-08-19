import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Alert, Paper, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import useApi from './hooks/useApi';

function Login() {
  const { login, loading } = useAuth();
  const api = useApi();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetDialog, setResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) {
      if (result.mustChangePassword) {
        navigate('/change-password', { state: { userId: result.userId } });
      } else {
        navigate('/');
      }
    } else {
      setError('Invalid email or password');
    }
  };

  const handleResetSubmit = async () => {
    try {
      const users = await api.get(`/users/?email=${resetEmail}`);
      const user = users.find(u => u.email === resetEmail);
      if (!user) {
        setResetMsg('User not found');
        return;
      }
      
      await api.put(`/users/${user.user_id}`, { 
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        region: user.region,
        preferences: user.preferences,
        password: resetPassword
      });
      setResetMsg('Password reset successful!');
    } catch (err) {
      setResetMsg('Failed to reset password');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper sx={{ p: 4, minWidth: 320 }} elevation={3}>
        <Typography variant="h5" gutterBottom>Login</Typography>
        <form onSubmit={handleSubmit}>
          <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth margin="normal" required />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Box sx={{ mt: 2, position: 'relative' }}>
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
              Login
            </Button>
            {loading && <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-12px', ml: '-12px' }} />}
          </Box>
        </form>
        <Button onClick={() => { setResetDialog(true); setResetMsg(''); }} sx={{ mt: 2 }} size="small">Forgot Password?</Button>
      </Paper>
      <Dialog open={resetDialog} onClose={() => setResetDialog(false)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText>Enter your email and new password:</DialogContentText>
          <TextField label="Email" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} fullWidth sx={{ mt: 2 }} />
          <TextField label="New Password" type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} fullWidth sx={{ mt: 2 }} />
          {resetMsg && <Alert severity={resetMsg.includes('successful') ? 'success' : 'error'} sx={{ mt: 2 }}>{resetMsg}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>Cancel</Button>
          <Button onClick={handleResetSubmit} disabled={!resetEmail || !resetPassword}>Reset</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Login; 