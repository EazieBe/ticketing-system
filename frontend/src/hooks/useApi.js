import { useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import useErrorHandler from './useErrorHandler';
import api from '../axiosConfig';

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { logout } = useAuth();
  const { handleApiError } = useErrorHandler();

  const request = useCallback(async (config, showToast = true) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api(config);
      
      if (showToast && response.data?.message) {
        // You can integrate with a toast library here
        console.log('Success:', response.data.message);
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
      setError(errorMessage);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        logout();
      }
      
      if (showToast) {
        handleApiError(err, 'API request');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const get = useCallback((url, config = {}) => {
    return request({ ...config, method: 'GET', url }, config.showToast);
  }, [request]);

  const post = useCallback((url, data = {}, config = {}) => {
    return request({ ...config, method: 'POST', url, data }, config.showToast);
  }, [request]);

  const put = useCallback((url, data = {}, config = {}) => {
    return request({ ...config, method: 'PUT', url, data }, config.showToast);
  }, [request]);

  const patch = useCallback((url, data = {}, config = {}) => {
    return request({ ...config, method: 'PATCH', url, data }, config.showToast);
  }, [request]);

  const del = useCallback((url, config = {}) => {
    return request({ ...config, method: 'DELETE', url }, config.showToast);
  }, [request]);

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    clearError: () => setError(null)
  };
};

export default useApi; 