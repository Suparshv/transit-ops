// ─── Demo Data Seed Script ─────────────────────────────────────────────────────
// OWNER: Suparshv
//
// Run:  npm run db:seed           (from backend/)
//   or: npx ts-node src/prisma/seed.ts
//
// Seeds (all based on schema.prisma field names — read it before editing):
//   - 4 Users (one per role, password: password123)
//   - 4 Vehicles (mix of statuses: Available, OnTrip, InShop)
//   - 4 Drivers (mix of statuses + 1 expired license + 1 suspended)
//   - 5 Trips (Completed × 2, Dispatched × 1, Draft × 1, Cancelled × 1)
//   - 3 Maintenance records (1 Active, 2 Closed)
//   - 4 Fuel logs (linked to vehicles/trips)
//   - 3 Expenses (linked to completed trips)
//   - 1 Settings record
//
// Idempotent — deleteMany on every table then re-seeds. Safe to run repeatedly.
//
// Demo edge cases baked in for the walkthrough (CLAUDE.md §6.5):
//   - Rahul Das: expired license → should be blocked from trip assignment
//   - Meena Pillai: Suspended → should be blocked from trip assignment
//   - Mini-08: InShop (open maintenance) → should not appear in dispatch pool
// ──────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TransitOps demo data...\n');

  // ── Wipe existing data (FK-safe order: children first) ────────────────────
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  // ── Settings ──────────────────────────────────────────────────────────────
  await prisma.settings.create({
    data: {
      id: 1,
      depotName: 'TransitOps Central Depot',
      currency: 'INR (₹)',
      distanceUnit: 'Kilometers',
    },
  });
  console.log('  ✓ Settings');

  // ── Users ─────────────────────────────────────────────────────────────────
  // Schema: User { id, email, passwordHash, failedLoginAttempts, isLocked, createdAt, updatedAt }
  // Note: no name or role fields on User — role is selected at login and embedded in the JWT.
  const hash = await bcrypt.hash('password123', 10);

  await prisma.user.createMany({
    data: [
      { email: 'fleet@transitops.in',    passwordHash: hash },
      { email: 'dispatch@transitops.in', passwordHash: hash },
      { email: 'safety@transitops.in',   passwordHash: hash },
      { email: 'finance@transitops.in',  passwordHash: hash },
    ],
  });
  console.log('  ✓ Users (4)');

  // ── Vehicles ──────────────────────────────────────────────────────────────
  // Schema fields: registrationNumber, name, type, capacityKg,
  //   odometerKm, acquisitionCost, status
  const van05 = await prisma.vehicle.create({
    data: {
      registrationNumber: 'MH-01-AB-1234',
      name: 'Van-05',
      type: 'Van',
      capacityKg: 500,
      odometerKm: 12400,
      acquisitionCost: 850000,
      status: 'Available',
    },
  });
  const truck12 = await prisma.vehicle.create({
    data: {
      registrationNumber: 'MH-02-CD-5678',
      name: 'Truck-12',
      type: 'Truck',
      capacityKg: 2000,
      odometerKm: 45200,
      acquisitionCost: 2500000,
      status: 'OnTrip',
    },
  });
  const mini08 = await prisma.vehicle.create({
    data: {
      registrationNumber: 'KA-03-EF-9012',
      name: 'Mini-08',
      type: 'Minibus',
      capacityKg: 800,
      odometerKm: 8100,
      acquisitionCost: 1200000,
      status: 'InShop',  // open maintenance record below keeps it here
    },
  });
  const pickup03 = await prisma.vehicle.create({
    data: {
      registrationNumber: 'DL-04-GH-3456',
      name: 'Pickup-03',
      type: 'Pickup',
      capacityKg: 300,
      odometerKm: 67000,
      acquisitionCost: 600000,
      status: 'Available',
    },
  });
  console.log('  ✓ Vehicles (4)');

  // ── Drivers ───────────────────────────────────────────────────────────────
  // Schema fields: name, licenseNumber, licenseCategory,
  //   licenseExpiryDate, contact, tripCompletionPct, status
  const now = new Date();
  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const alex = await prisma.driver.create({
    data: {
      name: 'Alex Kumar',
      licenseNumber: 'MH-001-2021-0001',
      licenseCategory: 'C',
      licenseExpiryDate: nextYear,
      contact: '+91-9876543210',
      tripCompletionPct: 96,
      status: 'Available',
    },
  });
  const sonia = await prisma.driver.create({
    data: {
      name: 'Sonia Verma',
      licenseNumber: 'MH-002-2020-0045',
      licenseCategory: 'D',
      licenseExpiryDate: nextYear,
      contact: '+91-9876543211',
      tripCompletionPct: 88,
      status: 'OnTrip',  // matches Truck-12's dispatched trip below
    },
  });
  await prisma.driver.create({
    data: {
      name: 'Rahul Das',
      licenseNumber: 'KA-003-2019-0112',
      licenseCategory: 'B',
      licenseExpiryDate: lastYear,  // EXPIRED — blocked from dispatch
      contact: '+91-9876543212',
      tripCompletionPct: 72,
      status: 'OffDuty',
    },
  });
  await prisma.driver.create({
    data: {
      name: 'Meena Pillai',
      licenseNumber: 'DL-004-2022-0078',
      licenseCategory: 'C',
      licenseExpiryDate: nextYear,
      contact: '+91-9876543213',
      tripCompletionPct: 91,
      status: 'Suspended',  // blocked from dispatch
    },
  });
  console.log('  ✓ Drivers (4)');

  // ── Trips ─────────────────────────────────────────────────────────────────
  // Schema fields: source, destination, vehicleId, driverId,
  //   cargoWeightKg, plannedDistanceKm, finalOdometerKm, fuelConsumedLiters,
  //   fuelCost, status
  const trip1 = await prisma.trip.create({
    data: {
      source: 'Mumbai',
      destination: 'Pune',
      vehicleId: van05.id,
      driverId: alex.id,
      cargoWeightKg: 450,
      plannedDistanceKm: 148,
      finalOdometerKm: 12248,
      fuelConsumedLiters: 18.5,
      fuelCost: 2035,
      status: 'Completed',
      createdAt: new Date(now.getTime() - 3 * 86400000),
    },
  });
  const trip2 = await prisma.trip.create({
    data: {
      source: 'Pune',
      destination: 'Nashik',
      vehicleId: pickup03.id,
      driverId: alex.id,
      cargoWeightKg: 180,
      plannedDistanceKm: 212,
      finalOdometerKm: 66912,
      fuelConsumedLiters: 24.0,
      fuelCost: 2640,
      status: 'Completed',
      createdAt: new Date(now.getTime() - 10 * 86400000),
    },
  });
  const trip3 = await prisma.trip.create({
    data: {
      source: 'Delhi',
      destination: 'Jaipur',
      vehicleId: truck12.id,
      driverId: sonia.id,
      cargoWeightKg: 1800,
      plannedDistanceKm: 280,
      status: 'Dispatched',
      createdAt: new Date(now.getTime() - 4 * 3600000),
    },
  });
  await prisma.trip.create({
    data: {
      source: 'Mumbai',
      destination: 'Aurangabad',
      vehicleId: van05.id,
      driverId: alex.id,
      cargoWeightKg: 300,
      plannedDistanceKm: 335,
      status: 'Draft',
      createdAt: new Date(now.getTime() - 30 * 60000),
    },
  });
  await prisma.trip.create({
    data: {
      source: 'Bangalore',
      destination: 'Chennai',
      vehicleId: pickup03.id,
      driverId: alex.id,
      cargoWeightKg: 250,
      plannedDistanceKm: 347,
      status: 'Cancelled',
      createdAt: new Date(now.getTime() - 5 * 86400000),
    },
  });
  console.log('  ✓ Trips (5)');

  // ── Maintenance ───────────────────────────────────────────────────────────
  // Prisma model: maintenanceLog
  // Schema fields: vehicleId, serviceType, cost, date, status
  await prisma.maintenanceLog.create({
    data: {
      vehicleId: mini08.id,
      serviceType: 'Engine Overhaul',
      cost: 45000,
      date: new Date(now.getTime() - 1 * 86400000),
      status: 'Active',  // keeps Mini-08 InShop
    },
  });
  const maintVan05 = await prisma.maintenanceLog.create({
    data: {
      vehicleId: van05.id,
      serviceType: 'Oil Change + Brake Inspection',
      cost: 8500,
      date: new Date(now.getTime() - 15 * 86400000),
      status: 'Closed',
    },
  });
  const maintPickup03 = await prisma.maintenanceLog.create({
    data: {
      vehicleId: pickup03.id,
      serviceType: 'Tyre Replacement',
      cost: 12000,
      date: new Date(now.getTime() - 30 * 86400000),
      status: 'Closed',
    },
  });
  console.log('  ✓ Maintenance (3)');

  // ── Fuel Logs ─────────────────────────────────────────────────────────────
  // Schema fields: vehicleId, tripId, date, liters, fuelCost
  await prisma.fuelLog.createMany({
    data: [
      {
        vehicleId: van05.id,
        tripId: trip1.id,
        date: new Date(now.getTime() - 3 * 86400000),
        liters: 18.5,
        fuelCost: 2035,
      },
      {
        vehicleId: pickup03.id,
        tripId: trip2.id,
        date: new Date(now.getTime() - 10 * 86400000),
        liters: 24.0,
        fuelCost: 2640,
      },
      {
        vehicleId: truck12.id,
        tripId: null,   // standalone refuel
        date: new Date(now.getTime() - 5 * 86400000),
        liters: 120.0,
        fuelCost: 13200,
      },
      {
        vehicleId: truck12.id,
        tripId: trip3.id,
        date: new Date(now.getTime() - 2 * 3600000),
        liters: 45.0,
        fuelCost: 4950,
      },
    ],
  });
  console.log('  ✓ Fuel logs (4)');

  // ── Expenses ──────────────────────────────────────────────────────────────
  // Schema fields: tripId, vehicleId, toll, other, maintenanceCost,
  //   maintenanceLogId, total, status
  await prisma.expense.createMany({
    data: [
      {
        tripId: trip1.id,
        vehicleId: van05.id,
        toll: 320,
        other: 150,
        maintenanceCost: maintVan05.cost,
        maintenanceLogId: maintVan05.id,
        total: 320 + 150 + maintVan05.cost,
        status: 'Settled',
      },
      {
        tripId: trip2.id,
        vehicleId: pickup03.id,
        toll: 480,
        other: 200,
        maintenanceCost: maintPickup03.cost,
        maintenanceLogId: maintPickup03.id,
        total: 480 + 200 + maintPickup03.cost,
        status: 'Settled',
      },
      {
        tripId: trip3.id,
        vehicleId: truck12.id,
        toll: 750,
        other: 500,
        maintenanceCost: 0,
        maintenanceLogId: null,
        total: 750 + 500,
        status: 'Pending',
      },
    ],
  });
  console.log('  ✓ Expenses (3)');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!\n');
  console.log('Demo credentials (password: password123):');
  console.log('  fleet@transitops.in     → select "Fleet Manager" at login');
  console.log('  dispatch@transitops.in  → select "Dispatcher" at login');
  console.log('  safety@transitops.in    → select "Safety Officer" at login');
  console.log('  finance@transitops.in   → select "Financial Analyst" at login');
  console.log('\nEdge cases for demo:');
  console.log('  Rahul Das    — EXPIRED license (blocked from dispatch)');
  console.log('  Meena Pillai — Suspended status (blocked from dispatch)');
  console.log('  Mini-08      — InShop with open maintenance (hidden from dispatch pool)\n');
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
