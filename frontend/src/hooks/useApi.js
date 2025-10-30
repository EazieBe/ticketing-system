import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../axiosConfig';

function useApi() {
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const { error: showError } = useToast();

  const makeRequest = useCallback(async (method, endpoint, data = null, options = {}) => {
    setLoading(true);
    
    try {
      const config = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      if (data && method !== 'GET') {
        config.data = data;
      }

      const response = await api.request({
        url: endpoint,
        ...config,
      });

      return response.data;
    } catch (err) {
      console.error('API Error:', err);
      
      // Handle timeout errors
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        const timeoutError = 'Request timed out - the server may be slow or overloaded. Please try again.';
        console.error(timeoutError);
        showError(timeoutError);
        throw new Error(timeoutError);
      }
      
      // Handle network errors specifically
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        const networkError = 'Network error - please check if the server is running';
        console.error(networkError);
        showError(networkError);
        throw new Error(networkError);
      }
      
      if (err.response?.status === 401) {
        logout();
        throw new Error('Unauthorized - please log in again');
      }
      
      // Don't show error toasts for 404 errors (expected for deleted resources)
      if (err.response?.status === 404) {
        const errorMessage = err.response?.data?.detail || err.message || 'Resource not found';
        throw new Error(errorMessage);
      }
      
      // Handle 422 validation errors (FastAPI/Pydantic)
      if (err.response?.status === 422) {
        const validationErrors = err.response?.data?.detail || err.response?.data;
        let errorMessage = 'Validation error';
        
        if (Array.isArray(validationErrors)) {
          // Pydantic returns array of errors
          const messages = validationErrors.map(e => `${e.loc?.join?.('.') || 'field'}: ${e.msg}`).join(', ');
          errorMessage = `Validation error: ${messages}`;
        } else if (typeof validationErrors === 'string') {
          errorMessage = validationErrors;
        } else if (validationErrors?.msg) {
          errorMessage = validationErrors.msg;
        }
        
        showError(errorMessage);
        throw new Error(errorMessage);
      }
      
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
      showError(String(errorMessage)); // Ensure it's a string
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [logout, showError]);

  const get = useCallback((endpoint, options = {}) => {
    return makeRequest('GET', endpoint, null, options);
  }, [makeRequest]);

  const post = useCallback((endpoint, data, options = {}) => {
    return makeRequest('POST', endpoint, data, options);
  }, [makeRequest]);

  const put = useCallback((endpoint, data, options = {}) => {
    return makeRequest('PUT', endpoint, data, options);
  }, [makeRequest]);

  const patch = useCallback((endpoint, data, options = {}) => {
    return makeRequest('PATCH', endpoint, data, options);
  }, [makeRequest]);

  const delete_ = useCallback((endpoint, options = {}) => {
    return makeRequest('DELETE', endpoint, null, options);
  }, [makeRequest]);

  return useMemo(() => ({
    get,
    post,
    put,
    patch,
    delete: delete_,
    loading,
  }), [get, post, put, patch, delete_, loading]);
}

export default useApi; 