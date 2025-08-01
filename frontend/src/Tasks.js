import React, { useEffect, useState } from 'react';
import api from './axiosConfig';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TaskForm from './TaskForm';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import dayjs from 'dayjs';
import TextField from '@mui/material/TextField';



function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteTask, setNoteTask] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTask, setDeleteTask] = useState(null);

  const fetchTasks = () => {
    setLoading(true);
    api.get('/tasks/')
      .then(res => {
        setTasks(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch tasks');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAdd = () => {
    setEditTask(null);
    setOpen(true);
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditTask(null);
  };

  const handleSubmit = (values) => {
    if (editTask) {
      api.put(`/tasks/${editTask.task_id}`, values)
        .then((response) => {
          // Update the task in the local state immediately
          setTasks(prevTasks => prevTasks.map(t => 
            t.task_id === editTask.task_id ? response.data : t
          ));
          handleClose();
          setError(null);
        })
        .catch(() => setError('Failed to update task'));
    } else {
      api.post('/tasks/', values)
        .then((response) => {
          // Add the new task to the local state immediately
          setTasks(prevTasks => [...prevTasks, response.data]);
          handleClose();
          setError(null);
        })
        .catch(() => setError('Failed to add task'));
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(''), 1000);
  };

  const handleQuickNote = (task) => {
    setNoteTask(task);
    setNoteText('');
    setNoteDialog(true);
  };

  const handleNoteSubmit = () => {
    api.put(`/tasks/${noteTask.task_id}`, { 
      ticket_id: noteTask.ticket_id,
      assigned_user_id: noteTask.assigned_user_id,
      description: (noteTask.description || '') + '\n' + noteText,
      status: noteTask.status,
      due_date: noteTask.due_date,
      created_at: noteTask.created_at,
      updated_at: noteTask.updated_at
    })
      .then(() => {
        setNoteDialog(false);
        fetchTasks();
      })
      .catch(() => setError('Failed to add note'));
  };

  const handleDelete = (task) => {
    setDeleteTask(task);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    api.delete(`/tasks/${deleteTask.task_id}`, { data: {} })
      .then(() => {
        setDeleteDialog(false);
        // Remove the task from the local state immediately
        setTasks(prevTasks => prevTasks.filter(t => t.task_id !== deleteTask.task_id));
        setDeleteTask(null);
        setError(null);
      })
      .catch(() => setError('Failed to delete task'));
  };

  // Color cue: highlight row if overdue or in progress
  const getRowColor = (task) => {
    if (task.status === 'in_progress') return '#fff9c4'; // yellow
    if (task.due_date && dayjs(task.due_date).isBefore(dayjs()) && task.status !== 'completed') return '#ffcdd2'; // red
    return '#fff';
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="h4" gutterBottom>Tasks</Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ mb: 2 }}>Add Task</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Task ID</TableCell>
              <TableCell>Ticket ID</TableCell>
              <TableCell>Assigned User</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Updated At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map(task => (
              <TableRow key={task.task_id} sx={{ bgcolor: getRowColor(task) }} aria-label={`Task ${task.task_id}`}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {task.task_id}
                    <Tooltip title="Copy Task ID"><IconButton size="small" onClick={() => handleCopy(task.task_id)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Quick Add Note"><IconButton size="small" onClick={() => handleQuickNote(task)}><NoteAddIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Delete Task"><IconButton size="small" color="error" onClick={() => handleDelete(task)}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                  </Box>
                </TableCell>
                <TableCell>{task.ticket_id}</TableCell>
                <TableCell>{task.assigned_user_id}</TableCell>
                <Tooltip title={task.description}><TableCell>{task.description}</TableCell></Tooltip>
                <TableCell>{task.status}</TableCell>
                <TableCell>{task.due_date}</TableCell>
                <TableCell>{task.created_at}</TableCell>
                <TableCell>{task.updated_at}</TableCell>
                <TableCell>
                  <Tooltip title="Edit Task"><IconButton onClick={() => handleEdit(task)} size="small"><EditIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {copyFeedback && <Alert severity="success" sx={{ position: 'fixed', top: 80, right: 40, zIndex: 2000 }}>{copyFeedback}</Alert>}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
        <DialogContent>
          <TaskForm initialValues={editTask} onSubmit={handleSubmit} isEdit={!!editTask} />
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
          <Typography>Are you sure you want to delete task "{deleteTask?.title}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Tasks; 