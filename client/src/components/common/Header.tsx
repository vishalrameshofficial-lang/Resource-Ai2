import React from 'react';
import {
  Shield,
  PhoneCall,
  Radio,
  User,
  Activity,
  LayoutDashboard,
  AlertTriangle,
  GraduationCap,
  HeartPulse,
  MapPin,
  FileSpreadsheet,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRealtimeConnected: boolean;
  liveCallsCount: number;
}

export function Header({ activeTab, setActiveTab, isRealtimeConnected, liveCallsCount }: HeaderProps) {
  const { user, switchRoleQuickly } = useAuth();

  const primaryModules = [
    { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
    { id: 'dashboard', label: 'Emergency Response', icon: AlertTriangle, badge: 'EXOTEL' },
    { id: 'education', label: 'Education Resources', icon: GraduationCap },
    { id: 'health-resources', label: 'Health Resources', icon: HeartPulse },
    { id: 'map', label: 'Live Map', icon: MapPin },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'System Health', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
      {/* Top Banner: Brand, Telephony line, System status, Quick role */}
      <div className="px-6 py-2.5 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center space-x-4">
          <div
            className="flex items-center space-x-2.5 cursor-pointer"
            onClick={() => setActiveTab('command-center')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  RESOURCE<span className="text-blue-500">AI</span>
                </span>
                <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded border border-blue-500/30 uppercase tracking-wider">
                  GOVERNMENT OPERATIONS PLATFORM
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none">
                Emergency Response • Education Resources • Health Resources
              </p>
            </div>
          </div>

          {/* 24/7 Exotel Helpline Direct Dial */}
          <a
            href="tel:+914447615477"
            aria-label="Call ResourceAI Helpline at +91 44 4761 5477"
            className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 border border-emerald-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <PhoneCall className="w-3 h-3 text-white" />
            <span>24/7 Helpline:</span>
            <span className="font-mono text-emerald-100 font-semibold tracking-wide">
              +91 44 4761 5477
            </span>
          </a>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Real-time SSE Feed Status */}
          <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
            <Radio
              className={`w-3 h-3 ${
                isRealtimeConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
              }`}
            />
            <span className="text-slate-400 hidden md:inline">Feed:</span>
            <span
              className={
                isRealtimeConnected
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-500 font-semibold'
              }
            >
              {isRealtimeConnected ? 'ONLINE' : 'CONNECTING'}
            </span>
          </div>

          {/* Active Calls Indicator */}
          {liveCallsCount > 0 && (
            <button
              onClick={() => setActiveTab('calls')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold animate-pulse"
            >
              <Activity className="w-3 h-3" />
              <span>
                {liveCallsCount} Active Call{liveCallsCount > 1 ? 's' : ''}
              </span>
            </button>
          )}

          {/* Citizen Emergency Portal Link */}
          <button
            onClick={() => setActiveTab('citizen')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
              activeTab === 'citizen'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            Citizen Intake Form
          </button>

          {/* User Role Switcher */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px]">
            <User className="w-3 h-3 text-slate-400" />
            <select
              value={user?.role || 'ADMIN'}
              onChange={(e) => switchRoleQuickly(e.target.value as UserRole)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="SUPER_ADMIN" className="bg-slate-900 text-slate-100">SUPER_ADMIN</option>
              <option value="ADMIN" className="bg-slate-900 text-slate-100">DISTRICT_ADMIN</option>
              <option value="EDUCATION_OFFICER" className="bg-slate-900 text-slate-100">EDUCATION_OFFICER</option>
              <option value="HEALTH_OFFICER" className="bg-slate-900 text-slate-100">HEALTH_OFFICER</option>
              <option value="OPERATOR" className="bg-slate-900 text-slate-100">CONTROL_OPERATOR</option>
              <option value="VIEWER" className="bg-slate-900 text-slate-100">AUDITOR / VIEWER</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary Government Domain Navigation Bar */}
      <div className="px-6 py-1.5 flex items-center space-x-1 overflow-x-auto scrollbar-none bg-slate-950/70">
        {primaryModules.map((mod) => {
          const Icon = mod.icon;
          const isActive =
            activeTab === mod.id ||
            (mod.id === 'dashboard' &&
              ['dashboard', 'requests', 'calls', 'dispatch', 'simulator'].includes(activeTab));

          return (
            <button
              key={mod.id}
              onClick={() => setActiveTab(mod.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600/25 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive
                    ? mod.id === 'education'
                      ? 'text-blue-400'
                      : mod.id === 'health-resources'
                      ? 'text-emerald-400'
                      : 'text-blue-400'
                    : 'text-slate-400'
                }`}
              />
              <span>{mod.label}</span>
              {mod.badge && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                  {mod.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
