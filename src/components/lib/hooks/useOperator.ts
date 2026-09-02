import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export const useOperators = (initialFilters = {}) => {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  const fetchOperators = async (params = {}) => {
    try {
      const response = await apiClient.getWithPagination('/operators', {
        ...initialFilters,
        ...params
      });

      setOperators(response.data || []);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    operators,
    loading,
    error,
    pagination,
    fetchOperators
  };
}; 