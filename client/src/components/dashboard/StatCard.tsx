import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color: 'red' | 'amber' | 'blue' | 'purple' | 'cyan' | 'emerald';
  badge?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, subtitle, icon: Icon, color, badge, onClick }: StatCardProps) {
  const colorMap = {
    red: {
      bg: 'bg-rose-100 text-rose-800 border-rose-200',
      iconBg: 'bg-rose-500/10 text-rose-600 border-rose-200',
      glow: 'shadow-rose-500/5'
    },
    amber: {
      bg: 'bg-amber-100 text-amber-800 border-amber-200',
      iconBg: 'bg-amber-500/10 text-amber-600 border-amber-200',
      glow: 'shadow-amber-500/5'
    },
    blue: {
      bg: 'bg-blue-100 text-blue-800 border-blue-200',
      iconBg: 'bg-blue-500/10 text-blue-600 border-blue-200',
      glow: 'shadow-blue-500/5'
    },
    purple: {
      bg: 'bg-purple-100 text-purple-800 border-purple-200',
      iconBg: 'bg-purple-500/10 text-purple-600 border-purple-200',
      glow: 'shadow-purple-500/5'
    },
    cyan: {
      bg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      iconBg: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
      glow: 'shadow-cyan-500/5'
    },
    emerald: {
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      glow: 'shadow-emerald-500/5'
    }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`glass-card-3d p-5 rounded-2xl border border-slate-200/80 transition-all duration-300 hover:scale-[1.02] shadow-md ${scheme.glow} ${
        onClick ? 'cursor-pointer hover:border-blue-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline space-x-2 mt-2">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scheme.bg}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-medium mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl border ${scheme.iconBg} shadow-2xs`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
