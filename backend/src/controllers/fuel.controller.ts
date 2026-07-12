// ─── Fuel Log Controller — OWNER: Suparshv ────────────────────────────────────

import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { ok, fail } from '../utils/apiResponse';

export const CreateFuelLogSchema = z.object({
  vehicleId: z.number().int().positive({ message: 'vehicleId must be a positive integer' }),
  tripId: z.number().int().positive().nullable().optional(),
  date: z.string().datetime({ message: 'date must be a valid ISO 8601 datetime string' }),
  liters: z.number().positive({ message: 'liters must be greater than 0' }),
  fuelCost: z.number().positive({ message: 'fuelCost must be greater than 0' }),
});

/** Integration contract — Joy's trips.controller imports this type. */
export interface FuelLogCreationPayload {
  tripId: number;
  vehicleId: number;
  finalOdometerKm: number;
  fuelConsumedLiters: number;
  fuelCost: number;
  date: Date;
}

export const getAllFuelLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.fuelLog.findMany({
      orderBy: { date: 'desc' },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, name: true } },
        trip: { select: { id: true, source: true, destination: true } },
      },
    });
    res.json(ok(logs));
  } catch (err) {
    console.error('[fuel] getAllFuelLogs error:', err);
    res.status(500).json(fail('Failed to fetch fuel logs'));
  }
};

export const createFuelLog = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as z.infer<typeof CreateFuelLogSchema>;

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: body.vehicleId } });
    if (!vehicle) {
      res.status(404).json(fail(`Vehicle with id ${body.vehicleId} not found`));
      return;
    }

    if (body.tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: body.tripId } });
      if (!trip) {
        res.status(404).json(fail(`Trip with id ${body.tripId} not found`));
        return;
      }
      if (trip.vehicleId !== body.vehicleId) {
        res.status(400).json(
          fail(`Trip ${body.tripId} is assigned to vehicle ${trip.vehicleId}, not ${body.vehicleId}`)
        );
        return;
      }
    }

    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: body.vehicleId,
        tripId: body.tripId ?? null,
        date: new Date(body.date),
        liters: body.liters,
        fuelCost: body.fuelCost,
      },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, name: true } },
        trip: { select: { id: true, source: true, destination: true } },
      },
    });

    res.status(201).json(ok(log));
  } catch (err) {
    console.error('[fuel] createFuelLog error:', err);
    res.status(500).json(fail('Failed to create fuel log'));
  }
};

/** Called by Joy's trips.controller on PATCH /api/trips/:id/complete */
export const createFuelLogFromTripCompletion = async (
  payload: FuelLogCreationPayload
): Promise<void> => {
  await prisma.fuelLog.create({
    data: {
      vehicleId: payload.vehicleId,
      tripId: payload.tripId,
      date: payload.date,
      liters: payload.fuelConsumedLiters,
      fuelCost: payload.fuelCost,
    },
  });
};
