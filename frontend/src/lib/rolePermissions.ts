// rolePermissions.ts
// Frontend mirror of backend/src/config/rolePermissions.ts.
// These two files MUST stay in sync — same module names, same role names, same matrix.
// Do not add modules here that don't exist in the backend config.

export type Role = 'Fleet Manager' | 'Dispatcher' | 'Safety Officer' | 'Financial Analyst';

/** Matches backend's Module type exactly — 5 modules only. */
export type Module = 'fleet' | 'drivers' | 'trips' | 'fuel' | 'analytics';

export type Action = 'full' | 'view' | 'none';

/**
 * RBAC permission matrix — mirrors backend/src/config/rolePermissions.ts exactly.
 *
 * | Role              | Fleet | Drivers | Trips | Fuel/Exp | Analytics |
 * |-------------------|-------|---------|-------|----------|-----------|
 * | Fleet Manager     | full  | full    | none  | none     | full      |
 * | Dispatcher        | view  | none    | full  | none     | none      |
 * | Safety Officer    | none  | full    | view  | none     | none      |
 * | Financial Analyst | view  | none    | none  | full     | full      |
 */
export const rolePermissions: Record<Role, Record<Module, Action>> = {
  'Fleet Manager': {
    fleet:     'full',
    drivers:   'full',
    trips:     'none',
    fuel:      'none',
    analytics: 'full',
  },
  'Dispatcher': {
    fleet:     'view',
    drivers:   'none',
    trips:     'full',
    fuel:      'none',
    analytics: 'none',
  },
  'Safety Officer': {
    fleet:     'none',
    drivers:   'full',
    trips:     'view',
    fuel:      'none',
    analytics: 'none',
  },
  'Financial Analyst': {
    fleet:     'view',
    drivers:   'none',
    trips:     'none',
    fuel:      'full',
    analytics: 'full',
  },
};

export const ALL_ROLES: Role[] = [
  'Fleet Manager',
  'Dispatcher',
  'Safety Officer',
  'Financial Analyst',
];

export const ALL_MODULES: Module[] = [
  'fleet',
  'drivers',
  'trips',
  'fuel',
  'analytics',
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

/** Returns whether a nav item should be visible at all for a given role. */
export function canAccessModule(role: Role, module: Module): boolean {
  return rolePermissions[role][module] !== 'none';
}
