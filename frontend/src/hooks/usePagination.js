import { useState, useCallback } from 'react';

const usePagination = (initialPage = 1, initialPageSize = 20) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);

  const skip = (currentPage - 1) * pageSize;
  const totalPages = Math.ceil(totalItems / pageSize);

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const changePageSize = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const updateTotalItems = useCallback((total) => {
    setTotalItems(total);
  }, []);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setTotalItems(0);
  }, []);

  return {
    // State
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    skip,
    
    // Actions
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,
    updateTotalItems,
    resetPagination,
    
    // Computed
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
    
    // Pagination info
    startItem: totalItems > 0 ? skip + 1 : 0,
    endItem: Math.min(skip + pageSize, totalItems),
    
    // Query parameters for API calls
    queryParams: {
      skip,
      limit: pageSize
    }
  };
};

export default usePagination; 