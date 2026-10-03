import React, { useEffect, useState } from 'react';
import {
  Flame,
  Zap,
  Truck,
  Globe2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Cpu,
  Layers,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api, formatEmissions } from '../services/api';
import { KpiCard } from '../components/common/KpiCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { CalculationResult, ExplainabilityResult, DecarbonizationInsight } from '../types';
import { useNavigate } from 'react-router-dom';

const SCOPE_COLORS = ['#F59E0B', '#3B82F6', '#10B981'];

export const Dashboard: React.FC = () => {
  const { currentPeriod, unitPreference } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<CalculationResult | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [explainability, setExplainability] = useState<ExplainabilityResult | null>(null);
  const [insights, setInsights] = useState<DecarbonizationInsight | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumResp, trendResp] = await Promise.all([
        api.get(`/dashboard/summary?period=${currentPeriod}`),
        api.get('/dashboard/trend')
      ]);

      setSummary(sumResp.data.data.summary);
      setComparison(sumResp.data.data.comparison);
      setExplainability(sumResp.data.data.explainability);
      setInsights(sumResp.data.data.insights);
      setTimeline(trendResp.data.data.timeline || []);
    } catch (e: any) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentPeriod]);

  if (loading) {
    return <LoadingSkeleton rows={5} />;
  }

  const hasData = summary && summary.totalKg > 0;

  if (!hasData) {
    return (
      <EmptyState
        title={`No emissions records found for ${currentPeriod}`}
        description="Enter manual activity readings, upload a CSV consignment log, or seed the 24-month demo dataset to explore CarbonIQ intelligence."
        onAddClick={() => navigate('/app/data-entry')}
        onSeedClick={async () => {
          await api.post('/dashboard/seed-demo');
          window.location.reload();
        }}
      />
    );
  }

  const totalKg = summary.totalKg || 1;
  const s1Pct = Math.round((summary.scope1Kg / totalKg) * 100);
  const s2Pct = Math.round((summary.scope2Kg / totalKg) * 100);
  const s3Pct = Math.round((summary.scope3Kg / totalKg) * 100);

  const scopePieData = [
    { name: 'Scope 1 (Direct Fuel)', value: summary.scope1Kg, color: '#F59E0B' },
    { name: 'Scope 2 (Electricity)', value: summary.scope2Kg, color: '#3B82F6' },
    { name: 'Scope 3 (Supply Chain)', value: summary.scope3Kg, color: '#10B981' }
  ];

  const breakdownBarData = Object.entries(summary.breakdown || {}).map(([key, val]) => ({
    activity: key.replace('_', ' ').toUpperCase(),
    percentage: val
  }));

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Emissions Analytics & Intelligence</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Period {currentPeriod}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational greenhouse gas telemetry, machine learning corrections, and explainable AI diagnostics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/app/reports')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
          >
            Generate Compliance PDF
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Scope 1 (Direct Fuels)"
          value={formatEmissions(summary.scope1Kg, unitPreference)}
          subValue={`${s1Pct}% of total corporate emissions`}
          icon={<Flame className="w-5 h-5" />}
          accentColor="amber"
          tooltip="Direct emissions from stationary combustion and captive diesel fleet."
        />

        <KpiCard
          title="Scope 2 (Electricity)"
          value={formatEmissions(summary.scope2Kg, unitPreference)}
          subValue={`${s2Pct}% of total corporate emissions`}
          icon={<Zap className="w-5 h-5" />}
          accentColor="blue"
          tooltip="Indirect emissions from purchased utility electricity grid consumption."
        />

        <KpiCard
          title="Scope 3 (Supply Chain)"
          value={formatEmissions(summary.scope3Kg, unitPreference)}
          subValue={`${s3Pct}% of total corporate emissions`}
          icon={<Truck className="w-5 h-5" />}
          accentColor="emerald"
          tooltip="Upstream freight transport and raw material lifecycle emissions."
        />

        <KpiCard
          title="Total Footprint (ML-Corrected)"
          value={formatEmissions(summary.totalKg, unitPreference)}
          subValue={`Model adjustment: ${summary.adjustmentPct > 0 ? '+' : ''}${summary.adjustmentPct.toFixed(1)}%`}
          changePct={comparison?.changePct}
          changeLabel="vs previous period"
          icon={<Globe2 className="w-5 h-5" />}
          accentColor="cyan"
          tooltip="Audited total emissions combining baseline factors with XGBoost degradation model."
        />
      </div>

      {/* SECONDARY RECONCILIATION AUDIT ROW */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-300">Calculation Reconciliation:</span>
            <span className="text-slate-400">Baseline Estimate:</span>
            <span className="font-bold text-white">{formatEmissions(summary.baselineTotalKg, unitPreference)}</span>
            <span className="text-slate-400 mx-1">→</span>
            <span className="text-slate-400">ML Adjustment:</span>
            <span className={`font-bold ${summary.adjustmentKg >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {summary.adjustmentKg >= 0 ? '+' : ''}{formatEmissions(summary.adjustmentKg, unitPreference)} ({summary.adjustmentPct > 0 ? '+' : ''}{summary.adjustmentPct.toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Model: CarbonIQ-XGB v{summary.modelVersion}</span>
            <span>•</span>
            <span>Factor Engine: GHG Protocol / CEA Hybrid</span>
          </div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scope Donut Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Scope Distribution</h3>
            <span className="text-[11px] text-slate-400">{summary.activityCount} Recorded Activities</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scopePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {scopePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0F172A" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatEmissions(Number(val), unitPreference), 'Emissions']}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-800 text-center">
            <div>
              <p className="text-[10px] text-amber-400 font-bold">Scope 1</p>
              <p className="text-xs font-semibold text-white">{s1Pct}%</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-400 font-bold">Scope 2</p>
              <p className="text-xs font-semibold text-white">{s2Pct}%</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-400 font-bold">Scope 3</p>
              <p className="text-xs font-semibold text-white">{s3Pct}%</p>
            </div>
          </div>
        </div>

        {/* 24-Month Trend Line Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Multi-Period Decarbonization Timeline</h3>
              <p className="text-[11px] text-slate-400">Historical Scope 1, 2, and 3 trajectory over 24 months (t CO2e)</p>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScope3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorScope2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="period" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="totalTonnes" name="Total (t CO2e)" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorScope3)" />
                <Area type="monotone" dataKey="scope2Tonnes" name="Scope 2 Electricity" stroke="#3B82F6" strokeWidth={1.5} fillOpacity={1} fill="url(#colorScope2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SHAP EXPLAINABLE AI DIAGNOSTICS SECTION */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 mb-6 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white tracking-tight">Explainable AI (SHAP) Diagnostics</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                TreeExplainer Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Decomposing the machine learning adjustment into mathematically auditable physical drivers.
            </p>
          </div>
        </div>

        {/* SHAP Drivers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(explainability?.topFactors || []).slice(0, 6).map((factor, idx) => (
            <div key={idx} className="glass-card p-4 rounded-xl border border-slate-800/80 bg-slate-900/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">{factor.label || factor.feature}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  factor.direction === 'positive'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {factor.direction === 'positive' ? '▲' : '▼'} {factor.contributionPct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${factor.direction === 'positive' ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, factor.contributionPct * 1.5)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">{factor.plainLanguage}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI DECARBONIZATION INSIGHTS */}
      {insights && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Sustainability Advisor Insights</h3>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
              Source: <b className="text-emerald-400">{insights.source}</b>
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-5 leading-relaxed bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
            {insights.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hotspots */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Detected Hotspots
              </h4>
              {(insights.hotspots || []).map((h, i) => (
                <div key={i} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs">
                  <p className="font-semibold text-white">{h.category}</p>
                  <p className="text-[11px] text-rose-300 font-mono mt-0.5">{h.metric}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{h.detail}</p>
                </div>
              ))}
            </div>

            {/* Opportunities */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                Decarbonization Levers
              </h4>
              {(insights.opportunities || []).map((o, i) => (
                <div key={i} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                  <p className="font-semibold text-white">{o.title}</p>
                  <p className="text-[11px] text-emerald-400 font-medium mt-0.5">{o.impact}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{o.description}</p>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Recommended Actions
              </h4>
              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs space-y-2">
                {(insights.recommendedActions || []).map((act, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <span className="text-[11px] text-slate-300">{act}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
