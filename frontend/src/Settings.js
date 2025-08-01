import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications,
  Security,
  Palette
} from '@mui/icons-material';
import { useAuth } from './AuthContext';

function Settings() {
  const { user, darkMode, toggleDarkMode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSaveSettings = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Settings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Appearance Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Palette sx={{ mr: 1 }} />
                <Typography variant="h6">Appearance</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={toggleDarkMode}
                  />
                }
                label="Dark Mode"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Notifications sx={{ mr: 1 }} />
                <Typography variant="h6">Notifications</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Email Notifications"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Push Notifications"
              />
              <FormControlLabel
                control={<Switch />}
                label="SMS Notifications"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security sx={{ mr: 1 }} />
                <Typography variant="h6">Security</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Two-Factor Authentication"
              />
              <FormControlLabel
                control={<Switch />}
                label="Session Timeout"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* User Info */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SettingsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">User Information</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Name:</strong> {user?.name || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Email:</strong> {user?.email || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Role:</strong> {user?.role || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSaveSettings}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
}

export default Settings; 