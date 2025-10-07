import React from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  IconButton,
  Grid,
  Chip,
  Collapse,
  Button
} from '@mui/material';
import {
  Search,
  Clear,
  FilterList,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { formatTimestamp } from '../utils/timezone';

/**
 * Unified TicketFilters Component
 * 
 * Provides consistent filtering across all ticket views
 * 
 * @param {Object} filters - Current filter values
 * @param {Function} onFilterChange - Callback when filters change
 * @param {Array} sites - List of sites for site filter (optional)
 * @param {Boolean} showAdvanced - Show advanced filters by default
 * @param {Boolean} compact - Use compact layout
 */
function TicketFilters({ 
  filters, 
  onFilterChange, 
  sites = [], 
  showAdvanced = false,
  compact = false 
}) {
  const [expanded, setExpanded] = React.useState(showAdvanced);

  const handleFilterChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleClearAll = () => {
    onFilterChange({
      search: '',
      site: '',
      inc_number: '',
      so_number: '',
      type: '',
      status: '',
      priority: '',
      dateFrom: '',
      dateTo: '',
      assignedTo: ''
    });
  };

  const activeFilterCount = Object.values(filters || {}).filter(v => v && v !== '').length;

  return (
    <Box>
      {/* Basic Filters - Always Visible */}
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={compact ? 12 : 6} md={compact ? 12 : 4}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by INC#, SO#, Site, or notes..."
            value={filters?.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: filters?.search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => handleFilterChange('search', '')}>
                    <Clear />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>

        <Grid item xs={6} sm={compact ? 6 : 3} md={compact ? 6 : 2}>
          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={filters?.type || ''}
              label="Type"
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="onsite">Onsite</MenuItem>
              <MenuItem value="inhouse">Inhouse</MenuItem>
              <MenuItem value="projects">Projects</MenuItem>
              <MenuItem value="misc">Misc</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} sm={compact ? 6 : 3} md={compact ? 6 : 2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters?.status || ''}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="checked_in">Checked In</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="needs_parts">Needs Parts</MenuItem>
              <MenuItem value="go_back_scheduled">Go-back Scheduled</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
              <MenuItem value="planning">Planning</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} sm={compact ? 6 : 3} md={compact ? 6 : 2}>
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={filters?.priority || ''}
              label="Priority"
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <MenuItem value="">All Priorities</MenuItem>
              <MenuItem value="emergency">Emergency</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} sm={compact ? 6 : 3} md={compact ? 6 : 2}>
          <Button
            fullWidth
            variant={expanded ? "contained" : "outlined"}
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
            startIcon={<FilterList />}
          >
            Advanced {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        </Grid>
      </Grid>

      {/* Advanced Filters - Collapsible */}
      <Collapse in={expanded}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          {sites && sites.length > 0 && (
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Site</InputLabel>
                <Select
                  value={filters?.site || ''}
                  label="Site"
                  onChange={(e) => handleFilterChange('site', e.target.value)}
                >
                  <MenuItem value="">All Sites</MenuItem>
                  {sites.map(site => (
                    <MenuItem key={site.site_id} value={site.site_id}>
                      {site.site_id} - {site.location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="INC Number"
              placeholder="INC20250101..."
              value={filters?.inc_number || ''}
              onChange={(e) => handleFilterChange('inc_number', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="SO Number"
              placeholder="SO1234..."
              value={filters?.so_number || ''}
              onChange={(e) => handleFilterChange('so_number', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date From"
              value={filters?.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Date To"
              value={filters?.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={handleClearAll}
              disabled={activeFilterCount === 0}
            >
              Clear All Filters
            </Button>
          </Grid>
        </Grid>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {filters?.search && (
              <Chip
                label={`Search: ${filters.search}`}
                onDelete={() => handleFilterChange('search', '')}
                size="small"
              />
            )}
            {filters?.type && (
              <Chip
                label={`Type: ${filters.type}`}
                onDelete={() => handleFilterChange('type', '')}
                size="small"
              />
            )}
            {filters?.status && (
              <Chip
                label={`Status: ${filters.status.replace(/_/g, ' ')}`}
                onDelete={() => handleFilterChange('status', '')}
                size="small"
              />
            )}
            {filters?.priority && (
              <Chip
                label={`Priority: ${filters.priority}`}
                onDelete={() => handleFilterChange('priority', '')}
                size="small"
              />
            )}
            {filters?.site && (
              <Chip
                label={`Site: ${filters.site}`}
                onDelete={() => handleFilterChange('site', '')}
                size="small"
              />
            )}
            {filters?.inc_number && (
              <Chip
                label={`INC: ${filters.inc_number}`}
                onDelete={() => handleFilterChange('inc_number', '')}
                size="small"
              />
            )}
            {filters?.so_number && (
              <Chip
                label={`SO: ${filters.so_number}`}
                onDelete={() => handleFilterChange('so_number', '')}
                size="small"
              />
            )}
            {filters?.dateFrom && (
              <Chip
                label={`From: ${formatTimestamp(filters.dateFrom, 'MMM D, YYYY')}`}
                onDelete={() => handleFilterChange('dateFrom', '')}
                size="small"
              />
            )}
            {filters?.dateTo && (
              <Chip
                label={`To: ${formatTimestamp(filters.dateTo, 'MMM D, YYYY')}`}
                onDelete={() => handleFilterChange('dateTo', '')}
                size="small"
              />
            )}
          </Box>
        )}
      </Collapse>
    </Box>
  );
}

export default TicketFilters;

