import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  TrendingDown,
  Save,
  Trash2,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api, formatEmissions } from '../services/api';
import { WhatIfScenario } from '../types';

export const WhatIfSimulator: React.FC = () => {
  const { currentPeriod, unitPreference } = useAuth();

  // Slider adjustments in percentages (0 to 100)
  const [roadFreightPct, setRoadFreightPct] = useState<number>(30);
  const [dieselPct, setDieselPct] = useState<number>(15);
  const [electricityPct, setElectricityPct] = useState<number>(20);
  const [cottonPct, setCottonPct] = useState<number>(10);

  const [simResult, setSimResult] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [scenarioName, setScenarioName] = useState<string>('');
  const [savedScenarios, setSavedScenarios] = useState<WhatIfScenario[]>([]);
  const [saving, setSaving] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const resp = await api.post('/whatif', {
        period: currentPeriod,
        adjustments: {
          road_freight: -(roadFreightPct / 100),
          diesel: -(dieselPct / 100),
          electricity: -(electricityPct / 100),
          cotton: -(cottonPct / 100)
        }
      });
      setSimResult(resp.data.data);
    } catch (e: any) {
      console.error('Simulation error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedScenarios = async () => {
    try {
      const resp = await api.get('/whatif');
      setSavedScenarios(resp.data.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    runSimulation();
    fetchSavedScenarios();
  }, [roadFreightPct, dieselPct, electricityPct, cottonPct, currentPeriod]);

  const handleApplyPreset = (freight: number, diesel: number, elec: number, cotton: number, name: string) => {
    setRoadFreightPct(freight);
    setDieselPct(diesel);
    setElectricityPct(elec);
    setCottonPct(cotton);
    setScenarioName(name);
  };

  const handleSaveScenario = async () => {
    if (!scenarioName.trim() || !simResult) return;
    setSaving(true);
    try {
      await api.post('/whatif/save', {
        scenarioName: scenarioName.trim(),
        period: currentPeriod,
        changes: {
          road_freight: roadFreightPct,
          diesel: dieselPct,
          electricity: electricityPct,
          cotton: cottonPct
        },
        currentBaselineTotalKg: simResult.currentBaselineTotalKg,
        currentCorrectedTotalKg: simResult.currentCorrectedTotalKg,
        projectedBaselineTotalKg: simResult.projectedBaselineTotalKg,
        projectedTotalKg: simResult.projectedTotalKg,
        savingsKg: simResult.savingsKg,
        savingsTonnes: simResult.savingsTonnes,
        reductionPct: simResult.reductionPct
      });
      setScenarioName('');
      fetchSavedScenarios();
    } catch (e: any) {
      alert(`Could not save scenario: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    try {
      await api.delete(`/whatif/${id}`);
      fetchSavedScenarios();
    } catch (e) {}
  };

  const chartData = simResult
    ? [
        {
          name: 'Baseline Accounting',
          Current: Math.round((simResult.currentBaselineTotalKg || 0) / 1000),
          Projected: Math.round((simResult.projectedBaselineTotalKg || 0) / 1000)
        },
        {
          name: 'ML-Corrected Footprint',
          Current: Math.round((simResult.currentCorrectedTotalKg || 0) / 1000),
          Projected: Math.round((simResult.projectedTotalKg || 0) / 1000)
        }
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Decarbonization What-If Simulator</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Model operational interventions across road logistics, fuels, grid power, and sourcing to quantify carbon abatement.
        </p>
      </div>

      {/* Preset Quick Selectors */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 mr-2">Decarbonization Presets:</span>
        <button
          onClick={() => handleApplyPreset(40, 20, 10, 0, 'Clean Logistics Corridor')}
          className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
        >
          Clean Logistics Corridor
        </button>
        <button
          onClick={() => handleApplyPreset(10, 0, 50, 0, 'Renewable Power PPA')}
          className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
        >
          Renewable Power PPA
        </button>
        <button
          onClick={() => handleApplyPreset(30, 30, 40, 20, 'Aggressive ESG Net-Zero 2030')}
          className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
        >
          Aggressive Net-Zero 2030
        </button>
        <button
          onClick={() => handleApplyPreset(0, 0, 0, 0, 'Reset')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs"
        >
          <RotateCcw className="w-3 h-3 inline mr-1" /> Reset
        </button>
      </div>

      {/* Main Grid: Controls + Live Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Panel */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
            <Sliders className="w-4 h-4 mr-2 text-emerald-400" />
            Operational Decarbonization Levers
          </h3>

          {/* Slider 1: Road Freight */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200">Road Freight Logistics Reduction</span>
              <span className="font-mono text-emerald-400 font-bold">-{roadFreightPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={roadFreightPct}
              onChange={(e) => setRoadFreightPct(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <p className="text-[10px] text-slate-400">Modal shift to electric rail & corridor consolidation</p>
          </div>

          {/* Slider 2: Diesel Fuel */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200">Diesel Fuel Combustion Reduction</span>
              <span className="font-mono text-amber-400 font-bold">-{dieselPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={dieselPct}
              onChange={(e) => setDieselPct(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <p className="text-[10px] text-slate-400">Captive fleet electrification and backup genset BESS</p>
          </div>

          {/* Slider 3: Grid Electricity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200">Grid Electricity Optimization</span>
              <span className="font-mono text-blue-400 font-bold">-{electricityPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={electricityPct}
              onChange={(e) => setElectricityPct(parseInt(e.target.value, 10))}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <p className="text-[10px] text-slate-400">Rooftop solar PPA and facility energy efficiency</p>
          </div>

          {/* Slider 4: Raw Material */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-200">Raw Material / Cotton Sourcing Reduction</span>
              <span className="font-mono text-cyan-400 font-bold">-{cottonPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={cottonPct}
              onChange={(e) => setCottonPct(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <p className="text-[10px] text-slate-400">Recycled fiber blending and lower-impact agriculture</p>
          </div>

          {/* Save Scenario Form */}
          <div className="pt-4 border-t border-slate-800 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Name this scenario (e.g. FY27 Rail Strategy)..."
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="glass-input flex-1 px-3 py-2 rounded-xl text-xs"
            />
            <button
              onClick={handleSaveScenario}
              disabled={saving || !scenarioName.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save
            </button>
          </div>
        </div>

        {/* Live Simulation Projection Cards */}
        <div className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Footprint</p>
              <h4 className="text-2xl font-extrabold text-white mt-1">
                {simResult ? formatEmissions(simResult.currentCorrectedTotalKg, unitPreference) : '—'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">Status quo operational intensity</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
              <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Projected Footprint</p>
              <h4 className="text-2xl font-extrabold text-emerald-400 mt-1">
                {simResult ? formatEmissions(simResult.projectedTotalKg, unitPreference) : '—'}
              </h4>
              <p className="text-[11px] text-emerald-300 font-semibold mt-1">
                {simResult ? `▼ -${simResult.reductionPct}% overall reduction` : '—'}
              </p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-slate-300">Absolute Abatement Potential:</span>
            </div>
            <span className="text-sm font-bold text-cyan-300">
              {simResult ? `${simResult.savingsTonnes} t CO2e (${simResult.savingsKg.toLocaleString()} kg)` : '0 t CO2e'}
            </span>
          </div>

          {/* Comparison Dual-Bar Chart */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Pathway Contrast (t CO2e)</h4>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Current" fill="#64748B" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Projected" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Scenarios Comparison Table */}
      {savedScenarios.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Saved Decarbonization Scenarios</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="p-3">Scenario Name</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Projected Total</th>
                  <th className="p-3">Total Savings</th>
                  <th className="p-3">Reduction %</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {savedScenarios.map((sc) => (
                  <tr key={sc._id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-white">{sc.scenarioName}</td>
                    <td className="p-3 font-mono text-slate-400">{sc.period}</td>
                    <td className="p-3 font-mono text-slate-200">{formatEmissions(sc.projectedTotalKg, unitPreference)}</td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">{sc.savingsTonnes} t CO2e</td>
                    <td className="p-3 font-semibold text-cyan-400">▼ -{sc.reductionPct}%</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteScenario(sc._id)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400"
                        title="Delete scenario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
