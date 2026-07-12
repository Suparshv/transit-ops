import { z } from 'zod';

/**
 * Driver schemas — used by validate() middleware in drivers.routes.ts.
 * Aryan imports these into the Add Driver form per CLAUDE.md §3.5-C.
 */

const LICENSE_CATEGORIES = ['HMV', 'LMV', 'PSV', 'MCwG'] as const;

const DRIVER_STATUSES = [
  'Available',
  'OnTrip',
  'OffDuty',
  'Suspended',
] as const;

export const createDriverSchema = z.object({
  name: z
    .string({ required_error: 'Driver name is required' })
    .min(1, 'Name cannot be empty')
    .trim(),
  licenseNumber: z
    .string({ required_error: 'License number is required' })
    .min(1, 'License number cannot be empty')
    .trim(),
  licenseCategory: z.enum(LICENSE_CATEGORIES, {
    required_error: 'License category is required',
    invalid_type_error: `Category must be one of: ${LICENSE_CATEGORIES.join(', ')}`,
  }),
  licenseExpiryDate: z
    .string({ required_error: 'License expiry date is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Must be a valid date (YYYY-MM-DD)',
    })
    .transform((val) => new Date(val)),
  contact: z
    .string({ required_error: 'Contact is required' })
    .min(1, 'Contact cannot be empty')
    .trim(),
  status: z.enum(DRIVER_STATUSES).default('Available').optional(),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).trim().optional(),
  licenseNumber: z.string().min(1).trim().optional(),
  licenseCategory: z.enum(LICENSE_CATEGORIES).optional(),
  licenseExpiryDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Must be a valid date (YYYY-MM-DD)',
    })
    .transform((val) => new Date(val))
    .optional(),
  contact: z.string().min(1).trim().optional(),
  /**
   * Status toggle (Drivers & Safety screen — TOGGLE STATUS buttons).
   * StatusEngine is NOT called for manual status changes; this is a direct
   * status set. Only Trip and Maintenance events route through statusEngine.ts.
   */
  status: z.enum(DRIVER_STATUSES).optional(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type DriverStatusValue = (typeof DRIVER_STATUSES)[number];
