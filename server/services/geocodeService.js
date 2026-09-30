import { getDatabase } from '../db/database.js';

/**
 * GeocodeService — Server-side geocoding via Google Geocoding API.
 *
 * - Caches results in a SQLite table (`geocode_cache`) so the same
 *   textual location is never geocoded twice.
 * - If GOOGLE_GEOCODING_API_KEY is not set, geocoding is silently skipped.
 * - All coordinates returned are {lat, lng} or null.
 */
class GeocodeService {
  constructor() {
    this._ensureTable();
  }

  /** Create the cache table if it doesn't exist */
  _ensureTable() {
    try {
      const db = getDatabase();
      db.exec(`
        CREATE TABLE IF NOT EXISTS geocode_cache (
          location_key TEXT PRIMARY KEY,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          formatted_address TEXT,
          created_at TEXT NOT NULL
        );
      `);
    } catch (err) {
      console.warn('[GeocodeService] Cache table init warning:', err.message);
    }
  }

  /** Normalize a location string into a consistent cache key */
  _cacheKey(location) {
    return (location || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /** Check the cache for a previously geocoded location */
  _getCached(location) {
    try {
      const db = getDatabase();
      const key = this._cacheKey(location);
      if (!key) return null;
      const row = db.prepare('SELECT latitude, longitude, formatted_address FROM geocode_cache WHERE location_key = ?').get(key);
      return row || null;
    } catch {
      return null;
    }
  }

  /** Store a geocode result in the cache */
  _setCache(location, lat, lng, formattedAddress) {
    try {
      const db = getDatabase();
      const key = this._cacheKey(location);
      if (!key) return;
      db.prepare(`
        INSERT OR REPLACE INTO geocode_cache (location_key, latitude, longitude, formatted_address, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(key, lat, lng, formattedAddress || '', new Date().toISOString());
    } catch (err) {
      console.warn('[GeocodeService] Cache write warning:', err.message);
    }
  }

  /**
   * Geocode a textual location string.
   * Returns { lat, lng, formatted_address } or null.
   */
  async geocode(location) {
    if (!location || typeof location !== 'string' || !location.trim()) return null;

    // 1. Check cache first
    const cached = this._getCached(location);
    if (cached) {
      return { lat: cached.latitude, lng: cached.longitude, formatted_address: cached.formatted_address };
    }

    // 2. Call Google Geocoding API
    const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
    if (!apiKey) {
      // No API key configured — cannot geocode
      return null;
    }

    try {
      const encodedAddress = encodeURIComponent(location.trim());
      // Bias results towards India for better accuracy
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&region=in&key=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[GeocodeService] Google API HTTP error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        const formattedAddress = result.formatted_address || '';

        // Cache it
        this._setCache(location, lat, lng, formattedAddress);

        console.log(`[GeocodeService] Geocoded "${location}" → (${lat}, ${lng})`);
        return { lat, lng, formatted_address: formattedAddress };
      }

      if (data.status === 'ZERO_RESULTS') {
        console.log(`[GeocodeService] No results for "${location}"`);
      } else if (data.status !== 'OK') {
        console.warn(`[GeocodeService] Google Geocoding API status: ${data.status} — ${data.error_message || ''}`);
      }

      return null;
    } catch (err) {
      console.warn(`[GeocodeService] Geocoding error for "${location}":`, err.message);
      return null;
    }
  }

  /**
   * Geocode an emergency request if it has a location but no coordinates.
   * Mutates the request record in the database with the resolved lat/lng.
   * Returns the coordinates or null.
   */
  async geocodeRequest(request) {
    if (!request) return null;

    // Already has coordinates
    if (typeof request.latitude === 'number' && typeof request.longitude === 'number'
        && request.latitude !== 0 && request.longitude !== 0) {
      return { lat: request.latitude, lng: request.longitude };
    }

    // Build a geocodable string from available location fields
    const locationParts = [request.location, request.landmark].filter(Boolean);
    const locationStr = locationParts.join(', ');

    if (!locationStr) return null;

    const result = await this.geocode(locationStr);
    if (!result) return null;

    // Persist the coordinates back to the database
    try {
      const db = getDatabase();
      db.prepare(`
        UPDATE emergency_requests SET latitude = ?, longitude = ?, updated_at = ?
        WHERE id = ? OR request_id = ?
      `).run(result.lat, result.lng, new Date().toISOString(), request.id, request.request_id);

      console.log(`[GeocodeService] Updated request ${request.request_id} with coords (${result.lat}, ${result.lng})`);
    } catch (err) {
      console.warn(`[GeocodeService] DB update error for ${request.request_id}:`, err.message);
    }

    return result;
  }
}

export const geocodeService = new GeocodeService();
