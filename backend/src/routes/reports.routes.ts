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

// /dashboard is intentionally exempt from checkRole — it is the post-login landing page
// visible to ALL four roles (Design.md Screen 1; CLAUDE.md §4 Screen 0 caption maps
// Dispatcher → "Dashboard, Trips" and Safety Officer → "Drivers, Compliance").
// Gating it with checkRole('analytics', 'view') would lock out Dispatchers and Safety
// Officers the moment they log in. The deeper analytics routes below remain
// analytics-module-gated as per the RBAC matrix (CLAUDE.md §5).
router.get('/dashboard', requireAuth, getDashboard);
router.get('/utilization', requireAuth, checkRole('analytics', 'view'), getUtilization);
router.get('/roi', requireAuth, checkRole('analytics', 'view'), getROI);
router.get('/top-costliest', requireAuth, checkRole('analytics', 'view'), getTopCostliest);
router.get('/monthly-revenue', requireAuth, checkRole('analytics', 'view'), getMonthlyRevenue);
router.get('/export.csv', requireAuth, checkRole('analytics', 'view'), exportCSV);

export default router;
