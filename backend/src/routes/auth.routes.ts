import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { signupSchema, loginSchema } from '../schemas/auth.schema';
import {
  signup,
  login,
  me,
  forgotPassword,
} from '../controllers/auth.controller';

const router = Router();

// Auth routes are NOT gated by checkRole (they're the entry point for auth).
// requireAuth is applied to /me only.

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);
router.post('/forgot-password', forgotPassword);

export default router;
