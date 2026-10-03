import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Table,
  BarChart3,
  Sliders,
  Sparkles,
  FileText,
  Layers,
  Cpu,
  Settings,
  ShieldCheck,
  LogOut,
  Leaf,
  Calendar,
  RefreshCw,
  Activity,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const MainLayout: React.FC = () => {
  const { user, company, currentPeriod, setCurrentPeriod, unitPreference, setUnitPreference, logout, isAdmin } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  // Period options (24 months)
  const periodOptions: string[] = [];
  const baseDate = new Date(2026, 7, 1);
  for (let i = 0; i < 24; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    periodOptions.push(p);
  }

  const handleSeedDemo = async () => {
    if (!window.confirm('Seed multi-year realistic demo activity data? This will populate 24 months of operational supply chain metrics.')) {
      return;
    }
    setSeeding(true);
    try {
      const resp = await api.post('/dashboard/seed-demo');
      setNotificationMsg(`Demo seeded: ${resp.data.data.recordsCreated} records across ${resp.data.data.periodsCovered} periods.`);
      setTimeout(() => setNotificationMsg(null), 5000);
      window.location.reload();
    } catch (e: any) {
      alert(`Seeding failed: ${e.response?.data?.error?.message || e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const navItems = [
    { to: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4 mr-3" /> },
    { to: '/app/data-entry', label: 'Data Entry', icon: <PlusCircle className="w-4 h-4 mr-3" /> },
    { to: '/app/history', label: 'Activity History', icon: <Table className="w-4 h-4 mr-3" /> },
    { to: '/app/analytics', label: 'Emission Analytics', icon: <BarChart3 className="w-4 h-4 mr-3" /> },
    { to: '/app/what-if', label: 'What-If Simulator', icon: <Sliders className="w-4 h-4 mr-3" /> },
    { to: '/app/ai-insights', label: 'AI Insights', icon: <Sparkles className="w-4 h-4 mr-3 text-cyan-400" /> },
    { to: '/app/reports', label: 'Compliance Reports', icon: <FileText className="w-4 h-4 mr-3" /> },
    { to: '/app/factors', label: 'Emission Factors', icon: <Layers className="w-4 h-4 mr-3" /> },
    { to: '/app/model', label: 'Model Intelligence', icon: <Cpu className="w-4 h-4 mr-3" /> },
    { to: '/app/settings', label: 'Settings', icon: <Settings className="w-4 h-4 mr-3" /> },
    ...(isAdmin ? [{ to: '/app/admin', label: 'Admin Panel', icon: <ShieldCheck className="w-4 h-4 mr-3 text-emerald-400" /> }] : []),
  ];

  return (
    <div className="flex h-screen bg-[#0B0F17] text-slate-100 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-800/80 bg-[#0F172A]/70 backdrop-blur-xl flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo & Brand */}
          <div className="p-6 border-b border-slate-800/60">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight flex items-center">
                  Carbon<span className="text-emerald-400">IQ</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Measure • Explain • Reduce</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Profile & Company Info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between mb-3">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-white truncate">{company?.name || 'Enterprise'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              {user?.role}
            </span>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-slate-400 border border-slate-700/60 text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOPBAR */}
        <header className="h-16 border-b border-slate-800/80 bg-[#0F172A]/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
          {/* Left: Reporting Period Selector */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-slate-800/60 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 font-medium">Reporting Period:</span>
              <select
                value={currentPeriod}
                onChange={(e) => setCurrentPeriod(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                {periodOptions.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-white">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Preference Toggle */}
            <div className="flex items-center bg-slate-800/60 border border-slate-700/80 p-0.5 rounded-xl text-xs">
              <button
                onClick={() => setUnitPreference('t')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  unitPreference === 't' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                t CO2e
              </button>
              <button
                onClick={() => setUnitPreference('kg')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  unitPreference === 'kg' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                kg CO2e
              </button>
            </div>
          </div>

          {/* Right: Actions, Health & Status */}
          <div className="flex items-center space-x-3">
            {/* Quick Demo Seed Button */}
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
              title="Generate 24 months of demo activity data"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-cyan-400 ${seeding ? 'animate-spin' : ''}`} />
              {seeding ? 'Seeding Demo Data...' : 'Seed Demo Data'}
            </button>

            {/* Health Indicator Badge */}
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-medium">Core Active</span>
            </div>
          </div>
        </header>

        {/* Global Notification Banner */}
        {notificationMsg && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 px-6 py-2 text-xs flex items-center justify-between animate-fadeIn">
            <span>{notificationMsg}</span>
            <button onClick={() => setNotificationMsg(null)} className="text-emerald-400 hover:text-white font-bold ml-4">✕</button>
          </div>
        )}

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
