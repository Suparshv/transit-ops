/**
 * rolePermissions.ts — SINGLE SOURCE OF TRUTH for the RBAC permission matrix.
 *
 * CLAUDE.md Section 5 + Section 3.5-B:
 *   "Build a single rolePermissions.ts config used by both auth.ts middleware on
 *    the backend and route guards on the frontend so this matrix lives in exactly
 *    one place. Do not hardcode role checks scattered across controllers."
 *
 * BACKEND COPY — canonical version. Edit only this file.
 * The frontend copy at frontend/src/config/rolePermissions.ts is a duplicate
 * committed in the same commit. If this matrix changes, update BOTH copies.
 *
 * Roles (selected at login, embedded in JWT):
 *   - Fleet Manager
 *   - Dispatcher
 *   - Safety Officer
 *   - Financial Analyst
 *
 * Modules:
 *   - fleet      → Vehicle Registry (Screen 2)
 *   - drivers    → Drivers & Safety (Screen 3)
 *   - trips      → Trip Dispatcher (Screen 4)
 *   - fuel       → Fuel & Expense Management (Screen 6)
 *   - analytics  → Reports & Analytics (Screen 7)
 *
 * Permission levels:
 *   'full'  → create / edit / delete allowed
 *   'view'  → GET requests only
 *   'none'  → 403 on all requests, nav item hidden in UI
 */

export type Role =
  | 'Fleet Manager'
  | 'Dispatcher'
  | 'Safety Officer'
  | 'Financial Analyst';

export type Module = 'fleet' | 'drivers' | 'trips' | 'fuel' | 'analytics';

export type PermissionLevel = 'full' | 'view' | 'none';

/**
 * The authoritative RBAC matrix from CLAUDE.md Section 5.
 *
 * | Role              | Fleet | Drivers | Trips | Fuel/Exp | Analytics |
 * |---|---|---|---|---|---|
 * | Fleet Manager     | full  | full    | none  | none     | full      |
 * | Dispatcher        | view  | none    | full  | none     | none      |
 * | Safety Officer    | none  | full    | view  | none     | none      |
 * | Financial Analyst | view  | none    | none  | full     | full      |
 */
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

/**
 * Returns the permission level a given role has on a module.
 * Use this in middleware and frontend guards — do not re-read rolePermissions directly.
 */
export const getPermission = (role: Role, module: Module): PermissionLevel => {
  return rolePermissions[role]?.[module] ?? 'none';
};

/**
 * canAccess(role, module, requiredLevel)
 *
 * Returns true if the role's permission level satisfies the required level.
 * Level hierarchy: full > view > none
 *
 * Examples:
 *   canAccess('Fleet Manager', 'fleet', 'view')  → true  (full satisfies view)
 *   canAccess('Dispatcher', 'fleet', 'full')      → false (view does not satisfy full)
 *   canAccess('Safety Officer', 'fleet', 'view')  → false (none does not satisfy view)
 */
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

/**
 * All valid roles as an array — useful for Zod enums and validation.
 */
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
