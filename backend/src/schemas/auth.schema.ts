import { z } from 'zod';
import { ALL_ROLES } from '../config/rolePermissions';

/**
 * Auth schemas — used by validate() middleware in auth.routes.ts.
 * Aryan imports these into Login form validation per CLAUDE.md §3.5-C.
 */

export const signupSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address')
    .toLowerCase(),
  password: z.string({ required_error: 'Password is required' }).min(1),
  /**
   * Role is selected at login (CLAUDE.md §5).
   * Embedded into JWT payload; authoritative for that session.
   */
  role: z.enum(ALL_ROLES as [string, ...string[]], {
    required_error: 'Role is required',
    invalid_type_error: 'Invalid role selected',
  }),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
