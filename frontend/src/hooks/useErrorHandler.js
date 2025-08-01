import { useToast } from '../contexts/ToastContext';

const useErrorHandler = () => {
  const { error: showError } = useToast();

  const handleError = (error, context = 'Operation') => {
    // Extract error message
    let errorMessage = 'An unexpected error occurred';
    
    if (error?.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Show error toast
    showError(`${context} failed: ${errorMessage}`);
    
    // Log to console for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.error(`${context} error:`, error);
    }
  };

  const handleApiError = (error, operation = 'API call') => {
    if (error?.response?.status === 401) {
      // Handle authentication errors
      showError('Session expired. Please log in again.');
      // You might want to trigger logout here
      return;
    }
    
    if (error?.response?.status === 403) {
      showError('You do not have permission to perform this action.');
      return;
    }
    
    if (error?.response?.status === 404) {
      showError('The requested resource was not found.');
      return;
    }
    
    if (error?.response?.status >= 500) {
      showError('Server error. Please try again later.');
      return;
    }
    
    handleError(error, operation);
  };

  return {
    handleError,
    handleApiError
  };
};

export default useErrorHandler; 