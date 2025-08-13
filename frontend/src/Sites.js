import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Typography, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, IconButton, TextField, Box, Tooltip, Chip, ToggleButton, 
  ToggleButtonGroup, FormControl, InputLabel, Select, MenuItem, Card, CardContent,
  Grid, Divider, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import FilterListIcon from '@mui/icons-material/FilterList';
import StoreIcon from '@mui/icons-material/Store';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SiteForm from './SiteForm';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';

function Sites() {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [editSite, setEditSite] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteSite, setDeleteSite] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [csvImportDialog, setCsvImportDialog] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  const handleCopyIP = async (ipAddress) => {
    try {
      // Fallback for older browsers
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(ipAddress);
      } else {
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = ipAddress;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopySuccess(ipAddress);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy IP address:', err);
      // Try fallback method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = ipAddress;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        setCopySuccess(ipAddress);
        setTimeout(() => setCopySuccess(''), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
      }
    }
  };

  const fetchSites = useCallback(async () => {
    try {
      console.log('Fetching sites...');
      const response = await api.get('/sites/');
      console.log('Raw response:', response);
      console.log('Response data:', response.data);
      // The response itself is the sites array
      const sitesArray = Array.isArray(response) ? response : 
                        Array.isArray(response.data) ? response.data : [];
      console.log('Fetched sites:', sitesArray.length, 'sites');
      console.log('First site:', sitesArray[0]);
      setSites(sitesArray);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching sites:', err);
      console.error('Error response:', err.response);
      setError('Failed to load sites');
      setSites([]);
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const handleAdd = () => {
    setEditSite(null);
    setOpen(true);
  };

  const handleEdit = (site) => {
    setEditSite(site);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditSite(null);
  };

  const handleSubmit = (values) => {
    if (editSite) {
      api.put(`/sites/${editSite.site_id}`, values)
        .then((response) => {
          // Update the site in the local state immediately
          setSites(prevSites => prevSites.map(s => 
            s.site_id === editSite.site_id ? response.data : s
          ));
          handleClose();
          setError(null);
        })
        .catch((err) => {
          console.error('Update site error:', err);
          if (err.response?.status === 401) {
            setError('Authentication failed. Please log in again.');
          } else {
            setError(`Failed to update site: ${err.response?.data?.detail || err.message}`);
          }
        });
    } else {
      api.post('/sites/', values)
        .then((response) => {
          // Add the new site to the local state immediately
          setSites(prevSites => [...prevSites, response.data]);
          handleClose();
          setError(null);
        })
        .catch((err) => {
          console.error('Add site error:', err);
          if (err.response?.status === 401) {
            setError('Authentication failed. Please log in again.');
          } else {
            setError(`Failed to add site: ${err.response?.data?.detail || err.message}`);
          }
        });
    }
  };

  const handleDelete = (site) => {
    setDeleteSite(site);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteSite) return;
    
    api.delete(`/sites/${deleteSite.site_id}`, { data: {} })
      .then(() => {
        setDeleteDialog(false);
        // Remove the site from the local state immediately
        setSites(prevSites => prevSites.filter(s => s.site_id !== deleteSite.site_id));
        setDeleteSite(null);
        setError(null);
      })
      .catch((err) => {
        console.error('Delete site error:', err);
        if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError(`Failed to delete site: ${err.response?.data?.detail || err.message}`);
        }
      });
  };

  const handleExportCSV = () => {
    // Match the exact format shown in the image
    const headers = ['Site#', 'IP: Address', 'Location', 'Brand', 'Main Number', 'MP', 'Service Address', 'City', 'State', 'Zip'];
    const csvContent = [
      headers.join(','),
      ...sites.map(site => [
        site.site_id || '',
        site.ip_address || '',
        site.location || '',
        site.brand || '',
        site.main_number || '',
        site.mp || '',
        site.service_address || '',
        site.city || '',
        site.state || '',
        site.zip || ''
      ].map(value => `"${value.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sites_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (file) => {
    if (!file || file.type !== 'text/csv') {
      setError('Please select a valid CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setCsvData(content);
      handleImportCSV(content);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // U.S. Census Bureau Regional Divisions for auto-population
  const REGIONAL_DIVISIONS = {
    'Northeast': {
      'New England': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT'],
      'Mid-Atlantic': ['NJ', 'NY', 'PA']
    },
    'Midwest': {
      'East North Central': ['IL', 'IN', 'MI', 'OH', 'WI'],
      'West North Central': ['IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD']
    },
    'South': {
      'South Atlantic': ['DE', 'DC', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV'],
      'East South Central': ['AL', 'KY', 'MS', 'TN'],
      'West South Central': ['AR', 'LA', 'OK', 'TX']
    },
    'West': {
      'Mountain': ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY'],
      'Pacific': ['AK', 'CA', 'HI', 'OR', 'WA']
    }
  };

  const STATE_NAMES_TO_CODES = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
  };

  const getRegionFromState = (stateName) => {
    // Convert full state name to code if needed
    let stateCode = stateName;
    if (stateName.length > 2) {
      stateCode = STATE_NAMES_TO_CODES[stateName] || stateName;
    }
    
    for (const [region, divisions] of Object.entries(REGIONAL_DIVISIONS)) {
      for (const [division, states] of Object.entries(divisions)) {
        if (states.includes(stateCode)) {
          return `${region} - ${division}`;
        }
      }
    }
    return '';
  };

  const handleImportCSV = (data = csvData) => {
    if (!data.trim()) return;
    
    const lines = data.trim().split('\n');
    const sitesToImport = [];
    const errors = [];
    
    // Check if first line contains headers or data
    const firstLine = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const hasHeaders = firstLine[0] === 'Site#' || firstLine[0] === 'site_id' || firstLine[0].toLowerCase().includes('site');
    
    const startIndex = hasHeaders ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const site = {};
      
      // Map values to fields based on position (assuming standard order)
      if (values[0]) site.site_id = values[0];           // Site#
      if (values[1]) site.ip_address = values[1];        // IP: Address
      if (values[2]) site.location = values[2];          // Location
      if (values[3]) site.brand = values[3];             // Brand
      if (values[4]) site.main_number = values[4];       // Main Number
      if (values[5]) site.mp = values[5];                // MP
      if (values[6]) site.service_address = values[6];   // Service Address
      if (values[7]) site.city = values[7];              // City
      if (values[8]) site.state = values[8];             // State
      if (values[9]) site.zip = values[9];               // Zip
      
      // Auto-populate region based on state
      if (site.state) {
        site.region = getRegionFromState(site.state);
      }
      
      if (site.location) {
        sitesToImport.push(site);
      } else {
        errors.push(`Row ${i + 1}: Missing required field 'Location'`);
      }
    }
    
    setImportPreview(sitesToImport);
    setImportErrors(errors);
  };

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) return;
    
    try {
      const importPromises = importPreview.map(site => 
        api.post('/sites/', site).catch(err => ({ error: err, site }))
      );
      
      await Promise.all(importPromises);
      setCsvImportDialog(false);
      setCsvData('');
      setImportPreview([]);
      setImportErrors([]);
      setSelectedFile(null);
      fetchSites();
    } catch (err) {
      setError('Failed to import sites');
    }
  };

  const filteredSites = (Array.isArray(sites) ? sites : []).filter(site => {
    if (!site || typeof site !== 'object') return false;
    
    const matchesRegion = !filterRegion || site.region === filterRegion;
    const matchesSearch = !searchTerm || 
      (site.location && site.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (site.city && site.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (site.state && site.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (site.site_id && site.site_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesRegion && matchesSearch;
  }).sort((a, b) => {
    // Sort by site_id numerically
    const aNum = parseInt((a.site_id || '').replace(/\D/g, '')) || 0;
    const bNum = parseInt((b.site_id || '').replace(/\D/g, '')) || 0;
    return aNum - bNum;
  });

  const regions = [...new Set((Array.isArray(sites) ? sites : []).map(site => site?.region).filter(Boolean))];

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error" action={<Button color="inherit" size="small" onClick={fetchSites}>Retry</Button>}>{error}</Alert>;

  return (
    <Box sx={{ 
      bgcolor: darkMode ? '#121212' : 'background.default',
      color: darkMode ? 'white' : 'text.primary',
      minHeight: '100vh',
      p: 2
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          color: darkMode ? 'white' : 'text.primary',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <StoreIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          Sites ({filteredSites.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ToggleButtonGroup
            value={darkMode ? 'dark' : 'light'}
            exclusive
            onChange={(e, value) => setDarkMode(value === 'dark')}
            size="small"
          >
            <ToggleButton value="light">
              <LightModeIcon />
            </ToggleButton>
            <ToggleButton value="dark">
              <DarkModeIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setCsvImportDialog(true)}
            sx={{ borderRadius: 2 }}
          >
            Import CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{ borderRadius: 2 }}
          >
            Export CSV
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleAdd}
            sx={{ borderRadius: 2 }}
          >
            Add Site
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Search sites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Region</InputLabel>
                <Select
                  value={filterRegion}
                  label="Filter by Region"
                  onChange={(e) => setFilterRegion(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All Regions</MenuItem>
                  {regions.map((region) => (
                    <MenuItem key={region} value={region}>
                      {region}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sites Table */}
      <TableContainer component={Paper} sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Site#</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>IP Address</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Location</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Brand</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Main Number</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>MP</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Service Address</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>City/State</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No sites found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSites.map((site) => (
                <TableRow key={site.site_id} hover>
                  <TableCell>
                    <Button
                      component={Link}
                      to={`/sites/${site.site_id}`}
                      sx={{ 
                        textTransform: 'none', 
                        p: 0, 
                        minWidth: 'auto',
                        fontWeight: 600,
                        color: 'primary.main',
                        textDecoration: 'underline'
                      }}
                    >
                      {site.site_id}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {site.ip_address ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {site.ip_address}
                        </Typography>
                        <Tooltip title="Copy IP Address">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyIP(site.ip_address)}
                            sx={{ 
                              color: copySuccess === site.ip_address ? 'success.main' : 'primary.main',
                              '&:hover': { color: 'success.main' }
                            }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <LocationOnIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {site.location}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {site.brand || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {site.main_number || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {site.mp || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {site.service_address || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {site.city && site.state ? `${site.city}, ${site.state}` : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Edit Site">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(site)}
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Site">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(site)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon />
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

      {/* Site Form Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editSite ? 'Edit Site' : 'Add New Site'}
        </DialogTitle>
        <DialogContent>
          <SiteForm
            initialValues={editSite || {}}
            onSubmit={handleSubmit}
            isEdit={!!editSite}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Site</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete site "{deleteSite?.location}" ({deleteSite?.site_id})? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteConfirm}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvImportDialog} onClose={() => setCsvImportDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Import Sites from CSV</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a CSV file with the following columns: Site#, IP: Address, Location, Brand, Main Number, MP, Service Address, City, State, Zip
          </Typography>
          
          {/* File Upload Area */}
          <Box
            sx={{
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: dragActive ? 'primary.50' : 'grey.50',
              mb: 2,
              transition: 'all 0.2s ease'
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Drop your CSV file here
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              or click to browse
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                  setSelectedFile(e.target.files[0]);
                }
              }}
              style={{ display: 'none' }}
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input">
              <Button variant="outlined" component="span">
                Choose File
              </Button>
            </label>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                Selected: {selectedFile.name}
              </Typography>
            )}
          </Box>
          
          {/* Alternative: Paste CSV */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Or paste CSV data:</Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Paste CSV data here"
            placeholder="Site#,IP: Address,Location,Brand,Main Number,MP,Service Address,City,State,Zip&#10;3001,10.220.2.237,I-Drive Fl,Bahama Breeze,407-242-2499,Christopher Bass,8849 International Drive,Orlando,Florida,32819-9320"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Button 
            variant="outlined" 
            onClick={() => handleImportCSV()}
            sx={{ mb: 2 }}
          >
            Preview Import
          </Button>
          
          {importPreview.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Import Preview ({importPreview.length} sites)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Site#</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Brand</TableCell>
                      <TableCell>City/State</TableCell>
                      <TableCell>MP</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importPreview.map((site, index) => (
                      <TableRow key={index}>
                        <TableCell>{site.site_id}</TableCell>
                        <TableCell>{site.location}</TableCell>
                        <TableCell>{site.brand || 'N/A'}</TableCell>
                        <TableCell>{site.city && site.state ? `${site.city}, ${site.state}` : 'N/A'}</TableCell>
                        <TableCell>{site.mp || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          
          {importErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Import Errors:</Typography>
              {importErrors.map((error, index) => (
                <Typography key={index} variant="body2">• {error}</Typography>
              ))}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCsvImportDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleImportConfirm}
            disabled={importPreview.length === 0 || importErrors.length > 0}
          >
            Import {importPreview.length} Sites
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Success Notification */}
      <Snackbar
        open={!!copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess('')}
        message={`IP address ${copySuccess} copied to clipboard!`}
      />
    </Box>
  );
}

export default Sites;