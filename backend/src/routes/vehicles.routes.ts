import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';
import { validate } from '../middleware/validate';
import {
  createVehicleSchema,
  updateVehicleSchema,
} from '../schemas/vehicle.schema';
import {
  listVehicles,
  createVehicle,
  getVehicle,
  updateVehicle,
  deleteVehicle,
} from '../controllers/vehicles.controller';

const router = Router();

router.get('/', requireAuth, checkRole('fleet', 'view'), listVehicles);
router.get('/:id', requireAuth, checkRole('fleet', 'view'), getVehicle);
router.post(
  '/',
  requireAuth,
  checkRole('fleet', 'full'),
  validate(createVehicleSchema),
  createVehicle
);
router.patch(
  '/:id',
  requireAuth,
  checkRole('fleet', 'full'),
  validate(updateVehicleSchema),
  updateVehicle
);
router.delete('/:id', requireAuth, checkRole('fleet', 'full'), deleteVehicle);

export default router;
