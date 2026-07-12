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

router.get('/', requireAuth, checkRole('drivers', 'view'), listDrivers);
router.get('/:id', requireAuth, checkRole('drivers', 'view'), getDriver);
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
router.delete('/:id', requireAuth, checkRole('drivers', 'full'), deleteDriver);

export default router;
