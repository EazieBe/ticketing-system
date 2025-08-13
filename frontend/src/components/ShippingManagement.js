import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Card,
  CardContent,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  LocalShipping,
  TrackChanges,
  AttachMoney,
  Refresh,
  FilterList,
  Download,
  Upload
} from '@mui/icons-material';
import { useToast } from '../contexts/ToastContext';
import useApi from '../hooks/useApi';
import useWebSocket from '../hooks/useWebSocket';
import LoadingSpinner from './LoadingSpinner';

function ShippingManagement() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [formData, setFormData] = useState({
    site_id: '',
    what_is_being_shipped: '',
    shipping_preference: '',
    charges_out: 0,
    charges_in: 0,
    tracking_number: '',
    return_tracking: '',
    notes: '',
    shipping_priority: 'normal',
    parts_cost: 0
  });

  const { get, post, put, delete: deleteApi, loading: apiLoading } = useApi();
  const { success, error: showError } = useToast();

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket(`ws://${window.location.hostname}:8000/ws/updates`, {
    onMessage: (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'shipment' || message.includes('shipment')) {
          fetchShipments();
        }
      } catch (e) {
        // Handle non-JSON messages
      }
    }
  });

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await get('/shipments/');
      
      // Filter by date and apply other filters
      let filteredShipments = response.filter(shipment => {
        const shipmentDate = shipment.date_shipped || new Date().toISOString().split('T')[0];
        const dateMatch = shipmentDate === selectedDate;
        const statusMatch = filterStatus === 'all' || shipment.status === filterStatus;
        const priorityMatch = filterPriority === 'all' || shipment.shipping_priority === filterPriority;
        
        return dateMatch && statusMatch && priorityMatch;
      });

      // Sort by priority and status
      filteredShipments.sort((a, b) => {
        const priorityOrder = { critical: 3, urgent: 2, normal: 1 };
        const statusOrder = { pending: 1, shipped: 2, delivered: 3, returned: 4 };
        
        const priorityDiff = priorityOrder[b.shipping_priority] - priorityOrder[a.shipping_priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setShipments(filteredShipments);
      setError(null);
    } catch (err) {
      setError('Failed to fetch shipments');
      showError('Failed to fetch shipments');
    } finally {
      setLoading(false);
    }
  }, [get, selectedDate, filterStatus, filterPriority]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const handleAddShipment = () => {
    setEditingShipment(null);
    setFormData({
      site_id: '',
      what_is_being_shipped: '',
      shipping_preference: '',
      charges_out: 0,
      charges_in: 0,
      tracking_number: '',
      return_tracking: '',
      notes: '',
      shipping_priority: 'normal',
      parts_cost: 0
    });
    setDialogOpen(true);
  };

  const handleEditShipment = (shipment) => {
    setEditingShipment(shipment);
    setFormData({
      site_id: shipment.site_id,
      what_is_being_shipped: shipment.what_is_being_shipped,
      shipping_preference: shipment.shipping_preference,
      charges_out: shipment.charges_out || 0,
      charges_in: shipment.charges_in || 0,
      tracking_number: shipment.tracking_number || '',
      return_tracking: shipment.return_tracking || '',
      notes: shipment.notes || '',
      shipping_priority: shipment.shipping_priority || 'normal',
      parts_cost: shipment.parts_cost || 0
    });
    setDialogOpen(true);
  };

  const handleSaveShipment = async () => {
    try {
      const shipmentData = {
        ...formData,
        date_shipped: selectedDate,
        total_cost: (formData.charges_out || 0) + (formData.charges_in || 0) + (formData.parts_cost || 0)
      };

      if (editingShipment) {
        await put(`/shipments/${editingShipment.shipment_id}`, shipmentData);
        success('Shipment updated successfully');
      } else {
        await post('/shipments/', shipmentData);
        success('Shipment created successfully');
      }

      setDialogOpen(false);
      fetchShipments();
    } catch (err) {
      showError('Failed to save shipment');
    }
  };

  const handleDeleteShipment = async (shipmentId) => {
    if (window.confirm('Are you sure you want to delete this shipment?')) {
      try {
        await deleteApi(`/shipments/${shipmentId}`);
        success('Shipment deleted successfully');
        fetchShipments();
      } catch (err) {
        showError('Failed to delete shipment');
      }
    }
  };

  const handleUpdateTracking = async (shipmentId, trackingNumber) => {
    try {
      await put(`/shipments/${shipmentId}`, { tracking_number: trackingNumber });
      success('Tracking number updated');
      fetchShipments();
    } catch (err) {
      showError('Failed to update tracking number');
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'urgent': return 'warning';
      default: return 'default';
    }
  };

  const exportShipments = () => {
    const csvContent = [
      ['Site', 'Item', 'Priority', 'Status', 'Tracking', 'Cost', 'Date Shipped'],
      ...shipments.map(s => [
        s.site?.location || 'N/A',
        s.what_is_being_shipped,
        s.shipping_priority,
        s.status,
        s.tracking_number || 'N/A',
        s.total_cost || 0,
        s.date_shipped || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipments_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <LoadingSpinner message="Loading shipments..." />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Shipping Management
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Typography variant="body2" color="textSecondary">
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchShipments}
            disabled={apiLoading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="h6">Date:</Typography>
            </Grid>
            <Grid item>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </Grid>
            <Grid item>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="shipped">Shipped</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="returned">Returned</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="all">All Priority</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddShipment}
              >
                Add Shipment
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={exportShipments}
              >
                Export
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Site</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tracking</TableCell>
                <TableCell>Cost</TableCell>
                <TableCell>Date Shipped</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.shipment_id} hover>
                  <TableCell>{shipment.site?.location || 'N/A'}</TableCell>
                  <TableCell>{shipment.what_is_being_shipped}</TableCell>
                  <TableCell>
                    <Chip
                      label={shipment.shipping_priority}
                      color={getPriorityColor(shipment.shipping_priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={shipment.status}
                      color={getStatusColor(shipment.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {shipment.tracking_number ? (
                      <Tooltip title="Click to update">
                        <Button
                          size="small"
                          onClick={() => {
                            const newTracking = prompt('Enter new tracking number:', shipment.tracking_number);
                            if (newTracking) {
                              handleUpdateTracking(shipment.shipment_id, newTracking);
                            }
                          }}
                        >
                          {shipment.tracking_number}
                        </Button>
                      </Tooltip>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>${shipment.total_cost || 0}</TableCell>
                  <TableCell>{shipment.date_shipped || 'N/A'}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditShipment(shipment)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteShipment(shipment.shipment_id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Shipment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingShipment ? 'Edit Shipment' : 'Add New Shipment'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Site ID"
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.shipping_priority}
                  onChange={(e) => setFormData({ ...formData, shipping_priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="What is being shipped"
                value={formData.what_is_being_shipped}
                onChange={(e) => setFormData({ ...formData, what_is_being_shipped: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Shipping Preference"
                value={formData.shipping_preference}
                onChange={(e) => setFormData({ ...formData, shipping_preference: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tracking Number"
                value={formData.tracking_number}
                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Charges Out"
                value={formData.charges_out}
                onChange={(e) => setFormData({ ...formData, charges_out: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Charges In"
                value={formData.charges_in}
                onChange={(e) => setFormData({ ...formData, charges_in: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Parts Cost"
                value={formData.parts_cost}
                onChange={(e) => setFormData({ ...formData, parts_cost: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveShipment} variant="contained">
            {editingShipment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ShippingManagement; 