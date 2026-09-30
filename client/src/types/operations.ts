export type EducationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'APPROVED'
  | 'ALLOCATED'
  | 'DELIVERED'
  | 'CLOSED'
  | 'REJECTED'
  | 'RETURNED_FOR_INFORMATION'
  | 'ON_HOLD'
  | 'CANCELLED';

export type HealthStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'APPROVED'
  | 'ALLOCATED'
  | 'DELIVERED'
  | 'CLOSED'
  | 'REJECTED'
  | 'RETURNED_FOR_INFORMATION'
  | 'ON_HOLD'
  | 'CANCELLED';

export type OperationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'URGENT' | 'ROUTINE' | 'EMERGENCY_IMMEDIATE';

/* ─────────────────────────────────────────────
 * Education Domain Types
 * ───────────────────────────────────────────── */
export interface EducationInstitution {
  id: string | number;
  code?: string | null;
  name: string;
  type: string;
  district: string;
  taluk?: string;
  village_city?: string | null;
  location?: string | null;
  address?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EducationResourceInventory {
  id: string | number;
  resource_id?: string;
  category: string;
  resource_type?: string;
  name: string;
  institution_id?: string | null;
  institution_name?: string | null;
  district: string;
  total_quantity: number;
  available_quantity: number;
  allocated_quantity: number;
  unit: string;
  condition: string;
  notes?: string | null;
  last_updated?: string;
  updated_by?: string | null;
  created_at?: string;
}

export type EducationResource = EducationResourceInventory;

export interface EducationAllocation {
  id: string | number;
  allocation_id: string;
  request_id: string;
  resource_id?: string | number | null;
  requested_quantity: number;
  approved_quantity: number;
  allocated_quantity: number;
  unit?: string;
  source_location?: string;
  source_facility?: string;
  destination_location?: string;
  destination_facility?: string;
  allocation_date: string;
  allocated_by: string;
  status?: string;
  delivery_status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  delivery_date?: string | null;
  delivery_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StatusHistoryItem {
  id: string | number;
  request_id: string;
  from_status?: string | null;
  to_status: string;
  actor_name?: string;
  actor_role?: string;
  changed_by?: string;
  role?: string;
  comments?: string | null;
  created_at: string;
}

export interface OperationDocument {
  id: string | number;
  request_id: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  doc_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface EducationRequest {
  id: string | number;
  request_id: string;
  institution_id?: string | null;
  institution_type: string;
  institution_name: string;
  institution_code?: string | null;
  district: string;
  taluk?: string;
  village_city?: string | null;
  location?: string | null;
  resource_category: string;
  resource_type?: string;
  specific_resource: string;
  current_availability?: string | null;
  required_quantity: number;
  requested_quantity: number;
  unit: string;
  reason_justification?: string;
  priority: OperationPriority | string;
  requested_by?: string;
  designation?: string;
  department?: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  status: EducationStatus | string;
  status_reason?: string | null;
  assigned_officer?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
  history?: StatusHistoryItem[];
  allocations?: EducationAllocation[];
  documents?: OperationDocument[];
}

export interface EducationStats {
  totalRequests: number;
  openRequests?: number;
  submitted?: number;
  underReview?: number;
  verified?: number;
  approved?: number;
  pendingAllocation?: number;
  allocated?: number;
  delivered?: number;
  closed?: number;
  rejected?: number;
  critical?: number;
  high?: number;
  institutionsCount?: number;
  inventoryCount?: number;
  allocationsCount?: number;
  byCategory?: Array<{ category?: string; resource_category?: string; count: number }>;
  byDistrict?: Array<{ district: string; count: number }>;
}

/* ─────────────────────────────────────────────
 * Health Domain Types
 * ───────────────────────────────────────────── */
export interface HealthFacility {
  id: string | number;
  code?: string | null;
  name: string;
  type: string;
  district: string;
  taluk?: string;
  location?: string | null;
  address?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  phone?: string | null;
  email?: string | null;
  bed_capacity?: number;
  total_beds?: number;
  icu_beds?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HealthResourceInventory {
  id: string | number;
  resource_id?: string;
  facility_id?: string | null;
  facility_name?: string | null;
  district: string;
  taluk?: string;
  category: string;
  resource_type?: string;
  name: string;
  total_quantity: number;
  available_quantity: number;
  allocated_quantity: number;
  unit: string;
  expiry_date?: string | null;
  batch_lot?: string | null;
  batch_number?: string | null;
  condition: string;
  notes?: string | null;
  last_updated?: string;
  updated_by?: string | null;
  created_at?: string;
}

export type HealthResource = HealthResourceInventory;

export interface HealthAllocation {
  id: string | number;
  allocation_id: string;
  request_id: string;
  resource_id?: string | number | null;
  source_facility_id?: string | null;
  source_facility_name?: string;
  source_facility?: string;
  destination_facility_id?: string | null;
  destination_facility_name?: string;
  destination_facility?: string;
  requested_quantity: number;
  approved_quantity: number;
  allocated_quantity: number;
  unit?: string;
  allocation_date: string;
  allocated_by: string;
  status?: string;
  delivery_status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  delivery_date?: string | null;
  delivery_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HealthRequest {
  id: string | number;
  request_id: string;
  facility_id?: string | null;
  facility_type: string;
  facility_name: string;
  facility_code?: string | null;
  district: string;
  taluk?: string;
  location?: string | null;
  resource_category: string;
  resource_type?: string;
  specific_resource?: string;
  resource_name?: string;
  current_availability?: string | null;
  required_quantity: number;
  requested_quantity: number;
  unit: string;
  reason_justification?: string;
  priority: OperationPriority | string;
  requested_by?: string;
  designation?: string;
  department?: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  status: HealthStatus | string;
  status_reason?: string | null;
  assigned_officer?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
  history?: StatusHistoryItem[];
  allocations?: HealthAllocation[];
  documents?: OperationDocument[];
}

export interface HealthStats {
  totalRequests: number;
  openRequests?: number;
  submitted?: number;
  underReview?: number;
  verified?: number;
  approved?: number;
  pendingAllocation?: number;
  allocated?: number;
  delivered?: number;
  closed?: number;
  rejected?: number;
  critical?: number;
  high?: number;
  facilitiesCount?: number;
  inventoryCount?: number;
  allocationsCount?: number;
  byCategory?: Array<{ category?: string; resource_category?: string; count: number }>;
  byDistrict?: Array<{ district: string; count: number }>;
}

/* ─────────────────────────────────────────────
 * Command Center Cross-Domain Overview
 * ───────────────────────────────────────────── */
export interface CommandCenterStats {
  timestamp: string;
  emergency: {
    activeCalls: number;
    totalCalls: number;
    totalIncidents: number;
    activeIncidents: number;
    criticalIncidents: number;
    pendingVerification: number;
    assigned: number;
    resolved: number;
  };
  education: {
    totalRequests: number;
    openRequests: number;
    underReview: number;
    verified: number;
    approved: number;
    pendingAllocation: number;
    allocated: number;
    delivered: number;
    closed: number;
    institutionsCount: number;
    inventoryCount: number;
    allocationsCount: number;
  };
  health: {
    totalRequests: number;
    openRequests: number;
    underReview: number;
    verified: number;
    approved: number;
    pendingAllocation: number;
    allocated: number;
    delivered: number;
    closed: number;
    facilitiesCount: number;
    inventoryCount: number;
    allocationsCount: number;
  };
  subsystems: {
    exotel: string;
    virtualNumber: string;
    voiceWebSocket: string;
    database: string;
    sttProvider: string;
    aiProvider: string;
    ttsProvider: string;
  };
}

export interface AuditLogItem {
  id: string | number;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string;
  actor?: string;
  role?: string;
  domain?: 'EMERGENCY' | 'EDUCATION' | 'HEALTH' | 'SYSTEM' | string;
  action: string;
  entity?: string;
  entity_type?: string;
  entity_id: string;
  details?: any;
  previous_value?: string | null;
  new_value?: string | null;
  ip_address?: string | null;
  reason?: string | null;
  timestamp: string;
  created_at?: string;
}

export type AuditLog = AuditLogItem;
