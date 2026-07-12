// ─── Settings Controller ───────────────────────────────────────────────────────
// OWNER: Suparshv
//
// Endpoints:
//   GET   /api/settings  — return the single settings row
//   PATCH /api/settings  — partially update depot name, currency, distance unit
//
// Prisma model reference (from schema.prisma):
//   Settings { id, depotName, currency, distanceUnit }
//
// There is always exactly one Settings row (id = 1).
// Both endpoints use upsert to guarantee the row exists even on a fresh DB.
// ──────────────────────────────────────────────────────────────────────────────

import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { ok, fail } from '../utils/apiResponse';

// ── Zod schema (settings-specific only) ──────────────────────────────────────
export const UpdateSettingsSchema = z.object({
  depotName: z.string().min(1, { message: 'Depot name cannot be empty' }).max(100).optional(),
  currency: z.string().min(1, { message: 'Currency cannot be empty' }).max(20).optional(),
  distanceUnit: z
    .enum(['Kilometers', 'Miles'], {
      errorMap: () => ({ message: 'distanceUnit must be "Kilometers" or "Miles"' }),
    })
    .optional(),
});

const SETTINGS_ID = 1;
const DEFAULTS = {
  depotName: 'TransitOps Depot',
  currency: 'INR (₹)',
  distanceUnit: 'Kilometers',
} as const;

// ── GET /api/settings ─────────────────────────────────────────────────────────
/**
 * Returns the global settings record.
 * Uses upsert so the row exists even on a freshly migrated database.
 *
 * Response shape (for Aryan's Screen 8 — General panel):
 *   data: { id, depotName, currency, distanceUnit }
 */
export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID, ...DEFAULTS },
    });
    res.json(ok(settings));
  } catch (err) {
    console.error('[settings] getSettings error:', err);
    res.status(500).json(fail('Failed to fetch settings'));
  }
};

// ── PATCH /api/settings ───────────────────────────────────────────────────────
/**
 * Partially updates the settings record.
 * Only fields present in the request body are changed.
 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as z.infer<typeof UpdateSettingsSchema>;

  if (Object.keys(body).length === 0) {
    res.status(400).json(fail('No fields provided to update'));
    return;
  }

  try {
    const settings = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: {
        ...(body.depotName !== undefined && { depotName: body.depotName }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.distanceUnit !== undefined && { distanceUnit: body.distanceUnit }),
      },
      create: {
        id: SETTINGS_ID,
        depotName: body.depotName ?? DEFAULTS.depotName,
        currency: body.currency ?? DEFAULTS.currency,
        distanceUnit: body.distanceUnit ?? DEFAULTS.distanceUnit,
      },
    });
    res.json(ok(settings));
  } catch (err) {
    console.error('[settings] updateSettings error:', err);
    res.status(500).json(fail('Failed to update settings'));
  }
};
