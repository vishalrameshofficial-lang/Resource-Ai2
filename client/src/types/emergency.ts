export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EmergencyCategory =
  | 'flood'
  | 'landslide'
  | 'fire'
  | 'earthquake'
  | 'medical'
  | 'cyclone'
  | 'building_collapse'
  | 'drowning'
  | 'other';

export type RequestStatus =
  | 'NEW'
  | 'VERIFIED'
  | 'FORWARDED_TO_GOVERNMENT'
  | 'ACCEPTED'
  | 'RESOURCE_ALLOCATED'
  | 'DELIVERY_IN_PROGRESS'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

export interface ResourceItem {
  item: string;
  quantity?: number;
  unit?: string;
}

export interface DispatchTimelineItem {
  id: string;
  request_id: string;
  status: RequestStatus;
  title: string;
  description: string;
  actor: string;
  government_reference?: string | null;
  created_at: string;
}

export interface CallSession {
  id: string;
  call_sid?: string;
  stream_sid?: string;
  caller_phone: string;
  masked_phone?: string;
  exotel_number?: string;
  language: string;
  started_at: string;
  ended_at?: string;
  duration?: string | number;
  transcript: Array<{ role: 'assistant' | 'caller' | 'user'; text: string; timestamp?: string }>;
  ai_summary?: string;
  status: string;
  request_id?: string;
  metadata?: Record<string, any>;
  query?: string;
  summary?: string;
  department?: string;
  required_service?: string;
  required_resources?: string[];
  priority?: string;
  location?: string;
  affected_people?: string;
  classification_confidence?: number;
  classification_status?: string;
  telephony_source_ip?: string;
  recording_url?: string;
  created_at: string;
}

export interface DepartmentCardStat {
  name: string;
  count: number;
  resources: Array<{ item: string; count: number }>;
}

export interface DepartmentStatsResponse {
  totalCalls: number;
  departments: DepartmentCardStat[];
  priorityCounts: Record<string, number>;
}

export interface EmergencyRequest {
  id: string;
  request_id: string;
  caller_name: string;
  caller_phone: string;
  masked_phone?: string;
  caller_language: string;
  emergency_category: EmergencyCategory;
  description: string;
  location: string;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  affected_people_count: number;
  resources_needed: ResourceItem[];
  urgency: UrgencyLevel;
  immediate_danger: boolean;
  source: 'WEB' | 'AI VOICE' | 'ADMIN';
  status: RequestStatus;
  admin_notes?: string | null;
  government_reference?: string | null;
  created_from_call_id?: string | null;
  created_at: string;
  updated_at: string;
  timeline?: DispatchTimelineItem[];
  callSession?: CallSession | null;
}

export interface DashboardStats {
  total: number;
  newRequests: number;
  highUrgency: number;
  activeEmergencies: number;
  governmentPending: number;
  delivered: number;
  totalAffectedPeople: number;
  liveCallsCount: number;
  byCategory: Array<{ name: string; count: number }>;
  byLanguage: Array<{ name: string; count: number }>;
  byStatus: Array<{ name: string; count: number }>;
  byUrgency: Array<{ name: string; count: number }>;
}

export interface ActiveLiveCall {
  id: string;
  callSid: string;
  streamSid: string;
  callerPhone: string;
  language: string;
  stage: string;
  status: string;
  startedAt: string;
  durationSec: number;
  requestId?: string | null;
  lastUtterance?: string;
}

export interface ComplaintDispatch {
  id: string;
  dispatch_id: string;
  call_id?: string;
  call_sid?: string;
  request_id?: string;
  caller_phone?: string;
  department: string;
  station_name: string;
  station_jurisdiction?: string;
  station_phone?: string;
  station_email?: string;
  emergency_number?: string;
  response_unit?: string;
  priority: string;
  location?: string;
  affected_people?: string;
  summary?: string;
  query?: string;
  required_service?: string;
  required_resources: string[];
  language?: string;
  confidence?: number;
  complaint_document: string;
  transcript_text?: string;
  dispatch_status: 'DISPATCHED' | 'ACKNOWLEDGED' | 'RESOLVED';
  response_time_estimate?: string;
  escalation_officer?: string;
  department_acknowledged: boolean;
  acknowledged_at?: string;
  resolved: boolean;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

export interface ComplaintDispatchStats {
  total: number;
  dispatched: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  pendingResponse: number;
  byDepartment: Array<{ department: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}
