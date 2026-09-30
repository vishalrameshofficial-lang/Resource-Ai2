import { Router } from 'express';
import { educationService, EDUCATION_CATEGORIES, EDUCATION_STATUSES } from '../services/educationService.js';

const router = Router();

// Middleware to extract actor metadata from headers / auth if available
function getActor(req) {
  return {
    id: req.user?.id || req.headers['x-user-id'] || null,
    name: req.user?.name || req.headers['x-user-name'] || 'Government Officer',
    email: req.user?.email || req.headers['x-user-email'] || 'officer@education.gov.in',
    role: req.user?.role || req.headers['x-user-role'] || 'EDUCATION_OFFICER'
  };
}

/**
 * GET /api/education/stats
 * Real aggregated metrics from database records
 */
router.get('/stats', (req, res, next) => {
  try {
    const stats = educationService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/education/categories
 * Configurable categories taxonomy
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: EDUCATION_CATEGORIES,
      statuses: EDUCATION_STATUSES
    }
  });
});

/**
 * GET /api/education/requests
 * Filtered petitions list
 */
router.get('/requests', (req, res, next) => {
  try {
    const { district, taluk, category, priority, status, query, limit, offset } = req.query;
    const requests = educationService.getRequests({
      district,
      taluk,
      category,
      priority,
      status,
      query,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    const total = educationService.countRequests({ district, taluk, category, priority, status, query });

    res.json({
      success: true,
      data: requests,
      pagination: {
        total,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/education/requests/:id
 * Single request details with history, allocations, and documents
 */
router.get('/requests/:id', (req, res, next) => {
  try {
    const request = educationService.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Education request not found' });
    }
    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/education/requests
 * Create a new manual petition
 */
router.post('/requests', (req, res, next) => {
  try {
    const body = req.body;
    if (!body.institution_name || !body.institution_name.trim()) {
      return res.status(400).json({ success: false, error: 'Institution name is required' });
    }
    if (!body.district || !body.district.trim()) {
      return res.status(400).json({ success: false, error: 'District is required' });
    }
    if (!body.resource_category) {
      return res.status(400).json({ success: false, error: 'Resource category is required' });
    }
    if (!body.specific_resource || !body.specific_resource.trim()) {
      return res.status(400).json({ success: false, error: 'Specific resource description is required' });
    }
    if (!body.reason_justification || !body.reason_justification.trim()) {
      return res.status(400).json({ success: false, error: 'Reason/justification is required' });
    }
    if (!body.requested_by || !body.requested_by.trim()) {
      return res.status(400).json({ success: false, error: 'Requester name is required' });
    }

    const actor = getActor(req);
    const created = educationService.createRequest(body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/education/requests/:id/status
 * Transition petition status through authorized workflow
 */
router.patch('/requests/:id/status', (req, res, next) => {
  try {
    const { status, reason, comments } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Target status is required' });
    }

    const actor = getActor(req);
    const updated = educationService.updateStatus(req.params.id, status, {
      reason,
      comments,
      actorName: actor.name,
      actorRole: actor.role,
      userId: actor.id
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/education/requests/:id/allocate
 * Allocate real inventory against an approved request
 */
router.post('/requests/:id/allocate', (req, res, next) => {
  try {
    const { resourceId, allocatedQuantity, sourceLocation, destinationLocation, notes } = req.body;
    if (!allocatedQuantity || parseFloat(allocatedQuantity) <= 0) {
      return res.status(400).json({ success: false, error: 'Allocated quantity must be positive' });
    }

    const actor = getActor(req);
    const updated = educationService.allocateResource(req.params.id, {
      resourceId,
      allocatedQuantity,
      sourceLocation,
      destinationLocation,
      notes
    }, actor);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/education/allocations/:id/delivery
 * Update delivery status
 */
router.patch('/allocations/:id/delivery', (req, res, next) => {
  try {
    const { deliveryStatus, deliveryDate, notes } = req.body;
    if (!deliveryStatus) {
      return res.status(400).json({ success: false, error: 'Delivery status is required' });
    }

    const actor = getActor(req);
    const updated = educationService.updateAllocationDelivery(req.params.id, {
      deliveryStatus,
      deliveryDate,
      notes
    }, actor);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/education/institutions
 */
router.get('/institutions', (req, res, next) => {
  try {
    const { district, type, status } = req.query;
    const items = educationService.getInstitutions({ district, type, status });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/education/institutions
 */
router.post('/institutions', (req, res, next) => {
  try {
    const body = req.body;
    if (!body.name || !body.district || !body.type) {
      return res.status(400).json({ success: false, error: 'Name, district, and type are required' });
    }

    const actor = getActor(req);
    const created = educationService.createInstitution(body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/education/resources
 * Inventory items
 */
router.get('/resources', (req, res, next) => {
  try {
    const { category, district, institutionId } = req.query;
    const items = educationService.getResources({ category, district, institutionId });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/education/resources
 * Add inventory resource
 */
router.post('/resources', (req, res, next) => {
  try {
    const body = req.body;
    if (!body.name || !body.category || !body.district || body.total_quantity == null) {
      return res.status(400).json({ success: false, error: 'Name, category, district, and total_quantity are required' });
    }

    const actor = getActor(req);
    const created = educationService.createResource(body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

export default router;
