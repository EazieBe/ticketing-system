import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Grid, Typography, Button, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Divider
} from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
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

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, sh] = await Promise.all([
          api.get(`/sites/${siteId}`),
          api.get(`/tickets/?site_id=${siteId}`),
          api.get(`/sites/${siteId}/shipments`)
        ]);
        setSite(s);
        setTickets(t || []);
        setShipments(sh || []);
      } catch {
        showError('Failed to load');
      }
    };
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

        <Grid container spacing={1} sx={{ '& .MuiTypography-root': { fontSize: '0.85rem' }, mb: 2 }}>
          <Grid item xs={6} md={3}><Typography><strong>IP:</strong> {site.ip_address || 'N/A'}</Typography></Grid>
          <Grid item xs={6} md={3}><Typography><strong>Brand:</strong> {site.brand || 'N/A'}</Typography></Grid>
          <Grid item xs={6} md={3}><Typography><strong>Main #:</strong> {site.main_number || 'N/A'}</Typography></Grid>
          <Grid item xs={6} md={3}><Typography><strong>Region:</strong> {site.region || 'N/A'}</Typography></Grid>
          <Grid item xs={12}><Typography><strong>Address:</strong> {site.service_address}, {site.city}, {site.state} {site.zip}</Typography></Grid>
          <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
          <Grid item xs={12}><Typography variant="subtitle2" fontWeight="bold">Equipment</Typography></Grid>
          <Grid item xs={6}><Typography><strong>Phone System:</strong> {site.phone_system || 'N/A'}</Typography></Grid>
          <Grid item xs={6}><Typography><strong>Network:</strong> {site.network_equipment || 'N/A'}</Typography></Grid>
          {site.notes && <Grid item xs={12}><Typography><strong>Notes:</strong> {site.notes}</Typography></Grid>}
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight="bold" mb={1} sx={{ fontSize: '1rem' }}>Recent Tickets ({tickets.length})</Typography>
        <Table size="small" sx={{ mb: 2, '& td, & th': { py: 0.5, fontSize: '0.75rem' } }}>
          <TableHead>
            <TableRow><TableCell>ID</TableCell><TableCell>Type</TableCell><TableCell>Status</TableCell><TableCell>Date</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {tickets.slice(0, 5).map((t) => (
              <TableRow key={t.ticket_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets/${t.ticket_id}`)}>
                <TableCell>{t.ticket_id}</TableCell>
                <TableCell>{t.type}</TableCell>
                <TableCell>{t.status}</TableCell>
                <TableCell>{t.date_created ? new Date(t.date_created).toLocaleDateString() : 'N/A'}</TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && <TableRow><TableCell colSpan={4} align="center">No tickets</TableCell></TableRow>}
          </TableBody>
        </Table>

        <Typography variant="subtitle1" fontWeight="bold" mb={1} sx={{ fontSize: '1rem' }}>Shipments ({shipments.length})</Typography>
        <Table size="small" sx={{ '& td, & th': { py: 0.5, fontSize: '0.75rem' } }}>
          <TableHead>
            <TableRow><TableCell>ID</TableCell><TableCell>Item</TableCell><TableCell>Status</TableCell><TableCell>Tracking</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {shipments.slice(0, 5).map((s) => (
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
      </Paper>
    </Box>
  );
}

export default CompactSiteDetail;

