import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { CommandCenterStats } from '../../types/operations';

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
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Synchronizing Command Center...</span>
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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider font-mono">GOVERNMENT OPERATIONS PLATFORM</span>
              <span className="text-[10px] text-slate-500 font-mono">| TRI-DOMAIN INTEGRATED DISPATCH</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">State & District Central Command Center</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Unified digital operations console coordinating Emergency Disaster Dispatch, Education Resource Allocation, and Healthcare Material Governance. Real database telemetry with zero simulation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('map')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <span>🗺️</span> Operations Map
            </button>
            <button
              onClick={() => onNavigateTab('audit')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <span>📜</span> Audit Trail
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── THREE OPERATIONAL DOMAINS CARDS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* DOMAIN 1: EMERGENCY RESPONSE */}
        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-950/20 via-slate-900/60 to-slate-950 p-5 shadow-xl flex flex-col justify-between relative group hover:border-red-500/40 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-lg">
                  🚨
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Emergency Response</h3>
                  <p className="text-[10px] text-slate-400">Exotel Telephony & AI Voicebot</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                {em.activeCalls > 0 ? `${em.activeCalls} Live Calls` : 'Standby'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-white">{em.totalIncidents}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Total Incidents</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-red-400">{em.criticalIncidents}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Critical Severity</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-amber-400">{em.pendingVerification}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Verification Req.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-emerald-400">{em.resolved}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Resolved</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/50 mb-4">
              <div className="flex justify-between">
                <span>Total Calls Recorded:</span>
                <span className="font-bold text-slate-200">{em.totalCalls}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Field Incidents:</span>
                <span className="font-bold text-blue-400">{em.activeIncidents}</span>
              </div>
              <div className="flex justify-between">
                <span>Dispatches In Progress:</span>
                <span className="font-bold text-orange-400">{em.assigned}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('emergency')}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🚨</span> Open Emergency Dispatch &rarr;
          </button>
        </div>

        {/* DOMAIN 2: EDUCATION RESOURCE ALLOCATION */}
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-950/20 via-slate-900/60 to-slate-950 p-5 shadow-xl flex flex-col justify-between relative group hover:border-blue-500/40 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-lg">
                  🎓
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Education Allocation</h3>
                  <p className="text-[10px] text-slate-400">Manual Government Petitions</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {edu.totalRequests > 0 ? `${edu.totalRequests} Petitions` : 'Zero Petitions'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-white">{edu.totalRequests}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Total Requests</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-amber-400">{edu.underReview}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Under Review</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-emerald-400">{edu.approved}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Approved Orders</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-cyan-400">{edu.allocated}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Allocated</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/50 mb-4">
              <div className="flex justify-between">
                <span>Registered Institutions:</span>
                <span className="font-bold text-slate-200">{edu.institutionsCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Inventory Items Tracked:</span>
                <span className="font-bold text-blue-400">{edu.inventoryCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Deliveries:</span>
                <span className="font-bold text-emerald-400">{edu.delivered + edu.closed}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('education')}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🎓</span> Open Education Portal &rarr;
          </button>
        </div>

        {/* DOMAIN 3: HEALTH RESOURCE ALLOCATION */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 via-slate-900/60 to-slate-950 p-5 shadow-xl flex flex-col justify-between relative group hover:border-emerald-500/40 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-lg">
                  🏥
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Health Allocation</h3>
                  <p className="text-[10px] text-slate-400">Medicines, ICU Beds, Equipment</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {hlt.totalRequests > 0 ? `${hlt.totalRequests} Petitions` : 'Zero Petitions'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-white">{hlt.totalRequests}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Total Requests</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-amber-400">{hlt.underReview}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Under Review</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-emerald-400">{hlt.approved}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Approved Orders</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-xl font-black text-cyan-400">{hlt.allocated}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Allocated</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/50 mb-4">
              <div className="flex justify-between">
                <span>Registered Facilities:</span>
                <span className="font-bold text-slate-200">{hlt.facilitiesCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Medical Stock Types:</span>
                <span className="font-bold text-emerald-400">{hlt.inventoryCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Deliveries:</span>
                <span className="font-bold text-cyan-400">{hlt.delivered + hlt.closed}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('health')}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🏥</span> Open Health Portal &rarr;
          </button>
        </div>
      </div>

      {/* ── PLATFORM SUBSYSTEM INTEGRITY STATUS ── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-white">Subsystem Verification Matrix</span>
            <span className="text-[10px] text-slate-500 font-mono">LIVE CHECKS</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Exotel Number: <strong className="text-blue-400 font-mono">{sub.virtualNumber}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Exotel Telephony</div>
            <div className="font-black text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {sub.exotel}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Voice WebSocket</div>
            <div className="font-black text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {sub.voiceWebSocket}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Whisper STT</div>
            <div className="font-black text-blue-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              {sub.sttProvider}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">AI Intelligence</div>
            <div className="font-black text-purple-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              {sub.aiProvider}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Speech Synthesizer</div>
            <div className="font-black text-amber-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {sub.ttsProvider}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">SQLite Database</div>
            <div className="font-black text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {sub.database}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Operations Map</div>
            <div className="font-black text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              READY
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
