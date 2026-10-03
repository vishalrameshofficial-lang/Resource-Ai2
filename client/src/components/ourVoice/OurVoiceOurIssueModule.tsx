import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Sliders,
  MessageSquare,
  LogIn,
  LogOut,
  UserPlus,
  Lock,
  Mail,
  Phone,
  MapPin,
  Tag,
  AlertCircle,
  CheckCircle2,
  X,
  PlusCircle,
  Compass,
  Radio,
  FileCheck2,
  UserCog,
  BarChart3,
  History
} from 'lucide-react';
import { ourVoiceApi } from '../../lib/api';

// Verified 24x7 Exotel Telephony Helpline
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
  category?: string;
  department_id?: string;
  department_name?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  state: string;
  source: 'VOICE' | 'MANUAL' | 'PHONE' | string;
  citizen_id?: string;
  citizen_name?: string;
  citizen_phone?: string;
  citizen_email?: string;
  location_name?: string;
  landmark?: string;
  assigned_officer_id?: string;
  assigned_officer_name?: string;
  incharge_name?: string;
  incharge_phone?: string;
  incharge_email?: string;
  sla_hours?: number;
  sla_deadline?: string;
  sla_status?: string;
  call_sid?: string;
  recording_url?: string;
  transcript?: string;
  resolution_notes?: string;
  resolved_at?: string;
  resolved_by?: string;
  expected_completion_date?: string;
  citizen_rating?: number;
  citizen_feedback?: string;
  dispute_reason?: string;
  created_at: string;
  updated_at: string;
  statusHistory?: any[];
  assignmentHistory?: any[];
  evidence?: any[];
}

interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'CITIZEN' | 'ADMIN' | 'DEPARTMENT_INCHARGE';
  department_id?: string;
  department_name?: string;
  department_code?: string;
  phone?: string;
}

interface OurVoiceModuleProps {
  initialPortal?: 'ADMIN' | 'DEPARTMENT_INCHARGE' | 'CITIZEN';
}

export function OurVoiceOurIssueModule({ initialPortal }: OurVoiceModuleProps) {
  // ─────────────────────────────────────────────
  // 1. PORTAL SELECTION & URL SYNC
  // ─────────────────────────────────────────────
  const [activePortal, setActivePortal] = useState<'CITIZEN' | 'ADMIN' | 'DEPARTMENT_INCHARGE'>(
    initialPortal || 'CITIZEN'
  );

  // Sync portal when prop changes
  useEffect(() => {
    if (initialPortal) {
      setActivePortal(initialPortal);
    }
  }, [initialPortal]);

  // Synchronize browser history / URL path
  const handleSwitchPortal = (portal: 'CITIZEN' | 'ADMIN' | 'DEPARTMENT_INCHARGE') => {
    setActivePortal(portal);
    const subPath = portal === 'CITIZEN' ? 'user' : portal === 'ADMIN' ? 'admin' : 'in-charge';
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', `/our-voice-our-issue/${subPath}`);
    }
  };

  // ─────────────────────────────────────────────
  // 2. AUTHENTICATION STATES PER PORTAL
  // ─────────────────────────────────────────────
  // Citizen Auth
  const [citizenToken, setCitizenToken] = useState<string | null>(() => localStorage.getItem('ovoi_citizen_token'));
  const [citizenUser, setCitizenUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('ovoi_citizen_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [citizenAuthMode, setCitizenAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [citizenLoginForm, setCitizenLoginForm] = useState({ email: 'citizen@ourvoice.gov.in', password: 'citizen123' });
  const [citizenRegisterForm, setCitizenRegisterForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [citizenAuthLoading, setCitizenAuthLoading] = useState(false);

  // Admin Auth
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('ovoi_admin_token'));
  const [adminUser, setAdminUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('ovoi_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [adminLoginForm, setAdminLoginForm] = useState({ email: 'admin@ourvoice.gov.in', password: 'admin123' });
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);

  // Department In-Charge Auth
  const [officerToken, setOfficerToken] = useState<string | null>(() => localStorage.getItem('ovoi_officer_token'));
  const [officerUser, setOfficerUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('ovoi_officer_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [officerLoginForm, setOfficerLoginForm] = useState({ email: 'water.officer@ourvoice.gov.in', password: 'officer123' });
  const [officerAuthLoading, setOfficerAuthLoading] = useState(false);

  // Global Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // ─────────────────────────────────────────────
  // 3. COMMON DATA: DEPARTMENTS & METRICS
  // ─────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load Departments & Metrics
  const loadReferenceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [depts, statsData] = await Promise.all([
        ourVoiceApi.getDepartments(),
        ourVoiceApi.getStats()
      ]);
      setDepartments(depts);
      setStats(statsData);
    } catch (err: any) {
      console.warn('Failed loading Our Voice reference data:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // ─────────────────────────────────────────────
  // 4. CITIZEN PORTAL STATE & WORKFLOWS
  // ─────────────────────────────────────────────
  const [citizenView, setCitizenView] = useState<'VOICE_INTAKE' | 'MANUAL_INTAKE' | 'MY_COMPLAINTS' | 'TRACK_ID' | 'HELPLINE'>('VOICE_INTAKE');
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [myComplaintsLoading, setMyComplaintsLoading] = useState(false);

  // Citizen Complaint Forms
  const [intakeTitle, setIntakeTitle] = useState('');
  const [intakeDesc, setIntakeDesc] = useState('');
  const [intakeDeptId, setIntakeDeptId] = useState('');
  const [intakePriority, setIntakePriority] = useState('MEDIUM');
  const [intakeLocation, setIntakeLocation] = useState('');
  const [intakeLandmark, setIntakeLandmark] = useState('');
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);
  const [submittedComplaintId, setSubmittedComplaintId] = useState<string | null>(null);

  // Speech-to-Text State
  const [speechLanguage, setSpeechLanguage] = useState<'ta-IN' | 'en-IN' | 'hi-IN'>('en-IN');
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Track by ID query
  const [trackIdInput, setTrackIdInput] = useState('');
  const [trackedComplaint, setTrackedComplaint] = useState<Complaint | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [starRating, setStarRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');

  // ─────────────────────────────────────────────
  // 5. MAIN ADMIN PORTAL STATE & WORKFLOWS
  // ─────────────────────────────────────────────
  const [adminTab, setAdminTab] = useState<'INBOX' | 'DEPARTMENTS' | 'METRICS' | 'AUDIT'>('INBOX');
  const [adminComplaints, setAdminComplaints] = useState<Complaint[]>([]);
  const [adminComplaintsLoading, setAdminComplaintsLoading] = useState(false);
  const [officersList, setOfficersList] = useState<Officer[]>([]);

  // Admin Filters
  const [adminFilterChannel, setAdminFilterChannel] = useState('ALL');
  const [adminFilterState, setAdminFilterState] = useState('ALL');
  const [adminFilterDept, setAdminFilterDept] = useState('ALL');
  const [adminFilterPriority, setAdminFilterPriority] = useState('ALL');
  const [adminSearch, setAdminSearch] = useState('');

  // Admin Assign Modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignOfficerId, setAssignOfficerId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // New Officer Provisioning Form
  const [newOfficerName, setNewOfficerName] = useState('');
  const [newOfficerEmail, setNewOfficerEmail] = useState('');
  const [newOfficerPassword, setNewOfficerPassword] = useState('');
  const [newOfficerDeptId, setNewOfficerDeptId] = useState('');
  const [newOfficerPhone, setNewOfficerPhone] = useState('');
  const [officerCreating, setOfficerCreating] = useState(false);

  // ─────────────────────────────────────────────
  // 6. DEPARTMENT IN-CHARGE PORTAL STATE
  // ─────────────────────────────────────────────
  const [officerComplaints, setOfficerComplaints] = useState<Complaint[]>([]);
  const [officerComplaintsLoading, setOfficerComplaintsLoading] = useState(false);
  const [officerFilterState, setOfficerFilterState] = useState('ALL');
  const [officerSearch, setOfficerSearch] = useState('');

  // Officer Action Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTargetState, setStatusTargetState] = useState('IN_PROGRESS');
  const [statusActionNotes, setStatusActionNotes] = useState('');
  const [statusResolutionDetails, setStatusResolutionDetails] = useState('');
  const [statusExpectedCompletionDate, setStatusExpectedCompletionDate] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // ─────────────────────────────────────────────
  // AUTHENTICATION HANDLERS
  // ─────────────────────────────────────────────
  // Citizen Login
  const handleCitizenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCitizenAuthLoading(true);
    try {
      const res = await ourVoiceApi.login(citizenLoginForm.email, citizenLoginForm.password);
      localStorage.setItem('ovoi_citizen_token', res.token);
      localStorage.setItem('ovoi_citizen_user', JSON.stringify(res.user));
      setCitizenToken(res.token);
      setCitizenUser(res.user);
      showToast(`Welcome, ${res.user.name}!`, 'success');
      loadCitizenComplaints(res.token);
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setCitizenAuthLoading(false);
    }
  };

  // Citizen Register
  const handleCitizenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenRegisterForm.name || !citizenRegisterForm.email || !citizenRegisterForm.password) {
      showToast('Name, email, and password are required', 'error');
      return;
    }
    setCitizenAuthLoading(true);
    try {
      const res = await ourVoiceApi.register({
        name: citizenRegisterForm.name,
        email: citizenRegisterForm.email,
        phone: citizenRegisterForm.phone,
        password: citizenRegisterForm.password,
        role: 'CITIZEN'
      });
      localStorage.setItem('ovoi_citizen_token', res.token);
      localStorage.setItem('ovoi_citizen_user', JSON.stringify(res.user));
      setCitizenToken(res.token);
      setCitizenUser(res.user);
      showToast(`Registration successful! Welcome, ${res.user.name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setCitizenAuthLoading(false);
    }
  };

  const handleCitizenLogout = () => {
    localStorage.removeItem('ovoi_citizen_token');
    localStorage.removeItem('ovoi_citizen_user');
    setCitizenToken(null);
    setCitizenUser(null);
    setMyComplaints([]);
    showToast('Citizen logged out successfully', 'info');
  };

  // Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthLoading(true);
    try {
      const res = await ourVoiceApi.login(adminLoginForm.email, adminLoginForm.password);
      if (res.user.role !== 'ADMIN' && res.user.role !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized: This account does not possess administrator credentials.');
      }
      localStorage.setItem('ovoi_admin_token', res.token);
      localStorage.setItem('ovoi_admin_user', JSON.stringify(res.user));
      setAdminToken(res.token);
      setAdminUser(res.user);
      showToast(`Admin session verified: ${res.user.name}`, 'success');
      loadAdminInbox(res.token);
    } catch (err: any) {
      showToast(err.message || 'Admin authentication failed', 'error');
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('ovoi_admin_token');
    localStorage.removeItem('ovoi_admin_user');
    setAdminToken(null);
    setAdminUser(null);
    setAdminComplaints([]);
    showToast('Administrator logged out', 'info');
  };

  // Officer Login
  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfficerAuthLoading(true);
    try {
      const res = await ourVoiceApi.login(officerLoginForm.email, officerLoginForm.password);
      if (res.user.role !== 'DEPARTMENT_INCHARGE') {
        throw new Error('Unauthorized: This account is not authorized as a Department In-Charge.');
      }
      localStorage.setItem('ovoi_officer_token', res.token);
      localStorage.setItem('ovoi_officer_user', JSON.stringify(res.user));
      setOfficerToken(res.token);
      setOfficerUser(res.user);
      showToast(`Authorized: ${res.user.name} (${res.user.department_name || 'Department Officer'})`, 'success');
      loadOfficerQueue(res.token, res.user.department_id);
    } catch (err: any) {
      showToast(err.message || 'Officer login failed', 'error');
    } finally {
      setOfficerAuthLoading(false);
    }
  };

  const handleOfficerLogout = () => {
    localStorage.removeItem('ovoi_officer_token');
    localStorage.removeItem('ovoi_officer_user');
    setOfficerToken(null);
    setOfficerUser(null);
    setOfficerComplaints([]);
    showToast('Department In-Charge logged out', 'info');
  };

  // ─────────────────────────────────────────────
  // CITIZEN COMPLAINT ACTIONS & SPEECH-TO-TEXT
  // ─────────────────────────────────────────────
  // Load Citizen Complaints
  const loadCitizenComplaints = async (token?: string) => {
    const activeToken = token || citizenToken;
    if (!activeToken) return;
    setMyComplaintsLoading(true);
    try {
      const list = await ourVoiceApi.getMyComplaints(activeToken);
      setMyComplaints(list);
    } catch (err: any) {
      console.warn('Failed to load citizen complaints:', err.message);
    } finally {
      setMyComplaintsLoading(false);
    }
  };

  useEffect(() => {
    if (citizenToken && citizenUser) {
      loadCitizenComplaints(citizenToken);
    }
  }, [citizenToken, citizenUser]);

  // Speech-to-Text Toggle
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Google Chrome or type your complaint below.');
      showToast('Speech recognition unavailable in this browser', 'error');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      setSpeechError(null);
      const recognition = new SpeechRecognition();
      recognition.lang = speechLanguage;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        showToast(`Listening in ${speechLanguage === 'ta-IN' ? 'Tamil' : speechLanguage === 'hi-IN' ? 'Hindi' : 'English'}... Speak naturally.`, 'info');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        setIntakeDesc((prev) => {
          const base = prev ? prev.trim() + ' ' : '';
          return base + transcript;
        });

        if (!intakeTitle && transcript.length > 5) {
          setIntakeTitle(transcript.slice(0, 60));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'network') {
          setSpeechError('Network error occurred during speech-to-text. Please check your connection.');
        } else {
          setSpeechError(`Recognition stopped (${event.error}). You can edit the text manually.`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Speech setup error:', err);
      setIsRecording(false);
      setSpeechError('Could not start microphone: ' + err.message);
    }
  };

  // Submit Complaint (Voice or Manual)
  const handleSubmitComplaint = async (channel: 'VOICE' | 'MANUAL') => {
    if (!intakeTitle.trim() || !intakeDesc.trim()) {
      showToast('Please provide both a Title and detailed Description', 'error');
      return;
    }

    setIntakeSubmitting(true);
    try {
      const payload: any = {
        title: intakeTitle.trim(),
        description: intakeDesc.trim(),
        source: channel,
        department_id: intakeDeptId || undefined,
        priority: intakePriority,
        location_address: intakeLocation.trim() || undefined,
        landmark: intakeLandmark.trim() || undefined,
        citizen_name: citizenUser?.name || 'Citizen',
        citizen_phone: citizenUser?.phone || undefined,
        citizen_email: citizenUser?.email || undefined
      };

      const result = await ourVoiceApi.createComplaint(payload, citizenToken || undefined);
      setSubmittedComplaintId(result.complaint_id);
      showToast(`Complaint registered successfully! ID: ${result.complaint_id}`, 'success');

      // Reset form
      setIntakeTitle('');
      setIntakeDesc('');
      setIntakeLocation('');
      setIntakeLandmark('');
      loadReferenceData();
      if (citizenToken) {
        loadCitizenComplaints(citizenToken);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit complaint', 'error');
    } finally {
      setIntakeSubmitting(false);
    }
  };

  // Citizen Track by ID
  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackIdInput.trim()) return;
    setTrackLoading(true);
    try {
      const complaint = await ourVoiceApi.trackComplaint(trackIdInput.trim());
      setTrackedComplaint(complaint);
    } catch (err: any) {
      setTrackedComplaint(null);
      showToast(err.message || 'Complaint not found', 'error');
    } finally {
      setTrackLoading(false);
    }
  };

  // Citizen Feedback / Dispute
  const handleFeedbackSubmit = async (isDisputed: boolean) => {
    if (!trackedComplaint) return;
    try {
      const updated = await ourVoiceApi.submitFeedback(
        trackedComplaint.id,
        {
          isDisputed,
          disputeReason: isDisputed ? disputeReason : undefined,
          rating: !isDisputed ? starRating : undefined,
          feedback: !isDisputed ? feedbackText : undefined
        },
        citizenToken || undefined
      );
      setTrackedComplaint(updated);
      showToast(isDisputed ? 'Resolution disputed! Complaint reopened.' : 'Thank you! Complaint marked closed.', 'success');
      setDisputeReason('');
      setFeedbackText('');
      loadReferenceData();
      if (citizenToken) loadCitizenComplaints(citizenToken);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit feedback', 'error');
    }
  };

  // ─────────────────────────────────────────────
  // MAIN ADMIN INBOX & ACTIONS
  // ─────────────────────────────────────────────
  const loadAdminInbox = async (token?: string) => {
    const activeToken = token || adminToken;
    if (!activeToken) return;
    setAdminComplaintsLoading(true);
    try {
      const filters: any = { limit: 100 };
      if (adminFilterChannel !== 'ALL') filters.source = adminFilterChannel;
      if (adminFilterState !== 'ALL') filters.state = adminFilterState;
      if (adminFilterDept !== 'ALL') filters.department_id = adminFilterDept;
      if (adminFilterPriority !== 'ALL') filters.priority = adminFilterPriority;
      if (adminSearch.trim()) filters.search = adminSearch.trim();

      const res = await ourVoiceApi.getComplaints(filters, activeToken);
      setAdminComplaints(res.complaints || []);
      const [statsData, officersData] = await Promise.all([
        ourVoiceApi.getStats(activeToken),
        ourVoiceApi.getOfficers(undefined, activeToken)
      ]);
      setStats(statsData);
      setOfficersList(officersData);
    } catch (err: any) {
      console.warn('Failed loading admin complaints:', err.message);
    } finally {
      setAdminComplaintsLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken && adminUser) {
      loadAdminInbox(adminToken);
    }
  }, [adminToken, adminUser, adminFilterChannel, adminFilterState, adminFilterDept, adminFilterPriority, adminSearch]);

  // Admin Assign Submit
  const handleAssignSubmit = async () => {
    if (!selectedComplaint || !assignDeptId) {
      showToast('Please select a destination department', 'error');
      return;
    }
    setAssignSubmitting(true);
    try {
      const updated = await ourVoiceApi.assignComplaint(
        selectedComplaint.id,
        assignDeptId,
        assignOfficerId || undefined,
        assignNotes,
        adminToken || undefined
      );
      setSelectedComplaint(updated);
      setAssignModalOpen(false);
      setAssignNotes('');
      showToast(`Complaint assigned to ${updated.department_name}`, 'success');
      loadAdminInbox(adminToken || undefined);
    } catch (err: any) {
      showToast(err.message || 'Failed to assign complaint', 'error');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Admin Create Officer
  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficerName || !newOfficerEmail || !newOfficerPassword || !newOfficerDeptId) {
      showToast('Name, email, password, and department are required', 'error');
      return;
    }
    setOfficerCreating(true);
    try {
      await ourVoiceApi.createOfficer(
        {
          name: newOfficerName.trim(),
          email: newOfficerEmail.trim(),
          password: newOfficerPassword,
          departmentId: newOfficerDeptId,
          phone: newOfficerPhone.trim() || undefined
        },
        adminToken || undefined
      );
      showToast(`Authorized Officer account created for ${newOfficerName}`, 'success');
      setNewOfficerName('');
      setNewOfficerEmail('');
      setNewOfficerPassword('');
      setNewOfficerPhone('');
      const updatedOfficers = await ourVoiceApi.getOfficers(undefined, adminToken || undefined);
      setOfficersList(updatedOfficers);
    } catch (err: any) {
      showToast(err.message || 'Failed to create officer', 'error');
    } finally {
      setOfficerCreating(false);
    }
  };

  // ─────────────────────────────────────────────
  // DEPARTMENT IN-CHARGE QUEUE & ACTIONS
  // ─────────────────────────────────────────────
  const loadOfficerQueue = async (token?: string, deptId?: string) => {
    const activeToken = token || officerToken;
    const departmentId = deptId || officerUser?.department_id;
    if (!activeToken || !departmentId) return;

    setOfficerComplaintsLoading(true);
    try {
      const filters: any = { department_id: departmentId, limit: 100 };
      if (officerFilterState !== 'ALL') filters.state = officerFilterState;
      if (officerSearch.trim()) filters.search = officerSearch.trim();

      const res = await ourVoiceApi.getComplaints(filters, activeToken);
      setOfficerComplaints(res.complaints || []);
    } catch (err: any) {
      console.warn('Failed loading officer queue:', err.message);
    } finally {
      setOfficerComplaintsLoading(false);
    }
  };

  useEffect(() => {
    if (officerToken && officerUser) {
      loadOfficerQueue(officerToken, officerUser.department_id);
    }
  }, [officerToken, officerUser, officerFilterState, officerSearch]);

  // Officer Update Status Submit
  const handleOfficerStatusSubmit = async () => {
    if (!selectedComplaint || !statusTargetState) return;
    setStatusSubmitting(true);
    try {
      const updated = await ourVoiceApi.updateStatus(
        selectedComplaint.id,
        statusTargetState,
        {
          notes: statusActionNotes,
          resolutionDetails: statusTargetState === 'RESOLVED' ? statusResolutionDetails : undefined,
          expectedCompletionDate: statusExpectedCompletionDate || undefined
        },
        officerToken || undefined
      );
      setSelectedComplaint(updated);
      setStatusModalOpen(false);
      setStatusActionNotes('');
      setStatusResolutionDetails('');
      setStatusExpectedCompletionDate('');
      showToast(`Status updated to ${statusTargetState}`, 'success');
      loadOfficerQueue(officerToken || undefined, officerUser?.department_id);
    } catch (err: any) {
      showToast(err.message || 'Status transition failed', 'error');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Helpers
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${text} to clipboard!`, 'info');
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
      case 'HIGH': return 'bg-amber-100 text-amber-800 border-amber-200 font-semibold';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
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
        return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse font-semibold';
      case 'NEEDS_INFORMATION':
      case 'AWAITING_INFORMATION':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'REOPENED':
      case 'ESCALATED':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getChannelBadge = (source: string) => {
    const s = (source || '').toUpperCase();
    if (s === 'VOICE' || s === 'SPEECH') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Mic className="w-3 h-3 text-indigo-600" />
          VOICE (Web)
        </span>
      );
    }
    if (s === 'PHONE' || s === 'EXOTEL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Phone className="w-3 h-3 text-emerald-600" />
          PHONE (Helpline)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
        <FileText className="w-3 h-3 text-slate-600" />
        MANUAL (Typed)
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center space-x-3 text-sm font-semibold transition-all ${
            notification.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : notification.type === 'info'
              ? 'bg-blue-900 text-white border-blue-700'
              : 'bg-emerald-900 text-white border-emerald-700'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-300" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          TOP BRANDING & EXOTEL HELPLINE BANNER
      ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-indigo-900/40">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Resource AI 2.0 Civic Operations Module
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Our Voice Our Issue
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Unified Civic Grievance Redressal platform connecting Citizens, Administrators, and Department In-Charges across Voice, Manual Petitions, and Exotel Telephony.
            </p>
          </div>

          {/* Verified Helpline Banner */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-indigo-500/30 p-4 sm:p-5 flex items-center justify-between sm:justify-start gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <PhoneCall className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                24/7 Voice Bot Helpline
              </div>
              <div className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{EXOTEL_HELPLINE}</span>
                <button
                  onClick={() => copyToClipboard(EXOTEL_HELPLINE)}
                  className="p-1 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-white transition"
                  title="Copy Phone Number"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-indigo-300 font-medium">
                Autonomous Speech Intake & Auto-Dispatch
              </div>
            </div>
          </div>
        </div>

        {/* THREE AUTHENTICATED PORTALS SWITCHER */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSwitchPortal('CITIZEN')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                activePortal === 'CITIZEN'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-blue-400/40'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
              }`}
            >
              <User className="w-4 h-4" />
              <span>1. Citizen / User Portal</span>
              {citizenUser && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Authenticated" />
              )}
            </button>

            <button
              onClick={() => handleSwitchPortal('ADMIN')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                activePortal === 'ADMIN'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>2. Main Admin Portal</span>
              {adminUser && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Authenticated" />
              )}
            </button>

            <button
              onClick={() => handleSwitchPortal('DEPARTMENT_INCHARGE')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                activePortal === 'DEPARTMENT_INCHARGE'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>3. Department In-Charge Portal</span>
              {officerUser && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Authenticated" />
              )}
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Direct Routes: <code className="text-indigo-300">/user</code> • <code className="text-indigo-300">/admin</code> • <code className="text-indigo-300">/in-charge</code>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          PORTAL 1: CITIZEN / USER PORTAL
      ───────────────────────────────────────────── */}
      {activePortal === 'CITIZEN' && (
        <div className="space-y-6">
          {/* Authenticated Citizen Header OR Login/Register */}
          {!citizenUser ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Citizen Redressal Access
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sign in to track your grievances or register a new verified citizen profile.
                  </p>
                </div>

                {/* Login / Register Toggle */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold text-slate-600">
                  <button
                    onClick={() => setCitizenAuthMode('LOGIN')}
                    className={`py-2 rounded-xl transition ${
                      citizenAuthMode === 'LOGIN' ? 'bg-white text-blue-600 shadow' : 'hover:text-slate-900'
                    }`}
                  >
                    Citizen Sign In
                  </button>
                  <button
                    onClick={() => setCitizenAuthMode('REGISTER')}
                    className={`py-2 rounded-xl transition ${
                      citizenAuthMode === 'REGISTER' ? 'bg-white text-blue-600 shadow' : 'hover:text-slate-900'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {citizenAuthMode === 'LOGIN' ? (
                  <form onSubmit={handleCitizenLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={citizenLoginForm.email}
                        onChange={(e) => setCitizenLoginForm({ ...citizenLoginForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={citizenLoginForm.password}
                        onChange={(e) => setCitizenLoginForm({ ...citizenLoginForm, password: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={citizenAuthLoading}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                    >
                      {citizenAuthLoading ? 'Authenticating...' : 'Sign In as Citizen'}
                    </button>
                    <div className="text-[11px] text-slate-400 text-center">
                      Preset Citizen: <code className="text-blue-600">citizen@ourvoice.gov.in / citizen123</code>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleCitizenRegister} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., K. Annamalai"
                        value={citizenRegisterForm.name}
                        onChange={(e) => setCitizenRegisterForm({ ...citizenRegisterForm, name: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="citizen@example.com"
                        value={citizenRegisterForm.email}
                        onChange={(e) => setCitizenRegisterForm({ ...citizenRegisterForm, email: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (SMS & WhatsApp updates)</label>
                      <input
                        type="tel"
                        placeholder="+91 98840 12345"
                        value={citizenRegisterForm.phone}
                        onChange={(e) => setCitizenRegisterForm({ ...citizenRegisterForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={citizenRegisterForm.password}
                        onChange={(e) => setCitizenRegisterForm({ ...citizenRegisterForm, password: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={citizenAuthLoading}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                    >
                      {citizenAuthLoading ? 'Creating Profile...' : 'Complete Citizen Registration'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                  {citizenUser.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">{citizenUser.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      VERIFIED CITIZEN
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {citizenUser.email} {citizenUser.phone ? `• ${citizenUser.phone}` : ''}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCitizenLogout}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}

          {/* Citizen Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setCitizenView('VOICE_INTAKE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                citizenView === 'VOICE_INTAKE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Natural Speech-to-Text Complaint</span>
            </button>

            <button
              onClick={() => setCitizenView('MANUAL_INTAKE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                citizenView === 'MANUAL_INTAKE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Manual Typed Complaint / Petition</span>
            </button>

            <button
              onClick={() => {
                setCitizenView('MY_COMPLAINTS');
                if (citizenToken) loadCitizenComplaints(citizenToken);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                citizenView === 'MY_COMPLAINTS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>My Complaints ({myComplaints.length})</span>
            </button>

            <button
              onClick={() => setCitizenView('TRACK_ID')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                citizenView === 'TRACK_ID'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Track by Reference ID</span>
            </button>

            <button
              onClick={() => setCitizenView('HELPLINE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                citizenView === 'HELPLINE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>24/7 Telephone Voice Bot</span>
            </button>
          </div>

          {/* CITIZEN SUB-VIEW: NATURAL SPEECH-TO-TEXT */}
          {citizenView === 'VOICE_INTAKE' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-extrabold uppercase tracking-wider mb-1">
                  <Mic className="w-4 h-4" />
                  Channel: VOICE (Speech Recognition)
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Voice Complaint Intake
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Speak naturally in your preferred language. The AI will convert your speech to editable text, which you can verify before submission.
                </p>
              </div>

              {/* Language Selection & Mic Interface */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100 text-center space-y-4">
                <div className="inline-flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">Preferred Language:</span>
                  <select
                    value={speechLanguage}
                    onChange={(e: any) => setSpeechLanguage(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-bold text-indigo-900 focus:outline-none"
                  >
                    <option value="en-IN">English (India)</option>
                    <option value="ta-IN">Tamil (தமிழ்)</option>
                    <option value="hi-IN">Hindi (हिन्दी)</option>
                  </select>
                </div>

                <div className="py-4">
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white shadow-xl transition-all transform hover:scale-105 ${
                      isRecording
                        ? 'bg-rose-600 animate-pulse ring-8 ring-rose-200'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                  </button>
                  <div className="mt-3 text-xs font-bold text-slate-700">
                    {isRecording ? '🔴 Listening... Click to stop' : 'Click microphone to begin speaking'}
                  </div>
                  {speechError && (
                    <div className="mt-2 text-xs text-rose-600 font-semibold max-w-md mx-auto">
                      {speechError}
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Transcription & Submission Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Complaint Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Short summary of the grievance"
                    value={intakeTitle}
                    onChange={(e) => setIntakeTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Editable Voice Transcript / Details <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Review and edit your voice transcription here</span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    placeholder="Transcribed voice description will appear here. You can edit, correct, or add more details..."
                    value={intakeDesc}
                    onChange={(e) => setIntakeDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department (Optional - Leave blank for Admin Review)
                    </label>
                    <select
                      value={intakeDeptId}
                      onChange={(e) => setIntakeDeptId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Unassigned (Admin will categorize)</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                    <select
                      value={intakePriority}
                      onChange={(e) => setIntakePriority(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="CRITICAL">Critical (Immediate Hazard)</option>
                      <option value="HIGH">High (Major Disruption)</option>
                      <option value="MEDIUM">Medium (Normal)</option>
                      <option value="LOW">Low (Minor Concern)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Affected Location / Address</label>
                    <input
                      type="text"
                      placeholder="e.g., 4th Cross St, Anna Nagar, Ward 112"
                      value={intakeLocation}
                      onChange={(e) => setIntakeLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Landmark</label>
                    <input
                      type="text"
                      placeholder="Near Bus Depot / Water Tank"
                      value={intakeLandmark}
                      onChange={(e) => setIntakeLandmark(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={intakeSubmitting}
                  onClick={() => handleSubmitComplaint('VOICE')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{intakeSubmitting ? 'Registering Complaint...' : 'Submit Voice Complaint'}</span>
                </button>
              </div>

              {submittedComplaintId && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                    <div>
                      <div className="font-bold text-sm">Complaint Registered!</div>
                      <div className="text-xs text-emerald-700">Reference ID: <span className="font-extrabold">{submittedComplaintId}</span></div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTrackIdInput(submittedComplaintId);
                      setCitizenView('TRACK_ID');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                  >
                    Track Progress →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CITIZEN SUB-VIEW: MANUAL TYPED COMPLAINT */}
          {citizenView === 'MANUAL_INTAKE' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-blue-600 text-xs font-extrabold uppercase tracking-wider mb-1">
                  <FileText className="w-4 h-4" />
                  Channel: MANUAL (Typed Petition)
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Manual Grievance & Petition Submission
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Submit a formal petition or municipal grievance with detailed specifications and affected community metrics.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Petition Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Clear summary of the municipal or community issue"
                    value={intakeTitle}
                    onChange={(e) => setIntakeTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Comprehensive Description & Grievance Particulars <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Explain the grievance in full detail, how long it has persisted, and affected residents..."
                    value={intakeDesc}
                    onChange={(e) => setIntakeDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Responsible Department</label>
                    <select
                      value={intakeDeptId}
                      onChange={(e) => setIntakeDeptId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Unassigned / Let Admin Route</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Priority</label>
                    <select
                      value={intakePriority}
                      onChange={(e) => setIntakePriority(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="CRITICAL">Critical (Immediate Hazard)</option>
                      <option value="HIGH">High (Disruption to Community)</option>
                      <option value="MEDIUM">Medium (Standard Request)</option>
                      <option value="LOW">Low (Minor Non-Urgent)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Location Address</label>
                    <input
                      type="text"
                      placeholder="Street, Ward, Area"
                      value={intakeLocation}
                      onChange={(e) => setIntakeLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Landmark</label>
                    <input
                      type="text"
                      placeholder="Nearby school, bridge, hospital"
                      value={intakeLandmark}
                      onChange={(e) => setIntakeLandmark(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={intakeSubmitting}
                  onClick={() => handleSubmitComplaint('MANUAL')}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{intakeSubmitting ? 'Submitting Petition...' : 'Submit Manual Petition'}</span>
                </button>
              </div>
            </div>
          )}

          {/* CITIZEN SUB-VIEW: MY COMPLAINTS */}
          {citizenView === 'MY_COMPLAINTS' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    My Registered Complaints
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized history of grievances submitted through your citizen account.
                  </p>
                </div>
                <button
                  onClick={() => loadCitizenComplaints()}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {!citizenUser ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Please sign in as a citizen above to view your personal complaint history.
                </div>
              ) : myComplaintsLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">Loading complaints...</div>
              ) : myComplaints.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <div className="text-slate-700 font-bold text-sm">No complaints submitted yet.</div>
                  <button
                    onClick={() => setCitizenView('VOICE_INTAKE')}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    Register Your First Complaint →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myComplaints.map((c) => (
                    <div
                      key={c.id}
                      className="p-5 rounded-2xl border border-slate-200 hover:border-blue-400 transition bg-slate-50/50 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            {c.complaint_id}
                          </span>
                          {getChannelBadge(c.source)}
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStateBadge(c.state)}`}>
                            {c.state}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {new Date(c.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{c.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.description}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60 gap-2">
                        <div>
                          Department: <span className="font-bold text-slate-700">{c.department_name || 'Unassigned'}</span>
                          {c.incharge_name && (
                            <span> • Officer: <span className="font-bold text-slate-700">{c.incharge_name}</span></span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setTrackIdInput(c.complaint_id);
                            setCitizenView('TRACK_ID');
                            ourVoiceApi.trackComplaint(c.complaint_id).then(setTrackedComplaint);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                        >
                          View Full Timeline & Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CITIZEN SUB-VIEW: TRACK BY ID */}
          {citizenView === 'TRACK_ID' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-900">
                  Track Complaint Progress
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your unique reference ID (e.g., OVOI-2026-XXXXX) to view live redressal progress.
                </p>
              </div>

              <form onSubmit={handleTrackSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter OVOI-2026-XXXXX"
                  value={trackIdInput}
                  onChange={(e) => setTrackIdInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow transition disabled:opacity-50"
                >
                  {trackLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {trackedComplaint && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <div className="text-xs font-mono text-blue-700 font-extrabold">{trackedComplaint.complaint_id}</div>
                      <h4 className="text-lg font-black text-slate-900 mt-0.5">{trackedComplaint.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStateBadge(trackedComplaint.state)}`}>
                        {trackedComplaint.state}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200">
                    {trackedComplaint.description}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-slate-400 font-semibold">Department</div>
                      <div className="font-bold text-slate-800 mt-0.5">{trackedComplaint.department_name || 'Under Review'}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-slate-400 font-semibold">Priority</div>
                      <div className="font-bold text-slate-800 mt-0.5">{trackedComplaint.priority}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-slate-400 font-semibold">Location</div>
                      <div className="font-bold text-slate-800 mt-0.5">{trackedComplaint.location_name || 'Unspecified'}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-slate-400 font-semibold">SLA Deadline</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {trackedComplaint.sla_deadline ? new Date(trackedComplaint.sla_deadline).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Resolution notes if resolved */}
                  {trackedComplaint.resolution_notes && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                      <div className="font-bold text-xs uppercase tracking-wider text-emerald-800">
                        Officer Resolution Summary:
                      </div>
                      <div className="text-xs leading-relaxed">{trackedComplaint.resolution_notes}</div>
                    </div>
                  )}

                  {/* Dispute / Feedback if Resolved */}
                  {(trackedComplaint.state === 'RESOLVED' || trackedComplaint.state === 'CLOSED') && (
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                      <div className="text-xs font-bold text-slate-900">Citizen Verification & Satisfaction Feedback:</div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleFeedbackSubmit(false)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                        >
                          Confirm & Close Grievance
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt('Please enter the reason for disputing this resolution:');
                            if (reason) {
                              setDisputeReason(reason);
                              handleFeedbackSubmit(true);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
                        >
                          Dispute Resolution / Reopen
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audit Status History */}
                  {trackedComplaint.statusHistory && trackedComplaint.statusHistory.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="text-xs font-bold text-slate-800">Timeline of Progress:</div>
                      <div className="space-y-2">
                        {trackedComplaint.statusHistory.map((s: any, idx: number) => (
                          <div key={idx} className="text-xs flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-800">{s.to_state}</div>
                              <div className="text-slate-500">{s.notes || 'Status updated'}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{new Date(s.created_at).toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CITIZEN SUB-VIEW: HELPLINE & BOT INFO */}
          {citizenView === 'HELPLINE' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-extrabold uppercase tracking-wider mb-1">
                  <PhoneCall className="w-4 h-4" />
                  Channel: PHONE (Telephony Stream)
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  24/7 Citizen Emergency & Grievance Helpline
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Our Voice Our Issue is directly integrated with Resource AI's Exotel voice-bot stream.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                    <Phone className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Official Telephone Hotline</div>
                    <div className="text-2xl font-black">{EXOTEL_HELPLINE}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-700">
                  <div className="p-3 bg-slate-800/80 rounded-xl">
                    <div className="font-bold text-white mb-1">1. Dial In</div>
                    <div className="text-slate-300">Call anytime from any phone without requiring internet access.</div>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-xl">
                    <div className="font-bold text-white mb-1">2. AI Voice Intake</div>
                    <div className="text-slate-300">Speak naturally in Tamil or English. Faster-Whisper transcribes live.</div>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-xl">
                    <div className="font-bold text-white mb-1">3. Redressal Registered</div>
                    <div className="text-slate-300">Complaint automatically created with channel PHONE in database.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          PORTAL 2: MAIN ADMIN PORTAL
      ───────────────────────────────────────────── */}
      {activePortal === 'ADMIN' && (
        <div className="space-y-6">
          {!adminUser ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Main Admin Authentication
                  </h2>
                  <p className="text-xs text-slate-500">
                    Restricted government administrator portal. Public registration is strictly prohibited.
                  </p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Admin Email</label>
                    <input
                      type="email"
                      required
                      value={adminLoginForm.email}
                      onChange={(e) => setAdminLoginForm({ ...adminLoginForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Security Key / Password</label>
                    <input
                      type="password"
                      required
                      value={adminLoginForm.password}
                      onChange={(e) => setAdminLoginForm({ ...adminLoginForm, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={adminAuthLoading}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                  >
                    {adminAuthLoading ? 'Verifying Credentials...' : 'Authenticate as Administrator'}
                  </button>
                  <div className="text-[11px] text-slate-400 text-center">
                    Authorized Super Admin: <code className="text-purple-600">admin@ourvoice.gov.in / admin123</code>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Admin Session Header */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{adminUser.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                        MAIN ADMIN
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{adminUser.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadAdminInbox()}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                    title="Refresh Data"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleAdminLogout}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Admin Navigation Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                <button
                  onClick={() => setAdminTab('INBOX')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    adminTab === 'INBOX'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Central Complaint Inbox</span>
                </button>

                <button
                  onClick={() => setAdminTab('DEPARTMENTS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    adminTab === 'DEPARTMENTS'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Department & In-Charge Management</span>
                </button>

                <button
                  onClick={() => setAdminTab('METRICS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    adminTab === 'METRICS'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Database Metrics Dashboard</span>
                </button>
              </div>

              {/* TAB 1: CENTRAL INBOX */}
              {adminTab === 'INBOX' && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                  {/* Filters Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Search</label>
                      <input
                        type="text"
                        placeholder="Search ID, title, phone..."
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Channel</label>
                      <select
                        value={adminFilterChannel}
                        onChange={(e) => setAdminFilterChannel(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                      >
                        <option value="ALL">All Channels</option>
                        <option value="VOICE">VOICE (Speech-to-Text)</option>
                        <option value="MANUAL">MANUAL (Typed Petition)</option>
                        <option value="PHONE">PHONE (Helpline Call)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
                      <select
                        value={adminFilterState}
                        onChange={(e) => setAdminFilterState(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="UNASSIGNED">Unassigned</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="NEEDS_INFORMATION">Needs Information</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                        <option value="REOPENED">Reopened</option>
                        <option value="ESCALATED">Escalated</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Department</label>
                      <select
                        value={adminFilterDept}
                        onChange={(e) => setAdminFilterDept(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                      >
                        <option value="ALL">All Departments</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Priority</label>
                      <select
                        value={adminFilterPriority}
                        onChange={(e) => setAdminFilterPriority(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                      >
                        <option value="ALL">All Priorities</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>

                  {/* Complaints Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">Ref ID</th>
                          <th className="p-3">Channel</th>
                          <th className="p-3">Title & Summary</th>
                          <th className="p-3">Department</th>
                          <th className="p-3">Priority</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Date</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminComplaintsLoading ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">Loading complaints...</td>
                          </tr>
                        ) : adminComplaints.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">No complaints matching the selected filters.</td>
                          </tr>
                        ) : (
                          adminComplaints.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50 transition">
                              <td className="p-3 font-mono font-bold text-purple-700">{c.complaint_id}</td>
                              <td className="p-3">{getChannelBadge(c.source)}</td>
                              <td className="p-3 max-w-xs">
                                <div className="font-bold text-slate-900 truncate">{c.title}</div>
                                <div className="text-slate-500 truncate text-[11px]">{c.description}</div>
                              </td>
                              <td className="p-3">
                                {c.department_name ? (
                                  <span className="font-bold text-slate-800">{c.department_name}</span>
                                ) : (
                                  <span className="text-rose-600 font-bold">Unassigned</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold border ${getPriorityBadge(c.priority)}`}>
                                  {c.priority}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold border ${getStateBadge(c.state)}`}>
                                  {c.state}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 text-[11px]">
                                {new Date(c.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedComplaint(c);
                                    setAssignDeptId(c.department_id || '');
                                    setAssignOfficerId(c.assigned_officer_id || '');
                                    setAssignModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition"
                                >
                                  Review / Assign
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: DEPARTMENT & IN-CHARGE MANAGEMENT */}
              {adminTab === 'DEPARTMENTS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Department List */}
                  <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                    <h3 className="text-lg font-black text-slate-900">
                      Municipal Departments & SLA Benchmarks
                    </h3>
                    <div className="space-y-3">
                      {departments.map((d) => (
                        <div key={d.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {d.code}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">{d.name}</span>
                              {d.name_ta && <span className="text-xs text-slate-500">({d.name_ta})</span>}
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Helpline: {d.emergency_number}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-[11px] pt-1">
                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <span className="text-slate-400 block">Critical:</span>
                              <span className="font-bold text-rose-600">{d.sla_critical_hours} hrs</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <span className="text-slate-400 block">High:</span>
                              <span className="font-bold text-amber-600">{d.sla_high_hours} hrs</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <span className="text-slate-400 block">Medium:</span>
                              <span className="font-bold text-blue-600">{d.sla_medium_hours} hrs</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <span className="text-slate-400 block">Low:</span>
                              <span className="font-bold text-slate-600">{d.sla_low_hours} hrs</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Provision Officer Form */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-purple-600" />
                      Provision Officer Account
                    </h3>
                    <p className="text-xs text-slate-500">
                      Create an authorized Department In-Charge credential bound to a municipal department.
                    </p>

                    <form onSubmit={handleCreateOfficer} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Officer Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Er. S. Ramanathan"
                          value={newOfficerName}
                          onChange={(e) => setNewOfficerName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Officer Email</label>
                        <input
                          type="email"
                          required
                          placeholder="officer@ourvoice.gov.in"
                          value={newOfficerEmail}
                          onChange={(e) => setNewOfficerEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={newOfficerPassword}
                          onChange={(e) => setNewOfficerPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                        <select
                          required
                          value={newOfficerDeptId}
                          onChange={(e) => setNewOfficerDeptId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                        >
                          <option value="">Select Department</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Official Mobile</label>
                        <input
                          type="tel"
                          placeholder="+91 94440 12345"
                          value={newOfficerPhone}
                          onChange={(e) => setNewOfficerPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={officerCreating}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition disabled:opacity-50"
                      >
                        {officerCreating ? 'Provisioning...' : 'Provision In-Charge Officer'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 3: METRICS DASHBOARD */}
              {adminTab === 'METRICS' && (
                <div className="space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Total Complaints</div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{stats?.total || 0}</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-bold text-rose-500 uppercase">Unassigned</div>
                      <div className="text-2xl font-black text-rose-600 mt-1">{stats?.unassigned || 0}</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-bold text-blue-500 uppercase">Assigned</div>
                      <div className="text-2xl font-black text-blue-600 mt-1">{stats?.assigned || 0}</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-bold text-amber-500 uppercase">In Progress</div>
                      <div className="text-2xl font-black text-amber-600 mt-1">{stats?.inProgress || 0}</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-bold text-emerald-500 uppercase">Resolved / Closed</div>
                      <div className="text-2xl font-black text-emerald-600 mt-1">{stats?.resolved || 0}</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-bold text-purple-500 uppercase">Resolution Rate</div>
                      <div className="text-2xl font-black text-purple-600 mt-1">{stats?.resolutionRate || 0}%</div>
                    </div>
                  </div>

                  {/* Channel Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Voice Intake (Web)</div>
                        <div className="text-2xl font-black text-indigo-700 mt-1">{stats?.byChannel?.VOICE || 0}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Mic className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Manual Petitions</div>
                        <div className="text-2xl font-black text-slate-800 mt-1">{stats?.byChannel?.MANUAL || 0}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Phone (Exotel Helpline)</div>
                        <div className="text-2xl font-black text-emerald-700 mt-1">{stats?.byChannel?.PHONE || 0}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Phone className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          PORTAL 3: DEPARTMENT IN-CHARGE PORTAL
      ───────────────────────────────────────────── */}
      {activePortal === 'DEPARTMENT_INCHARGE' && (
        <div className="space-y-6">
          {!officerUser ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Department In-Charge Portal
                  </h2>
                  <p className="text-xs text-slate-500">
                    Restricted officer access. Login credentials must be issued by the Main Administrator.
                  </p>
                </div>

                <form onSubmit={handleOfficerLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      required
                      value={officerLoginForm.email}
                      onChange={(e) => setOfficerLoginForm({ ...officerLoginForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={officerLoginForm.password}
                      onChange={(e) => setOfficerLoginForm({ ...officerLoginForm, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={officerAuthLoading}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                  >
                    {officerAuthLoading ? 'Verifying Department Scope...' : 'Login as Department Officer'}
                  </button>
                  <div className="text-[11px] text-slate-400 text-center">
                    Sample In-Charge Accounts:
                    <div className="text-emerald-700 font-mono mt-1">water.officer@ourvoice.gov.in / officer123</div>
                    <div className="text-emerald-700 font-mono">electricity.officer@ourvoice.gov.in / officer123</div>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Officer Scope Banner */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{officerUser.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        AUTHORIZED OFFICER
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Scope: <span className="font-bold text-slate-700">{officerUser.department_name || 'Assigned Department'}</span> • {officerUser.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadOfficerQueue(officerToken || undefined, officerUser.department_id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                    title="Refresh Assigned Queue"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleOfficerLogout}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Officer Queue */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Assigned Grievance Action Queue
                    </h3>
                    <p className="text-xs text-slate-500">
                      Backend query strictly isolates cases to <span className="font-bold text-slate-700">{officerUser.department_name}</span>.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={officerFilterState}
                      onChange={(e) => setOfficerFilterState(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="ACCEPTED">Accepted</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="NEEDS_INFORMATION">Needs Information</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Search queue..."
                      value={officerSearch}
                      onChange={(e) => setOfficerSearch(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Queue Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Ref ID</th>
                        <th className="p-3">Channel</th>
                        <th className="p-3">Title & Particulars</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Citizen Contact</th>
                        <th className="p-3 text-right">Process</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {officerComplaintsLoading ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">Loading department queue...</td>
                        </tr>
                      ) : officerComplaints.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">No grievances assigned to your department right now.</td>
                        </tr>
                      ) : (
                        officerComplaints.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50 transition">
                            <td className="p-3 font-mono font-bold text-emerald-700">{c.complaint_id}</td>
                            <td className="p-3">{getChannelBadge(c.source)}</td>
                            <td className="p-3 max-w-xs">
                              <div className="font-bold text-slate-900 truncate">{c.title}</div>
                              <div className="text-slate-500 truncate text-[11px]">{c.description}</div>
                              {c.location_name && (
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {c.location_name}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold border ${getPriorityBadge(c.priority)}`}>
                                {c.priority}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold border ${getStateBadge(c.state)}`}>
                                {c.state}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600">
                              <div>{c.citizen_name || 'Citizen'}</div>
                              {c.citizen_phone && <div className="text-[10px] text-slate-400">{c.citizen_phone}</div>}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setStatusTargetState(c.state === 'ASSIGNED' ? 'ACCEPTED' : 'IN_PROGRESS');
                                  setStatusModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                              >
                                Take Action
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
        </div>
      )}

      {/* ─────────────────────────────────────────────
          ADMIN REVIEW & ASSIGN MODAL
      ───────────────────────────────────────────── */}
      {assignModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-black text-purple-700">{selectedComplaint.complaint_id}</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">Admin Review & Department Assignment</h3>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Complaint Summary */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{selectedComplaint.title}</span>
                {getChannelBadge(selectedComplaint.source)}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{selectedComplaint.description}</p>
              {selectedComplaint.transcript && (
                <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs font-mono text-indigo-900">
                  <div className="font-bold text-[10px] text-indigo-600 uppercase mb-1">Raw Telephony / Audio Transcript:</div>
                  {selectedComplaint.transcript}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Responsible Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignDeptId}
                  onChange={(e) => setAssignDeptId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
                >
                  <option value="">Select Destination Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign to Designated Officer (Optional)
                </label>
                <select
                  value={assignOfficerId}
                  onChange={(e) => setAssignOfficerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
                >
                  <option value="">Department Head / Any Available Officer</option>
                  {officersList
                    .filter((o) => !assignDeptId || o.department_id === assignDeptId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Internal Administrative Directives</label>
                <textarea
                  rows={3}
                  placeholder="Notes for the assigned department or dispatch instructions..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={assignSubmitting}
                  onClick={handleAssignSubmit}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition disabled:opacity-50"
                >
                  {assignSubmitting ? 'Routing...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          DEPARTMENT IN-CHARGE ACTION MODAL
      ───────────────────────────────────────────── */}
      {statusModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-black text-emerald-700">{selectedComplaint.complaint_id}</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">Department Action & Progress</h3>
              </div>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900">{selectedComplaint.title}</div>
              <div className="text-slate-500">{selectedComplaint.description}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Action / State Transition</label>
                <select
                  value={statusTargetState}
                  onChange={(e) => setStatusTargetState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
                >
                  <option value="ACCEPTED">Accept Grievance (Acknowledge responsibility)</option>
                  <option value="IN_PROGRESS">Mark In Progress (Work underway)</option>
                  <option value="NEEDS_INFORMATION">Request Additional Information from Citizen</option>
                  <option value="ESCALATED">Escalate (Requires higher intervention)</option>
                  <option value="RESOLVED">Mark as Resolved (Submit completion evidence)</option>
                </select>
              </div>

              {statusTargetState === 'IN_PROGRESS' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Completion Date</label>
                  <input
                    type="date"
                    value={statusExpectedCompletionDate}
                    onChange={(e) => setStatusExpectedCompletionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                  />
                </div>
              )}

              {statusTargetState === 'RESOLVED' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Resolution Report & Fix Details <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe how the problem was remediated by field units..."
                    value={statusResolutionDetails}
                    onChange={(e) => setStatusResolutionDetails(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Action Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Field updates, work orders dispatched..."
                    value={statusActionNotes}
                    onChange={(e) => setStatusActionNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={statusSubmitting}
                  onClick={handleOfficerStatusSubmit}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition disabled:opacity-50"
                >
                  {statusSubmitting ? 'Recording Action...' : 'Save & Broadcast Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
