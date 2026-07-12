import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '../components/shared/StatusBadge';
import { DataTable } from '../components/shared/DataTable';
import { useAuth } from '../context/AuthContext';
import {
  apiGetFuelLogs, apiCreateFuelLog, apiGetExpenses, apiCreateExpense,
  apiGetVehicles, apiGetTrips,
  type FuelLog, type Expense, type Vehicle, type Trip,
} from '../api';

function LogFuelModal({ vehicles, onClose, onSave }: { vehicles: Vehicle[]; onClose: () => void; onSave: (f: FuelLog) => void }) {
  const [form, setForm] = useState({ vehicleId: '', date: new Date().toISOString().split('T')[0], liters: 0, fuelCost: 0 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await apiCreateFuelLog(form);
    setSaving(false);
    if (res.success && res.data) {
      toast.success('Fuel log added.');
      onSave(res.data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-base-card rounded-2xl border border-white/10 p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-bold text-base-text mb-5">Log Fuel</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="form-label">Vehicle</label>
            <select className="form-input cursor-pointer" required value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}>
              <option value="">— Select —</option>
              {vehicles.map(v => <option key={v.id} value={v.id} style={{ background: '#18181d' }}>{v.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Liters</label>
              <input type="number" min={0} step="0.1" className="form-input" required value={form.liters || ''} onChange={e => setForm(f => ({ ...f, liters: +e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Cost (₹)</label>
              <input type="number" min={0} className="form-input" required value={form.fuelCost || ''} onChange={e => setForm(f => ({ ...f, fuelCost: +e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Date</label>
            <input type="date" className="form-input" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Log Fuel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddExpenseModal({ trips, vehicles, onClose, onSave }: { trips: Trip[]; vehicles: Vehicle[]; onClose: () => void; onSave: (e: Expense) => void }) {
  const [form, setForm] = useState({ tripId: '', vehicleId: '', toll: 0, other: 0, maintenanceCost: 0, status: 'Pending' as Expense['status'] });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await apiCreateExpense(form);
    setSaving(false);
    if (res.success && res.data) {
      toast.success('Expense record added.');
      onSave(res.data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-base-card rounded-2xl border border-white/10 p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-bold text-base-text mb-5">Add Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="form-label">Trip</label>
            <select className="form-input cursor-pointer" required value={form.tripId} onChange={e => setForm(f => ({ ...f, tripId: e.target.value }))}>
              <option value="">— Select Trip —</option>
              {trips.map(t => <option key={t.id} value={t.id} style={{ background: '#18181d' }}>{t.id} ({t.source} → {t.destination})</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Vehicle</label>
            <select className="form-input cursor-pointer" required value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}>
              <option value="">— Select Vehicle —</option>
              {vehicles.map(v => <option key={v.id} value={v.id} style={{ background: '#18181d' }}>{v.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Toll (₹)</label>
              <input type="number" min={0} className="form-input" value={form.toll} onChange={e => setForm(f => ({ ...f, toll: +e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Other (₹)</label>
              <input type="number" min={0} className="form-input" value={form.other} onChange={e => setForm(f => ({ ...f, other: +e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Linked Maint. Cost (₹)</label>
            <input type="number" min={0} className="form-input" value={form.maintenanceCost} onChange={e => setForm(f => ({ ...f, maintenanceCost: +e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FuelExpenses() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('fuel', 'full');

  const [fuelLogs,  setFuelLogs]  = useState<FuelLog[]>([]);
  const [expenses,  setExpenses]  = useState<Expense[]>([]);
  const [vehicles,  setVehicles]  = useState<Vehicle[]>([]);
  const [trips,     setTrips]     = useState<Trip[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showFuel,  setShowFuel]  = useState(false);
  const [showExp,   setShowExp]   = useState(false);

  useEffect(() => {
    Promise.all([apiGetFuelLogs(), apiGetExpenses(), apiGetVehicles(), apiGetTrips()]).then(([fl, ex, veh, tr]) => {
      if (fl.success && fl.data) setFuelLogs(fl.data);
      if (ex.success && ex.data) setExpenses(ex.data);
      if (veh.success && veh.data) setVehicles(veh.data);
      if (tr.success && tr.data) setTrips(tr.data);
      setLoading(false);
    });
  }, []);

  const vehName  = (id: string) => vehicles.find(v => v.id === id)?.name ?? id;
  const totalFuel = fuelLogs.reduce((s, f) => s + f.fuelCost, 0);
  const totalMaint = expenses.reduce((s, e) => s + e.maintenanceCost, 0);
  const totalOps  = totalFuel + totalMaint;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-text">Fuel &amp; Expense Management</h1>
          <p className="text-xs text-base-muted mt-0.5">Track fuel usage and operational expenses</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button id="log-fuel-btn" onClick={() => setShowFuel(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Log Fuel
            </button>
            <button id="add-expense-btn" onClick={() => setShowExp(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Add Expense
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {/* Fuel Logs */}
        <div className="card">
          <div className="section-header mb-4">Fuel Logs</div>
          {loading ? <div className="h-20 rounded bg-white/[0.03] animate-pulse" /> : (
            <DataTable
              columns={[
                { key: 'vehicleId', label: 'Vehicle', render: f => vehName(f.vehicleId) },
                { key: 'date',      label: 'Date' },
                { key: 'liters',    label: 'Liters', render: f => `${f.liters}L` },
                { key: 'fuelCost',  label: 'Fuel Cost', render: f => `₹${f.fuelCost.toLocaleString()}` },
              ]}
              data={fuelLogs}
              emptyMessage="No fuel logs yet."
            />
          )}
        </div>

        {/* Other Expenses */}
        <div className="card">
          <div className="section-header mb-4">Other Expenses (Toll / Misc)</div>
          {loading ? <div className="h-20 rounded bg-white/[0.03] animate-pulse" /> : (
            <DataTable
              columns={[
                { key: 'tripId',          label: 'Trip',         render: e => <span className="font-mono text-xs text-accent">{e.tripId}</span> },
                { key: 'vehicleId',       label: 'Vehicle',      render: e => vehName(e.vehicleId) },
                { key: 'toll',            label: 'Toll',         render: e => `₹${e.toll}` },
                { key: 'other',           label: 'Other',        render: e => `₹${e.other}` },
                { key: 'maintenanceCost', label: 'Maint. (linked)', render: e => `₹${e.maintenanceCost.toLocaleString()}` },
                { key: 'total',           label: 'Total',        render: e => <span className="font-semibold">₹{e.total.toLocaleString()}</span> },
                { key: 'status',          label: 'Status',       render: e => <StatusBadge status={e.status} /> },
              ]}
              data={expenses}
              emptyMessage="No expense records yet."
            />
          )}
        </div>

        {/* Total Operational Cost */}
        <div className="card flex items-center justify-between py-4">
          <span className="text-xs font-bold uppercase tracking-widest text-base-muted">
            Total Operational Cost (Auto) = Fuel + Maint.
          </span>
          <span className="text-2xl font-bold text-accent tabular-nums">
            ₹{totalOps.toLocaleString()}
          </span>
        </div>
      </div>

      {showFuel && <LogFuelModal vehicles={vehicles} onClose={() => setShowFuel(false)} onSave={f => setFuelLogs(ls => [...ls, f])} />}
      {showExp  && <AddExpenseModal trips={trips} vehicles={vehicles} onClose={() => setShowExp(false)} onSave={e => setExpenses(es => [...es, e])} />}
    </div>
  );
}
