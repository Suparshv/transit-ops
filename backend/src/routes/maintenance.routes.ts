import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';
import { validate } from '../middleware/validate';
import { createMaintenanceSchema } from '../schemas/maintenance.schema';
import {
  listMaintenance,
  createMaintenance,
  closeMaintenance,
} from '../controllers/maintenance.controller';

const router = Router();

/**
 * RBAC per Section 5 matrix:
 *   Fleet Manager → full (create, close, read)
 *   All others    → none (403)
 *
 * Note: The matrix shows Fleet Manager has 'full' access to Fleet — maintenance
 * is part of Fleet management. Dispatcher (view on fleet) does NOT get
 * maintenance access. Safety Officer manages Drivers, not vehicles.
 */

router.get('/', requireAuth, checkRole('fleet', 'full'), listMaintenance);
router.post(
  '/',
  requireAuth,
  checkRole('fleet', 'full'),
  validate(createMaintenanceSchema),
  createMaintenance
);
router.patch(
  '/:id/close',
  requireAuth,
  checkRole('fleet', 'full'),
  closeMaintenance
);

export default router;
