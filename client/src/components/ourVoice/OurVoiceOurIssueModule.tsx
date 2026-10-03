import React, { useState, useEffect, useCallback } from 'react';
import {
  PhoneCall,
  Shield,
  Building2,
  UserCheck,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  Mic,
  MicOff,
  Send,
  RefreshCw,
  Eye,
  FileText,
  Check,
  ChevronRight,
  ExternalLink,
  Volume2,
  Copy,
  Star,
  RotateCcw,
  Sparkles,
  ArrowRight,
  User,
  Activity,
  Layers,
  PhoneForwarded,
  Sliders,
  MessageSquare
} from 'lucide-react';
import { ourVoiceApi } from '../../lib/api';

// Verified 24x7 Helpline
const EXOTEL_HELPLINE = '+91 44 4761 5477';

interface Department {
  id: string;
  code: string;
  name: string;
  name_ta?: string;
  category: string;
  emergency_number: string;
  sla_critical_hours: number;
  sla_high_hours: number;
  sla_medium_hours: number;
  sla_low_hours: number;
  subcategories: Array<{ id: string; code: string; name: string; name_ta?: string }>;
}

interface Officer {
  id: string;
  name: string;
  email: string;
  department_id: string;
  department_name?: string;
  phone?: string;
}

interface Complaint {
  id: string;
  complaint_id: string;
  title: string;
  description: string;
  category: string;
  department_id: string;
  department_name: string;
  subcategory_id?: string;
  subcategory_name?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  state: string;
  source: 'EXOTEL' | 'WEB' | 'PORTAL' | 'MOBILE';
  citizen_name: string;
  citizen_phone: string;
  citizen_email?: string;
  location_address?: string;
  landmark?: string;
  assigned_officer_id?: string;
  assigned_officer_name?: string;
  sla_deadline?: string;
  sla_breached?: number;
  audio_recording_url?: string;
  resolution_details?: string;
  resolved_at?: string;
  citizen_rating?: number;
  citizen_feedback?: string;
  is_disputed?: number;
  created_at: string;
  updated_at: string;
  status_history?: any[];
  assignment_history?: any[];
  evidence?: any[];
}

export function OurVoiceOurIssueModule() {
  // Navigation & Role Selection
  // Roles: 'ADMIN' | 'DEPARTMENT_INCHARGE' | 'CITIZEN'
  const [activePortal, setActivePortal] = useState<'ADMIN' | 'DEPARTMENT_INCHARGE' | 'CITIZEN'>('ADMIN');
  const [citizenTab, setCitizenTab] = useState<'phone_info' | 'intake' | 'track'>('phone_info');

  // State data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Selected Department for Officer portal simulation
  const [selectedDeptId, setSelectedDeptId] = useState<string>('dept-water');

  // Filters for Admin / Officer lists
  const [filterState, setFilterState] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Complaint for detail modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [targetDeptId, setTargetDeptId] = useState<string>('');
  const [targetOfficerId, setTargetOfficerId] = useState<string>('');
  const [assignNotes, setAssignNotes] = useState<string>('');

  // Action status modal
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [targetState, setTargetState] = useState<string>('IN_PROGRESS');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [resolutionDetails, setResolutionDetails] = useState<string>('');

  // Tracking query state
  const [trackIdentifier, setTrackIdentifier] = useState<string>('');
  const [trackedComplaint, setTrackedComplaint] = useState<Complaint | null>(null);
  const [trackLoading, setTrackLoading] = useState<boolean>(false);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [starRating, setStarRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');

  // Citizen Online Intake Form State
  const [intakeName, setIntakeName] = useState<string>('');
  const [intakePhone, setIntakePhone] = useState<string>('');
  const [intakeEmail, setIntakeEmail] = useState<string>('');
  const [intakeTitle, setIntakeTitle] = useState<string>('');
  const [intakeDesc, setIntakeDesc] = useState<string>('');
  const [intakeDeptId, setIntakeDeptId] = useState<string>('dept-water');
  const [intakeSubcatId, setIntakeSubcatId] = useState<string>('');
  const [intakePriority, setIntakePriority] = useState<string>('MEDIUM');
  const [intakeLocation, setIntakeLocation] = useState<string>('');
  const [intakeLandmark, setIntakeLandmark] = useState<string>('');
  const [isRecordingWebVoice, setIsRecordingWebVoice] = useState<boolean>(false);
  const [intakeSubmittedId, setIntakeSubmittedId] = useState<string | null>(null);

  // Helper notification toaster
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load initial reference data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [depts, statsData] = await Promise.all([
        ourVoiceApi.getDepartments(),
        ourVoiceApi.getStats()
      ]);
      setDepartments(depts);
      setStats(statsData);

      // Load complaints based on active portal
      await refreshComplaints();
    } catch (err: any) {
      console.warn('Failed loading Our Voice data:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activePortal, selectedDeptId, filterState, filterDept, filterPriority, searchQuery]);

  const refreshComplaints = async () => {
    try {
      const queryParams: Record<string, any> = { limit: 50 };
      if (filterState !== 'ALL') queryParams.state = filterState;
      if (filterPriority !== 'ALL') queryParams.priority = filterPriority;
      if (searchQuery.trim()) queryParams.search = searchQuery.trim();

      if (activePortal === 'ADMIN') {
        if (filterDept !== 'ALL') queryParams.department_id = filterDept;
      } else if (activePortal === 'DEPARTMENT_INCHARGE') {
        queryParams.department_id = selectedDeptId;
      }

      const res = await ourVoiceApi.getComplaints(queryParams);
      setComplaints(res.complaints || []);
      const updatedStats = await ourVoiceApi.getStats();
      setStats(updatedStats);
    } catch (err: any) {
      console.warn('Failed loading complaints:', err.message);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load officers when target department changes in assign modal
  useEffect(() => {
    if (targetDeptId) {
      ourVoiceApi.getOfficers(targetDeptId).then(setOfficers).catch(() => setOfficers([]));
    }
  }, [targetDeptId]);

  // View detail
  const handleOpenDetail = async (complaintId: string) => {
    setDetailLoading(true);
    try {
      const full = await ourVoiceApi.getComplaintById(complaintId);
      setSelectedComplaint(full);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Web Speech recognition for Citizen Intake
  const toggleWebVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome/Edge or call our 24x7 phone helpline: ' + EXOTEL_HELPLINE);
      return;
    }

    if (isRecordingWebVoice) {
      setIsRecordingWebVoice(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecordingWebVoice(true);
      showToast('Listening... Speak your complaint details clearly.', 'info');
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setIntakeDesc((prev) => (prev ? `${prev} ${speechToText}` : speechToText));
      if (!intakeTitle) {
        setIntakeTitle(speechToText.slice(0, 60));
      }
      setIsRecordingWebVoice(false);
      showToast('Voice transcribed successfully!', 'success');
    };

    recognition.onerror = (err: any) => {
      console.warn('Speech recognition error:', err.error);
      setIsRecordingWebVoice(false);
      showToast('Microphone error or stopped. Please type or call helpline.', 'error');
    };

    recognition.onend = () => {
      setIsRecordingWebVoice(false);
    };

    recognition.start();
  };

  // Submit Online Complaint
  const handleOnlineIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeTitle.trim() || !intakeDesc.trim() || !intakeName.trim() || !intakePhone.trim()) {
      showToast('Please fill in Name, Phone, Title, and Description.', 'error');
      return;
    }

    try {
      const newComplaint = await ourVoiceApi.createComplaint({
        title: intakeTitle,
        description: intakeDesc,
        department_id: intakeDeptId,
        subcategory_id: intakeSubcatId || undefined,
        priority: intakePriority,
        citizen_name: intakeName,
        citizen_phone: intakePhone,
        citizen_email: intakeEmail || undefined,
        location_address: intakeLocation,
        landmark: intakeLandmark,
        source: 'WEB'
      });

      setIntakeSubmittedId(newComplaint.complaint_id);
      showToast(`Complaint Registered! Reference ID: ${newComplaint.complaint_id}`, 'success');
      // Reset form
      setIntakeTitle('');
      setIntakeDesc('');
      setIntakeLocation('');
      setIntakeLandmark('');
      refreshComplaints();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Track Complaint Search
  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackIdentifier.trim()) return;
    setTrackLoading(true);
    try {
      const result = await ourVoiceApi.trackComplaint(trackIdentifier.trim());
      setTrackedComplaint(result);
    } catch (err: any) {
      showToast(err.message, 'error');
      setTrackedComplaint(null);
    } finally {
      setTrackLoading(false);
    }
  };

  // Submit Feedback / Dispute
  const handleFeedbackSubmit = async (isDisputed: boolean) => {
    if (!trackedComplaint) return;
    try {
      const updated = await ourVoiceApi.submitFeedback(trackedComplaint.id, {
        isDisputed,
        disputeReason: isDisputed ? disputeReason : undefined,
        rating: !isDisputed ? starRating : undefined,
        feedback: !isDisputed ? feedbackText : undefined
      });
      setTrackedComplaint(updated);
      showToast(isDisputed ? 'Resolution disputed! Complaint reopened.' : 'Thank you for your feedback! Complaint closed.', 'success');
      setDisputeReason('');
      setFeedbackText('');
      refreshComplaints();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Admin Assign / Reassign Execution
  const handleAssignSubmit = async () => {
    if (!selectedComplaint || !targetDeptId) {
      showToast('Please select a department', 'error');
      return;
    }
    try {
      const updated = await ourVoiceApi.assignComplaint(
        selectedComplaint.id,
        targetDeptId,
        targetOfficerId || undefined,
        assignNotes
      );
      setSelectedComplaint(updated);
      setAssignModalOpen(false);
      setAssignNotes('');
      showToast(`Complaint assigned to ${updated.department_name}`, 'success');
      refreshComplaints();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Officer / Admin Status Transition
  const handleStatusSubmit = async () => {
    if (!selectedComplaint || !targetState) return;
    try {
      const updated = await ourVoiceApi.updateStatus(selectedComplaint.id, targetState, {
        notes: actionNotes,
        resolutionDetails: targetState === 'RESOLVED' ? resolutionDetails : undefined
      });
      setSelectedComplaint(updated);
      setStatusModalOpen(false);
      setActionNotes('');
      setResolutionDetails('');
      showToast(`Status updated to ${targetState}`, 'success');
      refreshComplaints();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${text} to clipboard!`, 'info');
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'CRITICAL': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'SUBMITTED':
      case 'UNASSIGNED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ASSIGNED':
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'REOPENED':
      case 'ESCALATED':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const currentDept = departments.find(d => d.id === selectedDeptId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center space-x-2 text-sm font-semibold transition-all ${
          notification.type === 'error' ? 'bg-rose-900/90 text-white border-rose-700' :
          notification.type === 'info' ? 'bg-blue-900/90 text-white border-blue-700' :
          'bg-emerald-900/90 text-white border-emerald-700'
        }`}>
          <span>{notification.message}</span>
        </div>
      )}

      {/* TOP HEADER: Branding & Official Telephone Helpline Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-indigo-900/40">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Unified Civic Grievance & AI Telephony</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Our Voice Our Issue</span>
              <span className="text-base sm:text-lg font-normal text-indigo-300/80">
                (நமது குரல் நமது உரிமை)
              </span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Authoritative voice and online complaint intake, dynamic multi-department routing, automated SLA enforcement, and real-time citizen resolution tracking.
            </p>
          </div>

          {/* 24x7 Helpline Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shrink-0 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md animate-pulse">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  Verified 24x7 Exotel Helpline
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <a
                  href={`tel:${EXOTEL_HELPLINE.replace(/\s+/g, '')}`}
                  className="text-xl sm:text-2xl font-black text-white hover:text-cyan-300 tracking-wide transition"
                >
                  {EXOTEL_HELPLINE}
                </a>
                <button
                  onClick={() => copyToClipboard(EXOTEL_HELPLINE)}
                  title="Copy Phone Number"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-300">
                Speaks Tamil, English, and Hindi with Zero-Latency Response
              </p>
            </div>
          </div>
        </div>

        {/* ROLE SELECTION BAR */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 mr-2">
              Select Portal:
            </span>
            <div className="inline-flex rounded-xl bg-slate-800/80 p-1 border border-slate-700">
              <button
                onClick={() => { setActivePortal('ADMIN'); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activePortal === 'ADMIN'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Main Admin</span>
              </button>
              <button
                onClick={() => { setActivePortal('DEPARTMENT_INCHARGE'); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activePortal === 'DEPARTMENT_INCHARGE'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Department In-Charge</span>
              </button>
              <button
                onClick={() => { setActivePortal('CITIZEN'); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activePortal === 'CITIZEN'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Citizen / Public</span>
              </button>
            </div>
          </div>

          {/* Department Switcher for Officer Mode */}
          {activePortal === 'DEPARTMENT_INCHARGE' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-200 font-medium">Logged in Department:</span>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:border-indigo-400 font-semibold"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activePortal === 'ADMIN' && (
            <div className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Admin Access: Authoritative Multi-Department Controller</span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PORTAL A: MAIN ADMIN COMMAND CENTER
      ───────────────────────────────────────────────────────────── */}
      {activePortal === 'ADMIN' && (
        <div className="space-y-6">
          {/* Real-time KPI Stats from Actual Database */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Total Intake', val: stats?.total ?? 0, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
              { label: 'Unassigned', val: stats?.unassigned ?? 0, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
              { label: 'Assigned', val: stats?.assigned ?? 0, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
              { label: 'In Progress', val: stats?.inProgress ?? 0, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
              { label: 'Resolved', val: stats?.resolved ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
              { label: 'Critical SLA', val: stats?.critical ?? 0, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
              { label: 'Disputed', val: stats?.disputed ?? 0, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
              { label: 'Resolution %', val: `${stats?.resolutionRate ?? 0}%`, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
            ].map((kpi, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border ${kpi.bg} shadow-xs`}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
                <p className={`text-2xl font-black mt-1 ${kpi.color}`}>{kpi.val}</p>
              </div>
            ))}
          </div>

          {/* Filter & Search Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white/90 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ID, phone, caller or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 px-3 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* State Filter */}
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 px-3 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="ALL">All States</option>
                <option value="UNASSIGNED">Unassigned</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REOPENED">Reopened / Disputed</option>
                <option value="CLOSED">Closed</option>
              </select>

              {/* Priority Filter */}
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 px-3 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshComplaints}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* AUTHORITATIVE COMPLAINTS MASTER TABLE */}
          <div className="glass-panel rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Authoritative Complaints Master Queue</h3>
                <p className="text-xs text-slate-500">Dual intake from Exotel Telephony (+91 44 4761 5477) and Web Portal</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {complaints.length} Records Found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Ref ID / Source</th>
                    <th className="py-3 px-4">Citizen / Contact</th>
                    <th className="py-3 px-4">Subject & Description</th>
                    <th className="py-3 px-4">Assigned Department</th>
                    <th className="py-3 px-4">Priority / SLA</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {complaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No complaints match your filter. Make a test call to <strong>{EXOTEL_HELPLINE}</strong> or submit an online complaint below!
                      </td>
                    </tr>
                  ) : (
                    complaints.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{c.complaint_id}</div>
                          <div className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold text-slate-500">
                            {c.source === 'EXOTEL' ? (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 font-bold flex items-center gap-0.5">
                                <PhoneCall className="w-2.5 h-2.5" /> Phone
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold">
                                Web
                              </span>
                            )}
                            <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{c.citizen_name || 'Citizen'}</div>
                          <div className="text-slate-500 text-[11px]">{c.citizen_phone || 'N/A'}</div>
                          {c.location_address && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{c.location_address}</div>
                          )}
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-1">{c.title}</div>
                          <div className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">{c.description}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-indigo-700">{c.department_name || 'Unassigned'}</div>
                          {c.assigned_officer_name ? (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-emerald-600" />
                              <span>{c.assigned_officer_name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-600 italic">Pending officer assignment</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityColor(c.priority)}`}>
                            {c.priority}
                          </span>
                          {c.sla_deadline && (
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Due: {new Date(c.sla_deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStateBadge(c.state)}`}>
                            {c.state}
                          </span>
                          {c.is_disputed === 1 && (
                            <div className="text-[10px] text-rose-600 font-bold mt-1">Disputed by Citizen</div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenDetail(c.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition inline-flex items-center"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setTargetDeptId(c.department_id || 'dept-water');
                              setAssignModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold transition text-[11px]"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setTargetState(c.state === 'ASSIGNED' ? 'IN_PROGRESS' : 'RESOLVED');
                              setStatusModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-white hover:bg-slate-700 font-bold transition text-[11px]"
                          >
                            State
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configurable Departments & Escalation Policy Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Configured Municipal Departments ({departments.length})</span>
              </h4>
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {departments.map((dept) => (
                  <div key={dept.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{dept.name} <span className="text-slate-400 font-normal">({dept.code})</span></div>
                      <div className="text-[11px] text-slate-500">{dept.name_ta || 'Municipal Division'} • Helpline: {dept.emergency_number}</div>
                    </div>
                    <div className="text-right text-[10px] text-slate-600">
                      <div>Crit: {dept.sla_critical_hours}h | High: {dept.sla_high_hours}h</div>
                      <div className="text-slate-400">{dept.subcategories?.length || 0} subcategories</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Authoritative State Machine & Citizen Rights</span>
              </h4>
              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-indigo-900">Dual Intake Validation:</strong> Every Exotel phone call automatically converts into an authoritative record with raw voice audio preservation.
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-900">Automated SLA Timers:</strong> Dynamic deadlines based on priority. Breached tickets are automatically flagged for senior escalation.
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-900">Citizen Dispute Guarantee:</strong> Citizens retain full authority to dispute unsatisfactory resolutions, instantly reopening the ticket.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PORTAL B: DEPARTMENT IN-CHARGE PORTAL
      ───────────────────────────────────────────────────────────── */}
      {activePortal === 'DEPARTMENT_INCHARGE' && (
        <div className="space-y-6">
          {/* Department Header Badge */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-extrabold tracking-wider uppercase text-blue-200">
                Department In-Charge Work Queue
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-0.5">
                {currentDept?.name || 'Department'} Queue
              </h2>
              <p className="text-xs text-blue-100 mt-1">
                Authoritative complaints assigned specifically to this department. Officers can accept, begin investigation, submit progress logs, and resolve issues.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
                Emergency Line: {currentDept?.emergency_number || '1916'}
              </span>
            </div>
          </div>

          {/* Department Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-500">Department Assigned</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{complaints.length}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-500">In Active Work</p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {complaints.filter(c => c.state === 'IN_PROGRESS').length}
              </p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-500">Resolved</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {complaints.filter(c => c.state === 'RESOLVED' || c.state === 'CLOSED').length}
              </p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <p className="text-[11px] font-bold uppercase text-slate-500">Disputed / Reopened</p>
              <p className="text-2xl font-black text-rose-600 mt-1">
                {complaints.filter(c => c.state === 'REOPENED').length}
              </p>
            </div>
          </div>

          {/* Department Assigned Complaint Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Assigned Operational Incidents</h3>
              <button
                onClick={refreshComplaints}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Refresh Queue
              </button>
            </div>

            {complaints.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                No active complaints assigned to {currentDept?.name || 'this department'}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {complaints.map((c) => (
                  <div key={c.id} className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{c.complaint_id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStateBadge(c.state)}`}>
                            {c.state}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm mt-1">{c.title}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityColor(c.priority)}`}>
                        {c.priority}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {c.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                      <div>
                        <span className="font-semibold text-slate-700">Citizen:</span> {c.citizen_name || 'Anonymous'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Phone:</span> {c.citizen_phone || 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Location:</span> {c.location_address || 'Unspecified'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Origin:</span> {c.source}
                      </div>
                    </div>

                    {/* Audio recording player if available from Exotel phone call */}
                    {c.audio_recording_url && (
                      <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                          <Volume2 className="w-4 h-4 text-indigo-600" />
                          <span>Caller Audio Recording</span>
                        </div>
                        <audio controls src={c.audio_recording_url} className="h-7 w-48" />
                      </div>
                    )}

                    {/* Officer Action Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenDetail(c.id)}
                        className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1"
                      >
                        Inspect Audit Trail <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        {c.state === 'ASSIGNED' && (
                          <button
                            onClick={async () => {
                              await ourVoiceApi.updateStatus(c.id, 'ACCEPTED', { notes: 'Accepted by Department Officer' });
                              showToast('Complaint Accepted!', 'success');
                              refreshComplaints();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
                          >
                            Accept
                          </button>
                        )}

                        {(c.state === 'ASSIGNED' || c.state === 'ACCEPTED' || c.state === 'REOPENED') && (
                          <button
                            onClick={async () => {
                              await ourVoiceApi.updateStatus(c.id, 'IN_PROGRESS', { notes: 'Department team dispatched on-site' });
                              showToast('Investigation & work started!', 'success');
                              refreshComplaints();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition"
                          >
                            Start Work
                          </button>
                        )}

                        {c.state === 'IN_PROGRESS' && (
                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setTargetState('RESOLVED');
                              setStatusModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PORTAL C: CITIZEN / PUBLIC PORTAL
      ───────────────────────────────────────────────────────────── */}
      {activePortal === 'CITIZEN' && (
        <div className="space-y-6">
          {/* Sub-tabs for Citizen: Phone Help / Online Intake / Track */}
          <div className="flex rounded-2xl bg-slate-100 p-1.5 max-w-md mx-auto">
            <button
              onClick={() => setCitizenTab('phone_info')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                citizenTab === 'phone_info'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Raise by Phone</span>
            </button>
            <button
              onClick={() => setCitizenTab('intake')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                citizenTab === 'intake'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Online Form</span>
            </button>
            <button
              onClick={() => setCitizenTab('track')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                citizenTab === 'track'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track Complaint</span>
            </button>
          </div>

          {/* CITIZEN TAB 1: RAISE BY PHONE (PROMINENT CALL-TO-ACTION) */}
          {citizenTab === 'phone_info' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/50 shadow-lg text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
                  <PhoneCall className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>24x7 Voice Complaint Registration is LIVE</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                    Call Our Toll-Free Helpline
                  </h2>
                  <p className="text-sm text-slate-600 max-w-lg mx-auto">
                    You can register any water, electricity, sanitation, or emergency civic complaint directly by calling our automated voice assistant from any phone.
                  </p>
                </div>

                {/* Big Calling Card */}
                <div className="p-5 rounded-2xl bg-white border border-indigo-200 shadow-sm inline-block">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Official Grievance Number
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-indigo-900 tracking-wider my-1">
                    {EXOTEL_HELPLINE}
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <a
                      href={`tel:${EXOTEL_HELPLINE.replace(/\s+/g, '')}`}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
                    >
                      <PhoneForwarded className="w-4 h-4" />
                      <span>Call Now</span>
                    </a>
                    <button
                      onClick={() => copyToClipboard(EXOTEL_HELPLINE)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* How Calling Works */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-4 border-t border-slate-200/80">
                  <div className="p-4 rounded-xl bg-white/80 border border-slate-200">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mb-2">
                      1
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs">Dial & Speak Naturally</h5>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Call from any mobile or landline. The AI speaks in English, Tamil, and Hindi.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/80 border border-slate-200">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mb-2">
                      2
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs">State Location & Issue</h5>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Describe the problem (e.g. "Water pipeline burst near Anna Nagar Bus Depot").
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/80 border border-slate-200">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mb-2">
                      3
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs">Instant Official Reference</h5>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Your complaint is logged into this authoritative database and routed to officers immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CITIZEN TAB 2: ONLINE COMPLAINT FORM (WITH WEBSPEECH VOICE DICTATION) */}
          {citizenTab === 'intake' && (
            <div className="max-w-3xl mx-auto">
              {intakeSubmittedId && (
                <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <strong className="text-base">Complaint Registered Successfully!</strong>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Your official Reference ID is <strong className="font-mono text-sm underline">{intakeSubmittedId}</strong>. You can track this ticket anytime.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTrackIdentifier(intakeSubmittedId);
                      setCitizenTab('track');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
                  >
                    Track Now →
                  </button>
                </div>
              )}

              <form onSubmit={handleOnlineIntakeSubmit} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white shadow-md space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Online Complaint Registration Form</h3>
                    <p className="text-xs text-slate-500">Submit a municipal or civic issue directly to government departments</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleWebVoiceRecording}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isRecordingWebVoice
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    {isRecordingWebVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isRecordingWebVoice ? 'Stop Voice Recording' : 'Voice Dictate'}</span>
                  </button>
                </div>

                {/* Citizen Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={intakeName}
                      onChange={(e) => setIntakeName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={intakePhone}
                      onChange={(e) => setIntakePhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="citizen@example.com"
                      value={intakeEmail}
                      onChange={(e) => setIntakeEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Department & Subcategory */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Department *</label>
                    <select
                      value={intakeDeptId}
                      onChange={(e) => {
                        setIntakeDeptId(e.target.value);
                        setIntakeSubcatId('');
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Specific Issue Type</label>
                    <select
                      value={intakeSubcatId}
                      onChange={(e) => setIntakeSubcatId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                    >
                      <option value="">General Issue</option>
                      {departments.find(d => d.id === intakeDeptId)?.subcategories?.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level</label>
                    <select
                      value={intakePriority}
                      onChange={(e) => setIntakePriority(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                    >
                      <option value="LOW">Low (Routine)</option>
                      <option value="MEDIUM">Medium (Normal)</option>
                      <option value="HIGH">High (Urgent)</option>
                      <option value="CRITICAL">Critical (Life/Safety Hazard)</option>
                    </select>
                  </div>
                </div>

                {/* Complaint Title & Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Complaint Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of the issue (e.g. Sewage water leaking near primary school)"
                    value={intakeTitle}
                    onChange={(e) => setIntakeTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe exactly what happened, when it started, and who is affected. You can also click 'Voice Dictate' to speak."
                    value={intakeDesc}
                    onChange={(e) => setIntakeDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Location / Ward / Street</label>
                    <input
                      type="text"
                      placeholder="e.g. 4th Main Road, Ward 112, Anna Nagar"
                      value={intakeLocation}
                      onChange={(e) => setIntakeLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nearest Landmark</label>
                    <input
                      type="text"
                      placeholder="e.g. Opposite Government Hospital"
                      value={intakeLandmark}
                      onChange={(e) => setIntakeLandmark(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Official Grievance</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CITIZEN TAB 3: TRACK COMPLAINT & FEEDBACK / DISPUTE */}
          {citizenTab === 'track' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <form onSubmit={handleTrackSubmit} className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Enter Complaint ID (e.g. OVOI-2026-00001) or Registered Phone Number..."
                  value={trackIdentifier}
                  onChange={(e) => setTrackIdentifier(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>{trackLoading ? 'Searching...' : 'Track'}</span>
                </button>
              </form>

              {trackedComplaint && (
                <div className="glass-panel p-6 rounded-3xl border border-slate-200 bg-white shadow-md space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900">{trackedComplaint.complaint_id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStateBadge(trackedComplaint.state)}`}>
                          {trackedComplaint.state}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">{trackedComplaint.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Department: <strong>{trackedComplaint.department_name}</strong> • Priority: <strong>{trackedComplaint.priority}</strong>
                      </p>
                    </div>

                    <div className="text-right text-xs text-slate-500">
                      <div>Logged: {new Date(trackedComplaint.created_at).toLocaleString()}</div>
                      {trackedComplaint.sla_deadline && (
                        <div className="text-slate-700 font-semibold mt-0.5">
                          SLA Target: {new Date(trackedComplaint.sla_deadline).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VISUAL STATUS TIMELINE */}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Lifecycle Progress Timeline
                    </h5>
                    <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
                      {[
                        { key: 'SUBMITTED', label: '1. Submitted' },
                        { key: 'ASSIGNED', label: '2. Assigned' },
                        { key: 'IN_PROGRESS', label: '3. In Progress' },
                        { key: 'RESOLVED', label: '4. Resolved' },
                        { key: 'CLOSED', label: '5. Closed' },
                      ].map((step, idx) => {
                        const statesOrder = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
                        const currentIdx = statesOrder.indexOf(trackedComplaint.state);
                        const isPastOrCurrent = currentIdx >= idx;
                        const isCurrent = trackedComplaint.state === step.key;

                        return (
                          <div key={step.key} className="space-y-1.5">
                            <div className={`h-2 rounded-full transition-all ${
                              isCurrent ? 'bg-indigo-600 animate-pulse' :
                              isPastOrCurrent ? 'bg-emerald-500' : 'bg-slate-200'
                            }`} />
                            <span className={isCurrent ? 'text-indigo-900 font-black' : isPastOrCurrent ? 'text-emerald-700' : 'text-slate-400'}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resolution Details */}
                  {trackedComplaint.resolution_details && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Official Resolution Provided</span>
                      </div>
                      <p className="text-emerald-800 leading-relaxed">{trackedComplaint.resolution_details}</p>
                    </div>
                  )}

                  {/* Citizen Feedback & Dispute Section */}
                  {trackedComplaint.state === 'RESOLVED' && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs">Citizen Confirmation & Dispute Right</h5>
                          <p className="text-[11px] text-slate-500">
                            Has your issue been fixed satisfactorily? Rate your experience or reopen if unresolved.
                          </p>
                        </div>
                      </div>

                      {/* Positive feedback rating */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">Rate Department Resolution:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setStarRating(star)}
                                className="p-1 hover:scale-110 transition"
                              >
                                <Star className={`w-4 h-4 ${star <= starRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Optional feedback comments..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleFeedbackSubmit(false)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                        >
                          Confirm Resolution & Close Ticket
                        </button>
                      </div>

                      {/* Dispute & Reopen Option */}
                      <div className="pt-3 border-t border-slate-200 space-y-2">
                        <label className="block text-xs font-bold text-rose-700">
                          Issue NOT resolved? Dispute and Reopen:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Reason for dispute (e.g. Water is still muddy)..."
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-rose-200 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleFeedbackSubmit(true)}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Dispute & Reopen</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: ASSIGN / REASSIGN DEPARTMENT & OFFICER
      ───────────────────────────────────────────────────────────── */}
      {assignModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Assign / Reassign Complaint</h3>
                <p className="text-xs text-slate-500">{selectedComplaint.complaint_id} • {selectedComplaint.title}</p>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Department *</label>
                <select
                  value={targetDeptId}
                  onChange={(e) => {
                    setTargetDeptId(e.target.value);
                    setTargetOfficerId('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Designated Officer (Optional)</label>
                <select
                  value={targetOfficerId}
                  onChange={(e) => setTargetOfficerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="">Auto-assign to Department Pool</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assignment Directive / Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Dispatched to Sector 4 maintenance team. Requires immediate valve inspection."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubmit}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: STATUS TRANSITION MODAL
      ───────────────────────────────────────────────────────────── */}
      {statusModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Transition Complaint Status</h3>
                <p className="text-xs text-slate-500">{selectedComplaint.complaint_id} • Current: <strong>{selectedComplaint.state}</strong></p>
              </div>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Status *</label>
                <select
                  value={targetState}
                  onChange={(e) => setTargetState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value="ACCEPTED">ACCEPTED (Acknowledge & Queue)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Dispatched & Working)</option>
                  <option value="AWAITING_INFORMATION">AWAITING_INFORMATION (Need Citizen Details)</option>
                  <option value="RESOLVED">RESOLVED (Work Completed)</option>
                  <option value="ESCALATED">ESCALATED (Forwarded to High Authority)</option>
                  <option value="REJECTED">REJECTED (Invalid / Duplicate)</option>
                  <option value="CLOSED">CLOSED (Final Administrative Close)</option>
                </select>
              </div>

              {targetState === 'RESOLVED' && (
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">Resolution Summary for Citizen *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe how the issue was fixed (e.g. Damaged pipe replaced and water pressure restored)."
                    value={resolutionDetails}
                    onChange={(e) => setResolutionDetails(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/50 text-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Officer Notes / Audit Log</label>
                <textarea
                  rows={2}
                  placeholder="Optional log entry for internal department audit..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusSubmit}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition"
              >
                Apply State Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: FULL COMPLAINT DETAIL & AUDIT TRAIL
      ───────────────────────────────────────────────────────────── */}
      {selectedComplaint && !assignModalOpen && !statusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-lg">{selectedComplaint.complaint_id}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStateBadge(selectedComplaint.state)}`}>
                    {selectedComplaint.state}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityColor(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm mt-1">{selectedComplaint.title}</h4>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Complaint Description</div>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                {selectedComplaint.description}
              </p>
            </div>

            {/* Voice Audio Recording if from phone call */}
            {selectedComplaint.audio_recording_url && (
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    <span>Citizen Phone Call Voice Recording</span>
                  </div>
                  <div className="text-[10px] text-indigo-700">Captured via Exotel AgentStream Telephony</div>
                </div>
                <audio controls src={selectedComplaint.audio_recording_url} className="h-8" />
              </div>
            )}

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Citizen Name</span>
                <span className="font-semibold text-slate-800">{selectedComplaint.citizen_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Citizen Phone</span>
                <span className="font-semibold text-slate-800">{selectedComplaint.citizen_phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Intake Channel</span>
                <span className="font-semibold text-slate-800">{selectedComplaint.source}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Department</span>
                <span className="font-semibold text-indigo-700">{selectedComplaint.department_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Officer</span>
                <span className="font-semibold text-slate-800">{selectedComplaint.assigned_officer_name || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">SLA Target</span>
                <span className="font-semibold text-slate-800">
                  {selectedComplaint.sla_deadline ? new Date(selectedComplaint.sla_deadline).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Status History Audit Trail */}
            {selectedComplaint.status_history && selectedComplaint.status_history.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Authoritative Status Audit Log ({selectedComplaint.status_history.length})
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedComplaint.status_history.map((h: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800">{h.from_state} → {h.to_state}</span>
                        <span className="text-slate-400 ml-2">by {h.actor_name || 'System'} ({h.actor_role})</span>
                        {h.notes && <p className="text-slate-600 mt-0.5 italic">"{h.notes}"</p>}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default OurVoiceOurIssueModule;
