import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ok, fail } from '../utils/apiResponse';
import { parseIdParam } from '../utils/parseId';
import {
  CreateVehicleInput,
  UpdateVehicleInput,
} from '../schemas/vehicle.schema';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/vehicles
// Query param: ?availableOnly=true → filters for Available vehicles only
// (used by Trip Dispatcher vehicle dropdown — CLAUDE.md §6 rule 4.2)
// ---------------------------------------------------------------------------

export const listVehicles = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const availableOnly = req.query.availableOnly === 'true';

    const where = availableOnly
      ? { status: 'Available' as const }
      : {};

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(ok(vehicles));
  } catch (err) {
    console.error('[vehicles.list]', err);
    res.status(500).json(fail('Failed to fetch vehicles.'));
  }
};

// ---------------------------------------------------------------------------
// POST /api/vehicles
// Business rule: registration number must be unique (CLAUDE.md §6, rule 4.2)
// ---------------------------------------------------------------------------

export const createVehicle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = req.body as CreateVehicleInput;

    const vehicle = await prisma.vehicle.create({ data });
    res.status(201).json(ok(vehicle));
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      // Unique constraint violation on registrationNumber
      res.status(409).json(
        fail(
          `Registration number "${req.body.registrationNumber}" is already in use. ` +
            'Registration numbers must be unique.'
        )
      );
      return;
    }
    console.error('[vehicles.create]', err);
    res.status(500).json(fail('Failed to create vehicle.'));
  }
};

// ---------------------------------------------------------------------------
// GET /api/vehicles/:id
// ---------------------------------------------------------------------------

export const getVehicle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json(fail('Invalid vehicle ID.'));
      return;
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        _count: { select: { trips: true, maintenanceLogs: true } },
      },
    });

    if (!vehicle) {
      res.status(404).json(fail('Vehicle not found.'));
      return;
    }

    res.status(200).json(ok(vehicle));
  } catch (err) {
    console.error('[vehicles.get]', err);
    res.status(500).json(fail('Failed to fetch vehicle.'));
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/vehicles/:id
// ---------------------------------------------------------------------------

export const updateVehicle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json(fail('Invalid vehicle ID.'));
      return;
    }

    const data = req.body as UpdateVehicleInput;

    const existing = await prisma.vehicle.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json(fail('Vehicle not found.'));
      return;
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data,
    });

    res.status(200).json(ok(updated));
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      res.status(409).json(
        fail(
          `Registration number "${req.body.registrationNumber}" is already in use.`
        )
      );
      return;
    }
    console.error('[vehicles.update]', err);
    res.status(500).json(fail('Failed to update vehicle.'));
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/vehicles/:id
// ---------------------------------------------------------------------------

export const deleteVehicle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json(fail('Invalid vehicle ID.'));
      return;
    }

    const existing = await prisma.vehicle.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json(fail('Vehicle not found.'));
      return;
    }

    await prisma.vehicle.delete({ where: { id } });
    res.status(200).json(ok({ deleted: true, id }));
  } catch (err) {
    console.error('[vehicles.delete]', err);
    res.status(500).json(fail('Failed to delete vehicle.'));
  }
};
