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

router.get('/', requireAuth, checkRole('fleet', 'full'), listMaintenance);
router.post(
  '/',
  requireAuth,
  checkRole('fleet', 'full'),
  validate(createMaintenanceSchema),
  createMaintenance
);
router.patch('/:id/close', requireAuth, checkRole('fleet', 'full'), closeMaintenance);

export default router;
