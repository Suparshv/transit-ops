// ─── Reports & Analytics Controller ───────────────────────────────────────────
// OWNER: Suparshv
//
// Endpoints:
//   GET /api/reports/dashboard        — 7 KPI cards + recent trips + vehicle status
//   GET /api/reports/utilization      — fleet utilization % + per-vehicle breakdown
//   GET /api/reports/roi              — per-vehicle ROI, fuel efficiency, revenue
//   GET /api/reports/top-costliest    — top vehicles ranked by operational cost
//   GET /api/reports/monthly-revenue  — last 7 months of trip revenue (bar chart)
//   GET /api/reports/export.csv       — CSV dump of per-vehicle analytics
//
// ─── Formulas (from CLAUDE.md §6.4 — Calculated Fields) ─────────────────────
//
//   Operational Cost    = Σ FuelLog.fuelCost  +  Σ Maintenance.cost
//   Fuel Efficiency     = Σ distance traveled  /  Σ fuel consumed (liters)
//   Fleet Utilization % = (ON_TRIP vehicles / non-RETIRED vehicles) × 100
//   Trip Revenue        = plannedDistanceKm × REVENUE_PER_KM_RATE
//   Vehicle ROI         = (Revenue − Operational Cost) / Acquisition Cost
//
// ─── Revenue assumption (documented per CLAUDE.md §6.4) ─────────────────────
//   "Trip Revenue = Planned Distance (km) × ₹30/km" — flat per-km rate,
//   summed across COMPLETED trips for a vehicle to get its total Revenue.
//   This is a deliberate simplification stated in the README.
// ──────────────────────────────────────────────────────────────────────────────

import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ok, fail } from '../utils/apiResponse';

/**
 * Revenue per kilometer — documented assumption from CLAUDE.md §6.4.
 * "Trip Revenue = Planned Distance (km) × ₹30/km"
 */
const REVENUE_PER_KM_RATE = 30;

// ─── Helper: distance for a completed trip ──────────────────────────────────
// Prefers odometer delta (endOdometer - startOdometer) when available,
// falls back to plannedDistanceKm otherwise.
const tripDistance = (trip: { plannedDistanceKm: number }): number =>
  trip.plannedDistanceKm;

interface VehicleWithRelations {
  id: number;
  registrationNumber: string;
  name: string;
  type: string;
  status: string;
  acquisitionCost: number;
  odometerKm: number;
  trips: {
    id: number;
    status: string;
    plannedDistanceKm: number;
    fuelConsumedLiters: number | null;
  }[];
  fuelLogs: { fuelCost: number; liters: number }[];
  maintenanceLogs: { cost: number }[];
}

const computeVehicleStats = (v: VehicleWithRelations) => {
  const completedTrips = v.trips.filter(t => t.status === 'Completed');

  const revenue = completedTrips.reduce(
    (sum, t) => sum + t.plannedDistanceKm * REVENUE_PER_KM_RATE,
    0
  );

  const fuelCost = v.fuelLogs.reduce((sum, f) => sum + f.fuelCost, 0);
  const maintenanceCost = v.maintenanceLogs.reduce((sum, m) => sum + m.cost, 0);
  const operationalCost = fuelCost + maintenanceCost;

  const roi =
    v.acquisitionCost > 0
      ? +((( revenue - operationalCost) / v.acquisitionCost) * 100).toFixed(2)
      : 0;

  const totalDistanceKm = completedTrips.reduce((sum, t) => sum + tripDistance(t), 0);
  const totalFuelLiters = v.fuelLogs.reduce((sum, f) => sum + f.liters, 0);
  const fuelEfficiencyKmL =
    totalFuelLiters > 0 ? +(totalDistanceKm / totalFuelLiters).toFixed(2) : null;

  return {
    vehicleId: v.id,
    registrationNumber: v.registrationNumber,
    name: v.name,
    type: v.type,
    status: v.status,
    acquisitionCost: v.acquisitionCost,
    revenue: +revenue.toFixed(2),
    fuelCost: +fuelCost.toFixed(2),
    maintenanceCost: +maintenanceCost.toFixed(2),
    operationalCost: +operationalCost.toFixed(2),
    roi,
    fuelEfficiencyKmL,
    completedTripsCount: completedTrips.length,
    totalDistanceKm: +totalDistanceKm.toFixed(2),
    totalFuelLiters: +totalFuelLiters.toFixed(2),
  };
};

// ─── Shared data loader ─────────────────────────────────────────────────────
// Fetches vehicles with their related trips, fuelLogs, and maintenances.
// Centralised so multiple endpoints don't issue redundant queries.
const loadVehiclesWithRelations = () =>
  prisma.vehicle.findMany({
    include: {
      trips: {
        select: {
          id: true,
          status: true,
          plannedDistanceKm: true,
          fuelConsumedLiters: true,
        },
      },
      fuelLogs: { select: { fuelCost: true, liters: true } },
      maintenanceLogs: { select: { cost: true } },
    },
  });

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/reports/dashboard ────────────────────────────────────────────────
/**
 * Powers Screen 1 (Dashboard). Returns:
 *   - 7 KPI values (activeVehicles, availableVehicles, vehiclesInMaintenance,
 *     activeTrips, pendingTrips, driversOnDuty, fleetUtilizationPct)
 *   - vehicleStatusBreakdown (available/onTrip/inShop/retired counts)
 *   - recentTrips (last 10, with vehicle/driver names and ETA)
 */
export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [vehicles, drivers, trips] = await Promise.all([
      prisma.vehicle.findMany(),
      prisma.driver.findMany(),
      prisma.trip.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: { select: { registrationNumber: true, name: true } },
          driver: { select: { name: true } },
        },
      }),
    ]);

    const nonRetired = vehicles.filter(v => v.status !== 'Retired');
    const onTrip     = vehicles.filter(v => v.status === 'OnTrip');
    const available  = vehicles.filter(v => v.status === 'Available');
    const inShop     = vehicles.filter(v => v.status === 'InShop');
    const retired    = vehicles.filter(v => v.status === 'Retired');

    const fleetUtilizationPct =
      nonRetired.length > 0
        ? Math.round((onTrip.length / nonRetired.length) * 100)
        : 0;

    const recentTrips = trips.slice(0, 10).map(t => ({
      id: t.id,
      source: t.source,
      destination: t.destination,
      vehicleName: t.vehicle.name,
      vehicleRegistrationNumber: t.vehicle.registrationNumber,
      driverName: t.driver.name,
      status: t.status,
      eta: t.status === 'Dispatched'
        ? `~${Math.ceil(t.plannedDistanceKm / 60)} hrs`
        : null,
    }));

    res.json(ok({
      kpis: {
        activeVehicles: nonRetired.length,
        availableVehicles: available.length,
        vehiclesInMaintenance: inShop.length,
        activeTrips: trips.filter(t => t.status === 'Dispatched').length,
        pendingTrips: trips.filter(t => t.status === 'Draft').length,
        driversOnDuty: drivers.filter(d => d.status === 'OnTrip').length,
        fleetUtilizationPct,
      },
      vehicleStatusBreakdown: {
        available: available.length,
        onTrip: onTrip.length,
        inShop: inShop.length,
        retired: retired.length,
      },
      recentTrips,
    }));
  } catch (err) {
    console.error('[reports] getDashboard error:', err);
    res.status(500).json(fail('Failed to fetch dashboard data'));
  }
};

// ── GET /api/reports/utilization ──────────────────────────────────────────────
/**
 * Fleet Utilization % = (ON_TRIP vehicles / non-RETIRED vehicles) × 100
 * Also returns per-vehicle trip counts.
 */
export const getUtilization = async (_req: Request, res: Response): Promise<void> => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        trips: { select: { id: true, status: true } },
      },
    });

    const nonRetired = vehicles.filter(v => v.status !== 'Retired');
    const onTripCount = vehicles.filter(v => v.status === 'OnTrip').length;

    const fleetUtilizationPct =
      nonRetired.length > 0
        ? Math.round((onTripCount / nonRetired.length) * 100)
        : 0;

    const perVehicle = vehicles.map(v => ({
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      name: v.name,
      status: v.status,
      totalTrips: v.trips.length,
      completedTrips: v.trips.filter(t => t.status === 'Completed').length,
      activeTrips: v.trips.filter(t => t.status === 'Dispatched').length,
    }));

    res.json(ok({
      fleetUtilizationPct,
      activeVehicles: nonRetired.length,
      onTripCount,
      perVehicle,
    }));
  } catch (err) {
    console.error('[reports] getUtilization error:', err);
    res.status(500).json(fail('Failed to fetch utilization data'));
  }
};

// ── GET /api/reports/roi ──────────────────────────────────────────────────────
/**
 * Per-vehicle ROI + fuel efficiency + operational cost breakdown.
 * Also returns summary KPIs across all vehicles.
 *
 * ROI = (Revenue − OperationalCost) / AcquisitionCost × 100  (%)
 * Revenue = Σ (completedTrip.plannedDistanceKm × ₹30/km)
 * OperationalCost = Σ fuelCost + Σ maintenanceCost
 * FuelEfficiency = Σ distanceKm / Σ fuelLiters  (km/l)
 */
export const getROI = async (_req: Request, res: Response): Promise<void> => {
  try {
    const vehicles = await loadVehiclesWithRelations();
    const statsPerVehicle = vehicles.map(computeVehicleStats);

    const totalRevenue = statsPerVehicle.reduce((s, v) => s + v.revenue, 0);
    const totalOperationalCost = statsPerVehicle.reduce((s, v) => s + v.operationalCost, 0);

    const withEfficiency = statsPerVehicle.filter(v => v.fuelEfficiencyKmL !== null);
    const avgFuelEfficiency =
      withEfficiency.length > 0
        ? +(withEfficiency.reduce((s, v) => s + (v.fuelEfficiencyKmL ?? 0), 0) / withEfficiency.length).toFixed(2)
        : null;

    res.json(ok({
      summary: {
        totalRevenue: +totalRevenue.toFixed(2),
        totalOperationalCost: +totalOperationalCost.toFixed(2),
        avgFuelEfficiencyKmL: avgFuelEfficiency,
      },
      perVehicle: statsPerVehicle,
    }));
  } catch (err) {
    console.error('[reports] getROI error:', err);
    res.status(500).json(fail('Failed to fetch ROI data'));
  }
};

// ── GET /api/reports/top-costliest ────────────────────────────────────────────
/**
 * Returns top 5 vehicles ranked by total operational cost (fuel + maintenance).
 * Used for the horizontal ranked bar list on Screen 7.
 */
export const getTopCostliest = async (_req: Request, res: Response): Promise<void> => {
  try {
    const vehicles = await loadVehiclesWithRelations();

    const ranked = vehicles
      .map(v => {
        const fuelCost = v.fuelLogs.reduce((s, f) => s + f.fuelCost, 0);
        const maintenanceCost = v.maintenanceLogs.reduce((s, m) => s + m.cost, 0);
        return {
          vehicleId: v.id,
          registrationNumber: v.registrationNumber,
          name: v.name,
          type: v.type,
          fuelCost: +fuelCost.toFixed(2),
          maintenanceCost: +maintenanceCost.toFixed(2),
          totalOperationalCost: +(fuelCost + maintenanceCost).toFixed(2),
        };
      })
      .sort((a, b) => b.totalOperationalCost - a.totalOperationalCost)
      .slice(0, 5);

    res.json(ok(ranked));
  } catch (err) {
    console.error('[reports] getTopCostliest error:', err);
    res.status(500).json(fail('Failed to fetch top costliest vehicles'));
  }
};

// ── GET /api/reports/monthly-revenue ─────────────────────────────────────────
/**
 * Returns monthly trip revenue for the last 7 months (including current).
 * Revenue = Σ (plannedDistanceKm × REVENUE_PER_KM_RATE) for COMPLETED trips
 * whose updatedAt falls in that month.
 *
 * Response shape (for Aryan's Screen 7 — monthly revenue bar chart):
 *   data: Array<{ label: string, revenue: number }>
 */
export const getMonthlyRevenue = async (_req: Request, res: Response): Promise<void> => {
  try {
    const completedTrips = await prisma.trip.findMany({
      where: { status: 'Completed' },
      select: { plannedDistanceKm: true, updatedAt: true },
    });

    // Build 7-month window (current month + 6 prior)
    const now = new Date();
    const months: { label: string; year: number; month: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
        year: d.getFullYear(),
        month: d.getMonth(),
        revenue: 0,
      });
    }

    // Accumulate revenue into the correct month bucket
    for (const trip of completedTrips) {
      const d = new Date(trip.updatedAt);
      const bucket = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
      if (bucket) {
        bucket.revenue += trip.plannedDistanceKm * REVENUE_PER_KM_RATE;
      }
    }

    res.json(ok(months.map(m => ({ label: m.label, revenue: +m.revenue.toFixed(2) }))));
  } catch (err) {
    console.error('[reports] getMonthlyRevenue error:', err);
    res.status(500).json(fail('Failed to fetch monthly revenue'));
  }
};

// ── GET /api/reports/export.csv ───────────────────────────────────────────────
/**
 * Streams a CSV of per-vehicle analytics with correct Content-Type and
 * Content-Disposition headers.
 *
 * Columns: Registration No, Name, Type, Acquisition Cost (₹), Revenue (₹),
 *   Fuel Cost (₹), Maintenance Cost (₹), Operational Cost (₹), ROI (%),
 *   Fuel Efficiency (km/l), Completed Trips
 */
export const exportCSV = async (_req: Request, res: Response): Promise<void> => {
  try {
    const vehicles = await loadVehiclesWithRelations();
    const stats = vehicles.map(computeVehicleStats);

    const header = [
      'Registration No',
      'Name',
      'Type',
      'Acquisition Cost (₹)',
      'Revenue (₹)',
      'Fuel Cost (₹)',
      'Maintenance Cost (₹)',
      'Operational Cost (₹)',
      'ROI (%)',
      'Fuel Efficiency (km/l)',
      'Completed Trips',
    ].join(',');

    const rows = stats.map(v =>
      [
        v.registrationNumber,
        `"${v.name}"`,          // quote name in case it contains commas
        v.type,
        v.acquisitionCost.toFixed(2),
        v.revenue.toFixed(2),
        v.fuelCost.toFixed(2),
        v.maintenanceCost.toFixed(2),
        v.operationalCost.toFixed(2),
        v.roi.toString(),
        v.fuelEfficiencyKmL?.toString() ?? 'N/A',
        v.completedTripsCount.toString(),
      ].join(',')
    );

    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="transitops-report.csv"');
    res.send(csv);
  } catch (err) {
    console.error('[reports] exportCSV error:', err);
    res.status(500).json(fail('Failed to generate CSV export'));
  }
};
