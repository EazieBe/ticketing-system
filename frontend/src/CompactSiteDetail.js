import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Grid, Typography, Button, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Divider, Tabs, Tab, TextField, InputAdornment, IconButton, Tooltip, Chip
} from '@mui/material';
import { ArrowBack, Edit, Search, Save, Close } from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';

function CompactSiteDetail() {
  const { site_id: siteId } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const { error: showError } = useToast();
  const [site, setSite] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [ticketSearch, setTicketSearch] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const loadingRef = useRef(false);

  const load = async () => {
    if (loadingRef.current) return; // Prevent concurrent calls
    loadingRef.current = true;
    
    try {
      const [s, t, sh] = await Promise.all([
        api.get(`/sites/${siteId}`),
        api.get(`/tickets/?site_id=${siteId}&limit=1000`),
        api.get(`/sites/${siteId}/shipments`)
      ]);
      setSite(s);
      setNotesDraft(s?.notes || '');
      setTickets(t || []);
      setShipments(sh || []);
    } catch {
      showError('Failed to load');
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  if (!site) return <Box sx={{ p: 2 }}><Typography>Loading...</Typography></Box>;

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" startIcon={<ArrowBack />} onClick={() => navigate('/sites')}>Back</Button>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{site.site_id} - {site.location}</Typography>
          </Stack>
          <Button size="small" variant="contained" startIcon={<Edit />} onClick={() => navigate(`/sites/${siteId}/edit`)}>Edit</Button>
        </Stack>

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Info" />
          <Tab label={`Tickets (${tickets.length})`} />
          <Tab label={`Shipments (${shipments.length})`} />
        </Tabs>

        {activeTab === 0 && (
          <Box>
            <Grid container spacing={1} sx={{ '& .MuiTypography-root': { fontSize: '0.85rem' }, mb: 2 }}>
              <Grid item xs={12} md={6}><Typography><strong>Location:</strong> {site.location || 'N/A'}</Typography></Grid>
              <Grid item xs={12} md={3}>
                <Typography>
                  <strong>IP:</strong>{' '}
                  <Tooltip title="Click to copy">
                    <span
                      onClick={async () => {
                        if (!site.ip_address) return;
                        try { await navigator.clipboard.writeText(site.ip_address); } catch {}
                      }}
                      style={{ cursor: site.ip_address ? 'pointer' : 'default', textDecoration: site.ip_address ? 'underline' : 'none' }}
                    >
                      {site.ip_address || 'N/A'}
                    </span>
                  </Tooltip>
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}><Typography><strong>Brand:</strong> {site.brand || 'N/A'}</Typography></Grid>
              <Grid item xs={12} md={3}><Typography><strong>Main #:</strong> {site.main_number || 'N/A'}</Typography></Grid>
              <Grid item xs={12} md={3}><Typography><strong>MP:</strong> {site.mp || 'N/A'}</Typography></Grid>
              <Grid item xs={12} md={3}><Typography><strong>Region:</strong> {site.region || 'N/A'}</Typography></Grid>
              <Grid item xs={12} md={3}><Typography><strong>Timezone:</strong> {site.timezone || 'N/A'}</Typography></Grid>
              <Grid item xs={12}><Typography><strong>Service Address:</strong> {site.service_address || 'N/A'}</Typography></Grid>
              <Grid item xs={12}><Typography><strong>City/State/Zip:</strong> {(site.city || '') && (site.state || '') ? `${site.city}, ${site.state} ${site.zip || ''}` : (site.city || site.state || site.zip || 'N/A')}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography><strong>Phone System:</strong> {site.phone_system || 'N/A'}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography><strong>Network:</strong> {site.network_equipment || 'N/A'}</Typography></Grid>
              {site.phone_types && <Grid item xs={12}><Typography><strong>Phone Types:</strong> {site.phone_types}</Typography></Grid>}
              {site.additional_equipment && <Grid item xs={12}><Typography><strong>Additional Equipment:</strong> {site.additional_equipment}</Typography></Grid>}
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2" fontWeight="bold">Notes</Typography>
              {!editingNotes ? (
                <Button size="small" onClick={() => { setNotesDraft(site.notes || ''); setEditingNotes(true); }}>Edit</Button>
              ) : (
                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<Save />} disabled={savingNotes} onClick={async () => {
                    setSavingNotes(true);
                    try {
                      const payload = {
                        site_id: site.site_id,
                        ip_address: site.ip_address || '',
                        location: site.location || '',
                        brand: site.brand || '',
                        main_number: site.main_number || '',
                        mp: site.mp || '',
                        service_address: site.service_address || '',
                        city: site.city || '',
                        state: site.state || '',
                        zip: site.zip || '',
                        region: site.region || '',
                        notes: notesDraft || '',
                        equipment_notes: site.equipment_notes || '',
                        phone_system: site.phone_system || '',
                        phone_types: site.phone_types || '',
                        network_equipment: site.network_equipment || '',
                        additional_equipment: site.additional_equipment || ''
                      };
                      const updated = await api.put(`/sites/${siteId}`, payload);
                      setSite(updated);
                      setEditingNotes(false);
                    } catch {
                      // handled by hook
                    } finally {
                      setSavingNotes(false);
                    }
                  }}>Save</Button>
                  <Button size="small" color="inherit" startIcon={<Close />} onClick={() => { setEditingNotes(false); setNotesDraft(site.notes || ''); }}>Cancel</Button>
                </Stack>
              )}
            </Stack>
            {!editingNotes ? (
              <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{site.notes || 'No notes'}</Typography>
            ) : (
              <TextField
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                fullWidth
                multiline
                minRows={3}
                placeholder="Add notes for this site"
              />
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '1rem' }}>Tickets</Typography>
              <TextField
                size="small"
                placeholder="Search INC# or SO#"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                sx={{ width: 260, '& input': { py: 0.5, fontSize: '0.8rem' } }}
              />
            </Stack>
            <Table size="small" sx={{ '& td, & th': { py: 0.5, fontSize: '0.75rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket</TableCell>
                  <TableCell>INC#</TableCell>
                  <TableCell>SO#</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets
                  .filter(t => {
                    if (!ticketSearch) return true;
                    const q = ticketSearch.toLowerCase();
                    return (t.inc_number || '').toLowerCase().includes(q) || (t.so_number || '').toLowerCase().includes(q);
                  })
                  .map((t) => (
                  <TableRow key={t.ticket_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets/${t.ticket_id}`)}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{t.ticket_id}</TableCell>
                    <TableCell>{t.inc_number || '-'}</TableCell>
                    <TableCell>{t.so_number || '-'}</TableCell>
                    <TableCell><Chip label={t.type} size="small" color="primary" /></TableCell>
                    <TableCell><Chip label={t.status} size="small" /></TableCell>
                    <TableCell>{t.date_created ? new Date(t.date_created).toLocaleDateString() : 'N/A'}</TableCell>
                  </TableRow>
                ))}
                {tickets.length === 0 && <TableRow><TableCell colSpan={6} align="center">No tickets</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" mb={1} sx={{ fontSize: '1rem' }}>Shipments</Typography>
            <Table size="small" sx={{ '& td, & th': { py: 0.5, fontSize: '0.75rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tracking</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shipments.map((s) => (
                  <TableRow key={s.shipment_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/shipments/${s.shipment_id}/edit`)}>
                    <TableCell>{s.shipment_id}</TableCell>
                    <TableCell>{s.what_is_being_shipped}</TableCell>
                    <TableCell>{s.status}</TableCell>
                    <TableCell>{s.tracking_number || 'N/A'}</TableCell>
                  </TableRow>
                ))}
                {shipments.length === 0 && <TableRow><TableCell colSpan={4} align="center">No shipments</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default CompactSiteDetail;

