import { Request, Response, NextFunction } from 'express';
import { canAccess, Module, PermissionLevel } from '../config/rolePermissions';
import { fail } from '../utils/apiResponse';

/**
 * checkRole(module, requiredLevel)
 *
 * RBAC enforcement middleware. Must be applied AFTER requireAuth so that
 * req.user is guaranteed to be present.
 *
 * Uses rolePermissions.ts exclusively — no ad-hoc role checks in controllers.
 * CLAUDE.md §5: "Every route above (except /api/auth/*) must be gated by the
 * RBAC matrix ... apply the checkRole(module, action) middleware per route."
 *
 * Usage:
 *   router.post('/vehicles', requireAuth, checkRole('fleet', 'full'), handler)
 *   router.get('/vehicles',  requireAuth, checkRole('fleet', 'view'), handler)
 *
 * Behaviour:
 *   - If the role has 'full' permission and requiredLevel is 'view' → allowed
 *   - If the role has 'view' permission and requiredLevel is 'full' → 403
 *   - If the role has 'none' → 403 regardless
 */
export const checkRole =
  (module: Module, requiredLevel: 'full' | 'view') =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // requireAuth should always run first; this is a safety guard
      res.status(401).json(fail('Unauthenticated.'));
      return;
    }

    const allowed = canAccess(req.user.role, module, requiredLevel);

    if (!allowed) {
      res.status(403).json(
        fail(
          `Access denied. Your role (${req.user.role}) does not have ` +
            `${requiredLevel} access to ${module}.`
        )
      );
      return;
    }

    next();
  };
