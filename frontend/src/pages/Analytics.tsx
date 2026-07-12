import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { KpiCard } from '../components/shared/KpiCard';
import { apiGetAnalyticsKpis, getToken } from '../api';
import { Fuel, Gauge, DollarSign, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';

// Five colours — one per ranked vehicle (backend returns top 5)
const COSTLIEST_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22d3ee'];
const TOP_COSTLIEST_COUNT = 5;

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000';

interface AnalyticsData {
  fuelEfficiency: number;
  fleetUtilization: number;
  operationalCost: number;
  vehicleRoi: number;
  topCostliest: Array<{ vehicle: { name: string }; totalCost: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-base-card border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
        <div className="text-base-muted mb-1">{label}</div>
        <div className="font-bold text-accent">₹{payload[0].value.toLocaleString()}</div>
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [data,        setData]        = useState<AnalyticsData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [exporting,   setExporting]   = useState(false);

  useEffect(() => {
    apiGetAnalyticsKpis().then(r => {
      if (r.success && r.data) setData(r.data as AnalyticsData);
      else if (!r.success) toast.error(r.error ?? 'Failed to load analytics.');
      setLoading(false);
    });
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/api/reports/export.csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error ?? `Export failed (HTTP ${res.status})`);
        return;
      }

      // Trigger browser download
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'transitops-report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV export downloaded.');
    } catch (err) {
      toast.error('Export failed — is the backend running?');
    } finally {
      setExporting(false);
    }
  };

  const maxCost = data?.topCostliest[0]?.totalCost ?? 1;

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-base-text">Reports &amp; Analytics</h1>
          <p className="text-xs text-base-muted mt-0.5">Fleet performance metrics and financial overview</p>
        </div>

        {/* CSV export — top-right, amber primary-action style */}
        <button
          onClick={handleExportCsv}
          disabled={exporting || loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
          aria-label="Export analytics as CSV"
        >
          {exporting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download size={14} />
              Export CSV
            </>
          )}
        </button>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.06]" />
          ))}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-1">
          <KpiCard label="Fuel Efficiency"  value={data.fuelEfficiency}  suffix="km/l" borderColor="green"  icon={<Fuel size={20} />} />
          <KpiCard label="Fleet Utilization" value={data.fleetUtilization} suffix="%"    borderColor="blue"   icon={<Gauge size={20} />} />
          <KpiCard label="Operational Cost"  value={`₹${(data.operationalCost / 1000).toFixed(1)}k`} borderColor="orange" icon={<DollarSign size={20} />} />
          <KpiCard label="Vehicle ROI"       value={data.vehicleRoi}      suffix="%"    borderColor="amber"  icon={<TrendingUp size={20} />} />
        </div>
      )}

      {/* ROI formula caption */}
      <p className="text-[11px] text-base-muted mb-6 px-1 italic">
        ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost · Revenue = Planned Distance × ₹30/km
      </p>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Monthly Revenue bar chart */}
        <div className="card">
          <div className="section-header mb-4">Monthly Revenue</div>
          {loading ? (
            <div className="h-56 rounded bg-white/[0.03] animate-pulse" />
          ) : data && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthlyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6b6b7b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b6b7b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245,158,11,0.05)' }} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {data.monthlyRevenue.map((_, i) => (
                    <Cell key={i} fill={i === data.monthlyRevenue.length - 1 ? '#f59e0b' : '#f59e0b40'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 5 Costliest Vehicles */}
        <div className="card">
          <div className="section-header mb-4">Top Costliest Vehicles</div>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: TOP_COSTLIEST_COUNT }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : data && data.topCostliest.length > 0 ? (
            <div className="space-y-4">
              {data.topCostliest.map((item, i) => {
                const pct = Math.round((item.totalCost / maxCost) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold w-5 text-base-muted">#{i + 1}</span>
                        <span className="text-sm font-medium text-base-text">{item.vehicle.name}</span>
                      </div>
                      <span className="text-sm font-bold text-base-text tabular-nums">
                        ₹{item.totalCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COSTLIEST_COLORS[i] ?? COSTLIEST_COLORS[COSTLIEST_COLORS.length - 1],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-base-muted text-sm">No cost data available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
