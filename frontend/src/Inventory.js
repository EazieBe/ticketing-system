import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Box, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  CircularProgress, Tooltip, Stack
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useWebSocket from './hooks/useWebSocket';
import { useRef } from 'react';
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
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [labelDialog, setLabelDialog] = useState(false);
  const [labelItem, setLabelItem] = useState(null);
  const [scanDialog, setScanDialog] = useState(false);
  const [scanType, setScanType] = useState('in');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteItem, setNoteItem] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  const barcodeRef = useRef(null);

  // WebSocket setup - will be configured after fetchItems is defined

  const isAdminOrDispatcherOrBilling = user?.role === 'admin' || user?.role === 'dispatcher' || user?.role === 'billing';

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory/');
      setItems(response || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to fetch inventory');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // WebSocket callback functions - defined after fetchItems
  const handleWebSocketMessage = useCallback((data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'inventory_update' || message.type === 'inventory_created' || message.type === 'inventory_deleted') {
        fetchItems(); // Refresh inventory when there's an update
      }
    } catch (e) {
      // Handle non-JSON messages
    }
  }, [fetchItems]);

  const { isConnected } = useWebSocket(`ws://192.168.43.50:8000/ws/updates`, handleWebSocketMessage);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (labelDialog && labelItem && barcodeRef.current) {
      JsBarcode(barcodeRef.current, labelItem.barcode || labelItem.item_id, { format: 'CODE128', width: 2, height: 40 });
    }
  }, [labelDialog, labelItem]);

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
        showToast('Inventory item updated successfully', 'success');
      } else {
        const response = await api.post('/inventory/', values);
        setItems(prevItems => [...prevItems, response]);
        showToast('Inventory item added successfully', 'success');
      }
      handleClose();
    } catch (err) {
      console.error('Error submitting inventory item:', err);
      setError('Failed to save inventory item');
      showToast('Failed to save inventory item', 'error');
    }
  };

  const handleScan = (type) => {
    setScanType(type);
    setScanDialog(true);
    setScannedBarcode('');
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
      const canvas = await html2canvas(parent, { backgroundColor: null });
      const link = document.createElement('a');
      link.download = `${labelItem.name || 'barcode'}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handlePrintLabel = () => {
    if (barcodeRef.current) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write('<html><head><title>Print Barcode</title></head><body>');
      printWindow.document.write(barcodeRef.current.parentNode.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(''), 1000);
  };

  const handleQuickNote = (item) => {
    setNoteItem(item);
    setNoteText('');
    setNoteDialog(true);
  };

  const handleNoteSubmit = () => {
    api.put(`/inventory/${noteItem.item_id}`, { 
      name: noteItem.name,
      sku: noteItem.sku,
      description: (noteItem.description || '') + '\n' + noteText,
      quantity_on_hand: noteItem.quantity_on_hand,
      cost: noteItem.cost,
      location: noteItem.location,
      barcode: noteItem.barcode
    })
      .then(() => {
        setNoteDialog(false);
        setLoading(true);
      })
      .catch(() => setError('Failed to add note'));
  };

  const handleDelete = (item) => {
    setDeleteItem(item);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    api.delete(`/inventory/${deleteItem.item_id}`, { data: {} })
      .then(() => {
        setDeleteDialog(false);
        // Remove the inventory item from the local state immediately
        setItems(prevItems => prevItems.filter(i => i.item_id !== deleteItem.item_id));
        setDeleteItem(null);
        setError(null);
      })
      .catch(() => setError('Failed to delete inventory item'));
  };

  // Color cue: highlight row if quantity_on_hand is low (<= 2)
  const getRowColor = (item) => {
    if (item.quantity_on_hand !== undefined && item.quantity_on_hand <= 2) return '#ffcdd2'; // red
    return '#fff';
  };

  if (!isAdminOrDispatcherOrBilling) {
    return <Alert severity="warning">You do not have permission to view inventory data.</Alert>;
  }


  return (
    <>
      <Typography variant="h4" gutterBottom>Inventory</Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => handleScan('in')}>Scan In</Button>
        <Button variant="contained" color="secondary" onClick={() => handleScan('out')}>Scan Out</Button>
      </Stack>
      {isAdminOrDispatcherOrBilling && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ mb: 2 }}>Add Inventory</Button>
      )}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Cost</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Barcode</TableCell>
              {isAdminOrDispatcherOrBilling && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.item_id} sx={{ bgcolor: getRowColor(item) }} aria-label={`Inventory item ${item.item_id}`}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.item_id}
                    <Tooltip title="Copy Item ID"><IconButton size="small" onClick={() => handleCopy(item.item_id)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Quick Add Note"><IconButton size="small" onClick={() => handleQuickNote(item)}><NoteAddIcon fontSize="inherit" /></IconButton></Tooltip>
                    {isAdminOrDispatcherOrBilling && (
                      <Tooltip title="Delete Item"><IconButton size="small" color="error" onClick={() => handleDelete(item)}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.sku}</TableCell>
                <Tooltip title={item.description}><TableCell>{item.description}</TableCell></Tooltip>
                <TableCell>{item.quantity_on_hand}</TableCell>
                <TableCell>{item.cost}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.barcode}
                    {item.barcode && (
                      <Tooltip title="Copy Barcode"><IconButton size="small" onClick={() => handleCopy(item.barcode)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                    )}
                  </Box>
                </TableCell>
                {isAdminOrDispatcherOrBilling && (
                  <TableCell>
                    <Tooltip title="Edit Item"><IconButton onClick={() => handleEdit(item)} size="small"><EditIcon /></IconButton></Tooltip>
                    <Tooltip title="Generate Label"><Button size="small" onClick={() => handleLabel(item)}>Generate Label</Button></Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={editDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
        <DialogContent>
          <InventoryForm initialValues={editItem} onSubmit={handleSubmit} isEdit={!!editItem} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={scanDialog} onClose={() => setScanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Scan Barcode ({scanType === 'in' ? 'Scan In' : 'Scan Out'})</DialogTitle>
        <DialogContent>
          {/* <BarcodeScannerComponent width={400} height={200} onUpdate={} /> */}
          {/* {scannedBarcode && <Typography sx={{ mt: 2 }}>Scanned: {scannedBarcode}</Typography>} */}
          {/* {scanFeedback && <Alert severity={scanFeedback.includes('success') ? 'success' : 'error'} sx={{ mt: 2 }}>{}</Alert>} */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
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
      {copyFeedback && <Alert severity="success" sx={{ position: 'fixed', top: 80, right: 40, zIndex: 2000 }}>{copyFeedback}</Alert>}
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
          <Typography>Are you sure you want to delete inventory item "{deleteItem?.name}" (SKU: {deleteItem?.sku})?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Inventory; 