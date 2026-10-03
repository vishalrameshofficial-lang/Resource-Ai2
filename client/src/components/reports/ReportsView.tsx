import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  AlertTriangle,
  GraduationCap,
  HeartPulse,
  Calendar,
  CheckCircle,
  FileText
} from 'lucide-react';

export function ReportsView() {
  const [domain, setDomain] = useState<'emergency' | 'education' | 'health'>('emergency');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('domain', domain);
      params.append('format', format);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const downloadUrl = `/api/reports/export?${params.toString()}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Export failed or no records available');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ResourceAI_${domain.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <span>Government Operations Reporting</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Generate and export official audit-compliant reports from real verified database records across all three operational domains.
        </p>
      </div>

      {/* Domain Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setDomain('emergency')}
          className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between space-y-3 glass-card-3d ${
            domain === 'emergency'
              ? 'border-red-500 bg-rose-50/70 shadow-md ring-2 ring-red-400'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            {domain === 'emergency' && <CheckCircle className="w-4 h-4 text-red-600" />}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Emergency Response Domain</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Disaster telecommunication, triaged phone petitions & field dispatches.</p>
          </div>
        </button>

        <button
          onClick={() => setDomain('education')}
          className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between space-y-3 glass-card-3d ${
            domain === 'education'
              ? 'border-blue-500 bg-blue-50/70 shadow-md ring-2 ring-blue-400'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            {domain === 'education' && <CheckCircle className="w-4 h-4 text-blue-600" />}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Education Resources Domain</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">School/college infrastructure requests, facility inventory & fulfillment orders.</p>
          </div>
        </button>

        <button
          onClick={() => setDomain('health')}
          className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between space-y-3 glass-card-3d ${
            domain === 'health'
              ? 'border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-400'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
              <HeartPulse className="w-5 h-5" />
            </div>
            {domain === 'health' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Health Resources Domain</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Hospital supplies, clinical oxygen/ICU bed demand & medical logistics.</p>
          </div>
        </button>
      </div>

      {/* Export Configurations Panel */}
      <div className="glass-panel-3d p-6 rounded-2xl border border-slate-200 bg-white space-y-5 shadow-md">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Export Parameters & Format Configuration</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Export File Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition ${
                  format === 'csv'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                CSV Table (.csv)
              </button>
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition ${
                  format === 'json'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                JSON Data (.json)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Start Date (Optional)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">End Date (Optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Report includes full database schema fields, timestamp telemetry & audit IDs.</span>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition flex items-center space-x-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating Report...' : `Export ${domain.toUpperCase()} Report`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
