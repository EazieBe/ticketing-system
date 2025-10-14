import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Stack, TextField, InputAdornment, Typography, Chip,
  Popover, FormControlLabel, Checkbox, Divider
} from '@mui/material';
import { Add, Visibility, Edit, Search, Refresh, ViewColumn } from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';

function CompactTasks() {
  const navigate = useNavigate();
  const api = useApi();
  const { error: showError } = useToast();
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [columnAnchor, setColumnAnchor] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    task_id: true,
    description: true,
    status: true,
    assigned: true,
    due_date: true
  });

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks/');
      setTasks(response || []);
    } catch {
      showError('Failed');
    }
  };

  useEffect(() => {
    fetchTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const filtered = tasks.filter(t =>
    !search || t.task_id?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="h6" fontWeight="bold">Tasks ({filtered.length})</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ width: 200, '& input': { py: 0.5, fontSize: '0.875rem' } }} />
          <IconButton size="small" onClick={(e) => setColumnAnchor(e.currentTarget)} title="Show/Hide Columns">
            <ViewColumn fontSize="small" />
          </IconButton>
          <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/tasks/new')}>New</Button>
          <IconButton size="small" onClick={fetchTasks}><Refresh fontSize="small" /></IconButton>
        </Stack>
      </Stack>

      <Paper sx={{ flex: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', fontWeight: 'bold', borderBottom: 2, borderColor: '#3f51b5' } }}>
                {visibleColumns.task_id && <TableCell>ID</TableCell>}
                {visibleColumns.description && <TableCell>Description</TableCell>}
                {visibleColumns.status && <TableCell>Status</TableCell>}
                {visibleColumns.assigned && <TableCell>Assigned</TableCell>}
                {visibleColumns.due_date && <TableCell>Due</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.task_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/tasks/${t.task_id}/edit`)}>
                  {visibleColumns.task_id && <TableCell><Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>{t.task_id}</Typography></TableCell>}
                  {visibleColumns.description && <TableCell><Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{t.description}</Typography></TableCell>}
                  {visibleColumns.status && <TableCell><Chip label={t.status?.replace(/_/g, ' ')} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }} /></TableCell>}
                  {visibleColumns.assigned && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{t.assigned_user_id || '-'}</Typography></TableCell>}
                  {visibleColumns.due_date && <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</Typography></TableCell>}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" sx={{ p: 0.3 }}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" sx={{ p: 0.3 }} onClick={() => navigate(`/tasks/${t.task_id}/edit`)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Popover open={Boolean(columnAnchor)} anchorEl={columnAnchor} onClose={() => setColumnAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { maxHeight: 500, overflow: 'auto' } }}>
        <Box sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>Show/Hide Columns</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.5}>
            <FormControlLabel control={<Checkbox checked={visibleColumns.task_id} onChange={() => toggleColumn('task_id')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Task ID</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.description} onChange={() => toggleColumn('description')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Description</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.status} onChange={() => toggleColumn('status')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Status</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.assigned} onChange={() => toggleColumn('assigned')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Assigned</Typography>} />
            <FormControlLabel control={<Checkbox checked={visibleColumns.due_date} onChange={() => toggleColumn('due_date')} size="small" />} label={<Typography sx={{ fontSize: '0.875rem' }}>Due Date</Typography>} />
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}

export default CompactTasks;
