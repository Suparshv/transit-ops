// ─── Expenses Controller — OWNER: Suparshv ────────────────────────────────────

import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { ok, fail } from '../utils/apiResponse';

export const CreateExpenseSchema = z.object({
  tripId: z.number().int().positive({ message: 'tripId must be a positive integer' }),
  vehicleId: z.number().int().positive({ message: 'vehicleId must be a positive integer' }),
  toll: z.number().min(0, { message: 'toll must be 0 or positive' }).default(0),
  other: z.number().min(0, { message: 'other must be 0 or positive' }).default(0),
  maintenanceLogId: z.number().int().positive().nullable().optional(),
  status: z.enum(['Pending', 'Settled']).default('Pending'),
});

const addTotal = <T extends { toll: number; other: number; maintenanceCost: number }>(
  expense: T
) => ({
  ...expense,
  total: expense.toll + expense.other + expense.maintenanceCost,
});

export const getAllExpenses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        trip: { select: { id: true, source: true, destination: true, status: true } },
        vehicle: { select: { id: true, registrationNumber: true, name: true } },
        maintenanceLog: { select: { id: true, serviceType: true, cost: true, status: true } },
      },
    });

    res.json(ok(expenses.map(addTotal)));
  } catch (err) {
    console.error('[expenses] getAllExpenses error:', err);
    res.status(500).json(fail('Failed to fetch expenses'));
  }
};

export const createExpense = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as z.infer<typeof CreateExpenseSchema>;

  try {
    const trip = await prisma.trip.findUnique({ where: { id: body.tripId } });
    if (!trip) {
      res.status(404).json(fail(`Trip with id ${body.tripId} not found`));
      return;
    }

    if (trip.vehicleId !== body.vehicleId) {
      res.status(400).json(
        fail(
          `Vehicle ${body.vehicleId} is not assigned to trip ${body.tripId} ` +
            `(trip is assigned to vehicle ${trip.vehicleId})`
        )
      );
      return;
    }

    let maintenanceCost = 0;
    if (body.maintenanceLogId) {
      const maint = await prisma.maintenanceLog.findUnique({
        where: { id: body.maintenanceLogId },
      });
      if (!maint) {
        res.status(404).json(fail(`Maintenance record with id ${body.maintenanceLogId} not found`));
        return;
      }
      if (maint.vehicleId !== body.vehicleId) {
        res.status(400).json(
          fail(
            `Maintenance ${body.maintenanceLogId} belongs to vehicle ${maint.vehicleId}, not ${body.vehicleId}`
          )
        );
        return;
      }
      maintenanceCost = maint.cost;
    }

    const total = body.toll + body.other + maintenanceCost;

    const expense = await prisma.expense.create({
      data: {
        tripId: body.tripId,
        vehicleId: body.vehicleId,
        toll: body.toll,
        other: body.other,
        maintenanceCost,
        maintenanceLogId: body.maintenanceLogId ?? null,
        total,
        status: body.status,
      },
      include: {
        trip: { select: { id: true, source: true, destination: true, status: true } },
        vehicle: { select: { id: true, registrationNumber: true, name: true } },
        maintenanceLog: { select: { id: true, serviceType: true, cost: true, status: true } },
      },
    });

    res.status(201).json(ok(addTotal(expense)));
  } catch (err) {
    console.error('[expenses] createExpense error:', err);
    res.status(500).json(fail('Failed to create expense'));
  }
};
