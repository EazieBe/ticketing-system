import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  CircularProgress, Tooltip, Stack, Chip, Grid, Card, CardContent, Divider
} from '@mui/material';
import {
  Add as AddIcon, QrCode, QrCodeScanner, LocalShipping, TrendingUp, TrendingDown
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import { useDataSync } from './contexts/DataSyncContext';
import { getCurrentUTCTimestamp } from './utils/timezone';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InventoryForm from './InventoryForm';

function Inventory() {
  const { user } = useAuth();
  const api = useApi();
  const { success, error: showError } = useToast();
  const { updateTrigger } = useDataSync('inventory');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [labelDialog, setLabelDialog] = useState(false);
  const [labelItem, setLabelItem] = useState(null);
  const [scanDialog, setScanDialog] = useState(false);
  const [scanType, setScanType] = useState('in');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteItem, setNoteItem] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const barcodeRef = useRef(null);
  const loadingRef = useRef(false);
  const isMountedRef = useRef(true);

  const isAdminOrDispatcherOrBilling = user?.role === 'admin' || user?.role === 'dispatcher' || user?.role === 'billing';

  const fetchItems = useCallback(async (showLoading = true) => {
    try {
      loadingRef.current = true;
      if (showLoading) {
        setLoading(true);
      }
      const response = await api.get('/inventory/');
      setItems(response || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to fetch inventory');
      setItems([]);
    } finally {
      loadingRef.current = false;
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [api]);

  const fetchTransactionHistory = useCallback(async (itemId) => {
    // Don't fetch if component is unmounted
    if (!isMountedRef.current) {
      console.log('Component unmounted, skipping transaction history fetch');
      return;
    }
    
    try {
      const response = await api.get(`/inventory/${itemId}/transactions`);
      if (isMountedRef.current) {
        setTransactionHistory(response || []);
      }
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      if (isMountedRef.current) {
        setTransactionHistory([]);
      }
    }
  }, [api]);

  // Use global WebSocket for real-time updates via DataSync

  // Initial load with loading spinner
  useEffect(() => {
    fetchItems(true); // Show loading on initial load
  }, []); // Empty dependency array for initial load only

  // Auto-refresh when DataSync triggers update (no loading spinner)
  useEffect(() => {
    if (updateTrigger > 0) { // Only refresh on real-time updates, not initial load
      fetchItems(false); // Don't show loading on real-time updates
    }
  }, [updateTrigger]); // Only depend on updateTrigger

  useEffect(() => {
    if (labelDialog && labelItem && barcodeRef.current) {
      JsBarcode(barcodeRef.current, labelItem.barcode || labelItem.item_id, { format: 'CODE128', width: 2, height: 40 });
    }
  }, [labelDialog, labelItem]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleAdd = () => {
    setEditItem(null);
    setEditDialog(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setEditDialog(true);
  };

  const handleClose = () => {
    setEditDialog(false);
    setEditItem(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (editItem) {
        const response = await api.put(`/inventory/${editItem.item_id}`, values);
        setItems(prevItems => prevItems.map(i => 
          i.item_id === editItem.item_id ? response : i
        ));
        success('Inventory item updated successfully');
      } else {
        const response = await api.post('/inventory/', values);
        setItems(prevItems => [...prevItems, response]);
        success('Inventory item added successfully');
      }
      handleClose();
    } catch (err) {
      console.error('Error submitting inventory item:', err);
      showError('Failed to save inventory item');
    }
  };

  const handleScan = (type) => {
    setScanType(type);
    setScanDialog(true);
    setScannedBarcode('');
  };

  const handleScanSubmit = async () => {
    if (!scannedBarcode.trim()) {
      showError('Please enter a barcode');
      return;
    }

    try {
      const response = await api.post('/inventory/scan', {
        barcode: scannedBarcode.trim(),
        type: scanType,
        user_id: user.user_id
      });

      success(`${scanType === 'in' ? 'Scanned in' : 'Scanned out'} successfully`);
      setScanDialog(false);
      setScannedBarcode('');
      fetchItems(); // Refresh inventory
    } catch (err) {
      console.error('Error scanning barcode:', err);
      showError(err.response?.data?.detail || 'Failed to scan barcode');
    }
  };

  const handleLabel = (item) => {
    setLabelItem(item);
    setLabelDialog(true);
  };

  const handleLabelClose = () => {
    setLabelDialog(false);
    setLabelItem(null);
  };

  const handleDownloadLabel = async () => {
    if (barcodeRef.current) {
      const svg = barcodeRef.current;
      const parent = svg.parentNode;
      const canvas = await html2canvas(parent, { 
        backgroundColor: null,
        scale: 2 // Higher resolution
      });
      const link = document.createElement('a');
      link.download = `${labelItem.name || 'barcode'}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handlePrintLabel = async () => {
    if (barcodeRef.current) {
      const svg = barcodeRef.current;
      const parent = svg.parentNode;
      const canvas = await html2canvas(parent, { 
        backgroundColor: null,
        scale: 2 // Higher resolution
      });
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write('<html><head><title>Print Barcode</title></head><body>');
      printWindow.document.write(`<img src="${canvas.toDataURL()}" style="max-width: 100%; height: auto;" />`);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 1000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setCopyFeedback('Copy failed');
      setTimeout(() => setCopyFeedback(''), 1000);
    }
  };

  const handleQuickNote = (item) => {
    setNoteItem(item);
    setNoteText('');
    setNoteDialog(true);
  };

  const handleNoteSubmit = () => {
    const timestamp = getCurrentUTCTimestamp();
    const userEmail = user?.email || 'Unknown';
    const notePrefix = `[${timestamp}] ${userEmail}: `;
    const newDescription = (noteItem.description || '') + '\n' + notePrefix + noteText;
    
    api.put(`/inventory/${noteItem.item_id}`, { 
      name: noteItem.name,
      sku: noteItem.sku,
      description: newDescription,
      quantity_on_hand: noteItem.quantity_on_hand,
      cost: noteItem.cost,
      location: noteItem.location,
      barcode: noteItem.barcode
    })
      .then(() => {
        setNoteDialog(false);
        fetchItems();
        success('Note added successfully');
      })
      .catch(() => {
        showError('Failed to add note');
      });
  };

  const handleDelete = (item) => {
    setDeleteItem(item);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    api.delete(`/inventory/${deleteItem.item_id}`)
      .then(() => {
        setDeleteDialog(false);
        setItems(prevItems => prevItems.filter(i => i.item_id !== deleteItem.item_id));
        setDeleteItem(null);
        success('Inventory item deleted successfully');
      })
      .catch(() => {
        showError('Failed to delete inventory item');
      });
  };

  const handleViewHistory = async (item) => {
    setSelectedItem(item);
    await fetchTransactionHistory(item.item_id);
    setHistoryDialog(true);
  };

  // Color cue: highlight row if quantity_on_hand is low (<= 2)
  const getRowColor = (item) => {
    if (item.quantity_on_hand !== undefined && item.quantity_on_hand <= 2) return '#ffcdd2'; // red
    return '#fff';
  };

  const getQuantityStatus = (quantity) => {
    if (quantity <= 0) return { color: 'error', text: 'Out of Stock' };
    if (quantity <= 2) return { color: 'warning', text: 'Low Stock' };
    return { color: 'success', text: 'In Stock' };
  };

  if (!user) return <CircularProgress />;
  
  if (!isAdminOrDispatcherOrBilling) {
    return <Alert severity="warning">You do not have permission to view inventory data.</Alert>;
  }

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="h4" gutterBottom>Inventory Management</Typography>
      
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          startIcon={<QrCodeScanner />}
          onClick={() => handleScan('in')}
        >
          Scan In
        </Button>
        <Button 
          variant="contained" 
          color="secondary" 
          startIcon={<QrCodeScanner />}
          onClick={() => handleScan('out')}
        >
          Scan Out
        </Button>
        {isAdminOrDispatcherOrBilling && (
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleAdd}
          >
            Add Inventory
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Cost</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Barcode</TableCell>
              {isAdminOrDispatcherOrBilling && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => {
              const quantityStatus = getQuantityStatus(item.quantity_on_hand);
              return (
                <TableRow key={item.item_id} sx={{ bgcolor: getRowColor(item) }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {item.item_id}
                      </Typography>
                      <Tooltip title="Copy Item ID">
                        <IconButton size="small" onClick={() => handleCopy(item.item_id)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Quick Add Note">
                        <IconButton size="small" onClick={() => handleQuickNote(item)}>
                          <NoteAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isAdminOrDispatcherOrBilling && (
                        <Tooltip title="Delete Item">
                          <IconButton size="small" color="error" onClick={() => handleDelete(item)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <Tooltip title={item.description}>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.description}
                    </TableCell>
                  </Tooltip>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {item.quantity_on_hand}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={quantityStatus.text} 
                      color={quantityStatus.color} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('en-US', { 
                      style: 'currency', 
                      currency: 'USD' 
                    }).format(item.cost || 0)}
                  </TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.barcode && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {item.barcode}
                          </Typography>
                        </Box>
                      )}
                      {item.barcode && (
                        <Tooltip title="Copy Barcode">
                          <IconButton size="small" onClick={() => handleCopy(item.barcode)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  {isAdminOrDispatcherOrBilling && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Edit Item">
                          <IconButton onClick={() => handleEdit(item)} size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Generate Label">
                          <IconButton size="small" onClick={() => handleLabel(item)}>
                            <QrCode />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View History">
                          <IconButton size="small" onClick={() => handleViewHistory(item)}>
                            <TrendingUp />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={editDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editItem ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
        <DialogContent>
          <InventoryForm initialValues={editItem} onSubmit={handleSubmit} isEdit={!!editItem} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Scan Dialog */}
      <Dialog open={scanDialog} onClose={() => setScanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {scanType === 'in' ? 'Scan In' : 'Scan Out'} - Barcode Scanner
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Barcode"
              value={scannedBarcode}
              onChange={(e) => setScannedBarcode(e.target.value)}
              placeholder="Enter or scan barcode..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleScanSubmit();
                }
              }}
            />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Press Enter to submit or use a barcode scanner
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialog(false)}>Cancel</Button>
          <Button onClick={handleScanSubmit} variant="contained">
            {scanType === 'in' ? 'Scan In' : 'Scan Out'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Label Dialog */}
      <Dialog open={labelDialog} onClose={handleLabelClose} maxWidth="xs" fullWidth>
        <DialogTitle>Barcode Label</DialogTitle>
        <DialogContent>
          {labelItem && (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="subtitle1">{labelItem.name}</Typography>
              <svg ref={barcodeRef}></svg>
              <Typography variant="body2">{labelItem.barcode || labelItem.item_id}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDownloadLabel}>Download</Button>
          <Button onClick={handlePrintLabel}>Print</Button>
          <Button onClick={handleLabelClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={historyDialog} onClose={() => setHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Transaction History - {selectedItem?.name}
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">Current Stock</Typography>
                      <Typography variant="h4" color="primary">
                        {selectedItem.quantity_on_hand}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">Status</Typography>
                      <Chip 
                        label={getQuantityStatus(selectedItem.quantity_on_hand).text} 
                        color={getQuantityStatus(selectedItem.quantity_on_hand).color} 
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Typography variant="h6" sx={{ mb: 2 }}>Recent Transactions</Typography>
              {transactionHistory.length === 0 ? (
                <Typography color="textSecondary">No transaction history found.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactionHistory.map((transaction) => (
                        <TableRow key={transaction.transaction_id}>
                          <TableCell>
                            {new Date(transaction.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={transaction.type === 'in' ? <TrendingUp /> : <TrendingDown />}
                              label={transaction.type === 'in' ? 'In' : 'Out'}
                              color={transaction.type === 'in' ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{transaction.quantity}</TableCell>
                          <TableCell>{transaction.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteDialog} onClose={() => setNoteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Quick Add Note</DialogTitle>
        <DialogContent>
          <TextField 
            label="Note" 
            value={noteText} 
            onChange={e => setNoteText(e.target.value)} 
            fullWidth 
            multiline 
            minRows={3} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(false)}>Cancel</Button>
          <Button onClick={handleNoteSubmit} variant="contained">Add Note</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete inventory item "{deleteItem?.name}" (SKU: {deleteItem?.sku})?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {copyFeedback && (
        <Alert severity="success" sx={{ position: 'fixed', top: 80, right: 40, zIndex: 2000 }}>
          {copyFeedback}
        </Alert>
      )}
    </>
  );
}

export default Inventory; 