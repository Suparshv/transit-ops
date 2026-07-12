// api/index.ts
// Real API client — all functions call the Express backend via fetch().
// Response shape: { success: boolean, data: T | null, error: string | null }
// All protected routes include the JWT as "Authorization: Bearer <token>".
// Token is stored in localStorage under the key "transitops:token".

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000';
const TOKEN_KEY = 'transitops:token';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VehicleStatus = 'Available' | 'OnTrip' | 'InShop' | 'Retired';
export type DriverStatus  = 'Available' | 'OnTrip' | 'OffDuty' | 'Suspended';
export type TripStatus    = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';

export interface Vehicle {
  id: number;
  registrationNumber: string;
  name: string;
  type: 'Van' | 'Truck' | 'Bus' | 'Bike';
  capacityKg: number;
  odometerKm: number;
  acquisitionCost: number;
  status: VehicleStatus;
}

export interface Driver {
  id: number;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contact: string;
  tripCompletionPct: number;
  status: DriverStatus;
}

export interface Trip {
  id: number;
  source: string;
  destination: string;
  vehicleId: number;
  driverId: number;
  cargoWeightKg: number;
  plannedDistanceKm: number;
  status: TripStatus;
  note?: string;
  createdAt: string;
}

export interface MaintenanceRecord {
  id: number;
  vehicleId: number;
  serviceType: string;
  cost: number;
  date: string;
  status: 'Active' | 'Completed';
}

export interface FuelLog {
  id: number;
  vehicleId: number;
  date: string;
  liters: number;
  fuelCost: number;
}

export interface Expense {
  id: number;
  tripId: number;
  vehicleId: number;
  toll: number;
  other: number;
  maintenanceCost: number;
  total: number;
  status: 'Pending' | 'Approved' | 'Rejected';
}

// ─── Response wrapper ─────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

const clientFail = <T>(error: string): ApiResponse<T> => ({
  success: false,
  data: null,
  error,
});

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (auth) {
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    const json = await res.json();

    // Backend always returns { success, data, error }
    if (typeof json.success === 'boolean') {
      return json as ApiResponse<T>;
    }

    // Unexpected shape — treat as error
    return clientFail<T>(`Unexpected response from server (HTTP ${res.status})`);
  } catch (err) {
    return clientFail<T>(
      err instanceof Error ? err.message : 'Network error — is the backend running?',
    );
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string, role: string) {
  const res = await apiFetch<{ token: string; user: { id: number; email: string; role: string } }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    },
    false, // no auth header needed for login
  );

  if (res.success && res.data?.token) {
    setToken(res.data.token);
  }

  return res;
}

export async function apiForgotPassword(email: string) {
  return apiFetch<null>(
    '/api/auth/forgot-password',
    { method: 'POST', body: JSON.stringify({ email }) },
    false,
  );
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export async function apiGetVehicles() {
  return apiFetch<Vehicle[]>('/api/vehicles');
}

export async function apiGetAvailableVehicles() {
  const res = await apiFetch<Vehicle[]>('/api/vehicles');
  if (!res.success || !res.data) return res;
  return { ...res, data: res.data.filter(v => v.status === 'Available') };
}

export async function apiCreateVehicle(data: Omit<Vehicle, 'id'>) {
  return apiFetch<Vehicle>('/api/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateVehicle(id: number | string, updates: Partial<Vehicle>) {
  return apiFetch<Vehicle>(`/api/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function apiDeleteVehicle(id: number | string) {
  return apiFetch<{ id: number }>(`/api/vehicles/${id}`, { method: 'DELETE' });
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export async function apiGetDrivers() {
  return apiFetch<Driver[]>('/api/drivers');
}

export async function apiGetAvailableDrivers() {
  const res = await apiFetch<Driver[]>('/api/drivers');
  if (!res.success || !res.data) return res;
  const today = new Date().toISOString().split('T')[0];
  return {
    ...res,
    data: res.data.filter(
      d => d.status === 'Available' && d.licenseExpiryDate >= today,
    ),
  };
}

export async function apiCreateDriver(data: Omit<Driver, 'id'>) {
  return apiFetch<Driver>('/api/drivers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateDriver(id: number | string, updates: Partial<Driver>) {
  return apiFetch<Driver>(`/api/drivers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function apiDeleteDriver(id: number | string) {
  return apiFetch<{ id: number }>(`/api/drivers/${id}`, { method: 'DELETE' });
}

export async function apiToggleDriverStatus(id: number | string, status: DriverStatus) {
  return apiUpdateDriver(id, { status });
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export async function apiGetTrips() {
  return apiFetch<Trip[]>('/api/trips');
}

export async function apiCreateTrip(
  data: Omit<Trip, 'id' | 'status' | 'createdAt'>,
) {
  return apiFetch<Trip>('/api/trips', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiDispatchTrip(id: number | string) {
  return apiFetch<Trip>(`/api/trips/${id}/dispatch`, { method: 'PATCH' });
}

export async function apiCompleteTrip(
  id: number | string,
  finalOdometer: number,
  litersConsumed: number,
) {
  return apiFetch<Trip>(`/api/trips/${id}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({ finalOdometerKm: finalOdometer, fuelConsumedLiters: litersConsumed }),
  });
}

export async function apiCancelTrip(id: number | string) {
  return apiFetch<Trip>(`/api/trips/${id}/cancel`, { method: 'PATCH' });
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export async function apiGetMaintenance() {
  return apiFetch<MaintenanceRecord[]>('/api/maintenance');
}

export async function apiCreateMaintenance(data: Omit<MaintenanceRecord, 'id' | 'status'>) {
  return apiFetch<MaintenanceRecord>('/api/maintenance', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiCloseMaintenance(id: number | string) {
  return apiFetch<MaintenanceRecord>(`/api/maintenance/${id}/close`, {
    method: 'PATCH',
  });
}

// ─── Fuel Logs ────────────────────────────────────────────────────────────────

export async function apiGetFuelLogs() {
  return apiFetch<FuelLog[]>('/api/fuel-logs');
}

export async function apiCreateFuelLog(data: Omit<FuelLog, 'id'>) {
  return apiFetch<FuelLog>('/api/fuel-logs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function apiGetExpenses() {
  return apiFetch<Expense[]>('/api/expenses');
}

export async function apiCreateExpense(data: Omit<Expense, 'id' | 'total'>) {
  return apiFetch<Expense>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Reports / Dashboard KPIs ─────────────────────────────────────────────────

export async function apiGetDashboardKpis() {
  return apiFetch<{
    kpis: {
      activeVehicles: number;
      availableVehicles: number;
      vehiclesInMaintenance: number;
      activeTrips: number;
      pendingTrips: number;
      driversOnDuty: number;
      fleetUtilizationPct: number;
    };
    vehicleStatusBreakdown: {
      available: number;
      onTrip: number;
      inShop: number;
      retired: number;
    };
    recentTrips: Array<{
      id: number;
      source: string;
      destination: string;
      vehicleName: string;
      vehicleRegistrationNumber: string;
      driverName: string;
      status: string;
      eta: string | null;
    }>;
  }>('/api/reports/dashboard');
}

export async function apiGetAnalyticsKpis() {
  // Fan out to the four analytics endpoints in parallel
  const [roiRes, costliestRes, revenueRes, utilizationRes] = await Promise.all([
    apiFetch<{
      summary: {
        totalRevenue: number;
        totalOperationalCost: number;
        avgFuelEfficiencyKmL: number | null;
      };
      perVehicle: Array<{
        vehicleId: number;
        name: string;
        type: string;
        revenue: number;
        operationalCost: number;
        roi: number;
        fuelEfficiencyKmL: number | null;
      }>;
    }>('/api/reports/roi'),
    apiFetch<Array<{
      vehicleId: number;
      registrationNumber: string;
      name: string;
      type: string;
      fuelCost: number;
      maintenanceCost: number;
      totalOperationalCost: number;
    }>>('/api/reports/top-costliest'),
    apiFetch<Array<{ label: string; revenue: number }>>(
      '/api/reports/monthly-revenue',
    ),
    apiFetch<{ fleetUtilizationPct: number }>(
      '/api/reports/utilization',
    ),
  ]);

  // If any critical endpoint failed, surface the first error
  if (!roiRes.success) return roiRes as any;
  if (!costliestRes.success) return costliestRes as any;
  if (!revenueRes.success) return revenueRes as any;

  const summary     = roiRes.data!.summary;
  const costliest   = costliestRes.data!;
  const monthly     = revenueRes.data!;
  const utilization = utilizationRes.success ? utilizationRes.data!.fleetUtilizationPct : 0;

  // Compute average ROI across all vehicles
  const perVehicle = roiRes.data!.perVehicle;
  const avgRoi =
    perVehicle.length > 0
      ? Math.round(perVehicle.reduce((s, v) => s + v.roi, 0) / perVehicle.length)
      : 0;

  return {
    success: true,
    error: null,
    data: {
      fuelEfficiency:   summary.avgFuelEfficiencyKmL ?? 0,
      fleetUtilization: utilization,
      operationalCost:  summary.totalOperationalCost,
      vehicleRoi:       avgRoi,
      // Top 5 costliest — shape adapted to what Analytics.tsx expects
      topCostliest: costliest.map(v => ({
        vehicle:   { name: v.name },
        totalCost: v.totalOperationalCost,
      })),
      // Monthly revenue — backend returns { label, revenue }; chart uses { month, revenue }
      monthlyRevenue: monthly.map(m => ({ month: m.label, revenue: m.revenue })),
    },
  };
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function apiGetSettings() {
  return apiFetch<{ depotName: string; currency: string; distanceUnit: string }>(
    '/api/settings',
  );
}

export async function apiUpdateSettings(data: {
  depotName?: string;
  currency?: string;
  distanceUnit?: string;
}) {
  return apiFetch<{ depotName: string; currency: string; distanceUnit: string }>(
    '/api/settings',
    { method: 'PATCH', body: JSON.stringify(data) },
  );
}
