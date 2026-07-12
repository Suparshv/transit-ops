/**
 * fuel.controller.ts — STUB FILE
 *
 * ⚠️  THIS STUB IS OWNED BY SUPARSHV. Do NOT implement the function body here.
 *
 * Joy calls createFuelLogFromTripCompletion() from trips.controller.ts when a
 * trip is completed (CLAUDE.md §3.5-A integration contract).
 * Suparshv writes the real implementation by hour 2 of the build.
 *
 * Integration contract (from CLAUDE.md §3.5-A):
 *   - Joy's trips.controller.ts calls this function on PATCH /api/trips/:id/complete
 *   - It receives: { tripId, vehicleId, finalOdometerKm, fuelConsumedLiters, fuelCost, date }
 *   - It writes a FuelLog row to the database (Suparshv owns the FuelLog write path)
 *   - Joy does NOT write directly to the FuelLog table
 *
 * Suparshv: replace the stub body below with the real Prisma write.
 * Do not change the function signature — trips.controller.ts depends on it.
 */

export interface FuelLogCreationPayload {
  tripId: string;
  vehicleId: string;
  finalOdometerKm: number;
  fuelConsumedLiters: number;
  fuelCost: number;
  date: Date;
}

/**
 * createFuelLogFromTripCompletion
 *
 * Called by trips.controller.ts on trip completion.
 * Suparshv owns the body — replace the stub below.
 *
 * @param payload - fuel log data from the complete-trip request body
 * @returns Promise<void> — throws on DB error (trips.controller.ts will catch)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createFuelLogFromTripCompletion = async (
  payload: FuelLogCreationPayload
): Promise<void> => {
  // TODO: Suparshv — replace this stub with the real FuelLog Prisma write.
  // Example implementation:
  //
  // const prisma = new PrismaClient();
  // await prisma.fuelLog.create({
  //   data: {
  //     vehicleId: payload.vehicleId,
  //     tripId: payload.tripId,
  //     date: payload.date,
  //     liters: payload.fuelConsumedLiters,
  //     fuelCost: payload.fuelCost,
  //   },
  // });
  //
  // The stub currently does nothing — trips will complete without writing a
  // fuel log until Suparshv implements this.
  console.warn(
    '[STUB] createFuelLogFromTripCompletion called — Suparshv needs to implement this. ' +
      'Trip will complete but no FuelLog row will be written until the stub is replaced.'
  );
};
