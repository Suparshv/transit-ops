import { z } from 'zod';

/**
 * Vehicle schemas — used by validate() middleware in vehicles.routes.ts.
 * Aryan imports these into the Add Vehicle form per CLAUDE.md §3.5-C.
 */

const VEHICLE_TYPES = ['Van', 'Truck', 'Pickup', 'Bus', 'Tanker'] as const;

const VEHICLE_STATUSES = [
  'Available',
  'OnTrip',
  'InShop',
  'Retired',
] as const;

export const createVehicleSchema = z.object({
  registrationNumber: z
    .string({ required_error: 'Registration number is required' })
    .min(1, 'Registration number cannot be empty')
    .trim(),
  name: z
    .string({ required_error: 'Vehicle name is required' })
    .min(1, 'Name cannot be empty')
    .trim(),
  type: z.enum(VEHICLE_TYPES, {
    required_error: 'Vehicle type is required',
    invalid_type_error: `Type must be one of: ${VEHICLE_TYPES.join(', ')}`,
  }),
  capacityKg: z
    .number({ required_error: 'Capacity is required' })
    .positive('Capacity must be greater than 0'),
  odometerKm: z.number().nonnegative('Odometer cannot be negative').default(0),
  acquisitionCost: z
    .number()
    .nonnegative('Acquisition cost cannot be negative')
    .default(0),
  status: z.enum(VEHICLE_STATUSES).default('Available').optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type VehicleStatusValue = (typeof VEHICLE_STATUSES)[number];
