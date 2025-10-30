/**
 * Permission utility functions for role-based access control
 */

/**
 * Check if user has admin or dispatcher role
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user is admin or dispatcher
 */
export const canDelete = (user) => {
  return user?.role === 'admin' || user?.role === 'dispatcher';
};

/**
 * Check if user has admin role
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user is admin
 */
export const isAdmin = (user) => {
  return user?.role === 'admin';
};

/**
 * Check if user has dispatcher role
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user is dispatcher
 */
export const isDispatcher = (user) => {
  return user?.role === 'dispatcher';
};

/**
 * Check if user has admin or dispatcher role (alias for canDelete)
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user is admin or dispatcher
 */
export const isAdminOrDispatcher = (user) => {
  return canDelete(user);
};

/**
 * Check if user can edit a specific item (admin/dispatcher or owner)
 * @param {Object} user - User object with role property
 * @param {Object} item - Item object with user_id or assigned_user_id
 * @returns {boolean} - True if user can edit
 */
export const canEdit = (user, item) => {
  if (canDelete(user)) return true;
  return item?.user_id === user?.user_id || item?.assigned_user_id === user?.user_id;
};

/**
 * Check if user can view admin features
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can view admin features
 */
export const canViewAdmin = (user) => {
  return canDelete(user);
};

/**
 * Get user role display name
 * @param {string} role - Role string
 * @returns {string} - Formatted role name
 */
export const getRoleDisplayName = (role) => {
  const roleNames = {
    admin: 'Administrator',
    dispatcher: 'Dispatcher',
    tech: 'Technician',
    billing: 'Billing'
  };
  return roleNames[role] || role;
};

/**
 * Check if user has specific role
 * @param {Object} user - User object with role property
 * @param {string} requiredRole - Required role
 * @returns {boolean} - True if user has the required role
 */
export const hasRole = (user, requiredRole) => {
  return user?.role === requiredRole;
};

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object with role property
 * @param {Array<string>} roles - Array of roles to check
 * @returns {boolean} - True if user has any of the roles
 */
export const hasAnyRole = (user, roles) => {
  return roles.includes(user?.role);
};


