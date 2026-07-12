// rolePermissions.ts
// THE SINGLE SOURCE OF TRUTH for the RBAC matrix.
// This must be the ONLY place the permission matrix is defined.
// Both frontend route guards and the AuthContext read from here.
// Mirror this same structure in backend auth middleware when connecting.

export type Role = 'Fleet Manager' | 'Dispatcher' | 'Safety Officer' | 'Financial Analyst';
export type Module = 'fleet' | 'drivers' | 'trips' | 'maintenance' | 'fuel' | 'analytics' | 'settings' | 'dashboard';
export type Action = 'full' | 'view' | 'none';

// Permission matrix from CLAUDE.md Section 5 and Design.md Section 6
export const rolePermissions: Record<Role, Record<Module, Action>> = {
  'Fleet Manager': {
    dashboard:   'full',
    fleet:       'full',
    drivers:     'full',
    trips:       'none',
    maintenance: 'full',
    fuel:        'none',
    analytics:   'full',
    settings:    'full',
  },
  'Dispatcher': {
    dashboard:   'full',
    fleet:       'view',
    drivers:     'none',
    trips:       'full',
    maintenance: 'none',
    fuel:        'none',
    analytics:   'none',
    settings:    'none',
  },
  'Safety Officer': {
    dashboard:   'full',
    fleet:       'none',
    drivers:     'full',
    trips:       'view',
    maintenance: 'none',
    fuel:        'none',
    analytics:   'none',
    settings:    'none',
  },
  'Financial Analyst': {
    dashboard:   'full',
    fleet:       'view',
    drivers:     'none',
    trips:       'none',
    maintenance: 'none',
    fuel:        'full',
    analytics:   'full',
    settings:    'none',
  },
};

export const ALL_ROLES: Role[] = [
  'Fleet Manager',
  'Dispatcher',
  'Safety Officer',
  'Financial Analyst',
];

/**
 * Check if a role has at least the given action level on a module.
 * 'full' >= 'view' >= 'none'
 */
export function checkPermission(role: Role, module: Module, required: Action = 'view'): boolean {
  const perm = rolePermissions[role][module];
  if (required === 'none') return true;
  if (required === 'view') return perm === 'view' || perm === 'full';
  if (required === 'full') return perm === 'full';
  return false;
}

/** Returns whether a nav item should be visible at all for a given role */
export function canAccessModule(role: Role, module: Module): boolean {
  return rolePermissions[role][module] !== 'none';
}
