import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ok, fail } from '../utils/apiResponse';
import {
  CreateDriverInput,
  UpdateDriverInput,
} from '../schemas/driver.schema';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/drivers
// Query param: ?availableOnly=true
//   Filters out: expired license (licenseExpiryDate < today) + Suspended drivers
//   Used by Trip Dispatcher driver dropdown (CLAUDE.md §6 rule 4.2)
// ---------------------------------------------------------------------------

export const listDrivers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const availableOnly = req.query.availableOnly === 'true';

    const where = availableOnly
      ? {
          status: 'Available' as const,
          licenseExpiryDate: {
            gte: new Date(), // license must not be expired
          },
        }
      : {};

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(ok(drivers));
  } catch (err) {
    console.error('[drivers.list]', err);
    res.status(500).json(fail('Failed to fetch drivers.'));
  }
};

// ---------------------------------------------------------------------------
// POST /api/drivers
// ---------------------------------------------------------------------------

export const createDriver = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = req.body as CreateDriverInput;

    const driver = await prisma.driver.create({ data });
    res.status(201).json(ok(driver));
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      res.status(409).json(
        fail(
          `License number "${req.body.licenseNumber}" is already registered.`
        )
      );
      return;
    }
    console.error('[drivers.create]', err);
    res.status(500).json(fail('Failed to create driver.'));
  }
};

// ---------------------------------------------------------------------------
// GET /api/drivers/:id
// ---------------------------------------------------------------------------

export const getDriver = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { trips: true } },
      },
    });

    if (!driver) {
      res.status(404).json(fail('Driver not found.'));
      return;
    }

    res.status(200).json(ok(driver));
  } catch (err) {
    console.error('[drivers.get]', err);
    res.status(500).json(fail('Failed to fetch driver.'));
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/drivers/:id
// Handles both profile updates and the "TOGGLE STATUS" quick-action buttons
// from the Drivers & Safety screen (Design.md Screen 3).
// Status changes here are direct — they do NOT go through statusEngine.ts.
// statusEngine.ts only handles Trip and Maintenance event-driven transitions.
// ---------------------------------------------------------------------------

export const updateDriver = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = req.body as UpdateDriverInput;

    const existing = await prisma.driver.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      res.status(404).json(fail('Driver not found.'));
      return;
    }

    // Prevent manually setting a driver to OnTrip if not actually on a trip
    // (safety guard — the real OnTrip flip happens via statusEngine.onTripDispatched)
    if (data.status === 'OnTrip') {
      res.status(400).json(
        fail(
          'Cannot manually set status to On Trip. ' +
            'Dispatch a trip to set this status.'
        )
      );
      return;
    }

    const updated = await prisma.driver.update({
      where: { id: req.params.id },
      data,
    });

    res.status(200).json(ok(updated));
  } catch (err) {
    console.error('[drivers.update]', err);
    res.status(500).json(fail('Failed to update driver.'));
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/drivers/:id
// ---------------------------------------------------------------------------

export const deleteDriver = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const existing = await prisma.driver.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      res.status(404).json(fail('Driver not found.'));
      return;
    }

    await prisma.driver.delete({ where: { id: req.params.id } });
    res.status(200).json(ok({ deleted: true, id: req.params.id }));
  } catch (err) {
    console.error('[drivers.delete]', err);
    res.status(500).json(fail('Failed to delete driver.'));
  }
};
