import { Router } from 'express';
import { complaintDispatchService } from '../services/complaintDispatchService.js';
import { callService } from '../services/callService.js';
import { optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/complaint-dispatch
 * List all dispatched complaints with optional filters.
 */
router.get('/', optionalAuthenticate, (req, res, next) => {
  try {
    const filters = {
      department: req.query.department,
      priority: req.query.priority,
      status: req.query.status,
      acknowledged: req.query.acknowledged !== undefined
        ? req.query.acknowledged === 'true'
        : undefined
    };
    const dispatches = complaintDispatchService.getAllDispatches(filters);
    res.json({
      success: true,
      count: dispatches.length,
      data: dispatches
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/complaint-dispatch/stats
 * Dispatch statistics overview.
 */
router.get('/stats', (req, res, next) => {
  try {
    const stats = complaintDispatchService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/complaint-dispatch/registry
 * Department registry with all stations and contact info.
 */
router.get('/registry', (req, res, next) => {
  try {
    const registry = complaintDispatchService.getDepartmentRegistry();
    res.json({
      success: true,
      data: registry
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/complaint-dispatch/:id
 * Get a single dispatched complaint by ID or dispatch_id.
 */
router.get('/:id', optionalAuthenticate, (req, res, next) => {
  try {
    const dispatch = complaintDispatchService.getDispatchById(req.params.id);
    if (!dispatch) {
      return res.status(404).json({ success: false, error: 'Dispatch not found' });
    }
    res.json({
      success: true,
      data: dispatch
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/complaint-dispatch/call/:callId
 * Get all dispatches for a specific call.
 */
router.get('/call/:callId', optionalAuthenticate, (req, res, next) => {
  try {
    const dispatches = complaintDispatchService.getDispatchesByCallId(req.params.callId);
    res.json({
      success: true,
      count: dispatches.length,
      data: dispatches
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/complaint-dispatch/:id/acknowledge
 * Department acknowledges receipt of the complaint.
 */
router.post('/:id/acknowledge', optionalAuthenticate, (req, res, next) => {
  try {
    const updated = complaintDispatchService.acknowledgeDispatch(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Dispatch not found' });
    }
    res.json({
      success: true,
      message: `Complaint acknowledged by ${updated.department}`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/complaint-dispatch/:id/resolve
 * Mark a dispatched complaint as resolved.
 */
router.post('/:id/resolve', optionalAuthenticate, (req, res, next) => {
  try {
    const { resolutionNotes } = req.body || {};
    const updated = complaintDispatchService.resolveDispatch(req.params.id, resolutionNotes);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Dispatch not found' });
    }
    res.json({
      success: true,
      message: `Complaint resolved by ${updated.department}`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/complaint-dispatch/manual
 * Manually dispatch a complaint from an existing call record.
 */
router.post('/manual', optionalAuthenticate, async (req, res, next) => {
  try {
    const { callId } = req.body;
    if (!callId) {
      return res.status(400).json({ success: false, error: 'callId is required' });
    }

    const call = callService.getCallById(callId);
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    if (!call.department || call.department === 'Other / Unclassified') {
      // If no department, try to classify first
      if (!call.summary && (!call.transcript || call.transcript.length === 0)) {
        return res.status(400).json({
          success: false,
          error: 'Call has not been analyzed. Run AI analysis first via POST /api/calls/:id/analyze'
        });
      }
    }

    const result = complaintDispatchService.dispatchComplaint({
      callId: call.id,
      callSid: call.call_sid,
      requestId: call.request_id,
      callerPhone: call.caller_phone,
      department: call.department,
      priority: call.priority,
      location: call.location,
      affectedPeople: call.affected_people,
      summary: call.summary || call.ai_summary,
      query: call.query,
      requiredService: call.required_service,
      requiredResources: call.required_resources,
      transcript: call.transcript,
      language: call.language,
      confidence: call.classification_confidence
    });

    if (!result) {
      return res.status(500).json({ success: false, error: 'Failed to dispatch complaint' });
    }

    res.json({
      success: true,
      message: `Complaint dispatched to ${result.department} → ${result.stationName}`,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

export default router;
