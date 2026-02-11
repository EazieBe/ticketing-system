import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Alert, Paper, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import useApi from './hooks/useApi';
import Logo from './components/Logo';

function Login() {
  const { login, loading } = useAuth();
  const api = useApi();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetDialog, setResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
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
      setError(result.error || 'Invalid email or password');
    }
  };

  const handleResetSubmit = async () => {
    // Self-service reset is not available yet. Inform the user.
    setResetMsg('Please contact an administrator to reset your password.');
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper sx={{ p: 4, minWidth: 320 }} elevation={3}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Logo size="large" showText={true} variant="build" />
        </Box>
        <Typography variant="h5" gutterBottom align="center">Login</Typography>
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
          <DialogContentText>Self-service password reset will be added later. For now, enter your email and an administrator will reset your password.</DialogContentText>
          <TextField label="Email" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} fullWidth sx={{ mt: 2 }} />
          {resetMsg && <Alert severity={'info'} sx={{ mt: 2 }}>{resetMsg}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>Cancel</Button>
          <Button onClick={handleResetSubmit} disabled={!resetEmail}>Request Reset</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Login; 