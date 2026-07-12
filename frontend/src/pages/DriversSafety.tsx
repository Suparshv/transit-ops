import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '../components/shared/DataTable';
import { StatusBadge, ExpiredBadge } from '../components/shared/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { apiGetDrivers, apiCreateDriver, apiToggleDriverStatus, apiDeleteDriver, type Driver, type DriverStatus } from '../api';

const CATEGORIES = ['LMV', 'HMV', 'TRANS', 'MCWOG'];
const STATUSES: DriverStatus[] = ['Available', 'On Trip', 'Off Duty', 'Suspended'];

function isExpired(expiry: string): boolean {
  return expiry < new Date().toISOString().split('T')[0];
}

function AddDriverModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Driver) => void }) {
  const [form, setForm] = useState({
    name: '', licenseNo: '', category: 'LMV', licenseExpiry: '',
    contact: '', tripCompletionPct: 100, safetyRating: 'Good' as Driver['safetyRating'], status: 'Available' as DriverStatus,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await apiCreateDriver(form);
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    toast.success(`Driver ${form.name} added successfully.`);
    onSave(res.data!);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-base-card rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-bold text-base-text mb-5">Add Driver</h2>
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">Driver Name</label>
              <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Alex T." />
            </div>
            <div>
              <label className="form-label">License No.</label>
              <input className="form-input" required value={form.licenseNo} onChange={e => setForm(f => ({ ...f, licenseNo: e.target.value }))} placeholder="MH-1234567" />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select className="form-input cursor-pointer" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} style={{ background: '#18181d' }}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">License Expiry</label>
              <input type="date" className="form-input" required value={form.licenseExpiry} onChange={e => setForm(f => ({ ...f, licenseExpiry: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Contact</label>
              <input className="form-input" required value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="+91-9876543210" />
            </div>
            <div>
              <label className="form-label">Safety Rating</label>
              <select className="form-input cursor-pointer" value={form.safetyRating} onChange={e => setForm(f => ({ ...f, safetyRating: e.target.value as Driver['safetyRating'] }))}>
                {['Excellent', 'Good', 'Fair', 'Poor'].map(r => <option key={r} style={{ background: '#18181d' }}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Trip Completion %</label>
              <input type="number" min={0} max={100} className="form-input" value={form.tripCompletionPct} onChange={e => setForm(f => ({ ...f, tripCompletionPct: +e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Saving…' : '+ Add Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DriversSafety() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('drivers', 'full');

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    apiGetDrivers().then(r => {
      if (r.success && r.data) setDrivers(r.data);
      setLoading(false);
    });
  }, []);

  const handleToggleStatus = async (status: DriverStatus) => {
    if (!selectedId) { toast.error('Select a driver row first.'); return; }
    const res = await apiToggleDriverStatus(selectedId, status);
    if (res.success && res.data) {
      setDrivers(ds => ds.map(d => d.id === selectedId ? res.data! : d));
      toast.success(`Driver status updated to ${status}.`);
    }
  };

  const handleDelete = async (d: Driver) => {
    await apiDeleteDriver(d.id);
    setDrivers(ds => ds.filter(x => x.id !== d.id));
    toast.success(`Driver ${d.name} removed.`);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-text">Drivers &amp; Safety Profiles</h1>
          <p className="text-xs text-base-muted mt-0.5">Manage driver records and compliance</p>
        </div>
        {canEdit && (
          <button id="add-driver-btn" onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Driver
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                { key: 'name',             label: 'Driver',          render: d => (
                  <span className={`font-medium flex items-center gap-2 ${d.id === selectedId ? 'text-accent' : ''}`}>
                    {d.id === selectedId && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 inline-block" />
                    )}
                    {d.name}
                  </span>
                )},
                { key: 'licenseNo',        label: 'License No.'      },
                { key: 'category',         label: 'Category'         },
                { key: 'licenseExpiry',    label: 'Expiry',          render: d => (
                  <div className="flex items-center gap-2">
                    <span className={isExpired(d.licenseExpiry) ? 'text-red-400 line-through text-xs' : 'text-xs'}>
                      {d.licenseExpiry}
                    </span>
                    {isExpired(d.licenseExpiry) && <ExpiredBadge />}
                  </div>
                )},
                { key: 'contact',          label: 'Contact',         render: d => <span className="text-xs">{d.contact}</span> },
                { key: 'tripCompletionPct',label: 'Trip Compl. %',   render: d => <span className="font-semibold">{d.tripCompletionPct}%</span> },
                { key: 'safetyRating',     label: 'Safety',          render: d => <StatusBadge status={d.safetyRating} /> },
                { key: 'status',           label: 'Status',          render: d => <StatusBadge status={d.status} /> },
                ...(canEdit ? [{
                  key: 'actions', label: '',
                  render: (d: Driver) => (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(d); }}
                      className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                    >
                      Remove
                    </button>
                  ),
                }] : []),
              ]}
              data={drivers}
              emptyMessage="No drivers found."
              onRowClick={canEdit ? d => setSelectedId(d.id === selectedId ? null : d.id) : undefined}
            />
            {canEdit && selectedId && (
              <p className="mt-2 text-xs text-base-muted px-1">
                Selected: <span className="text-accent font-semibold">{drivers.find(d => d.id === selectedId)?.name}</span> — use buttons below to change status
              </p>
            )}
          </>
        )}
      </div>

      {/* Toggle Status buttons */}
      {canEdit && (
        <div className="mt-4">
          <div className="section-header mb-2">
            Toggle Status {selectedId ? `— ${drivers.find(d => d.id === selectedId)?.name ?? ''}` : '(select a driver row first)'}
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(s => (
              <button
                key={s}
                id={`toggle-status-${s.toLowerCase().replace(' ', '-')}`}
                onClick={() => handleToggleStatus(s)}
                disabled={!selectedId}
                className={`btn-secondary text-xs disabled:opacity-40 transition-all ${
                  !selectedId ? '' : 'hover:border-accent/40 hover:text-accent'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-amber-500/70 italic px-1">
        Expired license or Suspended status → blocked from trip assignment
      </p>

      {showModal && (
        <AddDriverModal
          onClose={() => setShowModal(false)}
          onSave={d => setDrivers(ds => [...ds, d])}
        />
      )}
    </div>
  );
}
