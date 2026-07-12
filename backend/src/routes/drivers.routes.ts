import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';
import { validate } from '../middleware/validate';
import {
  createDriverSchema,
  updateDriverSchema,
} from '../schemas/driver.schema';
import {
  listDrivers,
  createDriver,
  getDriver,
  updateDriver,
  deleteDriver,
} from '../controllers/drivers.controller';

const router = Router();

/**
 * RBAC per Section 5 matrix:
 *   Fleet Manager   → full  (create/edit/delete)
 *   Safety Officer  → full  (create/edit/delete)
 *   Dispatcher      → none  (403)
 *   Financial Analyst → none (403)
 */

// Read routes — 'view' maps to: who can do 'full' can also do 'view'
// Fleet Manager (full) and Safety Officer (full) both pass checkRole('drivers','view')
router.get('/', requireAuth, checkRole('drivers', 'view'), listDrivers);
router.get('/:id', requireAuth, checkRole('drivers', 'view'), getDriver);

// Write routes — Fleet Manager and Safety Officer only
router.post(
  '/',
  requireAuth,
  checkRole('drivers', 'full'),
  validate(createDriverSchema),
  createDriver
);
router.patch(
  '/:id',
  requireAuth,
  checkRole('drivers', 'full'),
  validate(updateDriverSchema),
  updateDriver
);
router.delete(
  '/:id',
  requireAuth,
  checkRole('drivers', 'full'),
  deleteDriver
);

export default router;
