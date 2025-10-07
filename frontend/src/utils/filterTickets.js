import dayjs from 'dayjs';

/**
 * Apply unified filters to tickets
 * 
 * @param {Array} tickets - Array of tickets to filter
 * @param {Object} filters - Filter criteria
 * @returns {Array} - Filtered tickets
 */
export const filterTickets = (tickets, filters) => {
  if (!tickets || tickets.length === 0) return [];
  if (!filters) return tickets;

  return tickets.filter(ticket => {
    // Search filter - searches across multiple fields
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        ticket.ticket_id?.toLowerCase().includes(searchLower) ||
        ticket.inc_number?.toLowerCase().includes(searchLower) ||
        ticket.so_number?.toLowerCase().includes(searchLower) ||
        ticket.site_id?.toLowerCase().includes(searchLower) ||
        ticket.notes?.toLowerCase().includes(searchLower) ||
        ticket.customer_name?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filters.type && ticket.type !== filters.type) {
      return false;
    }

    // Status filter
    if (filters.status && ticket.status !== filters.status) {
      return false;
    }

    // Priority filter
    if (filters.priority && ticket.priority !== filters.priority) {
      return false;
    }

    // Site filter
    if (filters.site && ticket.site_id !== filters.site) {
      return false;
    }

    // INC Number filter
    if (filters.inc_number) {
      if (!ticket.inc_number?.toLowerCase().includes(filters.inc_number.toLowerCase())) {
        return false;
      }
    }

    // SO Number filter
    if (filters.so_number) {
      if (!ticket.so_number?.toLowerCase().includes(filters.so_number.toLowerCase())) {
        return false;
      }
    }

    // Date From filter
    if (filters.dateFrom && (ticket.created_at || ticket.date_created)) {
      const ticketDate = dayjs(ticket.created_at || ticket.date_created);
      const fromDate = dayjs(filters.dateFrom);
      if (ticketDate.isBefore(fromDate, 'day')) {
        return false;
      }
    }

    // Date To filter
    if (filters.dateTo && (ticket.created_at || ticket.date_created)) {
      const ticketDate = dayjs(ticket.created_at || ticket.date_created);
      const toDate = dayjs(filters.dateTo);
      if (ticketDate.isAfter(toDate, 'day')) {
        return false;
      }
    }

    // Assigned To filter (if provided)
    if (filters.assignedTo && filters.assignedTo !== 'all') {
      if (ticket.assigned_user_id !== filters.assignedTo) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Get default filter state
 */
export const getDefaultFilters = () => ({
  search: '',
  type: '',
  status: '',
  priority: '',
  site: '',
  inc_number: '',
  so_number: '',
  dateFrom: '',
  dateTo: '',
  assignedTo: ''
});

