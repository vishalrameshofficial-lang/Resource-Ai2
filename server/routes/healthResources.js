import { Router } from 'express';
import { healthService, HEALTH_CATEGORIES, HEALTH_STATUSES } from '../services/healthService.js';

const router = Router();

function getActor(req) {
  return {
    id: req.user?.id || req.headers['x-user-id'] || null,
    name: req.user?.name || req.headers['x-user-name'] || 'Government Health Officer',
    email: req.user?.email || req.headers['x-user-email'] || 'officer@health.gov.in',
    role: req.user?.role || req.headers['x-user-role'] || 'HEALTH_OFFICER'
  };
}

/**
 * GET /api/health-resources/stats
 */
router.get('/stats', (req, res, next) => {
  try {
    const stats = healthService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/health-resources/categories
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: HEALTH_CATEGORIES,
      statuses: HEALTH_STATUSES
    }
  });
});

/**
 * GET /api/health-resources/requests
 */
router.get('/requests', (req, res, next) => {
  try {
    const { district, taluk, category, priority, status, query, limit, offset } = req.query;
    const requests = healthService.getRequests({
      district,
      taluk,
      category,
      priority,
      status,
      query,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    const total = healthService.countRequests({ district, taluk, category, priority, status, query });

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
 * GET /api/health-resources/requests/:id
 */
router.get('/requests/:id', (req, res, next) => {
  try {
    const request = healthService.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Health resource request not found' });
    }
    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/health-resources/requests
 */
router.post('/requests', (req, res, next) => {
  try {
    const body = req.body;
    if (!body.facility_name || !body.facility_name.trim()) {
      return res.status(400).json({ success: false, error: 'Hospital/Facility name is required' });
    }
    if (!body.district || !body.district.trim()) {
      return res.status(400).json({ success: false, error: 'District is required' });
    }
    if (!body.resource_category) {
      return res.status(400).json({ success: false, error: 'Resource category is required' });
    }
    if (!body.specific_resource || !body.specific_resource.trim()) {
      return res.status(400).json({ success: false, error: 'Specific medicine/resource is required' });
    }
    if (!body.reason_justification || !body.reason_justification.trim()) {
      return res.status(400).json({ success: false, error: 'Reason/justification is required' });
    }
    if (!body.requested_by || !body.requested_by.trim()) {
      return res.status(400).json({ success: false, error: 'Requester name is required' });
    }

    const actor = getActor(req);
    const created = healthService.createRequest(body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/health-resources/requests/:id/status
 */
router.patch('/requests/:id/status', (req, res, next) => {
  try {
    const { status, reason, comments } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Target status is required' });
    }

    const actor = getActor(req);
    const updated = healthService.updateStatus(req.params.id, status, {
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
 * POST /api/health-resources/requests/:id/allocate
 */
router.post('/requests/:id/allocate', (req, res, next) => {
  try {
    const { resourceId, allocatedQuantity, sourceFacilityId, sourceFacilityName, notes } = req.body;
    if (!allocatedQuantity || parseFloat(allocatedQuantity) <= 0) {
      return res.status(400).json({ success: false, error: 'Allocated quantity must be positive' });
    }

    const actor = getActor(req);
    const updated = healthService.allocateResource(req.params.id, {
      resourceId,
      allocatedQuantity,
      sourceFacilityId,
      sourceFacilityName,
      notes
    }, actor);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/health-resources/allocations/:id/delivery
 */
router.patch('/allocations/:id/delivery', (req, res, next) => {
  try {
    const { deliveryStatus, deliveryDate, notes } = req.body;
    if (!deliveryStatus) {
      return res.status(400).json({ success: false, error: 'Delivery status is required' });
    }

    const actor = getActor(req);
    const updated = healthService.updateAllocationDelivery(req.params.id, {
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
 * GET /api/health-resources/facilities
 */
router.get('/facilities', (req, res, next) => {
  try {
    const { district, type, status } = req.query;
    const items = healthService.getFacilities({ district, type, status });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/health-resources/facilities
 */
router.post('/facilities', (req, res, next) => {
  try {
    const body = req.body;
    if (!body.name || !body.district) {
      return res.status(400).json({ success: false, error: 'Name and district are required' });
    }

    const actor = getActor(req);
    const created = healthService.createFacility(body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/health-resources/resources
 */
router.get('/resources', (req, res, next) => {
  try {
    const { category, district, facilityId } = req.query;
    const items = healthService.getResources({ category, district, facilityId });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/health-resources/resources
 */
router.post('/resources', (req, res, next) => {
  try {
    const body = req.body;
    if (!body.name || !body.category || !body.district || body.total_quantity == null) {
      return res.status(400).json({ success: false, error: 'Name, category, district, and total_quantity are required' });
    }

    const actor = getActor(req);
    const created = healthService.createResource(body, actor);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

export default router;
