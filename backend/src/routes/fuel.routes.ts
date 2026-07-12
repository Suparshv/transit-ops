import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';
import { validate } from '../middleware/validate';
import { getAllFuelLogs, createFuelLog, CreateFuelLogSchema } from '../controllers/fuel.controller';

const router = Router();

router.get('/', requireAuth, checkRole('fuel', 'view'), getAllFuelLogs);
router.post('/', requireAuth, checkRole('fuel', 'full'), validate(CreateFuelLogSchema), createFuelLog);

export default router;
