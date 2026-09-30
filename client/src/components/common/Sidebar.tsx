import React from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  PhoneCall,
  MapPin,
  Building2,
  FileText,
  Settings,
  Radio,
  GraduationCap,
  HeartPulse,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  liveCallsCount: number;
  newRequestsCount: number;
}

export function Sidebar({ activeTab, setActiveTab, liveCallsCount, newRequestsCount }: SidebarProps) {
  const domainNav = [
    { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
    {
      id: 'dashboard',
      label: 'Emergency Response',
      icon: AlertTriangle,
      badge: newRequestsCount > 0 ? newRequestsCount : undefined,
      badgeColor: 'bg-red-500'
    },
    { id: 'education', label: 'Education Resources', icon: GraduationCap },
    { id: 'health-resources', label: 'Health Resources', icon: HeartPulse }
  ];

  const emergencyNav = [
    {
      id: 'requests',
      label: 'Incident Queue',
      icon: AlertTriangle,
      badge: newRequestsCount > 0 ? newRequestsCount : undefined,
      badgeColor: 'bg-red-500'
    },
    {
      id: 'calls',
      label: 'Live Telephony Calls',
      icon: PhoneCall,
      badge: liveCallsCount > 0 ? liveCallsCount : undefined,
      badgeColor: 'bg-cyan-500 animate-pulse'
    },
    { id: 'dispatch', label: 'Relief Dispatch', icon: Building2 },
    { id: 'map', label: 'Operations Map', icon: MapPin }
  ];

  const platformNav = [
    { id: 'reports', label: 'Official Reports', icon: FileSpreadsheet },
    { id: 'audit-logs', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'simulator', label: 'Exotel Telephony', icon: Radio },
    { id: 'citizen', label: 'Citizen Portal', icon: FileText },
    { id: 'settings', label: 'System Health', icon: Settings }
  ];

  const renderNavGroup = (items: typeof domainNav) => (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </div>
            {item.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold text-white ${item.badgeColor}`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <aside className="w-60 border-r border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex flex-col justify-between p-3.5 shrink-0 min-h-[calc(100vh-100px)]">
      <div className="space-y-5">
        {/* Operational Domains */}
        <div>
          <p className="px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
            Operational Domains
          </p>
          {renderNavGroup(domainNav)}
        </div>

        {/* Emergency Response Sub-modules */}
        <div>
          <p className="px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
            Emergency Operations
          </p>
          {renderNavGroup(emergencyNav)}
        </div>

        {/* Governance & System Tools */}
        <div>
          <p className="px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
            Governance & System
          </p>
          {renderNavGroup(platformNav)}
        </div>
      </div>

      {/* Telephony Connection Status Card */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exotel Telephony</span>
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <p className="text-[10px] text-slate-400">
          AgentStream WebSocket on port 5055.
        </p>
        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60 font-mono">
          <span className="text-slate-400">Helpline:</span>
          <span className="text-emerald-400 font-bold">+91 44 4761 5477</span>
        </div>
      </div>
    </aside>
  );
}
