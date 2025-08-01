import React, { useEffect, useState } from 'react';
import api from './axiosConfig';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EquipmentForm from './EquipmentForm';
import { useAuth } from './AuthContext';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';



function Equipment() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [editEquipment, setEditEquipment] = useState(null);
  const { user } = useAuth();
  const isAdminOrDispatcher = user && (user.role === 'admin' || user.role === 'dispatcher');
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteEquipment, setNoteEquipment] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteEquipment, setDeleteEquipment] = useState(null);

  const fetchEquipment = () => {
    if (!isAdminOrDispatcher) return;
    setLoading(true);
    api.get('/equipment/')
      .then(res => {
        setEquipment(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch equipment');
        setLoading(false);
      });
  };

  const handleAdd = () => {
    setEditEquipment(null);
    setOpen(true);
  };

  const handleEdit = (eq) => {
    setEditEquipment(eq);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditEquipment(null);
  };

  const handleSubmit = (values) => {
    if (editEquipment) {
      api.put(`/equipment/${editEquipment.equipment_id}`, values)
        .then((response) => {
          // Update the equipment in the local state immediately
          setEquipment(prevEquipment => prevEquipment.map(e => 
            e.equipment_id === editEquipment.equipment_id ? response.data : e
          ));
          handleClose();
          setError(null);
        })
        .catch(() => setError('Failed to update equipment'));
    } else {
      api.post('/equipment/', values)
        .then((response) => {
          // Add the new equipment to the local state immediately
          setEquipment(prevEquipment => [...prevEquipment, response.data]);
          handleClose();
          setError(null);
        })
        .catch(() => setError('Failed to add equipment'));
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(''), 1000);
  };

  const handleQuickNote = (eq) => {
    setNoteEquipment(eq);
    setNoteText('');
    setNoteDialog(true);
  };

  const handleNoteSubmit = () => {
    api.put(`/equipment/${noteEquipment.equipment_id}`, { 
      type: noteEquipment.type,
      make_model: noteEquipment.make_model,
      serial_number: noteEquipment.serial_number,
      install_date: noteEquipment.install_date,
      notes: (noteEquipment.notes || '') + '\n' + noteText,
      site_id: noteEquipment.site_id
    })
      .then(() => {
        setNoteDialog(false);
        fetchEquipment();
      })
      .catch(() => setError('Failed to add note'));
  };

  const handleDelete = (eq) => {
    setDeleteEquipment(eq);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    api.delete(`/equipment/${deleteEquipment.equipment_id}`, { data: {} })
      .then(() => {
        setDeleteDialog(false);
        // Remove the equipment from the local state immediately
        setEquipment(prevEquipment => prevEquipment.filter(e => e.equipment_id !== deleteEquipment.equipment_id));
        setDeleteEquipment(null);
        setError(null);
      })
      .catch(() => setError('Failed to delete equipment'));
  };

  // Color cue: highlight row if missing serial number
  const getRowColor = (eq) => {
    if (!eq.serial_number) return '#fff9c4'; // yellow
    return '#fff';
  };

  useEffect(() => {
    fetchEquipment();
    // eslint-disable-next-line
  }, [isAdminOrDispatcher]);

  if (!isAdminOrDispatcher) {
    return <Alert severity="warning">You do not have permission to view equipment data.</Alert>;
  }
  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="h4" gutterBottom>Equipment</Typography>
      {isAdminOrDispatcher && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ mb: 2 }}>Add Equipment</Button>
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
                      <Tooltip title="Delete Equipment"><IconButton size="small" color="error" onClick={() => handleDelete(eq)}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
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
                    <Tooltip title="Edit Equipment"><IconButton onClick={() => handleEdit(eq)} size="small"><EditIcon /></IconButton></Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {copyFeedback && <Alert severity="success" sx={{ position: 'fixed', top: 80, right: 40, zIndex: 2000 }}>{copyFeedback}</Alert>}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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