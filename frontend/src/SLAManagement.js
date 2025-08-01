import React, { useState, useEffect } from 'react';
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
import api from './axiosConfig';

function SLAManagement() {
  const [slaRules, setSlaRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    ticket_type: '',
    priority: '',
    target_hours: 24,
    breach_hours: 48,
    escalation_levels: 3,
    auto_escalation: true,
    customer_impact: 'medium',
    business_priority: 'medium',
    description: ''
  });

  useEffect(() => {
    fetchSLARules();
  }, []);

  const fetchSLARules = async () => {
    setLoading(true);
    try {
      // For now, we'll use a mock structure since SLA rules aren't in the backend yet
      const mockRules = [
        {
          id: 1,
          ticket_type: 'onsite',
          priority: 'high',
          target_hours: 4,
          breach_hours: 8,
          escalation_levels: 3,
          auto_escalation: true,
          customer_impact: 'high',
          business_priority: 'urgent',
          description: 'Critical onsite issues requiring immediate attention'
        },
        {
          id: 2,
          ticket_type: 'inhouse',
          priority: 'medium',
          target_hours: 24,
          breach_hours: 48,
          escalation_levels: 2,
          auto_escalation: true,
          customer_impact: 'medium',
          business_priority: 'high',
          description: 'Standard in-house support tickets'
        },
        {
          id: 3,
          ticket_type: 'project',
          priority: 'low',
          target_hours: 72,
          breach_hours: 168,
          escalation_levels: 1,
          auto_escalation: false,
          customer_impact: 'low',
          business_priority: 'medium',
          description: 'Long-term project work'
        }
      ];
      setSlaRules(mockRules);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch SLA rules');
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setFormData({
      ticket_type: '',
      priority: '',
      target_hours: 24,
      breach_hours: 48,
      escalation_levels: 3,
      auto_escalation: true,
      customer_impact: 'medium',
      business_priority: 'medium',
      description: ''
    });
    setEditDialog(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setFormData({
      ticket_type: rule.ticket_type,
      priority: rule.priority,
      target_hours: rule.target_hours,
      breach_hours: rule.breach_hours,
      escalation_levels: rule.escalation_levels,
      auto_escalation: rule.auto_escalation,
      customer_impact: rule.customer_impact,
      business_priority: rule.business_priority,
      description: rule.description
    });
    setEditDialog(true);
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      // Mock delete - in real implementation, call API
      setSlaRules(prev => prev.filter(rule => rule.id !== ruleId));
    } catch (err) {
      setError('Failed to delete SLA rule');
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingRule) {
        // Update existing rule
        const updatedRule = { ...editingRule, ...formData };
        setSlaRules(prev => prev.map(rule => 
          rule.id === editingRule.id ? updatedRule : rule
        ));
      } else {
        // Add new rule
        const newRule = {
          id: Date.now(),
          ...formData
        };
        setSlaRules(prev => [...prev, newRule]);
      }
      setEditDialog(false);
    } catch (err) {
      setError('Failed to save SLA rule');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'onsite': return 'primary';
      case 'inhouse': return 'secondary';
      case 'project': return 'info';
      case 'shipping': return 'warning';
      case 'misc': return 'default';
      default: return 'default';
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
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

      {/* SLA Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Schedule sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {slaRules.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active SLA Rules
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning sx={{ mr: 1, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {slaRules.filter(r => r.auto_escalation).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Auto-Escalation Enabled
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Error sx={{ mr: 1, color: 'error.main' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {slaRules.filter(r => r.priority === 'high').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    High Priority Rules
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {slaRules.filter(r => r.customer_impact === 'high').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    High Impact Rules
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SLA Rules Table */}
      <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Ticket Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Priority</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Target Hours</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Breach Hours</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Escalation</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Impact</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slaRules.map((rule) => (
                <TableRow key={rule.id} hover>
                  <TableCell>
                    <Chip 
                      label={rule.ticket_type} 
                      color={getTypeColor(rule.ticket_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={rule.priority} 
                      color={getPriorityColor(rule.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {rule.target_hours}h
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {rule.breach_hours}h
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={`Level ${rule.escalation_levels}`}
                        size="small"
                        color={rule.auto_escalation ? 'primary' : 'default'}
                      />
                      {rule.auto_escalation && (
                        <Tooltip title="Auto-escalation enabled">
                          <Settings fontSize="small" color="primary" />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Chip 
                        label={rule.customer_impact}
                        size="small"
                        color={rule.customer_impact === 'high' ? 'error' : rule.customer_impact === 'medium' ? 'warning' : 'success'}
                        sx={{ mb: 0.5 }}
                      />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {rule.business_priority}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }}>
                      {rule.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Edit Rule">
                        <IconButton
                          size="small"
                          onClick={() => handleEditRule(rule)}
                          sx={{ color: 'primary.main' }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Rule">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRule(rule.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingRule ? 'Edit SLA Rule' : 'Add New SLA Rule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Ticket Type</InputLabel>
                <Select
                  value={formData.ticket_type}
                  label="Ticket Type"
                  onChange={(e) => setFormData(prev => ({ ...prev, ticket_type: e.target.value }))}
                >
                  <MenuItem value="onsite">Onsite</MenuItem>
                  <MenuItem value="inhouse">In House</MenuItem>
                  <MenuItem value="project">Project</MenuItem>
                  <MenuItem value="shipping">Shipping</MenuItem>
                  <MenuItem value="misc">Misc</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Target Hours"
                value={formData.target_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, target_hours: parseInt(e.target.value) }))}
                inputProps={{ min: 1, max: 168 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Breach Hours"
                value={formData.breach_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, breach_hours: parseInt(e.target.value) }))}
                inputProps={{ min: 1, max: 168 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Escalation Levels"
                value={formData.escalation_levels}
                onChange={(e) => setFormData(prev => ({ ...prev, escalation_levels: parseInt(e.target.value) }))}
                inputProps={{ min: 1, max: 5 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.auto_escalation}
                    onChange={(e) => setFormData(prev => ({ ...prev, auto_escalation: e.target.checked }))}
                  />
                }
                label="Auto-Escalation"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Customer Impact</InputLabel>
                <Select
                  value={formData.customer_impact}
                  label="Customer Impact"
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_impact: e.target.value }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Business Priority</InputLabel>
                <Select
                  value={formData.business_priority}
                  label="Business Priority"
                  onChange={(e) => setFormData(prev => ({ ...prev, business_priority: e.target.value }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                placeholder="Describe this SLA rule and its purpose..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            startIcon={<Save />}
          >
            {editingRule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SLAManagement; 