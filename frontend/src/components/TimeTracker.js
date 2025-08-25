import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider, Tooltip, Badge, Stack, Grid, Paper, LinearProgress, FormControlLabel, Switch
} from '@mui/material';
import {
  PlayArrow, Stop, Pause, Add, Edit, Delete, Timer, Schedule, CheckCircle,
  Warning, Error, Info, Person, Business, Assignment, Phone, Build, Inventory,
  Flag, FlagOutlined, Star, StarBorder, Notifications, NotificationsOff,
  ExpandMore, ExpandLess, FilterList, Sort, DragIndicator, Speed, AutoAwesome,
  AttachMoney, AccessTime
} from '@mui/icons-material';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import useApi from '../hooks/useApi';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

function TimeTracker({ ticketId, onTimeUpdate }) {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    duration_minutes: '',
    description: '',
    is_billable: true
  });
  
  // Prevent multiple simultaneous API calls
  const fetchingRef = useRef(false);

  const fetchTimeEntries = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);
      const response = await api.get(`/tickets/${ticketId}/time-entries/`);
      setTimeEntries(response || []);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      // Don't show error for missing time entries - they might not exist yet
      if (err.response?.status !== 404) {
        setError('Failed to load time entries');
      }
      setTimeEntries([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [api, ticketId]);

  const startTimer = useCallback((startTime) => {
    setCurrentSession({ startTime });
    setIsRunning(true);
    localStorage.setItem(`active_session_${ticketId}`, JSON.stringify({ startTime }));
  }, [ticketId]);

  useEffect(() => {
    // Only fetch if we have a valid ticketId
    if (ticketId) {
      fetchTimeEntries();
    }
  }, [fetchTimeEntries, ticketId]);

  // Start timer only once when component mounts
  useEffect(() => {
    // Check if there's an active session in localStorage
    const activeSession = localStorage.getItem(`active_session_${ticketId}`);
    if (activeSession) {
      try {
        const session = JSON.parse(activeSession);
        setCurrentSession(session);
        setIsRunning(true);
      } catch (err) {
        localStorage.removeItem(`active_session_${ticketId}`);
      }
    }
  }, [ticketId]);

  useEffect(() => {
    let interval;
    if (isRunning && currentSession) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - currentSession.startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentSession]);

  const stopTimer = async () => {
    if (!currentSession) return;

    const endTime = Date.now();
    const durationMinutes = Math.round((endTime - currentSession.startTime) / 60000);

    setFormData({
      start_time: dayjs(currentSession.startTime).format('YYYY-MM-DDTHH:mm'),
      end_time: dayjs(endTime).format('YYYY-MM-DDTHH:mm'),
      duration_minutes: durationMinutes.toString(),
      description: '',
      is_billable: true
    });

    setDialogOpen(true);
    setIsRunning(false);
    setCurrentSession(null);
    setElapsedTime(0);
    localStorage.removeItem(`active_session_${ticketId}`);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resumeTimer = () => {
    setIsRunning(true);
  };

  const handleSaveTimeEntry = async () => {
    try {
      const entryData = {
        start_time: formData.start_time,
        end_time: formData.end_time || null,
        duration_minutes: parseInt(formData.duration_minutes) || null,
        description: formData.description || '',
        is_billable: formData.is_billable
      };

      if (editingEntry) {
        await api.put(`/tickets/${ticketId}/time-entries/${editingEntry.entry_id}`, entryData);
      } else {
        await api.post(`/tickets/${ticketId}/time-entries/`, entryData);
      }

      setDialogOpen(false);
      setEditingEntry(null);
      setFormData({
        start_time: '',
        end_time: '',
        duration_minutes: '',
        description: '',
        is_billable: true
      });
      
      fetchTimeEntries();
      if (onTimeUpdate) onTimeUpdate();
    } catch (err) {
      console.error('Error saving time entry:', err);
      setError('Failed to save time entry');
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setFormData({
      start_time: dayjs(entry.start_time).format('YYYY-MM-DDTHH:mm'),
      end_time: entry.end_time ? dayjs(entry.end_time).format('YYYY-MM-DDTHH:mm') : '',
      duration_minutes: entry.duration_minutes?.toString() || '',
      description: entry.description || '',
      is_billable: entry.is_billable
    });
    setDialogOpen(true);
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this time entry?')) return;

    try {
      await api.delete(`/tickets/${ticketId}/time-entries/${entryId}`);
      fetchTimeEntries();
      if (onTimeUpdate) onTimeUpdate();
    } catch (err) {
      console.error('Error deleting time entry:', err);
      setError('Failed to delete time entry');
    }
  };

  const formatDuration = (milliseconds) => {
    const duration = dayjs.duration(milliseconds);
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalBillableTime = () => {
    return timeEntries
      .filter(entry => entry.is_billable && entry.duration_minutes)
      .reduce((total, entry) => total + entry.duration_minutes, 0);
  };

  const getTotalNonBillableTime = () => {
    return timeEntries
      .filter(entry => !entry.is_billable && entry.duration_minutes)
      .reduce((total, entry) => total + entry.duration_minutes, 0);
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Timer Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timer color="primary" />
            Time Tracker
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h4" fontFamily="monospace">
              {formatDuration(elapsedTime)}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!isRunning && !currentSession && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrow />}
                  onClick={() => startTimer(Date.now())}
                >
                  Start
                </Button>
              )}
              
              {isRunning && (
                <>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<Pause />}
                    onClick={pauseTimer}
                  >
                    Pause
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Stop />}
                    onClick={stopTimer}
                  >
                    Stop
                  </Button>
                </>
              )}
              
              {!isRunning && currentSession && (
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<PlayArrow />}
                  onClick={resumeTimer}
                >
                  Resume
                </Button>
              )}
            </Box>
          </Box>

          {/* Time Summary */}
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">
                  {Math.round(getTotalBillableTime() / 60 * 10) / 10}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Billable
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box textAlign="center">
                <Typography variant="h6" color="warning.main">
                  {Math.round(getTotalNonBillableTime() / 60 * 10) / 10}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Non-Billable
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary.main">
                  {Math.round((getTotalBillableTime() + getTotalNonBillableTime()) / 60 * 10) / 10}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Time Entries List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Time Entries
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => {
                setEditingEntry(null);
                setFormData({
                  start_time: '',
                  end_time: '',
                  duration_minutes: '',
                  description: '',
                  is_billable: true
                });
                setDialogOpen(true);
              }}
            >
              Add Entry
            </Button>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : timeEntries.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3}>
              No time entries yet
            </Typography>
          ) : (
            <List>
              {timeEntries.map((entry, index) => (
                <React.Fragment key={entry.entry_id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {dayjs(entry.start_time).format('MMM DD, YYYY HH:mm')}
                            {entry.end_time && ` - ${dayjs(entry.end_time).format('HH:mm')}`}
                          </Typography>
                          <Chip
                            label={`${Math.round(entry.duration_minutes / 60 * 10) / 10}h`}
                            size="small"
                            color="primary"
                          />
                          {entry.is_billable && (
                            <Chip
                              icon={<AttachMoney />}
                              label="Billable"
                              size="small"
                              color="success"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {entry.description || 'No description'}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleEditEntry(entry)}
                        size="small"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteEntry(entry.entry_id)}
                        size="small"
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < timeEntries.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Time Entry Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Start Time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                InputProps={{
                  startAdornment: <AccessTime sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_billable}
                      onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                    />
                  }
                  label="Billable"
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What work was performed during this time?"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTimeEntry} variant="contained">
            {editingEntry ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TimeTracker; 