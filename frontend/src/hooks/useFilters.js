import { useState, useCallback, useMemo } from 'react';

const useFilters = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const removeFilter = useCallback((key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => 
      value !== null && value !== undefined && value !== ''
    );
  }, [filters]);

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(value => 
      value !== null && value !== undefined && value !== ''
    ).length;
  }, [filters]);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, value);
        }
      }
    });
    
    return params.toString();
  }, [filters]);

  const getQueryParams = useCallback(() => {
    const params = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params[key] = value;
      }
    });
    
    return params;
  }, [filters]);

  return {
    // State
    filters,
    
    // Actions
    updateFilter,
    updateFilters,
    removeFilter,
    clearFilters,
    
    // Computed
    hasActiveFilters,
    activeFiltersCount,
    
    // Utilities
    buildQueryString,
    getQueryParams
  };
};

export default useFilters; 