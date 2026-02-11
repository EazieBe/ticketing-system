import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Box, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, Tooltip, TextField, Checkbox, FormControlLabel,
  InputAdornment
} from '@mui/material';
import {
  Add, Edit, Delete, Visibility, LocalShipping, Schedule, CheckCircle, Cancel, Warning,
  OpenInNew, Update, Search
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useThemeTokens from './hooks/useThemeTokens';
import StatusChip from './components/StatusChip';
import PriorityChip from './components/PriorityChip';
import CompactShipmentForm from './CompactShipmentForm';
import { useDataSync } from './contexts/DataSyncContext';
import { TimestampDisplay } from './components/TimestampDisplay';
import { canDelete } from './utils/permissions';

function CompactShipments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const { tableHeaderBg, rowHoverBg } = useThemeTokens();
  const { success, error: showError } = useToast();
  const { updateTrigger } = useDataSync('shipments');
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialog, setAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteShipment, setDeleteShipment] = useState(null);
  const [statusDialog, setStatusDialog] = useState(false);
  const [statusShipment, setStatusShipment] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: 'pending',
    tracking_number: '',
    return_tracking: '',
    charges_out: '',
    charges_in: ''
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadingRef = useRef(false);
  const wsDebounceRef = useRef(0);

  const fetchShipments = useCallback(async (includeArchived = showArchived) => {
    if (loadingRef.current) return; // Prevent concurrent fetches
    if (!api || !api.get) {
      console.error('API not initialized');
      return;
    }
    try {
      loadingRef.current = true;
      setLoading(true);
      const response = await api.get(`/shipments/?include_archived=${includeArchived ? 'true' : 'false'}`);
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
    fetchShipments(); // Show loading on initial load
  }, []); // Only run once on mount

  // Auto-refresh when DataSync triggers update (no loading spinner)
  useEffect(() => {
    if (updateTrigger && updateTrigger > 0) { // Only refresh on real-time updates, not initial load
      fetchShipments(); // Don't show loading on real-time updates
    }
  }, [updateTrigger]); // Only depend on updateTrigger

  // Handle showArchived change
  useEffect(() => {
    fetchShipments(showArchived);
  }, [showArchived]); // Remove fetchShipments dependency to prevent loops

  const handleAddShipment = () => {
    setAddDialog(true);
  };

  const handleEdit = (shipment) => {
    // Navigate to the edit URL instead of opening a dialog
    navigate(`/shipments/${shipment.shipment_id}/edit`);
  };

  const handleClose = () => {
    setAddDialog(false);
  };

  const handleSubmit = async (values) => {
    if (!api || !api.post) {
      console.error('API not initialized');
      showError('API not initialized');
      return;
    }
    try {
      const response = await api.post('/shipments/', values);
      // Refresh the shipments list to get the complete data with items
      await fetchShipments();
      success('Shipment added successfully');
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
      return_tracking: shipment.return_tracking || '',
      charges_out: shipment.charges_out || '',
      charges_in: shipment.charges_in || ''
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
      // Prepare payload, converting empty strings to null for optional fields
      const payload = {
        status: statusUpdate.status,
        tracking_number: statusUpdate.tracking_number || null,
        return_tracking: statusUpdate.return_tracking || null,
        charges_out: statusUpdate.charges_out === '' ? null : (statusUpdate.charges_out ? parseFloat(statusUpdate.charges_out) : null),
        charges_in: statusUpdate.charges_in === '' ? null : (statusUpdate.charges_in ? parseFloat(statusUpdate.charges_in) : null)
      };
      const response = await api.patch(`/shipments/${statusShipment.shipment_id}/status`, payload);
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
    // Status filter
    if (filterStatus !== 'all' && shipment.status !== filterStatus) return false;
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        shipment.shipment_id?.toLowerCase().includes(searchLower) ||
        shipment.site_id?.toLowerCase().includes(searchLower) ||
        shipment.what_is_being_shipped?.toLowerCase().includes(searchLower) ||
        shipment.tracking_number?.toLowerCase().includes(searchLower) ||
        shipment.return_tracking?.toLowerCase().includes(searchLower) ||
        (shipment.shipment_items && shipment.shipment_items.some(item => 
          item.what_is_being_shipped?.toLowerCase().includes(searchLower)
        ))
      );
    }
    
    return true;
  });

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '0.95rem' }} gutterBottom>Shipments</Typography>
      
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={handleAddShipment} startIcon={<Add />}>
          Add Shipment
        </Button>
        
        <TextField
          size="small"
          placeholder="Search shipments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ 
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> 
          }}
          sx={{ width: 200, '& input': { py: 0.5, fontSize: '0.875rem' } }}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Status Filter"
            sx={{ fontSize: '0.875rem', height: 32 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="shipped">Shipped</MenuItem>
            <MenuItem value="delivered">Delivered</MenuItem>
            <MenuItem value="returned">Returned</MenuItem>
          </Select>
        </FormControl>
        
        <FormControlLabel 
          control={<Checkbox checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />} 
          label="Show archived" 
        />
      </Box>

      <TableContainer component={Paper}>
        <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem' } }}>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: tableHeaderBg, fontWeight: 'bold', borderBottom: 2, borderColor: 'primary.main' } }}>
              <TableCell sx={{ width: 100 }}>Shipment ID</TableCell>
              <TableCell sx={{ width: 80 }}>Site</TableCell>
              <TableCell>What is Being Shipped</TableCell>
              <TableCell sx={{ width: 60 }}>Qty</TableCell>
              <TableCell sx={{ width: 80 }}>Status</TableCell>
              <TableCell sx={{ width: 70 }}>Priority</TableCell>
              <TableCell sx={{ width: 80 }}>Charges Out</TableCell>
              <TableCell sx={{ width: 80 }}>Charges In</TableCell>
              <TableCell sx={{ width: 80 }}>Parts Cost</TableCell>
              <TableCell sx={{ width: 100 }}>Tracking</TableCell>
              <TableCell sx={{ width: 80 }}>Date Created</TableCell>
              <TableCell sx={{ width: 80 }}>Date Shipped</TableCell>
              <TableCell sx={{ width: 120 }}>Actions</TableCell>
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
                hover
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: rowHoverBg }
                }}
                onClick={() => handleEdit(shipment)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
                    {shipment.shipment_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    {shipment.site_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ maxWidth: 200 }}>
                    {shipment.shipment_items && shipment.shipment_items.length > 0 ? (
                      shipment.shipment_items.map((item, index) => (
                        <Typography key={index} variant="body2" sx={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          fontSize: '0.75rem',
                          mb: index < shipment.shipment_items.length - 1 ? 0.5 : 0
                        }}>
                          {item.quantity}x {item.what_is_being_shipped}
                        </Typography>
                      ))
                    ) : (
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem' }}>
                        {shipment.what_is_being_shipped || 'No items'}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {shipment.shipment_items && shipment.shipment_items.length > 0 
                    ? shipment.shipment_items.reduce((total, item) => total + (item.quantity || 1), 0)
                    : (shipment.quantity ?? 1)
                  }
                </TableCell>
                <TableCell>
                  <StatusChip status={shipment.status || 'pending'} entityType="shipment" size="small" />
                </TableCell>
                <TableCell>
                  <PriorityChip priority={shipment.shipping_priority || 'normal'} type="shipment" size="small" />
                </TableCell>
                <TableCell>{formatCurrency(shipment.charges_out)}</TableCell>
                <TableCell>{formatCurrency(shipment.charges_in)}</TableCell>
                <TableCell>{formatCurrency(shipment.parts_cost)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {shipment.tracking_number && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>
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
                        <Typography variant="caption" sx={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>
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
                    {shipment.status === 'shipped' && (
                      <Tooltip title={shipment.archived ? 'Unarchive' : 'Archive'}>
                        <IconButton
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const updated = await api.patch(`/shipments/${shipment.shipment_id}/archive?archived=${shipment.archived ? 'false' : 'true'}`);
                              setShipments(prev => prev.map(s => s.shipment_id === shipment.shipment_id ? updated : s));
                              success(shipment.archived ? 'Shipment unarchived' : 'Shipment archived');
                            } catch (err) {
                              showError('Failed to update archive status');
                            }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete(user) && (
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
                    )}
                  </Box>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Dialog */}
      <Dialog open={addDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Add New Shipment</DialogTitle>
        <DialogContent>
          <CompactShipmentForm 
            initialValues={{}} 
            onSubmit={handleSubmit} 
            isEdit={false}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete shipment "{deleteShipment?.shipment_id}" for site {deleteShipment?.site_id}?
            {deleteShipment?.shipment_items && deleteShipment.shipment_items.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Items: {deleteShipment.shipment_items.map(item => `${item.quantity}x ${item.what_is_being_shipped}`).join(', ')}
                </Typography>
              </Box>
            )}
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
            
            <TextField
              fullWidth
              type="number"
              label="Charges Out"
              value={statusUpdate.charges_out}
              onChange={(e) => setStatusUpdate(prev => ({ ...prev, charges_out: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
            
            <TextField
              fullWidth
              type="number"
              label="Charges In"
              value={statusUpdate.charges_in}
              onChange={(e) => setStatusUpdate(prev => ({ ...prev, charges_in: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
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

export default CompactShipments;