import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * NotificationService — Manages internal operational notifications triggered
 * strictly by verified lifecycle events.
 */
class NotificationService {
  /**
   * Create an event-driven notification.
   */
  notify({
    domain,
    title,
    message,
    severity = 'INFO',
    entityId = null,
    targetRole = null
  }) {
    try {
      const db = getDatabase();
      const id = `notif-${uuidv4().slice(0, 12)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO notifications (
          id, domain, title, message, severity, entity_id, target_role, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(id, domain.toUpperCase(), title, message, severity, entityId, targetRole, now);

      return id;
    } catch (err) {
      console.warn('[NotificationService] Failed to create notification:', err.message);
      return null;
    }
  }

  /**
   * Get unread notifications or all notifications.
   */
  getNotifications({ domain, unreadOnly = false, limit = 50 } = {}) {
    const db = getDatabase();
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];

    if (domain) {
      sql += ' AND domain = ?';
      params.push(domain.toUpperCase());
    }
    if (unreadOnly) {
      sql += ' AND is_read = 0';
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return db.prepare(sql).all(...params);
  }

  /** Mark notification as read */
  markAsRead(id) {
    const db = getDatabase();
    return db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  }

  /** Mark all as read */
  markAllAsRead(domain = null) {
    const db = getDatabase();
    if (domain) {
      return db.prepare('UPDATE notifications SET is_read = 1 WHERE domain = ?').run(domain.toUpperCase());
    }
    return db.prepare('UPDATE notifications SET is_read = 1').run();
  }
}

export const notificationService = new NotificationService();
