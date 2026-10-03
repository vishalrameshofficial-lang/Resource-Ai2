import React from 'react';
import { PhoneCall, Activity, Clock, Languages, CheckCircle2, ChevronRight, Radio } from 'lucide-react';
import { ActiveLiveCall } from '../../types/emergency';
import { maskPhone } from '../../lib/utils';
import { DepartmentDashboardView } from './DepartmentDashboardView';
import { Voicebot3DScene } from './Voicebot3DScene';

interface LiveCallsViewProps {
  activeCalls: ActiveLiveCall[];
  onOpenSimulator?: () => void;
}

const STAGES = [
  'EMERGENCY',
  'LOCATION',
  'PEOPLE',
  'RESOURCES',
  'CONFIRMATION'
];

const STAGE_INDEX_MAP: Record<string, number> = {
  GREETING: 0,
  EMERGENCY: 0,
  LOCATION: 1,
  PEOPLE: 2,
  RESOURCES: 3,
  CONFIRMATION: 4,
  SUBMISSION: 4,
  COMPLETED: 5
};

export function LiveCallsView({ activeCalls }: LiveCallsViewProps) {
  return (
    <div className="space-y-6">
      {/* Top Header Grid with 3D Scene */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-2.5">
                <Radio className="w-6 h-6 text-cyan-600 animate-pulse" />
                <span>Active Exotel AI Voicebot Calls</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Real-time monitoring of in-flight citizen telephone triage sessions.
              </p>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Exotel Virtual Helpline Active (+91 44 4761 5477)</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <Voicebot3DScene />
        </div>
      </div>

      {/* Active Calls Grid */}
      {activeCalls.length === 0 ? (
        <div className="glass-panel-3d p-10 rounded-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 mx-auto flex items-center justify-center text-blue-600 shadow-md">
            <PhoneCall className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Calls Currently In Progress</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto font-medium">
              The AI Voice Agent helpline is waiting for incoming calls on Exotel number{' '}
              <a href="tel:+914447615477" className="text-emerald-600 font-mono font-bold hover:underline">
                +91 44 4761 5477
              </a>.
            </p>
          </div>
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-mono shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Telephony Stream: /api/voice/exotel/stream</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {activeCalls.map((call) => {
            const currentStageIndex = STAGE_INDEX_MAP[call.stage] ?? STAGES.indexOf(call.stage);

            return (
              <div
                key={call.id}
                className="glass-card-3d p-5 rounded-2xl border border-blue-200/80 shadow-lg space-y-4 relative overflow-hidden"
              >
                {/* Active Call Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 border border-cyan-300 text-cyan-700 flex items-center justify-center shadow-xs">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {maskPhone(call.callerPhone)}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        SID: {call.callSid}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-semibold border border-blue-200 flex items-center space-x-1 shadow-2xs">
                      <Languages className="w-3 h-3 text-blue-600" />
                      <span>{call.language}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono flex items-center space-x-1 border border-slate-200">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{call.durationSec}s</span>
                    </span>
                  </div>
                </div>

                {/* Audio Telephony Activity Waves */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1 items-end h-5">
                      <span className="w-1 bg-cyan-600 voice-bar-1 rounded-full" />
                      <span className="w-1 bg-cyan-600 voice-bar-2 rounded-full" />
                      <span className="w-1 bg-cyan-600 voice-bar-3 rounded-full" />
                      <span className="w-1 bg-cyan-600 voice-bar-4 rounded-full" />
                      <span className="w-1 bg-cyan-600 voice-bar-2 rounded-full" />
                    </div>
                    <span className="text-xs text-slate-700 font-semibold">
                      AgentStream: Bidirectional Audio Active
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-100 border border-cyan-200">
                    STAGE: {call.stage}
                  </span>
                </div>

                {/* Conversation Stage Progression Track */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Conversation Progress ({currentStageIndex >= 0 ? currentStageIndex + 1 : 1}/{STAGES.length})
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {STAGES.map((stg, idx) => {
                      const isPast = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;

                      return (
                        <div
                          key={stg}
                          className={`p-1.5 rounded-lg text-center text-[9px] font-bold tracking-tight transition ${
                            isCurrent
                              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black shadow-md animate-pulse'
                              : isPast
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {stg}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Generated Request ID if submitted */}
                {call.requestId && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
                    <span className="flex items-center space-x-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Request Saved:</span>
                    </span>
                    <strong className="font-mono text-sm text-slate-900">{call.requestId}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Post-Call AI Query Understanding & Department Classification Section */}
      <div className="pt-6 border-t border-slate-200/80">
        <DepartmentDashboardView activeLiveCallsCount={activeCalls.length} />
      </div>
    </div>
  );
}
