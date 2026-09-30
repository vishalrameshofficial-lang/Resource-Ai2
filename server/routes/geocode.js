import { Router } from 'express';
import { requestService } from '../services/requestService.js';
import { geocodeService } from '../services/geocodeService.js';

const router = Router();

/**
 * GET /api/geocode/status
 * Check if geocoding is configured and cache status.
 */
router.get('/status', (req, res) => {
  const apiKeyConfigured = Boolean(process.env.GOOGLE_GEOCODING_API_KEY);
  res.json({
    success: true,
    data: {
      configured: apiKeyConfigured,
      service: 'Google Geocoding API'
    }
  });
});

/**
 * POST /api/geocode/request/:id
 * Geocode a single emergency request that is missing coordinates.
 * Returns the resolved coordinates or a message indicating failure.
 */
router.post('/request/:id', async (req, res, next) => {
  try {
    const request = requestService.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    const result = await geocodeService.geocodeRequest(request);

    if (result) {
      // Re-fetch the updated request
      const updated = requestService.getRequestById(req.params.id);
      res.json({
        success: true,
        data: {
          latitude: result.lat,
          longitude: result.lng,
          request: updated
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Could not geocode location',
        data: { location: request.location, landmark: request.landmark }
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/geocode/batch
 * Geocode all emergency requests that are missing coordinates.
 * Useful for backfilling existing records.
 */
router.post('/batch', async (req, res, next) => {
  try {
    const allRequests = requestService.getAllRequests();
    const unmapped = allRequests.filter(
      r => (r.latitude == null || r.longitude == null) && r.location
    );

    let geocoded = 0;
    let failed = 0;

    for (const request of unmapped) {
      const result = await geocodeService.geocodeRequest(request);
      if (result) {
        geocoded++;
      } else {
        failed++;
      }
      // Small delay to respect API rate limits
      if (unmapped.length > 5) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    res.json({
      success: true,
      data: {
        total: unmapped.length,
        geocoded,
        failed
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
