import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ok, fail } from '../utils/apiResponse';
import { CreateMaintenanceInput } from '../schemas/maintenance.schema';
import {
  onMaintenanceOpened,
  onMaintenanceClosed,
} from '../services/statusEngine';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/maintenance
// ---------------------------------------------------------------------------

export const listMaintenance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const records = await prisma.maintenanceLog.findMany({
      include: {
        vehicle: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(ok(records));
  } catch (err) {
    console.error('[maintenance.list]', err);
    res.status(500).json(fail('Failed to fetch maintenance records.'));
  }
};

// ---------------------------------------------------------------------------
// POST /api/maintenance
// Creates an Active maintenance record → calls statusEngine.onMaintenanceOpened()
// Vehicle flips: Available → InShop (removed from dispatch pool)
// Design.md Screen 5: "Available --[opening active record]--> In Shop"
// ---------------------------------------------------------------------------

export const createMaintenance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = req.body as CreateMaintenanceInput;

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
      select: { id: true, name: true, status: true },
    });

    if (!vehicle) {
      res.status(404).json(fail('Vehicle not found.'));
      return;
    }

    // Create maintenance record first (Active by default per schema)
    const record = await prisma.maintenanceLog.create({
      data: { ...data, status: 'Active' },
      include: {
        vehicle: {
          select: { name: true, registrationNumber: true },
        },
      },
    });

    // Status transition: vehicle → InShop (unless Retired — statusEngine handles that case)
    await onMaintenanceOpened(data.vehicleId);

    res.status(201).json(ok(record));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to create maintenance record.';
    console.error('[maintenance.create]', err);
    res.status(500).json(fail(message));
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/maintenance/:id/close
// Closes an Active record → calls statusEngine.onMaintenanceClosed()
// Vehicle flips: InShop → Available (unless Retired — statusEngine handles that)
// Design.md Screen 5: "In Shop --[closing record, not retired]--> Available"
// ---------------------------------------------------------------------------

export const closeMaintenance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const record = await prisma.maintenanceLog.findUnique({
      where: { id },
      select: { id: true, status: true, vehicleId: true },
    });

    if (!record) {
      res.status(404).json(fail('Maintenance record not found.'));
      return;
    }

    if (record.status === 'Closed') {
      res.status(400).json(fail('Maintenance record is already closed.'));
      return;
    }

    // Close the maintenance record
    const updated = await prisma.maintenanceLog.update({
      where: { id },
      data: { status: 'Closed' },
      include: {
        vehicle: {
          select: { name: true, registrationNumber: true, status: true },
        },
      },
    });

    // Status transition: vehicle → Available (statusEngine respects Retired exception)
    await onMaintenanceClosed(record.vehicleId);

    res.status(200).json(ok(updated));
  } catch (err) {
    console.error('[maintenance.close]', err);
    res.status(500).json(fail('Failed to close maintenance record.'));
  }
};
