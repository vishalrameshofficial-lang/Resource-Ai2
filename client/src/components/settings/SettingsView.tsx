import React, { useEffect, useState } from 'react';
import { Settings, Database, Radio, Cpu, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

export function SettingsView() {
  const [health, setHealth] = useState<any>(null);
  const [exotel, setExotel] = useState<any>(null);
  const { user, switchRoleQuickly } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const fetchInfo = async () => {
    setIsLoading(true);
    try {
      const [h, e] = await Promise.all([api.getHealth(), api.getExotelStatus()]);
      setHealth(h);
      setExotel(e);
    } catch (err) {
      console.warn('Settings load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>ResourceAI System & Architecture Settings</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Production environment parameters, native node:sqlite database engine and Exotel telephony configuration.
          </p>
        </div>

        <button
          onClick={fetchInfo}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs text-xs font-bold flex items-center space-x-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Native Database Card */}
        <div className="glass-panel-3d p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Database Engine</h4>
              <p className="text-[10px] font-semibold text-slate-500">Native SQLite embedded storage</p>
            </div>
          </div>
          <div className="text-xs text-slate-700 font-semibold space-y-2 pt-2 border-t border-slate-200">
            <div className="flex justify-between">
              <span>DB Status:</span>
              <strong className="text-emerald-700 font-mono font-black">{health?.database || 'ONLINE'}</strong>
            </div>
            <div className="flex justify-between">
              <span>Database Engine:</span>
              <strong className="text-slate-900 font-mono">node:sqlite (Node v22.12+)</strong>
            </div>
            <div className="flex justify-between">
              <span>Schema Version:</span>
              <strong className="text-slate-900 font-mono">v2.0 (Multi-Domain)</strong>
            </div>
          </div>
        </div>

        {/* Telephony Connection Status */}
        <div className="glass-panel-3d p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-100 border border-cyan-200 text-cyan-700 font-bold">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Exotel Telephony Line</h4>
              <p className="text-[10px] font-semibold text-slate-500">AgentStream WebSocket helpline</p>
            </div>
          </div>
          <div className="text-xs text-slate-700 font-semibold space-y-2 pt-2 border-t border-slate-200">
            <div className="flex justify-between">
              <span>Fixed Helpline Number:</span>
              <strong className="text-emerald-700 font-mono font-black">+91 44 4761 5477</strong>
            </div>
            <div className="flex justify-between">
              <span>WebSocket Port:</span>
              <strong className="text-slate-900 font-mono">5055 (/api/voice/exotel/stream)</strong>
            </div>
            <div className="flex justify-between">
              <span>AgentStream Status:</span>
              <strong className="text-cyan-700 font-bold">{exotel?.webSocket || 'LISTEN_READY'}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
