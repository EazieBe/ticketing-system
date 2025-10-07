import React, { useState, useEffect } from 'react';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Breadcrumbs,
  Link,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment,
  Business,
  Person,
  LocalShipping,
  Build,
  Settings,
  Logout,
  Notifications,
  Brightness4,
  Brightness7,
  ExpandLess,
  ExpandMore,
  ChevronRight,
  Home,
  Map,
  Assessment,
  Speed,
  Security,
  AdminPanelSettings,
  Engineering,
  AccountCircle,
  KeyboardArrowDown,
  Palette,
  Clear,
  CheckCircle,
  Warning,
  Error,
  Info
} from '@mui/icons-material';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationProvider';
import { DataSyncProvider } from './contexts/DataSyncContext';
import ThemePreview from './components/ThemePreview';
import Logo from './components/Logo';
import Login from './Login';
import Dashboard from './Dashboard';
import Tickets from './Tickets';
import TicketDetail from './TicketDetail';
import TicketForm from './TicketForm';
import Sites from './Sites';
import SiteDetail from './SiteDetail';
import SiteForm from './SiteForm';
import Users from './Users';
import UserForm from './UserForm';
import EquipmentForm from './EquipmentForm';
import InventoryForm from './InventoryForm';
import TaskForm from './TaskForm';
import ShipmentForm from './ShipmentForm';
import FieldTechForm from './FieldTechForm';
import FieldTechMap from './FieldTechMap';
import SLAManagement from './SLAManagement';
import DailyOperationsDashboard from './components/DailyOperationsDashboard';

import Shipments from './Shipments';
import Inventory from './Inventory';
import FieldTechs from './FieldTechs';
import Tasks from './Tasks';
import Equipment from './Equipment';
import Audit from './Audit';
import Reports from './Reports';
import TicketClaim from './TicketClaim';
import SettingsPage from './Settings';
import Profile from './Profile';

import ChangePassword from './ChangePassword';
import useApi from './hooks/useApi';
import { useToast } from './contexts/ToastContext';

const drawerWidth = 280;

// TicketFormWrapper component to handle form submission
function TicketFormWrapper() {
  const navigate = useNavigate();
  const api = useApi();
  const { success, error } = useToast();

  const handleSubmit = async (values) => {
    try {
      console.log('TicketFormWrapper: Submitting values:', values);
      console.log('TicketFormWrapper: api object:', api);
      console.log('TicketFormWrapper: api.post type:', typeof api?.post);
      
      if (!api) {
        throw new Error('API object is null or undefined');
      }
      
      if (typeof api.post !== 'function') {
        throw new Error(`API post method is not a function. Type: ${typeof api.post}`);
      }
      
      const response = await api.post('/tickets/', values);
      console.log('TicketFormWrapper: Response:', response);
      success('Ticket created successfully');
      navigate('/tickets');
    } catch (err) {
      console.error('Error creating ticket:', err);
      error('Error creating ticket');
      throw err; // Re-throw to let TicketForm handle it
    }
  };

  return <TicketForm onSubmit={handleSubmit} />;
}

// SiteFormWrapper component to handle form submission
function SiteFormWrapper() {
  const navigate = useNavigate();
  const api = useApi();
  const { success, error } = useToast();

  const handleSubmit = async (values) => {
    try {
      await api.post('/sites/', values);
      success('Site created successfully');
      navigate('/sites');
    } catch (err) {
      console.error('Error creating site:', err);
      error('Error creating site');
    }
  };

  return <SiteForm onSubmit={handleSubmit} />;
}

// UserFormWrapper component to handle form submission
function UserFormWrapper() {
  const navigate = useNavigate();
  const api = useApi();
  const { success, error } = useToast();

  const handleSubmit = async (values) => {
    try {
      await api.post('/users/', values);
      success('User created successfully');
      navigate('/users');
    } catch (err) {
      console.error('Error creating user:', err);
      error('Error creating user');
    }
  };

  return <UserForm onSubmit={handleSubmit} />;
}

// EquipmentFormWrapper component to handle form submission
function EquipmentFormWrapper() {
  const navigate = useNavigate();
  const api = useApi();
  const { success, error } = useToast();

  const handleSubmit = async (values) => {
    try {
      await api.post('/equipment/', values);
      success('Equipment created successfully');
      navigate('/equipment');
    } catch (err) {
      console.error('Error creating equipment:', err);
      error('Error creating equipment');
    }
  };

  return <EquipmentForm onSubmit={handleSubmit} />;
}

// InventoryFormWrapper component to handle form submission
function InventoryFormWrapper() {
  const navigate = useNavigate();
  const api = useApi();
  const { success, error } = useToast();

  const handleSubmit = async (values) => {
    try {
      await api.post('/inventory/', values);
      success('Inventory item created successfully');
      navigate('/inventory');
    } catch (err) {
      console.error('Error creating inventory item:', err);
      error('Error creating inventory item');
    }
  };

  return <InventoryForm onSubmit={handleSubmit} />;
}

// TaskFormWrapper component to handle form submission
function TaskFormWrapper() {
  const navigate = useNavigate();
  const api = useApi();
  const { success, error } = useToast();

  const handleSubmit = async (values) => {
    try {
      await api.post('/tasks/', values);
      success('Task created successfully');
      navigate('/tasks');
    } catch (err) {
      console.error('Error creating task:', err);
      error('Error creating task');
    }
  };

  return <TaskForm onSubmit={handleSubmit} />;
}

// ShipmentFormWrapper component to handle form submission
function ShipmentFormWrapper() {
  const navigate = useNavigate();
  const api = useApi();
  const { success, error } = useToast();

  const handleSubmit = async (values) => {
    try {
      await api.post('/shipments/', values);
      success('Shipment created successfully');
      navigate('/shipments');
    } catch (err) {
      console.error('Error creating shipment:', err);
      error('Error creating shipment');
    }
  };

  const handleClose = () => {
    navigate('/shipments');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Add New Shipment</Typography>
      <ShipmentForm 
        onSubmit={handleSubmit} 
        onClose={handleClose}
        isEdit={false}
      />
    </Box>
  );
}

// FieldTechFormWrapper component to handle form submission
function FieldTechFormWrapper() {
  const navigate = useNavigate();
  const api = useApi();
  const { success, error } = useToast();

  const handleSubmit = async (values) => {
    try {
      await api.post('/fieldtechs/', values);
      success('Field tech created successfully');
      navigate('/fieldtechs');
    } catch (err) {
      console.error('Error creating field tech:', err);
      error('Error creating field tech');
    }
  };

  return <FieldTechForm onSubmit={handleSubmit} />;
}

// Edit wrapper components
function TicketEditWrapper() {
  const navigate = useNavigate();
  const { ticket_id } = useParams();
  const api = useApi();
  const { error, success } = useToast();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await api.get(`/tickets/${ticket_id}`);
        setTicket(response);
      } catch (err) {
        console.error('Error fetching ticket:', err);
        error('Error loading ticket');
        navigate('/tickets');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticket_id, api, navigate, error]);

  const handleSubmit = async (values) => {
    try {
      await api.put(`/tickets/${ticket_id}`, values);
      success('Ticket updated successfully');
      navigate('/tickets');
    } catch (err) {
      console.error('Error updating ticket:', err);
      error('Error updating ticket');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!ticket) return <div>Ticket not found</div>;

  return <TicketForm onSubmit={handleSubmit} initialValues={ticket} isEdit={true} />;
}

function SiteEditWrapper() {
  const navigate = useNavigate();
  const { site_id } = useParams();
  const api = useApi();
  const { error, success } = useToast();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSite = async () => {
      try {
        const response = await api.get(`/sites/${site_id}`);
        setSite(response);
      } catch (err) {
        console.error('Error fetching site:', err);
        error('Error loading site');
        navigate('/sites');
      } finally {
        setLoading(false);
      }
    };
    fetchSite();
  }, [site_id, api, navigate, error]);

  const handleSubmit = async (values) => {
    try {
      await api.put(`/sites/${site_id}`, values);
      success('Site updated successfully');
      navigate('/sites');
    } catch (err) {
      console.error('Error updating site:', err);
      error('Error updating site');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!site) return <div>Site not found</div>;

  return <SiteForm onSubmit={handleSubmit} initialValues={site} isEdit={true} />;
}

function UserEditWrapper() {
  const navigate = useNavigate();
  const { user_id } = useParams();
  const api = useApi();
  const { error, success } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get(`/users/${user_id}`);
        setUser(response);
      } catch (err) {
        console.error('Error fetching user:', err);
        error('Error loading user');
        navigate('/users');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [user_id, api, navigate, error]);

  const handleSubmit = async (values) => {
    try {
      await api.put(`/users/${user_id}`, values);
      success('User updated successfully');
      navigate('/users');
    } catch (err) {
      console.error('Error updating user:', err);
      error('Error updating user');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return <UserForm onSubmit={handleSubmit} initialValues={user} isEdit={true} />;
}

function EquipmentEditWrapper() {
  const navigate = useNavigate();
  const { equipment_id } = useParams();
  const api = useApi();
  const { error, success } = useToast();
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const response = await api.get(`/equipment/${equipment_id}`);
        setEquipment(response);
      } catch (err) {
        console.error('Error fetching equipment:', err);
        error('Error loading equipment');
        navigate('/equipment');
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [equipment_id, api, navigate, error]);

  const handleSubmit = async (values) => {
    try {
      await api.put(`/equipment/${equipment_id}`, values);
      success('Equipment updated successfully');
      navigate('/equipment');
    } catch (err) {
      console.error('Error updating equipment:', err);
      error('Error updating equipment');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!equipment) return <div>Equipment not found</div>;

  return <EquipmentForm onSubmit={handleSubmit} initialValues={equipment} isEdit={true} />;
}

function InventoryEditWrapper() {
  const navigate = useNavigate();
  const { item_id } = useParams();
  const api = useApi();
  const { error, success } = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await api.get(`/inventory/${item_id}`);
        setItem(response);
      } catch (err) {
        console.error('Error fetching inventory item:', err);
        error('Error loading inventory item');
        navigate('/inventory');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [item_id, api, navigate, error]);

  const handleSubmit = async (values) => {
    try {
      await api.put(`/inventory/${item_id}`, values);
      success('Inventory item updated successfully');
      navigate('/inventory');
    } catch (err) {
      console.error('Error updating inventory item:', err);
      error('Error updating inventory item');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!item) return <div>Inventory item not found</div>;

  return <InventoryForm onSubmit={handleSubmit} initialValues={item} isEdit={true} />;
}

function TaskEditWrapper() {
  const navigate = useNavigate();
  const { task_id } = useParams();
  const api = useApi();
  const { error, success } = useToast();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await api.get(`/tasks/${task_id}`);
        setTask(response);
      } catch (err) {
        console.error('Error fetching task:', err);
        error('Error loading task');
        navigate('/tasks');
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [task_id, api, navigate, error]);

  const handleSubmit = async (values) => {
    try {
      await api.put(`/tasks/${task_id}`, values);
      success('Task updated successfully');
      navigate('/tasks');
    } catch (err) {
      console.error('Error updating task:', err);
      error('Error updating task');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!task) return <div>Task not found</div>;

  return <TaskForm onSubmit={handleSubmit} initialValues={task} isEdit={true} />;
}

function ShipmentEditWrapper() {
  const navigate = useNavigate();
  const { shipment_id } = useParams();
  const api = useApi();
  const { error, success } = useToast();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        const response = await api.get(`/shipments/${shipment_id}`);
        setShipment(response);
      } catch (err) {
        console.error('Error fetching shipment:', err);
        error('Error loading shipment');
        navigate('/shipments');
      } finally {
        setLoading(false);
      }
    };
    fetchShipment();
  }, [shipment_id, api, navigate, error]);

  const handleSubmit = async (values) => {
    try {
      await api.put(`/shipments/${shipment_id}`, values);
      success('Shipment updated successfully');
      navigate('/shipments');
    } catch (err) {
      console.error('Error updating shipment:', err);
      error('Error updating shipment');
    }
  };

  const handleClose = () => {
    navigate('/shipments');
  };

  if (loading) return <div>Loading...</div>;
  if (!shipment) return <div>Shipment not found</div>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Edit Shipment</Typography>
      <ShipmentForm 
        onSubmit={handleSubmit} 
        initialValues={shipment} 
        isEdit={true}
        onClose={handleClose}
      />
    </Box>
  );
}

function FieldTechEditWrapper() {
  const navigate = useNavigate();
  const { field_tech_id } = useParams();
  const api = useApi();
  const { error, success } = useToast();
  const [fieldTech, setFieldTech] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFieldTech = async () => {
      try {
        const response = await api.get(`/fieldtechs/${field_tech_id}`);
        setFieldTech(response);
      } catch (err) {
        console.error('Error fetching field tech:', err);
        error('Error loading field tech');
        navigate('/fieldtechs');
      } finally {
        setLoading(false);
      }
    };
    fetchFieldTech();
  }, [field_tech_id, api, navigate, error]);

  const handleSubmit = async (values) => {
    try {
      await api.put(`/fieldtechs/${field_tech_id}`, values);
      success('Field tech updated successfully');
      navigate('/fieldtechs');
    } catch (err) {
      console.error('Error updating field tech:', err);
      error('Error updating field tech');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!fieldTech) return <div>Field tech not found</div>;

  return <FieldTechForm onSubmit={handleSubmit} initialValues={fieldTech} isEdit={true} />;
}

// Color theme options
const colorThemes = {
  blue: {
    primary: { main: '#1976d2', light: '#42a5f5', dark: '#1565c0' },
    secondary: { main: '#dc004e', light: '#ff5983', dark: '#9a0036' }
  },
  green: {
    primary: { main: '#2e7d32', light: '#4caf50', dark: '#1b5e20' },
    secondary: { main: '#ff6f00', light: '#ff9800', dark: '#e65100' }
  },
  purple: {
    primary: { main: '#7b1fa2', light: '#9c27b0', dark: '#4a148c' },
    secondary: { main: '#ff5722', light: '#ff7043', dark: '#d84315' }
  },
  orange: {
    primary: { main: '#f57c00', light: '#ff9800', dark: '#e65100' },
    secondary: { main: '#1976d2', light: '#42a5f5', dark: '#1565c0' }
  },
  teal: {
    primary: { main: '#00796b', light: '#009688', dark: '#004d40' },
    secondary: { main: '#ff4081', light: '#f50057', dark: '#c51162' }
  },
  indigo: {
    primary: { main: '#3f51b5', light: '#5c6bc0', dark: '#303f9f' },
    secondary: { main: '#ff9800', light: '#ffb74d', dark: '#f57c00' }
  }
};

// Modern theme with better colors and spacing
const createAppTheme = (darkMode, colorTheme = 'blue') => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: colorThemes[colorTheme].primary,
    secondary: colorThemes[colorTheme].secondary,
    background: {
      default: darkMode ? '#121212' : '#fafafa',
      paper: darkMode ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: darkMode ? '#ffffff' : '#1a1a1a',
      secondary: darkMode ? '#b0b0b0' : '#666666',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: darkMode 
            ? '0 2px 8px rgba(0,0,0,0.3)' 
            : '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&:hover': {
            backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(25,118,210,0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: darkMode ? 'rgba(25,118,210,0.2)' : 'rgba(25,118,210,0.12)',
            '&:hover': {
              backgroundColor: darkMode ? 'rgba(25,118,210,0.25)' : 'rgba(25,118,210,0.16)',
            },
          },
        },
      },
    },
  },
});

const navigationItems = [
  {
    title: 'Daily Operations',
    path: '/',
    icon: <DashboardIcon sx={{ color: '#1976d2' }} />,
    badge: null
  },
  {
    title: 'Tickets',
    path: '/tickets',
    icon: <Assignment sx={{ color: '#dc004e' }} />,
    badge: null
  },
  {
    title: 'Sites',
    path: '/sites',
    icon: <Business sx={{ color: '#2e7d32' }} />,
    badge: null
  },
  {
    title: 'Shipping',
    path: '/shipments',
    icon: <LocalShipping sx={{ color: '#f57c00' }} />,
    badge: null
  },
  {
    title: 'Inventory',
    path: '/inventory',
    icon: <Build sx={{ color: '#7b1fa2' }} />,
    badge: null
  },
  {
    title: 'Field Techs',
    path: '/fieldtechs',
    icon: <Engineering sx={{ color: '#00796b' }} />,
    badge: null
  },
  {
    title: 'Tasks',
    path: '/tasks',
    icon: <Assessment sx={{ color: '#3f51b5' }} />,
    badge: null
  },
  {
    title: 'Equipment',
    path: '/equipment',
    icon: <Build sx={{ color: '#ff6f00' }} />,
    badge: null
  },
  {
    title: 'Audit',
    path: '/audit',
    icon: <Security sx={{ color: '#d32f2f' }} />,
    badge: null
  },
  {
    title: 'Users',
    path: '/users',
    icon: <Person sx={{ color: '#388e3c' }} />,
    badge: null
  },
  {
    title: 'Field Tech Map',
    path: '/map',
    icon: <Map sx={{ color: '#1976d2' }} />,
    badge: null
  },
  {
    title: 'SLA Management',
    path: '/sla',
    icon: <Speed sx={{ color: '#ff9800' }} />,
    badge: null
  }
];

const adminItems = [
  {
    title: 'Reports',
    path: '/reports',
    icon: <Assessment sx={{ color: '#9c27b0' }} />,
    badge: null
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: <Settings sx={{ color: '#607d8b' }} />,
    badge: null
  }
];

function AppLayout() {
  const { user, logout, loading } = useAuth();
  
  // Debug logging
  console.log('AppLayout render - user:', user ? 'exists' : 'none', 'loading:', loading);
  console.log('AppLayout sessionStorage token:', sessionStorage.getItem('access_token') ? 'exists' : 'none');
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, clearNotification } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set(['main']));
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  
  // Load theme preferences from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [selectedColorTheme, setSelectedColorTheme] = useState(() => {
    const saved = localStorage.getItem('colorTheme');
    return saved || 'blue';
  });

  const location = useLocation();
  const navigate = useNavigate();

  const theme = createAppTheme(darkMode, selectedColorTheme);

  // Save theme preferences to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('colorTheme', selectedColorTheme);
  }, [selectedColorTheme]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
  };

  const handleClearAllNotifications = () => {
    clearAll();
    setNotificationsAnchor(null);
  };

  const handleMarkAsRead = (notificationId) => {
    markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleThemeChange = (newTheme) => {
    setSelectedColorTheme(newTheme);
    setThemeDialogOpen(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleExpanded = (section) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedItems(newExpanded);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleUserMenuClose();
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/tickets/')) return 'Ticket Details';
    if (path.startsWith('/sites/')) return 'Site Details';
    if (path.startsWith('/users/')) return 'User Details';
    
    const item = [...navigationItems, ...adminItems].find(item => item.path === path);
    return item ? item.title : 'Page Not Found';
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const breadcrumbs = [{ title: 'Home', path: '/' }];
    
    if (path === '/') return breadcrumbs;
    
    if (path.startsWith('/tickets')) {
      breadcrumbs.push({ title: 'Tickets', path: '/tickets' });
      if (path !== '/tickets') {
        breadcrumbs.push({ title: 'Details', path: path });
      }
    } else if (path.startsWith('/sites')) {
      breadcrumbs.push({ title: 'Sites', path: '/sites' });
      if (path !== '/sites') {
        breadcrumbs.push({ title: 'Details', path: path });
      }
    } else if (path.startsWith('/users')) {
      breadcrumbs.push({ title: 'Users', path: '/users' });
      if (path !== '/users') {
        breadcrumbs.push({ title: 'Details', path: path });
      }
    } else {
      const item = [...navigationItems, ...adminItems].find(item => item.path === path);
      if (item) {
        breadcrumbs.push({ title: item.title, path: item.path });
      }
    }
    
    return breadcrumbs;
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand */}
      <Box sx={{ 
        p: 3, 
        borderBottom: 1, 
        borderColor: 'divider'
      }}>
        <Logo size="medium" showText={true} variant="build" />
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {/* Main Navigation */}
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => toggleExpanded('main')}
              sx={{ px: 3 }}
            >
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary="Main" />
              {expandedItems.has('main') ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          
          {expandedItems.has('main') && (
            <List component="div" disablePadding>
              {navigationItems.map((item) => (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    sx={{ pl: 6 }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.title} />
                    {item.badge && (
                      <Badge badgeContent={item.badge} color="error" />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Admin Navigation */}
        {(user?.role === 'admin' || user?.role === 'dispatcher') && (
          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => toggleExpanded('admin')}
                sx={{ px: 3 }}
              >
                <ListItemIcon>
                  <AdminPanelSettings />
                </ListItemIcon>
                <ListItemText primary="Admin" />
                {expandedItems.has('admin') ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            
            {expandedItems.has('admin') && (
              <List component="div" disablePadding>
                {adminItems.map((item) => (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton
                      selected={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                      sx={{ pl: 6 }}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.title} />
                      {item.badge && (
                        <Badge badgeContent={item.badge} color="error" />
                      )}
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </List>
        )}
      </Box>

      {/* User Profile */}
      <Box sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider',
        backgroundColor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 40, height: 40 }}>
            {user?.name?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {user?.name || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role || 'User'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleUserMenuOpen}>
            <KeyboardArrowDown />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: 'background.default'
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Only redirect to login if we're not loading AND there's no user AND no tokens in sessionStorage
  if (!user && !sessionStorage.getItem('access_token')) {
    return <Navigate to="/login" replace />;
  }

  // If we have tokens but no user yet, show loading (this handles the refresh case)
  if (!user && sessionStorage.getItem('access_token')) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: 'background.default'
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <CssBaseline />
        
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
            backgroundColor: 'background.paper',
            color: 'text.primary',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: theme.zIndex.drawer + 1
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {getPageTitle()}
              </Typography>
              <Breadcrumbs separator={<ChevronRight fontSize="small" />}>
                {getBreadcrumbs().map((crumb, index) => (
                  <Link
                    key={index}
                    color={index === getBreadcrumbs().length - 1 ? 'text.primary' : 'inherit'}
                    href={crumb.path}
                    underline="hover"
                    sx={{ 
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {crumb.title}
                  </Link>
                ))}
              </Breadcrumbs>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Notifications */}
              <Tooltip title="Notifications">
                <IconButton
                  color="inherit"
                  onClick={handleNotificationsOpen}
                  sx={{ position: 'relative' }}
                >
                  <Badge badgeContent={unreadCount} color="error">
                    <Notifications />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* Theme Customization */}
              <Tooltip title="Customize theme">
                <IconButton
                  color="inherit"
                  onClick={() => setThemeDialogOpen(true)}
                >
                  <Palette />
                </IconButton>
              </Tooltip>

              {/* Dark Mode Toggle */}
              <Tooltip title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
                <IconButton
                  color="inherit"
                  onClick={toggleDarkMode}
                >
                  {darkMode ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
              </Tooltip>

              {/* User Menu */}
              <Tooltip title="User menu">
                <IconButton
                  color="inherit"
                  onClick={handleUserMenuOpen}
                  sx={{ ml: 1 }}
                >
                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                    {user?.name?.charAt(0) || 'U'}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Drawer */}
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                backgroundColor: 'background.paper',
                borderRight: 1,
                borderColor: 'divider'
              },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                backgroundColor: 'background.paper',
                borderRight: 1,
                borderColor: 'divider'
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            mt: 8
          }}
        >
          <Routes>
            <Route path="/" element={<DailyOperationsDashboard />} />
            
            {/* Ticket Routes */}
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/new" element={<TicketFormWrapper />} />
            <Route path="/tickets/:ticket_id" element={<TicketDetail />} />
            <Route path="/tickets/:ticket_id/edit" element={<TicketEditWrapper />} />
            <Route path="/tickets/:ticket_id/claim" element={<TicketClaim />} />
            
            {/* Site Routes */}
            <Route path="/sites" element={<Sites />} />
            <Route path="/sites/new" element={<SiteFormWrapper />} />
            <Route path="/sites/:site_id" element={<SiteDetail />} />
            <Route path="/sites/:site_id/edit" element={<SiteEditWrapper />} />
            
            {/* User Routes */}
            <Route path="/users" element={<Users />} />
            <Route path="/users/new" element={<UserFormWrapper />} />
            <Route path="/users/:user_id/edit" element={<UserEditWrapper />} />
            
            {/* Equipment Routes */}
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/equipment/new" element={<EquipmentFormWrapper />} />
            <Route path="/equipment/:equipment_id/edit" element={<EquipmentEditWrapper />} />
            
            {/* Inventory Routes */}
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/new" element={<InventoryFormWrapper />} />
            <Route path="/inventory/:item_id/edit" element={<InventoryEditWrapper />} />
            
            {/* Task Routes */}
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/new" element={<TaskFormWrapper />} />
            <Route path="/tasks/:task_id/edit" element={<TaskEditWrapper />} />
            
            {/* Shipment Routes */}
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/shipments/new" element={<ShipmentFormWrapper />} />
            <Route path="/shipments/:shipment_id/edit" element={<ShipmentEditWrapper />} />
            
            {/* Field Tech Routes */}
            <Route path="/fieldtechs" element={<FieldTechs />} />
            <Route path="/fieldtechs/new" element={<FieldTechFormWrapper />} />
            <Route path="/fieldtechs/:field_tech_id/edit" element={<FieldTechEditWrapper />} />
            
            {/* Other Routes */}
            <Route path="/audit" element={<Audit />} />
            <Route path="/map" element={<FieldTechMap />} />
            <Route path="/sla" element={<SLAManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/change-password" element={<ChangePassword userId={location.state?.userId || (user && user.user_id)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>

        {/* User Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          PaperProps={{
            sx: { minWidth: 200, mt: 1 }
          }}
        >
          <MenuItem onClick={() => {
            handleUserMenuClose();
            navigate('/profile');
          }}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => {
            handleUserMenuClose();
            navigate('/settings');
          }}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationsAnchor}
          open={Boolean(notificationsAnchor)}
          onClose={handleNotificationsClose}
          PaperProps={{
            sx: { minWidth: 350, mt: 1, maxHeight: 400 }
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Notifications</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {unreadCount > 0 && (
                  <Button size="small" onClick={handleMarkAllAsRead}>
                    Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <IconButton size="small" onClick={handleClearAllNotifications}>
                    <Clear fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Box>
          
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <MenuItem 
                key={notification.id}
                onClick={() => handleMarkAsRead(notification.id)}
                sx={{ 
                  opacity: notification.read ? 0.6 : 1,
                  borderBottom: 1, 
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 }
                }}
              >
                <ListItemIcon>
                  {notification.type === 'info' && <Info color="primary" />}
                  {notification.type === 'warning' && <Warning color="warning" />}
                  {notification.type === 'error' && <Error color="error" />}
                  {notification.type === 'success' && <CheckCircle color="success" />}
                </ListItemIcon>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {notification.timestamp ? new Date(notification.timestamp).toLocaleString([], { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : 'Just now'} • {notification.read ? 'Read' : 'Unread'}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Menu>

        {/* Theme Customization Dialog */}
        <Dialog 
          open={themeDialogOpen} 
          onClose={() => setThemeDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Palette />
              Customize Theme
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose your preferred color theme for the application
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(colorThemes).map(([themeName, colors]) => (
                <Grid item xs={6} sm={4} key={themeName}>
                  <ThemePreview
                    themeName={themeName}
                    colors={colors}
                    isSelected={selectedColorTheme === themeName}
                    onClick={() => handleThemeChange(themeName)}
                  />
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setThemeDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DataSyncProvider>
          <NotificationProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                } />
              </Routes>
            </Router>
          </NotificationProvider>
        </DataSyncProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
