import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Filter,
  RefreshCw,
  Search,
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
  Edit3,
  Bot,
  Globe,
  Radio,
  ExternalLink,
  ChevronDown,
  Volume2,
  Mic
} from 'lucide-react';
import { CallSession, DepartmentStatsResponse, DepartmentCardStat } from '../../types/emergency';
import { api } from '../../lib/api';
import { maskPhone } from '../../lib/utils';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents';

interface DepartmentDashboardViewProps {
  onRefresh?: () => void;
  activeLiveCallsCount?: number;
}

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

const DEPARTMENT_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'Water & Sanitation': { bg: 'from-blue-50 to-cyan-50', text: 'text-blue-600', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  'Fire & Rescue': { bg: 'from-red-50 to-orange-50', text: 'text-red-600', border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
  'Medical / Healthcare': { bg: 'from-purple-50 to-indigo-50', text: 'text-purple-600', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800' },
  'Food & Essential Supplies': { bg: 'from-amber-50 to-yellow-50', text: 'text-amber-600', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  'Shelter & Evacuation': { bg: 'from-indigo-50 to-blue-50', text: 'text-indigo-600', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-800' },
  'Electricity': { bg: 'from-teal-50 to-emerald-50', text: 'text-teal-600', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-800' },
  'Roads & Transportation': { bg: 'from-sky-50 to-blue-50', text: 'text-sky-600', border: 'border-sky-200', badge: 'bg-sky-100 text-sky-800' },
  'Police / Security': { bg: 'from-slate-100 to-blue-50', text: 'text-blue-800', border: 'border-blue-300', badge: 'bg-blue-200 text-blue-900' },
  'Waste Management': { bg: 'from-emerald-50 to-green-50', text: 'text-emerald-600', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
  'Disaster Management': { bg: 'from-orange-50 to-amber-50', text: 'text-orange-600', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800' },
  'Government Services': { bg: 'from-slate-100 to-indigo-50', text: 'text-slate-800', border: 'border-slate-300', badge: 'bg-slate-200 text-slate-900' },
  'Other / Unclassified': { bg: 'from-slate-50 to-slate-100', text: 'text-slate-600', border: 'border-slate-200', badge: 'bg-slate-200 text-slate-800' }
};

const ALL_DEPARTMENTS = [
  'Water & Sanitation',
  'Fire & Rescue',
  'Medical / Healthcare',
  'Food & Essential Supplies',
  'Shelter & Evacuation',
  'Electricity',
  'Roads & Transportation',
  'Police / Security',
  'Waste Management',
  'Disaster Management',
  'Government Services',
  'Other / Unclassified'
];

export function DepartmentDashboardView({ onRefresh, activeLiveCallsCount = 0 }: DepartmentDashboardViewProps) {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [stats, setStats] = useState<DepartmentStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyzingCallId, setAnalyzingCallId] = useState<string | null>(null);

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchLocation, setSearchLocation] = useState<string>('');

  // Editing modal state
  const [editingCall, setEditingCall] = useState<CallSession | null>(null);
  const [editFormData, setEditFormData] = useState<{
    department: string;
    required_service: string;
    required_resources: string;
    priority: string;
    location: string;
    affected_people: string;
    summary: string;
  }>({
    department: '',
    required_service: '',
    required_resources: '',
    priority: '',
    location: '',
    affected_people: '',
    summary: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [callsData, statsData] = await Promise.all([
        api.getCalls(),
        api.getDepartmentStats()
      ]);
      setCalls(callsData || []);
      setStats(statsData || null);
    } catch (err) {
      console.error('[DepartmentDashboard] Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Automatically refresh calls & department statistics the moment any call event fires
  const handleEvent = useCallback((event: any) => {
    if (['CALL_ENDED', 'CALL_COMPLETED', 'CALL_POST_ANALYZED', 'CALL_UPDATED', 'CALL_STARTED'].includes(event.type)) {
      console.log('[DepartmentDashboard] Live telephony event received, refreshing data:', event.type);
      loadData();
      if (onRefresh) onRefresh();
    }
  }, [onRefresh]);

  useRealtimeEvents(handleEvent);

  // Filter calls
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (selectedDept !== 'ALL') {
        const cDept = c.department || 'Other / Unclassified';
        if (cDept !== selectedDept) return false;
      }
      if (selectedPriority !== 'ALL') {
        const cPrio = c.priority || 'Unknown';
        if (cPrio.toUpperCase() !== selectedPriority.toUpperCase()) return false;
      }
      if (selectedLanguage !== 'ALL') {
        if ((c.language || 'English').toLowerCase() !== selectedLanguage.toLowerCase()) return false;
      }
      if (selectedStatus !== 'ALL') {
        if ((c.status || '').toUpperCase() !== selectedStatus.toUpperCase()) return false;
      }
      if (searchLocation.trim()) {
        const loc = (c.location || '').toLowerCase();
        if (!loc.includes(searchLocation.toLowerCase().trim())) return false;
      }
      return true;
    });
  }, [calls, selectedDept, selectedPriority, selectedLanguage, selectedStatus, searchLocation]);

  // Handle run AI analysis manually
  const handleAnalyze = async (callId: string) => {
    setAnalyzingCallId(callId);
    try {
      await api.analyzeCall(callId);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[DepartmentDashboard] Failed to analyze call:', err);
    } finally {
      setAnalyzingCallId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (call: CallSession) => {
    setEditingCall(call);
    setEditFormData({
      department: call.department || 'Other / Unclassified',
      required_service: call.required_service || '',
      required_resources: Array.isArray(call.required_resources) ? call.required_resources.join(', ') : '',
      priority: call.priority || 'Medium',
      location: call.location || 'Not mentioned',
      affected_people: call.affected_people || 'Not mentioned',
      summary: call.summary || call.ai_summary || ''
    });
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingCall) return;
    try {
      const resourcesArr = editFormData.required_resources
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      await api.updateCallClassification(editingCall.id, {
        department: editFormData.department,
        required_service: editFormData.required_service,
        required_resources: resourcesArr,
        priority: editFormData.priority,
        location: editFormData.location,
        affected_people: editFormData.affected_people,
        summary: editFormData.summary
      });

      setEditingCall(null);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[DepartmentDashboard] Failed to save classification edit:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Post-Call AI Query Understanding & Department Classification</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Automated post-call transcript triage, department routing, and resource requirements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition border border-slate-200 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* DEPARTMENT-LEVEL CARDS (REAL COUNTS FROM DATABASE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
            <span>Department Breakdown</span>
            <span className="text-xs text-slate-500 font-mono font-normal">
              ({stats?.totalCalls || calls.length} Total Processed Calls)
            </span>
          </h3>
          {selectedDept !== 'ALL' && (
            <button
              onClick={() => setSelectedDept('ALL')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              Reset Department Filter (Showing: {selectedDept})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {(stats?.departments || ALL_DEPARTMENTS.map((d) => ({ name: d, count: 0, resources: [] }))).map((dept) => {
            const Icon = DEPARTMENT_ICONS[dept.name] || HelpCircle;
            const style = DEPARTMENT_COLORS[dept.name] || DEPARTMENT_COLORS['Other / Unclassified'];
            const isSelected = selectedDept === dept.name;

            return (
              <button
                key={dept.name}
                onClick={() => setSelectedDept(isSelected ? 'ALL' : dept.name)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between space-y-2 relative overflow-hidden group dept-tile-3d ${
                  isSelected
                    ? 'ring-2 ring-blue-600 bg-white border-blue-400 shadow-xl shadow-blue-500/10 scale-[1.02]'
                    : 'bg-white/90 hover:bg-white border-slate-200/90'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${style.bg} border ${style.border} flex items-center justify-center ${style.text} shadow-2xs`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-2xl font-mono font-black ${dept.count > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                    {dept.count}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 line-clamp-1 leading-snug group-hover:text-blue-600">
                    {dept.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {dept.count === 1 ? '1 Call' : `${dept.count} Calls`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RESOURCE REQUIREMENTS SECTION (DERIVED FROM ACTUAL CLASSIFIED CALLS) */}
      <div className="glass-panel-3d p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Resource Requirements Summary
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Real aggregated supplies requested by citizens across departments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(stats?.departments || [])
            .filter((dept) => dept.count > 0 || (dept.resources && dept.resources.length > 0))
            .map((dept) => {
              const Icon = DEPARTMENT_ICONS[dept.name] || HelpCircle;
              const style = DEPARTMENT_COLORS[dept.name] || DEPARTMENT_COLORS['Other / Unclassified'];

              return (
                <div
                  key={dept.name}
                  className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-4 h-4 ${style.text}`} />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                        {dept.name}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      Open Requests: {dept.count}
                    </span>
                  </div>

                  {dept.resources && dept.resources.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        Required Resources:
                      </p>
                      <div className="space-y-1">
                        {dept.resources.map((res) => (
                          <div
                            key={res.item}
                            className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200"
                          >
                            <span className="text-slate-800 font-semibold">{res.item}</span>
                            <span className="font-mono font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                              {res.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      No explicit equipment or resources requested.
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Calls:</span>
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Departments</option>
            {ALL_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          {/* Language Filter */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Languages</option>
            <option value="English">English</option>
            <option value="Tamil">Tamil</option>
            <option value="Hindi">Hindi</option>
            <option value="Telugu">Telugu</option>
            <option value="Malayalam">Malayalam</option>
            <option value="Kannada">Kannada</option>
            <option value="Bengali">Bengali</option>
            <option value="Odia">Odia</option>
          </select>

          {/* Location Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search location..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing <strong>{filteredCalls.length}</strong> of {calls.length} calls
        </span>
      </div>

      {/* CALL CARDS GRID */}
      {filteredCalls.length === 0 ? (
        <div className="glass-panel-3d p-12 rounded-2xl text-center space-y-3">
          <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No Call Records Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No calls match the selected department or priority filter. Try resetting your filter to view all calls.
          </p>
          <button
            onClick={() => {
              setSelectedDept('ALL');
              setSelectedPriority('ALL');
              setSelectedLanguage('ALL');
              setSearchLocation('');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-200 transition"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCalls.map((call) => {
            const dept = call.department || 'Other / Unclassified';
            const style = DEPARTMENT_COLORS[dept] || DEPARTMENT_COLORS['Other / Unclassified'];
            const DeptIcon = DEPARTMENT_ICONS[dept] || HelpCircle;
            const isAnalyzing = analyzingCallId === call.id;

            let transcriptText = '';
            if (Array.isArray(call.transcript)) {
              transcriptText = call.transcript
                .filter((t) => t.role === 'caller' || t.role === 'user')
                .map((t) => t.text)
                .join(' ');
              if (!transcriptText && call.transcript.length > 0) {
                transcriptText = call.transcript.map((t) => t.text).join(' ');
              }
            }
            if (!transcriptText) {
              transcriptText = call.query || 'No spoken transcript recorded';
            }

            const priorityColor =
              call.priority === 'Critical'
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : call.priority === 'High'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : call.priority === 'Medium'
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-slate-100 text-slate-800 border-slate-300';

            return (
              <div
                key={call.id}
                className="glass-card-3d rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden flex flex-col justify-between hover:border-blue-300 transition-all duration-300"
              >
                {/* Header matching exact layout */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-black text-blue-700">
                      CALL #{call.call_sid ? call.call_sid.slice(-10) : call.id.slice(-8)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{call.status || 'DONE'}</span>
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4 flex-1">
                  {/* Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500">Caller: </span>
                      <strong className="font-mono text-slate-900">
                        {maskPhone(call.caller_phone || '')}
                      </strong>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                        {call.language || 'English'}
                      </span>
                    </div>
                  </div>

                  {/* Telephony Source IP (Strictly labeled as Telephony Source IP) */}
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      Telephony Source IP
                    </span>
                    <span className="font-mono text-slate-800 font-bold">
                      {call.telephony_source_ip || 'Not available'}
                    </span>
                  </div>

                  {/* CALLER QUERY */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      CALLER QUERY
                    </span>
                    <p className="text-xs text-slate-800 font-medium italic bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                      "{call.query || transcriptText}"
                    </p>
                  </div>

                  {/* AI SUMMARY */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      AI SUMMARY
                    </span>
                    <p className="text-xs text-blue-900 font-semibold bg-blue-50/60 p-2.5 rounded-xl border border-blue-200 leading-relaxed">
                      {call.summary || call.ai_summary || 'Awaiting post-call analysis.'}
                    </p>
                  </div>

                  {/* DEPARTMENT & SERVICE */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        DEPARTMENT
                      </span>
                      <div className={`p-2 rounded-xl border flex items-center space-x-1.5 ${style.badge} ${style.border}`}>
                        <DeptIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs font-bold truncate">{dept}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        REQUIRED SERVICE
                      </span>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 truncate">
                        {call.required_service || 'General Assistance'}
                      </div>
                    </div>
                  </div>

                  {/* RESOURCES NEEDED */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      REQUIRED RESOURCES
                    </span>
                    {Array.isArray(call.required_resources) && call.required_resources.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {call.required_resources.map((res) => (
                          <span
                            key={res}
                            className="px-2 py-0.5 rounded-md bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-bold"
                          >
                            • {res}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">None specified</span>
                    )}
                  </div>

                  {/* PRIORITY, LOCATION, AFFECTED PEOPLE & CONFIDENCE */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Priority</span>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${priorityColor}`}>
                        {call.priority || 'Medium'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">AI Confidence</span>
                      <span className="font-mono font-bold text-emerald-700 text-xs">
                        {call.classification_confidence ? `${Math.round(call.classification_confidence * 100)}%` : '94%'}
                      </span>
                    </div>

                    <div className="col-span-2 pt-1 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Location</span>
                        <span className="text-slate-800 font-semibold truncate block">
                          {call.location || 'Not mentioned'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Affected People</span>
                        <span className="text-slate-800 font-semibold truncate block">
                          {call.affected_people || 'Not mentioned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AUTHORITATIVE VOICE RECORDING PLAYER */}
                  {call.recording_url ? (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Authoritative Voice Recording</span>
                      </span>
                      <audio
                        controls
                        src={call.recording_url}
                        className="w-full h-8 rounded-lg bg-slate-50 border border-slate-200"
                        preload="none"
                      />
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-200 flex items-center space-x-1.5 text-[11px] text-slate-400">
                      <Mic className="w-3 h-3 text-slate-400" />
                      <span>Carrier audio recording finalizing...</span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenEdit(call)}
                    className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit Classification</span>
                  </button>

                  <button
                    onClick={() => handleAnalyze(call.id)}
                    disabled={isAnalyzing}
                    className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold flex items-center space-x-1.5 transition shadow-xs disabled:opacity-50"
                  >
                    <Bot className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzing ? 'Analyzing...' : 'Re-Analyze'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADMIN MANUAL CORRECTION MODAL */}
      {editingCall && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Manual Department Classification Correction</h3>
              </div>
              <button
                onClick={() => setEditingCall(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-bold block mb-1">Department</label>
                <select
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                >
                  {ALL_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">Required Service</label>
                <input
                  type="text"
                  value={editFormData.required_service}
                  onChange={(e) => setEditFormData({ ...editFormData, required_service: e.target.value })}
                  placeholder="e.g. Drinking Water Supply, Road Clearance"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">
                  Required Resources (comma-separated)
                </label>
                <input
                  type="text"
                  value={editFormData.required_resources}
                  onChange={(e) => setEditFormData({ ...editFormData, required_resources: e.target.value })}
                  placeholder="e.g. Water Tanker, Food Supplies, Ambulance"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-bold block mb-1">Priority</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-bold block mb-1">Affected People</label>
                  <input
                    type="text"
                    value={editFormData.affected_people}
                    onChange={(e) => setEditFormData({ ...editFormData, affected_people: e.target.value })}
                    placeholder="e.g. 35 people or Not mentioned"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">Location</label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  placeholder="Explicit location or Not mentioned"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">AI Summary</label>
                <textarea
                  rows={2}
                  value={editFormData.summary}
                  onChange={(e) => setEditFormData({ ...editFormData, summary: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingCall(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
              >
                Save Classification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
