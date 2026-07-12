import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';
import { validate } from '../middleware/validate';
import {
  createTripSchema,
  completeTripSchema,
} from '../schemas/trip.schema';
import {
  listTrips,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
} from '../controllers/trips.controller';

const router = Router();

/**
 * RBAC per Section 5 matrix:
 *   Dispatcher      → full  (all trip operations)
 *   Safety Officer  → view  (read only)
 *   Fleet Manager   → none  (403)
 *   Financial Analyst → none (403)
 */

// Read — Safety Officer (view) and Dispatcher (full satisfies view)
router.get('/', requireAuth, checkRole('trips', 'view'), listTrips);

// Write — Dispatcher only (full)
router.post(
  '/',
  requireAuth,
  checkRole('trips', 'full'),
  validate(createTripSchema),
  createTrip
);
router.patch(
  '/:id/dispatch',
  requireAuth,
  checkRole('trips', 'full'),
  dispatchTrip
);
router.patch(
  '/:id/complete',
  requireAuth,
  checkRole('trips', 'full'),
  validate(completeTripSchema),
  completeTrip
);
router.patch(
  '/:id/cancel',
  requireAuth,
  checkRole('trips', 'full'),
  cancelTrip
);

export default router;
