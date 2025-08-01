import React, { useEffect, useState } from 'react';
import api from './axiosConfig';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, TextField, Tooltip, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FieldTechForm from './FieldTechForm';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import NoteAddIcon from '@mui/icons-material/NoteAdd';

function FieldTechs() {
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [editTech, setEditTech] = useState(null);
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteTech, setNoteTech] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTech, setDeleteTech] = useState(null);

  const fetchTechs = () => {
    setLoading(true);
    api.get('/fieldtechs/')
      .then(res => {
        setTechs(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch field techs');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTechs();
  }, []);

  const handleAdd = () => {
    setEditTech(null);
    setOpen(true);
  };

  const handleEdit = (tech) => {
    setEditTech(tech);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditTech(null);
  };

  const handleSubmit = (values) => {
    if (editTech) {
      api.put(`/fieldtechs/${editTech.field_tech_id}`, values)
        .then((response) => {
          // Update the field tech in the local state immediately
          setTechs(prevTechs => prevTechs.map(t => 
            t.field_tech_id === editTech.field_tech_id ? response.data : t
          ));
          handleClose();
          setError(null);
        })
        .catch(() => setError('Failed to update field tech'));
    } else {
      api.post('/fieldtechs/', values)
        .then((response) => {
          // Add the new field tech to the local state immediately
          setTechs(prevTechs => [...prevTechs, response.data]);
          handleClose();
          setError(null);
        })
        .catch(() => setError('Failed to add field tech'));
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(''), 1000);
  };

  const handleQuickNote = (tech) => {
    setNoteTech(tech);
    setNoteText('');
    setNoteDialog(true);
  };

  const handleNoteSubmit = () => {
    api.put(`/fieldtechs/${noteTech.field_tech_id}`, { 
      name: noteTech.name,
      phone: noteTech.phone,
      email: noteTech.email,
      region: noteTech.region,
      city: noteTech.city,
      state: noteTech.state,
      zip: noteTech.zip,
      notes: (noteTech.notes || '') + '\n' + noteText
    })
      .then(() => {
        setNoteDialog(false);
        fetchTechs();
      })
      .catch(() => setError('Failed to add note'));
  };

  const handleDelete = (tech) => {
    setDeleteTech(tech);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    api.delete(`/fieldtechs/${deleteTech.field_tech_id}`, { data: {} })
      .then(() => {
        // Remove the field tech from the local state immediately
        setTechs(prevTechs => prevTechs.filter(t => t.field_tech_id !== deleteTech.field_tech_id));
        setDeleteDialog(false);
        setDeleteTech(null);
        setError(null);
      })
      .catch(() => setError('Failed to delete field tech'));
  };

  // Color cue: highlight row if missing contact info or location
  const getRowColor = (tech) => {
    if (!tech.phone || !tech.email) return '#fff9c4'; // yellow for missing contact
    if (!tech.city || !tech.state) return '#fff3e0'; // orange for missing location
    return '#fff';
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="h4" gutterBottom>Field Techs</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>Add Field Tech</Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#fff9c4', border: '1px solid #ccc' }}></Box>
          <Typography variant="caption">Missing contact info</Typography>
          <Box sx={{ width: 20, height: 20, bgcolor: '#fff3e0', border: '1px solid #ccc', ml: 2 }}></Box>
          <Typography variant="caption">Missing location</Typography>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>City</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {techs.map(tech => (
              <TableRow key={tech.field_tech_id} sx={{ bgcolor: getRowColor(tech) }} aria-label={`Field Tech ${tech.field_tech_id}`}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tech.field_tech_id}
                    <Tooltip title="Copy Tech ID"><IconButton size="small" onClick={() => handleCopy(tech.field_tech_id)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Quick Add Note"><IconButton size="small" onClick={() => handleQuickNote(tech)}><NoteAddIcon fontSize="inherit" /></IconButton></Tooltip>
                  </Box>
                </TableCell>
                <TableCell>{tech.name}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tech.phone}
                    {tech.phone && <Tooltip title="Copy Phone"><IconButton size="small" onClick={() => handleCopy(tech.phone)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tech.email}
                    {tech.email && <Tooltip title="Copy Email"><IconButton size="small" onClick={() => handleCopy(tech.email)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>}
                  </Box>
                </TableCell>
                <TableCell>{tech.region}</TableCell>
                <TableCell>{tech.city}</TableCell>
                <TableCell>{tech.state}</TableCell>
                <Tooltip title={tech.notes}><TableCell>{tech.notes}</TableCell></Tooltip>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title="Edit Field Tech"><IconButton onClick={() => handleEdit(tech)} size="small"><EditIcon /></IconButton></Tooltip>
                    <Tooltip title="Delete Field Tech"><IconButton onClick={() => handleDelete(tech)} size="small" color="error"><DeleteIcon /></IconButton></Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {copyFeedback && <Alert severity="success" sx={{ position: 'fixed', top: 80, right: 40, zIndex: 2000 }}>{copyFeedback}</Alert>}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editTech ? 'Edit Field Tech' : 'Add Field Tech'}</DialogTitle>
        <DialogContent>
          <FieldTechForm initialValues={editTech} onSubmit={handleSubmit} isEdit={!!editTech} />
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
          <Typography>Are you sure you want to delete field tech "{deleteTech?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default FieldTechs; 