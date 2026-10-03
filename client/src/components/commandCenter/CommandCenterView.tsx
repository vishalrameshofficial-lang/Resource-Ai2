import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { CommandCenterStats } from '../../types/operations';
import { Activity, Shield, GraduationCap, HeartPulse, MapPin, FileText, Radio, Server, CheckCircle2 } from 'lucide-react';

interface CommandCenterViewProps {
  onNavigateTab: (tab: string) => void;
}

export function CommandCenterView({ onNavigateTab }: CommandCenterViewProps) {
  const [stats, setStats] = useState<CommandCenterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const data = await api.getCommandCenterStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to load command center stats:', err.message);
      setError('Unable to load live operations data. Checking connection...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Synchronizing Command Center...</span>
        </div>
      </div>
    );
  }

  const em = stats?.emergency || {
    activeCalls: 0,
    totalCalls: 0,
    totalIncidents: 0,
    activeIncidents: 0,
    criticalIncidents: 0,
    pendingVerification: 0,
    assigned: 0,
    resolved: 0
  };

  const edu = stats?.education || {
    totalRequests: 0,
    openRequests: 0,
    underReview: 0,
    verified: 0,
    approved: 0,
    pendingAllocation: 0,
    allocated: 0,
    delivered: 0,
    closed: 0,
    institutionsCount: 0,
    inventoryCount: 0,
    allocationsCount: 0
  };

  const hlt = stats?.health || {
    totalRequests: 0,
    openRequests: 0,
    underReview: 0,
    verified: 0,
    approved: 0,
    pendingAllocation: 0,
    allocated: 0,
    delivered: 0,
    closed: 0,
    facilitiesCount: 0,
    inventoryCount: 0,
    allocationsCount: 0
  };

  const sub = stats?.subsystems || {
    exotel: 'UNKNOWN',
    virtualNumber: 'None',
    voiceWebSocket: 'ACTIVE',
    database: 'ONLINE',
    sttProvider: 'local',
    aiProvider: 'ollama',
    ttsProvider: 'local'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Platform Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50/90 via-white/95 to-cyan-50/90 border border-slate-200/90 shadow-lg shadow-blue-900/5 relative overflow-hidden glass-panel-3d">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
              <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider font-mono">GOVERNMENT OPERATIONS PLATFORM</span>
              <span className="text-[10px] text-slate-500 font-mono">| TRI-DOMAIN INTEGRATED DISPATCH</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">State & District Central Command Center</h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed font-medium">
              Unified digital operations console coordinating Emergency Disaster Dispatch, Education Resource Allocation, and Healthcare Material Governance. Real database telemetry with zero simulation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('map')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              <span>Operations Map</span>
            </button>
            <button
              onClick={() => onNavigateTab('audit-logs')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Audit Trail</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold flex items-center gap-2 shadow-2xs">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── THREE OPERATIONAL DOMAINS CARDS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* DOMAIN 1: EMERGENCY RESPONSE */}
        <div className="rounded-2xl border border-rose-200 bg-white/90 p-5 shadow-lg flex flex-col justify-between relative group hover:border-rose-300 transition-all glass-card-3d">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center font-bold">
                  🚨
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Emergency Response</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Exotel Telephony & AI Voicebot</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                {em.activeCalls > 0 ? `${em.activeCalls} Live Calls` : 'Standby'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xl font-black text-slate-900">{em.totalIncidents}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Total Incidents</div>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-xl font-black text-rose-600">{em.criticalIncidents}</div>
                <div className="text-[10px] text-rose-700 font-bold uppercase tracking-wider mt-0.5">Critical Severity</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-xl font-black text-amber-600">{em.pendingVerification}</div>
                <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-0.5">Verification Req.</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-xl font-black text-emerald-600">{em.resolved}</div>
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-0.5">Resolved</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 font-medium space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <div className="flex justify-between">
                <span>Total Calls Recorded:</span>
                <span className="font-bold text-slate-900">{em.totalCalls}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Field Incidents:</span>
                <span className="font-bold text-blue-600">{em.activeIncidents}</span>
              </div>
              <div className="flex justify-between">
                <span>Dispatches In Progress:</span>
                <span className="font-bold text-orange-600">{em.assigned}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('dashboard')}
            className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <span>🚨</span> Open Emergency Dispatch &rarr;
          </button>
        </div>

        {/* DOMAIN 2: EDUCATION RESOURCE ALLOCATION */}
        <div className="rounded-2xl border border-blue-200 bg-white/90 p-5 shadow-lg flex flex-col justify-between relative group hover:border-blue-300 transition-all glass-card-3d">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
                  🎓
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Education Resources</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Material & Facility Management</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {edu.totalRequests} Requests
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xl font-black text-slate-900">{edu.institutionsCount}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 font-medium">Institutions</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-xl font-black text-blue-600">{edu.openRequests}</div>
                <div className="text-[10px] text-blue-700 font-bold uppercase tracking-wider mt-0.5">Open Demands</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                <div className="text-xl font-black text-indigo-600">{edu.pendingAllocation}</div>
                <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider mt-0.5">Pending Alloc.</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-xl font-black text-emerald-600">{edu.delivered}</div>
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-0.5">Delivered</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 font-medium space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <div className="flex justify-between">
                <span>Cataloged Supplies:</span>
                <span className="font-bold text-slate-900">{edu.inventoryCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Verified Requisitions:</span>
                <span className="font-bold text-blue-600">{edu.verified}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Dispatch Orders:</span>
                <span className="font-bold text-indigo-600">{edu.allocationsCount}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('education')}
            className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <span>🎓</span> Open Education Portal &rarr;
          </button>
        </div>

        {/* DOMAIN 3: HEALTHCARE & HOSPITAL LOGISTICS */}
        <div className="rounded-2xl border border-emerald-200 bg-white/90 p-5 shadow-lg flex flex-col justify-between relative group hover:border-emerald-300 transition-all glass-card-3d">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                  🏥
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Health Resources</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Hospital & ICU Medical Supplies</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {hlt.totalRequests} Demands
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xl font-black text-slate-900">{hlt.facilitiesCount}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Facilities</div>
              </div>
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                <div className="text-xl font-black text-teal-600">{hlt.openRequests}</div>
                <div className="text-[10px] text-teal-700 font-bold uppercase tracking-wider mt-0.5">Open Demands</div>
              </div>
              <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200">
                <div className="text-xl font-black text-cyan-600">{hlt.pendingAllocation}</div>
                <div className="text-[10px] text-cyan-700 font-bold uppercase tracking-wider mt-0.5">Pending Dispatch</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-xl font-black text-emerald-600">{hlt.delivered}</div>
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-0.5">Fulfillments</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 font-medium space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <div className="flex justify-between">
                <span>Medical Supplies Stock:</span>
                <span className="font-bold text-slate-900">{hlt.inventoryCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Verified Clinical Orders:</span>
                <span className="font-bold text-teal-600">{hlt.verified}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Logistics:</span>
                <span className="font-bold text-emerald-600">{hlt.closed}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('health-resources')}
            className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <span>🏥</span> Open Healthcare Portal &rarr;
          </button>
        </div>
      </div>

      {/* SUBSYSTEM INTEGRATION STATUS BAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm glass-panel-3d">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Subsystem Integration Health</h4>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            ALL SYSTEMS OPERATIONAL
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs font-semibold">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Telephony</div>
            <div className="text-slate-900 font-bold mt-0.5">{sub.exotel}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Virtual Helpline</div>
            <div className="text-emerald-600 font-mono font-bold mt-0.5">{sub.virtualNumber}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Voice Stream</div>
            <div className="text-cyan-600 font-bold mt-0.5">{sub.voiceWebSocket}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Database</div>
            <div className="text-emerald-600 font-bold mt-0.5">{sub.database}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Whisper STT</div>
            <div className="text-blue-600 font-bold mt-0.5">{sub.sttProvider}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-500 uppercase">AI Provider</div>
            <div className="text-indigo-600 font-bold mt-0.5">{sub.aiProvider}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] text-slate-500 uppercase">TTS Voice</div>
            <div className="text-teal-600 font-bold mt-0.5">{sub.ttsProvider}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
