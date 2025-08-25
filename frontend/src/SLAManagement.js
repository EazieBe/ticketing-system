import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Schedule,
  Settings,
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { useToast } from './contexts/ToastContext';
import useApi from './hooks/useApi';
import useWebSocket from './hooks/useWebSocket';
import LoadingSpinner from './components/LoadingSpinner';

function SLAManagement() {
  const [slaRules, setSlaRules] = useState([]);
  const [editDialog, setEditDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ticket_type: '',
    customer_impact: 'medium',
    business_priority: 'medium',
    sla_target_hours: 24,
    sla_breach_hours: 48,
    escalation_levels: 3,
    is_active: true
  });

  const { get, post, put, delete: del, loading, error } = useApi();
  const { success, error: showError } = useToast();

  // WebSocket setup - will be configured after fetchSLARules is defined

  const fetchSLARules = useCallback(async () => {
    try {
      const rules = await get('/sla-rules/');
      setSlaRules(rules);
    } catch (err) {
      showError('Failed to fetch SLA rules');
    }
  }, [get, showError]);

  // WebSocket callback functions - defined after fetchSLARules
  const handleWebSocketMessage = useCallback((data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'sla_update' || message.type === 'sla_created' || message.type === 'sla_deleted') {
        fetchSLARules(); // Refresh SLA rules when there's an update
      }
    } catch (e) {
      // Handle non-JSON messages
    }
  }, [fetchSLARules]);

  const { isConnected } = useWebSocket(`ws://192.168.43.50:8000/ws/updates`, handleWebSocketMessage);

  useEffect(() => {
    fetchSLARules();
  }, [fetchSLARules]);

  const handleAddRule = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      ticket_type: '',
      customer_impact: 'medium',
      business_priority: 'medium',
      sla_target_hours: 24,
      sla_breach_hours: 48,
      escalation_levels: 3,
      is_active: true
    });
    setEditDialog(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      ticket_type: rule.ticket_type || '',
      customer_impact: rule.customer_impact || 'medium',
      business_priority: rule.business_priority || 'medium',
      sla_target_hours: rule.sla_target_hours || 24,
      sla_breach_hours: rule.sla_breach_hours || 48,
      escalation_levels: rule.escalation_levels || 3,
      is_active: rule.is_active
    });
    setEditDialog(true);
  };

  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('Are you sure you want to delete this SLA rule?')) {
      try {
        await del(`/sla-rules/${ruleId}`);
        success('SLA rule deleted successfully');
        fetchSLARules();
      } catch (err) {
        showError('Failed to delete SLA rule');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingRule) {
        await put(`/sla-rules/${editingRule.rule_id}`, formData);
        success('SLA rule updated successfully');
      } else {
        await post('/sla-rules/', formData);
        success('SLA rule created successfully');
      }
      setEditDialog(false);
      fetchSLARules();
    } catch (err) {
      showError('Failed to save SLA rule');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'onsite': return 'error';
      case 'inhouse': return 'primary';
      case 'shipping': return 'secondary';
      case 'projects': return 'warning';
      case 'nro': return 'info';
      case 'misc': return 'default';
      default: return 'default';
    }
  };

  if (loading && slaRules.length === 0) {
    return <LoadingSpinner message="Loading SLA rules..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          SLA Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddRule}
        >
          Add SLA Rule
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* SLA Rules Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              SLA Rules
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Impact</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Target (hrs)</TableCell>
                    <TableCell>Breach (hrs)</TableCell>
                    <TableCell>Escalations</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {slaRules.map((rule) => (
                    <TableRow key={rule.rule_id}>
                      <TableCell>
                        <Typography variant="subtitle2">{rule.name}</Typography>
                        {rule.description && (
                          <Typography variant="caption" color="text.secondary">
                            {rule.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.ticket_type && (
                          <Chip
                            label={rule.ticket_type}
                            color={getTypeColor(rule.ticket_type)}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.customer_impact && (
                          <Chip
                            label={rule.customer_impact}
                            color={getPriorityColor(rule.customer_impact)}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.business_priority && (
                          <Chip
                            label={rule.business_priority}
                            color={getPriorityColor(rule.business_priority)}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>{rule.sla_target_hours}</TableCell>
                      <TableCell>{rule.sla_breach_hours}</TableCell>
                      <TableCell>{rule.escalation_levels}</TableCell>
                      <TableCell>
                        <Chip
                          label={rule.is_active ? 'Active' : 'Inactive'}
                          color={rule.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditRule(rule)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRule(rule.rule_id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRule ? 'Edit SLA Rule' : 'Add SLA Rule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Ticket Type</InputLabel>
                <Select
                  value={formData.ticket_type}
                  onChange={(e) => setFormData({ ...formData, ticket_type: e.target.value })}
                  label="Ticket Type"
                >
                  <MenuItem value="">Any Type</MenuItem>
                  <MenuItem value="inhouse">In-House</MenuItem>
                  <MenuItem value="onsite">On-Site</MenuItem>
                  <MenuItem value="shipping">Shipping</MenuItem>
                  <MenuItem value="projects">Projects</MenuItem>
                  <MenuItem value="nro">NRO</MenuItem>
                  <MenuItem value="misc">Misc</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Customer Impact</InputLabel>
                <Select
                  value={formData.customer_impact}
                  onChange={(e) => setFormData({ ...formData, customer_impact: e.target.value })}
                  label="Customer Impact"
                >
                  <MenuItem value="">Any Impact</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Business Priority</InputLabel>
                <Select
                  value={formData.business_priority}
                  onChange={(e) => setFormData({ ...formData, business_priority: e.target.value })}
                  label="Business Priority"
                >
                  <MenuItem value="">Any Priority</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Target Hours"
                type="number"
                value={formData.sla_target_hours}
                onChange={(e) => setFormData({ ...formData, sla_target_hours: parseInt(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Breach Hours"
                type="number"
                value={formData.sla_breach_hours}
                onChange={(e) => setFormData({ ...formData, sla_breach_hours: parseInt(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Escalation Levels"
                type="number"
                value={formData.escalation_levels}
                onChange={(e) => setFormData({ ...formData, escalation_levels: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 5 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name || loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SLAManagement; 