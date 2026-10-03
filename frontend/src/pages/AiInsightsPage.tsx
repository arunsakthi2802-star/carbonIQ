import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  RefreshCw,
  Cpu,
  ShieldCheck,
  TrendingDown,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DecarbonizationInsight } from '../types';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const AiInsightsPage: React.FC = () => {
  const { currentPeriod } = useAuth();
  const [insights, setInsights] = useState<DecarbonizationInsight | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`/ai/insights?period=${currentPeriod}`);
      setInsights(resp.data.data);
    } catch (e: any) {
      console.error('Error fetching insights:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [currentPeriod]);

  if (loading) {
    return <LoadingSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">AI Decarbonization Intelligence</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Contextual strategic narratives, hotspot detection, and actionable decarbonization pathways.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-medium text-slate-300">
            Source: <b className="text-emerald-400">{insights?.source || 'Rule-Based Fallback'}</b>
          </span>
          <button
            onClick={fetchInsights}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
            title="Refresh Insights"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Executive Summary Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative overflow-hidden">
        <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">
          <Cpu className="w-4 h-4" />
          <span>Executive Footprint Synthesis (Period {currentPeriod})</span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed font-sans">
          {insights?.summary || 'No data recorded for this period. Add activities to generate sustainability insights.'}
        </p>
      </div>

      {/* 3-Column Diagnostic Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hotspots */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Identified Hotspots</h3>
          </div>
          <div className="space-y-3">
            {(insights?.hotspots || []).map((h, i) => (
              <div key={i} className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-xs space-y-1">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-white">{h.category}</p>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">{h.priority}</span>
                </div>
                <p className="font-mono text-rose-300 text-[11px]">{h.metric}</p>
                <p className="text-slate-400 text-[11px] leading-relaxed pt-1">{h.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunities */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Lightbulb className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Decarbonization Levers</h3>
          </div>
          <div className="space-y-3">
            {(insights?.opportunities || []).map((o, i) => (
              <div key={i} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
                <p className="font-bold text-white">{o.title}</p>
                <p className="font-mono text-emerald-400 text-[11px] font-semibold">{o.impact}</p>
                <p className="text-slate-400 text-[11px] leading-relaxed pt-1">{o.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-cyan-400">
            <CheckCircle className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Action Plan</h3>
          </div>
          <div className="space-y-3">
            {(insights?.recommendedActions || []).map((act, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {i + 1}
                </span>
                <span className="text-slate-300 text-[11px] leading-relaxed">{act}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
