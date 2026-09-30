import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { auditService } from './auditService.js';
import { notificationService } from './notificationService.js';

export const HEALTH_STATUSES = [
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

export const HEALTH_CATEGORIES = {
  Medicines: [
    'Emergency Medicine',
    'Antibiotic',
    'Vaccine',
    'IV Fluid',
    'Injection',
    'Analgesic',
    'Pediatric Medicine',
    'Other'
  ],
  'Hospital Capacity': [
    'General Beds',
    'ICU Beds',
    'Isolation Beds',
    'Pediatric Beds',
    'Maternity Beds',
    'Emergency Trauma Beds',
    'Oxygen Cylinders / Concentrators',
    'Ventilators',
    'Other'
  ],
  Personnel: [
    'Doctor (General)',
    'Specialist Physician',
    'Surgeon',
    'Anesthesiologist',
    'Pediatrician',
    'Nurse (Staff / ICU)',
    'Pharmacist',
    'Lab Technician',
    'Radiographer',
    'Support Staff',
    'Other'
  ],
  Equipment: [
    'Ventilator',
    'ECG Machine',
    'X-Ray Unit',
    'CT Scanner',
    'MRI',
    'Patient Monitor',
    'Defibrillator',
    'Dialysis Machine',
    'Sterilization Autoclave',
    'Laboratory Analyzer',
    'Other'
  ],
  'Surgical & Consumables': [
    'Surgical Kits',
    'Personal Protective Equipment (PPE)',
    'Gloves & Masks',
    'Blood Bags & Transfusion Kits',
    'Bandages & Dressings',
    'Other'
  ],
  Other: ['Other']
};

class HealthService {
  /**
   * Generate official Health Request ID in format HLT-YYYY-XXXXXX
   */
  _generateRequestId() {
    const db = getDatabase();
    const year = new Date().getFullYear();
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM health_requests WHERE request_id LIKE ?
    `).get(`HLT-${year}-%`);

    const seq = (countRow?.count || 0) + 1;
    return `HLT-${year}-${String(seq).padStart(6, '0')}`;
  }

  /**
   * Generate an Allocation ID in format ALC-HLT-YYYY-XXXXXX
   */
  _generateAllocationId() {
    const db = getDatabase();
    const year = new Date().getFullYear();
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM health_allocations WHERE allocation_id LIKE ?
    `).get(`ALC-HLT-${year}-%`);

    const seq = (countRow?.count || 0) + 1;
    return `ALC-HLT-${year}-${String(seq).padStart(6, '0')}`;
  }

  /* ─────────────────────────────────────────────
   * Health Facilities Management
   * ───────────────────────────────────────────── */
  getFacilities({ district, type, status = 'ACTIVE' } = {}) {
    const db = getDatabase();
    let sql = 'SELECT * FROM health_facilities WHERE 1=1';
    const params = [];

    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY name ASC';
    return db.prepare(sql).all(...params);
  }

  createFacility(data, actor = {}) {
    const db = getDatabase();
    const id = `fac-hlt-${uuidv4().slice(0, 10)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO health_facilities (
        id, code, name, type, district, taluk, location, address,
        contact_person, phone, email, bed_capacity, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.code || null,
      data.name.trim(),
      data.type || 'Primary Health Center',
      data.district.trim(),
      data.taluk ? data.taluk.trim() : '',
      data.location || null,
      data.address || null,
      data.contact_person || null,
      data.phone || null,
      data.email || null,
      parseInt(data.bed_capacity) || 0,
      data.status || 'ACTIVE',
      now,
      now
    );

    auditService.log({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name || 'Officer',
      role: actor.role || 'HEALTH_OFFICER',
      domain: 'HEALTH',
      action: 'FACILITY_CREATED',
      entity: 'health_facilities',
      entityId: id,
      newValue: data
    });

    return this.getFacilityById(id);
  }

  getFacilityById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM health_facilities WHERE id = ? OR code = ?').get(id, id);
  }

  /* ─────────────────────────────────────────────
   * Health Inventory & Resources Management
   * ───────────────────────────────────────────── */
  getResources({ category, district, facilityId } = {}) {
    const db = getDatabase();
    let sql = 'SELECT * FROM health_resources WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    if (facilityId) {
      sql += ' AND facility_id = ?';
      params.push(facilityId);
    }

    sql += ' ORDER BY name ASC';
    return db.prepare(sql).all(...params);
  }

  createResource(data, actor = {}) {
    const db = getDatabase();
    const id = `res-hlt-${uuidv4().slice(0, 10)}`;
    const year = new Date().getFullYear();
    const countRow = db.prepare('SELECT COUNT(*) as c FROM health_resources').get();
    const resourceId = `RES-HLT-${year}-${String((countRow?.c || 0) + 1).padStart(5, '0')}`;
    const now = new Date().toISOString();

    const total = parseFloat(data.total_quantity) || 0;
    const available = parseFloat(data.available_quantity != null ? data.available_quantity : total);

    db.prepare(`
      INSERT INTO health_resources (
        id, resource_id, facility_id, facility_name, district,
        category, resource_type, name, total_quantity, available_quantity,
        allocated_quantity, unit, expiry_date, batch_lot, condition,
        notes, last_updated, updated_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      resourceId,
      data.facility_id || null,
      data.facility_name || null,
      data.district.trim(),
      data.category,
      data.resource_type || data.category,
      data.name.trim(),
      total,
      available,
      data.unit || 'units',
      data.expiry_date || null,
      data.batch_lot || null,
      data.condition || 'USABLE',
      data.notes || null,
      now,
      actor.name || 'System',
      now
    );

    auditService.log({
      userId: actor.id,
      userName: actor.name || 'Officer',
      role: actor.role || 'RESOURCE_OFFICER',
      domain: 'HEALTH',
      action: 'HEALTH_INVENTORY_CREATED',
      entity: 'health_resources',
      entityId: id,
      newValue: { resourceId, name: data.name, total, batch: data.batch_lot, expiry: data.expiry_date }
    });

    return this.getResourceById(id);
  }

  getResourceById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM health_resources WHERE id = ? OR resource_id = ?').get(id, id);
  }

  /* ─────────────────────────────────────────────
   * Health Petitions / Requests Management
   * ───────────────────────────────────────────── */
  createRequest(data, actor = {}) {
    const db = getDatabase();
    const id = `req-hlt-${uuidv4().slice(0, 12)}`;
    const requestId = this._generateRequestId();
    const now = new Date().toISOString();

    const requiredQty = parseFloat(data.required_quantity) || 1;
    const requestedQty = parseFloat(data.requested_quantity) || requiredQty;

    db.prepare(`
      INSERT INTO health_requests (
        id, request_id, facility_id, facility_type, facility_name,
        facility_code, district, taluk, location, resource_category,
        resource_type, specific_resource, current_availability,
        required_quantity, requested_quantity, unit, reason_justification,
        priority, requested_by, designation, department, contact_phone,
        contact_email, status, status_reason, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, 'SUBMITTED', 'Initial health petition submitted', ?, ?
      )
    `).run(
      id,
      requestId,
      data.facility_id || null,
      data.facility_type || 'Primary Health Center',
      data.facility_name.trim(),
      data.facility_code || null,
      data.district.trim(),
      data.taluk ? data.taluk.trim() : '',
      data.location || null,
      data.resource_category,
      data.resource_type || data.resource_category,
      data.specific_resource.trim(),
      data.current_availability || 'Critical shortage',
      requiredQty,
      requestedQty,
      data.unit || 'units',
      data.reason_justification.trim(),
      data.priority || 'MEDIUM',
      data.requested_by.trim(),
      data.designation.trim(),
      data.department || 'Health & Family Welfare Department',
      data.contact_phone || null,
      data.contact_email || null,
      now,
      now
    );

    // Initial status history
    db.prepare(`
      INSERT INTO health_request_status_history (
        id, request_id, from_status, to_status, actor_name, actor_role, comments, created_at
      ) VALUES (?, ?, NULL, 'SUBMITTED', ?, ?, 'Health resource petition submitted for review', ?)
    `).run(`hist-${uuidv4().slice(0, 10)}`, requestId, actor.name || data.requested_by, actor.role || 'HEALTH_OFFICER', now);

    // Operational notification
    notificationService.notify({
      domain: 'HEALTH',
      title: 'New Health Resource Request',
      message: `${requestId}: ${data.facility_name} requested ${requestedQty} ${data.unit} of ${data.specific_resource} (${data.priority} priority)`,
      severity: data.priority === 'CRITICAL' ? 'CRITICAL' : 'INFO',
      entityId: requestId,
      targetRole: 'APPROVING_OFFICER'
    });

    // Audit log
    auditService.log({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name || data.requested_by,
      role: actor.role || 'HEALTH_OFFICER',
      domain: 'HEALTH',
      action: 'REQUEST_SUBMITTED',
      entity: 'health_requests',
      entityId: requestId,
      newValue: { requestId, facility: data.facility_name, resource: data.specific_resource, qty: requestedQty }
    });

    return this.getRequestById(requestId);
  }

  getRequests({ district, taluk, category, priority, status, query, limit = 50, offset = 0 } = {}) {
    const db = getDatabase();
    let sql = 'SELECT * FROM health_requests WHERE 1=1';
    const params = [];

    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    if (taluk) {
      sql += ' AND taluk = ?';
      params.push(taluk);
    }
    if (category) {
      sql += ' AND resource_category = ?';
      params.push(category);
    }
    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (query && query.trim()) {
      const q = `%${query.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(request_id) LIKE ? OR LOWER(facility_name) LIKE ? OR LOWER(specific_resource) LIKE ? OR LOWER(location) LIKE ?)';
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Math.min(limit, 200), Math.max(offset, 0));

    return db.prepare(sql).all(...params);
  }

  countRequests({ district, taluk, category, priority, status, query } = {}) {
    const db = getDatabase();
    let sql = 'SELECT COUNT(*) as count FROM health_requests WHERE 1=1';
    const params = [];

    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    if (taluk) {
      sql += ' AND taluk = ?';
      params.push(taluk);
    }
    if (category) {
      sql += ' AND resource_category = ?';
      params.push(category);
    }
    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (query && query.trim()) {
      const q = `%${query.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(request_id) LIKE ? OR LOWER(facility_name) LIKE ? OR LOWER(specific_resource) LIKE ? OR LOWER(location) LIKE ?)';
      params.push(q, q, q, q);
    }

    const row = db.prepare(sql).get(...params);
    return row?.count || 0;
  }

  getRequestById(idOrRequestId) {
    const db = getDatabase();
    const req = db.prepare(`
      SELECT * FROM health_requests WHERE id = ? OR request_id = ?
    `).get(idOrRequestId, idOrRequestId);

    if (!req) return null;

    req.history = db.prepare(`
      SELECT * FROM health_request_status_history WHERE request_id = ? ORDER BY created_at ASC
    `).all(req.request_id);

    req.allocations = db.prepare(`
      SELECT * FROM health_allocations WHERE request_id = ? ORDER BY created_at DESC
    `).all(req.request_id);

    req.documents = db.prepare(`
      SELECT * FROM health_request_documents WHERE request_id = ? ORDER BY uploaded_at DESC
    `).all(req.request_id);

    return req;
  }

  /**
   * Update request status through authorized government workflow
   */
  updateStatus(requestId, newStatus, { reason, actorName = 'Officer', actorRole = 'APPROVING_OFFICER', userId = null, comments = '' } = {}) {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM health_requests WHERE request_id = ? OR id = ?').get(requestId, requestId);
    if (!existing) {
      throw new Error(`Health request ${requestId} not found`);
    }

    if (!HEALTH_STATUSES.includes(newStatus)) {
      throw new Error(`Invalid status "${newStatus}"`);
    }

    const now = new Date().toISOString();
    let approvedBy = existing.approved_by;
    let approvedAt = existing.approved_at;
    let rejectionReason = existing.rejection_reason;

    if (newStatus === 'APPROVED') {
      approvedBy = actorName;
      approvedAt = now;
    } else if (newStatus === 'REJECTED') {
      rejectionReason = reason || comments || 'Rejected by reviewing authority';
    }

    db.prepare(`
      UPDATE health_requests SET
        status = ?,
        status_reason = ?,
        approved_by = ?,
        approved_at = ?,
        rejection_reason = ?,
        updated_at = ?
      WHERE request_id = ?
    `).run(newStatus, reason || comments || null, approvedBy, approvedAt, rejectionReason, now, existing.request_id);

    db.prepare(`
      INSERT INTO health_request_status_history (
        id, request_id, from_status, to_status, actor_name, actor_role, comments, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `hist-${uuidv4().slice(0, 10)}`,
      existing.request_id,
      existing.status,
      newStatus,
      actorName,
      actorRole,
      comments || reason || `Status transitioned to ${newStatus}`,
      now
    );

    notificationService.notify({
      domain: 'HEALTH',
      title: `Health Request ${newStatus}`,
      message: `${existing.request_id} for ${existing.facility_name} transitioned from ${existing.status} to ${newStatus}`,
      severity: newStatus === 'APPROVED' ? 'SUCCESS' : newStatus === 'REJECTED' ? 'WARNING' : 'INFO',
      entityId: existing.request_id
    });

    auditService.log({
      userId,
      userName: actorName,
      role: actorRole,
      domain: 'HEALTH',
      action: `REQUEST_${newStatus}`,
      entity: 'health_requests',
      entityId: existing.request_id,
      previousValue: { status: existing.status },
      newValue: { status: newStatus, reason: comments || reason }
    });

    return this.getRequestById(existing.request_id);
  }

  /**
   * Allocate real inventory against an approved petition
   */
  allocateResource(requestId, data = {}, actor = {}) {
    const db = getDatabase();
    const request = db.prepare('SELECT * FROM health_requests WHERE request_id = ? OR id = ?').get(requestId, requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    if (!['APPROVED', 'ALLOCATED'].includes(request.status)) {
      throw new Error(`Cannot allocate a request in status "${request.status}". Must be APPROVED first.`);
    }

    const qty = parseFloat(data.allocatedQuantity != null ? data.allocatedQuantity : data.allocated_quantity);
    if (!qty || qty <= 0) {
      throw new Error('Allocated quantity must be greater than 0');
    }

    const resourceId = data.resourceId || data.resource_id || null;
    const sourceFacilityId = data.sourceFacilityId || data.source_facility_id || null;
    const sourceFacilityName = data.sourceFacilityName || data.source_facility_name || data.source_location || data.source_facility || 'Central Medical Store Depot';
    const notes = data.notes || '';

    if (resourceId) {
      const resource = db.prepare('SELECT * FROM health_resources WHERE id = ? OR resource_id = ?').get(resourceId, resourceId);
      if (!resource) {
        throw new Error(`Inventory item ${resourceId} not found`);
      }
      if (resource.available_quantity < qty) {
        throw new Error(`Insufficient inventory: ${resource.available_quantity} available, but ${qty} requested for allocation`);
      }

      db.prepare(`
        UPDATE health_resources SET
          available_quantity = available_quantity - ?,
          allocated_quantity = allocated_quantity + ?,
          last_updated = ?
        WHERE id = ?
      `).run(qty, qty, new Date().toISOString(), resource.id);
    }

    const allocationId = this._generateAllocationId();
    const id = `alc-hlt-${uuidv4().slice(0, 10)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO health_allocations (
        id, allocation_id, request_id, resource_id, source_facility_id,
        source_facility_name, destination_facility_id, destination_facility_name,
        requested_quantity, approved_quantity, allocated_quantity, unit,
        allocation_date, allocated_by, delivery_status, delivery_notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
    `).run(
      id,
      allocationId,
      request.request_id,
      resourceId || null,
      sourceFacilityId || null,
      sourceFacilityName,
      request.facility_id || null,
      request.facility_name,
      request.requested_quantity,
      request.required_quantity,
      qty,
      request.unit,
      now,
      actor.name || 'Resource Officer',
      notes,
      now,
      now
    );

    this.updateStatus(request.request_id, 'ALLOCATED', {
      reason: `Allocated ${qty} ${request.unit} via ${allocationId}`,
      actorName: actor.name || 'Resource Officer',
      actorRole: actor.role || 'RESOURCE_OFFICER',
      userId: actor.id,
      comments: `Allocation created: ${allocationId}`
    });

    return db.prepare('SELECT * FROM health_allocations WHERE allocation_id = ?').get(allocationId);
  }

  createAllocation(requestId, data, actor = {}) {
    return this.allocateResource(requestId, data, actor);
  }

  /**
   * Update delivery confirmation
   */
  updateAllocationDelivery(allocationId, { deliveryStatus, deliveryDate, notes = '' }, actor = {}) {
    const db = getDatabase();
    const alloc = db.prepare('SELECT * FROM health_allocations WHERE allocation_id = ? OR id = ?').get(allocationId, allocationId);
    if (!alloc) {
      throw new Error(`Allocation ${allocationId} not found`);
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE health_allocations SET
        delivery_status = ?,
        delivery_date = ?,
        delivery_notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(deliveryStatus, deliveryDate || now, notes, now, alloc.id);

    auditService.log({
      userId: actor.id,
      userName: actor.name || 'Officer',
      role: actor.role || 'RESOURCE_OFFICER',
      domain: 'HEALTH',
      action: `ALLOCATION_DELIVERY_${deliveryStatus}`,
      entity: 'health_allocations',
      entityId: alloc.allocation_id,
      newValue: { deliveryStatus, deliveryDate, notes }
    });

    if (deliveryStatus === 'DELIVERED') {
      this.updateStatus(alloc.request_id, 'DELIVERED', {
        reason: `Delivery confirmed for allocation ${alloc.allocation_id}`,
        actorName: actor.name || 'Resource Officer',
        actorRole: actor.role || 'RESOURCE_OFFICER',
        comments: notes
      });
    }

    return db.prepare('SELECT * FROM health_allocations WHERE id = ?').get(alloc.id);
  }

  /**
   * Add Document metadata
   */
  addDocument(requestId, { fileName, originalName, mimeType, fileSize, storagePath, docType }, actor = {}) {
    const db = getDatabase();
    const req = db.prepare('SELECT request_id FROM health_requests WHERE request_id = ? OR id = ?').get(requestId, requestId);
    if (!req) {
      throw new Error(`Request ${requestId} not found`);
    }

    const id = `doc-hlt-${uuidv4().slice(0, 10)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO health_request_documents (
        id, request_id, file_name, original_name, mime_type, file_size, storage_path, doc_type, uploaded_by, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.request_id,
      fileName,
      originalName,
      mimeType,
      fileSize,
      storagePath,
      docType || 'Official Document',
      actor.name || 'Officer',
      now
    );

    auditService.log({
      userId: actor.id,
      userName: actor.name || 'Officer',
      role: actor.role || 'HEALTH_OFFICER',
      domain: 'HEALTH',
      action: 'DOCUMENT_UPLOADED',
      entity: 'health_request_documents',
      entityId: id,
      newValue: { requestId: req.request_id, originalName, docType }
    });

    return db.prepare('SELECT * FROM health_request_documents WHERE id = ?').get(id);
  }

  /**
   * Aggregate statistics from real database records
   */
  getStats() {
    const db = getDatabase();

    const counts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('SUBMITTED', 'UNDER_REVIEW') THEN 1 ELSE 0 END) as under_review,
        SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'ALLOCATED' THEN 1 ELSE 0 END) as allocated,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN priority = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN priority = 'HIGH' THEN 1 ELSE 0 END) as high
      FROM health_requests
    `).get();

    const byCategory = db.prepare(`
      SELECT resource_category as category, COUNT(*) as count
      FROM health_requests
      GROUP BY resource_category
      ORDER BY count DESC
    `).all();

    const byDistrict = db.prepare(`
      SELECT district, COUNT(*) as count
      FROM health_requests
      GROUP BY district
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const facilitiesCount = db.prepare('SELECT COUNT(*) as c FROM health_facilities').get()?.c || 0;
    const inventoryCount = db.prepare('SELECT COUNT(*) as c FROM health_resources').get()?.c || 0;
    const allocationsCount = db.prepare('SELECT COUNT(*) as c FROM health_allocations').get()?.c || 0;

    return {
      totalRequests: counts?.total || 0,
      openRequests: (counts?.under_review || 0) + (counts?.verified || 0),
      underReview: counts?.under_review || 0,
      verified: counts?.verified || 0,
      approved: counts?.approved || 0,
      pendingAllocation: counts?.approved || 0,
      allocated: counts?.allocated || 0,
      delivered: counts?.delivered || 0,
      closed: counts?.closed || 0,
      rejected: counts?.rejected || 0,
      critical: counts?.critical || 0,
      high: counts?.high || 0,
      facilitiesCount,
      inventoryCount,
      allocationsCount,
      byCategory,
      byDistrict
    };
  }
}

export const healthService = new HealthService();
