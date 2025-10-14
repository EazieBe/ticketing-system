// Centralized configuration for the ticketing system
// This file centralizes all base URLs and configuration settings

// Get the current hostname and protocol dynamically
const getBaseUrl = () => {
  // Use the static IP for this LAN-only application
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = '192.168.43.50'; // Static IP of the server
  const port = '8000'; // Backend port
  
  return `${protocol}//${hostname}:${port}`;
};

// Get WebSocket URL based on the same logic
const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = '192.168.43.50'; // Static IP of the server
  const port = '8000'; // Backend port
  
  return `${protocol}//${hostname}:${port}`;
};

// Export configuration
export const config = {
  API_BASE_URL: getBaseUrl(),
  WS_BASE_URL: getWebSocketUrl(),
  WS_ENDPOINT: '/ws/updates',
  TIMEOUT: 30000, // Increased from 10s to 30s for complex operations
  MAX_RECONNECT_ATTEMPTS: 2,
  RECONNECT_DELAY: 5000,
  PING_INTERVAL: 60000,
};

// Helper function to get full WebSocket URL
export const getWebSocketFullUrl = () => {
  try {
    const token = sessionStorage.getItem('access_token');
    const base = `${config.WS_BASE_URL}${config.WS_ENDPOINT}`;
    if (token) {
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}token=${encodeURIComponent(token)}`;
    }
    return base;
  } catch {
    return `${config.WS_BASE_URL}${config.WS_ENDPOINT}`;
  }
};

// Helper function to get full API URL for a specific endpoint
export const getApiUrl = (endpoint) => {
  return `${config.API_BASE_URL}${endpoint}`;
};

export default config;
