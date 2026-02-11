import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from './axiosConfig';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(sessionStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(sessionStorage.getItem('refresh_token'));
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const refreshTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // Function to clear all auth data
  const clearAuth = useCallback(() => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setLoading(false);
    // Clear axios default headers
    delete api.defaults.headers.common['Authorization'];
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Function to refresh access token
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      clearAuth();
      return false;
    }

    try {
      const response = await api.post('/refresh', { refresh_token: refreshToken });
      const { access_token, refresh_token, expires_in } = response.data;
      
      // Update sessionStorage and state
      sessionStorage.setItem('access_token', access_token);
      sessionStorage.setItem('refresh_token', refresh_token);
      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      
      // Update axios default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Schedule next refresh 5 minutes before expiry
      const refreshTime = (expires_in - 300) * 1000; // Convert to milliseconds
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(refreshAccessToken, refreshTime);
      
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearAuth();
      return false;
    }
  }, [refreshToken, clearAuth]);

  // Function to decode and validate token
  const validateToken = (token) => {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (decoded.exp && decoded.exp < currentTime) {
        return null; // Token expired
      }
      
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading && isMountedRef.current) {
        setLoading(false);
      }
    }, 10000); // 10 second timeout
    
    // Check if we have tokens in sessionStorage but not in state
    const storedAccessToken = sessionStorage.getItem('access_token');
    const storedRefreshToken = sessionStorage.getItem('refresh_token');
    
    if (!accessToken && storedAccessToken) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      // Set axios default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`;
      return; // This will trigger the effect again with the new accessToken
    }
    
    if (accessToken && !user) {
      const decoded = validateToken(accessToken);
      
      if (decoded && decoded.sub) {
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - currentTime;
        const nearExpiry = timeUntilExpiry < 300;

        const fetchUserAndScheduleRefresh = async () => {
          try {
            if (nearExpiry) {
              const ok = await refreshAccessToken();
              if (!ok) {
                clearAuth();
                setLoading(false);
                return;
              }
            }
            const res = await api.get(`/users/${decoded.sub}`);
            const userData = res.data;
            setUser(userData);

            const userDarkMode = localStorage.getItem(`darkMode_${userData.user_id}`);
            if (userDarkMode !== null) {
              setDarkMode(JSON.parse(userDarkMode));
            } else {
              const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              setDarkMode(systemPrefersDark);
            }

            const decodedAfter = nearExpiry ? validateToken(sessionStorage.getItem('access_token')) : decoded;
            const exp = decodedAfter?.exp ?? decoded.exp;
            const timeUntilExpiryAfter = exp - Math.floor(Date.now() / 1000);
            const refreshTime = Math.max((timeUntilExpiryAfter - 300) * 1000, 60000);
            if (refreshTimeoutRef.current) {
              clearTimeout(refreshTimeoutRef.current);
            }
            refreshTimeoutRef.current = setTimeout(refreshAccessToken, refreshTime);
          } catch (err) {
            console.error('Error fetching user:', err);
            if (err.response?.status === 401) {
              clearAuth();
            }
          } finally {
            setLoading(false);
          }
        };

        fetchUserAndScheduleRefresh();
      } else {
        refreshAccessToken().finally(() => {
          setLoading(false);
        });
      }
    } else if (!accessToken && !sessionStorage.getItem('access_token')) {
      setLoading(false);
    }
    
    // Cleanup timeout
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [accessToken, user, loading, refreshAccessToken]);

  // Listen for session-expired from axios interceptor (refresh failed with 401)
  useEffect(() => {
    const handler = () => {
      clearAuth();
    };
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, [clearAuth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const login = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      // Send as string so backend always receives form-encoded body (OAuth2PasswordRequestForm)
      const response = await api.post('/login', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      // api is raw axios: response body is in response.data
      const { access_token, refresh_token, expires_in, must_change_password, user: userFromLogin } = response.data;
      
      // Set tokens in sessionStorage FIRST before any API calls
      sessionStorage.setItem('access_token', access_token);
      sessionStorage.setItem('refresh_token', refresh_token);
      
      // Update state
      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      
      // Update axios default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // If backend returned user, use it to avoid an immediate extra request
      let finalUserData = null;
      if (userFromLogin && userFromLogin.user_id) {
        setUser(userFromLogin);
        finalUserData = userFromLogin;
      } else {
        const decoded = JSON.parse(atob(access_token.split('.')[1]));
        const user_id = decoded.sub;
        const userResponse = await api.get(`/users/${user_id}`);
        // useApi already returns response.data, so userResponse is the user object directly
        setUser(userResponse);
        finalUserData = userResponse;
      }
      
      // Schedule token refresh
      const refreshTime = (expires_in - 300) * 1000;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(refreshAccessToken, refreshTime);
      
      // Load user preferences using the captured user data (not state, which is async)
      if (finalUserData && finalUserData.user_id) {
        const userDarkMode = localStorage.getItem(`darkMode_${finalUserData.user_id}`);
        if (userDarkMode !== null) {
          setDarkMode(JSON.parse(userDarkMode));
        } else {
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setDarkMode(systemPrefersDark);
        }
      }
      
      return { success: true, mustChangePassword: must_change_password, userId: finalUserData?.user_id || null };
    } catch (error) {
      console.error('Login error:', error);
      let message = 'Login failed';
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message = 'Cannot reach server. Check that the app and API are running and you can reach the server.';
      } else if (error.response?.data?.detail) {
        const d = error.response.data.detail;
        message = Array.isArray(d) ? d.map(e => e.msg || JSON.stringify(e)).join(', ') : String(d);
      }
      return { success: false, error: message };
    }
  };

  const logout = () => {
    clearAuth();
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Save user-specific preference
    if (user) {
      localStorage.setItem(`darkMode_${user.user_id}`, JSON.stringify(newDarkMode));
    }
  };

  const updateUser = async (userData) => {
    try {
      const response = await api.put(`/users/${user.user_id}`, userData);
      // useApi returns response.data directly, so response is already the user object
      setUser(response);
      return { success: true };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.response?.data?.detail || 'Update failed' };
    }
  };

  const value = {
    user,
    token: accessToken, // Expose accessToken as 'token' for compatibility
    loading,
    darkMode,
    login,
    logout,
    toggleDarkMode,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 