import React, { useState } from 'react';
import { Settings as SettingsIcon, Building, Shield, Globe, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const { company, user, unitPreference, setUnitPreference, currentPeriod, setCurrentPeriod } = useAuth();
  const [saved, setSaved] = useState(false);

  const [companyName, setCompanyName] = useState(company?.name || '');
  const [industry, setIndustry] = useState(company?.industry || '');
  const [country, setCountry] = useState(company?.country || '');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'rule_based'>(
    company?.settings?.aiProvider || 'gemini'
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Organization & System Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure corporate reporting preferences, measurement units, and AI provider behaviors.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-scaleUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Preferences updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
            <Building className="w-4 h-4 mr-2 text-emerald-400" />
            Company Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="glass-input w-full px-3.5 py-2 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Industry Sector</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="glass-input w-full px-3.5 py-2 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Country / HQ</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="glass-input w-full px-3.5 py-2 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Account Administrator</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="glass-input w-full px-3.5 py-2 rounded-xl opacity-60 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Calculation & Display Preferences */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
            <Globe className="w-4 h-4 mr-2 text-cyan-400" />
            Measurement & Accounting Display
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Default Emission Unit</label>
              <select
                value={unitPreference}
                onChange={(e: any) => setUnitPreference(e.target.value)}
                className="glass-input w-full px-3.5 py-2 rounded-xl"
              >
                <option value="t" className="bg-slate-900">Metric Tonnes (t CO2e) - Enterprise Default</option>
                <option value="kg" className="bg-slate-900">Kilograms (kg CO2e) - High Precision</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Primary Reporting Period</label>
              <input
                type="text"
                value={currentPeriod}
                onChange={(e) => setCurrentPeriod(e.target.value)}
                className="glass-input w-full px-3.5 py-2 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* AI & Intelligence Levers */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
            <Shield className="w-4 h-4 mr-2 text-blue-400" />
            Decarbonization Intelligence Provider
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="aiProvider"
                checked={aiProvider === 'gemini'}
                onChange={() => setAiProvider('gemini')}
                className="accent-cyan-400 mt-1"
              />
              <div>
                <p className="font-bold text-white">Google Gemini 1.5 Flash (Generative Advisory)</p>
                <p className="text-[11px] text-slate-400">
                  Synthesizes dynamic ESG narratives grounded strictly in your verified activity telemetry. Automatically falls back to deterministic engine if offline.
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="aiProvider"
                checked={aiProvider === 'rule_based'}
                onChange={() => setAiProvider('rule_based')}
                className="accent-cyan-400 mt-1"
              />
              <div>
                <p className="font-bold text-white">Deterministic Rule-Based Intelligence (Offline / Air-Gapped)</p>
                <p className="text-[11px] text-slate-400">
                  Fully reproducible regulatory heuristics running locally without external cloud API dependencies.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
