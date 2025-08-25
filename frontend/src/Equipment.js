import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Avatar, Badge, Tooltip, List, ListItem, ListItemText, ListItemAvatar, Divider
} from '@mui/material';
import {
  Add, Edit, Delete, Visibility, Build, Schedule, CheckCircle, Cancel, Warning,
  LocalShipping, Inventory, Flag, FlagOutlined, Star, StarBorder, Notifications, NotificationsOff,
  ExpandMore, ExpandLess, FilterList, Sort, DragIndicator, Speed, AutoAwesome
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useWebSocket from './hooks/useWebSocket';
import dayjs from 'dayjs';
import EquipmentForm from './EquipmentForm';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import NoteAddIcon from '@mui/icons-material/NoteAdd';


function Equipment() {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editEquipment, setEditEquipment] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteEquipment, setDeleteEquipment] = useState(null);
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteEquipment, setNoteEquipment] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  const isAdminOrDispatcher = user?.role === 'admin' || user?.role === 'dispatcher';

  // WebSocket setup - will be configured after fetchEquipment is defined

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/equipment/');
      setEquipment(response || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError('Failed to fetch equipment');
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // WebSocket callback functions - defined after fetchEquipment
  const handleWebSocketMessage = useCallback((data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'equipment_update' || message.type === 'equipment_created' || message.type === 'equipment_deleted') {
        // Use a timeout to avoid calling fetchEquipment before it's defined
        setTimeout(() => {
          if (typeof fetchEquipment === 'function') {
            fetchEquipment();
          }
        }, 100);
      }
    } catch (e) {
      // Handle non-JSON messages
    }
  }, []);

  const { isConnected } = useWebSocket(`ws://192.168.43.50:8000/ws/updates`, handleWebSocketMessage);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleAdd = () => {
    setEditEquipment(null);
    setEditDialog(true);
  };

  const handleEdit = (eq) => {
    setEditEquipment(eq);
    setEditDialog(true);
  };

  const handleClose = () => {
    setEditDialog(false);
    setEditEquipment(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (editEquipment) {
        const response = await api.put(`/equipment/${editEquipment.equipment_id}`, values);
        setEquipment(prevEquipment => prevEquipment.map(e => 
          e.equipment_id === editEquipment.equipment_id ? response : e
        ));
        showToast('Equipment updated successfully', 'success');
      } else {
        const response = await api.post('/equipment/', values);
        setEquipment(prevEquipment => [...prevEquipment, response]);
        showToast('Equipment added successfully', 'success');
      }
      handleClose();
    } catch (err) {
      console.error('Error submitting equipment:', err);
      setError('Failed to save equipment');
      showToast('Failed to save equipment', 'error');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  const handleQuickNote = (eq) => {
    setNoteEquipment(eq);
    setNoteText('');
    setNoteDialog(true);
  };

  const handleNoteSubmit = async () => {
    try {
      await api.put(`/equipment/${noteEquipment.equipment_id}`, { 
        type: noteEquipment.type,
        make_model: noteEquipment.make_model,
        serial_number: noteEquipment.serial_number,
        install_date: noteEquipment.install_date,
        notes: (noteEquipment.notes || '') + '\n' + noteText,
        site_id: noteEquipment.site_id
      });
      showToast('Note added successfully', 'success');
      setNoteDialog(false);
      fetchEquipment();
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note');
      showToast('Failed to add note', 'error');
    }
  };

  const handleDelete = (eq) => {
    setDeleteEquipment(eq);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/equipment/${deleteEquipment.equipment_id}`, { data: {} });
      showToast('Equipment deleted successfully', 'success');
      setDeleteDialog(false);
      // Remove the equipment from the local state immediately
      setEquipment(prevEquipment => prevEquipment.filter(e => e.equipment_id !== deleteEquipment.equipment_id));
      setDeleteEquipment(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting equipment:', err);
      setError('Failed to delete equipment');
      showToast('Failed to delete equipment', 'error');
    }
  };

  // Color cue: highlight row if missing serial number
  const getRowColor = (eq) => {
    if (!eq.serial_number) return '#fff9c4'; // yellow
    return '#fff';
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
      <CircularProgress />
    </Box>
  );
  
  if (error) return (
    <Alert severity="error" sx={{ mt: 2 }}>
      {error}
    </Alert>
  );
  
  if (!isAdminOrDispatcher) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        You do not have permission to view equipment data. Please contact an administrator.
      </Alert>
    );
  }

  return (
    <>
      <Typography variant="h4" gutterBottom>Equipment</Typography>
      {isAdminOrDispatcher && (
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd} sx={{ mb: 2 }}>Add Equipment</Button>
      )}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Equipment ID</TableCell>
              <TableCell>Site ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Make/Model</TableCell>
              <TableCell>Serial Number</TableCell>
              <TableCell>Install Date</TableCell>
              <TableCell>Notes</TableCell>
              {isAdminOrDispatcher && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {equipment.map(eq => (
              <TableRow key={eq.equipment_id} sx={{ bgcolor: getRowColor(eq) }} aria-label={`Equipment ${eq.equipment_id}`}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {eq.equipment_id}
                    <Tooltip title="Copy Equipment ID"><IconButton size="small" onClick={() => handleCopy(eq.equipment_id)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Quick Add Note"><IconButton size="small" onClick={() => handleQuickNote(eq)}><NoteAddIcon fontSize="inherit" /></IconButton></Tooltip>
                    {isAdminOrDispatcher && (
                      <Tooltip title="Delete Equipment"><IconButton size="small" color="error" onClick={() => handleDelete(eq)}><Delete fontSize="inherit" /></IconButton></Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{eq.site_id}</TableCell>
                <TableCell>{eq.type}</TableCell>
                <TableCell>{eq.make_model}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {eq.serial_number}
                    {eq.serial_number && <Tooltip title="Copy Serial Number"><IconButton size="small" onClick={() => handleCopy(eq.serial_number)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>}
                  </Box>
                </TableCell>
                <TableCell>{eq.install_date}</TableCell>
                <Tooltip title={eq.notes}><TableCell>{eq.notes}</TableCell></Tooltip>
                {isAdminOrDispatcher && (
                  <TableCell>
                    <Tooltip title="Edit Equipment"><IconButton onClick={() => handleEdit(eq)} size="small"><Edit fontSize="inherit" /></IconButton></Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {copyFeedback && <Alert severity="success" sx={{ position: 'fixed', top: 80, right: 40, zIndex: 2000 }}>{copyFeedback}</Alert>}
      <Dialog open={editDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editEquipment ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
        <DialogContent>
          <EquipmentForm initialValues={editEquipment} onSubmit={handleSubmit} isEdit={!!editEquipment} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={noteDialog} onClose={() => setNoteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Quick Add Note</DialogTitle>
        <DialogContent>
          <TextField label="Note" value={noteText} onChange={e => setNoteText(e.target.value)} fullWidth multiline minRows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(false)}>Cancel</Button>
          <Button onClick={handleNoteSubmit} variant="contained">Add Note</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete equipment "{deleteEquipment?.type}" ({deleteEquipment?.make_model})?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Equipment; 