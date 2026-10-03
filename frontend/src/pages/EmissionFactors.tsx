import React, { useEffect, useState } from 'react';
import { Layers, PlusCircle, Search, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EmissionFactor } from '../types';

export const EmissionFactors: React.FC = () => {
  const { isAdmin } = useAuth();
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Factor Form
  const [activityType, setActivityType] = useState('electricity');
  const [name, setName] = useState('');
  const [factorValue, setFactorValue] = useState('');
  const [unit, setUnit] = useState('kg CO2e/kWh');
  const [scope, setScope] = useState<number>(2);
  const [region, setRegion] = useState('IN');
  const [source, setSource] = useState('Organization Verified Factor');

  const fetchFactors = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/emission-factors');
      setFactors(resp.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactors();
  }, []);

  const handleCreateFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/emission-factors', {
        activityType,
        name,
        factorValue: parseFloat(factorValue),
        unit,
        scope,
        region,
        source
      });
      setShowAddModal(false);
      setName('');
      setFactorValue('');
      fetchFactors();
    } catch (e: any) {
      alert(`Failed to add factor: ${e.message}`);
    }
  };

  const handleDeleteFactor = async (id: string) => {
    if (!window.confirm('Delete this custom emission factor?')) return;
    try {
      await api.delete(`/emission-factors/${id}`);
      fetchFactors();
    } catch (e) {}
  };

  const filtered = factors.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.activityType.toLowerCase().includes(search.toLowerCase());
    const matchScope = selectedScope === 'all' || f.scope === parseInt(selectedScope, 10);
    return matchSearch && matchScope;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Emission Factor Library</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified greenhouse gas emission coefficients referenced across baseline calculations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center shadow-lg shadow-emerald-500/20"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              Add Custom Factor
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search factors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs w-56"
            />
          </div>

          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="glass-input px-3 py-1.5 rounded-xl text-xs"
          >
            <option value="all" className="bg-slate-900">All Scopes</option>
            <option value="1" className="bg-slate-900">Scope 1 (Direct)</option>
            <option value="2" className="bg-slate-900">Scope 2 (Electricity)</option>
            <option value="3" className="bg-slate-900">Scope 3 (Supply Chain)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing {filtered.length} emission coefficients
        </div>
      </div>

      {/* Factors Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/60 text-slate-400 text-[10px] uppercase">
            <tr>
              <th className="p-3.5">Activity</th>
              <th className="p-3.5">Factor Name</th>
              <th className="p-3.5">Value</th>
              <th className="p-3.5">Unit</th>
              <th className="p-3.5">Scope</th>
              <th className="p-3.5">Region</th>
              <th className="p-3.5">Source Authority</th>
              {isAdmin && <th className="p-3.5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((f) => (
              <tr key={f._id} className="hover:bg-slate-800/30">
                <td className="p-3.5 font-bold text-white uppercase">{f.activityType}</td>
                <td className="p-3.5 font-medium text-slate-200">{f.name}</td>
                <td className="p-3.5 font-mono text-emerald-400 font-bold text-sm">{f.factorValue}</td>
                <td className="p-3.5 text-slate-400 font-mono">{f.unit}</td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    f.scope === 1 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    f.scope === 2 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    Scope {f.scope}
                  </span>
                </td>
                <td className="p-3.5">{f.region}</td>
                <td className="p-3.5 text-slate-400 truncate max-w-xs">{f.source}</td>
                {isAdmin && (
                  <td className="p-3.5 text-right">
                    {f.companyId && (
                      <button
                        onClick={() => handleDeleteFactor(f._id)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400"
                        title="Delete custom factor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Custom Factor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Add Custom Emission Factor</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateFactor} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Activity Category</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl"
                >
                  <option value="electricity" className="bg-slate-900">Electricity</option>
                  <option value="diesel" className="bg-slate-900">Diesel</option>
                  <option value="road_freight" className="bg-slate-900">Road Freight</option>
                  <option value="cotton" className="bg-slate-900">Cotton / Material</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Factor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. On-Site Solar Renewable PPA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Coefficient Value</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="e.g. 0.05"
                    value={factorValue}
                    onChange={(e) => setFactorValue(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Scope</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(parseInt(e.target.value, 10))}
                    className="glass-input w-full px-3 py-2 rounded-xl"
                  >
                    <option value={1} className="bg-slate-900">Scope 1</option>
                    <option value={2} className="bg-slate-900">Scope 2</option>
                    <option value={3} className="bg-slate-900">Scope 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Source Authority</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. ISO 14064 Verified Certificate"
                  className="glass-input w-full px-3 py-2 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                >
                  Save Factor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
