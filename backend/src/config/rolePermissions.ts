/**
 * rolePermissions.ts — SINGLE SOURCE OF TRUTH for the RBAC permission matrix.
 * CLAUDE.md Section 5 + Section 3.5-B
 */

export type Role =
  | 'Fleet Manager'
  | 'Dispatcher'
  | 'Safety Officer'
  | 'Financial Analyst';

export type Module = 'fleet' | 'drivers' | 'trips' | 'fuel' | 'analytics';

export type PermissionLevel = 'full' | 'view' | 'none';

export const rolePermissions: Record<Role, Record<Module, PermissionLevel>> = {
  'Fleet Manager': {
    fleet: 'full',
    drivers: 'full',
    trips: 'none',
    fuel: 'none',
    analytics: 'full',
  },
  Dispatcher: {
    fleet: 'view',
    drivers: 'none',
    trips: 'full',
    fuel: 'none',
    analytics: 'none',
  },
  'Safety Officer': {
    fleet: 'none',
    drivers: 'full',
    trips: 'view',
    fuel: 'none',
    analytics: 'none',
  },
  'Financial Analyst': {
    fleet: 'view',
    drivers: 'none',
    trips: 'none',
    fuel: 'full',
    analytics: 'full',
  },
};

export const getPermission = (role: Role, module: Module): PermissionLevel => {
  return rolePermissions[role]?.[module] ?? 'none';
};

export const canAccess = (
  role: Role,
  module: Module,
  requiredLevel: 'full' | 'view'
): boolean => {
  const level = getPermission(role, module);
  if (level === 'none') return false;
  if (requiredLevel === 'view') return level === 'view' || level === 'full';
  if (requiredLevel === 'full') return level === 'full';
  return false;
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
