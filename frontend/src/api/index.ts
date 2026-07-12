// api/index.ts
// Unified API client.
// All functions return { success, data, error } matching the backend response wrapper (CLAUDE.md Section 7).
// To connect to the real Express backend: replace the mock implementations below
// with fetch() calls to the endpoint URLs — the callers (pages/components) never change.

import { cacheGet, cacheSet } from '../lib/offlineCache';
import {
  INITIAL_VEHICLES, INITIAL_DRIVERS, INITIAL_TRIPS,
  INITIAL_MAINTENANCE, INITIAL_FUEL_LOGS, INITIAL_EXPENSES, INITIAL_SETTINGS,
  type Vehicle, type Driver, type Trip, type MaintenanceRecord,
  type FuelLog, type Expense, type VehicleStatus, type DriverStatus, type TripStatus,
} from './mockData';

// ─── Response wrapper ─────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}
const ok = <T>(data: T): ApiResponse<T> => ({ success: true, data, error: null });
const fail = <T>(error: string): ApiResponse<T> => ({ success: false, data: null, error });

/** Simulated async latency */
const delay = (ms = 120) => new Promise(r => setTimeout(r, ms));

// ─── LocalStorage-backed store ────────────────────────────────────────────────

function getStore<T>(key: string, seed: T): T {
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;
  cacheSet(key, seed);
  return seed;
}
function setStore<T>(key: string, value: T): void {
  cacheSet(key, value);
}

function getVehicles(): Vehicle[]           { return getStore('vehicles', INITIAL_VEHICLES); }
function getDrivers(): Driver[]             { return getStore('drivers', INITIAL_DRIVERS); }
function getTrips(): Trip[]                 { return getStore('trips', INITIAL_TRIPS); }
function getMaintenance(): MaintenanceRecord[] { return getStore('maintenance', INITIAL_MAINTENANCE); }
function getFuelLogs(): FuelLog[]           { return getStore('fuelLogs', INITIAL_FUEL_LOGS); }
function getExpenses(): Expense[]           { return getStore('expenses', INITIAL_EXPENSES); }
function getSettings()                      { return getStore('settings', INITIAL_SETTINGS); }

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export async function apiGetVehicles() {
  await delay();
  return ok(getVehicles());
}

export async function apiCreateVehicle(data: Omit<Vehicle, 'id'>) {
  await delay();
  const vehicles = getVehicles();
  if (vehicles.some(v => v.regNo === data.regNo)) {
    return fail<Vehicle>('Registration number must be unique.');
  }
  const vehicle: Vehicle = { ...data, id: 'v' + Date.now() };
  const updated = [...vehicles, vehicle];
  setStore('vehicles', updated);
  return ok(vehicle);
}

export async function apiUpdateVehicle(id: string, updates: Partial<Vehicle>) {
  await delay();
  const vehicles = getVehicles();
  const idx = vehicles.findIndex(v => v.id === id);
  if (idx === -1) return fail<Vehicle>('Vehicle not found.');
  if (updates.regNo && vehicles.some(v => v.regNo === updates.regNo && v.id !== id)) {
    return fail<Vehicle>('Registration number must be unique.');
  }
  vehicles[idx] = { ...vehicles[idx], ...updates };
  setStore('vehicles', vehicles);
  return ok(vehicles[idx]);
}

export async function apiDeleteVehicle(id: string) {
  await delay();
  const vehicles = getVehicles().filter(v => v.id !== id);
  setStore('vehicles', vehicles);
  return ok({ id });
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export async function apiGetDrivers() {
  await delay();
  return ok(getDrivers());
}

export async function apiCreateDriver(data: Omit<Driver, 'id'>) {
  await delay();
  const driver: Driver = { ...data, id: 'd' + Date.now() };
  setStore('drivers', [...getDrivers(), driver]);
  return ok(driver);
}

export async function apiUpdateDriver(id: string, updates: Partial<Driver>) {
  await delay();
  const drivers = getDrivers();
  const idx = drivers.findIndex(d => d.id === id);
  if (idx === -1) return fail<Driver>('Driver not found.');
  drivers[idx] = { ...drivers[idx], ...updates };
  setStore('drivers', drivers);
  return ok(drivers[idx]);
}

export async function apiDeleteDriver(id: string) {
  await delay();
  setStore('drivers', getDrivers().filter(d => d.id !== id));
  return ok({ id });
}

export async function apiToggleDriverStatus(id: string, status: DriverStatus) {
  await delay();
  return apiUpdateDriver(id, { status });
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export async function apiGetTrips() {
  await delay();
  return ok(getTrips());
}

export async function apiCreateTrip(data: Omit<Trip, 'id' | 'status' | 'createdAt'>) {
  await delay();
  const vehicles = getVehicles();
  const vehicle = vehicles.find(v => v.id === data.vehicleId);
  if (!vehicle) return fail<Trip>('Vehicle not found.');

  // Cargo weight validation
  if (data.cargoWeight > vehicle.capacity) {
    const exceeded = data.cargoWeight - vehicle.capacity;
    return fail<Trip>(`Capacity exceeded by ${exceeded} kg — dispatch blocked. Vehicle capacity: ${vehicle.capacity} kg.`);
  }

  const trip: Trip = {
    ...data,
    id: 'TRP-' + String(Date.now()).slice(-4),
    status: 'Draft',
    createdAt: new Date().toISOString(),
  };
  setStore('trips', [...getTrips(), trip]);
  return ok(trip);
}

export async function apiDispatchTrip(id: string) {
  await delay();
  const trips = getTrips();
  const tripIdx = trips.findIndex(t => t.id === id);
  if (tripIdx === -1) return fail<Trip>('Trip not found.');
  const trip = trips[tripIdx];

  // Status engine: flip Vehicle → On Trip, Driver → On Trip
  await apiUpdateVehicle(trip.vehicleId, { status: 'On Trip' });
  await apiUpdateDriver(trip.driverId, { status: 'On Trip' });

  trips[tripIdx] = { ...trip, status: 'Dispatched', eta: '~' + Math.ceil(trip.plannedDistance / 60) + 'h' };
  setStore('trips', trips);
  return ok(trips[tripIdx]);
}

export async function apiCompleteTrip(id: string, finalOdometer: number, litersConsumed: number) {
  await delay();
  const trips = getTrips();
  const tripIdx = trips.findIndex(t => t.id === id);
  if (tripIdx === -1) return fail<Trip>('Trip not found.');
  const trip = trips[tripIdx];

  // Completion pipeline: odometer → fuel log → expenses → Vehicle & Driver Available
  // 1. Update vehicle odometer
  const vehicles = getVehicles();
  const vehicle = vehicles.find(v => v.id === trip.vehicleId);
  if (vehicle) {
    await apiUpdateVehicle(trip.vehicleId, { status: 'Available', odometer: finalOdometer });
  }
  // 2. Log fuel
  const fuelLog: FuelLog = {
    id: 'f' + Date.now(),
    vehicleId: trip.vehicleId,
    date: new Date().toISOString().split('T')[0],
    liters: litersConsumed,
    fuelCost: Math.round(litersConsumed * 100), // ~₹100/liter assumption
  };
  setStore('fuelLogs', [...getFuelLogs(), fuelLog]);
  // 3. Auto-create expense record
  const expense: Expense = {
    id: 'e' + Date.now(),
    tripId: id,
    vehicleId: trip.vehicleId,
    toll: 0,
    other: 0,
    maintenanceCost: 0,
    total: fuelLog.fuelCost,
    status: 'Pending',
  };
  setStore('expenses', [...getExpenses(), expense]);
  // 4. Free driver
  await apiUpdateDriver(trip.driverId, { status: 'Available' });

  trips[tripIdx] = { ...trip, status: 'Completed', eta: 'Arrived' };
  setStore('trips', trips);
  return ok(trips[tripIdx]);
}

export async function apiCancelTrip(id: string) {
  await delay();
  const trips = getTrips();
  const tripIdx = trips.findIndex(t => t.id === id);
  if (tripIdx === -1) return fail<Trip>('Trip not found.');
  const trip = trips[tripIdx];

  if (trip.status === 'Dispatched') {
    // Free vehicle and driver on cancel from dispatched state
    await apiUpdateVehicle(trip.vehicleId, { status: 'Available' });
    await apiUpdateDriver(trip.driverId, { status: 'Available' });
  }

  trips[tripIdx] = { ...trip, status: 'Cancelled', eta: '—' };
  setStore('trips', trips);
  return ok(trips[tripIdx]);
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export async function apiGetMaintenance() {
  await delay();
  return ok(getMaintenance());
}

export async function apiCreateMaintenance(data: Omit<MaintenanceRecord, 'id'>) {
  await delay();
  const record: MaintenanceRecord = { ...data, id: 'm' + Date.now(), status: 'Active' };
  setStore('maintenance', [...getMaintenance(), record]);
  // Status engine: opening a maintenance record → vehicle goes In Shop
  await apiUpdateVehicle(data.vehicleId, { status: 'In Shop' });
  return ok(record);
}

export async function apiCloseMaintenance(id: string) {
  await delay();
  const records = getMaintenance();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return fail<MaintenanceRecord>('Record not found.');
  const rec = records[idx];

  records[idx] = { ...rec, status: 'Completed' };
  setStore('maintenance', records);

  // Status engine: closing maintenance → vehicle goes back to Available (unless Retired)
  const vehicles = getVehicles();
  const vehicle = vehicles.find(v => v.id === rec.vehicleId);
  if (vehicle && vehicle.status !== 'Retired') {
    await apiUpdateVehicle(rec.vehicleId, { status: 'Available' });
  }
  return ok(records[idx]);
}

// ─── Fuel Logs ────────────────────────────────────────────────────────────────

export async function apiGetFuelLogs() {
  await delay();
  return ok(getFuelLogs());
}

export async function apiCreateFuelLog(data: Omit<FuelLog, 'id'>) {
  await delay();
  const log: FuelLog = { ...data, id: 'f' + Date.now() };
  setStore('fuelLogs', [...getFuelLogs(), log]);
  return ok(log);
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function apiGetExpenses() {
  await delay();
  return ok(getExpenses());
}

export async function apiCreateExpense(data: Omit<Expense, 'id' | 'total'>) {
  await delay();
  const total = data.toll + data.other + data.maintenanceCost;
  const expense: Expense = { ...data, id: 'e' + Date.now(), total };
  setStore('expenses', [...getExpenses(), expense]);
  return ok(expense);
}

// ─── Reports / Dashboard KPIs ─────────────────────────────────────────────────

export async function apiGetDashboardKpis() {
  await delay();
  const vehicles = getVehicles();
  const drivers  = getDrivers();
  const trips    = getTrips();

  const activeVehicles  = vehicles.filter(v => v.status !== 'Retired');
  const onTrip          = vehicles.filter(v => v.status === 'On Trip');
  const available       = vehicles.filter(v => v.status === 'Available');
  const inMaintenance   = vehicles.filter(v => v.status === 'In Shop');
  const activeTrips     = trips.filter(t => t.status === 'Dispatched');
  const pendingTrips    = trips.filter(t => t.status === 'Draft');
  const driversOnDuty   = drivers.filter(d => d.status === 'On Trip');
  const utilization     = activeVehicles.length > 0
    ? Math.round((onTrip.length / activeVehicles.length) * 100) : 0;

  return ok({
    activeVehicles:     activeVehicles.length,
    availableVehicles:  available.length,
    vehiclesInMaint:    inMaintenance.length,
    activeTrips:        activeTrips.length,
    pendingTrips:       pendingTrips.length,
    driversOnDuty:      driversOnDuty.length,
    fleetUtilization:   utilization,
    vehicleStatusBreakdown: {
      Available: available.length,
      'On Trip': onTrip.length,
      'In Shop': inMaintenance.length,
      Retired:   vehicles.filter(v => v.status === 'Retired').length,
    },
  });
}

export async function apiGetAnalyticsKpis() {
  await delay();
  const vehicles  = getVehicles();
  const fuelLogs  = getFuelLogs();
  const maintenance = getMaintenance();
  const trips     = getTrips();

  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.fuelCost, 0);
  const totalMaintCost = maintenance.reduce((s, m) => s + m.cost, 0);
  const totalFuelLiters = fuelLogs.reduce((s, f) => s + f.liters, 0);
  const totalDistance = trips.filter(t => t.status === 'Completed')
    .reduce((s, t) => s + t.plannedDistance, 0);
  const fuelEfficiency = totalFuelLiters > 0
    ? Math.round((totalDistance / totalFuelLiters) * 10) / 10 : 0;

  const activeVehicles = vehicles.filter(v => v.status !== 'Retired');
  const onTrip = vehicles.filter(v => v.status === 'On Trip');
  const utilization = activeVehicles.length > 0
    ? Math.round((onTrip.length / activeVehicles.length) * 100) : 0;

  // Per vehicle ROI: Revenue = completed trips * plannedDistance * ₹30/km
  const roiData = vehicles.map(v => {
    const completedTrips = trips.filter(t => t.vehicleId === v.id && t.status === 'Completed');
    const revenue = completedTrips.reduce((s, t) => s + t.plannedDistance * 30, 0);
    const vFuel = fuelLogs.filter(f => f.vehicleId === v.id).reduce((s, f) => s + f.fuelCost, 0);
    const vMaint = maintenance.filter(m => m.vehicleId === v.id).reduce((s, m) => s + m.cost, 0);
    const roi = v.acqCost > 0 ? Math.round(((revenue - (vMaint + vFuel)) / v.acqCost) * 100) : 0;
    const totalCost = vFuel + vMaint;
    return { vehicle: v, revenue, totalCost, roi };
  });

  const avgRoi = Math.round(roiData.reduce((s, r) => s + r.roi, 0) / roiData.length);
  const topCostliest = [...roiData].sort((a, b) => b.totalCost - a.totalCost).slice(0, 3);

  // Monthly revenue: group completed trips by month (last 7 months)
  const now = new Date();
  const monthlyRevenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    const label = d.toLocaleString('default', { month: 'short' });
    const revenue = trips
      .filter(t => {
        const td = new Date(t.createdAt);
        return t.status === 'Completed'
          && td.getMonth() === d.getMonth()
          && td.getFullYear() === d.getFullYear();
      })
      .reduce((s, t) => s + t.plannedDistance * 30, 0);
    return { month: label, revenue };
  });

  return ok({
    fuelEfficiency,
    fleetUtilization: utilization,
    operationalCost: totalFuelCost + totalMaintCost,
    vehicleRoi: avgRoi,
    topCostliest,
    monthlyRevenue,
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function apiGetSettings() {
  await delay();
  return ok(getSettings());
}

export async function apiUpdateSettings(data: Partial<typeof INITIAL_SETTINGS>) {
  await delay();
  const updated = { ...getSettings(), ...data };
  setStore('settings', updated);
  return ok(updated);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// NOTE: Auth state (session, lockout) is managed in AuthContext.
// When connecting to a real backend: POST /api/auth/login with { email, password, role }

export async function apiLogin(email: string, password: string) {
  await delay(300);
  const { USERS } = await import('./mockData');
  const user = USERS.find(u => u.email === email);
  if (!user) return fail<typeof user>('Invalid credentials. Please check your email and password.');
  if (user.password !== password) return fail<typeof user>('Invalid credentials. Please check your email and password.');
  return ok(user);
}

// ─── Available-only filters (for dropdowns) ───────────────────────────────────

export async function apiGetAvailableVehicles() {
  await delay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const vehicles = getVehicles().filter(v => v.status === 'Available');
  return ok(vehicles);
}

export async function apiGetAvailableDrivers() {
  await delay();
  const today = new Date().toISOString().split('T')[0];
  const drivers = getDrivers().filter(d => {
    if (d.status !== 'Available') return false;
    if (d.status === 'Suspended') return false;
    // Block expired license
    if (d.licenseExpiry < today) return false;
    return true;
  });
  return ok(drivers);
}

// Re-export types for convenience
export type { Vehicle, Driver, Trip, MaintenanceRecord, FuelLog, Expense, VehicleStatus, DriverStatus, TripStatus };
