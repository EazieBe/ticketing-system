import React, { useState, useEffect, useRef } from 'react';
import { InputBase, Paper, List, ListItem, ListItemText, ListSubheader, Popper, ClickAwayListener, IconButton, Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import useApi from './hooks/useApi';
import useThemeTokens from './hooks/useThemeTokens';
import { useNavigate } from 'react-router-dom';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Tooltip from '@mui/material/Tooltip';

const typeLabels = {
  ticket: 'Tickets',
  site: 'Sites',
  shipment: 'Shipments',
  inventory: 'Inventory',
  user: 'Users',
  fieldtech: 'Companies',
};

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const anchorRef = useRef();
  const navigate = useNavigate();
  const api = useApi();
  const { toastSuccessBg, toastSuccessBorder } = useThemeTokens();
  const [copyFeedback, setCopyFeedback] = useState('');
  const copyTimeoutRef = React.useRef(null);
  const apiRef = React.useRef(api);

  // Keep API ref current
  React.useEffect(() => {
    apiRef.current = api;
  }, [api]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
  };

  // Debounced search effect
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.length >= 2) {
        try {
          const res = await apiRef.current.get(`/search?q=${encodeURIComponent(query)}`);
          setResults(res?.results || []);
          setOpen(true);
          setHighlight(0);
        } catch {
          setResults([]);
          setOpen(false);
        }
      } else {
        setResults([]);
        setOpen(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      setHighlight(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[highlight]) {
      navigate(results[highlight].link);
      setOpen(false);
      setQuery('');
    }
  };

  const handleResultClick = (link) => {
    navigate(link);
    setOpen(false);
    setQuery('');
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied!');
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopyFeedback(''), 1000);
  };

  // Group results by type
  const grouped = results.reduce((acc, r) => {
    acc[r.type] = acc[r.type] || [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <div style={{ position: 'relative', display: 'inline-block', minWidth: 300 }}>
        <Paper
          component="form"
          sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 320 }}
          ref={anchorRef}
          onSubmit={e => { e.preventDefault(); if (results[highlight]) handleResultClick(results[highlight].link); }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Search..."
            value={query}
            onChange={handleChange}
            onFocus={() => { if (results.length) setOpen(true); }}
            onKeyDown={handleKeyDown}
            inputProps={{ 'aria-label': 'global search' }}
          />
          <IconButton type="submit" sx={{ p: '10px' }} aria-label="search">
            <SearchIcon />
          </IconButton>
        </Paper>
        <Popper open={open && results.length > 0} anchorEl={anchorRef.current} style={{ zIndex: 1301, width: 320 }} placement="bottom-start">
          <Paper sx={{ maxHeight: 400, overflow: 'auto', width: 320 }}>
            <List dense>
              {Object.entries(grouped).map(([type, items]) => [
                <ListSubheader key={type}>{typeLabels[type] || type}</ListSubheader>,
                items.map((r, idx) => (
                  <ListItem
                    key={r.type + r.id}
                    button
                    selected={highlight === results.findIndex(x => x.type === r.type && x.id === r.id)}
                    onClick={() => handleResultClick(r.link)}
                  >
                    <ListItemText primary={r.summary} secondary={r.id} />
                    <Tooltip title="Copy Summary"><IconButton size="small" onClick={e => { e.stopPropagation(); handleCopy(r.summary); }}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Copy ID"><IconButton size="small" onClick={e => { e.stopPropagation(); handleCopy(r.id); }}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                  </ListItem>
                ))
              ])}
            </List>
          </Paper>
        </Popper>
      </div>
      {copyFeedback && (
        <Box sx={{ position: 'fixed', top: 80, right: 40, zIndex: 2000, bgcolor: toastSuccessBg, border: toastSuccessBorder, color: 'text.primary', p: 1, borderRadius: 1 }}>
          Copied!
        </Box>
      )}
    </ClickAwayListener>
  );
}

export default GlobalSearch; 