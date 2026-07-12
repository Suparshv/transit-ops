import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Users, Activity, Clock, Gauge, AlertCircle } from 'lucide-react';
import { KpiCard } from '../components/shared/KpiCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { DataTable } from '../components/shared/DataTable';
import {
  apiGetTrips, apiGetVehicles, apiGetDrivers,
  type Trip, type Vehicle, type Driver,
} from '../api';

const VEHICLE_TYPES  = ['All', 'Van', 'Truck', 'Bus', 'Bike'];
const VEHICLE_STATUSES = ['All', 'Available', 'On Trip', 'In Shop', 'Retired'];
const REGIONS = ['All', 'Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Ahmedabad', 'Kolkata'];

const STATUS_BAR_CONFIG = [
  { key: 'Available', color: 'bg-green-500' },
  { key: 'On Trip',   color: 'bg-blue-500'  },
  { key: 'In Shop',   color: 'bg-orange-500' },
  { key: 'Retired',   color: 'bg-red-500'   },
] as const;

export default function Dashboard() {
  const [trips, setTrips]         = useState<Trip[]>([]);
  const [vehicles, setVehicles]   = useState<Vehicle[]>([]);
  const [drivers, setDrivers]     = useState<Driver[]>([]);

  const [filterType,   setFilterType]   = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRegion, setFilterRegion] = useState('All');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [tripRes, vehRes, drvRes] = await Promise.all([
        apiGetTrips(),
        apiGetVehicles(),
        apiGetDrivers(),
      ]);
      if (tripRes.success && tripRes.data) setTrips(tripRes.data);
      if (vehRes.success && vehRes.data) setVehicles(vehRes.data);
      if (drvRes.success && drvRes.data) setDrivers(drvRes.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filteredVehicles = useMemo(() => vehicles.filter(v => {
    if (filterType   !== 'All' && v.type   !== filterType)   return false;
    if (filterStatus !== 'All' && v.status !== filterStatus) return false;
    if (filterRegion !== 'All' && v.region !== filterRegion) return false;
    return true;
  }), [vehicles, filterType, filterStatus, filterRegion]);

  const filteredVehicleIds = useMemo(
    () => new Set(filteredVehicles.map(v => v.id)),
    [filteredVehicles],
  );

  const kpis = useMemo(() => {
    const activeVehicles  = filteredVehicles.filter(v => v.status !== 'Retired');
    const available       = filteredVehicles.filter(v => v.status === 'Available');
    const onTrip          = filteredVehicles.filter(v => v.status === 'On Trip');
    const inMaintenance   = filteredVehicles.filter(v => v.status === 'In Shop');
    const filteredTrips   = trips.filter(t => filteredVehicleIds.has(t.vehicleId));
    const activeTrips     = filteredTrips.filter(t => t.status === 'Dispatched');
    const pendingTrips    = filteredTrips.filter(t => t.status === 'Draft');
    const driversOnDuty   = drivers.filter(d => {
      if (d.status !== 'On Trip') return false;
      const trip = trips.find(t => t.driverId === d.id && t.status === 'Dispatched');
      return trip ? filteredVehicleIds.has(trip.vehicleId) : false;
    }).length;
    const utilization = activeVehicles.length > 0
      ? Math.round((onTrip.length / activeVehicles.length) * 100)
      : 0;

    return {
      activeVehicles:     activeVehicles.length,
      availableVehicles:  available.length,
      vehiclesInMaint:    inMaintenance.length,
      activeTrips:        activeTrips.length,
      pendingTrips:       pendingTrips.length,
      driversOnDuty,
      fleetUtilization:   utilization,
      vehicleStatusBreakdown: {
        Available: available.length,
        'On Trip': onTrip.length,
        'In Shop': inMaintenance.length,
        Retired:   filteredVehicles.filter(v => v.status === 'Retired').length,
      },
    };
  }, [filteredVehicles, filteredVehicleIds, trips, drivers]);

  const recentTrips = useMemo(() => trips
    .filter(t => filteredVehicleIds.has(t.vehicleId))
    .filter(t => ['Dispatched', 'Draft', 'Completed'].includes(t.status))
    .slice(-10)
    .reverse(),
  [trips, filteredVehicleIds]);

  const vehName = (id: string) => vehicles.find(v => v.id === id)?.name ?? id;
  const drvName = (id: string) => drivers.find(d => d.id === id)?.name ?? id;

  const totalVehicles = Object.values(kpis.vehicleStatusBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-text">Dashboard</h1>
          <p className="text-xs text-base-muted mt-0.5">Fleet overview and live operations summary</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Type',   value: filterType,   set: setFilterType,   opts: VEHICLE_TYPES },
            { label: 'Status', value: filterStatus, set: setFilterStatus, opts: VEHICLE_STATUSES },
            { label: 'Region', value: filterRegion, set: setFilterRegion, opts: REGIONS },
          ].map(f => (
            <select
              key={f.label}
              value={f.value}
              onChange={e => f.set(e.target.value)}
              className="bg-base-card border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-base-text outline-none focus:border-accent/40 cursor-pointer"
              aria-label={`Filter by ${f.label}`}
            >
              {f.opts.map(o => (
                <option key={o} value={o} style={{ background: '#18181d' }}>
                  {o === 'All' ? `${f.label}: All` : o}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.06]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
          <KpiCard label="Active Vehicles"    value={kpis.activeVehicles}    borderColor="blue"   icon={<Truck size={20} />} />
          <KpiCard label="Available Vehicles" value={kpis.availableVehicles} borderColor="green"  icon={<Truck size={20} />} />
          <KpiCard label="In Maintenance"     value={kpis.vehiclesInMaint}   borderColor="orange" icon={<AlertCircle size={20} />} />
          <KpiCard label="Active Trips"       value={kpis.activeTrips}       borderColor="blue"   icon={<Activity size={20} />} />
          <KpiCard label="Pending Trips"      value={kpis.pendingTrips}      borderColor="amber"  icon={<Clock size={20} />} />
          <KpiCard label="Drivers on Duty"    value={kpis.driversOnDuty}     borderColor="green"  icon={<Users size={20} />} />
          <KpiCard label="Fleet Utilization"  value={kpis.fleetUtilization}  borderColor="amber"  suffix="%" icon={<Gauge size={20} />}
            sublabel={`${kpis.activeVehicles} active vehicles`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="section-header m-0">Recent Trips</div>
              <Link to="/trips" className="text-xs text-accent hover:text-accent-light transition-colors">View all →</Link>
            </div>
            <DataTable
              columns={[
                { key: 'id',      label: 'Trip ID', render: t => <span className="font-mono text-xs text-accent">{t.id}</span> },
                { key: 'vehicle', label: 'Vehicle', render: t => <span className="text-xs">{vehName(t.vehicleId)}</span> },
                { key: 'driver',  label: 'Driver',  render: t => <span className="text-xs">{drvName(t.driverId)}</span> },
                { key: 'status',  label: 'Status',  render: t => <StatusBadge status={t.status} /> },
                { key: 'eta',     label: 'ETA',     render: t => <span className="text-xs">{t.eta}</span> },
              ]}
              data={recentTrips}
              emptyMessage="No recent trips found."
            />
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="card h-full">
            <div className="section-header mb-4">Vehicle Status</div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 rounded bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {STATUS_BAR_CONFIG.map(({ key, color }) => {
                  const count = kpis.vehicleStatusBreakdown[key] ?? 0;
                  const pct = totalVehicles > 0 ? Math.round((count / totalVehicles) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                          <span className="text-xs text-base-muted">{key}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-base-text tabular-nums">{count}</span>
                          <span className="text-[10px] text-base-muted w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <div className="flex justify-between text-xs">
                    <span className="text-base-muted">Total fleet size</span>
                    <span className="font-bold text-base-text">{totalVehicles} vehicles</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
