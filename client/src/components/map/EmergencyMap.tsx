import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmergencyRequest } from '../../types/emergency';
import { api } from '../../lib/api';

/* ─────────────────────────────────────────────
 * Types & Constants
 * ───────────────────────────────────────────── */
interface EmergencyMapProps {
  requests: EmergencyRequest[];
  onSelectRequest: (request: EmergencyRequest) => void;
  /** If true, renders full operations layout (toolbar, stats, layer switcher). Default = false (mini preview). */
  fullView?: boolean;
}

type FilterMode = 'all' | 'active' | 'critical' | 'high' | 'medium' | 'low';
type MapLayerStyle = 'google_road' | 'dark_ops' | 'satellite';

const URGENCY_CONFIG: Record<string, { color: string; label: string; glow: string }> = {
  CRITICAL: { color: '#ef4444', label: 'Critical', glow: 'rgba(239, 68, 68, 0.45)' },
  HIGH:     { color: '#f97316', label: 'High',     glow: 'rgba(249, 115, 22, 0.45)' },
  MEDIUM:   { color: '#eab308', label: 'Medium',   glow: 'rgba(234, 179, 8, 0.45)' },
  LOW:      { color: '#10b981', label: 'Low',      glow: 'rgba(16, 185, 129, 0.45)' },
};

const CATEGORY_ICONS: Record<string, string> = {
  flood:              '🌊',
  fire:               '🔥',
  medical:            '🏥',
  earthquake:         '🌍',
  cyclone:            '🌀',
  landslide:          '⛰️',
  building_collapse:  '🏚️',
  drowning:           '🆘',
  other:              '⚠️',
};

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  NEW:                     { label: 'New',                 bg: 'bg-blue-500/20',    text: 'text-blue-300' },
  VERIFIED:                { label: 'Verified',            bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  FORWARDED_TO_GOVERNMENT: { label: 'Govt Forwarded',      bg: 'bg-violet-500/20',  text: 'text-violet-300' },
  ACCEPTED:                { label: 'Accepted',            bg: 'bg-cyan-500/20',    text: 'text-cyan-300' },
  RESOURCE_ALLOCATED:      { label: 'Allocated',           bg: 'bg-amber-500/20',   text: 'text-amber-300' },
  DELIVERY_IN_PROGRESS:    { label: 'In Transit',          bg: 'bg-orange-500/20',  text: 'text-orange-300' },
  DELIVERED:               { label: 'Delivered',           bg: 'bg-green-500/20',   text: 'text-green-300' },
  REJECTED:                { label: 'Rejected',            bg: 'bg-red-500/20',     text: 'text-red-300' },
  CANCELLED:               { label: 'Cancelled',           bg: 'bg-slate-500/20',   text: 'text-slate-300' },
};

const ACTIVE_STATUSES = new Set(['NEW', 'VERIFIED', 'FORWARDED_TO_GOVERNMENT', 'ACCEPTED', 'RESOURCE_ALLOCATED', 'DELIVERY_IN_PROGRESS']);

/* ─────────────────────────────────────────────
 * Tile Providers (High quality, zero API key needed)
 * ───────────────────────────────────────────── */
const TILE_LAYERS: Record<MapLayerStyle, { url: string; maxZoom: number }> = {
  // Google Maps format clean road view (Esri World Street Map - crisp roads, landmarks, 100% watermark-free)
  google_road: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19
  },
  // Sleek Dark Operations Center style (Esri Dark Gray Canvas - 100% watermark-free)
  dark_ops: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 16
  },
  // Real High-Resolution Satellite imagery (Esri World Imagery - 100% watermark-free)
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19
  }
};

/* ─────────────────────────────────────────────
 * Custom Google-Style Marker Pin Generator
 * ───────────────────────────────────────────── */
function createGooglePinIcon(urgency: string, category: string): L.DivIcon {
  const conf = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.MEDIUM;
  const emoji = CATEGORY_ICONS[category] || '⚠️';

  const html = `
    <div class="google-pin-wrapper" style="position: relative; width: 38px; height: 48px; transform: translate(-50%, -100%); cursor: pointer;">
      <!-- Glowing pulse ring for critical/high -->
      ${urgency === 'CRITICAL' ? `<div style="position: absolute; left: 7px; top: 7px; width: 24px; height: 24px; border-radius: 50%; background: ${conf.color}; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
      
      <!-- Pin SVG Shape (Google Maps style teardrop) -->
      <svg width="38" height="48" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px ${conf.glow});">
        <!-- Pin Body -->
        <path d="M19 0C8.50659 0 0 8.50659 0 19C0 31.5 19 48 19 48C19 48 38 31.5 38 19C38 8.50659 29.4934 0 19 0Z" fill="${conf.color}"/>
        <path d="M19 1.5C9.33502 1.5 1.5 9.33502 1.5 19C1.5 25.5 8 35.5 19 45.5C30 35.5 36.5 25.5 36.5 19C36.5 9.33502 28.665 1.5 19 1.5Z" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
        <!-- Inner White Disc -->
        <circle cx="19" cy="19" r="13" fill="#ffffff"/>
      </svg>

      <!-- Center Emoji Icon -->
      <div style="position: absolute; top: 8px; left: 8px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 14px; user-select: none;">
        ${emoji}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-google-marker',
    html,
    iconSize: [38, 48],
    iconAnchor: [19, 48],
    popupAnchor: [0, -48]
  });
}

/* ─────────────────────────────────────────────
 * Google Maps-Style Rich Popup Builder
 * ───────────────────────────────────────────── */
function buildPopupHtml(req: EmergencyRequest): string {
  const urgencyConf = URGENCY_CONFIG[req.urgency] || URGENCY_CONFIG.MEDIUM;
  const emoji = CATEGORY_ICONS[req.emergency_category] || '⚠️';
  const statusConf = STATUS_LABELS[req.status] || { label: req.status, bg: 'bg-slate-500/20', text: 'text-slate-300' };
  const resources = Array.isArray(req.resources_needed)
    ? req.resources_needed.map(r => typeof r === 'string' ? r : r.item).join(', ')
    : '';
  const createdTime = new Date(req.created_at).toLocaleString();

  return `
    <div style="font-family: 'Inter', system-ui, sans-serif; min-width: 270px; max-width: 320px; color: #f8fafc; padding: 0;">
      <!-- Card Header -->
      <div style="background: linear-gradient(135deg, ${urgencyConf.color}25, #0f172a 90%); border-bottom: 2px solid ${urgencyConf.color}66; padding: 12px 14px; border-radius: 8px 8px 0 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 22px; line-height: 1;">${emoji}</span>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 14px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; text-transform: uppercase;">${req.request_id}</div>
            <div style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: capitalize;">${req.emergency_category.replace('_', ' ')} Incident</div>
          </div>
          <span style="font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 9999px; background: ${urgencyConf.color}33; color: ${urgencyConf.color}; border: 1px solid ${urgencyConf.color}66; text-transform: uppercase;">
            ${req.urgency}
          </span>
        </div>
      </div>

      <!-- Card Body -->
      <div style="padding: 12px 14px; background: #0f172a; font-size: 12px; border-radius: 0 0 8px 8px;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Location -->
          <div style="display: flex; gap: 6px; align-items: flex-start;">
            <span style="color: #38bdf8; font-size: 13px;">📍</span>
            <span style="color: #e2e8f0; font-weight: 500; word-break: break-word;">${req.location || 'Unknown Location'}</span>
          </div>

          <!-- Affected People -->
          ${req.affected_people_count ? `
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="color: #fbbf24; font-size: 13px;">👥</span>
              <span style="color: #cbd5e1;"><strong style="color: #f1f5f9;">${req.affected_people_count}</strong> people affected</span>
            </div>
          ` : ''}

          <!-- Resources -->
          ${resources ? `
            <div style="display: flex; gap: 6px; align-items: flex-start;">
              <span style="color: #34d399; font-size: 13px;">📦</span>
              <span style="color: #cbd5e1;"><strong style="color: #f1f5f9;">Needs:</strong> ${resources}</span>
            </div>
          ` : ''}

          <!-- Status & Time -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 10px; color: #64748b;">
            <span style="padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.06); color: #94a3b8; font-weight: 600;">${statusConf.label}</span>
            <span>${createdTime}</span>
          </div>
        </div>

        <!-- Action Button -->
        <button 
          id="btn-dispatch-${req.request_id}" 
          style="margin-top: 12px; width: 100%; padding: 8px 12px; border-radius: 6px; background: #2563eb; color: #ffffff; border: none; font-size: 11px; font-weight: 700; cursor: pointer; text-align: center; transition: background 0.15s;"
          onmouseover="this.style.background='#1d4ed8'"
          onmouseout="this.style.background='#2563eb'"
        >
          🚨 Open Full Dispatch Details &rarr;
        </button>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────
 * EmergencyMap Component
 * ───────────────────────────────────────────── */
export function EmergencyMap({ requests, onSelectRequest, fullView = false }: EmergencyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // States
  const [activeLayer, setActiveLayer] = useState<MapLayerStyle>('google_road');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Filter requests
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    if (filterMode === 'active') result = result.filter(r => ACTIVE_STATUSES.has(r.status));
    else if (filterMode === 'critical') result = result.filter(r => r.urgency === 'CRITICAL');
    else if (filterMode === 'high') result = result.filter(r => r.urgency === 'HIGH');
    else if (filterMode === 'medium') result = result.filter(r => r.urgency === 'MEDIUM');
    else if (filterMode === 'low') result = result.filter(r => r.urgency === 'LOW');

    if (categoryFilter !== 'ALL') {
      result = result.filter(r => r.emergency_category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.request_id?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.emergency_category?.toLowerCase().includes(q) ||
        r.created_from_call_id?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [requests, filterMode, categoryFilter, searchQuery]);

  // Valid coordinate requests
  const validRequests = useMemo(
    () => filteredRequests.filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number' && r.latitude !== 0 && r.longitude !== 0),
    [filteredRequests]
  );

  const unmappedCount = useMemo(
    () => requests.filter(r => r.latitude == null || r.longitude == null || (r.latitude === 0 && r.longitude === 0)).length,
    [requests]
  );

  const stats = useMemo(() => ({
    total: requests.length,
    active: requests.filter(r => ACTIVE_STATUSES.has(r.status)).length,
    critical: requests.filter(r => r.urgency === 'CRITICAL').length,
    high: requests.filter(r => r.urgency === 'HIGH').length,
    mapped: requests.filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number' && r.latitude !== 0 && r.longitude !== 0).length,
    unmapped: unmappedCount,
  }), [requests, unmappedCount]);

  const categories = useMemo(() => {
    const cats = new Set(requests.map(r => r.emergency_category));
    return Array.from(cats).sort();
  }, [requests]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center (India center if no requests, or first incident)
    const initialCenter: [number, number] = [20.5937, 78.9629];
    const initialZoom = 5;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Clean zoom control on bottom-right (Google Maps style)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layer (Google road look)
    const layerConf = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(layerConf.url, {
      maxZoom: layerConf.maxZoom,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    tileLayerRef.current = tileLayer;
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Fix initial container size rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update Tile Layer when layer style changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const layerConf = TILE_LAYERS[activeLayer];

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(layerConf.url, {
      maxZoom: layerConf.maxZoom,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [activeLayer]);

  // Fit bounds helper
  const fitAllIncidents = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || validRequests.length === 0) return;

    const bounds = L.latLngBounds(validRequests.map(r => [r.latitude!, r.longitude!]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
  }, [validRequests]);

  // Render Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (validRequests.length === 0) return;

    validRequests.forEach(req => {
      const icon = createGooglePinIcon(req.urgency, req.emergency_category);
      const marker = L.marker([req.latitude!, req.longitude!], { icon });

      const popupContent = buildPopupHtml(req);
      marker.bindPopup(popupContent, {
        maxWidth: 320,
        className: 'google-style-popup',
        closeButton: true,
      });

      // Handle popup open to wire click listener
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-dispatch-${req.request_id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectRequest(req);
          };
        }
      });

      markersLayer.addLayer(marker);
    });

    // Auto-fit on first load or changes
    fitAllIncidents();
  }, [validRequests, onSelectRequest, fitAllIncidents]);

  // Batch Geocode handler
  const handleGeocodeUnmapped = async () => {
    setIsGeocoding(true);
    try {
      await api.geocodeBatch();
    } catch (err) {
      console.warn('Batch geocode error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  /* ─────────────────────────────────────────────
   * Mini Preview Mode (Dashboard Widget)
   * ───────────────────────────────────────────── */
  if (!fullView) {
    return (
      <div className="relative w-full h-full min-h-[220px] rounded-2xl overflow-hidden border border-slate-800 glass-panel shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full min-h-[220px]" />

        {/* Compact Legend & Stats */}
        <div className="absolute top-3 right-3 z-[1000] p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-[10px] shadow-xl space-y-1.5 pointer-events-auto">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[9px]">Live Incidents</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
              {validRequests.length} plotted
            </span>
          </div>
          <div className="flex items-center gap-3 pt-1 border-t border-slate-800">
            {Object.entries(URGENCY_CONFIG).map(([level, conf]) => (
              <div key={level} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: conf.color }} />
                <span className="text-slate-300 font-medium capitalize">{level[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recenter Button */}
        {validRequests.length > 0 && (
          <button
            onClick={fitAllIncidents}
            className="absolute bottom-3 left-3 z-[1000] px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-slate-200 text-xs font-semibold shadow-lg transition-all flex items-center gap-1.5"
            title="Recenter Map"
          >
            <span>🎯</span> Fit Incidents
          </button>
        )}
      </div>
    );
  }

  /* ─────────────────────────────────────────────
   * Full Operations Center View
   * ───────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full space-y-3">
      {/* ── Top Incident Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatsCard label="Total Requests" value={stats.total} color="#3b82f6" icon="📋" />
        <StatsCard label="Active Incidents" value={stats.active} color="#06b6d4" icon="⚡" />
        <StatsCard label="Critical" value={stats.critical} color="#ef4444" icon="🚨" />
        <StatsCard label="High Urgency" value={stats.high} color="#f97316" icon="🔥" />
        <StatsCard label="Geo-Tagged" value={stats.mapped} color="#10b981" icon="📍" subtitle={`${stats.unmapped} unmapped`} />
      </div>

      {/* ── Toolbar: Filters, Search, Layer Switcher ── */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800">
        {/* Urgency Filter Pills */}
        <div className="flex items-center space-x-1 bg-slate-800/60 p-1 rounded-lg border border-slate-700/50">
          {(['all', 'active', 'critical', 'high', 'medium', 'low'] as FilterMode[]).map((mode) => {
            const isActive = filterMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>

        {/* Category Dropdown */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter incidents by category"
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-800/80 text-slate-200 border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_ICONS[cat] || '⚠️'} {cat.replace('_', ' ')}</option>
          ))}
        </select>

        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-sm relative">
          <input
            type="text"
            placeholder="Search location, ID, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 pl-8 rounded-lg text-xs bg-slate-800/60 text-slate-200 border border-slate-700/50 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
        </div>

        {/* Layer Style Switcher (Google Format / Dark Ops / Satellite) */}
        <div className="flex items-center bg-slate-800/60 p-0.5 rounded-lg border border-slate-700/50 ml-auto">
          <button
            onClick={() => setActiveLayer('google_road')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeLayer === 'google_road'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Google Maps Standard Road Style"
          >
            <span>🗺️</span> Road
          </button>
          <button
            onClick={() => setActiveLayer('dark_ops')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeLayer === 'dark_ops'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Dark Operations Mode"
          >
            <span>🌙</span> Dark
          </button>
          <button
            onClick={() => setActiveLayer('satellite')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeLayer === 'satellite'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Real Satellite Imagery"
          >
            <span>🛰️</span> Satellite
          </button>
        </div>

        {/* Fit All Button */}
        <button
          onClick={fitAllIncidents}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
          title="Fit map to all incidents"
        >
          <span>🎯</span> Fit All
        </button>

        {/* Batch Geocode if unmapped */}
        {unmappedCount > 0 && (
          <button
            onClick={handleGeocodeUnmapped}
            disabled={isGeocoding}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 transition-all disabled:opacity-50"
            title="Geocode unmapped records via backend"
          >
            {isGeocoding ? 'Resolving…' : `🌐 Geocode (${unmappedCount})`}
          </button>
        )}
      </div>

      {/* ── Main Map Canvas ── */}
      <div className="flex-1 relative min-h-[520px] rounded-2xl overflow-hidden border border-slate-800 glass-panel shadow-2xl">
        <div ref={mapContainerRef} className="w-full h-full min-h-[520px]" />

        {/* Floating Urgency Legend on Map */}
        <div className="absolute top-4 right-4 z-[1000] p-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-xs shadow-2xl space-y-2 pointer-events-auto">
          <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center justify-between gap-4">
            <span>Incident Priority</span>
            <span className="text-[9px] text-slate-400 font-mono">LIVE</span>
          </div>
          {Object.entries(URGENCY_CONFIG).map(([level, conf]) => (
            <div key={level} className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: conf.color }} />
              <span className="text-slate-300 font-medium">
                {conf.label} ({filteredRequests.filter(r => r.urgency === level).length})
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Plotted:</span>
            <span className="font-bold text-emerald-400">{validRequests.length} / {requests.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Stats Card Component
 * ───────────────────────────────────────────── */
function StatsCard({ label, value, color, icon, subtitle }: { label: string; value: number; color: string; icon: string; subtitle?: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm transition-all hover:scale-[1.02]"
      style={{
        background: `linear-gradient(135deg, ${color}12, ${color}05)`,
        borderColor: `${color}33`,
      }}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <div className="text-xl font-black text-white leading-none">{value}</div>
          {subtitle && <span className="text-[10px] text-slate-400 font-medium">{subtitle}</span>}
        </div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}
