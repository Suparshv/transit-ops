import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiGetSettings, apiUpdateSettings } from '../api';
import { rolePermissions, type Role, type Module } from '../lib/rolePermissions';

const ACTION_LABEL: Record<string, string> = {
  full: '✓ Full',
  view: 'View',
  none: '–',
};
const ACTION_STYLE: Record<string, string> = {
  full: 'text-green-400 font-semibold',
  view: 'text-blue-400',
  none: 'text-base-muted',
};

const ROLES: Role[] = ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'];
const MODULES: Module[] = ['fleet', 'drivers', 'trips', 'maintenance', 'fuel', 'analytics'];
const MODULE_LABELS: Record<string, string> = {
  fleet: 'Fleet', drivers: 'Drivers', trips: 'Trips', maintenance: 'Maint.', fuel: 'Fuel/Exp.', analytics: 'Analytics',
};

const CURRENCIES = ['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'];
const DISTANCE_UNITS = ['Kilometers', 'Miles'];

export default function Settings() {
  const [settings, setSettings] = useState({ depotName: '', currency: 'INR (₹)', distanceUnit: 'Kilometers' });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    apiGetSettings().then(r => {
      if (r.success && r.data) setSettings(r.data as typeof settings);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await apiUpdateSettings(settings);
    setSaving(false);
    toast.success('Settings saved successfully.');
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-base-text">Settings &amp; RBAC</h1>
        <p className="text-xs text-base-muted mt-0.5">General configuration and role-based access control</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* General settings */}
        <div className="xl:col-span-2">
          <div className="card">
            <div className="section-header mb-4">General</div>
            {loading ? <div className="h-40 rounded bg-white/[0.03] animate-pulse" /> : (
              <form onSubmit={handleSave} id="settings-form" className="space-y-4">
                <div>
                  <label className="form-label">Depot Name</label>
                  <input
                    className="form-input"
                    value={settings.depotName}
                    onChange={e => setSettings(s => ({ ...s, depotName: e.target.value }))}
                    placeholder="TransitOps Mumbai HQ"
                  />
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <select
                    className="form-input cursor-pointer"
                    value={settings.currency}
                    onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
                  >
                    {CURRENCIES.map(c => <option key={c} style={{ background: '#18181d' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Distance Unit</label>
                  <select
                    className="form-input cursor-pointer"
                    value={settings.distanceUnit}
                    onChange={e => setSettings(s => ({ ...s, distanceUnit: e.target.value }))}
                  >
                    {DISTANCE_UNITS.map(u => <option key={u} style={{ background: '#18181d' }}>{u}</option>)}
                  </select>
                </div>
                <button type="submit" id="save-settings-btn" disabled={saving} className="btn-primary w-full disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* RBAC Matrix */}
        <div className="xl:col-span-3">
          <div className="card">
            <div className="section-header mb-1">Role-Based Access (RBAC)</div>
            <p className="text-xs text-base-muted mb-4">
              Enforced on both the frontend (navigation/UI) and backend middleware. Defined in <code className="text-amber-400 text-[10px]">rolePermissions.ts</code>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2 pr-4 text-[10px] font-bold uppercase tracking-widest text-base-muted">Role</th>
                    {MODULES.map(m => (
                      <th key={m} className="text-center py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-base-muted whitespace-nowrap">
                        {MODULE_LABELS[m]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role, i) => (
                    <tr key={role} className={`border-b border-white/[0.04] last:border-0 ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                      <td className="py-3 pr-4 font-medium text-base-text whitespace-nowrap">{role}</td>
                      {MODULES.map(mod => {
                        const perm = rolePermissions[role][mod];
                        return (
                          <td key={mod} className={`py-3 px-3 text-center ${ACTION_STYLE[perm]}`}>
                            {ACTION_LABEL[perm]}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex gap-4 text-xs text-base-muted">
              <span><span className="text-green-400 font-semibold">✓ Full</span> = create/edit/delete</span>
              <span><span className="text-blue-400">View</span> = read-only</span>
              <span><span className="text-base-muted">–</span> = no access (hidden nav + blocked route)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
