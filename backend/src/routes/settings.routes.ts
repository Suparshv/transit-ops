import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';
import { validate } from '../middleware/validate';
import { getSettings, updateSettings, UpdateSettingsSchema } from '../controllers/settings.controller';

const router = Router();

router.get('/', requireAuth, getSettings);
router.patch('/', requireAuth, checkRole('fleet', 'full'), validate(UpdateSettingsSchema), updateSettings);

export default router;
