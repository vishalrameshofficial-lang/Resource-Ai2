import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { eventBus } from '../websocket/eventBus.js';
import { notificationService } from './notificationService.js';

/**
 * ComplaintDispatchService
 * 
 * Automatically forwards registered complaints to the nearest relevant department
 * based on the AI-classified department and the caller's location.
 * 
 * Each department maps to real-world department types (fire station, police station,
 * hospital, etc.) with contact information and jurisdiction data.
 */

// ─────────────────────────────────────────────
// DEPARTMENT → NEARBY STATION/OFFICE REGISTRY
// ─────────────────────────────────────────────
const DEPARTMENT_REGISTRY = {
  'Fire & Rescue': {
    stationType: 'Fire Station',
    emergencyNumber: '101',
    responseUnit: 'Fire & Rescue Services',
    defaultStations: [
      { name: 'Central Fire Station', jurisdiction: 'City Central', phone: '101', email: 'central.fire@gov.in', responseTime: '5-10 min' },
      { name: 'South Zone Fire Station', jurisdiction: 'South Zone', phone: '101', email: 'south.fire@gov.in', responseTime: '8-12 min' },
      { name: 'North Zone Fire Station', jurisdiction: 'North Zone', phone: '101', email: 'north.fire@gov.in', responseTime: '7-10 min' },
      { name: 'Industrial Area Fire Station', jurisdiction: 'Industrial Belt', phone: '101', email: 'industrial.fire@gov.in', responseTime: '10-15 min' }
    ],
    priorityEscalation: 'District Fire Officer (DFO)'
  },
  'Medical / Healthcare': {
    stationType: 'Hospital / PHC',
    emergencyNumber: '108',
    responseUnit: 'Emergency Medical Services',
    defaultStations: [
      { name: 'District General Hospital', jurisdiction: 'District HQ', phone: '108', email: 'dgh.emergency@gov.in', responseTime: '10-15 min' },
      { name: 'Primary Health Centre', jurisdiction: 'Rural Block', phone: '108', email: 'phc.emergency@gov.in', responseTime: '15-20 min' },
      { name: 'Community Health Centre', jurisdiction: 'Taluk HQ', phone: '108', email: 'chc.emergency@gov.in', responseTime: '12-18 min' },
      { name: 'Trauma Care Centre', jurisdiction: 'Highway Zone', phone: '108', email: 'trauma.care@gov.in', responseTime: '8-12 min' }
    ],
    priorityEscalation: 'District Medical Officer (DMO)'
  },
  'Police / Security': {
    stationType: 'Police Station',
    emergencyNumber: '100',
    responseUnit: 'Law Enforcement',
    defaultStations: [
      { name: 'Town Police Station', jurisdiction: 'Town Limits', phone: '100', email: 'town.police@gov.in', responseTime: '5-10 min' },
      { name: 'Rural Police Station', jurisdiction: 'Rural Area', phone: '100', email: 'rural.police@gov.in', responseTime: '10-15 min' },
      { name: 'Traffic Police Control Room', jurisdiction: 'City Traffic', phone: '100', email: 'traffic.police@gov.in', responseTime: '8-12 min' },
      { name: 'Cyber Crime Cell', jurisdiction: 'District', phone: '100', email: 'cybercrime@gov.in', responseTime: '30-60 min' }
    ],
    priorityEscalation: 'Superintendent of Police (SP)'
  },
  'Water & Sanitation': {
    stationType: 'Water Supply Office',
    emergencyNumber: '1916',
    responseUnit: 'Municipal Water & Sanitation',
    defaultStations: [
      { name: 'Municipal Water Works', jurisdiction: 'City Limits', phone: '1916', email: 'waterworks@municipality.in', responseTime: '30-60 min' },
      { name: 'TWAD Board Office', jurisdiction: 'District', phone: '1916', email: 'twad.office@gov.in', responseTime: '1-2 hrs' },
      { name: 'Sanitation Control Room', jurisdiction: 'Ward Zone', phone: '1916', email: 'sanitation@municipality.in', responseTime: '45-90 min' }
    ],
    priorityEscalation: 'Municipal Commissioner / Executive Engineer'
  },
  'Electricity': {
    stationType: 'Electricity Board Office',
    emergencyNumber: '1912',
    responseUnit: 'State Electricity Board',
    defaultStations: [
      { name: 'EB Section Office', jurisdiction: 'Section Area', phone: '1912', email: 'section.eb@gov.in', responseTime: '30-60 min' },
      { name: 'EB Division Office', jurisdiction: 'Division Area', phone: '1912', email: 'division.eb@gov.in', responseTime: '1-2 hrs' },
      { name: 'Emergency Repair Unit', jurisdiction: 'District', phone: '1912', email: 'repair.eb@gov.in', responseTime: '45-90 min' }
    ],
    priorityEscalation: 'Superintending Engineer (SE)'
  },
  'Food & Essential Supplies': {
    stationType: 'Civil Supplies Office',
    emergencyNumber: '1967',
    responseUnit: 'Civil Supplies & Consumer Affairs',
    defaultStations: [
      { name: 'Taluk Supply Office', jurisdiction: 'Taluk', phone: '1967', email: 'tso.supply@gov.in', responseTime: '2-4 hrs' },
      { name: 'District Supply Office', jurisdiction: 'District', phone: '1967', email: 'dso.supply@gov.in', responseTime: '3-6 hrs' },
      { name: 'Relief Camp Supply Point', jurisdiction: 'Camp Zone', phone: '1967', email: 'relief.supply@gov.in', responseTime: '1-2 hrs' }
    ],
    priorityEscalation: 'District Supply Officer (DSO)'
  },
  'Shelter & Evacuation': {
    stationType: 'Revenue / Disaster Shelter',
    emergencyNumber: '1070',
    responseUnit: 'Revenue & Disaster Management',
    defaultStations: [
      { name: 'Tahsildar Office', jurisdiction: 'Taluk', phone: '1070', email: 'tahsildar@revenue.gov.in', responseTime: '30-60 min' },
      { name: 'District Collectorate', jurisdiction: 'District', phone: '1070', email: 'collector@district.gov.in', responseTime: '1-2 hrs' },
      { name: 'Relief Camp Coordination', jurisdiction: 'Ward Zone', phone: '1070', email: 'relief.camp@gov.in', responseTime: '45-90 min' }
    ],
    priorityEscalation: 'District Collector / Revenue Divisional Officer'
  },
  'Roads & Transportation': {
    stationType: 'Highways / PWD Office',
    emergencyNumber: '1033',
    responseUnit: 'Public Works / Highways',
    defaultStations: [
      { name: 'PWD Division Office', jurisdiction: 'Division', phone: '1033', email: 'pwd.division@gov.in', responseTime: '1-3 hrs' },
      { name: 'Highways Department', jurisdiction: 'Highway Zone', phone: '1033', email: 'highways@gov.in', responseTime: '1-2 hrs' },
      { name: 'Municipal Roads Division', jurisdiction: 'City Limits', phone: '1033', email: 'roads.municipal@gov.in', responseTime: '2-4 hrs' }
    ],
    priorityEscalation: 'Executive Engineer / Highways Superintendent'
  },
  'Waste Management': {
    stationType: 'Sanitation / Corporation Office',
    emergencyNumber: '1916',
    responseUnit: 'Municipal Waste Management',
    defaultStations: [
      { name: 'Corporation Sanitation Wing', jurisdiction: 'City Zone', phone: '1916', email: 'sanitation@corporation.in', responseTime: '2-4 hrs' },
      { name: 'Solid Waste Management Unit', jurisdiction: 'Ward', phone: '1916', email: 'swm@municipality.in', responseTime: '3-6 hrs' }
    ],
    priorityEscalation: 'Municipal Health Officer'
  },
  'Disaster Management': {
    stationType: 'DDMA / SDMA Office',
    emergencyNumber: '1070',
    responseUnit: 'District Disaster Management Authority',
    defaultStations: [
      { name: 'DDMA Control Room', jurisdiction: 'District', phone: '1070', email: 'ddma@disaster.gov.in', responseTime: '15-30 min' },
      { name: 'NDRF Battalion', jurisdiction: 'Regional', phone: '1070', email: 'ndrf@disaster.gov.in', responseTime: '30-60 min' },
      { name: 'SDRF Unit', jurisdiction: 'State', phone: '1070', email: 'sdrf@disaster.gov.in', responseTime: '20-45 min' },
      { name: 'District EOC', jurisdiction: 'District', phone: '1070', email: 'eoc@district.gov.in', responseTime: '10-20 min' }
    ],
    priorityEscalation: 'District Collector / DDMA Chairman'
  },
  'Government Services': {
    stationType: 'Administrative Office',
    emergencyNumber: '181',
    responseUnit: 'General Administration',
    defaultStations: [
      { name: 'Tahsildar Office', jurisdiction: 'Taluk', phone: '181', email: 'tahsildar@gov.in', responseTime: '1-2 days' },
      { name: 'Collectorate Help Desk', jurisdiction: 'District', phone: '181', email: 'helpdesk@district.gov.in', responseTime: '1-3 days' }
    ],
    priorityEscalation: 'District Revenue Officer'
  },
  'Other / Unclassified': {
    stationType: 'General Help Desk',
    emergencyNumber: '112',
    responseUnit: 'Integrated Emergency Response',
    defaultStations: [
      { name: 'Integrated Emergency Helpline (112)', jurisdiction: 'District', phone: '112', email: 'emergency112@gov.in', responseTime: '10-20 min' },
      { name: 'District Control Room', jurisdiction: 'District', phone: '112', email: 'controlroom@district.gov.in', responseTime: '15-30 min' }
    ],
    priorityEscalation: 'District Emergency Officer'
  }
};

// ─────────────────────────────────────────────
// LOCATION-BASED NEAREST STATION MATCHER
// ─────────────────────────────────────────────
function findNearestStation(department, location) {
  const registry = DEPARTMENT_REGISTRY[department] || DEPARTMENT_REGISTRY['Other / Unclassified'];
  const stations = registry.defaultStations;

  if (!location || location === 'Not mentioned' || !stations || stations.length === 0) {
    return stations[0] || null;
  }

  const locLower = location.toLowerCase();

  // Try to match by jurisdiction keywords in the location string
  for (const station of stations) {
    const jurisdiction = (station.jurisdiction || '').toLowerCase();
    const stationName = (station.name || '').toLowerCase();

    // Check if location mentions any part of the jurisdiction or station name
    if (locLower.includes(jurisdiction) || jurisdiction.includes(locLower.split(',')[0]?.trim())) {
      return station;
    }
    if (locLower.includes(stationName)) {
      return station;
    }
  }

  // Check for urban vs rural keywords
  const isUrban = /city|town|nagar|puram|metro|corporation|municipal|urban|central|market|bazaar|chowk/i.test(locLower);
  const isRural = /rural|village|gram|panchayat|block|taluk|mandal|hamlet|farm|field/i.test(locLower);
  const isHighway = /highway|bypass|national|nh-|nh |state highway|sh-|sh |toll|road|bridge/i.test(locLower);
  const isIndustrial = /industrial|factory|plant|manufacturing|estate|zone/i.test(locLower);

  for (const station of stations) {
    const jur = (station.jurisdiction || '').toLowerCase();
    if (isHighway && (jur.includes('highway') || jur.includes('road'))) return station;
    if (isIndustrial && jur.includes('industrial')) return station;
    if (isUrban && (jur.includes('city') || jur.includes('town') || jur.includes('central') || jur.includes('urban'))) return station;
    if (isRural && (jur.includes('rural') || jur.includes('block') || jur.includes('taluk'))) return station;
  }

  // Default: return first station
  return stations[0];
}

// ─────────────────────────────────────────────
// GENERATE FORMAL COMPLAINT DOCUMENT
// ─────────────────────────────────────────────
function generateComplaintDocument(complaintData) {
  const {
    dispatchId,
    department,
    station,
    registry,
    callerPhone,
    location,
    affectedPeople,
    summary,
    query,
    priority,
    requiredService,
    requiredResources,
    transcript,
    language,
    confidence,
    callSid,
    callId,
    requestId,
    createdAt
  } = complaintData;

  const transcriptFormatted = formatTranscript(transcript);
  const resourcesList = Array.isArray(requiredResources) && requiredResources.length > 0
    ? requiredResources.map((r, i) => `   ${i + 1}. ${r}`).join('\n')
    : '   - Emergency response team';

  return `
════════════════════════════════════════════════════════════════
           EMERGENCY COMPLAINT — DEPARTMENT DISPATCH
════════════════════════════════════════════════════════════════

  DISPATCH ID       : ${dispatchId}
  DISPATCH DATE     : ${new Date(createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
  PRIORITY          : ${'⚠️'.repeat(priority === 'Critical' ? 4 : priority === 'High' ? 3 : priority === 'Medium' ? 2 : 1)} ${priority.toUpperCase()}
  CONFIDENCE        : ${(confidence * 100).toFixed(1)}%

────────────────────────────────────────────────────────────────
  FORWARDED TO
────────────────────────────────────────────────────────────────

  Department        : ${department}
  Station / Office  : ${station.name}
  Jurisdiction      : ${station.jurisdiction}
  Emergency Number  : ${registry.emergencyNumber}
  Contact Phone     : ${station.phone}
  Contact Email     : ${station.email}
  Response Unit     : ${registry.responseUnit}
  Est. Response Time: ${station.responseTime}
  Escalation        : ${registry.priorityEscalation}

────────────────────────────────────────────────────────────────
  COMPLAINT DETAILS
────────────────────────────────────────────────────────────────

  Caller Phone      : ${callerPhone || 'Not Available'}
  Language          : ${language || 'English'}
  Location          : ${location}
  Affected People   : ${affectedPeople}
  Required Service  : ${requiredService || 'Emergency Assistance'}

  Required Resources:
${resourcesList}

  Summary           :
    ${summary}

  Original Query    :
    ${query || 'Not transcribed'}

────────────────────────────────────────────────────────────────
  CALL TRANSCRIPT (TRANSCRIBED)
────────────────────────────────────────────────────────────────
${transcriptFormatted}

────────────────────────────────────────────────────────────────
  REFERENCE IDS
────────────────────────────────────────────────────────────────

  Call ID           : ${callId}
  Call SID          : ${callSid || 'N/A'}
  Request ID        : ${requestId || 'Pending Assignment'}
  System Ref        : ResourceAI-${dispatchId}

════════════════════════════════════════════════════════════════
  This complaint was auto-generated by ResourceAI Emergency
  Response System and forwarded to the nearest relevant
  department based on AI classification of the call transcript.
  
  RESPONSE REQUIRED WITHIN: ${getResponseDeadline(priority)}
════════════════════════════════════════════════════════════════
`.trim();
}

function formatTranscript(transcript) {
  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    return '  [No transcript available]';
  }

  return transcript.map((entry, i) => {
    const role = entry.role === 'caller' ? '📞 CALLER' :
                 entry.role === 'assistant' ? '🤖 AI AGENT' : '👤 USER';
    const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';
    return `  [${time}] ${role}:\n    "${entry.text}"`;
  }).join('\n\n');
}

function getResponseDeadline(priority) {
  switch (priority) {
    case 'Critical': return '15 MINUTES — IMMEDIATE RESPONSE REQUIRED';
    case 'High': return '30 MINUTES — URGENT RESPONSE REQUIRED';
    case 'Medium': return '2 HOURS — STANDARD RESPONSE';
    case 'Low': return '24 HOURS — ROUTINE RESPONSE';
    default: return '2 HOURS — STANDARD RESPONSE';
  }
}

// ─────────────────────────────────────────────
// MAIN DISPATCH SERVICE CLASS
// ─────────────────────────────────────────────
export class ComplaintDispatchService {
  constructor() {
    this._ensureTable();
  }

  _ensureTable() {
    try {
      const db = getDatabase();
      db.exec(`
        CREATE TABLE IF NOT EXISTS complaint_dispatches (
          id TEXT PRIMARY KEY,
          dispatch_id TEXT UNIQUE NOT NULL,
          call_id TEXT,
          call_sid TEXT,
          request_id TEXT,
          caller_phone TEXT,
          department TEXT NOT NULL,
          station_name TEXT NOT NULL,
          station_jurisdiction TEXT,
          station_phone TEXT,
          station_email TEXT,
          emergency_number TEXT,
          response_unit TEXT,
          priority TEXT NOT NULL,
          location TEXT,
          affected_people TEXT,
          summary TEXT,
          query TEXT,
          required_service TEXT,
          required_resources TEXT,
          language TEXT,
          confidence REAL,
          complaint_document TEXT NOT NULL,
          transcript_text TEXT,
          dispatch_status TEXT NOT NULL DEFAULT 'DISPATCHED',
          response_time_estimate TEXT,
          escalation_officer TEXT,
          department_acknowledged INTEGER NOT NULL DEFAULT 0,
          acknowledged_at TEXT,
          resolved INTEGER NOT NULL DEFAULT 0,
          resolved_at TEXT,
          resolution_notes TEXT,
          created_at TEXT NOT NULL
        );
      `);

      // Index for fast lookups
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_dispatch_dept ON complaint_dispatches(department);
        CREATE INDEX IF NOT EXISTS idx_dispatch_status ON complaint_dispatches(dispatch_status);
        CREATE INDEX IF NOT EXISTS idx_dispatch_priority ON complaint_dispatches(priority);
        CREATE INDEX IF NOT EXISTS idx_dispatch_call ON complaint_dispatches(call_id);
        CREATE INDEX IF NOT EXISTS idx_dispatch_created ON complaint_dispatches(created_at);
      `);
    } catch (err) {
      console.warn('[ComplaintDispatch] Table init warning:', err.message);
    }
  }

  /**
   * Dispatch a complaint to the nearest relevant department.
   * Called automatically after AI classification completes.
   */
  dispatchComplaint({
    callId,
    callSid,
    requestId,
    callerPhone,
    department,
    priority,
    location,
    affectedPeople,
    summary,
    query,
    requiredService,
    requiredResources,
    transcript,
    language,
    confidence
  }) {
    try {
      const dept = department || 'Other / Unclassified';
      const registry = DEPARTMENT_REGISTRY[dept] || DEPARTMENT_REGISTRY['Other / Unclassified'];
      const station = findNearestStation(dept, location);

      if (!station) {
        console.warn(`[ComplaintDispatch] No station found for department: ${dept}`);
        return null;
      }

      const db = getDatabase();
      const id = `cd-${uuidv4()}`;
      const dispatchId = `DISP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();

      // Generate the formal complaint document
      const complaintDocument = generateComplaintDocument({
        dispatchId,
        department: dept,
        station,
        registry,
        callerPhone,
        location: location || 'Not mentioned',
        affectedPeople: affectedPeople || 'Not mentioned',
        summary: summary || 'Emergency complaint registered',
        query,
        priority: priority || 'Medium',
        requiredService,
        requiredResources,
        transcript,
        language,
        confidence: confidence || 0.85,
        callSid,
        callId,
        requestId,
        createdAt: now
      });

      // Format transcript as text for storage
      const transcriptText = Array.isArray(transcript)
        ? transcript.map(t => `[${t.role}]: ${t.text}`).join('\n')
        : '';

      const resourcesJson = Array.isArray(requiredResources)
        ? JSON.stringify(requiredResources)
        : JSON.stringify([]);

      db.prepare(`
        INSERT INTO complaint_dispatches (
          id, dispatch_id, call_id, call_sid, request_id, caller_phone,
          department, station_name, station_jurisdiction, station_phone, station_email,
          emergency_number, response_unit, priority, location, affected_people,
          summary, query, required_service, required_resources, language, confidence,
          complaint_document, transcript_text, dispatch_status, response_time_estimate,
          escalation_officer, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, 'DISPATCHED', ?,
          ?, ?
        )
      `).run(
        id, dispatchId, callId, callSid, requestId, callerPhone,
        dept, station.name, station.jurisdiction, station.phone, station.email,
        registry.emergencyNumber, registry.responseUnit, priority || 'Medium',
        location || 'Not mentioned', affectedPeople || 'Not mentioned',
        summary, query, requiredService, resourcesJson,
        language || 'English', confidence || 0.85,
        complaintDocument, transcriptText, station.responseTime,
        registry.priorityEscalation, now
      );

      console.log(`[ComplaintDispatch] ✅ Complaint ${dispatchId} dispatched to ${dept} → ${station.name} (${station.jurisdiction})`);

      // Create a notification for the dashboard
      notificationService.notify({
        domain: 'EMERGENCY',
        title: `Complaint Dispatched to ${dept}`,
        message: `Complaint ${dispatchId} forwarded to ${station.name} (${station.jurisdiction}). Priority: ${priority}. Location: ${location || 'Not specified'}.`,
        severity: priority === 'Critical' ? 'CRITICAL' : priority === 'High' ? 'WARNING' : 'INFO',
        entityId: callId || requestId,
        targetRole: 'ADMIN'
      });

      // Broadcast real-time event to dashboard
      const dispatchData = {
        id,
        dispatchId,
        callId,
        callSid,
        requestId,
        department: dept,
        stationName: station.name,
        stationJurisdiction: station.jurisdiction,
        stationPhone: station.phone,
        stationEmail: station.email,
        emergencyNumber: registry.emergencyNumber,
        responseUnit: registry.responseUnit,
        priority,
        location,
        affectedPeople,
        summary,
        requiredService,
        requiredResources,
        language,
        confidence,
        responseTimeEstimate: station.responseTime,
        escalationOfficer: registry.priorityEscalation,
        dispatchStatus: 'DISPATCHED',
        createdAt: now
      };

      eventBus.broadcast('COMPLAINT_DISPATCHED', dispatchData);

      return dispatchData;
    } catch (err) {
      console.error('[ComplaintDispatch] Failed to dispatch complaint:', err.message);
      return null;
    }
  }

  /**
   * Get all dispatched complaints with optional filters.
   */
  getAllDispatches(filters = {}) {
    const db = getDatabase();
    let query = 'SELECT * FROM complaint_dispatches WHERE 1=1';
    const params = [];

    if (filters.department && filters.department !== 'ALL') {
      query += ' AND department = ?';
      params.push(filters.department);
    }
    if (filters.priority && filters.priority !== 'ALL') {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }
    if (filters.status && filters.status !== 'ALL') {
      query += ' AND dispatch_status = ?';
      params.push(filters.status);
    }
    if (filters.acknowledged !== undefined) {
      query += ' AND department_acknowledged = ?';
      params.push(filters.acknowledged ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);

    return rows.map(r => ({
      ...r,
      required_resources: r.required_resources ? JSON.parse(r.required_resources) : [],
      department_acknowledged: Boolean(r.department_acknowledged),
      resolved: Boolean(r.resolved)
    }));
  }

  /**
   * Get a single dispatch by ID or dispatch_id.
   */
  getDispatchById(idOrDispatchId) {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT * FROM complaint_dispatches WHERE id = ? OR dispatch_id = ?'
    ).get(idOrDispatchId, idOrDispatchId);

    if (!row) return null;

    return {
      ...row,
      required_resources: row.required_resources ? JSON.parse(row.required_resources) : [],
      department_acknowledged: Boolean(row.department_acknowledged),
      resolved: Boolean(row.resolved)
    };
  }

  /**
   * Get dispatches for a specific call.
   */
  getDispatchesByCallId(callId) {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM complaint_dispatches WHERE call_id = ? ORDER BY created_at DESC'
    ).all(callId);

    return rows.map(r => ({
      ...r,
      required_resources: r.required_resources ? JSON.parse(r.required_resources) : [],
      department_acknowledged: Boolean(r.department_acknowledged),
      resolved: Boolean(r.resolved)
    }));
  }

  /**
   * Acknowledge a dispatched complaint (department confirms receipt).
   */
  acknowledgeDispatch(idOrDispatchId) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const dispatch = this.getDispatchById(idOrDispatchId);
    if (!dispatch) return null;

    db.prepare(`
      UPDATE complaint_dispatches
      SET department_acknowledged = 1,
          acknowledged_at = ?,
          dispatch_status = 'ACKNOWLEDGED'
      WHERE id = ? OR dispatch_id = ?
    `).run(now, idOrDispatchId, idOrDispatchId);

    console.log(`[ComplaintDispatch] Complaint ${dispatch.dispatch_id} acknowledged by ${dispatch.department}`);

    eventBus.broadcast('COMPLAINT_ACKNOWLEDGED', {
      dispatchId: dispatch.dispatch_id,
      department: dispatch.department,
      stationName: dispatch.station_name,
      acknowledgedAt: now
    });

    return this.getDispatchById(idOrDispatchId);
  }

  /**
   * Mark a dispatched complaint as resolved.
   */
  resolveDispatch(idOrDispatchId, resolutionNotes = '') {
    const db = getDatabase();
    const now = new Date().toISOString();
    const dispatch = this.getDispatchById(idOrDispatchId);
    if (!dispatch) return null;

    db.prepare(`
      UPDATE complaint_dispatches
      SET resolved = 1,
          resolved_at = ?,
          resolution_notes = ?,
          dispatch_status = 'RESOLVED'
      WHERE id = ? OR dispatch_id = ?
    `).run(now, resolutionNotes || 'Complaint resolved by department', idOrDispatchId, idOrDispatchId);

    console.log(`[ComplaintDispatch] Complaint ${dispatch.dispatch_id} resolved`);

    eventBus.broadcast('COMPLAINT_RESOLVED', {
      dispatchId: dispatch.dispatch_id,
      department: dispatch.department,
      resolvedAt: now,
      resolutionNotes
    });

    return this.getDispatchById(idOrDispatchId);
  }

  /**
   * Get dispatch statistics.
   */
  getStats() {
    const db = getDatabase();

    const total = db.prepare('SELECT COUNT(*) as count FROM complaint_dispatches').get()?.count || 0;
    const dispatched = db.prepare("SELECT COUNT(*) as count FROM complaint_dispatches WHERE dispatch_status = 'DISPATCHED'").get()?.count || 0;
    const acknowledged = db.prepare("SELECT COUNT(*) as count FROM complaint_dispatches WHERE dispatch_status = 'ACKNOWLEDGED'").get()?.count || 0;
    const resolved = db.prepare("SELECT COUNT(*) as count FROM complaint_dispatches WHERE dispatch_status = 'RESOLVED'").get()?.count || 0;
    const critical = db.prepare("SELECT COUNT(*) as count FROM complaint_dispatches WHERE priority = 'Critical'").get()?.count || 0;

    const byDepartment = db.prepare(`
      SELECT department, COUNT(*) as count
      FROM complaint_dispatches
      GROUP BY department
      ORDER BY count DESC
    `).all();

    const byStatus = db.prepare(`
      SELECT dispatch_status as status, COUNT(*) as count
      FROM complaint_dispatches
      GROUP BY dispatch_status
    `).all();

    return {
      total,
      dispatched,
      acknowledged,
      resolved,
      critical,
      pendingResponse: total - acknowledged - resolved,
      byDepartment,
      byStatus
    };
  }

  /**
   * Get all available department registry info.
   */
  getDepartmentRegistry() {
    return Object.entries(DEPARTMENT_REGISTRY).map(([dept, info]) => ({
      department: dept,
      stationType: info.stationType,
      emergencyNumber: info.emergencyNumber,
      responseUnit: info.responseUnit,
      stations: info.defaultStations,
      priorityEscalation: info.priorityEscalation
    }));
  }
}

export const complaintDispatchService = new ComplaintDispatchService();
