import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '../components/shared/StatusBadge';
import { DataTable } from '../components/shared/DataTable';
import { useAuth } from '../context/AuthContext';
import {
  apiGetTrips, apiGetVehicles, apiGetDrivers,
  apiGetAvailableVehicles, apiGetAvailableDrivers,
  apiCreateTrip, apiDispatchTrip, apiCompleteTrip, apiCancelTrip,
  type Trip, type Vehicle, type Driver,
} from '../api';

type StepKey = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
const STEPS: StepKey[] = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

function Stepper({ current }: { current: StepKey }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((step, i) => {
        const isActive  = step === current;
        const isPast    = STEPS.indexOf(current) > i;
        const isCancel  = step === 'Cancelled';
        return (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isActive
                ? isCancel ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                           : 'bg-accent/20 text-accent border border-accent/30'
                : isPast
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-white/[0.03] text-base-muted'
            }`}>
              {isPast && !isActive && <CheckCircle size={12} />}
              {step}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${isPast || (isActive && i < 2) ? 'bg-accent/30' : 'bg-white/[0.06]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function CompleteTripModal({ trip, onClose, onComplete }: {
  trip: Trip; onClose: () => void; onComplete: (t: Trip) => void;
}) {
  const [odometer, setOdometer] = useState(0);
  const [liters,   setLiters]   = useState(0);
  const [saving,   setSaving]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await apiCompleteTrip(trip.id, odometer, liters);
    setSaving(false);
    if (res.success && res.data) {
      toast.success('Trip completed. Odometer, fuel log, and expenses updated. Vehicle & Driver now Available.');
      onComplete(res.data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-base-card rounded-2xl border border-white/10 p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-bold text-base-text mb-1">Complete Trip {trip.id}</h2>
        <p className="text-xs text-base-muted mb-5">
          Enter final odometer and fuel consumed to complete the pipeline: odometer → fuel log → expenses → Vehicle &amp; Driver Available.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Final Odometer (km)</label>
            <input type="number" min={0} required className="form-input" value={odometer} onChange={e => setOdometer(+e.target.value)} />
          </div>
          <div>
            <label className="form-label">Fuel Consumed (liters)</label>
            <input type="number" min={0} step="0.1" required className="form-input" value={liters} onChange={e => setLiters(+e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Completing…' : 'Complete Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TripDispatcher() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('trips', 'full');

  const [trips,        setTrips]        = useState<Trip[]>([]);
  const [availVehicles,setAvailVehicles] = useState<Vehicle[]>([]);
  const [availDrivers, setAvailDrivers]  = useState<Driver[]>([]);
  const [vehicles,     setVehicles]      = useState<Vehicle[]>([]);
  const [drivers,      setDrivers]       = useState<Driver[]>([]);
  const [loading,      setLoading]       = useState(true);
  const [completeTrip, setCompleteTrip]  = useState<Trip | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Create Trip form state
  const [form, setForm] = useState({
    source: '', destination: '', vehicleId: '', driverId: '',
    cargoWeightKg: 0, plannedDistanceKm: 0, eta: 'TBD',
  });
  const [validationError, setValidationError] = useState<{
    vehicleCapacity: number; cargoWeightKg: number; exceeded: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch all data
  const fetchAll = async () => {
    setLoading(true);
    const [tripsRes, avVeh, avDrv, vRes, dRes] = await Promise.all([
      apiGetTrips(),
      apiGetAvailableVehicles(),
      apiGetAvailableDrivers(),
      apiGetVehicles(),
      apiGetDrivers(),
    ]);
    if (tripsRes.success && tripsRes.data) setTrips(tripsRes.data);
    if (avVeh.success && avVeh.data) setAvailVehicles(avVeh.data);
    if (avDrv.success && avDrv.data) setAvailDrivers(avDrv.data);
    if (vRes.success && vRes.data) setVehicles(vRes.data);
    if (dRes.success && dRes.data) setDrivers(dRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Check cargo vs capacity on vehicle select
  const checkCapacity = (vehicleId: string, cargoWeightKg: number) => {
    if (!vehicleId || cargoWeightKg <= 0) { setValidationError(null); return; }
    const vehicle = availVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    if (cargoWeightKg > vehicle.capacityKg) {
      setValidationError({ vehicleCapacity: vehicle.capacityKg, cargoWeightKg, exceeded: cargoWeightKg - vehicle.capacityKg });
    } else {
      setValidationError(null);
    }
  };

  const handleFormChange = (field: string, value: string | number) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    if (field === 'vehicleId' || field === 'cargoWeightKg') {
      checkCapacity(
        field === 'vehicleId' ? String(value) : form.vehicleId,
        field === 'cargoWeightKg' ? Number(value) : form.cargoWeightKg,
      );
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;
    setSaving(true);
    const res = await apiCreateTrip({ ...form, note: 'Awaiting dispatch' });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? 'Failed to create trip.');
      return;
    }
    toast.success(`Trip ${res.data!.id} created as Draft.`);
    setTrips(ts => [...ts, res.data!]);
    setForm({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: 0, plannedDistance: 0, eta: 'TBD' });
    setValidationError(null);
    fetchAll(); // refresh available lists
  };

  const handleDispatch = async (tripId: string) => {
    const res = await apiDispatchTrip(tripId);
    if (res.success && res.data) {
      setTrips(ts => ts.map(t => t.id === tripId ? res.data! : t));
      toast.success(`Trip ${tripId} dispatched. Vehicle and Driver are now On Trip.`);
      fetchAll();
    }
  };

  const handleCancel = async (tripId: string) => {
    const res = await apiCancelTrip(tripId);
    if (res.success && res.data) {
      setTrips(ts => ts.map(t => t.id === tripId ? res.data! : t));
      toast.info(`Trip ${tripId} cancelled. Resources freed.`);
      fetchAll();
    }
  };

  const vehName  = (id: string) => vehicles.find(v => v.id === id)?.name ?? id;
  const drvName  = (id: string) => drivers.find(d => d.id === id)?.name ?? id;

  const liveBoard = [...trips].reverse().slice(0, 8);
  const selectedTrip = selectedTripId ? trips.find(t => t.id === selectedTripId) : null;
  const currentStep: StepKey = selectedTrip?.status ?? 'Draft';

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-base-text">Trip Dispatcher</h1>
        <p className="text-xs text-base-muted mt-0.5">Create, dispatch, and manage trips</p>
      </div>

      {/* Trip lifecycle stepper */}
      <div className="card mb-4">
        <div className="section-header mb-3">Trip Lifecycle</div>
        <Stepper current={currentStep} />
        <p className="text-xs text-base-muted">
          Trips progress from <span className="text-base-text font-medium">Draft</span> → <span className="text-blue-400 font-medium">Dispatched</span> → <span className="text-green-400 font-medium">Completed</span> or <span className="text-red-400 font-medium">Cancelled</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Create Trip Form */}
        {canEdit && (
          <div className="xl:col-span-2">
            <div className="card">
              <div className="section-header mb-4">Create Trip</div>
              <form onSubmit={handleCreateTrip} id="create-trip-form" className="space-y-3">
                <div>
                  <label className="form-label">Source</label>
                  <input className="form-input" required value={form.source} onChange={e => handleFormChange('source', e.target.value)} placeholder="Mumbai" />
                </div>
                <div>
                  <label className="form-label">Destination</label>
                  <input className="form-input" required value={form.destination} onChange={e => handleFormChange('destination', e.target.value)} placeholder="Pune" />
                </div>
                <div>
                  <label className="form-label">Vehicle (Available Only)</label>
                  <select className="form-input cursor-pointer" required value={form.vehicleId} onChange={e => handleFormChange('vehicleId', e.target.value)}>
                    <option value="">— Select vehicle —</option>
                    {availVehicles.map(v => (
                      <option key={v.id} value={v.id} style={{ background: '#18181d' }}>
                        {v.name} ({v.regNo}) — {v.capacity}kg cap
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Driver (Available Only)</label>
                  <select className="form-input cursor-pointer" required value={form.driverId} onChange={e => handleFormChange('driverId', e.target.value)}>
                    <option value="">— Select driver —</option>
                    {availDrivers.map(d => (
                      <option key={d.id} value={d.id} style={{ background: '#18181d' }}>
                        {d.name} — Lic: {d.licenseNo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Cargo Weight (kg)</label>
                    <input type="number" min={0} className="form-input" required value={form.cargoWeight || ''} onChange={e => handleFormChange('cargoWeight', +e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Distance (km)</label>
                    <input type="number" min={0} className="form-input" required value={form.plannedDistance || ''} onChange={e => handleFormChange('plannedDistance', +e.target.value)} />
                  </div>
                </div>

                {/* Inline validation callout */}
                {validationError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 animate-fade-in">
                    <div className="text-xs text-red-300 space-y-0.5 mb-2">
                      <div>Vehicle Capacity: <span className="font-bold text-red-200">{validationError.vehicleCapacity} kg</span></div>
                      <div>Cargo Weight: <span className="font-bold text-red-200">{validationError.cargoWeight} kg</span></div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                      <XCircle size={13} />
                      Capacity exceeded by {validationError.exceeded} kg — dispatch blocked
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => {
                    setForm({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: 0, plannedDistance: 0, eta: 'TBD' });
                    setValidationError(null);
                  }} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="dispatch-btn"
                    disabled={saving || !!validationError}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Creating…' : validationError ? 'Blocked' : 'Create Trip'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Live Board */}
        <div className={canEdit ? 'xl:col-span-3' : 'xl:col-span-5'}>
          <div className="card">
            <div className="section-header mb-4">Live Board</div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-lg bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : liveBoard.length === 0 ? (
              <div className="text-center py-8 text-base-muted text-sm">No trips yet.</div>
            ) : (
              <div className="space-y-2">
                {liveBoard.map(trip => (
                  <div
                    key={trip.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTripId(trip.id === selectedTripId ? null : trip.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedTripId(trip.id === selectedTripId ? null : trip.id); }}
                    className={`rounded-xl border p-3 transition-all group cursor-pointer ${
                      selectedTripId === trip.id
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-accent font-bold">{trip.id}</span>
                          <StatusBadge status={trip.status} />
                        </div>
                        <div className="text-sm text-base-text font-medium truncate">{trip.source} → {trip.destination}</div>
                        <div className="text-xs text-base-muted mt-0.5">
                          {trip.vehicleId ? vehName(trip.vehicleId) : 'Unassigned'} · {trip.driverId ? drvName(trip.driverId) : 'Unassigned'}
                        </div>
                        {trip.note && <div className="text-xs text-amber-500/70 mt-1 italic">{trip.note}</div>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-base-muted">ETA</div>
                        <div className="text-xs font-semibold text-base-text">{trip.eta}</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {canEdit && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-white/[0.05]" onClick={e => e.stopPropagation()}>
                        {trip.status === 'Draft' && (
                          <button onClick={() => handleDispatch(trip.id)} className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-colors">
                            Dispatch
                          </button>
                        )}
                        {trip.status === 'Dispatched' && (
                          <button onClick={() => setCompleteTrip(trip)} className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-colors">
                            Complete
                          </button>
                        )}
                        {(trip.status === 'Draft' || trip.status === 'Dispatched') && (
                          <button onClick={() => handleCancel(trip.id)} className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Footer pipeline note */}
            <p className="mt-4 pt-3 border-t border-white/[0.05] text-xs text-amber-500/60 italic">
              On Complete: odometer → fuel log → expenses → Vehicle &amp; Driver Available
            </p>
          </div>
        </div>
      </div>

      {completeTrip && (
        <CompleteTripModal
          trip={completeTrip}
          onClose={() => setCompleteTrip(null)}
          onComplete={updated => {
            setTrips(ts => ts.map(t => t.id === updated.id ? updated : t));
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
