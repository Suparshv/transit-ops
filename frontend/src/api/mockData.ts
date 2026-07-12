// mockData.ts
// Seed data for demo. Structure mirrors what the real API will return.

export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';
export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';
export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
export type MaintenanceStatus = 'Active' | 'Completed';

export interface Vehicle {
  id: string;
  regNo: string;
  name: string;
  type: 'Van' | 'Truck' | 'Bus' | 'Bike';
  capacity: number;    // kg max load
  odometer: number;    // km
  acqCost: number;     // INR
  status: VehicleStatus;
  region: string;
}

export interface Driver {
  id: string;
  name: string;
  licenseNo: string;
  category: string;
  licenseExpiry: string; // ISO date string e.g. "2025-03-01"
  contact: string;
  tripCompletionPct: number;
  safetyRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  status: DriverStatus;
}

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;   // kg
  plannedDistance: number; // km
  status: TripStatus;
  eta: string;           // readable ETA string
  note?: string;
  createdAt: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  serviceType: string;
  cost: number;
  date: string;
  status: MaintenanceStatus;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  liters: number;
  fuelCost: number;
}

export interface Expense {
  id: string;
  tripId: string;
  vehicleId: string;
  toll: number;
  other: number;
  maintenanceCost: number; // linked maintenance cost
  total: number;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // plaintext for demo
  avatar: string;   // initials e.g. "RK"
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

export const USERS: User[] = [
  { id: 'u1', name: 'Raven K.',    email: 'dispatcher@transitops.in',  password: 'password123', avatar: 'RK' },
  { id: 'u2', name: 'Maya S.',     email: 'manager@transitops.in',     password: 'password123', avatar: 'MS' },
  { id: 'u3', name: 'Dev P.',      email: 'safety@transitops.in',      password: 'password123', avatar: 'DP' },
  { id: 'u4', name: 'Lena F.',     email: 'analyst@transitops.in',     password: 'password123', avatar: 'LF' },
];

export const ROLE_BY_EMAIL: Record<string, string> = {
  'dispatcher@transitops.in':  'Dispatcher',
  'manager@transitops.in':     'Fleet Manager',
  'safety@transitops.in':      'Safety Officer',
  'analyst@transitops.in':     'Financial Analyst',
};

export const INITIAL_VEHICLES: Vehicle[] = [
  { id: 'v1', regNo: 'MH12-AB-1234', name: 'Van-01',   type: 'Van',   capacity: 500,  odometer: 45200, acqCost: 850000,  status: 'Available', region: 'Mumbai'  },
  { id: 'v2', regNo: 'MH12-CD-5678', name: 'Truck-01', type: 'Truck', capacity: 5000, odometer: 123000,acqCost: 2500000, status: 'On Trip',   region: 'Pune'    },
  { id: 'v3', regNo: 'DL03-EF-9012', name: 'Van-02',   type: 'Van',   capacity: 400,  odometer: 88000, acqCost: 780000,  status: 'In Shop',   region: 'Delhi'   },
  { id: 'v4', regNo: 'KA01-GH-3456', name: 'Bus-01',   type: 'Bus',   capacity: 3000, odometer: 200000,acqCost: 4200000, status: 'Retired',   region: 'Bangalore'},
  { id: 'v5', regNo: 'MH04-IJ-7890', name: 'Van-03',   type: 'Van',   capacity: 600,  odometer: 12000, acqCost: 900000,  status: 'Available', region: 'Mumbai'  },
  { id: 'v6', regNo: 'GJ01-KL-2345', name: 'Truck-02', type: 'Truck', capacity: 8000, odometer: 56000, acqCost: 3100000, status: 'Available', region: 'Ahmedabad'},
];

export const INITIAL_DRIVERS: Driver[] = [
  { id: 'd1', name: 'Alex T.',   licenseNo: 'MH-1234567', category: 'LMV',  licenseExpiry: '2027-05-01', contact: '+91-9876543210', tripCompletionPct: 98, safetyRating: 'Excellent', status: 'Available' },
  { id: 'd2', name: 'Priya M.', licenseNo: 'MH-7654321', category: 'HMV',  licenseExpiry: '2026-11-15', contact: '+91-9123456789', tripCompletionPct: 92, safetyRating: 'Good',      status: 'On Trip'   },
  { id: 'd3', name: 'Rajan V.', licenseNo: 'DL-2345678', category: 'HMV',  licenseExpiry: '2025-03-01', contact: '+91-9234567890', tripCompletionPct: 85, safetyRating: 'Fair',      status: 'Off Duty'  },
  { id: 'd4', name: 'Suresh K.',licenseNo: 'KA-3456789', category: 'TRANS',licenseExpiry: '2028-08-20', contact: '+91-9345678901', tripCompletionPct: 100,safetyRating: 'Excellent', status: 'Available' },
  { id: 'd5', name: 'Meera D.', licenseNo: 'GJ-4567890', category: 'LMV',  licenseExpiry: '2024-12-01', contact: '+91-9456789012', tripCompletionPct: 78, safetyRating: 'Poor',      status: 'Suspended' },
];

export const INITIAL_TRIPS: Trip[] = [
  { id: 'TRP-001', source: 'Mumbai',   destination: 'Pune',      vehicleId: 'v2', driverId: 'd2', cargoWeight: 2000, plannedDistance: 148, status: 'Dispatched', eta: '3:45 PM', note: 'On route', createdAt: '2026-07-12T06:00:00Z' },
  { id: 'TRP-002', source: 'Delhi',    destination: 'Agra',      vehicleId: 'v1', driverId: 'd1', cargoWeight: 300,  plannedDistance: 205, status: 'Completed',  eta: 'Arrived', note: '',          createdAt: '2026-07-11T09:00:00Z' },
  { id: 'TRP-003', source: 'Bangalore',destination: 'Chennai',   vehicleId: 'v5', driverId: 'd4', cargoWeight: 450,  plannedDistance: 347, status: 'Draft',      eta: 'Pending', note: 'Awaiting dispatch', createdAt: '2026-07-12T08:00:00Z' },
  { id: 'TRP-004', source: 'Ahmedabad',destination: 'Surat',     vehicleId: 'v6', driverId: 'd1', cargoWeight: 5000, plannedDistance: 265, status: 'Cancelled',  eta: '—',       note: 'Customer cancelled', createdAt: '2026-07-10T12:00:00Z' },
  { id: 'TRP-005', source: 'Mumbai',   destination: 'Nasik',     vehicleId: 'v1', driverId: 'd4', cargoWeight: 400,  plannedDistance: 170, status: 'Completed',  eta: 'Arrived', note: '',          createdAt: '2026-07-11T14:00:00Z' },
];

export const INITIAL_MAINTENANCE: MaintenanceRecord[] = [
  { id: 'm1', vehicleId: 'v3', serviceType: 'Engine Overhaul',  cost: 45000, date: '2026-07-10', status: 'Active'    },
  { id: 'm2', vehicleId: 'v1', serviceType: 'Oil Change',       cost: 3500,  date: '2026-07-05', status: 'Completed' },
  { id: 'm3', vehicleId: 'v2', serviceType: 'Tyre Replacement', cost: 28000, date: '2026-06-28', status: 'Completed' },
  { id: 'm4', vehicleId: 'v4', serviceType: 'Full Service',     cost: 75000, date: '2026-05-15', status: 'Completed' },
];

export const INITIAL_FUEL_LOGS: FuelLog[] = [
  { id: 'f1', vehicleId: 'v1', date: '2026-07-11', liters: 40,  fuelCost: 4000  },
  { id: 'f2', vehicleId: 'v2', date: '2026-07-12', liters: 120, fuelCost: 12000 },
  { id: 'f3', vehicleId: 'v5', date: '2026-07-10', liters: 35,  fuelCost: 3500  },
  { id: 'f4', vehicleId: 'v6', date: '2026-07-09', liters: 200, fuelCost: 20000 },
  { id: 'f5', vehicleId: 'v1', date: '2026-07-08', liters: 38,  fuelCost: 3800  },
];

export const INITIAL_EXPENSES: Expense[] = [
  { id: 'e1', tripId: 'TRP-001', vehicleId: 'v2', toll: 350,  other: 200, maintenanceCost: 28000, total: 28550, status: 'Approved' },
  { id: 'e2', tripId: 'TRP-002', vehicleId: 'v1', toll: 180,  other: 100, maintenanceCost: 3500,  total:  3780, status: 'Approved' },
  { id: 'e3', tripId: 'TRP-003', vehicleId: 'v5', toll: 0,    other: 0,   maintenanceCost: 0,     total:     0, status: 'Pending'  },
  { id: 'e4', tripId: 'TRP-005', vehicleId: 'v1', toll: 220,  other: 50,  maintenanceCost: 0,     total:   270, status: 'Approved' },
];

export const INITIAL_SETTINGS = {
  depotName: 'TransitOps Mumbai HQ',
  currency: 'INR (₹)',
  distanceUnit: 'Kilometers',
};
