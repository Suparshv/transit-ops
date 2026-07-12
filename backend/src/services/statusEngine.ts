import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { VehicleStatus, DriverStatus } from '../types/enums';

/**
 * statusEngine.ts — single source of truth for Vehicle/Driver status transitions.
 * CLAUDE.md §6.4.3 — never duplicate this logic in controllers.
 */

export const onTripDispatched = async (tripId: number): Promise<void> => {
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

export const onTripCompleted = async (tripId: number): Promise<void> => {
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

  const [totalTrips, completedTrips] = await Promise.all([
    prisma.trip.count({ where: { driverId: trip.driverId } }),
    prisma.trip.count({
      where: { driverId: trip.driverId, status: 'Completed' },
    }),
  ]);

  const newCompletionPct =
    totalTrips > 0 ? ((completedTrips + 1) / totalTrips) * 100 : 100;

  const vehicleUpdate: { status: string; odometerKm?: number } = {
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

export const onTripCancelled = async (tripId: number): Promise<void> => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { vehicleId: true, driverId: true, status: true },
  });

  if (!trip) {
    throw new Error(`statusEngine.onTripCancelled: Trip ${tripId} not found`);
  }

  if (trip.status !== 'Draft' && trip.status !== 'Dispatched') {
    throw new Error(
      `statusEngine.onTripCancelled: Trip ${tripId} cannot be cancelled from status ${trip.status}`
    );
  }

  const updates: Prisma.PrismaPromise<unknown>[] = [
    prisma.trip.update({
      where: { id: tripId },
      data: { status: 'Cancelled' },
    }),
  ];

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

export const onMaintenanceOpened = async (vehicleId: number): Promise<void> => {
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

export const onMaintenanceClosed = async (vehicleId: number): Promise<void> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, status: true },
  });

  if (!vehicle) {
    throw new Error(
      `statusEngine.onMaintenanceClosed: Vehicle ${vehicleId} not found`
    );
  }

  if (vehicle.status === VehicleStatus.Retired) {
    return;
  }

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: VehicleStatus.Available },
  });
};
