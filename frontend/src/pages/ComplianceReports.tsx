import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Layers,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatEmissions } from '../services/api';
import { ReportItem } from '../types';

export const ComplianceReports: React.FC = () => {
  const { currentPeriod, unitPreference } = useAuth();

  const [framework, setFramework] = useState<'SEBI BRSR' | 'EU CSRD'>('SEBI BRSR');
  const [period, setPeriod] = useState<string>(currentPeriod);
  const [generating, setGenerating] = useState<boolean>(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [latestGenerated, setLatestGenerated] = useState<ReportItem | null>(null);

  const fetchReports = async () => {
    try {
      const resp = await api.get('/reports');
      setReports(resp.data.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async () => {
    setGenerating(true);
    setLatestGenerated(null);
    try {
      const resp = await api.post('/reports/generate', {
        period,
        framework
      });
      setLatestGenerated(resp.data.data);
      fetchReports();
    } catch (err: any) {
      alert(`Report compilation failed: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Delete this compliance report from company archive?')) return;
    try {
      await api.delete(`/reports/${id}`);
      fetchReports();
    } catch (e) {}
  };

  const handleDownload = (report: ReportItem) => {
    const token = localStorage.getItem('carboniq_token');
    // Trigger browser download via native link with token or direct GET
    window.open(`/api/reports/${report.fileName}/download?token=${token}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Regulatory Compliance & ESG Reporting</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Generate publication-grade PDF summaries structured around SEBI BRSR and EU CSRD reporting regimes.
        </p>
      </div>

      {/* Generator Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
          <FileText className="w-4 h-4 mr-2 text-emerald-400" />
          Compile Submission-Ready Compliance Document
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Framework Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              Target Disclosure Framework
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  framework === 'SEBI BRSR'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-md shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">SEBI BRSR</span>
                  <input
                    type="radio"
                    name="framework"
                    checked={framework === 'SEBI BRSR'}
                    onChange={() => setFramework('SEBI BRSR')}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">India ESG Principle 6 Environmental Disclosure</p>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  framework === 'EU CSRD'
                    ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-md shadow-cyan-500/10'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">EU CSRD</span>
                  <input
                    type="radio"
                    name="framework"
                    checked={framework === 'EU CSRD'}
                    onChange={() => setFramework('EU CSRD')}
                    className="accent-cyan-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">European Sustainability Directive (E1 Climate Standard)</p>
              </label>
            </div>
          </div>

          {/* Period Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              Reporting Target Period
            </label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="YYYY-MM (e.g. 2026-08)"
              className="glass-input w-full px-3.5 py-3 rounded-2xl text-xs font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-2">
              The compiled PDF includes vector Scope charts, baseline reconciliation, SHAP driver diagnostics, and formal audit sign-offs.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <p className="text-[11px] text-slate-400">
            Rendered natively via Python ReportLab vector graphics engine.
          </p>
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                Compiling Vector PDF...
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 mr-2" />
                Compile & Download PDF Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Report Toast Card */}
      {latestGenerated && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs animate-scaleUp">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-white">{latestGenerated.fileName}</p>
              <p className="text-[11px] text-emerald-400">
                PDF successfully generated and stored in organization compliance vault.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDownload(latestGenerated)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center shadow-md"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download PDF
          </button>
        </div>
      )}

      {/* Historical Reports Archive */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Historical Compliance Reports Vault</h3>

        {reports.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No compliance reports compiled yet. Use the tool above to generate your first document.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Framework</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Total Footprint</th>
                  <th className="p-3">Generated Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reports.map((rep) => (
                  <tr key={rep._id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-white truncate max-w-xs">{rep.fileName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rep.framework.includes('BRSR') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'
                      }`}>
                        {rep.framework}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">{rep.period}</td>
                    <td className="p-3 font-mono font-bold text-slate-200">{formatEmissions(rep.totalKg, unitPreference)}</td>
                    <td className="p-3 text-slate-400">{new Date(rep.generatedAt).toLocaleDateString()}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleDownload(rep)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold inline-flex items-center"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> Download
                      </button>
                      <button
                        onClick={() => handleDeleteReport(rep._id)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400"
                        title="Delete report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
