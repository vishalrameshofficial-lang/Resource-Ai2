import { Router } from 'express';
import { ourVoiceService } from '../services/ourVoiceService.js';
import { authenticate, optionalAuthenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// ─────────────────────────────────────────────
// 1. AUTHENTICATION & PROFILE
// ─────────────────────────────────────────────

// Login (Supports Admin, Department In-Charge, Citizen)
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const result = await ourVoiceService.login({ email, password });
    res.json({
      success: true,
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Register (for Citizens ONLY - Admin & In-Charge accounts must be provisioned by Main Admin)
router.post('/auth/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    if (role && role !== 'CITIZEN') {
      return res.status(403).json({
        success: false,
        error: 'Public registration is only available for citizens. Department In-Charge and Administrator accounts must be provisioned by the Main Admin.'
      });
    }

    const authResult = await ourVoiceService.registerCitizen({
      name,
      email,
      phone,
      password
    });

    res.status(201).json({
      success: true,
      message: 'Citizen registration successful',
      token: authResult.token,
      user: authResult.user
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Current User Profile
router.get('/auth/me', authenticate, async (req, res, next) => {
  try {
    const user = await ourVoiceService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
        phone: user.phone,
        status: user.status
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// 2. DEPARTMENTS & CONFIGURATION
// ─────────────────────────────────────────────

// Get all configurable departments & subcategories
router.get('/departments', async (req, res, next) => {
  try {
    const departments = ourVoiceService.getDepartments();
    res.json({ success: true, departments });
  } catch (err) {
    next(err);
  }
});

// Admin: Save/Update Department
router.post('/departments', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    const department = ourVoiceService.saveDepartment(req.body);
    res.json({ success: true, department });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get Officers
router.get('/officers', authenticate, async (req, res, next) => {
  try {
    const departmentId = req.query.department_id || (req.user.role === 'DEPARTMENT_INCHARGE' ? req.user.department_id : null);
    const officers = ourVoiceService.getOfficers(departmentId);
    res.json({ success: true, officers });
  } catch (err) {
    next(err);
  }
});

// Admin: Provision new Department In-Charge Officer
router.post('/officers', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    const { name, email, password, departmentId, phone } = req.body;
    const officer = ourVoiceService.createOfficerAccount({
      name,
      email,
      password,
      departmentId,
      phone
    });
    res.status(201).json({
      success: true,
      message: 'Department In-Charge account created successfully',
      officer
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// 3. ANALYTICS & STATS
// ─────────────────────────────────────────────

router.get('/stats', optionalAuthenticate, async (req, res, next) => {
  try {
    const stats = ourVoiceService.getStats(req.user || null);
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// 4. COMPLAINTS LIFECYCLE
// ─────────────────────────────────────────────

// Authenticated Citizen Complaints ("My Complaints")
router.get('/complaints/my', authenticate, async (req, res, next) => {
  try {
    const complaints = ourVoiceService.getMyComplaints(req.user);
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// List Complaints (Role-scoped RBAC automatically applied)
router.get('/complaints', optionalAuthenticate, async (req, res, next) => {
  try {
    const filters = {
      state: req.query.state,
      departmentId: req.query.department_id,
      priority: req.query.priority,
      source: req.query.source,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0
    };

    const result = ourVoiceService.getComplaints(filters, req.user || null);
    res.json({
      success: true,
      total: result.total,
      complaints: result.items,
      items: result.items,
      limit: result.limit,
      offset: result.offset
    });
  } catch (err) {
    next(err);
  }
});

// Public Track Complaint by Complaint ID (e.g., OVOI-2026-00001) or Citizen Phone
router.get('/complaints/track/:identifier', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const complaint = ourVoiceService.trackComplaint(identifier);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found. Please check your reference ID or phone number.' });
    }
    res.json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
});

// Get Single Complaint Detail
router.get('/complaints/:id', optionalAuthenticate, async (req, res, next) => {
  try {
    const complaint = ourVoiceService.getComplaintById(req.params.id, req.user || null);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(403).json({ success: false, error: err.message });
  }
});

// Citizen / Web Intake (Voice or Online Form)
router.post('/complaints', optionalAuthenticate, async (req, res, next) => {
  try {
    const complaint = await ourVoiceService.createComplaint({
      title: req.body.title,
      description: req.body.description,
      source: req.body.source || 'WEB',
      citizenId: req.user ? req.user.id : (req.body.citizen_id || null),
      citizenName: req.body.citizen_name || (req.user ? req.user.name : 'Citizen'),
      citizenPhone: req.body.citizen_phone || (req.user ? req.user.phone : null),
      citizenEmail: req.body.citizen_email || (req.user ? req.user.email : null),
      departmentId: req.body.department_id || null,
      subcategoryId: req.body.subcategory_id || null,
      priority: req.body.priority || 'MEDIUM',
      locationName: req.body.location_address || req.body.location_name || 'Unspecified',
      landmark: req.body.landmark || null,
      callSid: req.body.call_sid || null,
      recordingUrl: req.body.recording_url || null,
      transcript: req.body.transcript || null,
      attachments: req.body.attachments || []
    });

    res.status(201).json({
      success: true,
      message: 'Complaint successfully registered',
      complaint
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Assign / Reassign Department & Officer (Admin only)
router.patch('/complaints/:id/assign', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    const { departmentId, officerId, notes } = req.body;
    if (!departmentId) {
      return res.status(400).json({ success: false, error: 'departmentId is required' });
    }

    const updated = await ourVoiceService.assignComplaint({
      complaintId: req.params.id,
      departmentId,
      officerId: officerId || null,
      actor: req.user,
      notes: notes || ''
    });

    res.json({
      success: true,
      message: 'Complaint assigned successfully',
      complaint: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Status Transition (Officer or Admin)
router.patch('/complaints/:id/status', authenticate, async (req, res, next) => {
  try {
    const { targetState, notes, resolutionDetails, expectedCompletionDate, resolutionEvidenceUrl } = req.body;
    if (!targetState) {
      return res.status(400).json({ success: false, error: 'targetState is required' });
    }

    const updated = await ourVoiceService.updateStatus({
      complaintId: req.params.id,
      newState: targetState,
      actor: req.user,
      notes: notes || '',
      expectedCompletionDate: expectedCompletionDate || null,
      resolutionNotes: resolutionDetails || '',
      resolutionEvidenceUrl: resolutionEvidenceUrl || null
    });

    res.json({
      success: true,
      message: `Complaint transitioned to ${targetState}`,
      complaint: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Citizen Feedback / Dispute
router.post('/complaints/:id/feedback', optionalAuthenticate, async (req, res, next) => {
  try {
    const { isDisputed, disputeReason, rating, feedback } = req.body;
    const citizenId = req.user ? req.user.id : null;

    const updated = await ourVoiceService.submitFeedback({
      complaintId: req.params.id,
      citizenId,
      rating,
      feedback,
      dispute: Boolean(isDisputed),
      disputeReason
    });

    res.json({
      success: true,
      message: isDisputed ? 'Resolution disputed and complaint reopened' : 'Feedback submitted successfully',
      complaint: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Add Evidence / Notes to Complaint
router.post('/complaints/:id/evidence', authenticate, async (req, res, next) => {
  try {
    const { fileUrl, fileType, description, isBeforeResolution } = req.body;
    const evidence = ourVoiceService.addEvidence(req.params.id, {
      fileUrl,
      fileType,
      description,
      isBeforeResolution,
      uploadedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Evidence attachment recorded',
      evidence
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// 5. NOTIFICATIONS
// ─────────────────────────────────────────────
router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const notifications = ourVoiceService.getNotifications({
      userId: req.user.id,
      role: req.user.role,
      departmentId: req.user.department_id
    });
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
});

export default router;
