import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';
import {
  getDashboard,
  getUtilization,
  getROI,
  getTopCostliest,
  getMonthlyRevenue,
  exportCSV,
} from '../controllers/reports.controller';

const router = Router();

router.get('/dashboard', requireAuth, getDashboard);
router.get('/utilization', requireAuth, checkRole('analytics', 'view'), getUtilization);
router.get('/roi', requireAuth, checkRole('analytics', 'view'), getROI);
router.get('/top-costliest', requireAuth, checkRole('analytics', 'view'), getTopCostliest);
router.get('/monthly-revenue', requireAuth, checkRole('analytics', 'view'), getMonthlyRevenue);
router.get('/export.csv', requireAuth, checkRole('analytics', 'view'), exportCSV);

export default router;
