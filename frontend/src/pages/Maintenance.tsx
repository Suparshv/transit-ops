import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '../components/shared/StatusBadge';
import { DataTable } from '../components/shared/DataTable';
import { useAuth } from '../context/AuthContext';
import {
  apiGetMaintenance, apiCreateMaintenance, apiCloseMaintenance,
  apiGetVehicles, type MaintenanceRecord, type Vehicle,
} from '../api';

export default function Maintenance() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('maintenance', 'full');

  const [records,  setRecords]  = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [form, setForm] = useState({
    vehicleId: '', serviceType: '', cost: 0, date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    Promise.all([apiGetMaintenance(), apiGetVehicles()]).then(([mRes, vRes]) => {
      if (mRes.success && mRes.data) setRecords(mRes.data);
      if (vRes.success && vRes.data) setVehicles(vRes.data);
      setLoading(false);
    });
  }, []);

  const vehName = (id: string) => vehicles.find(v => v.id === id)?.name ?? id;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await apiCreateMaintenance({ ...form, status: 'Active' });
    setSaving(false);
    if (res.success && res.data) {
      setRecords(rs => [...rs, res.data!]);
      toast.success(`Service record logged. ${vehName(form.vehicleId)} is now In Shop.`);
      setForm({ vehicleId: '', serviceType: '', cost: 0, date: new Date().toISOString().split('T')[0] });
    } else {
      toast.error(res.error ?? 'Failed to log record.');
    }
  };

  const handleClose = async (id: string) => {
    const res = await apiCloseMaintenance(id);
    if (res.success && res.data) {
      setRecords(rs => rs.map(r => r.id === id ? res.data! : r));
      toast.success('Maintenance closed. Vehicle is back to Available.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-base-text">Maintenance</h1>
        <p className="text-xs text-base-muted mt-0.5">Log and manage vehicle service records</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Log Service Record form */}
        {canEdit && (
          <div className="xl:col-span-2">
            <div className="card">
              <div className="section-header mb-4">Log Service Record</div>
              <form onSubmit={handleSave} id="maintenance-form" className="space-y-3">
                <div>
                  <label className="form-label">Vehicle</label>
                  <select className="form-input cursor-pointer" required value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}>
                    <option value="">— Select vehicle —</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id} style={{ background: '#18181d' }}>
                        {v.name} ({v.regNo}) — {v.status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Service Type</label>
                  <input className="form-input" required value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))} placeholder="Oil Change, Tyre Replacement…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Cost (₹)</label>
                    <input type="number" min={0} className="form-input" required value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" disabled={saving} id="save-maintenance-btn" className="btn-primary w-full disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Record'}
                </button>
              </form>

              {/* State transition legend */}
              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <div className="section-header mb-3">Status Transitions</div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/25 font-semibold">Available</span>
                    <span className="text-base-muted">──[opening active record]──▶</span>
                    <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25 font-semibold">In Shop</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25 font-semibold">In Shop</span>
                    <span className="text-base-muted">──[closing record, not retired]──▶</span>
                    <span className="px-2 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/25 font-semibold">Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Service Log table */}
        <div className={canEdit ? 'xl:col-span-3' : 'xl:col-span-5'}>
          <div className="card">
            <div className="section-header mb-4">Service Log</div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 rounded bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : (
              <DataTable
                columns={[
                  { key: 'vehicleId',   label: 'Vehicle',      render: r => <span className="font-medium">{vehName(r.vehicleId)}</span> },
                  { key: 'serviceType', label: 'Service'       },
                  { key: 'date',        label: 'Date'          },
                  { key: 'cost',        label: 'Cost',         render: r => `₹${r.cost.toLocaleString()}` },
                  { key: 'status',      label: 'Status',       render: r => <StatusBadge status={r.status} /> },
                  ...(canEdit ? [{
                    key: 'actions', label: '',
                    render: (r: MaintenanceRecord) => r.status === 'Active' ? (
                      <button onClick={() => handleClose(r.id)} className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-colors">
                        Close
                      </button>
                    ) : null,
                  }] : []),
                ]}
                data={records}
                emptyMessage="No maintenance records yet."
              />
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-amber-500/70 italic px-1">
        In Shop vehicles are removed from the dispatch pool
      </p>
    </div>
  );
}
