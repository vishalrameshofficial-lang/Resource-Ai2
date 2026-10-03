import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Droplets,
  HeartPulse,
  Utensils,
  Home,
  Zap,
  Truck,
  Shield,
  Trash2,
  Landmark,
  HelpCircle,
  RefreshCw,
  FileText,
  MapPin,
  Phone,
  Mail,
  Users,
  ChevronDown,
  ChevronUp,
  Building2,
  Siren,
  CheckCheck,
  XCircle,
  Filter
} from 'lucide-react';
import { ComplaintDispatch, ComplaintDispatchStats } from '../../types/emergency';
import { api } from '../../lib/api';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents';

const DEPARTMENT_ICONS: Record<string, React.ElementType> = {
  'Water & Sanitation': Droplets,
  'Fire & Rescue': Flame,
  'Medical / Healthcare': HeartPulse,
  'Food & Essential Supplies': Utensils,
  'Shelter & Evacuation': Home,
  'Electricity': Zap,
  'Roads & Transportation': Truck,
  'Police / Security': Shield,
  'Waste Management': Trash2,
  'Disaster Management': AlertTriangle,
  'Government Services': Landmark,
  'Other / Unclassified': HelpCircle
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string; pulse: string }> = {
  Critical: { bg: 'bg-rose-100 border-rose-200', text: 'text-rose-800', pulse: 'animate-pulse' },
  High: { bg: 'bg-amber-100 border-amber-200', text: 'text-amber-800', pulse: '' },
  Medium: { bg: 'bg-blue-100 border-blue-200', text: 'text-blue-800', pulse: '' },
  Low: { bg: 'bg-emerald-100 border-emerald-200', text: 'text-emerald-800', pulse: '' },
  Unknown: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', pulse: '' }
};

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  DISPATCHED: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: Send, label: 'Dispatched' },
  ACKNOWLEDGED: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: Clock, label: 'Acknowledged' },
  RESOLVED: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: CheckCircle2, label: 'Resolved' },
  REJECTED: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', icon: XCircle, label: 'Rejected' }
};

export function ComplaintDispatchView() {
  const [dispatches, setDispatches] = useState<ComplaintDispatch[]>([]);
  const [stats, setStats] = useState<ComplaintDispatchStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [selectedDispatch, setSelectedDispatch] = useState<ComplaintDispatch | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listData, statsData] = await Promise.all([
        api.getComplaintDispatches({ department: filterDept, status: filterStatus, priority: filterPriority }),
        api.getComplaintDispatchStats()
      ]);
      setDispatches(listData.data || []);
      setStats(statsData);
    } catch (err) {
      console.warn('Failed to fetch complaint dispatches:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterDept, filterStatus, filterPriority]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time update hook
  const handleRealtime = useCallback(
    (event: any) => {
      if (['COMPLAINT_DISPATCHED', 'COMPLAINT_STATUS_UPDATED', 'CALL_COMPLETED'].includes(event.type)) {
        fetchData();
      }
    },
    [fetchData]
  );
  useRealtimeEvents(handleRealtime);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      if (newStatus === 'ACKNOWLEDGED') {
        await api.acknowledgeComplaintDispatch(id);
      } else if (newStatus === 'RESOLVED') {
        await api.resolveComplaintDispatch(id, 'Resolved by Department Response Team');
      }
      fetchData();
      if (selectedDispatch && selectedDispatch.id === id) {
        setSelectedDispatch((prev) => (prev ? { ...prev, dispatch_status: newStatus as any } : null));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Platform Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white/90 border border-slate-200 shadow-md glass-panel-3d">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Siren className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Department Emergency Complaint Dispatch Center
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                AUTOMATED FORWARDING
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Transcribed call complaints formatted into official dossiers and dispatched to nearby stations.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center space-x-2 border border-slate-200 shadow-2xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Dispatches</span>
        </button>
      </div>

      {/* Overview Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs glass-card-3d">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Dispatches</span>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats?.total || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs glass-card-3d">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">In Transit</span>
          <p className="text-2xl font-black text-amber-600 mt-1 font-mono">{stats?.dispatched || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-xs glass-card-3d">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Acknowledged</span>
          <p className="text-2xl font-black text-blue-600 mt-1 font-mono">{stats?.acknowledged || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs glass-card-3d">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Resolved</span>
          <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{stats?.resolved || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs glass-card-3d">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Critical Priority</span>
          <p className="text-2xl font-black text-rose-600 mt-1 font-mono">{stats?.critical || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-cyan-200 shadow-xs glass-card-3d">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Pending Station</span>
          <p className="text-2xl font-black text-cyan-600 mt-1 font-mono">{stats?.pendingResponse || 0}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Dispatches:</span>
          </div>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Departments</option>
            {Object.keys(DEPARTMENT_ICONS).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Lifecycle Statuses</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing <strong>{dispatches.length}</strong> official complaint dossiers
        </span>
      </div>

      {/* Dispatches List */}
      {dispatches.length === 0 ? (
        <div className="glass-panel-3d p-12 rounded-2xl text-center space-y-3">
          <Siren className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No Dispatched Complaints Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Dispatched complaints generated from completed emergency telephone calls will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {dispatches.map((disp) => {
            const Icon = DEPARTMENT_ICONS[disp.department] || HelpCircle;
            const prioStyle = PRIORITY_COLORS[disp.priority] || PRIORITY_COLORS.Medium;
            const statusStyle = STATUS_STYLES[disp.dispatch_status] || STATUS_STYLES.DISPATCHED;
            const StatusIcon = statusStyle.icon;

            return (
              <div
                key={disp.id}
                className="glass-card-3d rounded-2xl border border-slate-200 bg-white p-5 shadow-lg space-y-4 relative overflow-hidden hover:border-blue-300 transition-all duration-300"
              >
                {/* Dossier Header */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-black text-slate-900">{disp.dispatch_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${prioStyle.bg} ${prioStyle.text} ${prioStyle.pulse}`}>
                          {disp.priority} Priority
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">{disp.department}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border flex items-center space-x-1 ${statusStyle.bg} ${statusStyle.text}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{statusStyle.label}</span>
                  </span>
                </div>

                {/* Target Assigned Station Unit */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Target Station / Unit</span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      {disp.station_name}
                    </span>
                    <span className="font-mono font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      {disp.station_phone || disp.emergency_number || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Complaint Summary & Location */}
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Incident Summary</span>
                    <p className="text-xs text-slate-800 font-semibold mt-0.5 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      "{disp.summary || disp.query}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <strong className="text-slate-900">{disp.location || 'Location Not Specified'}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {disp.caller_phone || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedDispatch(disp)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Dossier</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {disp.dispatch_status === 'DISPATCHED' && (
                      <button
                        onClick={() => updateStatus(disp.id, 'ACKNOWLEDGED')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        Acknowledge
                      </button>
                    )}
                    {disp.dispatch_status === 'ACKNOWLEDGED' && (
                      <button
                        onClick={() => updateStatus(disp.id, 'RESOLVED')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL DOSSIER MODAL */}
      {selectedDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Siren className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Official Department Complaint Dossier</h3>
                  <p className="text-xs text-slate-500 font-mono">Ref: {selectedDispatch.dispatch_id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDispatch(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Station</span>
                  <strong className="text-sm font-bold text-slate-900">{selectedDispatch.station_name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Emergency Helpline</span>
                  <strong className="text-sm font-mono font-bold text-emerald-600">{selectedDispatch.station_phone || selectedDispatch.emergency_number || 'N/A'}</strong>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Transcribed Call Content</span>
                <p className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-medium leading-relaxed italic">
                  "{selectedDispatch.transcript_text || selectedDispatch.complaint_document || 'N/A'}"
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Required Action Items</span>
                <p className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 font-semibold leading-relaxed">
                  {selectedDispatch.summary || selectedDispatch.query || 'Dispatch unit to caller location immediately.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedDispatch(null)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
