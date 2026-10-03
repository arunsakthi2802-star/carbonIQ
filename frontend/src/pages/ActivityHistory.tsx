import React, { useEffect, useState } from 'react';
import { Table, Search, Filter, Trash2, Eye, RefreshCw, Cpu, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatEmissions } from '../services/api';
import { ActivityEntry } from '../types';

export const ActivityHistory: React.FC = () => {
  const { currentPeriod, unitPreference } = useAuth();

  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterPeriod, setFilterPeriod] = useState<string>('');
  const [filterActivity, setFilterActivity] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedAudit, setSelectedAudit] = useState<{ entry: ActivityEntry; audit: any } | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let query = `/activity-entries?page=${page}&limit=15`;
      if (filterPeriod) query += `&period=${filterPeriod}`;
      if (filterActivity) query += `&activityType=${filterActivity}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const resp = await api.get(query);
      setEntries(resp.data.data.entries || []);
      setTotal(resp.data.data.pagination?.total || 0);
    } catch (e: any) {
      console.error('Failed to load activity logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [page, filterPeriod, filterActivity]);

  const handleDelete = async (id: string, period: string) => {
    if (!window.confirm('Delete this operational activity record? This will immediately recalculate period emissions.')) {
      return;
    }
    try {
      await api.delete(`/activity-entries/${id}`);
      fetchActivities();
    } catch (e: any) {
      alert(`Delete failed: ${e.response?.data?.error?.message || e.message}`);
    }
  };

  const handleOpenAudit = async (id: string) => {
    try {
      const resp = await api.get(`/activity-entries/${id}`);
      setSelectedAudit(resp.data.data);
    } catch (e: any) {
      alert(`Could not load audit details: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Activity Log & Audit Trail</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable operational records with verified factors and machine learning corrections.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search supplier, facility..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchActivities()}
              className="glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs w-48"
            />
          </div>

          <select
            value={filterActivity}
            onChange={(e) => { setFilterActivity(e.target.value); setPage(1); }}
            className="glass-input px-3 py-1.5 rounded-xl text-xs"
          >
            <option value="" className="bg-slate-900">All Activities</option>
            <option value="electricity" className="bg-slate-900">Electricity</option>
            <option value="diesel" className="bg-slate-900">Diesel</option>
            <option value="road_freight" className="bg-slate-900">Road Freight</option>
            <option value="cotton" className="bg-slate-900">Cotton</option>
          </select>

          <button
            onClick={fetchActivities}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Period</th>
                <th className="p-3.5">Activity</th>
                <th className="p-3.5">Quantity</th>
                <th className="p-3.5">Region</th>
                <th className="p-3.5">Equip Age</th>
                <th className="p-3.5">Baseline kg</th>
                <th className="p-3.5">ML Corrected</th>
                <th className="p-3.5">Supplier / Site</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">Loading activities...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">No activity entries found matching your filter criteria.</td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 font-mono text-slate-300 font-semibold">{item.period}</td>
                    <td className="p-3.5 font-medium text-white uppercase">{item.activityType.replace('_', ' ')}</td>
                    <td className="p-3.5 font-mono">
                      {item.quantity.toLocaleString()} {item.unit}
                      {item.cargoWeightTons ? ` (${item.cargoWeightTons} t)` : ''}
                    </td>
                    <td className="p-3.5">{item.region}</td>
                    <td className="p-3.5 text-slate-400">{item.equipmentAgeYears}y</td>
                    <td className="p-3.5 font-mono text-emerald-400 font-semibold">
                      {item.baselineKg ? Math.round(item.baselineKg).toLocaleString() : '—'}
                    </td>
                    <td className="p-3.5 font-mono text-cyan-400 font-semibold">
                      {item.correctedKg ? Math.round(item.correctedKg).toLocaleString() : '—'}
                    </td>
                    <td className="p-3.5 text-slate-400 truncate max-w-xs">{item.supplierId || item.facility || '—'}</td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenAudit(item._id)}
                        className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20"
                        title="Audit & explain calculation"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id, item.period)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {entries.length} of {total} records</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-medium text-slate-200">Page {page}</span>
            <button
              disabled={entries.length < 15}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE ACTIVITY AUDIT MODAL */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-3xl border border-cyan-500/30 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Calculation Audit Card</h3>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Activity:</span>
                  <span className="font-bold text-white uppercase">{selectedAudit.entry.activityType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Formula Used:</span>
                  <span className="font-mono text-emerald-300">{selectedAudit.audit?.formula || `${selectedAudit.entry.quantity} × Factor`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Emission Factor:</span>
                  <span className="text-slate-200">{selectedAudit.audit?.emissionFactor || 'Standard Factor'} ({selectedAudit.audit?.factorSource || 'GHG Protocol'})</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Baseline Estimate:</span>
                  <span className="font-mono text-white font-bold">{selectedAudit.entry.baselineKg?.toFixed(2)} kg CO2e</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ML Model Adjustment:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {selectedAudit.audit?.adjustmentPct ? `${selectedAudit.audit.adjustmentPct > 0 ? '+' : ''}${selectedAudit.audit.adjustmentPct.toFixed(1)}%` : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span className="text-slate-400 font-semibold">Corrected Estimate:</span>
                  <span className="font-mono text-cyan-400 font-bold text-sm">{selectedAudit.entry.correctedKg?.toFixed(2)} kg CO2e</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/30 p-3 rounded-xl border border-slate-800">
                <b>Audit Transparency:</b> This operational calculation is permanently logged with company isolation. The XGBoost correction reflects equipment age wear ({selectedAudit.entry.equipmentAgeYears} years) and local grid mix factors.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedAudit(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
