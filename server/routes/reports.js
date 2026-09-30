import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { educationService } from '../services/educationService.js';
import { healthService } from '../services/healthService.js';
import { auditService } from '../services/auditService.js';

const router = Router();

function convertToCsv(items, fields) {
  if (!items || items.length === 0) return fields.join(',') + '\n';
  const header = fields.join(',');
  const rows = items.map(item => {
    return fields.map(f => {
      const val = item[f] != null ? String(item[f]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });
  return [header, ...rows].join('\n');
}

/**
 * GET /api/reports/export
 * Export real data in CSV or JSON format
 */
router.get('/export', (req, res, next) => {
  try {
    const { domain = 'emergency', format = 'csv' } = req.query;
    const db = getDatabase();

    auditService.log({
      userName: req.user?.name || 'Officer',
      role: req.user?.role || 'AUDITOR',
      domain: domain.toUpperCase(),
      action: 'REPORT_GENERATED',
      entity: `${domain}_reports`,
      entityId: `REP-${Date.now()}`,
      newValue: { domain, format }
    });

    if (domain.toLowerCase() === 'education') {
      const rows = educationService.getRequests({ limit: 1000 });
      if (format === 'json') {
        return res.json({ success: true, count: rows.length, data: rows });
      }
      const fields = ['request_id', 'institution_name', 'district', 'resource_category', 'specific_resource', 'requested_quantity', 'unit', 'priority', 'status', 'created_at'];
      const csv = convertToCsv(rows, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="education_requests_${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(csv);
    }

    if (domain.toLowerCase() === 'health') {
      const rows = healthService.getRequests({ limit: 1000 });
      if (format === 'json') {
        return res.json({ success: true, count: rows.length, data: rows });
      }
      const fields = ['request_id', 'facility_name', 'district', 'resource_category', 'specific_resource', 'requested_quantity', 'unit', 'priority', 'status', 'created_at'];
      const csv = convertToCsv(rows, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="health_requests_${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(csv);
    }

    // Default: Emergency
    const rows = db.prepare('SELECT * FROM emergency_requests ORDER BY created_at DESC LIMIT 1000').all();
    if (format === 'json') {
      return res.json({ success: true, count: rows.length, data: rows });
    }
    const fields = ['request_id', 'caller_name', 'caller_phone', 'caller_language', 'emergency_category', 'location', 'affected_people_count', 'urgency', 'status', 'created_at'];
    const csv = convertToCsv(rows, fields);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="emergency_incidents_${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
