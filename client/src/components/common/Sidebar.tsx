import React from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  PhoneCall,
  MapPin,
  Building2,
  FileText,
  GraduationCap,
  HeartPulse,
  FileSpreadsheet,
  Siren,
  Megaphone
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
      badgeColor: 'bg-rose-500'
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
      badgeColor: 'bg-rose-500'
    },
    {
      id: 'calls',
      label: 'Live Telephony Calls',
      icon: PhoneCall,
      badge: liveCallsCount > 0 ? liveCallsCount : undefined,
      badgeColor: 'bg-cyan-500 animate-pulse'
    },
    { id: 'dispatch', label: 'Relief Dispatch', icon: Building2 },
    { id: 'complaint-dispatch', label: 'Complaint Dispatch', icon: Siren },
    { id: 'map', label: 'Operations Map', icon: MapPin }
  ];

  const platformNav = [
    {
      id: 'our-voice-our-issue',
      label: 'Our Voice Our Issue',
      icon: Megaphone,
      badge: 'Unified',
      badgeColor: 'bg-indigo-600'
    },
    { id: 'reports', label: 'Official Reports', icon: FileSpreadsheet },
    { id: 'citizen', label: 'Emergency Intake', icon: FileText }
  ];

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }

  const renderNavGroup = (items: NavItem[]) => (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20 translate-x-1'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 hover:translate-x-0.5'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </div>
            {item.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold text-white shadow-xs ${item.badgeColor}`}
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
    <aside className="w-60 border-r border-slate-200/80 bg-white/80 backdrop-blur-xl flex flex-col justify-between p-3.5 shrink-0 min-h-[calc(100vh-100px)] shadow-sm">
      <div className="space-y-5">
        {/* Operational Domains */}
        <div>
          <p className="px-2 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-2">
            Operational Domains
          </p>
          {renderNavGroup(domainNav)}
        </div>

        {/* Emergency Response Sub-modules */}
        <div>
          <p className="px-2 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-2">
            Emergency Operations
          </p>
          {renderNavGroup(emergencyNav)}
        </div>

        {/* Governance & System Tools */}
        <div>
          <p className="px-2 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-2">
            Governance & System
          </p>
          {renderNavGroup(platformNav)}
        </div>
      </div>

    </aside>
  );
}
