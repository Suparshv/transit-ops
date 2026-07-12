import React, { useState, useEffect } from 'react';
import { Plus, Truck, AlertCircle, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '../components/shared/DataTable';
import { StatusBadge } from '../components/shared/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  apiGetVehicles, apiCreateVehicle, apiUpdateVehicle, apiDeleteVehicle,
  type Vehicle, type VehicleStatus,
} from '../api';

const TYPES = ['Van', 'Truck', 'Bus', 'Bike'] as const;
const STATUSES: VehicleStatus[] = ['Available', 'On Trip', 'In Shop', 'Retired'];
const REGIONS = ['Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Ahmedabad', 'Kolkata', 'Chennai'];

// ─── Add Vehicle Modal ────────────────────────────────────────────────────────

function AddVehicleModal({ onClose, onSave }: { onClose: () => void; onSave: (v: Vehicle) => void }) {
  const [form, setForm] = useState({
    regNo: '', name: '', type: 'Van' as Vehicle['type'],
    capacity: 500, odometer: 0, acqCost: 0, status: 'Available' as VehicleStatus, region: 'Mumbai',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await apiCreateVehicle(form);
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    toast.success(`Vehicle ${form.name} registered successfully.`);
    onSave(res.data!);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-base-card rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-base-text">Add Vehicle</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-base-muted hover:text-base-text hover:bg-white/[0.06] transition-colors">
            <X size={16} />
          </button>
        </div>
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">Registration No. (unique)</label>
              <input className="form-input" required value={form.regNo} onChange={e => setForm(f => ({ ...f, regNo: e.target.value }))} placeholder="MH12-AB-1234" />
            </div>
            <div>
              <label className="form-label">Name / Model</label>
              <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Van-05" />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-input cursor-pointer" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Vehicle['type'] }))}>
                {TYPES.map(t => <option key={t} style={{ background: '#18181d' }}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Capacity (kg)</label>
              <input type="number" min={1} className="form-input" required value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Odometer (km)</label>
              <input type="number" min={0} className="form-input" required value={form.odometer} onChange={e => setForm(f => ({ ...f, odometer: +e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Acq. Cost (₹)</label>
              <input type="number" min={0} className="form-input" required value={form.acqCost} onChange={e => setForm(f => ({ ...f, acqCost: +e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Region</label>
              <select className="form-input cursor-pointer" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                {REGIONS.map(r => <option key={r} style={{ background: '#18181d' }}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Saving…' : '+ Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Vehicle Modal ───────────────────────────────────────────────────────

function EditVehicleModal({ vehicle, onClose, onSave }: { vehicle: Vehicle; onClose: () => void; onSave: (v: Vehicle) => void }) {
  const [form, setForm] = useState({
    name:     vehicle.name,
    type:     vehicle.type,
    capacity: vehicle.capacity,
    odometer: vehicle.odometer,
    acqCost:  vehicle.acqCost,
    status:   vehicle.status,
    region:   vehicle.region,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await apiUpdateVehicle(vehicle.id, form);
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    toast.success(`Vehicle ${form.name} updated.`);
    onSave(res.data!);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-base-card rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-base-text">Edit Vehicle</h2>
            <p className="text-xs text-base-muted mt-0.5 font-mono">{vehicle.regNo}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-base-muted hover:text-base-text hover:bg-white/[0.06] transition-colors">
            <X size={16} />
          </button>
        </div>
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">Name / Model</label>
              <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-input cursor-pointer" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Vehicle['type'] }))}>
                {TYPES.map(t => <option key={t} style={{ background: '#18181d' }}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input cursor-pointer" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as VehicleStatus }))}>
                {STATUSES.map(s => <option key={s} style={{ background: '#18181d' }}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Capacity (kg)</label>
              <input type="number" min={1} className="form-input" required value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Odometer (km)</label>
              <input type="number" min={0} className="form-input" required value={form.odometer} onChange={e => setForm(f => ({ ...f, odometer: +e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Acq. Cost (₹)</label>
              <input type="number" min={0} className="form-input" required value={form.acqCost} onChange={e => setForm(f => ({ ...f, acqCost: +e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Region</label>
              <select className="form-input cursor-pointer" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                {REGIONS.map(r => <option key={r} style={{ background: '#18181d' }}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehicleRegistry() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('fleet', 'full');

  const [vehicles,   setVehicles]   = useState<Vehicle[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);

  const [filterType,   setFilterType]   = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [search,       setSearch]       = useState('');

  useEffect(() => {
    apiGetVehicles().then(r => {
      if (r.success && r.data) setVehicles(r.data);
      setLoading(false);
    });
  }, []);

  const filtered = vehicles.filter(v => {
    if (filterType   !== 'All' && v.type   !== filterType)   return false;
    if (filterStatus !== 'All' && v.status !== filterStatus) return false;
    if (search && !v.regNo.toLowerCase().includes(search.toLowerCase()) &&
        !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = async (v: Vehicle) => {
    await apiDeleteVehicle(v.id);
    setVehicles(vs => vs.filter(x => x.id !== v.id));
    toast.success(`Vehicle ${v.name} removed.`);
  };

  const handleSaveEdit = (updated: Vehicle) => {
    setVehicles(vs => vs.map(v => v.id === updated.id ? updated : v));
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-text">Fleet Registry</h1>
          <p className="text-xs text-base-muted mt-0.5">Manage all registered vehicles</p>
        </div>
        {canEdit && (
          <button id="add-vehicle-btn" onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Vehicle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="bg-base-card border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-base-text outline-none focus:border-accent/40"
          value={filterType} onChange={e => setFilterType(e.target.value)}
        >
          {['All', ...TYPES].map(t => <option key={t} style={{ background: '#18181d' }}>{t === 'All' ? 'Type: All' : t}</option>)}
        </select>
        <select
          className="bg-base-card border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-base-text outline-none focus:border-accent/40"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
        >
          {['All', ...STATUSES].map(s => <option key={s} style={{ background: '#18181d' }}>{s === 'All' ? 'Status: All' : s}</option>)}
        </select>
        <input
          type="text" placeholder="Search by Reg. No. or name…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="form-input w-64 py-1.5"
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'regNo',    label: 'Reg. No. (Unique)', render: v => <span className="font-mono text-xs text-accent">{v.regNo}</span> },
              { key: 'name',     label: 'Name / Model'   },
              { key: 'type',     label: 'Type',           render: v => (
                <span className="flex items-center gap-1.5">
                  <Truck size={13} className="text-base-muted" />
                  {v.type}
                </span>
              )},
              { key: 'capacity', label: 'Capacity',       render: v => `${v.capacity.toLocaleString()} kg` },
              { key: 'odometer', label: 'Odometer',       render: v => `${v.odometer.toLocaleString()} km` },
              { key: 'acqCost',  label: 'Acq. Cost',      render: v => `₹${v.acqCost.toLocaleString()}` },
              { key: 'region',   label: 'Region'          },
              { key: 'status',   label: 'Status',         render: v => <StatusBadge status={v.status} /> },
              ...(canEdit ? [{
                key: 'actions', label: '',
                render: (v: Vehicle) => (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setEditTarget(v)}
                      className="p-1.5 rounded-lg text-base-muted hover:text-accent hover:bg-accent/10 transition-colors"
                      title="Edit vehicle"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ),
              }] : []),
            ]}
            data={filtered}
            emptyMessage="No vehicles found matching filters."
          />
        )}
      </div>

      {/* Footer business rule */}
      <p className="mt-3 text-xs text-amber-500/70 italic px-1">
        Registration No. must be unique · Retired/In Shop vehicles are hidden from Trip Dispatcher
      </p>

      {showAdd && (
        <AddVehicleModal
          onClose={() => setShowAdd(false)}
          onSave={v => setVehicles(vs => [...vs, v])}
        />
      )}

      {editTarget && (
        <EditVehicleModal
          vehicle={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={updated => {
            handleSaveEdit(updated);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
