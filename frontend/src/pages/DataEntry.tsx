import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Download,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatEmissions } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const DataEntry: React.FC = () => {
  const { currentPeriod, unitPreference } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual');

  // Manual Form State
  const [activityType, setActivityType] = useState<'electricity' | 'diesel' | 'road_freight' | 'cotton'>('electricity');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string>('kWh');
  const [region, setRegion] = useState<string>('IN');
  const [equipmentAgeYears, setEquipmentAgeYears] = useState<string>('5');
  const [cargoWeightTons, setCargoWeightTons] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [facility, setFacility] = useState<string>('Primary Site');
  const [department, setDepartment] = useState<string>('Operations');
  const [notes, setNotes] = useState<string>('');
  const [period, setPeriod] = useState<string>(currentPeriod);
  const [submitting, setSubmitting] = useState(false);
  const [successModalData, setSuccessModalData] = useState<any | null>(null);

  // CSV Upload State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewAccepted, setPreviewAccepted] = useState<any[]>([]);
  const [previewRejected, setPreviewRejected] = useState<any[]>([]);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [csvSuccessSummary, setCsvSuccessSummary] = useState<any | null>(null);

  // Update unit default on activity change
  const handleActivityChange = (act: any) => {
    setActivityType(act);
    if (act === 'electricity') setUnit('kWh');
    else if (act === 'diesel') setUnit('litre');
    else if (act === 'road_freight') setUnit('km');
    else if (act === 'cotton') setUnit('kg');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const resp = await api.post('/activity-entries', {
        activityType,
        quantity: parseFloat(quantity),
        unit,
        region,
        equipmentAgeYears: parseFloat(equipmentAgeYears) || 0,
        cargoWeightTons: activityType === 'road_freight' ? parseFloat(cargoWeightTons) : 0,
        supplierId,
        facility,
        department,
        notes,
        period
      });

      setSuccessModalData(resp.data.data);
      // Reset quantity
      setQuantity('');
      if (activityType === 'road_freight') setCargoWeightTons('');
    } catch (err: any) {
      alert(`Submission failed: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Parsing with PapaParse
  const handleFileDrop = (file: File) => {
    setCsvFile(file);
    setCsvSuccessSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        setParsedRows(rows);

        const accepted: any[] = [];
        const rejected: any[] = [];

        rows.forEach((r, idx) => {
          const actRaw = String(r.activityType || r.activity_type || r.activity || '').toLowerCase().trim();
          let act = actRaw;
          if (['freight', 'transport', 'road freight'].includes(act)) act = 'road_freight';
          if (['material', 'raw_material'].includes(act)) act = 'cotton';

          const qty = parseFloat(r.quantity || r.qty);
          const cargo = parseFloat(r.cargoWeightTons || r.cargo_weight_tons || r.cargo_weight || 0);

          if (!['electricity', 'diesel', 'road_freight', 'cotton'].includes(act)) {
            rejected.push({ row: idx + 1, reason: `Unknown activity type '${actRaw}'` });
          } else if (isNaN(qty) || qty <= 0) {
            rejected.push({ row: idx + 1, reason: 'Invalid or non-positive quantity' });
          } else if (act === 'road_freight' && (isNaN(cargo) || cargo <= 0)) {
            rejected.push({ row: idx + 1, reason: 'Road freight requires positive cargo weight' });
          } else {
            accepted.push({
              ...r,
              activityType: act,
              quantity: qty,
              cargoWeightTons: cargo,
              period: r.period || currentPeriod
            });
          }
        });

        setPreviewAccepted(accepted);
        setPreviewRejected(rejected);
      }
    });
  };

  const handleCsvUploadSubmit = async () => {
    if (previewAccepted.length === 0) return;
    setUploadingCsv(true);
    try {
      const resp = await api.post('/activity-entries/bulk', {
        rows: previewAccepted,
        defaultPeriod: currentPeriod
      });
      setCsvSuccessSummary(resp.data.data);
      setParsedRows([]);
      setPreviewAccepted([]);
      setPreviewRejected([]);
      setCsvFile(null);
    } catch (err: any) {
      alert(`CSV Upload failed: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setUploadingCsv(false);
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,period,activityType,quantity,unit,region,equipmentAgeYears,cargoWeightTons,supplierId,facility,department,notes\n" +
      "2026-08,electricity,25000,kWh,IN,5,0,SUP-ENERGY-88,Bengaluru Tech Hub,Operations,Grid power draw\n" +
      "2026-08,diesel,2600,litre,IN,12,0,SUP-GLOBAL-101,Chennai SCM Center,Backup Power,Diesel genset\n" +
      "2026-08,road_freight,650,km,IN,8,18.5,SUP-LOGISTICS-404,Mumbai Port Facility,Logistics,Container haulage\n" +
      "2026-08,cotton,1800,kg,IN,4,0,SUP-TEXTILE-77,Pune Assembly Plant,Procurement,Raw cotton yarn consignment\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "carboniq_activity_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Data Entry & Ingestion</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log single operational activity entries or ingest batch consignment logs via CSV.
          </p>
        </div>

        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'csv' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bulk CSV Upload
          </button>
        </div>
      </div>

      {/* TAB 1: MANUAL ACTIVITY FORM */}
      {activeTab === 'manual' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl">
          <form onSubmit={handleManualSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Activity Type */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Activity Category</label>
                <select
                  value={activityType}
                  onChange={(e) => handleActivityChange(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold"
                >
                  <option value="electricity" className="bg-slate-900">Grid Electricity (Scope 2)</option>
                  <option value="diesel" className="bg-slate-900">Diesel Stationary & Fleet (Scope 1)</option>
                  <option value="road_freight" className="bg-slate-900">Heavy Road Freight Transport (Scope 3)</option>
                  <option value="cotton" className="bg-slate-900">Raw Cotton / Textile Materials (Scope 3)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Baseline Factor: {activityType === 'electricity' ? '0.82 kg CO2e/kWh' : activityType === 'diesel' ? '2.68 kg CO2e/L' : activityType === 'road_freight' ? '0.14 kg CO2e/ton-km' : '5.90 kg CO2e/kg'}
                </p>
              </div>

              {/* Reporting Period */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Target Reporting Period</label>
                <input
                  type="text"
                  required
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="YYYY-MM (e.g. 2026-08)"
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Quantity ({activityType === 'road_freight' ? 'Distance in km' : unit})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 1500"
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Unit</label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Region */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Region / Grid Mix</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                >
                  <option value="IN" className="bg-slate-900">India (IN)</option>
                  <option value="US" className="bg-slate-900">United States (US)</option>
                  <option value="EU" className="bg-slate-900">European Union (EU)</option>
                  <option value="CN" className="bg-slate-900">China (CN)</option>
                  <option value="GLOBAL" className="bg-slate-900">Global Average</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Equipment Age */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Equipment Age (Years)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="35"
                  value={equipmentAgeYears}
                  onChange={(e) => setEquipmentAgeYears(e.target.value)}
                  placeholder="e.g. 12"
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Ages &gt; 8 yrs trigger ML degradation adjustment</span>
              </div>

              {/* Cargo Weight (for freight) */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${activityType === 'road_freight' ? 'text-amber-400' : 'text-slate-500'}`}>
                  Cargo Weight (Tons) {activityType === 'road_freight' && '*'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  disabled={activityType !== 'road_freight'}
                  required={activityType === 'road_freight'}
                  value={cargoWeightTons}
                  onChange={(e) => setCargoWeightTons(e.target.value)}
                  placeholder={activityType === 'road_freight' ? 'e.g. 18.5' : 'N/A for non-freight'}
                  className={`glass-input w-full px-3.5 py-2.5 rounded-xl text-xs ${activityType !== 'road_freight' ? 'opacity-40 cursor-not-allowed' : 'font-bold'}`}
                />
              </div>

              {/* Supplier ID */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Supplier ID (Optional)</label>
                <input
                  type="text"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  placeholder="e.g. SUP-GLOBAL-101"
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Optional Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Facility / Site</label>
                <input
                  type="text"
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  placeholder="e.g. Chennai Plant"
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Supply Chain"
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly meter reading"
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {submitting ? 'Recording & Orchestrating Calculation...' : 'Record Activity & Calculate'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: BULK CSV UPLOAD ZONE */}
      {activeTab === 'csv' && (
        <div className="space-y-6">
          <div className="glass-panel p-8 rounded-3xl border border-dashed border-slate-700/80 text-center relative group">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileDrop(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Drag and drop activity CSV file here</h3>
            <p className="text-xs text-slate-400 mb-4">Supports headers: period, activityType, quantity, unit, region, equipmentAgeYears, cargoWeightTons, supplierId</p>
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              Download Official CSV Template
            </button>
          </div>

          {/* CSV File Status & Preview */}
          {csvFile && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">{csvFile.name}</span>
                  <span className="text-[11px] text-slate-400">({parsedRows.length} total rows)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {previewAccepted.length} Valid
                  </span>
                  {previewRejected.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {previewRejected.length} Errors
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-2">Period</th>
                      <th className="p-2">Activity</th>
                      <th className="p-2">Quantity</th>
                      <th className="p-2">Unit</th>
                      <th className="p-2">Region</th>
                      <th className="p-2">Equip Age</th>
                      <th className="p-2">Cargo Tons</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {previewAccepted.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="p-2 font-mono text-slate-300">{r.period}</td>
                        <td className="p-2 font-semibold text-white">{r.activityType}</td>
                        <td className="p-2 font-mono">{r.quantity}</td>
                        <td className="p-2 text-slate-400">{r.unit}</td>
                        <td className="p-2">{r.region}</td>
                        <td className="p-2">{r.equipmentAgeYears}y</td>
                        <td className="p-2">{r.cargoWeightTons || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewRejected.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <p className="font-semibold mb-1">Rejected Rows:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {previewRejected.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleCsvUploadSubmit}
                  disabled={uploadingCsv || previewAccepted.length === 0}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {uploadingCsv ? 'Ingesting & Batch Recalculating...' : `Ingest ${previewAccepted.length} Valid Records`}
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Success summary after CSV import */}
          {csvSuccessSummary && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm">Batch Ingestion Complete!</span>
              </div>
              <p>Successfully inserted {csvSuccessSummary.acceptedCount} operational records and recalculated affected periods: <b>{csvSuccessSummary.affectedPeriods.join(', ')}</b>.</p>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/app/dashboard')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  View Dashboard Analytics →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CALCULATION SUMMARY AUDIT MODAL */}
      {successModalData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-emerald-500/40 shadow-2xl relative animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Calculation Audit Summary</h3>
              </div>
              <button
                onClick={() => setSuccessModalData(null)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <p className="text-slate-400">Activity: <b className="text-white uppercase">{successModalData.entry.activityType}</b></p>
                <p className="text-slate-400">Quantity: <b className="text-white">{successModalData.entry.quantity} {successModalData.entry.unit}</b></p>
                <p className="text-slate-400">Baseline Calculation: <b className="text-emerald-400">{successModalData.entry.baselineKg} kg CO2e</b></p>
                <p className="text-slate-400">ML Corrected Estimate: <b className="text-cyan-400">{successModalData.entry.correctedKg} kg CO2e</b></p>
              </div>

              {successModalData.periodSummary && (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <p className="font-semibold text-slate-300 mb-1">Updated Period ({successModalData.entry.period}) Totals:</p>
                  <p className="text-slate-400">Scope 1: {formatEmissions(successModalData.periodSummary.scope1Kg, unitPreference)}</p>
                  <p className="text-slate-400">Scope 2: {formatEmissions(successModalData.periodSummary.scope2Kg, unitPreference)}</p>
                  <p className="text-slate-400">Scope 3: {formatEmissions(successModalData.periodSummary.scope3Kg, unitPreference)}</p>
                  <p className="text-white font-bold pt-1 border-t border-slate-800">
                    Total: {formatEmissions(successModalData.periodSummary.totalKg, unitPreference)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setSuccessModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
              >
                Record Another
              </button>
              <button
                onClick={() => navigate('/app/dashboard')}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
