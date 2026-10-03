import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  EyeOff,
  ChevronRight,
  AlertCircle,
  Users,
  MapPin,
  Clock
} from 'lucide-react';
import { EmergencyRequest, RequestStatus, UrgencyLevel } from '../../types/emergency';
import { UrgencyBadge, StatusBadge, SourceBadge } from '../common/Badge';
import { formatDate, maskPhone } from '../../lib/utils';

interface RequestTableProps {
  requests: EmergencyRequest[];
  onSelectRequest: (request: EmergencyRequest) => void;
  isLoading?: boolean;
}

export function RequestTable({ requests, onSelectRequest, isLoading }: RequestTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});

  const togglePhoneReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (urgencyFilter !== 'ALL' && r.urgency !== urgencyFilter) return false;
    if (categoryFilter !== 'ALL' && r.emergency_category !== categoryFilter) return false;
    if (sourceFilter !== 'ALL' && r.source !== sourceFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchId = r.request_id.toLowerCase().includes(q);
      const matchName = r.caller_name?.toLowerCase().includes(q);
      const matchLoc = r.location?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchLoc && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="glass-panel-3d p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Request ID, caller name, location or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="VERIFIED">Verified</option>
            <option value="FORWARDED_TO_GOVERNMENT">Forwarded to Govt</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="RESOURCE_ALLOCATED">Resource Allocated</option>
            <option value="DELIVERY_IN_PROGRESS">Delivery in Progress</option>
            <option value="DELIVERED">Delivered</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
          >
            <option value="ALL">All Urgencies</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
          >
            <option value="ALL">All Categories</option>
            <option value="flood">Flood</option>
            <option value="landslide">Landslide</option>
            <option value="cyclone">Cyclone</option>
            <option value="medical">Medical</option>
            <option value="building_collapse">Collapse</option>
            <option value="fire">Fire</option>
            <option value="other">Other</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
          >
            <option value="ALL">All Sources</option>
            <option value="AI VOICE">AI Voice</option>
            <option value="WEB">Web Form</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-panel-3d rounded-2xl border border-slate-200 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">Time</th>
                <th className="py-3.5 px-4">Caller</th>
                <th className="py-3.5 px-4">Phone (PII)</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center">People</th>
                <th className="py-3.5 px-4">Urgency</th>
                <th className="py-3.5 px-4">Resources</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500 font-medium">
                    Loading emergency requests...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    No emergency requests match current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((req) => {
                  const isRevealed = Boolean(revealedPhones[req.id]);
                  const displayPhone = maskPhone(req.caller_phone || req.masked_phone || '', isRevealed);

                  return (
                    <tr
                      key={req.id}
                      onClick={() => onSelectRequest(req)}
                      className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                    >
                      {/* Request ID */}
                      <td className="py-3.5 px-4 font-mono font-black text-blue-700 whitespace-nowrap">
                        {req.request_id}
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 text-slate-600 font-semibold whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatDate(req.created_at)}</span>
                        </div>
                      </td>

                      {/* Caller */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div>
                          <span>{req.caller_name || 'Anonymous'}</span>
                          <span className="block text-[10px] font-semibold text-slate-500">
                            Lang: {req.caller_language}
                          </span>
                        </div>
                      </td>

                      {/* Phone with Privacy Reveal Button */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-700">
                        <div className="flex items-center space-x-1.5">
                          <span>{displayPhone}</span>
                          <button
                            onClick={(e) => togglePhoneReveal(req.id, e)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition"
                            title={isRevealed ? 'Mask phone' : 'Reveal phone'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-slate-800 font-semibold max-w-[160px] truncate">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{req.location || 'Not specified'}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 font-bold text-slate-800 uppercase tracking-wide">
                        {req.emergency_category}
                      </td>

                      {/* People */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                        <div className="inline-flex items-center space-x-1 bg-slate-100 px-2 py-0.5 rounded text-xs">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>{req.affected_people_count ?? 1}</span>
                        </div>
                      </td>

                      {/* Urgency */}
                      <td className="py-3.5 px-4">
                        <UrgencyBadge urgency={req.urgency} />
                      </td>

                      {/* Resources */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[180px] truncate">
                        {Array.isArray(req.resources_needed)
                          ? req.resources_needed.map((r: any) => typeof r === 'string' ? r : r.item).join(', ')
                          : (req as any).resources_requested || 'General Relief'}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <SourceBadge source={req.source} />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={req.status} />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSelectRequest(req)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition shadow-2xs"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
