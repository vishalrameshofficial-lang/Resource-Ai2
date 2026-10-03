import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eventBus } from '../websocket/eventBus.js';

const JWT_SECRET = process.env.JWT_SECRET || 'resourceai_emergency_super_secret_jwt_key_2026';

// ─────────────────────────────────────────────
// DEFAULT CONFIGURABLE DEPARTMENTS & SUBCATEGORIES
// ─────────────────────────────────────────────
export const INITIAL_DEPARTMENTS = [
  {
    id: 'dept-water',
    code: 'WTR',
    name: 'Water Supply',
    name_ta: 'குடிநீர் வழங்கல்',
    category: 'WATER',
    emergency_number: '1916',
    sla_critical_hours: 24,
    sla_high_hours: 48,
    sla_medium_hours: 72,
    sla_low_hours: 168,
    subcategories: [
      { id: 'sub-wtr-leak', code: 'LEAKAGE', name: 'Water Pipe Leakage / Burst', name_ta: 'குடிநீர் குழாய் கசிவு' },
      { id: 'sub-wtr-disrupt', code: 'DISRUPTION', name: 'Supply Disruption / No Water', name_ta: 'குடிநீர் விநியோகமின்மை' },
      { id: 'sub-wtr-contam', code: 'CONTAMINATION', name: 'Contaminated / Muddy Water', name_ta: 'மாசுபட்ட குடிநீர்' },
      { id: 'sub-wtr-pressure', code: 'PRESSURE', name: 'Low Pressure / Faulty Valve', name_ta: 'குறைந்த நீர் அழுத்தம்' },
      { id: 'sub-wtr-infra', code: 'INFRASTRUCTURE', name: 'Damaged Overhead Tank / Borewell', name_ta: 'மேல்நிலை தொட்டி சேதம்' }
    ]
  },
  {
    id: 'dept-sanitation',
    code: 'SAN',
    name: 'Sanitation and Drainage',
    name_ta: 'துப்புரவு மற்றும் வடிகால்',
    category: 'SANITATION',
    emergency_number: '1916',
    sla_critical_hours: 12,
    sla_high_hours: 24,
    sla_medium_hours: 48,
    sla_low_hours: 96,
    subcategories: [
      { id: 'sub-san-drain', code: 'BLOCKED_DRAINAGE', name: 'Blocked Drainage / Sewage Overflow', name_ta: 'சாக்கடை அடைப்பு / வழிந்தோடல்' },
      { id: 'sub-san-garbage', code: 'GARBAGE_COLLECTION', name: 'Uncollected Garbage / Waste Heap', name_ta: 'குப்பை அகற்றப்படாமை' },
      { id: 'sub-san-public', code: 'PUBLIC_CLEANLINESS', name: 'Public Cleanliness / Disinfection', name_ta: 'பொது சுகாதாரம் / கிருமிநாசினி' },
      { id: 'sub-san-pest', code: 'PEST_CONTROL', name: 'Mosquito / Pest Breeding Hazards', name_ta: 'கொசு / பூச்சி தொல்லை' }
    ]
  },
  {
    id: 'dept-electricity',
    code: 'ELEC',
    name: 'Electricity and Power',
    name_ta: 'மின்சாரம் மற்றும் ஆற்றல்',
    category: 'ELECTRICITY',
    emergency_number: '1912',
    sla_critical_hours: 6,
    sla_high_hours: 18,
    sla_medium_hours: 48,
    sla_low_hours: 96,
    subcategories: [
      { id: 'sub-elec-outage', code: 'POWER_OUTAGE', name: 'Power Outage / Line Fault', name_ta: 'மின் தடை / கம்பி பழுது' },
      { id: 'sub-elec-street', code: 'STREETLIGHT_FAILURE', name: 'Streetlight Not Working', name_ta: 'தெருவிளக்கு எரியவில்லை' },
      { id: 'sub-elec-hazard', code: 'SAFETY_HAZARD', name: 'Fallen Wire / Sparking Pole Hazard', name_ta: 'அறுந்து விழுந்த மின் கம்பி' },
      { id: 'sub-elec-trans', code: 'TRANSFORMER_DEFECT', name: 'Defective Transformer / Sparking', name_ta: 'மின்மாற்றி பழுது' }
    ]
  },
  {
    id: 'dept-fire',
    code: 'FIRE',
    name: 'Fire and Emergency',
    name_ta: 'தீயணைப்பு மற்றும் மீட்புப்பணி',
    category: 'FIRE_EMERGENCY',
    emergency_number: '101',
    sla_critical_hours: 2,
    sla_high_hours: 6,
    sla_medium_hours: 24,
    sla_low_hours: 48,
    subcategories: [
      { id: 'sub-fire-active', code: 'FIRE_INCIDENT', name: 'Active Fire Incident / Gas Leak', name_ta: 'தீ விபத்து / எரிவாயு கசிவு' },
      { id: 'sub-fire-safety', code: 'SAFETY_VIOLATION', name: 'Fire Safety Concern in Building', name_ta: 'தீ பாதுகாப்பு விதிமீறல்' },
      { id: 'sub-fire-rescue', code: 'RESCUE_OPERATION', name: 'Emergency Extraction / Trapped Person', name_ta: 'அவசர மீட்பு பணி' }
    ]
  },
  {
    id: 'dept-roads',
    code: 'RDS',
    name: 'Roads and Infrastructure',
    name_ta: 'சாலைகள் மற்றும் உள்கட்டமைப்பு',
    category: 'ROADS',
    emergency_number: '1077',
    sla_critical_hours: 24,
    sla_high_hours: 72,
    sla_medium_hours: 168,
    sla_low_hours: 336,
    subcategories: [
      { id: 'sub-rds-pothole', code: 'POTHOLE', name: 'Severe Pothole / Crater on Road', name_ta: 'சாலை குழி / பள்ளம்' },
      { id: 'sub-rds-damaged', code: 'DAMAGED_ROAD', name: 'Damaged Road Surface / Cave-in', name_ta: 'சேதமடைந்த சாலை' },
      { id: 'sub-rds-bridge', code: 'BROKEN_INFRA', name: 'Broken Culvert / Bridge Railing', name_ta: 'உடைந்த சிறு பாலம் / தடுப்பு' },
      { id: 'sub-rds-encroach', code: 'ENCROACHMENT', name: 'Road Encroachment / Footpath Blocked', name_ta: 'சாலை ஆக்கிரமிப்பு' }
    ]
  },
  {
    id: 'dept-waste',
    code: 'WST',
    name: 'Waste Management',
    name_ta: 'திடக்கழிவு மேலாண்மை',
    category: 'WASTE_MGMT',
    emergency_number: '1916',
    sla_critical_hours: 24,
    sla_high_hours: 48,
    sla_medium_hours: 96,
    sla_low_hours: 192,
    subcategories: [
      { id: 'sub-wst-dump', code: 'ILLEGAL_DUMPING', name: 'Illegal Debris / Bio-waste Dumping', name_ta: 'சட்டவிரோத கழிவு கொட்டுதல்' },
      { id: 'sub-wst-bin', code: 'BROKEN_BIN', name: 'Missing or Broken Dustbin', name_ta: 'உடைந்த குப்பை தொட்டி' },
      { id: 'sub-wst-burning', code: 'GARBAGE_BURNING', name: 'Toxic Open Garbage Burning', name_ta: 'குப்பை எரித்தல்' }
    ]
  },
  {
    id: 'dept-health',
    code: 'HLT',
    name: 'Public Health',
    name_ta: 'பொது சுகாதாரம் மற்றும் மருத்துவம்',
    category: 'PUBLIC_HEALTH',
    emergency_number: '104',
    sla_critical_hours: 12,
    sla_high_hours: 24,
    sla_medium_hours: 72,
    sla_low_hours: 144,
    subcategories: [
      { id: 'sub-hlt-outbreak', code: 'EPIDEMIC_OUTBREAK', name: 'Dengue / Cholera / Fever Outbreak', name_ta: 'தொற்றுநோய் பரவல்' },
      { id: 'sub-hlt-food', code: 'FOOD_CONTAMINATION', name: 'Food Safety / Adulteration Complaint', name_ta: 'உணவு பாதுகாப்பு புகார்' },
      { id: 'sub-hlt-phc', code: 'PHC_DEFICIENCY', name: 'PHC Medicine / Facility Deficiency', name_ta: 'சுகாதார மைய குறைபாடு' }
    ]
  },
  {
    id: 'dept-gov',
    code: 'GOV',
    name: 'Government Citizen Services',
    name_ta: 'அரசு சேவைகள்',
    category: 'GOV_SERVICES',
    emergency_number: '1100',
    sla_critical_hours: 72,
    sla_high_hours: 120,
    sla_medium_hours: 240,
    sla_low_hours: 480,
    subcategories: [
      { id: 'sub-gov-cert', code: 'CERTIFICATE_DELAY', name: 'Certificate / Ration / Pension Delay', name_ta: 'சான்றிதழ் / ரேஷன் / ஓய்வூதிய தாமதம்' },
      { id: 'sub-gov-scheme', code: 'SCHEME_GRIEVANCE', name: 'Welfare Scheme Implementation Grievance', name_ta: 'நலத்திட்ட குறைபாடு' }
    ]
  }
];

export const VALID_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'UNASSIGNED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'NEEDS_INFORMATION',
  'AWAITING_INFORMATION',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'ESCALATED',
  'REJECTED'
];

export const VALID_CHANNELS = ['VOICE', 'MANUAL', 'PHONE'];

export const VALID_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export class OurVoiceService {
  constructor() {
    this._ensureTables();
  }

  _ensureTables() {
    try {
      const db = getDatabase();

      // 1. Complaint Departments Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS complaint_departments (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          name_ta TEXT,
          category TEXT NOT NULL,
          emergency_number TEXT,
          sla_critical_hours INTEGER DEFAULT 24,
          sla_high_hours INTEGER DEFAULT 72,
          sla_medium_hours INTEGER DEFAULT 168,
          sla_low_hours INTEGER DEFAULT 336,
          head_officer_id TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL
        );
      `);

      // 2. Complaint Subcategories Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS complaint_subcategories (
          id TEXT PRIMARY KEY,
          department_id TEXT NOT NULL,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          name_ta TEXT,
          sla_multiplier REAL DEFAULT 1.0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (department_id) REFERENCES complaint_departments(id)
        );
      `);

      // 3. Authoritative Complaints Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS complaints (
          id TEXT PRIMARY KEY,
          complaint_id TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'WEB',
          call_sid TEXT,
          recording_url TEXT,
          transcript TEXT,
          citizen_id TEXT,
          citizen_name TEXT,
          citizen_phone TEXT,
          citizen_email TEXT,
          department_id TEXT,
          department_name TEXT,
          subcategory_id TEXT,
          subcategory_name TEXT,
          assigned_officer_id TEXT,
          assigned_officer_name TEXT,
          state TEXT NOT NULL DEFAULT 'SUBMITTED',
          priority TEXT NOT NULL DEFAULT 'MEDIUM',
          priority_score INTEGER DEFAULT 50,
          location_name TEXT,
          latitude REAL,
          longitude REAL,
          district TEXT,
          ward TEXT,
          duration_days INTEGER DEFAULT 1,
          affected_population INTEGER DEFAULT 1,
          sla_hours INTEGER DEFAULT 72,
          sla_deadline TEXT,
          sla_status TEXT DEFAULT 'WITHIN_SLA',
          expected_completion_date TEXT,
          resolution_notes TEXT,
          resolution_evidence_url TEXT,
          resolved_at TEXT,
          resolved_by TEXT,
          citizen_feedback TEXT,
          citizen_rating INTEGER,
          dispute_reason TEXT,
          disputed_at TEXT,
          reopened_at TEXT,
          closed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_comp_state ON complaints(state);
        CREATE INDEX IF NOT EXISTS idx_comp_dept ON complaints(department_id);
        CREATE INDEX IF NOT EXISTS idx_comp_officer ON complaints(assigned_officer_id);
        CREATE INDEX IF NOT EXISTS idx_comp_citizen ON complaints(citizen_id);
        CREATE INDEX IF NOT EXISTS idx_comp_priority ON complaints(priority);
        CREATE INDEX IF NOT EXISTS idx_comp_created ON complaints(created_at);
        CREATE INDEX IF NOT EXISTS idx_comp_source ON complaints(source);
      `);

      // 4. Assignment History Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS complaint_assignment_history (
          id TEXT PRIMARY KEY,
          complaint_id TEXT NOT NULL,
          from_department_id TEXT,
          to_department_id TEXT NOT NULL,
          from_officer_id TEXT,
          to_officer_id TEXT,
          assigned_by TEXT NOT NULL,
          assignment_notes TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (complaint_id) REFERENCES complaints(id)
        );
        CREATE INDEX IF NOT EXISTS idx_c_assign_comp ON complaint_assignment_history(complaint_id);
      `);

      // 5. Status Transition Audit History Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS complaint_status_history (
          id TEXT PRIMARY KEY,
          complaint_id TEXT NOT NULL,
          from_state TEXT,
          to_state TEXT NOT NULL,
          actor_id TEXT,
          actor_name TEXT NOT NULL,
          actor_role TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (complaint_id) REFERENCES complaints(id)
        );
        CREATE INDEX IF NOT EXISTS idx_c_status_comp ON complaint_status_history(complaint_id);
      `);

      // 6. Evidence & Attachments Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS complaint_evidence (
          id TEXT PRIMARY KEY,
          complaint_id TEXT NOT NULL,
          type TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_url TEXT NOT NULL,
          file_size INTEGER,
          mime_type TEXT,
          uploaded_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (complaint_id) REFERENCES complaints(id)
        );
      `);

      // 7. In-App Notifications Table
      db.exec(`
        CREATE TABLE IF NOT EXISTS complaint_notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          role TEXT,
          department_id TEXT,
          complaint_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_c_notif_user ON complaint_notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_c_notif_role ON complaint_notifications(role);
        CREATE INDEX IF NOT EXISTS idx_c_notif_dept ON complaint_notifications(department_id);
      `);

      // Ensure user table has phone, department_id, and name_ta columns
      const userInfo = db.prepare(`PRAGMA table_info(users)`).all();
      const existingUserCols = new Set(userInfo.map(col => col.name));
      const userColsToAdd = [
        { name: 'department_id', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'name_ta', type: 'TEXT' }
      ];
      for (const col of userColsToAdd) {
        if (!existingUserCols.has(col.name)) {
          db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        }
      }

      this._seedInitialData(db);
    } catch (err) {
      console.warn('[OurVoiceService] Table init warning:', err.message);
    }
  }

  _seedInitialData(db) {
    const deptCount = db.prepare('SELECT COUNT(*) as count FROM complaint_departments').get()?.count || 0;
    if (deptCount === 0) {
      console.log('[OurVoiceService] Seeding initial municipal departments and subcategories...');
      const now = new Date().toISOString();

      const insertDept = db.prepare(`
        INSERT INTO complaint_departments (
          id, code, name, name_ta, category, emergency_number,
          sla_critical_hours, sla_high_hours, sla_medium_hours, sla_low_hours, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertSub = db.prepare(`
        INSERT INTO complaint_subcategories (
          id, department_id, code, name, name_ta, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const dept of INITIAL_DEPARTMENTS) {
        insertDept.run(
          dept.id, dept.code, dept.name, dept.name_ta, dept.category, dept.emergency_number,
          dept.sla_critical_hours, dept.sla_high_hours, dept.sla_medium_hours, dept.sla_low_hours, now
        );

        if (dept.subcategories) {
          for (const sub of dept.subcategories) {
            insertSub.run(sub.id, dept.id, sub.code, sub.name, sub.name_ta, now);
          }
        }
      }
    }

    // Seed default role accounts for instant testing across all three portals
    const defaultAccounts = [
      {
        id: 'usr-ov-admin-01',
        email: 'admin@ourvoice.gov.in',
        password: 'admin123',
        name: 'Chief Grievance Administrator',
        role: 'ADMIN',
        department_id: null,
        phone: '+919444001122'
      },
      {
        id: 'usr-ov-wtr-01',
        email: 'water.officer@ourvoice.gov.in',
        password: 'officer123',
        name: 'Er. S. Ramanathan',
        role: 'DEPARTMENT_INCHARGE',
        department_id: 'dept-water',
        phone: '+919444001133'
      },
      {
        id: 'usr-ov-elec-01',
        email: 'electricity.officer@ourvoice.gov.in',
        password: 'officer123',
        name: 'Er. M. Kanthaswamy',
        role: 'DEPARTMENT_INCHARGE',
        department_id: 'dept-electricity',
        phone: '+919444001144'
      },
      {
        id: 'usr-ov-san-01',
        email: 'sanitation.officer@ourvoice.gov.in',
        password: 'officer123',
        name: 'Dr. P. Vasanthi',
        role: 'DEPARTMENT_INCHARGE',
        department_id: 'dept-sanitation',
        phone: '+919444001155'
      },
      {
        id: 'usr-ov-fire-01',
        email: 'fire.officer@ourvoice.gov.in',
        password: 'officer123',
        name: 'Station Officer K. Rajesh',
        role: 'DEPARTMENT_INCHARGE',
        department_id: 'dept-fire',
        phone: '+919444001166'
      },
      {
        id: 'usr-ov-cit-01',
        email: 'citizen@ourvoice.gov.in',
        password: 'citizen123',
        name: 'K. Annamalai (Citizen)',
        role: 'CITIZEN',
        department_id: null,
        phone: '+919884727989'
      }
    ];

    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?');
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, department_id, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const acc of defaultAccounts) {
      if (!checkUser.get(acc.email)) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(acc.password, salt);
        insertUser.run(acc.id, acc.email, hash, acc.name, acc.role, acc.department_id, acc.phone, new Date().toISOString());
      }
    }
  }

  // ─────────────────────────────────────────────
  // AUTHENTICATION & USER MANAGEMENT
  // ─────────────────────────────────────────────
  async registerCitizen({ name, email, phone, password }) {
    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required');
    }
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const id = `usr-cit-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, department_id, phone, created_at)
      VALUES (?, ?, ?, ?, 'CITIZEN', NULL, ?, ?)
    `).run(id, email.toLowerCase().trim(), hash, name.trim(), phone || null, now);

    const token = jwt.sign({ id, email, role: 'CITIZEN', name }, JWT_SECRET, { expiresIn: '7d' });
    return { token, user: { id, name, email, role: 'CITIZEN', phone } };
  }

  async login({ email, password }) {
    if (!email || !password) throw new Error('Email and password required');
    const db = getDatabase();
    const user = db.prepare(`
      SELECT u.*, d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN complaint_departments d ON u.department_id = d.id
      WHERE u.email = ?
    `).get(email.toLowerCase().trim());

    if (!user) throw new Error('Invalid email or password');
    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) throw new Error('Invalid email or password');

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
        department_code: user.department_code,
        phone: user.phone
      }
    };
  }

  getUserById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT u.id, u.email, u.name, u.role, u.department_id, u.phone,
             d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN complaint_departments d ON u.department_id = d.id
      WHERE u.id = ?
    `).get(id);
  }

  createOfficerAccount({ name, email, password, departmentId, phone }) {
    if (!name || !email || !password || !departmentId) {
      throw new Error('Name, email, password, and department are required');
    }
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) throw new Error('User already exists');

    const dept = db.prepare('SELECT id FROM complaint_departments WHERE id = ?').get(departmentId);
    if (!dept) throw new Error('Specified department not found');

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const id = `usr-ov-off-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, department_id, phone, created_at)
      VALUES (?, ?, ?, ?, 'DEPARTMENT_INCHARGE', ?, ?, ?)
    `).run(id, email.toLowerCase().trim(), hash, name.trim(), departmentId, phone || null, now);

    return this.getUserById(id);
  }

  getOfficers(departmentId = null) {
    const db = getDatabase();
    if (departmentId) {
      return db.prepare(`
        SELECT u.id, u.name, u.email, u.phone, u.role, u.department_id, d.name as department_name
        FROM users u
        JOIN complaint_departments d ON u.department_id = d.id
        WHERE u.role = 'DEPARTMENT_INCHARGE' AND u.department_id = ?
        ORDER BY u.name ASC
      `).all(departmentId);
    }
    return db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.department_id, d.name as department_name
      FROM users u
      LEFT JOIN complaint_departments d ON u.department_id = d.id
      WHERE u.role = 'DEPARTMENT_INCHARGE'
      ORDER BY d.name ASC, u.name ASC
    `).all();
  }

  // ─────────────────────────────────────────────
  // DEPARTMENTS & SUBCATEGORIES
  // ─────────────────────────────────────────────
  getDepartments(includeInactive = false) {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM complaint_departments ORDER BY name ASC'
      : 'SELECT * FROM complaint_departments WHERE is_active = 1 ORDER BY name ASC';
    const departments = db.prepare(query).all();

    const getSubs = db.prepare('SELECT * FROM complaint_subcategories WHERE department_id = ? ORDER BY name ASC');
    return departments.map(d => ({
      ...d,
      subcategories: getSubs.all(d.id)
    }));
  }

  createDepartment({ code, name, name_ta, category, emergency_number, sla_critical, sla_high, sla_medium, sla_low }) {
    const db = getDatabase();
    const id = `dept-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO complaint_departments (
        id, code, name, name_ta, category, emergency_number,
        sla_critical_hours, sla_high_hours, sla_medium_hours, sla_low_hours, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, code.toUpperCase().trim(), name.trim(), name_ta || null, category.toUpperCase().trim(), emergency_number || '112',
      sla_critical || 24, sla_high || 72, sla_medium || 168, sla_low || 336, now
    );

    return db.prepare('SELECT * FROM complaint_departments WHERE id = ?').get(id);
  }

  createSubcategory({ departmentId, code, name, name_ta }) {
    const db = getDatabase();
    const id = `sub-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO complaint_subcategories (id, department_id, code, name, name_ta, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, departmentId, code.toUpperCase().trim(), name.trim(), name_ta || null, now);

    return db.prepare('SELECT * FROM complaint_subcategories WHERE id = ?').get(id);
  }

  // ─────────────────────────────────────────────
  // COMPLAINT LIFECYCLE & WORKFLOW ENGINE
  // ─────────────────────────────────────────────
  createComplaint({
    title,
    description,
    source = 'MANUAL',
    citizenId = null,
    citizenName = null,
    citizenPhone = null,
    citizenEmail = null,
    departmentId = null,
    subcategoryId = null,
    priority = 'MEDIUM',
    locationName = 'Unspecified',
    latitude = null,
    longitude = null,
    district = null,
    ward = null,
    durationDays = 1,
    affectedPopulation = 1,
    callSid = null,
    recordingUrl = null,
    transcript = null,
    attachments = []
  }) {
    if (!title || !description) {
      throw new Error('Complaint title and description are required');
    }

    const db = getDatabase();
    const id = `comp-${uuidv4()}`;
    const now = new Date();
    const nowIso = now.toISOString();

    // Canonical channel normalization: VOICE, MANUAL, PHONE
    let normalizedChannel = 'MANUAL';
    const s = String(source || '').toUpperCase();
    if (s.includes('VOICE') || s.includes('SPEECH')) normalizedChannel = 'VOICE';
    else if (s.includes('PHONE') || s.includes('EXOTEL') || s.includes('CALL')) normalizedChannel = 'PHONE';
    else normalizedChannel = 'MANUAL';

    // Generate unique complaint ID: OVOI-2026-XXXXX
    const year = now.getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const complaintId = `OVOI-${year}-${randomHex}`;

    // Priority validation
    const validPriority = VALID_PRIORITIES.includes(priority?.toUpperCase())
      ? priority.toUpperCase()
      : 'MEDIUM';

    // Department & SLA calculations
    let deptName = null;
    let slaHours = 72; // Default 3 days
    let initialStatus = 'UNASSIGNED';

    if (departmentId) {
      const dept = db.prepare('SELECT name, sla_critical_hours, sla_high_hours, sla_medium_hours, sla_low_hours FROM complaint_departments WHERE id = ?').get(departmentId);
      if (dept) {
        deptName = dept.name;
        initialStatus = 'ASSIGNED';
        if (validPriority === 'CRITICAL') slaHours = dept.sla_critical_hours || 24;
        else if (validPriority === 'HIGH') slaHours = dept.sla_high_hours || 72;
        else if (validPriority === 'LOW') slaHours = dept.sla_low_hours || 336;
        else slaHours = dept.sla_medium_hours || 168;
      }
    }

    let subcatName = null;
    if (subcategoryId) {
      const sub = db.prepare('SELECT name FROM complaint_subcategories WHERE id = ?').get(subcategoryId);
      if (sub) subcatName = sub.name;
    }

    const slaDeadline = new Date(now.getTime() + slaHours * 3600000).toISOString();

    // Insert complaint
    db.prepare(`
      INSERT INTO complaints (
        id, complaint_id, title, description, source, call_sid, recording_url, transcript,
        citizen_id, citizen_name, citizen_phone, citizen_email,
        department_id, department_name, subcategory_id, subcategory_name,
        state, priority, priority_score, location_name, latitude, longitude,
        district, ward, duration_days, affected_population,
        sla_hours, sla_deadline, sla_status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, 'WITHIN_SLA', ?, ?
      )
    `).run(
      id, complaintId, title.trim(), description.trim(), normalizedChannel, callSid, recordingUrl, transcript,
      citizenId, citizenName, citizenPhone, citizenEmail,
      departmentId || null, deptName, subcategoryId || null, subcatName,
      initialStatus, validPriority, validPriority === 'CRITICAL' ? 95 : validPriority === 'HIGH' ? 75 : validPriority === 'MEDIUM' ? 50 : 25,
      locationName || 'Unspecified', latitude || null, longitude || null,
      district || null, ward || null, durationDays || 1, affectedPopulation || 1,
      slaHours, slaDeadline, nowIso, nowIso
    );

    // Record initial status history
    this.recordStatusChange(id, null, initialStatus, citizenId || 'system', citizenName || (normalizedChannel === 'PHONE' ? 'Telephone Caller' : 'Citizen'), 'CITIZEN', 'Complaint submitted via ' + normalizedChannel);

    // Record initial assignment history if department was selected
    if (departmentId) {
      this.recordAssignment(id, null, departmentId, null, null, citizenId || 'system', 'Direct intake category selection');
    }

    // Save evidence attachments if provided
    if (Array.isArray(attachments) && attachments.length > 0) {
      const insertEvidence = db.prepare(`
        INSERT INTO complaint_evidence (id, complaint_id, type, file_name, file_url, file_size, mime_type, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const att of attachments) {
        insertEvidence.run(
          `ev-${uuidv4()}`, id, att.type || 'DOCUMENT', att.fileName || att.name || 'Attachment',
          att.fileUrl || att.url || '', att.fileSize || 0, att.mimeType || 'application/octet-stream',
          citizenName || 'Citizen', nowIso
        );
      }
    }

    // Notify administrators
    this.createNotification({
      role: 'ADMIN',
      complaintId: id,
      title: `New Complaint: ${complaintId}`,
      message: `${validPriority} priority [${normalizedChannel}]: "${title.slice(0, 50)}" in ${locationName || 'Tamil Nadu'}`,
      type: 'NEW_COMPLAINT'
    });

    // Notify department in-charge if department was designated
    if (departmentId) {
      this.createNotification({
        role: 'DEPARTMENT_INCHARGE',
        departmentId,
        complaintId: id,
        title: `New Assignment: ${complaintId}`,
        message: `Complaint assigned to your department: "${title.slice(0, 50)}"`,
        type: 'ASSIGNMENT'
      });
    }

    // Real-time broadcast to dashboard clients
    eventBus.broadcast('OVOI_COMPLAINT_CREATED', { id, complaintId, title, departmentName: deptName, priority: validPriority, state: initialStatus, source: normalizedChannel });

    return this.getComplaintById(id);
  }

  // ─────────────────────────────────────────────
  // EXOTEL TELEPHONE INTAKE BRIDGE
  // ─────────────────────────────────────────────
  registerFromExotelCall(session) {
    if (!session || !session.callSid) return null;

    const db = getDatabase();
    // Idempotency: Prevent duplicate complaints if callback fires twice
    const existing = db.prepare('SELECT id FROM complaints WHERE call_sid = ?').get(session.callSid);
    if (existing) {
      return this.getComplaintById(existing.id);
    }

    // Map AI-classified department to a registered Our Voice Our Issue department
    let matchedDeptId = null;
    let matchedDeptName = null;
    const callerDept = (session.department || '').toLowerCase();

    if (callerDept.includes('water')) matchedDeptId = 'dept-water';
    else if (callerDept.includes('electric') || callerDept.includes('power')) matchedDeptId = 'dept-electricity';
    else if (callerDept.includes('sanitat') || callerDept.includes('drain')) matchedDeptId = 'dept-sanitation';
    else if (callerDept.includes('fire')) matchedDeptId = 'dept-fire';
    else if (callerDept.includes('road') || callerDept.includes('transport')) matchedDeptId = 'dept-roads';
    else if (callerDept.includes('waste') || callerDept.includes('garbage')) matchedDeptId = 'dept-waste';
    else if (callerDept.includes('health') || callerDept.includes('medic')) matchedDeptId = 'dept-health';

    let priority = 'MEDIUM';
    const rawPriority = (session.priority || '').toUpperCase();
    if (rawPriority.includes('CRIT')) priority = 'CRITICAL';
    else if (rawPriority.includes('HIGH')) priority = 'HIGH';
    else if (rawPriority.includes('LOW')) priority = 'LOW';

    const transcriptText = Array.isArray(session.transcript)
      ? session.transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n')
      : (typeof session.transcript === 'string' ? session.transcript : '');

    const title = session.summary
      ? `Phone: ${session.summary.slice(0, 70)}`
      : `Telephone Complaint from ${session.callerPhone || 'Citizen'}`;

    const description = `${session.query || session.summary || 'Citizen reported municipal grievance via voice assistance'}\n\nCall Details:\n- Caller: ${session.callerPhone || 'Anonymous'}\n- Duration: ${session.metadata?.durationSec || 0}s\n- Language: ${session.language || 'English'}`;

    return this.createComplaint({
      title,
      description,
      source: 'PHONE',
      callSid: session.callSid,
      recordingUrl: session.recording_url || null,
      transcript: transcriptText,
      citizenPhone: session.callerPhone || null,
      citizenName: session.callerPhone ? `Caller ${session.callerPhone.slice(-4)}` : 'Telephone Citizen',
      departmentId: matchedDeptId,
      priority,
      locationName: session.location || 'Reported via Phone',
      affectedPopulation: parseInt(session.affected_people || '1', 10) || 1
    });
  }

  // ─────────────────────────────────────────────
  // COMPLAINT RETRIEVAL & FILTERING (RBAC SCOPED)
  // ─────────────────────────────────────────────
  getComplaints(filtersOrParams = {}, userParam = null) {
    const db = getDatabase();
    const user = userParam || filtersOrParams.user || null;
    const { state, departmentId, priority, source, search, limit = 50, offset = 0 } = filtersOrParams;

    let whereClauses = [];
    let params = [];

    // Role-based scoping
    if (user) {
      if (user.role === 'DEPARTMENT_INCHARGE') {
        if (!user.department_id) return { total: 0, items: [] };
        whereClauses.push('c.department_id = ?');
        params.push(user.department_id);
      } else if (user.role === 'CITIZEN') {
        // Citizens can only view their own complaints or complaints matching their verified phone
        whereClauses.push('(c.citizen_id = ? OR (c.citizen_phone IS NOT NULL AND c.citizen_phone = ?))');
        params.push(user.id, user.phone || 'none');
      }
    }

    if (state && state !== 'ALL') {
      whereClauses.push('c.state = ?');
      params.push(state.toUpperCase());
    }

    if (departmentId && departmentId !== 'ALL') {
      whereClauses.push('c.department_id = ?');
      params.push(departmentId);
    }

    if (priority && priority !== 'ALL') {
      whereClauses.push('c.priority = ?');
      params.push(priority.toUpperCase());
    }

    if (source && source !== 'ALL') {
      let filterChannel = source.toUpperCase();
      if (filterChannel === 'EXOTEL') filterChannel = 'PHONE';
      if (filterChannel === 'WEB') filterChannel = 'MANUAL';
      whereClauses.push('c.source = ?');
      params.push(filterChannel);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClauses.push('(c.complaint_id LIKE ? OR c.title LIKE ? OR c.description LIKE ? OR c.location_name LIKE ? OR c.citizen_phone LIKE ?)');
      params.push(q, q, q, q, q);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM complaints c ${whereSql}`);
    const total = countStmt.get(...params)?.count || 0;

    const queryStmt = db.prepare(`
      SELECT c.*,
             d.code as department_code,
             u.name as incharge_name, u.phone as incharge_phone
      FROM complaints c
      LEFT JOIN complaint_departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.assigned_officer_id = u.id
      ${whereSql}
      ORDER BY 
        CASE c.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC,
        c.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const items = queryStmt.all(...params, limit, offset);

    return { total, items, limit, offset };
  }

  getMyComplaints(user) {
    if (!user || !user.id) {
      throw new Error('Authentication required to retrieve citizen complaints');
    }
    const db = getDatabase();
    return db.prepare(`
      SELECT c.*,
             d.code as department_code,
             u.name as incharge_name, u.phone as incharge_phone
      FROM complaints c
      LEFT JOIN complaint_departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.assigned_officer_id = u.id
      WHERE c.citizen_id = ? OR (c.citizen_phone IS NOT NULL AND c.citizen_phone = ?)
      ORDER BY c.created_at DESC
    `).all(user.id, user.phone || 'none');
  }

  getComplaintById(id, user = null) {
    const db = getDatabase();
    const complaint = db.prepare(`
      SELECT c.*,
             d.code as department_code, d.emergency_number as department_emergency,
             u.name as incharge_name, u.phone as incharge_phone, u.email as incharge_email
      FROM complaints c
      LEFT JOIN complaint_departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.assigned_officer_id = u.id
      WHERE c.id = ? OR c.complaint_id = ?
    `).get(id, id);

    if (!complaint) return null;

    // RBAC Security Validation
    if (user) {
      if (user.role === 'DEPARTMENT_INCHARGE' && complaint.department_id !== user.department_id) {
        throw new Error('Access denied: You are not authorized to view complaints of other departments');
      }
      if (user.role === 'CITIZEN' && complaint.citizen_id !== user.id && complaint.citizen_phone !== user.phone) {
        throw new Error('Access denied: You may only view your own complaints');
      }
    }

    // Attach timeline & audit history
    const statusHistory = db.prepare(`
      SELECT * FROM complaint_status_history WHERE complaint_id = ? ORDER BY created_at ASC
    `).all(complaint.id);

    const assignmentHistory = db.prepare(`
      SELECT a.*, fd.name as from_department_name, td.name as to_department_name,
             fo.name as from_officer_name, toff.name as to_officer_name
      FROM complaint_assignment_history a
      LEFT JOIN complaint_departments fd ON a.from_department_id = fd.id
      LEFT JOIN complaint_departments td ON a.to_department_id = td.id
      LEFT JOIN users fo ON a.from_officer_id = fo.id
      LEFT JOIN users toff ON a.to_officer_id = toff.id
      WHERE a.complaint_id = ?
      ORDER BY a.created_at ASC
    `).all(complaint.id);

    const evidence = db.prepare(`
      SELECT * FROM complaint_evidence WHERE complaint_id = ? ORDER BY created_at ASC
    `).all(complaint.id);

    return {
      ...complaint,
      statusHistory,
      assignmentHistory,
      evidence
    };
  }

  // Public/Citizen status tracking by tracking ID (OVOI-YYYY-XXXXX)
  trackComplaint(complaintId) {
    const db = getDatabase();
    const complaint = db.prepare(`
      SELECT c.complaint_id, c.title, c.description, c.state, c.priority, c.department_name,
             c.location_name, c.created_at, c.updated_at, c.sla_deadline, c.sla_status,
             c.expected_completion_date, c.resolution_notes, c.resolved_at,
             c.citizen_feedback, c.citizen_rating, c.dispute_reason
      FROM complaints c
      WHERE c.complaint_id = ?
    `).get(complaintId.trim());

    if (!complaint) return null;

    const statusHistory = db.prepare(`
      SELECT to_state, actor_role, notes, created_at
      FROM complaint_status_history
      WHERE complaint_id = (SELECT id FROM complaints WHERE complaint_id = ?)
      ORDER BY created_at ASC
    `).all(complaintId.trim());

    return { ...complaint, statusHistory };
  }

  // ─────────────────────────────────────────────
  // ASSIGNMENT & REASSIGNMENT (ADMIN ONLY)
  // ─────────────────────────────────────────────
  assignComplaint({ complaintId, departmentId, officerId = null, actor, notes = '' }) {
    if (actor.role !== 'ADMIN') {
      throw new Error('Unauthorized: Only administrators can assign or reassign complaints');
    }

    const db = getDatabase();
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);
    if (!complaint) throw new Error('Complaint not found');

    const targetDept = db.prepare('SELECT * FROM complaint_departments WHERE id = ?').get(departmentId);
    if (!targetDept) throw new Error('Invalid target department');

    let officerName = null;
    if (officerId) {
      const officer = db.prepare('SELECT name, department_id FROM users WHERE id = ?').get(officerId);
      if (!officer) throw new Error('Designated officer not found');
      if (officer.department_id !== departmentId) {
        throw new Error('Selected officer does not belong to the target department');
      }
      officerName = officer.name;
    }

    const now = new Date().toISOString();
    const newState = 'ASSIGNED';

    db.prepare(`
      UPDATE complaints
      SET department_id = ?, department_name = ?,
          assigned_officer_id = ?, assigned_officer_name = ?,
          state = ?, updated_at = ?
      WHERE id = ?
    `).run(departmentId, targetDept.name, officerId || null, officerName, newState, now, complaintId);

    // Record assignment history
    this.recordAssignment(complaintId, complaint.department_id, departmentId, complaint.assigned_officer_id, officerId, actor.id, notes || 'Assigned by Administrator');

    // Record status transition
    this.recordStatusChange(complaintId, complaint.state, newState, actor.id, actor.name, actor.role, notes || `Assigned to ${targetDept.name}`);

    // Notify Department In-Charge
    this.createNotification({
      role: 'DEPARTMENT_INCHARGE',
      departmentId,
      complaintId,
      title: `Assignment: ${complaint.complaint_id}`,
      message: `Assigned: "${complaint.title}" to ${targetDept.name}`,
      type: 'ASSIGNMENT'
    });

    eventBus.broadcast('OVOI_COMPLAINT_UPDATED', { id: complaintId, state: newState, department_id: departmentId });
    return this.getComplaintById(complaintId);
  }

  // ─────────────────────────────────────────────
  // LIFECYCLE STATE TRANSITIONS
  // ─────────────────────────────────────────────
  updateStatus({ complaintId, newState, actor, notes = '', expectedCompletionDate = null, resolutionNotes = '', resolutionEvidenceUrl = null }) {
    if (!VALID_STATUSES.includes(newState)) {
      throw new Error(`Invalid complaint status: ${newState}`);
    }

    const db = getDatabase();
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);
    if (!complaint) throw new Error('Complaint not found');

    // Strict Role-Based Transition Guards
    if (actor.role === 'DEPARTMENT_INCHARGE') {
      if (complaint.department_id !== actor.department_id) {
        throw new Error('Access denied: You cannot modify complaints assigned to other departments');
      }
      // Allowed in-charge transitions: ACCEPTED, IN_PROGRESS, AWAITING_INFORMATION, RESOLVED, ESCALATED
      const allowedIncharge = ['ACCEPTED', 'IN_PROGRESS', 'AWAITING_INFORMATION', 'RESOLVED', 'ESCALATED'];
      if (!allowedIncharge.includes(newState)) {
        throw new Error(`Department In-charges cannot transition complaint to ${newState}`);
      }
    } else if (actor.role === 'CITIZEN') {
      // Allowed citizen transitions: REOPENED (dispute), CLOSED (confirmation)
      if (newState !== 'REOPENED' && newState !== 'CLOSED') {
        throw new Error('Citizens can only confirm resolution (CLOSE) or dispute/reopen a complaint');
      }
    }

    const now = new Date().toISOString();
    let sqlUpdates = ['state = ?', 'updated_at = ?'];
    let updateParams = [newState, now];

    if (expectedCompletionDate) {
      sqlUpdates.push('expected_completion_date = ?');
      updateParams.push(expectedCompletionDate);
    }

    if (newState === 'RESOLVED') {
      sqlUpdates.push('resolved_at = ?', 'resolved_by = ?', 'resolution_notes = ?');
      updateParams.push(now, actor.name, resolutionNotes || notes);
      if (resolutionEvidenceUrl) {
        sqlUpdates.push('resolution_evidence_url = ?');
        updateParams.push(resolutionEvidenceUrl);
      }
    } else if (newState === 'REOPENED') {
      sqlUpdates.push('reopened_at = ?', 'dispute_reason = ?');
      updateParams.push(now, notes);
    } else if (newState === 'CLOSED') {
      sqlUpdates.push('closed_at = ?');
      updateParams.push(now);
    }

    updateParams.push(complaintId);
    db.prepare(`UPDATE complaints SET ${sqlUpdates.join(', ')} WHERE id = ?`).run(...updateParams);

    // Record audit trail
    this.recordStatusChange(complaintId, complaint.state, newState, actor.id, actor.name, actor.role, notes);

    // Notify parties
    if (newState === 'RESOLVED') {
      this.createNotification({
        role: 'ADMIN',
        complaintId,
        title: `Resolved: ${complaint.complaint_id}`,
        message: `${complaint.department_name} resolved complaint "${complaint.title.slice(0, 40)}"`,
        type: 'RESOLVED'
      });
      if (complaint.citizen_id) {
        this.createNotification({
          userId: complaint.citizen_id,
          complaintId,
          title: `Complaint Resolved: ${complaint.complaint_id}`,
          message: `Your grievance has been marked as resolved. Please review and provide feedback.`,
          type: 'RESOLVED'
        });
      }
    } else if (newState === 'REOPENED') {
      this.createNotification({
        role: 'ADMIN',
        complaintId,
        title: `Dispute/Reopened: ${complaint.complaint_id}`,
        message: `Citizen disputed resolution: "${notes.slice(0, 60)}"`,
        type: 'DISPUTE'
      });
    }

    eventBus.broadcast('OVOI_COMPLAINT_UPDATED', { id: complaintId, state: newState });
    return this.getComplaintById(complaintId);
  }

  // ─────────────────────────────────────────────
  // CITIZEN FEEDBACK & DISPUTES
  // ─────────────────────────────────────────────
  submitFeedback({ complaintId, citizenId, rating, feedback, dispute = false, disputeReason = '' }) {
    const db = getDatabase();
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ? OR complaint_id = ?').get(complaintId, complaintId);
    if (!complaint) throw new Error('Complaint not found');

    const now = new Date().toISOString();
    if (dispute) {
      db.prepare(`
        UPDATE complaints
        SET state = 'REOPENED', reopened_at = ?, dispute_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(now, disputeReason || feedback, now, complaint.id);

      this.recordStatusChange(complaint.id, complaint.state, 'REOPENED', citizenId || 'citizen', 'Citizen', 'CITIZEN', `Resolution disputed: ${disputeReason || feedback}`);
    } else {
      db.prepare(`
        UPDATE complaints
        SET citizen_rating = ?, citizen_feedback = ?, state = 'CLOSED', closed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(rating || 5, feedback || null, now, now, complaint.id);

      this.recordStatusChange(complaint.id, complaint.state, 'CLOSED', citizenId || 'citizen', 'Citizen', 'CITIZEN', `Feedback submitted (Rating: ${rating || 5}/5). Complaint closed.`);
    }

    return this.getComplaintById(complaint.id);
  }

  recordCitizenFeedback(complaintId, { isDisputed, disputeReason, rating, feedback, citizenId }) {
    return this.submitFeedback({
      complaintId,
      citizenId,
      rating,
      feedback,
      dispute: Boolean(isDisputed),
      disputeReason
    });
  }

  // ─────────────────────────────────────────────
  // AUDIT & NOTIFICATION HELPERS
  // ─────────────────────────────────────────────
  recordAssignment(complaintId, fromDeptId, toDeptId, fromOfficerId, toOfficerId, assignedBy, notes) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO complaint_assignment_history (id, complaint_id, from_department_id, to_department_id, from_officer_id, to_officer_id, assigned_by, assignment_notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`ah-${uuidv4()}`, complaintId, fromDeptId, toDeptId, fromOfficerId, toOfficerId, assignedBy, notes, new Date().toISOString());
  }

  recordStatusChange(complaintId, fromState, toState, actorId, actorName, actorRole, notes) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO complaint_status_history (id, complaint_id, from_state, to_state, actor_id, actor_name, actor_role, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`sh-${uuidv4()}`, complaintId, fromState, toState, actorId, actorName, actorRole, notes, new Date().toISOString());
  }

  createNotification({ userId = null, role = null, departmentId = null, complaintId, title, message, type }) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO complaint_notifications (id, user_id, role, department_id, complaint_id, title, message, type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(`notif-${uuidv4()}`, userId, role, departmentId, complaintId, title, message, type, new Date().toISOString());
  }

  getNotifications({ userId, role, departmentId }) {
    const db = getDatabase();
    let whereClauses = [];
    let params = [];

    if (userId) {
      whereClauses.push('(user_id = ? OR (role = ? AND (department_id = ? OR department_id IS NULL)))');
      params.push(userId, role, departmentId || 'none');
    } else if (role) {
      whereClauses.push('(role = ? AND (department_id = ? OR department_id IS NULL))');
      params.push(role, departmentId || 'none');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    return db.prepare(`SELECT * FROM complaint_notifications ${whereSql} ORDER BY created_at DESC LIMIT 50`).all(...params);
  }

  // ─────────────────────────────────────────────
  // COMPUTED ANALYTICS FROM DATABASE
  // ─────────────────────────────────────────────
  getStats(user = null) {
    const db = getDatabase();
    let scopeSql = '';
    let scopeParams = [];

    if (user && user.role === 'DEPARTMENT_INCHARGE') {
      scopeSql = 'WHERE department_id = ?';
      scopeParams = [user.department_id];
    } else if (user && user.role === 'CITIZEN') {
      scopeSql = 'WHERE (citizen_id = ? OR citizen_phone = ?)';
      scopeParams = [user.id, user.phone || 'none'];
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM complaints ${scopeSql}`).get(...scopeParams)?.count || 0;
    const unassigned = db.prepare(`SELECT COUNT(*) as count FROM complaints ${scopeSql ? scopeSql + ' AND' : 'WHERE'} state = 'UNASSIGNED'`).get(...scopeParams)?.count || 0;
    const assigned = db.prepare(`SELECT COUNT(*) as count FROM complaints ${scopeSql ? scopeSql + ' AND' : 'WHERE'} state IN ('ASSIGNED', 'ACCEPTED')`).get(...scopeParams)?.count || 0;
    const inProgress = db.prepare(`SELECT COUNT(*) as count FROM complaints ${scopeSql ? scopeSql + ' AND' : 'WHERE'} state IN ('IN_PROGRESS', 'AWAITING_INFORMATION')`).get(...scopeParams)?.count || 0;
    const resolved = db.prepare(`SELECT COUNT(*) as count FROM complaints ${scopeSql ? scopeSql + ' AND' : 'WHERE'} state IN ('RESOLVED', 'CLOSED')`).get(...scopeParams)?.count || 0;
    const critical = db.prepare(`SELECT COUNT(*) as count FROM complaints ${scopeSql ? scopeSql + ' AND' : 'WHERE'} priority = 'CRITICAL' AND state NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')`).get(...scopeParams)?.count || 0;
    const disputed = db.prepare(`SELECT COUNT(*) as count FROM complaints ${scopeSql ? scopeSql + ' AND' : 'WHERE'} state = 'REOPENED'`).get(...scopeParams)?.count || 0;
    const escalated = db.prepare(`SELECT COUNT(*) as count FROM complaints ${scopeSql ? scopeSql + ' AND' : 'WHERE'} state = 'ESCALATED'`).get(...scopeParams)?.count || 0;
    const overdue = db.prepare(`SELECT COUNT(*) as count FROM complaints ${scopeSql ? scopeSql + ' AND' : 'WHERE'} datetime('now') > datetime(sla_deadline) AND state NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')`).get(...scopeParams)?.count || 0;

    // By source
    const bySource = db.prepare(`SELECT source, COUNT(*) as count FROM complaints ${scopeSql} GROUP BY source`).all(...scopeParams);

    const byChannel = { VOICE: 0, MANUAL: 0, PHONE: 0 };
    for (const s of bySource) {
      if (s.source === 'VOICE') byChannel.VOICE = s.count;
      else if (s.source === 'PHONE' || s.source === 'EXOTEL') byChannel.PHONE += s.count;
      else byChannel.MANUAL += s.count;
    }

    // By department
    const byDept = db.prepare(`SELECT department_name, COUNT(*) as count FROM complaints ${scopeSql ? scopeSql + ' AND' : 'WHERE'} department_name IS NOT NULL GROUP BY department_name`).all(...scopeParams);

    return {
      total,
      unassigned,
      assigned,
      inProgress,
      resolved,
      critical,
      disputed,
      escalated,
      overdue,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      bySource,
      byChannel,
      byDepartment: byDept
    };
  }
}

export const ourVoiceService = new OurVoiceService();
