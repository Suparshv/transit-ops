import { PrismaClient, VehicleStatus, DriverStatus } from '@prisma/client';

/**
 * statusEngine.ts — THE single source of truth for all Vehicle and Driver
 * status transitions in TransitOps.
 *
 * CLAUDE.md §6, rule 4.3 (CRITICAL):
 *   "All of these transitions must live in ONE place (statusEngine.ts), called
 *    by the relevant controllers. Never duplicate this logic inline in route
 *    handlers — that's how bugs and inconsistent states creep in under time pressure."
 *
 * Status transition table (CLAUDE.md Section 6, §4.3):
 *   Trip Dispatched              → Vehicle: Available → On Trip   | Driver: Available → On Trip
 *   Trip Completed               → Vehicle: On Trip   → Available | Driver: On Trip   → Available
 *   Trip Cancelled (Dispatched)  → Vehicle: On Trip   → Available | Driver: On Trip   → Available
 *   Maintenance record created   → Vehicle: Available → In Shop   | Driver: —
 *   Maintenance record closed    → Vehicle: In Shop   → Available | Driver: —
 *                                  (unless vehicle is Retired — stays Retired)
 *
 * Each function is called by the relevant controller ONLY.
 * Zero status-flip logic anywhere else in the codebase.
 */

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Trip Dispatched
// Vehicle: Available → OnTrip | Driver: Available → OnTrip
// ---------------------------------------------------------------------------

export const onTripDispatched = async (tripId: string): Promise<void> => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { vehicleId: true, driverId: true, status: true },
  });

  if (!trip) {
    throw new Error(`statusEngine.onTripDispatched: Trip ${tripId} not found`);
  }

  if (trip.status !== 'Draft') {
    throw new Error(
      `statusEngine.onTripDispatched: Trip ${tripId} is not in Draft status (got ${trip.status})`
    );
  }

  // Atomic update: flip vehicle and driver in a transaction so we never get
  // a state where one flipped and the other didn't.
  await prisma.$transaction([
    prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: VehicleStatus.OnTrip },
    }),
    prisma.driver.update({
      where: { id: trip.driverId },
      data: { status: DriverStatus.OnTrip },
    }),
    prisma.trip.update({
      where: { id: tripId },
      data: { status: 'Dispatched' },
    }),
  ]);
};

// ---------------------------------------------------------------------------
// Trip Completed
// Vehicle: OnTrip → Available | Driver: OnTrip → Available
// Also updates driver.tripCompletionPct (increment completed / total)
// ---------------------------------------------------------------------------

export const onTripCompleted = async (tripId: string): Promise<void> => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      vehicleId: true,
      driverId: true,
      status: true,
      finalOdometerKm: true,
    },
  });

  if (!trip) {
    throw new Error(`statusEngine.onTripCompleted: Trip ${tripId} not found`);
  }

  if (trip.status !== 'Dispatched') {
    throw new Error(
      `statusEngine.onTripCompleted: Trip ${tripId} must be Dispatched to complete (got ${trip.status})`
    );
  }

  // Compute updated tripCompletionPct for this driver
  const [totalTrips, completedTrips] = await Promise.all([
    prisma.trip.count({ where: { driverId: trip.driverId } }),
    prisma.trip.count({
      where: { driverId: trip.driverId, status: 'Completed' },
    }),
  ]);

  // +1 because the current trip is about to become Completed
  const newCompletionPct =
    totalTrips > 0 ? ((completedTrips + 1) / totalTrips) * 100 : 100;

  // Update vehicle odometer if we have a final reading
  const vehicleUpdate: { status: VehicleStatus; odometerKm?: number } = {
    status: VehicleStatus.Available,
  };
  if (trip.finalOdometerKm !== null) {
    vehicleUpdate.odometerKm = trip.finalOdometerKm;
  }

  await prisma.$transaction([
    prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: vehicleUpdate,
    }),
    prisma.driver.update({
      where: { id: trip.driverId },
      data: {
        status: DriverStatus.Available,
        tripCompletionPct: newCompletionPct,
      },
    }),
    prisma.trip.update({
      where: { id: tripId },
      data: { status: 'Completed' },
    }),
  ]);
};

// ---------------------------------------------------------------------------
// Trip Cancelled (from Dispatched state)
// Vehicle: OnTrip → Available | Driver: OnTrip → Available
// ---------------------------------------------------------------------------

export const onTripCancelled = async (tripId: string): Promise<void> => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { vehicleId: true, driverId: true, status: true },
  });

  if (!trip) {
    throw new Error(`statusEngine.onTripCancelled: Trip ${tripId} not found`);
  }

  // Can cancel from Draft (no status flip needed) or Dispatched (flip back)
  if (trip.status !== 'Draft' && trip.status !== 'Dispatched') {
    throw new Error(
      `statusEngine.onTripCancelled: Trip ${tripId} cannot be cancelled from status ${trip.status}`
    );
  }

  const updates: Parameters<typeof prisma.$transaction>[0] = [
    prisma.trip.update({
      where: { id: tripId },
      data: { status: 'Cancelled' },
    }),
  ];

  // Only flip vehicle/driver back if they were dispatched (i.e., actually On Trip)
  if (trip.status === 'Dispatched') {
    updates.push(
      prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: VehicleStatus.Available },
      }),
      prisma.driver.update({
        where: { id: trip.driverId },
        data: { status: DriverStatus.Available },
      })
    );
  }

  await prisma.$transaction(updates);
};

// ---------------------------------------------------------------------------
// Maintenance Record Created / Opened
// Vehicle: Available → InShop
// Driver: — (no change)
// ---------------------------------------------------------------------------

export const onMaintenanceOpened = async (vehicleId: string): Promise<void> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, status: true },
  });

  if (!vehicle) {
    throw new Error(
      `statusEngine.onMaintenanceOpened: Vehicle ${vehicleId} not found`
    );
  }

  if (vehicle.status === VehicleStatus.Retired) {
    // Retired vehicles can have maintenance logged (e.g. post-retirement inspection)
    // but their status stays Retired — do not flip to InShop.
    return;
  }

  if (vehicle.status === VehicleStatus.OnTrip) {
    throw new Error(
      `statusEngine.onMaintenanceOpened: Vehicle ${vehicleId} is currently On Trip — ` +
        `cannot open a maintenance record while on trip.`
    );
  }

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: VehicleStatus.InShop },
  });
};

// ---------------------------------------------------------------------------
// Maintenance Record Closed
// Vehicle: InShop → Available (UNLESS vehicle is Retired — stays Retired)
// Driver: — (no change)
// CLAUDE.md §6, §4.3: "Available (unless vehicle is Retired)"
// ---------------------------------------------------------------------------

export const onMaintenanceClosed = async (vehicleId: string): Promise<void> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, status: true },
  });

  if (!vehicle) {
    throw new Error(
      `statusEngine.onMaintenanceClosed: Vehicle ${vehicleId} not found`
    );
  }

  // Retired vehicles stay Retired — closing a maintenance record does not
  // revive them. This rule is explicit in CLAUDE.md §6, §4.3.
  if (vehicle.status === VehicleStatus.Retired) {
    return;
  }

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: VehicleStatus.Available },
  });
};
