import { Router } from 'express';
import { auditService } from '../services/auditService.js';

const router = Router();

/**
 * GET /api/audit-logs
 * Filtered audit trail
 */
router.get('/', (req, res, next) => {
  try {
    const { domain, entity, entityId, action, limit, offset } = req.query;
    const logs = auditService.getLogs({
      domain,
      entity,
      entityId,
      action,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    const total = auditService.countLogs({ domain, entity, entityId, action });

    res.json({
      success: true,
      data: logs,
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

export default router;
