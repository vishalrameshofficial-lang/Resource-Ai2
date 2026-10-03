import React, { useState } from 'react';
import {
  X,
  MapPin,
  Users,
  AlertTriangle,
  PhoneCall,
  Calendar,
  CheckCircle,
  Clock,
  Shield,
  Send,
  Truck,
  Box,
  FileText,
  Eye,
  EyeOff,
  Volume2
} from 'lucide-react';
import { EmergencyRequest, RequestStatus } from '../../types/emergency';
import { UrgencyBadge, StatusBadge, SourceBadge } from '../common/Badge';
import { formatDate, maskPhone, formatStatusLabel } from '../../lib/utils';
import { api } from '../../lib/api';

interface RequestDetailModalProps {
  request: EmergencyRequest | null;
  onClose: () => void;
  onUpdated: (updated: EmergencyRequest) => void;
}

export function RequestDetailModal({ request, onClose, onUpdated }: RequestDetailModalProps) {
  if (!request) return null;

  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'transcript' | 'timeline'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminNotes, setAdminNotes] = useState(request.admin_notes || '');
  const [govtRef, setGovtRef] = useState(request.government_reference || '');
  const [actionError, setActionError] = useState<string | null>(null);

  const displayPhone = maskPhone(request.caller_phone || request.masked_phone || '', phoneRevealed);

  const handleStatusChange = async (newStatus: RequestStatus) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await api.updateRequestStatus(request.id, newStatus, adminNotes, govtRef);
      if (res.data) {
        onUpdated(res.data);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 glass-panel-3d">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xl font-black text-blue-700">
              {request.request_id}
            </span>
            <UrgencyBadge urgency={request.urgency} />
            <StatusBadge status={request.status} />
            <SourceBadge source={request.source} />
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-900 transition font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Error Message */}
        {actionError && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Sub-tabs Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-5 text-xs font-bold">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Request Details & Actions
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === 'transcript'
                ? 'border-blue-600 text-blue-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Spoken Call Transcript
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === 'timeline'
                ? 'border-blue-600 text-blue-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Lifecycle Audit Timeline
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Summary Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500">Caller Identity</span>
                  <div className="font-bold text-slate-900 text-sm">{request.caller_name || 'Anonymous Caller'}</div>
                  <div className="text-xs text-slate-600 font-mono flex items-center justify-between pt-1">
                    <span>{displayPhone}</span>
                    <button
                      onClick={() => setPhoneRevealed(!phoneRevealed)}
                      className="text-blue-600 hover:underline text-[11px] font-bold"
                    >
                      {phoneRevealed ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500">Location Pinpoint</span>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="truncate">{request.location}</span>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold pt-1">
                    Language: <span className="text-blue-700 font-bold">{request.caller_language}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500">Impact & Affected People</span>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1">
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{request.affected_people_count ?? 1} People Impacted</span>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold pt-1">
                    Category: <span className="text-slate-900 uppercase font-bold">{request.emergency_category}</span>
                  </div>
                </div>
              </div>

              {/* Description & Resources Requested */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Spoken Problem Description / Query
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium leading-relaxed italic">
                    "{request.description}"
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Requested Resources & Relief Materials
                  </h4>
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs font-bold flex flex-wrap gap-2">
                    {Array.isArray(request.resources_needed)
                      ? request.resources_needed.map((res: any, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-blue-100 border border-blue-200 text-blue-800">
                            • {typeof res === 'string' ? res : `${res.item}${res.quantity ? ` (${res.quantity} ${res.unit || ''})` : ''}`}
                          </span>
                        ))
                      : (request as any).resources_requested || 'General Disaster Relief'}
                  </div>
                </div>
              </div>

              {/* Administrative Actions Form */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Government Relief Officer Controls</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Government Tracking Reference</label>
                    <input
                      type="text"
                      value={govtRef}
                      onChange={(e) => setGovtRef(e.target.value)}
                      placeholder="e.g. TN-NDRF-2026-8842"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Officer Notes & Allocation Details</label>
                    <input
                      type="text"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add operational notes..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Status Transition Action Buttons */}
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusChange('VERIFIED')}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    Mark Verified
                  </button>
                  <button
                    onClick={() => handleStatusChange('FORWARDED_TO_GOVERNMENT')}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    Forward to Govt Agencies
                  </button>
                  <button
                    onClick={() => handleStatusChange('RESOURCE_ALLOCATED')}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    Allocate Resources
                  </button>
                  <button
                    onClick={() => handleStatusChange('DELIVERED')}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    Mark Delivered & Resolved
                  </button>
                  <button
                    onClick={() => handleStatusChange('REJECTED')}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    Reject Petition
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-900">Multilingual Telephony Transcript</span>
                <span className="font-mono text-slate-500">Language: {request.caller_language}</span>
              </div>

              {(request.callSession?.transcript || (request as any).transcript_dialogue) && (request.callSession?.transcript || (request as any).transcript_dialogue).length > 0 ? (
                <div className="space-y-3">
                  {(request.callSession?.transcript || (request as any).transcript_dialogue).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl text-xs font-medium space-y-1 ${
                        item.role === 'caller' || item.role === 'user'
                          ? 'bg-blue-50 border border-blue-200 text-blue-950 ml-6'
                          : 'bg-slate-100 border border-slate-200 text-slate-900 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[10px] text-slate-500 uppercase">
                        <span>{item.role === 'caller' || item.role === 'user' ? 'Citizen Caller' : 'ResourceAI Agent'}</span>
                      </div>
                      <p className="leading-relaxed font-semibold">{item.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 text-center text-slate-600 text-xs italic">
                  No turn-by-turn dialogue stored. Raw query text: "{request.description}"
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">
                Audit Log & Status Progression
              </h4>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900">Request Created</span>
                  <span className="font-mono text-slate-600">{formatDate(request.created_at)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900">Current Status</span>
                  <StatusBadge status={request.status} />
                </div>
                {request.updated_at && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Last Modified</span>
                    <span className="font-mono text-slate-600">{formatDate(request.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
}
