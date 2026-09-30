import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * AuditService — Government-grade immutable audit logging for all operations
 * across Emergency, Education, Health, and System domains.
 */
class AuditService {
  /**
   * Log an audit event.
   *
   * @param {Object} entry
   * @param {string} [entry.userId]
   * @param {string} [entry.userEmail]
   * @param {string} [entry.userName]
   * @param {string} [entry.role]
   * @param {'EMERGENCY'|'EDUCATION'|'HEALTH'|'SYSTEM'} entry.domain
   * @param {string} entry.action
   * @param {string} entry.entity
   * @param {string} entry.entityId
   * @param {any} [entry.previousValue]
   * @param {any} [entry.newValue]
   * @param {string} [entry.ipAddress]
   * @param {string} [entry.reason]
   */
  log({
    userId = null,
    userEmail = null,
    userName = 'System',
    role = 'SYSTEM',
    domain = 'SYSTEM',
    action = 'AUDIT_LOG',
    entity = null,
    entityId = null,
    previousValue = null,
    newValue = null,
    ipAddress = null,
    reason = null
  }) {
    try {
      const db = getDatabase();
      const id = `aud-${uuidv4().slice(0, 12)}`;
      const now = new Date().toISOString();

      const prevStr = previousValue != null
        ? (typeof previousValue === 'string' ? previousValue : JSON.stringify(previousValue))
        : null;

      const newStr = newValue != null
        ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue))
        : null;

      db.prepare(`
        INSERT INTO audit_logs (
          id, user_id, user_email, user_name, role, domain, action,
          entity, entity_id, previous_value, new_value, ip_address, reason, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        id ?? null,
        userId ?? null,
        userEmail ?? null,
        userName ?? 'System',
        role ?? 'SYSTEM',
        domain ?? 'SYSTEM',
        action ?? 'ACTION',
        entity ?? null,
        entityId ?? null,
        prevStr ?? null,
        newStr ?? null,
        ipAddress ?? null,
        reason ?? null,
        now
      );

      return id;
    } catch (err) {
      console.warn('[AuditService] Failed to record audit log:', err.message);
      return null;
    }
  }

  /**
   * Query audit logs with pagination and filters.
   */
  getLogs({ domain, entity, entityId, action, limit = 50, offset = 0 } = {}) {
    const db = getDatabase();
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (domain) {
      sql += ' AND domain = ?';
      params.push(domain.toUpperCase());
    }
    if (entity) {
      sql += ' AND entity = ?';
      params.push(entity);
    }
    if (entityId) {
      sql += ' AND entity_id = ?';
      params.push(entityId);
    }
    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Math.min(limit, 200), Math.max(offset, 0));

    return db.prepare(sql).all(...params);
  }

  /** Count total matching audit logs */
  countLogs({ domain, entity, entityId, action } = {}) {
    const db = getDatabase();
    let sql = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
    const params = [];

    if (domain) {
      sql += ' AND domain = ?';
      params.push(domain.toUpperCase());
    }
    if (entity) {
      sql += ' AND entity = ?';
      params.push(entity);
    }
    if (entityId) {
      sql += ' AND entity_id = ?';
      params.push(entityId);
    }
    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }

    const row = db.prepare(sql).get(...params);
    return row?.count || 0;
  }
}

export const auditService = new AuditService();
