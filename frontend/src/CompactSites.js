import React, { useState, useEffect, useCallback, useRef } from 'react';
// NOTE: Virtualization disabled for Sites due to table layout constraints; using native table rendering for reliability.
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Stack, TextField, InputAdornment, Typography, Popover,
  FormControlLabel, Checkbox, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  FormControl, Select, MenuItem
} from '@mui/material';
import { Add, Visibility, Edit, Delete, Search, Refresh, ViewColumn, UploadFile, Download } from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useThemeTokens from './hooks/useThemeTokens';
import { useAuth } from './AuthContext';
import { canDelete } from './utils/permissions';

function CompactSites() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const { tableHeaderBg, codeBlockBg } = useThemeTokens();
  const { success, error: showError } = useToast();
  const [sites, setSites] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef(null);
  const [columnAnchor, setColumnAnchor] = useState(null);
  const [importing, setImporting] = useState(false);
  const apiRef = React.useRef(api);
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importResult, setImportResult] = useState({ imported: 0, failed: [] });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState({
    site_id: true,
    ip_address: true,
    location: true,
    city_state: true,
    brand: true,
    phone: true,
    region: true
  });

  // Keep API ref current
  React.useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const fetchSites = async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', String(rowsPerPage));
      params.set('skip', String(page * rowsPerPage));
      if (search) params.set('search', search);
      // total count
      const countParams = new URLSearchParams();
      if (search) countParams.set('search', search);
      const countRes = await apiRef.current.get(`/sites/count?${countParams.toString()}`);
      setTotal(countRes?.count ?? 0);
      const response = await apiRef.current.get(`/sites/?${params.toString()}`);
      setSites(response || []);
    } catch {
      showError('Failed to load sites');
    }
  };

  const copyIpToClipboard = async (ip) => {
    if (!ip) return;
    try {
      await navigator.clipboard.writeText(ip);
      success('IP copied');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = ip; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        success('IP copied');
      } catch {
        showError('Could not copy IP');
      }
    }
  };

  const regionFromState = (state) => {
    if (!state) return '';
    const s = String(state).trim().toUpperCase();
    const sets = {
      Northeast: ['ME','NH','VT','MA','RI','CT','NY','NJ','PA'],
      Midwest: ['OH','MI','IN','IL','WI','MN','IA','MO','ND','SD','NE','KS'],
      South: ['DE','MD','DC','VA','WV','NC','SC','GA','FL','KY','TN','MS','AL','AR','LA','OK','TX'],
      West: ['MT','ID','WY','CO','NM','AZ','UT','NV','CA','OR','WA','AK','HI'],
    };
    for (const [name, arr] of Object.entries(sets)) if (arr.includes(s)) return name;
    return '';
  };

  // Robust CSV parser that handles quoted fields and commas within quotes
  const parseCsv = (text) => {
    const rows = [];
    let cur = '';
    let row = [];
    let inQuotes = false;
    let i = 0;
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          // Escaped quote
          if (i + 1 < text.length && text[i + 1] === '"') {
            cur += '"'; i += 2; continue;
          }
          inQuotes = false; i++; continue;
        } else {
          cur += ch; i++; continue;
        }
      } else {
        if (ch === '"') { inQuotes = true; i++; continue; }
        if (ch === ',') { row.push(cur.trim()); cur = ''; i++; continue; }
        if (ch === '\n') { row.push(cur.trim()); rows.push(row); row = []; cur = ''; i++; continue; }
        if (ch === '\r') { // handle CRLF
          // lookahead for \n
          if (i + 1 < text.length && text[i + 1] === '\n') { i++; }
          row.push(cur.trim()); rows.push(row); row = []; cur = ''; i++; continue; }
        cur += ch; i++; continue;
      }
    }
    // Flush trailing field
    row.push(cur.trim()); rows.push(row);
    // Remove any trailing empty row
    while (rows.length && rows[rows.length - 1].every(v => v === '')) rows.pop();
    return rows;
  };

  useEffect(() => {
    fetchSites();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, search]);

  // Debounce search input -> search param used for fetching
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0); // reset when effective search changes
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Reset to page 0 on search change
  useEffect(() => {
    setPage(0);
  }, [search]);

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const filtered = sites.filter(s =>
    !search || s.site_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase()) ||
    s.ip_address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 1.5, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '0.95rem' }}>Sites ({total ?? sites.length})</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" placeholder="Search..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ width: 200, '& input': { py: 0.5, fontSize: '0.875rem' } }} />
          <IconButton size="small" onClick={(e) => setColumnAnchor(e.currentTarget)} title="Show/Hide Columns">
            <ViewColumn fontSize="small" />
          </IconButton>
          <IconButton size="small" title="Export CSV" onClick={() => {
            const labels = ['Site ID','IP: Address','Location','Brand','Main Number','MP','Service Address','City','State','Zip'];
            const fields = ['site_id','ip_address','location','brand','main_number','mp','service_address','city','state','zip'];
            const esc = (v) => {
              const s = String(v ?? '');
              return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
            };
            const rows = sites.map(s => fields.map(f => esc(s[f])).join(','));
            const csv = [labels.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'sites.csv'; a.click(); URL.revokeObjectURL(url);
          }}>
            <Download fontSize="small" />
          </IconButton>
          <IconButton size="small" component="label" title="Import CSV (Site#, IP: Address, Location, Brand, Main Number, MP, Service Address, City, State, Zip)" disabled={importing}>
            <UploadFile fontSize="small" />
            <input type="file" accept=".csv" hidden onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              setImporting(true);
              try {
                const text = await file.text();
                const rows = parseCsv(text);
                if (!rows.length) throw new Error('Empty CSV');
                const headers = rows[0].map(h => h.trim());
                const dataRows = rows.slice(1);
                const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                const headersNorm = headers.map(normalize);
                let imported = 0; const failed = [];
                let lineNo = 1;
                for (const cols of dataRows) {
                  lineNo += 1;
                  const rowNorm = Object.fromEntries(headersNorm.map((h, i) => [h, (cols[i] ?? '').trim()]));
                  const val = (...keys) => {
                    for (const k of keys) { if (rowNorm[k]) return rowNorm[k]; }
                    return '';
                  };
                  // Map incoming headers (case/format tolerant, common aliases supported)
                  const payload = {
                    site_id: val('siteid', 'site', 'site_id'),
                    ip_address: val('ipaddress', 'ip', 'ipaddewss'),
                    location: val('location', 'loc'),
                    brand: val('brand'),
                    main_number: val('mainnumber', 'main', 'mainno', 'main#'),
                    mp: val('mp'),
                    service_address: val('serviceaddress', 'address', 'addr', 'serviceaddr'),
                    city: val('city'),
                    state: val('state', 'st'),
                    zip: val('zip', 'zipcode', 'postal'),
                  };
                  // Derive region from state
                  payload.region = regionFromState(payload.state) || val('region');
                  // Basic validation
                  if (!payload.site_id) {
                    failed.push({ line: lineNo, site_id: '', error: 'Missing Site#' });
                    continue;
                  }
                  try {
                    await api.post('/sites/', payload);
                    imported++;
                  } catch (err) {
                    const msg = err?.response?.data?.detail || err?.message || 'Unknown error';
                    failed.push({ line: lineNo, site_id: payload.site_id, error: String(msg) });
                  }
                }
                await fetchSites();
                setImportResult({ imported, failed });
                setImportResultOpen(true);
                if (imported > 0) success(`Imported ${imported} site(s)`);
                if (failed.length > 0) showError(`${failed.length} row(s) failed`);
              } finally {
                setImporting(false);
                e.target.value = '';
              }
            }} />
          </IconButton>
          {importing && <CircularProgress size={18} sx={{ mt: '2px' }} />}
          <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/sites/new')} disabled={importing}>New Site</Button>
          <IconButton size="small" onClick={fetchSites}><Refresh fontSize="small" /></IconButton>
        </Stack>
      </Stack>

      <Paper sx={{ flex: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ height: '100%' }}>
          <Table size="small" stickyHeader sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: tableHeaderBg, fontWeight: 'bold', borderBottom: 2, borderColor: 'primary.main' } }}>
                {visibleColumns.site_id && <TableCell>Site ID</TableCell>}
                {visibleColumns.ip_address && <TableCell>IP Address</TableCell>}
                {visibleColumns.location && <TableCell>Location</TableCell>}
                {visibleColumns.city_state && <TableCell>City, State</TableCell>}
                {visibleColumns.brand && <TableCell>Brand</TableCell>}
                {visibleColumns.phone && <TableCell>Phone</TableCell>}
                {visibleColumns.region && <TableCell>Region</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.site_id} hover sx={{ cursor: 'default' }} onDoubleClick={() => navigate(`/sites/${s.site_id}`)}>
                  {visibleColumns.site_id && (
                    <TableCell><Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>{s.site_id}</Typography></TableCell>
                  )}
                  {visibleColumns.ip_address && (
                    <TableCell>
                      <Typography
                        variant="caption"
                        title="Click to copy"
                        onClick={(e) => { e.stopPropagation(); copyIpToClipboard(s.ip_address); }}
                        sx={{ fontSize: '0.7rem', fontFamily: 'monospace', cursor: s.ip_address ? 'pointer' : 'default', textDecoration: s.ip_address ? 'underline' : 'none' }}
                      >
                        {s.ip_address || 'N/A'}
                      </Typography>
                    </TableCell>
                  )}
                  {visibleColumns.location && (
                    <TableCell><Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{s.location}</Typography></TableCell>
                  )}
                  {visibleColumns.city_state && (
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.city}, {s.state}</Typography></TableCell>
                  )}
                  {visibleColumns.brand && (
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.brand}</Typography></TableCell>
                  )}
                  {visibleColumns.phone && (
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.main_number}</Typography></TableCell>
                  )}
                  {visibleColumns.region && (
                    <TableCell><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{s.region}</Typography></TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" sx={{ p: 0.3 }} onClick={() => navigate(`/sites/${s.site_id}`)}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" sx={{ p: 0.3 }} onClick={() => navigate(`/sites/${s.site_id}/edit`)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                      {canDelete(user) && (
                        <IconButton size="small" sx={{ p: 0.3 }} onClick={async () => {
                          if (!window.confirm(`Delete site ${s.site_id}? This will remove related tickets and shipments.`)) return;
                          try {
                            await api.delete(`/sites/${s.site_id}`);
                            setSites(prev => prev.filter(x => x.site_id !== s.site_id));
                            success('Site deleted');
                          } catch {
                            showError('Failed to delete site');
                          }
                        }}><Delete sx={{ fontSize: 16 }} color="error" /></IconButton>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Column Visibility Popover */}
      <Popover
        open={Boolean(columnAnchor)}
        anchorEl={columnAnchor}
        onClose={() => setColumnAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            maxHeight: 500,
            overflow: 'auto'
          }
        }}
      >
        <Box sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>Show/Hide Columns</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.5}>
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.site_id} onChange={() => toggleColumn('site_id')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Site ID</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.ip_address} onChange={() => toggleColumn('ip_address')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>IP Address</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.location} onChange={() => toggleColumn('location')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Location</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.city_state} onChange={() => toggleColumn('city_state')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>City, State</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.brand} onChange={() => toggleColumn('brand')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Brand</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.phone} onChange={() => toggleColumn('phone')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Phone</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={visibleColumns.region} onChange={() => toggleColumn('region')} size="small" />}
              label={<Typography sx={{ fontSize: '0.875rem' }}>Region</Typography>}
            />
          </Stack>
        </Box>
      </Popover>

      {/* Pagination controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
          {total === 0 ? '0' : `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, total)}`} of {total}
          {total > 0 && (
            <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>
              · Page {page + 1} of {Math.max(1, Math.ceil(total / rowsPerPage))}
            </Box>
          )}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Rows</Typography>
          <FormControl size="small" sx={{ minWidth: 72 }}>
            <Select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }} sx={{ fontSize: '0.8125rem', height: 28 }}>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
              <MenuItem value={250}>250</MenuItem>
            </Select>
          </FormControl>
          <Button size="small" disabled={page === 0} onClick={() => setPage(0)} sx={{ minWidth: 32, fontSize: '0.75rem' }}>First</Button>
          <Button size="small" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} sx={{ minWidth: 32, fontSize: '0.75rem' }}>Prev</Button>
          <Button size="small" disabled={(page + 1) * rowsPerPage >= total} onClick={() => setPage((p) => p + 1)} sx={{ minWidth: 32, fontSize: '0.75rem' }}>Next</Button>
          <Button size="small" disabled={total === 0 || (page + 1) * rowsPerPage >= total} onClick={() => setPage(Math.max(0, Math.ceil(total / rowsPerPage) - 1))} sx={{ minWidth: 32, fontSize: '0.75rem' }}>Last</Button>
        </Stack>
      </Box>

      <Dialog open={importResultOpen} onClose={() => setImportResultOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Results</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>Imported: {importResult.imported}</Typography>
          {importResult.failed.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed: {importResult.failed.length} row(s)
            </Alert>
          )}
          {importResult.failed.length > 0 && (
            <Box sx={{ maxHeight: 260, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: codeBlockBg, p: 1, borderRadius: 1 }}>
              {importResult.failed.slice(0, 50).map((f, idx) => (
                <div key={idx}>Line {f.line} [{f.site_id}]: {f.error}</div>
              ))}
              {importResult.failed.length > 50 && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                  Showing first 50 of {importResult.failed.length} errors.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportResultOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CompactSites;


