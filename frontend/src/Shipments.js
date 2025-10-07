import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Box, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, Tooltip, TextField
} from '@mui/material';
import {
  Add, Edit, Delete, Visibility, LocalShipping, Schedule, CheckCircle, Cancel, Warning,
  OpenInNew, Update
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import ShipmentForm from './ShipmentForm';
import { useDataSync } from './contexts/DataSyncContext';
import { TimestampDisplay } from './components/TimestampDisplay';

function Shipments() {
  const { user } = useAuth();
  const api = useApi();
  const { success, error: showError } = useToast();
  const { updateTrigger } = useDataSync('shipments');
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editShipment, setEditShipment] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteShipment, setDeleteShipment] = useState(null);
  const [statusDialog, setStatusDialog] = useState(false);
  const [statusShipment, setStatusShipment] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: 'pending',
    tracking_number: '',
    return_tracking: ''
  });
  const [filterStatus, setFilterStatus] = useState('all');

  const loadingRef = useRef(false);
  const wsDebounceRef = useRef(0);

  const fetchShipments = useCallback(async () => {
    if (loadingRef.current) return; // Prevent concurrent fetches
    if (!api || !api.get) {
      console.error('API not initialized');
      return;
    }
    try {
      loadingRef.current = true;
      setLoading(true);
      const response = await api.get('/shipments/');
      setShipments(response || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setError('Failed to fetch shipments');
      setShipments([]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [api]);

  // Use global WebSocket for real-time updates
    // Initial load with loading spinner
  useEffect(() => {
    fetchShipments(true); // Show loading on initial load
  }, []); // Empty dependency array for initial load only

  // Auto-refresh when DataSync triggers update (no loading spinner)
  useEffect(() => {
    if (updateTrigger > 0) { // Only refresh on real-time updates, not initial load
      fetchShipments(false); // Don't show loading on real-time updates
    }
  }, [updateTrigger]); // Only depend on updateTrigger

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
    if (!api || !api.put || !api.post) {
      console.error('API not initialized');
      showError('API not initialized');
      return;
    }
    try {
      if (editShipment) {
        const response = await api.put(`/shipments/${editShipment.shipment_id}`, values);
        setShipments(prevShipments => prevShipments.map(s => 
          s.shipment_id === editShipment.shipment_id ? response : s
        ));
        success('Shipment updated successfully');
      } else {
        const response = await api.post('/shipments/', values);
        setShipments(prevShipments => [...prevShipments, response]);
        success('Shipment added successfully');
      }
      handleClose();
    } catch (err) {
      console.error('Error submitting shipment:', err);
      setError('Failed to save shipment');
      showError('Failed to save shipment');
    }
  };

  const handleDelete = (shipment) => {
    setDeleteShipment(shipment);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!api || !api.delete) {
      console.error('API not initialized');
      showError('API not initialized');
      return;
    }
    try {
      await api.delete(`/shipments/${deleteShipment.shipment_id}`);
      setShipments(prevShipments => prevShipments.filter(s => s.shipment_id !== deleteShipment.shipment_id));
      setDeleteDialog(false);
      setDeleteShipment(null);
      success('Shipment deleted successfully');
    } catch (err) {
      console.error('Error deleting shipment:', err);
      showError('Failed to delete shipment');
    }
  };

  const handleStatusUpdate = (shipment) => {
    setStatusShipment(shipment);
    setStatusUpdate({
      status: shipment.status || 'pending',
      tracking_number: shipment.tracking_number || '',
      return_tracking: shipment.return_tracking || ''
    });
    setStatusDialog(true);
  };

  const handleStatusSubmit = async () => {
    if (!api || !api.patch) {
      console.error('API not initialized');
      showError('API not initialized');
      return;
    }
    try {
      const response = await api.patch(`/shipments/${statusShipment.shipment_id}/status`, statusUpdate);
      setShipments(prevShipments => prevShipments.map(s => 
        s.shipment_id === statusShipment.shipment_id ? response : s
      ));
      setStatusDialog(false);
      setStatusShipment(null);
      success('Shipment status updated successfully');
    } catch (err) {
      console.error('Error updating shipment status:', err);
      showError('Failed to update shipment status');
    }
  };

  const openFedExTracking = (trackingNumber) => {
    if (trackingNumber) {
      window.open(`https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`, '_blank');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'shipped': return 'info';
      case 'delivered': return 'success';
      case 'returned': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Schedule />;
      case 'shipped': return <LocalShipping />;
      case 'delivered': return <CheckCircle />;
      case 'returned': return <Cancel />;
      default: return <Warning />;
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const filteredShipments = shipments.filter(shipment => {
    if (filterStatus === 'all') return true;
    return shipment.status === filterStatus;
  });

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="h4" gutterBottom>Shipments</Typography>
      
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button variant="contained" onClick={handleAddShipment} startIcon={<Add />}>
          Add Shipment
        </Button>
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Status Filter"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="shipped">Shipped</MenuItem>
            <MenuItem value="delivered">Delivered</MenuItem>
            <MenuItem value="returned">Returned</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Shipment ID</TableCell>
              <TableCell>Site</TableCell>
              <TableCell>What is Being Shipped</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Charges Out</TableCell>
              <TableCell>Charges In</TableCell>
              <TableCell>Parts Cost</TableCell>
              <TableCell>Tracking</TableCell>
              <TableCell>Date Created</TableCell>
              <TableCell>Date Shipped</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredShipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    {filterStatus === 'all' ? 'No shipments found' : `No ${filterStatus} shipments found`}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredShipments.map(shipment => (
              <TableRow 
                key={shipment.shipment_id} 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                }}
                onClick={() => handleEdit(shipment)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {shipment.shipment_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {shipment.site_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {shipment.what_is_being_shipped}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(shipment.status)}
                    label={shipment.status || 'pending'}
                    color={getStatusColor(shipment.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={shipment.shipping_priority || 'normal'}
                    color={shipment.shipping_priority === 'urgent' ? 'error' : 
                           shipment.shipping_priority === 'critical' ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatCurrency(shipment.charges_out)}</TableCell>
                <TableCell>{formatCurrency(shipment.charges_in)}</TableCell>
                <TableCell>{formatCurrency(shipment.parts_cost)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {shipment.tracking_number && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {shipment.tracking_number}
                        </Typography>
                        <Tooltip title="Track on FedEx">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openFedExTracking(shipment.tracking_number);
                            }}
                          >
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {shipment.return_tracking && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          R: {shipment.return_tracking}
                        </Typography>
                        <Tooltip title="Track Return on FedEx">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openFedExTracking(shipment.return_tracking);
                            }}
                          >
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <TimestampDisplay 
                    entity={shipment} 
                    entityType="shipments" 
                    format="absolute"
                  />
                </TableCell>
                <TableCell>{formatDate(shipment.date_shipped)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Update Status">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(shipment);
                        }}
                      >
                        <Update fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(shipment);
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialog || editDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editShipment ? 'Edit Shipment' : 'Add New Shipment'}
        </DialogTitle>
        <DialogContent>
          <ShipmentForm 
            initialValues={editShipment || {}} 
            onSubmit={handleSubmit} 
            isEdit={!!editShipment}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete shipment "{deleteShipment?.what_is_being_shipped}" for site {deleteShipment?.site_id}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Shipment Status</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusUpdate.status}
                onChange={(e) => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}
                label="Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="shipped">Shipped</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="returned">Returned</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Outbound Tracking Number"
              value={statusUpdate.tracking_number}
              onChange={(e) => setStatusUpdate(prev => ({ ...prev, tracking_number: e.target.value }))}
            />
            
            <TextField
              fullWidth
              label="Return Tracking Number"
              value={statusUpdate.return_tracking}
              onChange={(e) => setStatusUpdate(prev => ({ ...prev, return_tracking: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(false)}>Cancel</Button>
          <Button onClick={handleStatusSubmit} variant="contained">Update Status</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Shipments; 