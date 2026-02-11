import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Stack, TextField, InputAdornment, Typography,
  CircularProgress
} from '@mui/material';
import { Add, Edit, Delete, Search, Refresh, Business } from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useThemeTokens from './hooks/useThemeTokens';
import { getApiPath } from './apiPaths';

function CompactFieldTechCompanies() {
  const navigate = useNavigate();
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const { tableHeaderBg, rowHoverBg } = useThemeTokens();
  const { error: showError, success } = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRef.current.get(`${getApiPath('fieldtechCompanies')}/?limit=500`);
      setCompanies(response || []);
    } catch (err) {
      showError(err?.response?.data?.detail || err?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filtered = companies.filter(c =>
    !search ||
    (c.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.state || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.region || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (e, c) => {
    e.stopPropagation();
    if (!window.confirm(`Delete company "${c.company_name}"? This will fail if techs are assigned.`)) return;
    try {
      await apiRef.current.delete(`${getApiPath('fieldtechCompanies')}/${c.company_id}`);
      success('Company deleted');
      fetchCompanies();
    } catch (err) {
      showError(err?.response?.data?.detail || err?.message || 'Failed to delete');
    }
  };

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '0.95rem' }}>
          Field Tech Companies ({filtered.length})
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Search company, city, state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ width: 240, '& input': { py: 0.5, fontSize: '0.875rem' } }}
          />
          <Button
            size="small"
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/companies/new')}
          >
            New Company
          </Button>
          <IconButton size="small" onClick={fetchCompanies} title="Refresh">
            <Refresh fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Paper sx={{ flex: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: tableHeaderBg, fontWeight: 'bold', borderBottom: 2, borderColor: 'primary.main' } }}>
                <TableCell>Company</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>City</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {companies.length === 0 ? 'No companies yet. Add one to assign techs and show on the map.' : 'No results match your search.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow
                    key={c.company_id}
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: rowHoverBg } }}
                    onClick={() => navigate(`/companies/${c.company_id}/edit`)}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{c.company_name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{c.address || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{c.city || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{c.state || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{c.region || '—'}</Typography></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" sx={{ p: 0.3 }} title="Edit" onClick={() => navigate(`/companies/${c.company_id}/edit`)}>
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" sx={{ p: 0.3 }} title="Delete" color="error" onClick={(e) => handleDelete(e, c)}>
                          <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default CompactFieldTechCompanies;
