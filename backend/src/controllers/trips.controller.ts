import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, fail } from '../utils/apiResponse';
import { CreateTripInput, CompleteTripInput } from '../schemas/trip.schema';
import {
  onTripDispatched,
  onTripCompleted,
  onTripCancelled,
} from '../services/statusEngine';
import {
  createFuelLogFromTripCompletion,
  FuelLogCreationPayload,
} from './fuel.controller';
import { parseIdParam } from '../utils/parseId';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/trips
// ---------------------------------------------------------------------------

export const listTrips = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const trips = await prisma.trip.findMany({
      include: {
        vehicle: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            status: true,
          },
        },
        driver: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(ok(trips));
  } catch (err) {
    console.error('[trips.list]', err);
    res.status(500).json(fail('Failed to fetch trips.'));
  }
};

// ---------------------------------------------------------------------------
// POST /api/trips  — Create trip in Draft status
//
// Business rules enforced (CLAUDE.md §6, rule 4.2):
//   1. Vehicle must be Available (not OnTrip, InShop, or Retired)
//   2. Driver must be Available, non-expired license, not Suspended
//   3. cargoWeightKg ≤ vehicle.capacityKg (with friendly error message)
// ---------------------------------------------------------------------------

export const createTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = req.body as CreateTripInput;

    // ── Validate vehicle eligibility ────────────────────────────────────────
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        capacityKg: true,
        status: true,
      },
    });

    if (!vehicle) {
      res.status(404).json(fail('Vehicle not found.'));
      return;
    }

    if (vehicle.status !== 'Available') {
      res.status(400).json(
        fail(
          `${vehicle.name} (${vehicle.registrationNumber}) is not available for dispatch. ` +
            `Current status: ${vehicle.status}.`
        )
      );
      return;
    }

    // ── Cargo weight check (Design.md: show exact numbers) ─────────────────
    if (data.cargoWeightKg > vehicle.capacityKg) {
      const excess = data.cargoWeightKg - vehicle.capacityKg;
      res.status(400).json(
        fail(
          `Vehicle Capacity: ${vehicle.capacityKg} kg\n` +
            `Cargo Weight: ${data.cargoWeightKg} kg\n` +
            `✗ Capacity exceeded by ${excess.toFixed(0)} kg — dispatch blocked`
        )
      );
      return;
    }

    // ── Validate driver eligibility ─────────────────────────────────────────
    const driver = await prisma.driver.findUnique({
      where: { id: data.driverId },
      select: {
        id: true,
        name: true,
        status: true,
        licenseExpiryDate: true,
      },
    });

    if (!driver) {
      res.status(404).json(fail('Driver not found.'));
      return;
    }

    if (driver.status === 'Suspended') {
      res.status(400).json(
        fail(
          `${driver.name} has a Suspended status and cannot be assigned to a trip.`
        )
      );
      return;
    }

    if (driver.status !== 'Available') {
      res.status(400).json(
        fail(
          `${driver.name} is not available for dispatch. ` +
            `Current status: ${driver.status}.`
        )
      );
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (driver.licenseExpiryDate < today) {
      const expiryStr = driver.licenseExpiryDate.toLocaleDateString('en-IN', {
        month: '2-digit',
        year: 'numeric',
      });
      res.status(400).json(
        fail(
          `${driver.name}'s license expired on ${expiryStr} and cannot be assigned to a trip.`
        )
      );
      return;
    }

    // ── Create the trip in Draft status ─────────────────────────────────────
    const trip = await prisma.trip.create({
      data,
      include: {
        vehicle: {
          select: { name: true, registrationNumber: true },
        },
        driver: { select: { name: true } },
      },
    });

    res.status(201).json(ok(trip));
  } catch (err) {
    console.error('[trips.create]', err);
    res.status(500).json(fail('Failed to create trip.'));
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/trips/:id/dispatch
// Moves trip Draft → Dispatched; statusEngine flips Vehicle + Driver to OnTrip
// ---------------------------------------------------------------------------

export const dispatchTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json(fail('Invalid trip ID.'));
      return;
    }

    const trip = await prisma.trip.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!trip) {
      res.status(404).json(fail('Trip not found.'));
      return;
    }

    if (trip.status !== 'Draft') {
      res.status(400).json(
        fail(
          `Trip cannot be dispatched from status "${trip.status}". Must be in Draft.`
        )
      );
      return;
    }

    await onTripDispatched(id);

    const updated = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: { select: { name: true, registrationNumber: true, status: true } },
        driver: { select: { name: true, status: true } },
      },
    });

    res.status(200).json(ok(updated));
  } catch (err) {
    console.error('[trips.dispatch]', err);
    res.status(500).json(fail('Failed to dispatch trip.'));
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/trips/:id/complete
// Moves trip Dispatched → Completed
// Pipeline (Design.md Screen 4 footnote):
//   finalOdometer → fuel log (via Suparshv's stub) → statusEngine → Available
// ---------------------------------------------------------------------------

export const completeTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json(fail('Invalid trip ID.'));
      return;
    }

    const {
      finalOdometerKm,
      fuelConsumedLiters,
      fuelCost,
    } = req.body as CompleteTripInput;

    const trip = await prisma.trip.findUnique({
      where: { id },
      select: { id: true, status: true, vehicleId: true, driverId: true },
    });

    if (!trip) {
      res.status(404).json(fail('Trip not found.'));
      return;
    }

    if (trip.status !== 'Dispatched') {
      res.status(400).json(
        fail(
          `Trip cannot be completed from status "${trip.status}". Must be Dispatched.`
        )
      );
      return;
    }

    // Step 1: Persist odometer + fuel fields on the trip row
    await prisma.trip.update({
      where: { id },
      data: { finalOdometerKm, fuelConsumedLiters, fuelCost },
    });

    // Step 2: Write fuel log via Suparshv's function (CLAUDE.md §3.5-A)
    // Joy calls this — Suparshv owns the implementation.
    const fuelPayload: FuelLogCreationPayload = {
      tripId: id,
      vehicleId: trip.vehicleId,
      finalOdometerKm,
      fuelConsumedLiters,
      fuelCost,
      date: new Date(),
    };
    await createFuelLogFromTripCompletion(fuelPayload);

    // Step 3: Status engine flips Vehicle → Available, Driver → Available
    // and marks trip as Completed (atomically in a transaction)
    await onTripCompleted(id);

    const updated = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: {
          select: { name: true, registrationNumber: true, status: true },
        },
        driver: { select: { name: true, status: true } },
      },
    });

    res.status(200).json(ok(updated));
  } catch (err) {
    console.error('[trips.complete]', err);
    res.status(500).json(fail('Failed to complete trip.'));
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/trips/:id/cancel
// Cancels a trip from Draft or Dispatched.
// If Dispatched: statusEngine flips Vehicle + Driver back to Available.
// ---------------------------------------------------------------------------

export const cancelTrip = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json(fail('Invalid trip ID.'));
      return;
    }

    const trip = await prisma.trip.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!trip) {
      res.status(404).json(fail('Trip not found.'));
      return;
    }

    if (trip.status === 'Completed' || trip.status === 'Cancelled') {
      res.status(400).json(
        fail(`Trip cannot be cancelled from status "${trip.status}".`)
      );
      return;
    }

    // Status transition lives in statusEngine — includes the Draft case
    await onTripCancelled(id);

    const updated = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: { select: { name: true, registrationNumber: true, status: true } },
        driver: { select: { name: true, status: true } },
      },
    });

    res.status(200).json(ok(updated));
  } catch (err) {
    console.error('[trips.cancel]', err);
    res.status(500).json(fail('Failed to cancel trip.'));
  }
};
