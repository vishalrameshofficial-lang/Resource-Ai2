import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building,
  Package,
  Layers,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
  MapPin,
  ArrowRight,
  X,
  History,
  Send
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  EducationRequest,
  EducationInstitution,
  EducationResource,
  EducationAllocation,
  EducationStats
} from '../../types/operations';

const CATEGORIES = [
  'Infrastructure',
  'Faculty/Staff',
  'Equipment',
  'Learning Materials',
  'Digital Infrastructure',
  'Sanitation & Water',
  'Other'
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const STATUSES = [
  'ALL',
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'APPROVED',
  'ALLOCATED',
  'DELIVERED',
  'CLOSED',
  'REJECTED',
  'RETURNED_FOR_INFORMATION',
  'ON_HOLD',
  'CANCELLED'
];

export function EducationDashboardView() {
  const [subTab, setSubTab] = useState<'dashboard' | 'requests' | 'institutions' | 'resources' | 'allocations'>('dashboard');
  const [stats, setStats] = useState<EducationStats | null>(null);
  const [requests, setRequests] = useState<EducationRequest[]>([]);
  const [institutions, setInstitutions] = useState<EducationInstitution[]>([]);
  const [resources, setResources] = useState<EducationResource[]>([]);
  const [allocations, setAllocations] = useState<EducationAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modals
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showNewInstitutionModal, setShowNewInstitutionModal] = useState(false);
  const [showNewResourceModal, setShowNewResourceModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EducationRequest | null>(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<{
    request: EducationRequest;
    statusHistory: any[];
    allocations: any[];
    documents: any[];
  } | null>(null);

  // Status transition form state
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');

  // Allocation form state
  const [allocationForm, setAllocationForm] = useState({
    resource_id: '',
    allocated_quantity: 1,
    source_facility: '',
    destination_facility: '',
    notes: '',
    allocated_by: 'Education Resource Officer'
  });

  // Request form state
  const [requestForm, setRequestForm] = useState({
    institution_type: 'Government Higher Secondary School',
    institution_name: '',
    institution_code: '',
    district: '',
    taluk: '',
    village_city: '',
    location: '',
    resource_category: 'Infrastructure',
    resource_type: 'Classroom',
    specific_resource: '',
    current_availability: 'UNKNOWN',
    required_quantity: 1,
    requested_quantity: 1,
    unit: 'Units',
    reason_justification: '',
    priority: 'MEDIUM',
    requested_by: '',
    designation: '',
    department: 'Department of School Education',
    contact_phone: '',
    contact_email: ''
  });

  // Institution form state
  const [institutionForm, setInstitutionForm] = useState({
    name: '',
    code: '',
    type: 'Government School',
    district: '',
    taluk: '',
    village_city: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    contact_email: ''
  });

  // Resource form state
  const [resourceForm, setResourceForm] = useState({
    institution_id: '',
    category: 'Infrastructure',
    name: '',
    total_quantity: 10,
    available_quantity: 10,
    unit: 'Units',
    condition: 'NEW',
    district: '',
    taluk: ''
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, reqsData, instsData, resData, alcData] = await Promise.all([
        api.getEducationStats().catch(() => null),
        api.getEducationRequests().catch(() => []),
        api.getEducationInstitutions().catch(() => []),
        api.getEducationResources().catch(() => []),
        api.getEducationAllocations().catch(() => [])
      ]);
      setStats(statsData);
      setRequests(reqsData || []);
      setInstitutions(instsData || []);
      setResources(resData || []);
      setAllocations(alcData || []);
    } catch (err) {
      console.error('Error fetching education data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDetail = async (req: EducationRequest) => {
    setSelectedRequest(req);
    try {
      const detail = await api.getEducationRequestById(req.request_id);
      setSelectedRequestDetail(detail);
      setNewStatus(req.status);
    } catch (err) {
      console.error('Failed to load request detail:', err);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.institution_name || !requestForm.district || !requestForm.specific_resource) {
      alert('Please fill in required fields: Institution Name, District, and Specific Resource');
      return;
    }

    try {
      await api.createEducationRequest(requestForm);
      setShowNewRequestModal(false);
      // Reset form
      setRequestForm({
        institution_type: 'Government Higher Secondary School',
        institution_name: '',
        institution_code: '',
        district: '',
        taluk: '',
        village_city: '',
        location: '',
        resource_category: 'Infrastructure',
        resource_type: 'Classroom',
        specific_resource: '',
        current_availability: 'UNKNOWN',
        required_quantity: 1,
        requested_quantity: 1,
        unit: 'Units',
        reason_justification: '',
        priority: 'MEDIUM',
        requested_by: '',
        designation: '',
        department: 'Department of School Education',
        contact_phone: '',
        contact_email: ''
      });
      fetchData();
      alert('Education request successfully created in the official database.');
    } catch (err: any) {
      alert(`Error creating request: ${err.message}`);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedRequestDetail || !newStatus) return;
    try {
      await api.updateEducationRequestStatus(selectedRequestDetail.request.request_id, {
        status: newStatus,
        comments: statusComment,
        actor: 'Authorized Officer',
        role: 'APPROVING_OFFICER'
      });
      setStatusComment('');
      handleOpenDetail(selectedRequestDetail.request);
      fetchData();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionForm.name || !institutionForm.district) {
      alert('Please provide Institution Name and District.');
      return;
    }
    try {
      await api.createEducationInstitution(institutionForm);
      setShowNewInstitutionModal(false);
      setInstitutionForm({
        name: '',
        code: '',
        type: 'Government School',
        district: '',
        taluk: '',
        village_city: '',
        address: '',
        contact_person: '',
        contact_phone: '',
        contact_email: ''
      });
      fetchData();
    } catch (err: any) {
      alert(`Error registering institution: ${err.message}`);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceForm.name || !resourceForm.district) {
      alert('Please provide Resource Name and District.');
      return;
    }
    try {
      await api.createEducationResource(resourceForm);
      setShowNewResourceModal(false);
      fetchData();
    } catch (err: any) {
      alert(`Error adding resource: ${err.message}`);
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !allocationForm.resource_id) {
      alert('Please select a resource to allocate.');
      return;
    }
    try {
      await api.createEducationAllocation({
        request_id: selectedRequest.request_id,
        resource_id: parseInt(allocationForm.resource_id, 10),
        requested_quantity: selectedRequest.requested_quantity,
        approved_quantity: selectedRequest.requested_quantity,
        allocated_quantity: Number(allocationForm.allocated_quantity),
        source_facility: allocationForm.source_facility || 'District Education Storehouse',
        destination_facility: selectedRequest.institution_name,
        allocated_by: allocationForm.allocated_by,
        notes: allocationForm.notes
      });
      setShowAllocationModal(false);
      alert('Resource allocated successfully from authorized inventory.');
      if (selectedRequestDetail) {
        handleOpenDetail(selectedRequestDetail.request);
      }
      fetchData();
    } catch (err: any) {
      alert(`Allocation failed: ${err.message}`);
    }
  };

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.institution_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.specific_resource.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || r.resource_category === categoryFilter;
    const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-slate-700 text-slate-300 border-slate-600',
      SUBMITTED: 'bg-blue-900/50 text-blue-300 border-blue-700',
      UNDER_REVIEW: 'bg-amber-900/50 text-amber-300 border-amber-700',
      VERIFIED: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
      APPROVED: 'bg-indigo-900/50 text-indigo-300 border-indigo-700',
      ALLOCATED: 'bg-purple-900/50 text-purple-300 border-purple-700',
      DELIVERED: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
      CLOSED: 'bg-slate-800 text-slate-400 border-slate-700',
      REJECTED: 'bg-red-900/50 text-red-300 border-red-700',
      RETURNED_FOR_INFORMATION: 'bg-orange-900/50 text-orange-300 border-orange-700'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${colors[status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Module Title & Sub Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>Education Resource Management</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  GOVERNMENT MODULE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official state portal for school/college resource petitions, verification, and inventory allocations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 border border-blue-400/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Education Request</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
        <button
          onClick={() => setSubTab('dashboard')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setSubTab('requests')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'requests'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Requests ({requests.length})</span>
        </button>
        <button
          onClick={() => setSubTab('institutions')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'institutions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Institutions ({institutions.length})</span>
        </button>
        <button
          onClick={() => setSubTab('resources')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'resources'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Inventory ({resources.length})</span>
        </button>
        <button
          onClick={() => setSubTab('allocations')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'allocations'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Allocations ({allocations.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: DASHBOARD OVERVIEW */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Real Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Petitions</span>
              <div className="text-2xl font-black text-white mt-1">{stats?.totalRequests || requests.length}</div>
              <span className="text-[10px] text-slate-500">Database verified</span>
            </div>
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/40">
              <span className="text-[11px] font-semibold text-blue-300 uppercase">Submitted</span>
              <div className="text-2xl font-black text-blue-400 mt-1">{stats?.submitted || 0}</div>
              <span className="text-[10px] text-blue-400/70">Awaiting review</span>
            </div>
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40">
              <span className="text-[11px] font-semibold text-amber-300 uppercase">Under Review</span>
              <div className="text-2xl font-black text-amber-400 mt-1">{stats?.underReview || 0}</div>
              <span className="text-[10px] text-amber-400/70">Field verification</span>
            </div>
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40">
              <span className="text-[11px] font-semibold text-indigo-300 uppercase">Approved</span>
              <div className="text-2xl font-black text-indigo-400 mt-1">{stats?.approved || 0}</div>
              <span className="text-[10px] text-indigo-400/70">Sanctioned</span>
            </div>
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40">
              <span className="text-[11px] font-semibold text-purple-300 uppercase">Allocated</span>
              <div className="text-2xl font-black text-purple-400 mt-1">{stats?.allocated || 0}</div>
              <span className="text-[10px] text-purple-400/70">Stock dispatched</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
              <span className="text-[11px] font-semibold text-emerald-300 uppercase">Delivered</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">{stats?.delivered || 0}</div>
              <span className="text-[10px] text-emerald-400/70">Receipt verified</span>
            </div>
          </div>

          {/* Breakdown grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Petitions by Resource Category</span>
              </h3>
              {stats?.byCategory && stats.byCategory.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.byCategory.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{cat.resource_category}</span>
                      <span className="font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                        {cat.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center italic">No records available.</p>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Petitions by District</span>
              </h3>
              {stats?.byDistrict && stats.byDistrict.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.byDistrict.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{d.district}</span>
                      <span className="font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        {d.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center italic">No records available.</p>
              )}
            </div>
          </div>

          {/* Quick Recent Petitions list */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Recent Education Petitions</h3>
              <button
                onClick={() => setSubTab('requests')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                View all petitions →
              </button>
            </div>
            {requests.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center italic">
                No education requests have been submitted.
              </p>
            ) : (
              <div className="space-y-2">
                {requests.slice(0, 5).map((req) => (
                  <div
                    key={req.request_id}
                    onClick={() => handleOpenDetail(req)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-blue-400">{req.request_id}</span>
                        <span className="text-xs font-semibold text-white">{req.institution_name}</span>
                        <span className="text-[11px] text-slate-400">({req.district})</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {req.specific_resource} • {req.requested_quantity} {req.unit}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(req.status)}
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: REQUESTS LIST */}
      {subTab === 'requests' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID, institution, district, or resource..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Institution & District</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 italic">
                        No education requests have been submitted.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((r) => (
                      <tr
                        key={r.request_id}
                        className="hover:bg-slate-800/40 transition cursor-pointer"
                        onClick={() => handleOpenDetail(r)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{r.request_id}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{r.institution_name}</div>
                          <div className="text-[11px] text-slate-400">{r.district} • {r.institution_type}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-200">{r.specific_resource}</span>
                          <span className="block text-[11px] text-slate-400">{r.resource_category}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                          {r.requested_quantity} {r.unit}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                            r.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {r.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(r);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: INSTITUTIONS */}
      {subTab === 'institutions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Registered Educational Institutions</h3>
            <button
              onClick={() => setShowNewInstitutionModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Register Institution</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">District / Taluk</th>
                  <th className="py-3 px-4">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {institutions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 italic">
                      No educational institutions registered yet.
                    </td>
                  </tr>
                ) : (
                  institutions.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-400">{inst.code || 'N/A'}</td>
                      <td className="py-3 px-4 font-bold text-slate-200">{inst.name}</td>
                      <td className="py-3 px-4 text-slate-300">{inst.type}</td>
                      <td className="py-3 px-4 text-slate-400">{inst.district}, {inst.taluk || '-'}</td>
                      <td className="py-3 px-4 text-slate-400">{inst.contact_person || '-'} ({inst.contact_phone || 'N/A'})</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: INVENTORY / RESOURCES */}
      {subTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">State Education Resource Inventory</h3>
            <button
              onClick={() => setShowNewResourceModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Resource Stock</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Resource ID</th>
                  <th className="py-3 px-4">Name & Category</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4">Total Stock</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4">Allocated</th>
                  <th className="py-3 px-4">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {resources.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                      No resource inventory records available.
                    </td>
                  </tr>
                ) : (
                  resources.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-400">RES-EDU-{res.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{res.name}</div>
                        <div className="text-[11px] text-slate-400">{res.category}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{res.district}</td>
                      <td className="py-3 px-4 font-mono text-slate-200">{res.total_quantity} {res.unit}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{res.available_quantity} {res.unit}</td>
                      <td className="py-3 px-4 font-mono text-purple-400">{res.allocated_quantity} {res.unit}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {res.condition}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: ALLOCATIONS */}
      {subTab === 'allocations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Dispatched Resource Allocations</h3>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Allocation ID</th>
                  <th className="py-3 px-4">Petition Ref</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Source Facility</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                      No allocations recorded.
                    </td>
                  </tr>
                ) : (
                  allocations.map((alc) => (
                    <tr key={alc.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-semibold text-purple-400">{alc.allocation_id}</td>
                      <td className="py-3 px-4 font-mono text-blue-400">{alc.request_id}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">{alc.allocated_quantity}</td>
                      <td className="py-3 px-4 text-slate-300">{alc.source_facility || '-'}</td>
                      <td className="py-3 px-4 text-slate-300">{alc.destination_facility || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                          {alc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(alc.allocation_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: NEW EDUCATION REQUEST */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Manual Education Resource Petition</h3>
                <p className="text-xs text-slate-400">Government Officer Submission Form (ID generated upon database creation)</p>
              </div>
              <button onClick={() => setShowNewRequestModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Institution Type *</label>
                  <select
                    value={requestForm.institution_type}
                    onChange={(e) => setRequestForm({ ...requestForm, institution_type: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option>Government Primary School</option>
                    <option>Government Middle School</option>
                    <option>Government High School</option>
                    <option>Government Higher Secondary School</option>
                    <option>Government Arts & Science College</option>
                    <option>Government Polytechnic College</option>
                    <option>Government Engineering College</option>
                    <option>Government University</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Institution Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Govt Higher Secondary School, Anna Nagar"
                    value={requestForm.institution_name}
                    onChange={(e) => setRequestForm({ ...requestForm, institution_name: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Institution Code (if applicable)</label>
                  <input
                    type="text"
                    placeholder="e.g. SCH-330102"
                    value={requestForm.institution_code}
                    onChange={(e) => setRequestForm({ ...requestForm, institution_code: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">District *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chennai / Coimbatore"
                    value={requestForm.district}
                    onChange={(e) => setRequestForm({ ...requestForm, district: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Taluk</label>
                  <input
                    type="text"
                    placeholder="e.g. Egmore"
                    value={requestForm.taluk}
                    onChange={(e) => setRequestForm({ ...requestForm, taluk: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Village / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai"
                    value={requestForm.village_city}
                    onChange={(e) => setRequestForm({ ...requestForm, village_city: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-800/80 pt-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category *</label>
                  <select
                    value={requestForm.resource_category}
                    onChange={(e) => setRequestForm({ ...requestForm, resource_category: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Resource Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Desks, Science Lab Kit"
                    value={requestForm.resource_type}
                    onChange={(e) => setRequestForm({ ...requestForm, resource_type: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Specific Resource *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50 Dual Desks & Benches"
                    value={requestForm.specific_resource}
                    onChange={(e) => setRequestForm({ ...requestForm, specific_resource: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Requested Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={requestForm.requested_quantity}
                    onChange={(e) => setRequestForm({ ...requestForm, requested_quantity: parseInt(e.target.value, 10) || 1, required_quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={requestForm.unit}
                    onChange={(e) => setRequestForm({ ...requestForm, unit: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={requestForm.priority}
                    onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason / Justification</label>
                <textarea
                  rows={2}
                  placeholder="Official justification for required resource petition..."
                  value={requestForm.reason_justification}
                  onChange={(e) => setRequestForm({ ...requestForm, reason_justification: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-800/80 pt-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Requested By</label>
                  <input
                    type="text"
                    placeholder="Officer Name"
                    value={requestForm.requested_by}
                    onChange={(e) => setRequestForm({ ...requestForm, requested_by: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Headmaster / BEO"
                    value={requestForm.designation}
                    onChange={(e) => setRequestForm({ ...requestForm, designation: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="Official Phone"
                    value={requestForm.contact_phone}
                    onChange={(e) => setRequestForm({ ...requestForm, contact_phone: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Submit Official Petition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST DETAIL & LIFECYCLE AUDIT */}
      {selectedRequestDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-base font-black text-blue-400">
                    {selectedRequestDetail.request.request_id}
                  </span>
                  {getStatusBadge(selectedRequestDetail.request.status)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedRequestDetail.request.institution_name} • {selectedRequestDetail.request.district}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequestDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Category:</span>
                <span className="font-semibold text-slate-200">{selectedRequestDetail.request.resource_category}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Resource:</span>
                <span className="font-semibold text-slate-200">{selectedRequestDetail.request.specific_resource}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Requested Qty:</span>
                <span className="font-mono font-bold text-blue-400">
                  {selectedRequestDetail.request.requested_quantity} {selectedRequestDetail.request.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Priority:</span>
                <span className="font-bold text-amber-400">{selectedRequestDetail.request.priority}</span>
              </div>
            </div>

            {/* Officer Status Transition Form */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Authorized Officer Workflow Action</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] text-slate-400 mb-1">New Workflow Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-semibold"
                  >
                    {STATUSES.filter(s => s !== 'ALL').map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">Officer Notes / Order Ref</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. Field inspection complete, sanctioned under scheme."
                      value={statusComment}
                      onChange={(e) => setStatusComment(e.target.value)}
                      className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={handleStatusChange}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Update</span>
                    </button>
                  </div>
                </div>
              </div>
              {selectedRequestDetail.request.status === 'APPROVED' && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequest(selectedRequestDetail.request);
                      setShowAllocationModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>+ Allocate from Inventory</span>
                  </button>
                </div>
              )}
            </div>

            {/* Workflow Audit Trail History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <History className="w-4 h-4 text-slate-400" />
                <span>Audited Status History</span>
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
                {selectedRequestDetail.statusHistory.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">No status transitions yet.</p>
                ) : (
                  selectedRequestDetail.statusHistory.map((hist, i) => (
                    <div key={i} className="flex items-start justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-300">{hist.from_status || 'INIT'} → {hist.to_status}</span>
                          <span className="text-[10px] text-slate-500">by {hist.changed_by} ({hist.role})</span>
                        </div>
                        {hist.comments && <p className="text-slate-400 text-[11px] mt-0.5">{hist.comments}</p>}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(hist.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Linked Allocations */}
            {selectedRequestDetail.allocations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300">Allocated Deliveries</h4>
                <div className="space-y-1 text-xs">
                  {selectedRequestDetail.allocations.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-purple-950/20 border border-purple-900/40">
                      <span className="font-mono text-purple-400">{a.allocation_id}</span>
                      <span className="text-slate-300 font-semibold">{a.allocated_quantity} units</span>
                      <span className="text-slate-400">{a.source_facility} → {a.destination_facility}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: ALLOCATE RESOURCE */}
      {showAllocationModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Allocate Resource from Inventory</h3>
                <p className="text-xs text-slate-400">Petiton: {selectedRequest.request_id}</p>
              </div>
              <button onClick={() => setShowAllocationModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAllocation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Available Inventory Stock *</label>
                {resources.filter(r => r.available_quantity > 0).length === 0 ? (
                  <p className="text-red-400 text-xs p-2 rounded bg-red-950/30 border border-red-900/50">
                    No resources currently in stock. Please add stock in the Inventory tab first.
                  </p>
                ) : (
                  <select
                    value={allocationForm.resource_id}
                    onChange={(e) => setAllocationForm({ ...allocationForm, resource_id: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                    required
                  >
                    <option value="">-- Choose Stock Item --</option>
                    {resources.filter(r => r.available_quantity > 0).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.district}) - Available: {r.available_quantity} {r.unit}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Quantity to Allocate *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={allocationForm.allocated_quantity}
                  onChange={(e) => setAllocationForm({ ...allocationForm, allocated_quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Source Storehouse / Facility</label>
                <input
                  type="text"
                  placeholder="e.g. Central District Store, Saidapet"
                  value={allocationForm.source_facility}
                  onChange={(e) => setAllocationForm({ ...allocationForm, source_facility: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAllocationModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resources.filter(r => r.available_quantity > 0).length === 0}
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold shadow-md shadow-purple-600/30"
                >
                  Execute Sanction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD RESOURCE STOCK */}
      {showNewResourceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Add Inventory Stock</h3>
              <button onClick={() => setShowNewResourceModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateResource} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Resource Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Laboratory Kits"
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={resourceForm.category}
                    onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">District *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chennai"
                    value={resourceForm.district}
                    onChange={(e) => setResourceForm({ ...resourceForm, district: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Total Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={resourceForm.total_quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setResourceForm({ ...resourceForm, total_quantity: val, available_quantity: val });
                    }}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={resourceForm.unit}
                    onChange={(e) => setResourceForm({ ...resourceForm, unit: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewResourceModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: REGISTER INSTITUTION */}
      {showNewInstitutionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Register Educational Institution</h3>
              <button onClick={() => setShowNewInstitutionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateInstitution} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Institution Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Govt High School, Villivakkam"
                  value={institutionForm.name}
                  onChange={(e) => setInstitutionForm({ ...institutionForm, name: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. GHS-102"
                    value={institutionForm.code}
                    onChange={(e) => setInstitutionForm({ ...institutionForm, code: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Type</label>
                  <select
                    value={institutionForm.type}
                    onChange={(e) => setInstitutionForm({ ...institutionForm, type: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option>Government School</option>
                    <option>Government College</option>
                    <option>Government Polytechnic</option>
                    <option>University</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">District *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chennai"
                    value={institutionForm.district}
                    onChange={(e) => setInstitutionForm({ ...institutionForm, district: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Taluk</label>
                  <input
                    type="text"
                    placeholder="e.g. Ambattur"
                    value={institutionForm.taluk}
                    onChange={(e) => setInstitutionForm({ ...institutionForm, taluk: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewInstitutionModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Institution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
