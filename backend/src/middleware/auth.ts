import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { fail } from '../utils/apiResponse';
import { Role, ALL_ROLES } from '../config/rolePermissions';

export interface JwtPayload {
  id: string;
  email: string;
  /** Role is selected at login and embedded in the JWT (CLAUDE.md §5 Decision 1). */
  role: Role;
}

// Extend Express Request to carry the decoded token
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * requireAuth middleware
 *
 * Verifies the Bearer JWT on every protected route.
 * On success: attaches req.user = { id, email, role }.
 * On failure: 401 with standard error shape.
 *
 * Usage: router.get('/...', requireAuth, checkRole('fleet', 'view'), handler)
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(fail('No token provided. Please log in.'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Validate the role is still a known role (guards against stale tokens
    // if the role list ever changes).
    if (!ALL_ROLES.includes(decoded.role)) {
      res.status(401).json(fail('Invalid role in token. Please log in again.'));
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json(fail('Session expired. Please log in again.'));
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json(fail('Invalid token. Please log in again.'));
    } else {
      res.status(500).json(fail('Authentication error.'));
    }
  }
};
