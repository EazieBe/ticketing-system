/**
 * Centralized API base paths to avoid typos (e.g. /sla-rules/ vs /sla/).
 * Backend router prefixes: tickets, users, sites, shipments, fieldtechs, tasks, equipment, inventory, sla, audit, logging, search.
 */
const PATHS = {
  tickets: '/tickets',
  users: '/users',
  sites: '/sites',
  shipments: '/shipments',
  fieldtechs: '/fieldtechs',
  fieldtechCompanies: '/fieldtech-companies',
  tasks: '/tasks',
  equipment: '/equipment',
  inventory: '/inventory',
  sla: '/sla',
  audit: '/audit',
  logging: '/api',
  search: '/search',
};

/**
 * @param {keyof PATHS} resource - Resource name (e.g. 'sla', 'tickets')
 * @returns {string} Base path for the resource (e.g. '/sla', '/tickets')
 */
export function getApiPath(resource) {
  const path = PATHS[resource];
  if (path === undefined) {
    throw new Error(`Unknown API resource: ${resource}. Known: ${Object.keys(PATHS).join(', ')}`);
  }
  return path;
}

export { PATHS };
export default getApiPath;
