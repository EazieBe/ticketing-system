import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert,
  CircularProgress, Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip
} from '@mui/material';
import {
  Upload, Download, CheckCircle, Error, Info, Warning, Delete, Visibility
} from '@mui/icons-material';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import useApi from '../hooks/useApi';

const CSVImport = ({ open, onClose, onSuccess, title = "Import CSV", endpoint, templateData }) => {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setError(null);
      setImportResult(null);
    } else {
      setError('Please select a valid CSV file');
      setSelectedFile(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      setError('Please select a CSV file');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((response) => {
      setImportResult(response.data);
      if (onSuccess) {
        onSuccess(response.data);
      }
      setImporting(false);
      setError(null);
    })
    .catch((err) => {
      setError(err.response?.data?.detail || 'Failed to import CSV');
      setImporting(false);
    });
  };

  const handleDownloadTemplate = () => {
    if (!templateData) return;
    
    const csvContent = templateData;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a CSV file with the required information. Make sure your file has the correct column headers.
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <input
            accept=".csv"
            style={{ display: 'none' }}
            id="csv-file-input"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="csv-file-input">
            <Button variant="outlined" component="span" startIcon={<Upload />}>
              Select CSV File
            </Button>
          </label>
          {selectedFile && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected: {selectedFile.name}
            </Typography>
          )}
        </Box>

        {templateData && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadTemplate}
            >
              Download Template
            </Button>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {importResult && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="h6">Import Complete!</Typography>
            <Typography variant="body2">
              Successfully imported {importResult.imported_count} records
            </Typography>
            {importResult.errors && importResult.errors.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="error">
                  Errors ({importResult.errors.length}):
                </Typography>
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  {importResult.errors.slice(0, 5).map((error, index) => (
                    <li key={index} style={{ fontSize: '12px' }}>
                      {error}
                    </li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li style={{ fontSize: '12px' }}>
                      ... and {importResult.errors.length - 5} more errors
                    </li>
                  )}
                </ul>
              </Box>
            )}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleImport} 
          variant="contained" 
          disabled={!selectedFile || importing}
          startIcon={importing ? <CircularProgress size={16} /> : <Upload />}
        >
          {importing ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CSVImport; 