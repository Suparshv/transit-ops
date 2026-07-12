export const VehicleStatus = {
  Available: 'Available',
  OnTrip: 'OnTrip',
  InShop: 'InShop',
  Retired: 'Retired',
} as const;

export const DriverStatus = {
  Available: 'Available',
  OnTrip: 'OnTrip',
  OffDuty: 'OffDuty',
  Suspended: 'Suspended',
} as const;

export const TripStatus = {
  Draft: 'Draft',
  Dispatched: 'Dispatched',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
} as const;

export const MaintenanceStatus = {
  Active: 'Active',
  Closed: 'Closed',
} as const;

export const ExpenseStatus = {
  Pending: 'Pending',
  Settled: 'Settled',
} as const;
