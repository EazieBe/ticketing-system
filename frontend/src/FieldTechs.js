import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Avatar, Badge, Tooltip, List, ListItem, ListItemText, ListItemAvatar, Divider
} from '@mui/material';
import {
  Add, Edit, Delete, Visibility, Person, Phone, Email, LocationOn, Schedule,
  CheckCircle, Cancel, Warning, LocalShipping, Build, Inventory, Flag, FlagOutlined,
  Star, StarBorder, Notifications, NotificationsOff, ExpandMore, ExpandLess
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useWebSocket from './hooks/useWebSocket';
import dayjs from 'dayjs';
import FieldTechForm from './FieldTechForm';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import CSVImport from './components/CSVImport';

function FieldTechs() {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editTech, setEditTech] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTech, setDeleteTech] = useState(null);
  const [importDialog, setImportDialog] = useState(false);

  // WebSocket setup - will be configured after fetchTechs is defined

  const fetchTechs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/fieldtechs/');
      setTechs(response || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching field techs:', err);
      setError('Failed to load field techs');
      setTechs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket callback functions - defined after fetchTechs
  const handleWebSocketMessage = useCallback((data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'fieldtech_update' || message.type === 'fieldtech_created' || message.type === 'fieldtech_deleted') {
        fetchTechs(); // Refresh field techs when there's an update
      }
    } catch (e) {
      // Handle non-JSON messages
    }
  }, [fetchTechs]);

  const { isConnected } = useWebSocket(`ws://192.168.43.50:8000/ws/updates`, handleWebSocketMessage);

  useEffect(() => {
    fetchTechs();
  }, [fetchTechs]);

  const handleAdd = () => {
    setEditTech(null);
    setEditDialog(true);
  };

  const handleEdit = (tech) => {
    setEditTech(tech);
    setEditDialog(true);
  };

  const handleClose = () => {
    setEditDialog(false);
    setEditTech(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (editTech) {
        const response = await api.put(`/fieldtechs/${editTech.field_tech_id}`, values);
        setTechs(prevTechs => prevTechs.map(t => 
          t.field_tech_id === editTech.field_tech_id ? response : t
        ));
        showToast('Field tech updated successfully', 'success');
      } else {
        const response = await api.post('/fieldtechs/', values);
        setTechs(prevTechs => [...prevTechs, response]);
        showToast('Field tech added successfully', 'success');
      }
      handleClose();
    } catch (err) {
      console.error('Error submitting field tech:', err);
      setError('Failed to save field tech');
      showToast('Failed to save field tech', 'error');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Phone number copied to clipboard', 'info');
  };

  const handleQuickNote = (tech) => {
    setEditTech(tech); // Use editTech for notes
    setEditDialog(true); // Use editDialog for notes
  };

  const handleNoteSubmit = async () => {
    try {
      const response = await api.put(`/fieldtechs/${editTech.field_tech_id}`, { 
        name: editTech.name,
        phone: editTech.phone,
        email: editTech.email,
        region: editTech.region,
        city: editTech.city,
        state: editTech.state,
        zip: editTech.zip,
        notes: editTech.notes // Assuming editTech already has notes
      });
      setTechs(prevTechs => prevTechs.map(t => 
        t.field_tech_id === editTech.field_tech_id ? response : t
      ));
      showToast('Notes updated successfully', 'success');
    } catch (err) {
      console.error('Error updating notes:', err);
      setError('Failed to update notes');
      showToast('Failed to update notes', 'error');
    } finally {
      handleClose(); // Close the dialog after saving notes
    }
  };

  const handleDelete = (tech) => {
    setDeleteTech(tech);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/fieldtechs/${deleteTech.field_tech_id}`, { data: {} });
      setTechs(prevTechs => prevTechs.filter(t => t.field_tech_id !== deleteTech.field_tech_id));
      showToast('Field tech deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting field tech:', err);
      setError('Failed to delete field tech');
      showToast('Failed to delete field tech', 'error');
    } finally {
      setDeleteDialog(false);
      setDeleteTech(null);
    }
  };

  const handleImportSuccess = (result) => {
    // Refresh the field techs list after successful import
    fetchTechs();
    showToast('Field techs imported successfully', 'success');
  };

  const handleImportClick = () => {
    setImportDialog(true);
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'Name,Phone,Email,Region,City,State,Zip,Notes\nJohn Doe,(555) 123-4567,john.doe@example.com,North,New York,NY,10001,Experienced technician\nJane Smith,(555) 987-6543,jane.smith@example.com,South,Los Angeles,CA,90210,Specializes in network equipment';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'field_techs_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getRowColor = (tech) => {
    if (tech.notes && tech.notes.includes('URGENT')) return '#ffebee';
    if (tech.notes && tech.notes.includes('PRIORITY')) return '#fff3e0';
    return 'inherit';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Field Technicians
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
            sx={{ mr: 1 }}
          >
            Download Template
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={handleImportClick}
            sx={{ mr: 1 }}
          >
            Import CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
          >
            Add Field Tech
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {techs.map((tech) => (
              <TableRow key={tech.field_tech_id} sx={{ backgroundColor: getRowColor(tech) }}>
                <TableCell>{tech.name}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {tech.phone}
                    <Tooltip title="Copy phone number">
                      <IconButton size="small" onClick={() => handleCopy(tech.phone)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {tech.email}
                    <Tooltip title="Copy email">
                      <IconButton size="small" onClick={() => handleCopy(tech.email)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>{tech.region}</TableCell>
                <TableCell>
                  {[tech.city, tech.state, tech.zip].filter(Boolean).join(', ')}
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tech.notes || 'No notes'}
                    </Typography>
                    <Tooltip title="Add/Edit Notes">
                      <IconButton size="small" onClick={() => handleQuickNote(tech)}>
                        <NoteAddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEdit(tech)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(tech)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={editDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editTech ? 'Edit Field Tech' : 'Add Field Tech'}</DialogTitle>
        <DialogContent>
          <FieldTechForm
            initialValues={editTech}
            onSubmit={handleSubmit}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={editDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add/Edit Notes - {editTech?.name}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editTech?.notes || ''} // Use editTech.notes
            onChange={(e) => setEditTech(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Enter notes..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleNoteSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {deleteTech?.name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImport
        open={importDialog}
        onClose={() => setImportDialog(false)}
        onSuccess={handleImportSuccess}
        title="Import Field Techs from CSV"
        endpoint="/fieldtechs/import-csv"
        templateData="Name,Phone,Email,Region,City,State,Zip,Notes\nJohn Doe,(555) 123-4567,john.doe@example.com,North,New York,NY,10001,Experienced technician\nJane Smith,(555) 987-6543,jane.smith@example.com,South,Los Angeles,CA,90210,Specializes in network equipment"
      />
    </Box>
  );
}

export default FieldTechs; 