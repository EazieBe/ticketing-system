import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Grid, Typography, Chip, Button, Stack, Tabs, Tab, TextField,
  Table, TableBody, TableCell, TableHead, TableRow, Alert, Divider, Dialog,
  DialogTitle, DialogContent, DialogActions, DialogContentText
} from '@mui/material';
import { ArrowBack, Edit, AccessTime, CheckCircle, Warning, Delete, PanTool, Timer } from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import { useAuth } from './AuthContext';
import useApi from './hooks/useApi';

// Live Timer Component
function LiveTimer({ startTime }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      if (!startTime) return;
      const start = new Date(startTime);
      const now = new Date();
      const diff = now - start;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: '#fff3e0', borderRadius: 1, border: '2px solid #ff9800' }}>
      <Timer sx={{ color: '#f57c00', fontSize: 28 }} />
      <Box>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block', lineHeight: 1 }}>
          Tech Onsite
        </Typography>
        <Typography variant="h6" sx={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f57c00', lineHeight: 1 }}>
          {elapsed}
        </Typography>
      </Box>
    </Box>
  );
}

function CompactTicketDetail() {
  const { ticket_id: ticketId } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [tab, setTab] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, c, te] = await Promise.all([
          api.get(`/tickets/${ticketId}`),
          api.get(`/tickets/${ticketId}/comments`),
          api.get(`/tickets/${ticketId}/time-entries/`)
        ]);
        setTicket(t);
        setComments(c || []);
        setTimeEntries(te || []);
      } catch (err) {
        showError('Failed to load');
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleQuickAction = async (action) => {
    try {
      if (action === 'check-in') await api.put(`/tickets/${ticketId}/check-in`, {});
      if (action === 'check-out') await api.put(`/tickets/${ticketId}/check-out`, {});
      if (action === 'needs-parts') await api.patch(`/tickets/${ticketId}/status`, { status: 'needs_parts' });
      if (action === 'complete') await api.patch(`/tickets/${ticketId}/status`, { status: 'completed' });
      success(`${action} success!`);
      window.location.reload();
    } catch {
      showError('Failed');
    }
  };

  const handleClaim = async () => {
    try {
      await api.put(`/tickets/${ticketId}/claim`, { claimed_by: user.user_id });
      success('Ticket claimed successfully!');
      window.location.reload();
    } catch {
      showError('Failed to claim ticket');
    }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    try {
      await api.post(`/tickets/${ticketId}/comments`, { comment: newComment });
      setNewComment('');
      const c = await api.get(`/tickets/${ticketId}/comments`);
      setComments(c || []);
      success('Comment added');
    } catch {
      showError('Failed');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/tickets/${ticketId}`);
      success('Ticket deleted successfully');
      setDeleteDialogOpen(false);
      navigate('/tickets');
    } catch (err) {
      showError('Failed to delete ticket');
      setDeleteDialogOpen(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  if (!ticket) return <Box sx={{ p: 2 }}><Typography>Loading...</Typography></Box>;

  const onsiteAlert = ticket.check_in_time && !ticket.check_out_time &&
    ((new Date() - new Date(ticket.check_in_time)) / (1000 * 60 * 60)) >= 2;

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" startIcon={<ArrowBack />} onClick={() => navigate('/tickets')}>Back</Button>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{ticket.ticket_id}</Typography>
            <Chip label={ticket.status} size="small" sx={{ fontSize: '0.75rem' }} />
            <Chip label={ticket.priority} size="small" color="error" sx={{ fontSize: '0.75rem' }} />
            <Chip label={ticket.type} size="small" sx={{ fontSize: '0.75rem' }} />
          </Stack>
          <Stack direction="row" spacing={1}>
            {!ticket.claimed_by && !['completed', 'closed', 'approved'].includes(ticket.status) && (
              <Button size="small" variant="contained" color="secondary" startIcon={<PanTool />} onClick={handleClaim}>Claim</Button>
            )}
            {ticket.type === 'onsite' && !ticket.check_in_time && (
              <Button size="small" variant="contained" color="success" onClick={() => handleQuickAction('check-in')}>Tech Arrived</Button>
            )}
            {ticket.type === 'onsite' && ticket.check_in_time && !ticket.check_out_time && (
              <Button size="small" variant="contained" color="info" onClick={() => handleQuickAction('check-out')}>Tech Done</Button>
            )}
            {!['completed', 'closed', 'approved'].includes(ticket.status) && (
              <>
                <Button size="small" variant="outlined" onClick={() => handleQuickAction('needs-parts')}>Needs Parts</Button>
                <Button size="small" variant="contained" color="primary" onClick={() => handleQuickAction('complete')}>Complete</Button>
              </>
            )}
            <Button size="small" variant="contained" startIcon={<Edit />} onClick={() => navigate(`/tickets/${ticketId}/edit`)}>Edit</Button>
            {isAdmin && (
              <Button size="small" variant="contained" color="error" startIcon={<Delete />} onClick={() => setDeleteDialogOpen(true)}>Delete</Button>
            )}
          </Stack>
        </Stack>

        {onsiteAlert && (
          <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
            <strong>TECH ONSITE 2+ HOURS!</strong> Follow up immediately!
          </Alert>
        )}

        {/* Live Timer for Checked-In Techs */}
        {ticket.type === 'onsite' && ticket.check_in_time && !ticket.check_out_time && (
          <Box sx={{ mb: 2 }}>
            <LiveTimer startTime={ticket.check_in_time} />
          </Box>
        )}

        <Grid container spacing={1} sx={{ '& .MuiTypography-root': { fontSize: '0.85rem' } }}>
          <Grid item xs={6} md={3}><Typography><strong>Site:</strong> {ticket.site?.site_id} - {ticket.site?.location}</Typography></Grid>
          <Grid item xs={6} md={3}><Typography><strong>INC:</strong> {ticket.inc_number || 'N/A'}</Typography></Grid>
          <Grid item xs={6} md={3}><Typography><strong>SO:</strong> {ticket.so_number || 'N/A'}</Typography></Grid>
          <Grid item xs={6} md={3}><Typography><strong>Assigned:</strong> {ticket.assigned_user?.name || 'Unassigned'}</Typography></Grid>
          {ticket.claimed_by && (
            <Grid item xs={6} md={3}><Typography><strong>Claimed By:</strong> {ticket.claimed_by_user?.name || ticket.claimed_by}</Typography></Grid>
          )}
          <Grid item xs={6} md={3}><Typography><strong>Field Tech:</strong> {ticket.onsite_tech?.name || 'N/A'}</Typography></Grid>
          <Grid item xs={6} md={3}><Typography><strong>Created:</strong> {ticket.date_created ? new Date(ticket.date_created).toLocaleDateString() : 'N/A'}</Typography></Grid>
          <Grid item xs={6} md={3}><Typography><strong>Scheduled:</strong> {ticket.date_scheduled ? new Date(ticket.date_scheduled).toLocaleDateString() : 'N/A'}</Typography></Grid>
          {ticket.check_in_time && <Grid item xs={6} md={3}><Typography><strong>Check-In:</strong> {new Date(ticket.check_in_time).toLocaleString()}</Typography></Grid>}
          {ticket.check_out_time && <Grid item xs={6} md={3}><Typography><strong>Check-Out:</strong> {new Date(ticket.check_out_time).toLocaleString()}</Typography></Grid>}
          {ticket.onsite_duration_minutes && (
            <Grid item xs={6} md={3}>
              <Typography>
                <strong>Onsite Duration:</strong> {Math.floor(ticket.onsite_duration_minutes / 60)}h {ticket.onsite_duration_minutes % 60}m
              </Typography>
            </Grid>
          )}
          <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
          <Grid item xs={12}><Typography><strong>Notes:</strong> {ticket.notes || 'No notes'}</Typography></Grid>
          {ticket.parts_needed && <Grid item xs={12}><Typography><strong>Parts:</strong> {ticket.parts_needed}</Typography></Grid>}
          {ticket.equipment_affected && <Grid item xs={12}><Typography><strong>Equipment:</strong> {ticket.equipment_affected}</Typography></Grid>}
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label={`Comments (${comments.length})`} sx={{ fontSize: '0.875rem', minHeight: 40 }} />
            <Tab label={`Time Entries (${timeEntries.length})`} sx={{ fontSize: '0.875rem', minHeight: 40 }} />
          </Tabs>

          {tab === 0 && (
            <Box sx={{ mt: 2 }}>
              <Stack spacing={1} mb={2}>
                {comments.map((c) => (
                  <Paper key={c.comment_id} sx={{ p: 1, bgcolor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">{c.user?.name || 'Unknown'}</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{c.comment}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(c.created_at).toLocaleString()}</Typography>
                  </Paper>
                ))}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField fullWidth size="small" placeholder="Add comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  sx={{ '& input': { fontSize: '0.875rem' } }} />
                <Button size="small" variant="contained" onClick={postComment}>Post</Button>
              </Stack>
            </Box>
          )}

          {tab === 1 && (
            <Table size="small" sx={{ mt: 2, '& td, & th': { py: 0.5, fontSize: '0.75rem' } }}>
              <TableHead>
                <TableRow><TableCell>Date</TableCell><TableCell>Hours</TableCell><TableCell>Description</TableCell><TableCell>User</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {timeEntries.map((te) => (
                  <TableRow key={te.entry_id}>
                    <TableCell>{te.entry_date ? new Date(te.entry_date).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{te.hours_worked || 0}</TableCell>
                    <TableCell>{te.work_description}</TableCell>
                    <TableCell>{te.user?.name || 'N/A'}</TableCell>
                  </TableRow>
                ))}
                {timeEntries.length === 0 && <TableRow><TableCell colSpan={4} align="center">No entries</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Ticket</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete ticket <strong>{ticket.ticket_id}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CompactTicketDetail;

