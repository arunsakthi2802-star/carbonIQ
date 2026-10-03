import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  PieChart as PieIcon,
  Layers,
  MapPin,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api, formatEmissions } from '../services/api';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const EmissionAnalytics: React.FC = () => {
  const { currentPeriod, unitPreference } = useAuth();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [trendResp, actResp] = await Promise.all([
        api.get('/dashboard/trend'),
        api.get(`/activity-entries?limit=100&period=${currentPeriod}`)
      ]);
      setTimeline(trendResp.data.data.timeline || []);
      setActivities(actResp.data.data.entries || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [currentPeriod]);

  // Aggregate by Activity Type
  const activityAgg: Record<string, number> = {};
  const regionalAgg: Record<string, number> = {};
  const supplierAgg: Record<string, number> = {};

  activities.forEach((a) => {
    const act = a.activityType;
    const kg = a.correctedKg || a.baselineKg || 0;
    activityAgg[act] = (activityAgg[act] || 0) + kg;

    const reg = a.region || 'IN';
    regionalAgg[reg] = (regionalAgg[reg] || 0) + kg;

    if (a.supplierId) {
      supplierAgg[a.supplierId] = (supplierAgg[a.supplierId] || 0) + kg;
    }
  });

  const activityBarData = Object.entries(activityAgg).map(([k, v]) => ({
    name: k.replace('_', ' ').toUpperCase(),
    tonnes: Math.round((v / 1000) * 100) / 100
  }));

  const regionalBarData = Object.entries(regionalAgg).map(([k, v]) => ({
    region: k,
    tonnes: Math.round((v / 1000) * 100) / 100
  }));

  const supplierBarData = Object.entries(supplierAgg).map(([k, v]) => ({
    supplier: k,
    tonnes: Math.round((v / 1000) * 100) / 100
  }));

  const exportCsvData = () => {
    let csv = "Period,Scope1_Kg,Scope2_Kg,Scope3_Kg,Total_Kg\n";
    timeline.forEach(t => {
      csv += `${t.period},${t.scope1Kg},${t.scope2Kg},${t.scope3Kg},${t.totalKg}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carboniq_emissions_timeline_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
  };

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Emissions Deep-Dive Analytics</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-sectional breakdown of emissions by operational scope, region, logistics corridors, and suppliers.
          </p>
        </div>

        <button
          onClick={exportCsvData}
          className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
        >
          <Download className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
          Export Timeline CSV
        </button>
      </div>

      {/* Grid: Activity and Region */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Distribution */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
            Emissions by Activity Category (t CO2e)
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Bar dataKey="tonnes" name="Emissions (t CO2e)" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regional Distribution */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
            Regional Grid & Geographic Distribution (t CO2e)
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="region" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Bar dataKey="tonnes" name="Emissions (t CO2e)" fill="#06B6D4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Supplier Footprint Ranking */}
      {supplierBarData.length > 0 && (
        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
            Supplier Scope 3 Carbon Intensity Ranking
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierBarData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis dataKey="supplier" type="category" stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Bar dataKey="tonnes" name="Emissions (t CO2e)" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
