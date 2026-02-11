// Centralized configuration for the ticketing system.
// Front and back run on the same server; app is only accessed from PCs on the same LAN.
// We use the same host as the page so API/WS URLs work whether you open by localhost or by the server's LAN IP.
const getApiHost = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
};

// Always hit the backend on port 8000 (same host as the page).
// This works for both: npm start (dev) and serve -s build (prod). Using empty base + proxy
// was causing API calls to hit the wrong server or lose the Authorization header.
const getBaseUrl = () => {
  const protocol = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = getApiHost();
  return `${protocol}//${hostname}:8000`;
};

const getWebSocketUrl = () => {
  // WebSocket is not proxied by CRA; always use backend host:port
  const protocol = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = getApiHost();
  const port = '8000';
  return `${protocol}//${hostname}:${port}`;
};

// Export configuration
export const config = {
  API_BASE_URL: getBaseUrl(),
  WS_BASE_URL: getWebSocketUrl(),
  WS_ENDPOINT: '/ws/updates',
  TIMEOUT: 30000, // Increased from 10s to 30s for complex operations
  MAX_RECONNECT_ATTEMPTS: 5,
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
