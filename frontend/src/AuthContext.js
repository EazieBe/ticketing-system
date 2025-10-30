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
    console.log('AuthContext useEffect - accessToken:', accessToken ? 'exists' : 'none', 'user:', user ? 'exists' : 'none', 'loading:', loading);
    console.log('SessionStorage tokens:', {
      access: sessionStorage.getItem('access_token') ? 'exists' : 'none',
      refresh: sessionStorage.getItem('refresh_token') ? 'exists' : 'none'
    });
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading && isMountedRef.current) {
        console.log('Loading timeout reached, setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout
    
    // Check if we have tokens in sessionStorage but not in state
    const storedAccessToken = sessionStorage.getItem('access_token');
    const storedRefreshToken = sessionStorage.getItem('refresh_token');
    
    if (!accessToken && storedAccessToken) {
      console.log('Found stored tokens, setting state...');
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      // Set axios default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`;
      return; // This will trigger the effect again with the new accessToken
    }
    
    if (accessToken && !user) {
      const decoded = validateToken(accessToken);
      
      if (decoded && decoded.sub) {
        console.log('Valid access token found, fetching user data...');
        api.get(`/users/${decoded.sub}`)
          .then(res => {
            console.log('User fetch successful:', res.data);
            console.log('Setting user data:', res.data);
            setUser(res.data);
            
            // Load user-specific dark mode preference
            const userDarkMode = localStorage.getItem(`darkMode_${res.data.user_id}`);
            if (userDarkMode !== null) {
              setDarkMode(JSON.parse(userDarkMode));
            } else {
              const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              setDarkMode(systemPrefersDark);
            }
            
            // Schedule token refresh
            const currentTime = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = decoded.exp - currentTime;
            const refreshTime = Math.max((timeUntilExpiry - 300) * 1000, 60000); // 5 min before expiry, or 1 min minimum
            
            if (refreshTimeoutRef.current) {
              clearTimeout(refreshTimeoutRef.current);
            }
            refreshTimeoutRef.current = setTimeout(refreshAccessToken, refreshTime);
          })
          .catch(err => {
            console.error('Error fetching user:', err);
            // Only clear auth if it's a 401 (unauthorized) error
            if (err.response?.status === 401) {
              console.log('Token invalid, clearing auth');
              clearAuth();
            } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
              console.log('Network error - backend might be down, keeping user logged in');
              // For network errors, keep the user logged in
            } else {
              console.log('Other error, keeping user logged in:', err.message);
              // For other errors, keep the user logged in
            }
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        console.log('Invalid or expired access token, attempting refresh...');
        console.log('Token validation failed - decoded:', decoded);
        refreshAccessToken().finally(() => {
          setLoading(false);
        });
      }
    } else if (!accessToken && !sessionStorage.getItem('access_token')) {
      // Only set loading to false if there's truly no token anywhere
      console.log('No access token found anywhere');
      setLoading(false);
    }
    
    // Cleanup timeout
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [accessToken, user, loading, refreshAccessToken]);

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
      const response = await api.post('/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
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
      if (userFromLogin && userFromLogin.user_id) {
        setUser(userFromLogin);
      } else {
        const decoded = JSON.parse(atob(access_token.split('.')[1]));
        const user_id = decoded.sub;
        const userResponse = await api.get(`/users/${user_id}`);
        setUser(userResponse.data);
      }
      
      // Schedule token refresh
      const refreshTime = (expires_in - 300) * 1000;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(refreshAccessToken, refreshTime);
      
      // Load user preferences
      const finalUser = userFromLogin || (user && user.user_id ? user : null);
      if (finalUser) {
        const userDarkMode = localStorage.getItem(`darkMode_${finalUser.user_id}`);
        if (userDarkMode !== null) {
          setDarkMode(JSON.parse(userDarkMode));
        } else {
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setDarkMode(systemPrefersDark);
        }
      }
      
      return { success: true, mustChangePassword: must_change_password, userId: (userFromLogin && userFromLogin.user_id) || null };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
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
      setUser(response.data);
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