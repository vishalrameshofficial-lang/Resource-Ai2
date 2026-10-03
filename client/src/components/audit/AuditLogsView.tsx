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
        return 'text-rose-800 bg-rose-100 border-rose-300 font-bold';
      case 'EDUCATION':
        return 'text-blue-800 bg-blue-100 border-blue-300 font-bold';
      case 'HEALTH':
        return 'text-emerald-800 bg-emerald-100 border-emerald-300 font-bold';
      default:
        return 'text-slate-800 bg-slate-100 border-slate-300 font-bold';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm glass-panel-3d">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System Action & Audit Trail</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Immutable logging of state changes, government reference assignments, allocation status transitions, and user actions.
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center space-x-2 border border-slate-200 shadow-2xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Audit Trail:</span>
          </div>

          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Domains</option>
            <option value="EMERGENCY">Emergency Response</option>
            <option value="EDUCATION">Education Resources</option>
            <option value="HEALTH">Health Resources</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search action, actor, entity ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 font-bold placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing <strong>{filteredLogs.length}</strong> logged audit events
        </span>
      </div>

      {/* Audit Table */}
      <div className="glass-panel-3d rounded-2xl border border-slate-200 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Domain</th>
                <th className="py-3.5 px-4">Action Event</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Entity ID</th>
                <th className="py-3.5 px-4">Payload Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                    Loading audit trail entries...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                    No recorded audit log events match current criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 font-mono font-semibold whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${getDomainColor(log.domain)}`}>
                        {log.domain || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-blue-700 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.actor || 'System Engine'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-bold whitespace-nowrap">
                      {log.role || 'ADMIN'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {log.entity_id || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px] max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : 'None'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
