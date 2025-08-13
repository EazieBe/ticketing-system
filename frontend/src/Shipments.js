import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Avatar, Badge, Tooltip, List, ListItem, ListItemText, ListItemAvatar, Divider
} from '@mui/material';
import {
  Add, Edit, Delete, Visibility, LocalShipping, Schedule, CheckCircle, Cancel, Warning,
  Build, Inventory, Flag, FlagOutlined, Star, StarBorder, Notifications, NotificationsOff,
  ExpandMore, ExpandLess, FilterList, Sort, DragIndicator, Speed, AutoAwesome
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import dayjs from 'dayjs';
import ShipmentForm from './ShipmentForm';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';



function Shipments() {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editShipment, setEditShipment] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteShipment, setDeleteShipment] = useState(null);

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/shipments/');
      setShipments(response || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setError('Failed to fetch shipments');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const handleAddShipment = () => {
    setEditShipment(null);
    setAddDialog(true);
  };

  const handleEdit = (shipment) => {
    setEditShipment(shipment);
    setEditDialog(true);
  };

  const handleClose = () => {
    setAddDialog(false);
    setEditDialog(false);
    setEditShipment(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (editShipment) {
        const response = await api.put(`/shipments/${editShipment.shipment_id}`, values);
        setShipments(prevShipments => prevShipments.map(s => 
          s.shipment_id === editShipment.shipment_id ? response : s
        ));
        showToast('Shipment updated successfully', 'success');
      } else {
        const response = await api.post('/shipments/', values);
        setShipments(prevShipments => [...prevShipments, response]);
        showToast('Shipment added successfully', 'success');
      }
      handleClose();
    } catch (err) {
      console.error('Error submitting shipment:', err);
      setError('Failed to save shipment');
      showToast('Failed to save shipment', 'error');
    }
  };

  const handleAddSubmit = async (values) => {
    try {
      const response = await api.post('/shipments/', values);
      setShipments(prevShipments => [...prevShipments, response]);
      showToast('Shipment added successfully', 'success');
      handleClose();
    } catch (err) {
      console.error('Error adding shipment:', err);
      setError('Failed to add shipment');
      showToast('Failed to add shipment', 'error');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(''), 1000);
  };

  const handleDelete = (shipment) => {
    setDeleteShipment(shipment);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    api.delete(`/shipments/${deleteShipment.shipment_id}`, { data: {} })
      .then(() => {
        setDeleteDialog(false);
        // Remove the deleted shipment from the list immediately
        setShipments(prevShipments => prevShipments.filter(s => s.shipment_id !== deleteShipment.shipment_id));
        setDeleteShipment(null);
        setError(null); // Clear any previous errors
      })
      .catch((err) => {
        console.error('Failed to delete shipment:', err);
        setError('Failed to delete shipment: ' + (err.response?.data?.detail || err.message));
      });
  };

  // Color cue: highlight row if shipment is pending/overdue (dummy logic, real logic would require more data)
  const getRowColor = (shipment) => {
    // Placeholder: highlight if no date_shipped (simulate pending)
    if (!shipment.date_shipped) return '#fff9c4'; // yellow
    return '#fff';
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="h4" gutterBottom>Shipments</Typography>
      <Button variant="contained" onClick={handleAddShipment} sx={{ mb: 2 }}>Add Shipment</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Shipment ID</TableCell>
              <TableCell>Site ID</TableCell>
              <TableCell>Ticket ID</TableCell>
              <TableCell>What is Being Shipped</TableCell>
              <TableCell>Shipping Preference</TableCell>
              <TableCell>Charges Out</TableCell>
              <TableCell>Charges In</TableCell>
              <TableCell>Tracking Number</TableCell>
              <TableCell>Date Shipped</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shipments.map(shipment => (
              <TableRow key={shipment.shipment_id} sx={{ bgcolor: getRowColor(shipment) }} aria-label={`Shipment ${shipment.shipment_id}`}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {shipment.shipment_id}
                    <Tooltip title="Copy Shipment ID"><IconButton size="small" onClick={() => handleCopy(shipment.shipment_id)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                  </Box>
                </TableCell>
                <TableCell>{shipment.site_id}</TableCell>
                <TableCell>{shipment.ticket_id}</TableCell>
                <TableCell>{shipment.what_is_being_shipped}</TableCell>
                <TableCell>{shipment.shipping_preference}</TableCell>
                <TableCell>{shipment.charges_out}</TableCell>
                <TableCell>{shipment.charges_in}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {shipment.tracking_number}
                    {shipment.tracking_number && (
                      <Tooltip title="Copy Tracking Number"><IconButton size="small" onClick={() => handleCopy(shipment.tracking_number)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{shipment.date_shipped}</TableCell>
                <TableCell>{shipment.notes}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title="Delete Shipment"><IconButton size="small" color="error" onClick={() => handleDelete(shipment)}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Shipment</DialogTitle>
        <DialogContent>
          <ShipmentForm onSubmit={handleAddSubmit} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete shipment "{deleteShipment?.what_is_being_shipped}" for site {deleteShipment?.site_id}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
      {copyFeedback && <Alert severity="success" sx={{ position: 'fixed', top: 80, right: 40, zIndex: 2000 }}>{copyFeedback}</Alert>}
    </>
  );
}

export default Shipments; 