import React from 'react';
import { PhoneCall, Shield, Activity, Radio, Cpu, Building2, Trees } from 'lucide-react';

export const Voicebot3DScene: React.FC = () => {
  return (
    <div className="relative w-full h-full min-h-[220px] rounded-2xl bg-gradient-to-br from-blue-50/80 via-white/90 to-cyan-50/70 border border-blue-200/80 p-4 overflow-hidden flex flex-col justify-between shadow-inner">
      {/* Background Ambient Daylight Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Grid Floor Lines simulating 3D Ground Perspective */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] bg-[size:16px_16px] opacity-60" />

      {/* 3D Floating Communication Nodes & Assistant Device */}
      <div className="relative z-10 flex items-center justify-center pt-2">
        <div className="relative group cursor-pointer">
          {/* Concentric Floating Rings */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-400/20 to-cyan-400/30 blur-md animate-ping" />
          <div className="absolute -inset-6 rounded-full border border-cyan-400/40 animate-spin-slow" />
          
          {/* Raised 3D Device Capsule */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white shadow-xl shadow-blue-500/30 border-2 border-white/80 flex flex-col items-center justify-center p-2 transform hover:scale-105 transition-transform">
            <PhoneCall className="w-7 h-7 text-white animate-bounce" />
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-200 mt-1">EXOTEL AI</span>
          </div>
        </div>

        {/* Floating Communication Symbols */}
        <div className="absolute top-2 left-4 px-2 py-1 rounded-lg bg-white/90 border border-blue-200 shadow-md text-[10px] font-bold text-blue-700 flex items-center gap-1 backdrop-blur-md animate-pulse">
          <Radio className="w-3 h-3 text-cyan-500" />
          <span>AgentStream</span>
        </div>

        <div className="absolute top-2 right-4 px-2 py-1 rounded-lg bg-white/90 border border-emerald-200 shadow-md text-[10px] font-bold text-emerald-700 flex items-center gap-1 backdrop-blur-md">
          <Activity className="w-3 h-3 text-emerald-500" />
          <span>Real-time Triage</span>
        </div>
      </div>

      {/* Miniature Modern City Environment at Bottom */}
      <div className="relative z-10 pt-4 border-t border-blue-100 flex items-end justify-between px-2 text-slate-600">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Smart City Dispatch Node</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>100% Operational</span>
        </div>
      </div>
    </div>
  );
};
