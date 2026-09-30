import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Filter,
  Clock,
  UserCheck,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { api } from '../../lib/api';
import { AuditLog } from '../../types/operations';

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (domainFilter !== 'ALL') {
        params.domain = domainFilter;
      }
      const data = await api.getAuditLogs(params);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [domainFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.actor && log.actor.toLowerCase().includes(term)) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(term)) ||
      (log.role && log.role.toLowerCase().includes(term))
    );
  });

  const getDomainColor = (domain?: string) => {
    switch (domain) {
      case 'EMERGENCY':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'EDUCATION':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'HEALTH':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <span>Government Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400">
            Immutable, timestamped record of all official actions, state transitions, allocations and approvals across all 3 domains.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, actor, entity ID, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Domain:</span>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Domains</option>
            <option value="EMERGENCY">Emergency Response</option>
            <option value="EDUCATION">Education Resources</option>
            <option value="HEALTH">Health Resources</option>
            <option value="SYSTEM">System & Config</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Officer / Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  let parsedDetails: any = null;
                  try {
                    parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                  } catch (e) {
                    parsedDetails = log.details;
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDomainColor(log.domain)}`}>
                          {log.domain || 'SYSTEM'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">{log.action}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-indigo-400">{log.entity_id || log.entity_type}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-300">{log.actor || 'System'}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{log.role || '-'}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                        {parsedDetails ? JSON.stringify(parsedDetails) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
