import React, { useState } from 'react';
import {
  Building2,
  Shield,
  Send,
  Box,
  Truck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Filter
} from 'lucide-react';
import { EmergencyRequest, RequestStatus } from '../../types/emergency';
import { UrgencyBadge, StatusBadge } from '../common/Badge';
import { formatDate, formatStatusLabel } from '../../lib/utils';
import { api } from '../../lib/api';

interface GovernmentDispatchViewProps {
  requests: EmergencyRequest[];
  onSelectRequest: (req: EmergencyRequest) => void;
  onRefresh: () => void;
}

export function GovernmentDispatchView({ requests, onSelectRequest, onRefresh }: GovernmentDispatchViewProps) {
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);
  const [actionStage, setActionStage] = useState<'forward' | 'allocate' | 'transit' | 'delivered' | null>(null);
  const [govtRef, setGovtRef] = useState('');
  const [agencyName, setAgencyName] = useState('State Disaster Response Force (SDRF)');
  const [details, setDetails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Group requests into government dispatch pipeline columns
  const pendingVerification = requests.filter((r) => r.status === 'NEW');
  const verifiedQueue = requests.filter((r) => r.status === 'VERIFIED');
  const forwardedToGovt = requests.filter((r) => r.status === 'FORWARDED_TO_GOVERNMENT' || r.status === 'ACCEPTED');
  const inAllocation = requests.filter((r) => r.status === 'RESOURCE_ALLOCATED');
  const inTransit = requests.filter((r) => r.status === 'DELIVERY_IN_PROGRESS');
  const delivered = requests.filter((r) => r.status === 'DELIVERED');

  const executeAction = async () => {
    if (!selectedRequest || !actionStage) return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      if (actionStage === 'forward') {
        if (!govtRef.trim()) throw new Error('Official Government Reference # is required');
        await api.forwardToGovernment(selectedRequest.id, govtRef, agencyName, details);
        setFeedback(`Request ${selectedRequest.request_id} successfully forwarded to ${agencyName}`);
      } else if (actionStage === 'allocate') {
        await api.allocateResources(selectedRequest.id, details || 'Boats, food packets, medical kits deployed', govtRef);
        setFeedback(`Resources marked allocated for ${selectedRequest.request_id}`);
      } else if (actionStage === 'transit') {
        await api.transitDelivery(selectedRequest.id, details || 'Convoy en route', govtRef);
        setFeedback(`Delivery marked in progress for ${selectedRequest.request_id}`);
      } else if (actionStage === 'delivered') {
        await api.markDelivered(selectedRequest.id, details || 'Relief assistance safely handed over', govtRef);
        setFeedback(`Request ${selectedRequest.request_id} resolved & delivered.`);
      }

      onRefresh();
      setActionStage(null);
      setSelectedRequest(null);
      setDetails('');
      setGovtRef('');
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Info Panel */}
      <div className="glass-panel-3d p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-purple-100 border border-purple-200 text-purple-800">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <span>Government Emergency Dispatch & Coordination</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                AUDITED
              </span>
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Strict boundary enforcement: requests remain labeled{' '}
              <strong className="text-blue-700">"Recorded by ResourceAI"</strong> until an administrator records an official{' '}
              <strong className="text-purple-700">Government Agency Reference Code</strong>.
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-slate-600 font-medium shrink-0">
          <div>Govt Pending: <span className="font-extrabold text-amber-700">{verifiedQueue.length + forwardedToGovt.length}</span></div>
          <div>Active Transit: <span className="font-extrabold text-cyan-700">{inTransit.length}</span></div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center space-x-2 shadow-2xs">
          <Shield className="w-4 h-4 shrink-0 text-blue-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Action Dialog if a card is selected */}
      {selectedRequest && actionStage && (
        <div className="glass-panel-3d p-5 rounded-2xl border border-purple-200 space-y-4 bg-white shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <Send className="w-4 h-4 text-purple-600" />
              <span>
                Action on {selectedRequest.request_id} ({selectedRequest.location}) - Step: {actionStage.toUpperCase()}
              </span>
            </h4>
            <button
              onClick={() => {
                setSelectedRequest(null);
                setActionStage(null);
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {actionStage === 'forward' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Government Agency:
                  </label>
                  <select
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    <option value="State Disaster Response Force (SDRF)">SDRF (State Disaster Response)</option>
                    <option value="National Disaster Response Force (NDRF)">NDRF (National Force)</option>
                    <option value="District Disaster Management Authority (DDMA)">DDMA (District Authority)</option>
                    <option value="State Fire & Rescue Services">Fire & Rescue Services</option>
                    <option value="108 Emergency Medical Services">108 Medical Ambulance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Reference Code <span className="text-rose-600">*</span>:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TN-SDRF-2026-9921"
                    value={govtRef}
                    onChange={(e) => setGovtRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono font-bold"
                  />
                </div>
              </>
            )}

            <div className={actionStage === 'forward' ? 'md:col-span-1' : 'md:col-span-3'}>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dispatch / Resource Notes:
              </label>
              <input
                type="text"
                placeholder="Details of vehicle, boat, squad or relief delivery notes..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={executeAction}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              {isProcessing ? 'Recording Official Dispatch...' : 'Confirm Dispatch Stage'}
            </button>
          </div>
        </div>
      )}

      {/* Kanban Pipeline Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Step 1: Verified Queue */}
        <div className="glass-panel-3d p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>1. Verified Petitions</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
              {verifiedQueue.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {verifiedQueue.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 hover:border-blue-300 transition shadow-2xs"
              >
                <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                  <span>{req.request_id}</span>
                  <UrgencyBadge urgency={req.urgency} />
                </div>
                <p className="text-slate-700 font-semibold line-clamp-2">"{req.description}"</p>
                <div className="text-[11px] text-slate-500 font-medium">{req.location}</div>
                <button
                  onClick={() => {
                    setSelectedRequest(req);
                    setActionStage('forward');
                  }}
                  className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition shadow-2xs"
                >
                  Forward to Govt &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Forwarded & Accepted */}
        <div className="glass-panel-3d p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>2. Govt Assigned</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
              {forwardedToGovt.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {forwardedToGovt.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 hover:border-purple-300 transition shadow-2xs"
              >
                <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                  <span>{req.request_id}</span>
                  <StatusBadge status={req.status} />
                </div>
                <div className="p-2 rounded bg-purple-50 border border-purple-200 text-purple-900 font-mono text-[10px] font-bold">
                  Govt Ref: {req.government_reference || 'Ref Pending'}
                </div>
                <button
                  onClick={() => {
                    setSelectedRequest(req);
                    setActionStage('allocate');
                  }}
                  className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition shadow-2xs"
                >
                  Allocate Supplies &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Allocated & In Transit */}
        <div className="glass-panel-3d p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span>3. In Transit</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
              {inAllocation.length + inTransit.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {[...inAllocation, ...inTransit].map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 hover:border-cyan-300 transition shadow-2xs"
              >
                <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                  <span>{req.request_id}</span>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-slate-700 font-semibold line-clamp-1">{req.location}</p>
                <button
                  onClick={() => {
                    setSelectedRequest(req);
                    setActionStage(req.status === 'RESOURCE_ALLOCATED' ? 'transit' : 'delivered');
                  }}
                  className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[11px] transition shadow-2xs"
                >
                  {req.status === 'RESOURCE_ALLOCATED' ? 'Dispatch Convoy →' : 'Mark Delivered ✓'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Step 4: Resolved & Delivered */}
        <div className="glass-panel-3d p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>4. Resolved & Delivered</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
              {delivered.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {delivered.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                  <span>{req.request_id}</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-[11px] text-emerald-900 font-bold">{req.location}</div>
                <div className="text-[10px] font-mono text-emerald-700 font-bold">Ref: {req.government_reference}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
