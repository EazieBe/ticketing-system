import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import useApi from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';

/**
 * Generic FormWrapper component to handle form submission and navigation
 * Eliminates code duplication across all form wrapper components
 * 
 * @param {Object} props - Component props
 * @param {React.Component} props.FormComponent - The form component to render
 * @param {string} props.endpoint - API endpoint for the operation
 * @param {string} props.successMessage - Success message to show
 * @param {string} props.errorMessage - Error message to show
 * @param {string} props.redirectPath - Path to redirect after success
 * @param {boolean} props.isEdit - Whether this is an edit operation
 * @param {Object} props.initialValues - Initial values for edit mode
 * @param {Object} props.additionalProps - Additional props to pass to FormComponent
 */
const FormWrapper = ({
  FormComponent,
  endpoint,
  successMessage,
  errorMessage,
  redirectPath,
  isEdit = false,
  initialValues = null,
  additionalProps = {}
}) => {
  const navigate = useNavigate();
  const { id } = useParams(); // Generic ID parameter
  const api = useApi();
  const { success, error } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(isEdit);

  // Fetch data for edit mode
  useEffect(() => {
    if (isEdit && id) {
      const fetchData = async () => {
        try {
          const response = await api.get(`${endpoint}/${id}`);
          setData(response);
        } catch (err) {
          console.error('Error fetching data:', err);
          error('Error loading data');
          navigate(redirectPath);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isEdit, id, api, error, navigate, redirectPath]);

  const handleSubmit = async (values) => {
    try {
      if (isEdit) {
        await api.put(`${endpoint}/${id}`, values);
      } else {
        await api.post(endpoint, values);
      }
      success(successMessage);
      navigate(redirectPath);
    } catch (err) {
      console.error('Error submitting form:', err);
      error(errorMessage);
      throw err; // Re-throw to let form handle it
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (isEdit && !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Data not found</Typography>
      </Box>
    );
  }

  return (
    <FormComponent
      onSubmit={handleSubmit}
      initialValues={isEdit ? data : initialValues}
      isEdit={isEdit}
      {...additionalProps}
    />
  );
};

export default FormWrapper;
