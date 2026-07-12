import { z } from 'zod';

/**
 * Maintenance schemas — used by validate() middleware in maintenance.routes.ts.
 * Aryan imports these into the Log Service Record form per CLAUDE.md §3.5-C.
 */

const SERVICE_TYPES = [
  'Oil Change',
  'Tyre Replacement',
  'Brake Service',
  'Engine Repair',
  'Electrical',
  'Body Work',
  'General Service',
  'Other',
] as const;

const MAINTENANCE_STATUSES = ['Active', 'Closed'] as const;

export const createMaintenanceSchema = z.object({
  vehicleId: z
    .number({ required_error: 'Vehicle is required' })
    .int()
    .positive('Vehicle is required'),
  serviceType: z.enum(SERVICE_TYPES, {
    required_error: 'Service type is required',
    invalid_type_error: `Service type must be one of: ${SERVICE_TYPES.join(', ')}`,
  }),
  cost: z
    .number({ required_error: 'Cost is required' })
    .nonnegative('Cost cannot be negative'),
  date: z
    .string({ required_error: 'Date is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Must be a valid date (YYYY-MM-DD)',
    })
    .transform((val) => new Date(val)),
  // Status defaults to Active (vehicle flips to InShop) on creation.
  // Use PATCH /maintenance/:id/close to close the record.
  status: z.enum(MAINTENANCE_STATUSES).default('Active').optional(),
});

export const closeMaintenanceSchema = z.object({}).optional();

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type MaintenanceStatusValue = (typeof MAINTENANCE_STATUSES)[number];
