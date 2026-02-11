import axios from 'axios';
import { config } from './config';

const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.TIMEOUT,
});

// Set Authorization from storage on load (for page refresh)
(function initAuthHeader() {
  try {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
})();

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(resolve, reject) {
  refreshSubscribers.push({ resolve, reject });
}

function onRefreshed(token) {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(err) {
  refreshSubscribers.forEach(({ reject }) => reject(err));
  refreshSubscribers = [];
}

function clearAuthAndNotify() {
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  delete api.defaults.headers.common['Authorization'];
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
  }
}

// Request: always attach current token from sessionStorage (sync, no refresh here)
api.interceptors.request.use(
  (reqConfig) => {
    if (reqConfig.url?.includes('/login') || reqConfig.url?.includes('/refresh')) {
      return reqConfig;
    }
    const token = sessionStorage.getItem('access_token');
    if (token) {
      reqConfig.headers['Authorization'] = `Bearer ${token}`;
    }
    return reqConfig;
  },
  (err) => Promise.reject(err)
);

// Response: on 401, refresh once and retry the failed request (and any others waiting)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    const isAuthRoute = originalRequest.url?.includes('/login') || originalRequest.url?.includes('/refresh');
    if (err.response?.status !== 401 || originalRequest._retry || isAuthRoute) {
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token) => {
          const retryConfig = {
            ...originalRequest,
            headers: { ...originalRequest.headers, Authorization: `Bearer ${token}` },
          };
          api(retryConfig).then(resolve).catch(reject);
        }, reject);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = sessionStorage.getItem('refresh_token');
    if (!refreshToken) {
      isRefreshing = false;
      clearAuthAndNotify();
      return Promise.reject(err);
    }

    const base = (config.API_BASE_URL || '').replace(/\/$/, '');
    const refreshUrl = base ? `${base}/refresh` : '/refresh';

    try {
      const res = await axios.post(refreshUrl, { refresh_token: refreshToken }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.TIMEOUT,
      });

      const { access_token, refresh_token: newRefreshToken } = res.data;
      sessionStorage.setItem('access_token', access_token);
      sessionStorage.setItem('refresh_token', newRefreshToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      onRefreshed(access_token);

      // Retry with a fresh config so the new token is definitely sent (avoid stale refs)
      const retryConfig = {
        ...originalRequest,
        headers: {
          ...originalRequest.headers,
          Authorization: `Bearer ${access_token}`,
        },
      };
      isRefreshing = false;

      return api(retryConfig);
    } catch (refreshErr) {
      isRefreshing = false;
      onRefreshFailed(refreshErr);
      if (refreshErr.response?.status === 401) {
        clearAuthAndNotify();
      }
      return Promise.reject(refreshErr);
    }
  }
);

export default api;
