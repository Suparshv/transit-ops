import { z } from 'zod';

/**
 * Trip schemas — used by validate() middleware in trips.routes.ts.
 * Aryan imports these into the Create Trip form per CLAUDE.md §3.5-C.
 *
 * Key contract (CLAUDE.md §3.5-A):
 *   completeTripSchema includes { finalOdometer, fuelConsumedLiters, fuelCost }
 *   which are passed to createFuelLogFromTripCompletion() (Suparshv's function).
 */

export const createTripSchema = z.object({
  source: z
    .string({ required_error: 'Source location is required' })
    .min(1, 'Source cannot be empty')
    .trim(),
  destination: z
    .string({ required_error: 'Destination is required' })
    .min(1, 'Destination cannot be empty')
    .trim(),
  vehicleId: z.string({ required_error: 'Vehicle is required' }).cuid(),
  driverId: z.string({ required_error: 'Driver is required' }).cuid(),
  cargoWeightKg: z
    .number({ required_error: 'Cargo weight is required' })
    .positive('Cargo weight must be greater than 0'),
  plannedDistanceKm: z
    .number({ required_error: 'Planned distance is required' })
    .positive('Planned distance must be greater than 0'),
});

export const dispatchTripSchema = z.object({}).optional();

/**
 * completeTripSchema — shape that must be sent in PATCH /api/trips/:id/complete
 *
 * These three fields are the integration contract with Suparshv's
 * createFuelLogFromTripCompletion() per CLAUDE.md §3.5-A.
 * Do NOT remove or rename them without coordinating with Suparshv.
 */
export const completeTripSchema = z.object({
  finalOdometerKm: z
    .number({ required_error: 'Final odometer reading is required' })
    .nonnegative('Odometer cannot be negative'),
  fuelConsumedLiters: z
    .number({ required_error: 'Fuel consumed is required' })
    .nonnegative('Fuel consumed cannot be negative'),
  fuelCost: z
    .number({ required_error: 'Fuel cost is required' })
    .nonnegative('Fuel cost cannot be negative'),
});

export const cancelTripSchema = z.object({}).optional();

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type CompleteTripInput = z.infer<typeof completeTripSchema>;
