import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../axiosConfig';

/**
 * Optimized API hook with caching, request deduplication, and performance monitoring
 */
function useOptimizedApi() {
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const { error: showError } = useToast();
  
  // Request cache to prevent duplicate requests
  const requestCache = useRef(new Map());
  const activeRequests = useRef(new Map());
  
  // Performance monitoring
  const performanceMetrics = useRef({
    totalRequests: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    errorCount: 0
  });

  // Cleanup function to clear cache and active requests
  const cleanup = useCallback(() => {
    requestCache.current.clear();
    activeRequests.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const makeRequest = useCallback(async (method, endpoint, data = null, options = {}) => {
    const startTime = performance.now();
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(data)}`;
    
    // Check cache first (only for GET requests)
    if (method === 'GET' && requestCache.current.has(cacheKey)) {
      const cachedData = requestCache.current.get(cacheKey);
      // Check if cache is still valid (5 minutes)
      if (Date.now() - cachedData.timestamp < 300000) {
        performanceMetrics.current.cacheHits++;
        return cachedData.data;
      } else {
        requestCache.current.delete(cacheKey);
      }
    }

    // Check if request is already in progress
    if (activeRequests.current.has(cacheKey)) {
      return activeRequests.current.get(cacheKey);
    }

    // Create request promise
    const requestPromise = (async () => {
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

        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Update performance metrics
        performanceMetrics.current.totalRequests++;
        performanceMetrics.current.averageResponseTime = 
          (performanceMetrics.current.averageResponseTime * (performanceMetrics.current.totalRequests - 1) + responseTime) / 
          performanceMetrics.current.totalRequests;

        // Cache GET requests
        if (method === 'GET') {
          requestCache.current.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
          });
        }

        return response.data;
      } catch (err) {
        performanceMetrics.current.errorCount++;
        console.error('API Error:', err);
        
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
        
        const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
        showError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
        // Remove from active requests
        activeRequests.current.delete(cacheKey);
      }
    })();

    // Store active request
    activeRequests.current.set(cacheKey, requestPromise);
    
    return requestPromise;
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

  // Cache management functions
  const invalidateCache = useCallback((pattern) => {
    if (pattern) {
      // Invalidate specific cache entries matching pattern
      for (const [key] of requestCache.current) {
        if (key.includes(pattern)) {
          requestCache.current.delete(key);
        }
      }
    } else {
      // Clear all cache
      requestCache.current.clear();
    }
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      cacheSize: requestCache.current.size,
      activeRequests: activeRequests.current.size,
      ...performanceMetrics.current
    };
  }, []);

  return {
    get,
    post,
    put,
    patch,
    delete: delete_,
    loading,
    invalidateCache,
    getCacheStats,
    cleanup
  };
}

export default useOptimizedApi;
