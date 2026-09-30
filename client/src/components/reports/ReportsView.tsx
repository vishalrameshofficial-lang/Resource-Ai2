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
      // Trigger download
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
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <span>Government Operations Reporting</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Generate and export official audit-compliant reports from real verified database records across all three operational domains.
        </p>
      </div>

      {/* Domain Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setDomain('emergency')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            domain === 'emergency'
              ? 'bg-red-950/30 border-red-500/50 shadow-lg shadow-red-950/20'
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Emergency Response</h3>
              <span className="text-[10px] text-slate-400">Exotel calls & incidents</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Export caller records, incident severity, geolocations, detected languages, and relief dispatch status.
          </p>
        </div>

        <div
          onClick={() => setDomain('education')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            domain === 'education'
              ? 'bg-blue-950/30 border-blue-500/50 shadow-lg shadow-blue-950/20'
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Education Resources</h3>
              <span className="text-[10px] text-slate-400">School & college petitions</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Export institution petitions, classroom/lab requirements, approvals, inventory deductions, and delivery confirmations.
          </p>
        </div>

        <div
          onClick={() => setDomain('health')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            domain === 'health'
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Health Resources</h3>
              <span className="text-[10px] text-slate-400">Hospital & medicine requisitions</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Export hospital requisitions, ICU bed demands, medicine stock dispatch orders, and medical audit histories.
          </p>
        </div>
      </div>

      {/* Export Options Box */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export Configuration — {domain.toUpperCase()}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Export File Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
            >
              <option value="csv">CSV (Comma-Separated Spreadsheet)</option>
              <option value="json">JSON (Structured Data Format)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Start Date (Optional)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">End Date (Optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-center space-x-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Government Compliance Notice: This export query runs directly against official SQLite database records. An audit log entry will be recorded for this export.
          </span>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating Report...' : `Export ${domain.toUpperCase()} Report`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
