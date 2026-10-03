import React from 'react';
import {
  PhoneCall,
  Radio,
  User,
  Activity
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRealtimeConnected: boolean;
  liveCallsCount: number;
  onReturnToLanding?: () => void;
}

export function Header({ activeTab, setActiveTab, isRealtimeConnected, liveCallsCount, onReturnToLanding }: HeaderProps) {
  const { user, switchRoleQuickly } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/80 bg-white/85 backdrop-blur-xl shadow-sm shadow-blue-900/5">
      {/* Top Banner: Brand, Telephony line, System status, Quick role */}
      <div className="px-6 py-2.5 flex items-center justify-between border-b border-slate-200/60 bg-gradient-to-r from-blue-50/50 via-white/80 to-cyan-50/40">
        <div className="flex items-center space-x-4">
          <div
            className="flex items-center space-x-2.5 cursor-pointer"
            onClick={onReturnToLanding || (() => setActiveTab('command-center'))}
          >
            <img
              src="/logo.jpg"
              alt="ResourceAI Logo"
              className="w-9 h-9 rounded-xl object-cover border border-blue-200 shadow-md shadow-blue-500/20 hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  RESOURCE <span className="text-blue-600">AI</span>
                </span>
                <span className="px-1.5 py-0.2 bg-blue-100/80 text-blue-700 text-[9px] font-bold rounded border border-blue-200 uppercase tracking-wider shadow-2xs">
                  GOVERNMENT OPERATIONS PLATFORM
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-none">
                Emergency Response • Education Resources • Health Resources
              </p>
            </div>
          </div>

          {/* 24/7 Exotel Helpline Direct Dial */}
          <a
            href="tel:+914447615477"
            aria-label="Call ResourceAI Helpline at +91 44 4761 5477"
            className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 border border-emerald-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] shadow-2xs">
            <Radio
              className={`w-3 h-3 ${
                isRealtimeConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'
              }`}
            />
            <span className="text-slate-500 font-medium hidden md:inline">Feed:</span>
            <span
              className={
                isRealtimeConnected
                  ? 'text-emerald-600 font-bold'
                  : 'text-slate-400 font-bold'
              }
            >
              {isRealtimeConnected ? 'ONLINE' : 'CONNECTING'}
            </span>
          </div>

          {/* Active Calls Indicator */}
          {liveCallsCount > 0 && (
            <button
              onClick={() => setActiveTab('calls')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700 text-[11px] font-bold shadow-2xs animate-pulse"
            >
              <Activity className="w-3 h-3 text-cyan-600" />
              <span>
                {liveCallsCount} Active Call{liveCallsCount > 1 ? 's' : ''}
              </span>
            </button>
          )}

          {/* Return to Landing Page */}
          {onReturnToLanding && (
            <button
              onClick={onReturnToLanding}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm hover:opacity-90 transition"
            >
              ← Landing Page
            </button>
          )}

          {/* Citizen Emergency Portal Link */}
          <button
            onClick={() => setActiveTab('citizen')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              activeTab === 'citizen'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            Citizen Intake Form
          </button>

          {/* User Role Switcher */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] shadow-2xs">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={user?.role || 'ADMIN'}
              onChange={(e) => switchRoleQuickly(e.target.value as UserRole)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="SUPER_ADMIN" className="bg-white text-slate-900">SUPER_ADMIN</option>
              <option value="ADMIN" className="bg-white text-slate-900">DISTRICT_ADMIN</option>
              <option value="EDUCATION_OFFICER" className="bg-white text-slate-900">EDUCATION_OFFICER</option>
              <option value="HEALTH_OFFICER" className="bg-white text-slate-900">HEALTH_OFFICER</option>
              <option value="OPERATOR" className="bg-white text-slate-900">CONTROL OPERATOR</option>
              <option value="VIEWER" className="bg-white text-slate-900">AUDITOR / VIEWER</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
