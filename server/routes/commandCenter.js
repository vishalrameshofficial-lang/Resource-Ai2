import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { educationService } from '../services/educationService.js';
import { healthService } from '../services/healthService.js';
import { conversationRegistry } from '../ai/conversationManager.js';
import { exotelService } from '../services/exotelService.js';

const router = Router();

/**
 * GET /api/command-center/stats
 * Cross-domain government command center metrics.
 * Strictly calculated from real database records.
 */
router.get('/stats', async (req, res, next) => {
  try {
    const db = getDatabase();

    // 1. Emergency Domain Metrics
    const emRow = db.prepare(`
      SELECT
        COUNT(*) as total_incidents,
        SUM(CASE WHEN status IN ('NEW', 'VERIFIED', 'FORWARDED_TO_GOVERNMENT', 'ACCEPTED', 'RESOURCE_ALLOCATED', 'DELIVERY_IN_PROGRESS') THEN 1 ELSE 0 END) as active_incidents,
        SUM(CASE WHEN urgency = 'CRITICAL' THEN 1 ELSE 0 END) as critical_incidents,
        SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) as pending_verification,
        SUM(CASE WHEN status IN ('RESOURCE_ALLOCATED', 'DELIVERY_IN_PROGRESS') THEN 1 ELSE 0 END) as assigned_incidents,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as resolved_incidents
      FROM emergency_requests
    `).get();

    const activeLiveCalls = conversationRegistry.getAllActiveSessions();
    const callsCountRow = db.prepare('SELECT COUNT(*) as c FROM call_sessions').get();

    // 2. Education Domain Metrics
    const eduStats = educationService.getStats();

    // 3. Health Domain Metrics
    const hltStats = healthService.getStats();

    // 4. System Subsystem Health
    const exotelStatus = exotelService.getStatus();
    const dbCheck = db.prepare('SELECT 1 as healthy').get();

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        emergency: {
          activeCalls: activeLiveCalls.length,
          totalCalls: callsCountRow?.c || 0,
          totalIncidents: emRow?.total_incidents || 0,
          activeIncidents: emRow?.active_incidents || 0,
          criticalIncidents: emRow?.critical_incidents || 0,
          pendingVerification: emRow?.pending_verification || 0,
          assigned: emRow?.assigned_incidents || 0,
          resolved: emRow?.resolved_incidents || 0
        },
        education: {
          totalRequests: eduStats.totalRequests,
          openRequests: eduStats.openRequests,
          underReview: eduStats.underReview,
          verified: eduStats.verified,
          approved: eduStats.approved,
          pendingAllocation: eduStats.pendingAllocation,
          allocated: eduStats.allocated,
          delivered: eduStats.delivered,
          closed: eduStats.closed,
          institutionsCount: eduStats.institutionsCount,
          inventoryCount: eduStats.inventoryCount,
          allocationsCount: eduStats.allocationsCount
        },
        health: {
          totalRequests: hltStats.totalRequests,
          openRequests: hltStats.openRequests,
          underReview: hltStats.underReview,
          verified: hltStats.verified,
          approved: hltStats.approved,
          pendingAllocation: hltStats.pendingAllocation,
          allocated: hltStats.allocated,
          delivered: hltStats.delivered,
          closed: hltStats.closed,
          facilitiesCount: hltStats.facilitiesCount,
          inventoryCount: hltStats.inventoryCount,
          allocationsCount: hltStats.allocationsCount
        },
        subsystems: {
          exotel: exotelStatus.configured ? 'CONFIGURED' : 'NOT_CONFIGURED',
          virtualNumber: exotelStatus.virtualNumber || 'None',
          voiceWebSocket: 'ACTIVE',
          database: dbCheck?.healthy === 1 ? 'ONLINE' : 'UNHEALTHY',
          sttProvider: process.env.STT_PROVIDER || 'local',
          aiProvider: process.env.AI_PROVIDER || 'ollama',
          ttsProvider: process.env.TTS_PROVIDER || 'local'
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
