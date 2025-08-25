import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Card, CardContent, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Button, Alert, CircularProgress, Grid,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Badge, Tooltip, Stack,
  FormControl, InputLabel, Select, MenuItem, Divider
} from '@mui/material';
import {
  LocationOn, Phone, Email, Person, Schedule, CheckCircle, Cancel, Warning,
  LocalShipping, Build, Inventory, Flag, FlagOutlined, Star, StarBorder,
  Notifications, NotificationsOff, ExpandMore, ExpandLess, FilterList, Sort,
  DragIndicator, Speed, AutoAwesome, Info, Business, Assignment, ZoomIn, ZoomOut, MyLocation, Refresh, Directions
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useWebSocket from './hooks/useWebSocket';
import dayjs from 'dayjs';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FieldTechMap.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon for field techs
const techIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #1976d2; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

// Map controls component
function MapControls({ onZoomIn, onZoomOut, onCenterMap }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}
    >
      <IconButton
        onClick={onZoomIn}
        sx={{ bgcolor: 'white', boxShadow: 2, '&:hover': { bgcolor: 'grey.100' } }}
      >
        <ZoomIn />
      </IconButton>
      <IconButton
        onClick={onZoomOut}
        sx={{ bgcolor: 'white', boxShadow: 2, '&:hover': { bgcolor: 'grey.100' } }}
      >
        <ZoomOut />
      </IconButton>
      <IconButton
        onClick={onCenterMap}
        sx={{ bgcolor: 'white', boxShadow: 2, '&:hover': { bgcolor: 'grey.100' } }}
      >
        <MyLocation />
      </IconButton>
    </Box>
  );
}

// Map bounds updater component
function MapBoundsUpdater({ techsWithCoords, mapCenter, mapZoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (techsWithCoords.length > 0) {
      const bounds = L.latLngBounds(techsWithCoords.map(tech => tech.coordinates));
      map.fitBounds(bounds, { padding: [20, 20] });
    } else {
      map.setView([mapCenter.lat, mapCenter.lng], mapZoom);
    }
  }, [techsWithCoords, mapCenter, mapZoom, map]);

  return null;
}

function FieldTechMap() {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTech, setSelectedTech] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Center of US
  const [mapZoom, setMapZoom] = useState(4);
  const [mapRef, setMapRef] = useState(null);
  const [filterState, setFilterState] = useState('');

  // WebSocket setup - will be configured after fetchTechs is defined

  const fetchTechs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/fieldtechs/');
      
      const techsWithCoords = await Promise.all(
        (response || []).map(async (tech) => {
          if (tech.city && tech.state) {
            const coords = await geocodeAddress(`${tech.city}, ${tech.state}`);
            return { ...tech, coordinates: coords };
          }
          return { ...tech, coordinates: null };
        })
      );
      
      setTechs(techsWithCoords);
      setError(null);
    } catch (err) {
      setError('Failed to fetch field techs');
      console.error('Error fetching techs:', err);
      setTechs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket callback functions - defined after fetchTechs
  const handleWebSocketMessage = useCallback((data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'fieldtech_update' || message.type === 'fieldtech_created' || message.type === 'fieldtech_deleted') {
        // Use a timeout to avoid calling fetchTechs before it's defined
        setTimeout(() => {
          if (typeof fetchTechs === 'function') {
            fetchTechs();
          }
        }, 100);
      }
    } catch (e) {
      // Handle non-JSON messages
    }
  }, []);

  const { isConnected } = useWebSocket(`ws://192.168.43.50:8000/ws/updates`, handleWebSocketMessage);

  useEffect(() => {
    fetchTechs();
  }, []);

  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=us&limit=1`
      );
      const data = await response.json();
      if (data && data[0]) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        return coords;
      }
      return null;
    } catch (error) {
      console.warn(`Geocoding failed for ${address}:`, error.message);
      return null;
    }
  };

  const filteredTechs = techs.filter(tech => {
    const matchesRegion = !filterRegion || tech.region === filterRegion;
    const matchesState = !filterState || tech.state === filterState;
    const matchesSearch = !searchTerm || 
      tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRegion && matchesState && matchesSearch;
  });

  const techsWithCoords = filteredTechs.filter(tech => tech.coordinates);

  const regions = [...new Set(techs.map(tech => tech.region).filter(Boolean))];
  const states = [...new Set(techs.map(tech => tech.state).filter(Boolean))];

  const handleTechClick = (tech) => {
    setSelectedTech(tech);
    if (tech.coordinates && mapRef) {
      mapRef.setView([tech.coordinates.lat, tech.coordinates.lng], 12);
    }
  };

  const handleDirections = (tech) => {
    if (tech.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${tech.coordinates.lat},${tech.coordinates.lng}`;
      window.open(url, '_blank');
    }
  };

  const clearFilters = () => {
    setFilterRegion('');
    setFilterState('');
    setSearchTerm('');
  };

  const handleZoomIn = () => {
    if (mapRef) {
      mapRef.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef) {
      mapRef.zoomOut();
    }
  };

  const handleCenterMap = () => {
    if (techsWithCoords.length > 0 && mapRef) {
      const bounds = L.latLngBounds(techsWithCoords.map(tech => tech.coordinates));
      mapRef.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Field Tech Map
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Search Techs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, city, or email..."
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Region</InputLabel>
              <Select
                value={filterRegion}
                label="Region"
                onChange={(e) => setFilterRegion(e.target.value)}
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
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>State</InputLabel>
              <Select
                value={filterState}
                label="State"
                onChange={(e) => setFilterState(e.target.value)}
              >
                <MenuItem value="">All States</MenuItem>
                {states.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchTechs}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats */}
      <Box sx={{ mb: 2 }}>
        <Chip 
          label={`${techsWithCoords.length} techs with locations`} 
          color="primary" 
          sx={{ mr: 1 }}
        />
        <Chip 
          label={`${techs.length - techsWithCoords.length} techs without locations`} 
          color="warning" 
          sx={{ mr: 1 }}
        />
        <Chip 
          label={`${filteredTechs.length} filtered results`} 
          color="info"
        />
      </Box>

      {/* Interactive Map */}
      <Paper sx={{ p: 0, mb: 2, overflow: 'hidden' }}>
        <Box sx={{ position: 'relative', height: '500px' }}>
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            ref={setMapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapBoundsUpdater 
              techsWithCoords={techsWithCoords}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
            />

            {techsWithCoords.map((tech) => (
              <Marker
                key={tech.field_tech_id}
                position={[tech.coordinates.lat, tech.coordinates.lng]}
                icon={techIcon}
                eventHandlers={{
                  click: () => setSelectedTech(tech)
                }}
              >
                <Popup>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography variant="h6" gutterBottom>
                      {tech.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {tech.city}, {tech.state}
                    </Typography>
                    {tech.region && (
                      <Chip 
                        label={tech.region} 
                        size="small" 
                        color="primary" 
                        sx={{ mb: 1 }}
                      />
                    )}
                    {tech.phone && (
                      <Box display="flex" alignItems="center" sx={{ mb: 0.5 }}>
                        <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{tech.phone}</Typography>
                      </Box>
                    )}
                    {tech.email && (
                      <Box display="flex" alignItems="center" sx={{ mb: 0.5 }}>
                        <Email fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{tech.email}</Typography>
                      </Box>
                    )}
                    <Button
                      size="small"
                      startIcon={<Directions />}
                      onClick={() => handleDirections(tech)}
                      sx={{ mt: 1 }}
                    >
                      Get Directions
                    </Button>
                  </Box>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onCenterMap={handleCenterMap}
          />
        </Box>
      </Paper>

      {/* Tech List */}
      <Grid container spacing={2}>
        {filteredTechs.map((tech) => (
          <Grid item xs={12} sm={6} md={4} key={tech.field_tech_id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 },
                border: selectedTech?.field_tech_id === tech.field_tech_id ? 2 : 1,
                borderColor: selectedTech?.field_tech_id === tech.field_tech_id ? 'primary.main' : 'divider'
              }}
              onClick={() => handleTechClick(tech)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {tech.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {tech.city}, {tech.state}
                    </Typography>
                    {tech.region && (
                      <Chip 
                        label={tech.region} 
                        size="small" 
                        color="primary" 
                        sx={{ mb: 1 }}
                      />
                    )}
                  </Box>
                  <Box>
                    {tech.coordinates ? (
                      <Tooltip title="Has location data">
                        <LocationOn color="success" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="No location data">
                        <LocationOn color="disabled" />
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                <Box sx={{ mt: 1 }}>
                  {tech.phone && (
                    <Box display="flex" alignItems="center" sx={{ mb: 0.5 }}>
                      <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">{tech.phone}</Typography>
                    </Box>
                  )}
                  {tech.email && (
                    <Box display="flex" alignItems="center" sx={{ mb: 0.5 }}>
                      <Email fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">{tech.email}</Typography>
                    </Box>
                  )}
                </Box>

                {tech.coordinates && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Directions />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirections(tech);
                      }}
                    >
                      Get Directions
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tech Detail Dialog */}
      <Dialog 
        open={!!selectedTech} 
        onClose={() => setSelectedTech(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedTech && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Person sx={{ mr: 1 }} />
                {selectedTech.name}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Contact Information</Typography>
                  {selectedTech.phone && (
                    <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                      <Phone sx={{ mr: 1 }} />
                      <Typography>{selectedTech.phone}</Typography>
                    </Box>
                  )}
                  {selectedTech.email && (
                    <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                      <Email sx={{ mr: 1 }} />
                      <Typography>{selectedTech.email}</Typography>
                    </Box>
                  )}
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Location</Typography>
                  <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                    <LocationOn sx={{ mr: 1 }} />
                    <Typography>
                      {selectedTech.city}, {selectedTech.state} {selectedTech.zip}
                    </Typography>
                  </Box>
                  {selectedTech.region && (
                    <Chip label={selectedTech.region} color="primary" />
                  )}
                </Grid>

                {selectedTech.coordinates && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Coordinates</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTech.coordinates.lat.toFixed(6)}, {selectedTech.coordinates.lng.toFixed(6)}
                    </Typography>
                  </Grid>
                )}

                {selectedTech.notes && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Notes</Typography>
                    <Typography variant="body2">{selectedTech.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              {selectedTech.coordinates && (
                <Button
                  startIcon={<Directions />}
                  onClick={() => handleDirections(selectedTech)}
                >
                  Get Directions
                </Button>
              )}
              <Button onClick={() => setSelectedTech(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default FieldTechMap; 