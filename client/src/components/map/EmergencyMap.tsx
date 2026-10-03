import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmergencyRequest, CallSession, UrgencyLevel, EmergencyCategory } from '../../types/emergency';
import { api } from '../../lib/api';
import { maskPhone } from '../../lib/utils';

/* ─────────────────────────────────────────────
 * Types & Interfaces
 * ───────────────────────────────────────────── */
interface EmergencyMapProps {
  requests: EmergencyRequest[];
  calls?: CallSession[];
  onSelectRequest: (request: EmergencyRequest) => void;
  /** If true, renders full operations layout (toolbar, stats, layer switcher). Default = false (mini preview). */
  fullView?: boolean;
}

type FilterMode = 'all' | 'active' | 'critical' | 'high' | 'medium' | 'low';
type MapLayerStyle = 'google_road' | 'dark_ops' | 'satellite';

interface MappedCallerIncident {
  id: string;
  request_id: string;
  caller_name: string;
  caller_phone: string;
  location: string;
  latitude: number;
  longitude: number;
  urgency: UrgencyLevel;
  emergency_category: EmergencyCategory;
  description: string;
  affected_people_count: number;
  resources_needed: string[];
  status: string;
  source: string;
  created_at: string;
  department?: string;
  rawRequest?: EmergencyRequest;
  rawCall?: CallSession;
}

/* ─────────────────────────────────────────────
 * Urgency & Category Visual Configuration
 * ───────────────────────────────────────────── */
const URGENCY_CONFIG: Record<string, { color: string; label: string; glow: string; radiusMeters: number; opacity: number }> = {
  CRITICAL: { color: '#ef4444', label: 'Critical', glow: 'rgba(239, 68, 68, 0.45)', radiusMeters: 650, opacity: 0.28 },
  HIGH:     { color: '#f97316', label: 'High',     glow: 'rgba(249, 115, 22, 0.45)', radiusMeters: 480, opacity: 0.24 },
  MEDIUM:   { color: '#eab308', label: 'Medium',   glow: 'rgba(234, 179, 8, 0.45)',  radiusMeters: 320, opacity: 0.20 },
  LOW:      { color: '#10b981', label: 'Low',      glow: 'rgba(16, 185, 129, 0.45)', radiusMeters: 200, opacity: 0.16 },
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW:                     { label: 'New',                 color: '#3b82f6' },
  VERIFIED:                { label: 'Verified',            color: '#10b981' },
  FORWARDED_TO_GOVERNMENT: { label: 'Govt Forwarded',      color: '#8b5cf6' },
  ACCEPTED:                { label: 'Accepted',            color: '#06b6d4' },
  RESOURCE_ALLOCATED:      { label: 'Allocated',           color: '#f59e0b' },
  DELIVERY_IN_PROGRESS:    { label: 'In Transit',          color: '#f97316' },
  DELIVERED:               { label: 'Delivered',           color: '#10b981' },
  REJECTED:                { label: 'Rejected',            color: '#ef4444' },
  CANCELLED:               { label: 'Cancelled',           color: '#64748b' },
};

const ACTIVE_STATUSES = new Set(['NEW', 'VERIFIED', 'FORWARDED_TO_GOVERNMENT', 'ACCEPTED', 'RESOURCE_ALLOCATED', 'DELIVERY_IN_PROGRESS']);

/* ─────────────────────────────────────────────
 * Offline Indian Geocoding Coordinate Dictionary
 * ───────────────────────────────────────────── */
function resolveLocationCoords(locationStr: string): { lat: number; lng: number } {
  const clean = (locationStr || '').toLowerCase().trim();

  const KNOWN_LOCATIONS = [
    // Chennai Neighborhoods
    { keywords: ['anna nagar'], lat: 13.0850, lng: 80.2101 },
    { keywords: ['t. nagar', 't nagar', 'thyagaraya nagar'], lat: 13.0418, lng: 80.2341 },
    { keywords: ['velachery'], lat: 12.9815, lng: 80.2180 },
    { keywords: ['guindy'], lat: 13.0067, lng: 80.2020 },
    { keywords: ['mylapore'], lat: 13.0339, lng: 80.2687 },
    { keywords: ['tambaram'], lat: 12.9249, lng: 80.1000 },
    { keywords: ['adyar'], lat: 13.0012, lng: 80.2565 },
    { keywords: ['royapettah'], lat: 13.0537, lng: 80.2642 },
    { keywords: ['egmore'], lat: 13.0732, lng: 80.2609 },
    { keywords: ['triplicane'], lat: 13.0587, lng: 80.2757 },
    { keywords: ['porur'], lat: 13.0382, lng: 80.1565 },
    { keywords: ['chromepet'], lat: 12.9516, lng: 80.1462 },
    { keywords: ['ambattur'], lat: 13.1143, lng: 80.1548 },
    { keywords: ['avadi'], lat: 13.1147, lng: 80.1098 },
    { keywords: ['madipakkam'], lat: 12.9623, lng: 80.1986 },
    { keywords: ['sholinganallur', 'omr'], lat: 12.9010, lng: 80.2279 },
    { keywords: ['chennai central', 'park town'], lat: 13.0827, lng: 80.2707 },
    { keywords: ['chennai', 'madras'], lat: 13.0827, lng: 80.2707 },

    // Tamil Nadu Districts & Major Cities
    { keywords: ['coimbatore', 'kovai'], lat: 11.0168, lng: 76.9558 },
    { keywords: ['madurai'], lat: 9.9252, lng: 78.1198 },
    { keywords: ['tiruchirappalli', 'trichy'], lat: 10.7905, lng: 78.7047 },
    { keywords: ['salem'], lat: 11.6643, lng: 78.1460 },
    { keywords: ['tirunelveli', 'nellai'], lat: 8.7139, lng: 77.7567 },
    { keywords: ['erode'], lat: 11.3410, lng: 77.7172 },
    { keywords: ['vellore'], lat: 12.9165, lng: 79.1325 },
    { keywords: ['thanjavur', 'tanjore'], lat: 10.7870, lng: 79.1378 },
    { keywords: ['kanchipuram', 'kanchi'], lat: 12.8342, lng: 79.7036 },
    { keywords: ['cuddalore'], lat: 11.7480, lng: 79.7714 },
    { keywords: ['dindigul'], lat: 10.3673, lng: 77.9803 },
    { keywords: ['karur'], lat: 10.9601, lng: 78.0766 },
    { keywords: ['tiruppur'], lat: 11.1085, lng: 77.3411 },
    { keywords: ['nagapattinam'], lat: 10.7672, lng: 79.8449 },
    { keywords: ['kanyakumari', 'nagercoil'], lat: 8.1833, lng: 77.4119 },
    { keywords: ['puducherry', 'pondicherry'], lat: 11.9416, lng: 79.8083 },

    // Other Indian Metros
    { keywords: ['bengaluru', 'bangalore'], lat: 12.9716, lng: 77.5946 },
    { keywords: ['hyderabad'], lat: 17.3850, lng: 78.4867 },
    { keywords: ['mumbai', 'bombay'], lat: 19.0760, lng: 72.8777 },
    { keywords: ['delhi', 'new delhi'], lat: 28.6139, lng: 77.2090 },
    { keywords: ['kolkata', 'calcutta'], lat: 22.5726, lng: 88.3639 }
  ];

  // Hash-based deterministic spatial dispersion so pins in the same city/area don't overlap exactly
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const latJitter = ((Math.abs(hash) % 100) - 50) * 0.0003;
  const lngJitter = ((Math.abs(hash >> 3) % 100) - 50) * 0.0003;

  for (const loc of KNOWN_LOCATIONS) {
    if (loc.keywords.some(k => clean.includes(k))) {
      return {
        lat: Number((loc.lat + latJitter).toFixed(6)),
        lng: Number((loc.lng + lngJitter).toFixed(6))
      };
    }
  }

  // Default fallback: Chennai Center with jitter
  return {
    lat: Number((13.0827 + latJitter).toFixed(6)),
    lng: Number((80.2707 + lngJitter).toFixed(6))
  };
}

/* ─────────────────────────────────────────────
 * Map Layer Tile Providers
 * ───────────────────────────────────────────── */
const TILE_LAYERS: Record<MapLayerStyle, { url: string; maxZoom: number }> = {
  google_road: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19
  },
  dark_ops: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 16
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19
  }
};

/* ─────────────────────────────────────────────
 * Custom Google Teardrop Pin Generator
 * ───────────────────────────────────────────── */
function createGooglePinIcon(urgency: string, category: string): L.DivIcon {
  const conf = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.MEDIUM;
  const emoji = CATEGORY_ICONS[category] || '⚠️';

  const html = `
    <div class="google-pin-wrapper" style="position: relative; width: 38px; height: 48px; transform: translate(-50%, -100%); cursor: pointer;">
      ${urgency === 'CRITICAL' ? `<div style="position: absolute; left: 7px; top: 7px; width: 24px; height: 24px; border-radius: 50%; background: ${conf.color}; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
      <svg width="38" height="48" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px ${conf.glow});">
        <path d="M19 0C8.50659 0 0 8.50659 0 19C0 31.5 19 48 19 48C19 48 38 31.5 38 19C38 8.50659 29.4934 0 19 0Z" fill="${conf.color}"/>
        <path d="M19 1.5C9.33502 1.5 1.5 9.33502 1.5 19C1.5 25.5 8 35.5 19 45.5C30 35.5 36.5 25.5 36.5 19C36.5 9.33502 28.665 1.5 19 1.5Z" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
        <circle cx="19" cy="19" r="13" fill="#ffffff"/>
      </svg>
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
 * Rich Caller Popup Builder
 * ───────────────────────────────────────────── */
function buildPopupHtml(incident: MappedCallerIncident): string {
  const urgencyConf = URGENCY_CONFIG[incident.urgency] || URGENCY_CONFIG.MEDIUM;
  const emoji = CATEGORY_ICONS[incident.emergency_category] || '⚠️';
  const statusConf = STATUS_LABELS[incident.status] || { label: incident.status, color: '#64748b' };
  const resources = incident.resources_needed.join(', ');
  const createdTime = new Date(incident.created_at).toLocaleString();

  return `
    <div style="font-family: 'Inter', system-ui, sans-serif; min-width: 280px; max-width: 330px; color: #0f172a; padding: 0;">
      <!-- Card Header -->
      <div style="background: linear-gradient(135deg, ${urgencyConf.color}20, #f8fafc 90%); border-bottom: 2px solid ${urgencyConf.color}; padding: 12px 14px; border-radius: 8px 8px 0 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 22px; line-height: 1;">${emoji}</span>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">${incident.request_id}</div>
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: capitalize;">
              ${incident.department || incident.emergency_category.replace('_', ' ')}
            </div>
          </div>
          <span style="font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 9999px; background: ${urgencyConf.color}20; color: ${urgencyConf.color}; border: 1px solid ${urgencyConf.color}; text-transform: uppercase;">
            ${incident.urgency}
          </span>
        </div>
      </div>

      <!-- Card Body -->
      <div style="padding: 12px 14px; background: #ffffff; font-size: 12px; border-radius: 0 0 8px 8px;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Caller Info & Location -->
          <div style="display: flex; gap: 6px; align-items: flex-start;">
            <span style="color: #2563eb; font-size: 13px;">📞</span>
            <span style="color: #1e293b; font-weight: 700;">Caller: ${maskPhone(incident.caller_phone)}</span>
          </div>

          <div style="display: flex; gap: 6px; align-items: flex-start;">
            <span style="color: #0284c7; font-size: 13px;">📍</span>
            <span style="color: #334155; font-weight: 600; word-break: break-word;">${incident.location || 'Location Not Mentioned'}</span>
          </div>

          <!-- Description / Spoken Query -->
          ${incident.description ? `
            <div style="background: #f1f5f9; padding: 8px 10px; border-radius: 8px; border-left: 3px solid #2563eb; font-size: 11px; color: #334155; font-style: italic;">
              "${incident.description}"
            </div>
          ` : ''}

          <!-- Resources Needed -->
          ${resources ? `
            <div style="display: flex; gap: 6px; align-items: flex-start;">
              <span style="color: #059669; font-size: 13px;">📦</span>
              <span style="color: #334155;"><strong style="color: #0f172a;">Needs:</strong> ${resources}</span>
            </div>
          ` : ''}

          <!-- Status & Time -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b;">
            <span style="padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: ${statusConf.color}; font-weight: 800;">${statusConf.label}</span>
            <span style="font-weight: 600;">${createdTime}</span>
          </div>
        </div>

        <!-- Action Button -->
        <button 
          id="btn-dispatch-${incident.id}" 
          style="margin-top: 10px; width: 100%; padding: 8px 12px; border-radius: 8px; background: #2563eb; color: #ffffff; border: none; font-size: 11px; font-weight: 800; cursor: pointer; text-align: center; transition: background 0.15s; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);"
          onmouseover="this.style.background='#1d4ed8'"
          onmouseout="this.style.background='#2563eb'"
        >
          🚨 Inspect Emergency Details &rarr;
        </button>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────
 * EmergencyMap Component
 * ───────────────────────────────────────────── */
export function EmergencyMap({ requests, calls, onSelectRequest, fullView = false }: EmergencyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const circlesGroupRef = useRef<L.LayerGroup | null>(null);

  // States
  const [activeLayer, setActiveLayer] = useState<MapLayerStyle>('google_road');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUrgencyZones, setShowUrgencyZones] = useState(true);
  const [fetchedCalls, setFetchedCalls] = useState<CallSession[]>([]);

  // Fetch caller sessions if not provided as props
  useEffect(() => {
    if (calls && calls.length > 0) return;
    api.getCalls()
      .then((data) => setFetchedCalls(data || []))
      .catch((err) => console.warn('[EmergencyMap] Failed to fetch calls:', err));
  }, [calls]);

  const activeCallsList = useMemo(() => calls || fetchedCalls, [calls, fetchedCalls]);

  /* ─────────────────────────────────────────────
   * Consolidate ALL Callers (Requests + Calls) into Mapped Incidents
   * ───────────────────────────────────────────── */
  const allCallerIncidents = useMemo<MappedCallerIncident[]>(() => {
    const list: MappedCallerIncident[] = [];
    const seenRequestIds = new Set<string>();

    // 1. Convert EmergencyRequests
    requests.forEach((req) => {
      seenRequestIds.add(req.request_id);
      if (req.created_from_call_id) seenRequestIds.add(req.created_from_call_id);

      const hasExactCoords = typeof req.latitude === 'number' && typeof req.longitude === 'number' && req.latitude !== 0 && req.longitude !== 0;
      const coords = hasExactCoords
        ? { lat: req.latitude!, lng: req.longitude! }
        : resolveLocationCoords(req.location || 'Chennai');

      const resourcesArr = Array.isArray(req.resources_needed)
        ? req.resources_needed.map((r) => (typeof r === 'string' ? r : r.item))
        : [];

      list.push({
        id: req.id,
        request_id: req.request_id,
        caller_name: req.caller_name || 'Citizen Caller',
        caller_phone: req.caller_phone || '',
        location: req.location || 'Chennai',
        latitude: coords.lat,
        longitude: coords.lng,
        urgency: req.urgency || 'MEDIUM',
        emergency_category: req.emergency_category || 'other',
        description: req.description || '',
        affected_people_count: req.affected_people_count || 1,
        resources_needed: resourcesArr,
        status: req.status || 'NEW',
        source: req.source || 'AI VOICE',
        created_at: req.created_at || new Date().toISOString(),
        rawRequest: req
      });
    });

    // 2. Convert unlinked CallSessions gathered by callers
    activeCallsList.forEach((call) => {
      if (call.id && seenRequestIds.has(call.id)) return;
      if (call.request_id && seenRequestIds.has(call.request_id)) return;

      const coords = resolveLocationCoords(call.location || 'Chennai');

      let urgency: UrgencyLevel = 'MEDIUM';
      const p = (call.priority || '').toUpperCase();
      if (p.includes('CRITICAL')) urgency = 'CRITICAL';
      else if (p.includes('HIGH')) urgency = 'HIGH';
      else if (p.includes('LOW')) urgency = 'LOW';

      let cat: EmergencyCategory = 'other';
      const dept = (call.department || '').toLowerCase();
      if (dept.includes('fire')) cat = 'fire';
      else if (dept.includes('medical') || dept.includes('health')) cat = 'medical';
      else if (dept.includes('water') || dept.includes('flood')) cat = 'flood';
      else if (dept.includes('shelter') || dept.includes('building')) cat = 'building_collapse';

      list.push({
        id: call.id,
        request_id: call.request_id || `CALL-${call.id.slice(-6)}`,
        caller_name: 'Helpline Caller',
        caller_phone: call.caller_phone || '',
        location: call.location || 'Chennai',
        latitude: coords.lat,
        longitude: coords.lng,
        urgency,
        emergency_category: cat,
        description: call.summary || call.query || 'Caller telephone triage session',
        affected_people_count: parseInt(call.affected_people || '1', 10) || 1,
        resources_needed: Array.isArray(call.required_resources) ? call.required_resources : [],
        status: call.status || 'NEW',
        source: 'AI VOICE',
        created_at: call.started_at || call.created_at || new Date().toISOString(),
        department: call.department,
        rawCall: call
      });
    });

    return list;
  }, [requests, activeCallsList]);

  // ── Filter Incidents ──
  const filteredIncidents = useMemo(() => {
    let result = [...allCallerIncidents];

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
        r.caller_phone?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allCallerIncidents, filterMode, categoryFilter, searchQuery]);

  // Calculated Stats
  const stats = useMemo(() => ({
    total: allCallerIncidents.length,
    active: allCallerIncidents.filter(r => ACTIVE_STATUSES.has(r.status)).length,
    critical: allCallerIncidents.filter(r => r.urgency === 'CRITICAL').length,
    high: allCallerIncidents.filter(r => r.urgency === 'HIGH').length,
    medium: allCallerIncidents.filter(r => r.urgency === 'MEDIUM').length,
    low: allCallerIncidents.filter(r => r.urgency === 'LOW').length,
  }), [allCallerIncidents]);

  const categories = useMemo(() => {
    const cats = new Set(allCallerIncidents.map(r => r.emergency_category));
    return Array.from(cats).sort();
  }, [allCallerIncidents]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Tamil Nadu / Chennai region
    const initialCenter: [number, number] = [13.0827, 80.2707];
    const initialZoom = 11;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerConf = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(layerConf.url, { maxZoom: layerConf.maxZoom }).addTo(map);

    const circlesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    tileLayerRef.current = tileLayer;
    circlesGroupRef.current = circlesGroup;
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersGroupRef.current = null;
      circlesGroupRef.current = null;
    };
  }, []);

  // Update Tile Layer Style
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const layerConf = TILE_LAYERS[activeLayer];

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(layerConf.url, { maxZoom: layerConf.maxZoom }).addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [activeLayer]);

  // Fit bounds helper
  const fitAllIncidents = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || filteredIncidents.length === 0) return;

    const bounds = L.latLngBounds(filteredIncidents.map(r => [r.latitude, r.longitude]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
  }, [filteredIncidents]);

  // Render Markers & Urgency Radius Circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    const circlesGroup = circlesGroupRef.current;

    if (!map || !markersGroup || !circlesGroup) return;

    markersGroup.clearLayers();
    circlesGroup.clearLayers();

    if (filteredIncidents.length === 0) return;

    filteredIncidents.forEach((incident) => {
      const urgencyConf = URGENCY_CONFIG[incident.urgency] || URGENCY_CONFIG.MEDIUM;

      // 1. Draw Urgency Area Radius Circle
      if (showUrgencyZones) {
        const circle = L.circle([incident.latitude, incident.longitude], {
          radius: urgencyConf.radiusMeters,
          color: urgencyConf.color,
          fillColor: urgencyConf.color,
          fillOpacity: urgencyConf.opacity,
          weight: incident.urgency === 'CRITICAL' ? 2 : 1.5,
        });
        circlesGroup.addLayer(circle);
      }

      // 2. Draw Teardrop Marker Pin
      const icon = createGooglePinIcon(incident.urgency, incident.emergency_category);
      const marker = L.marker([incident.latitude, incident.longitude], { icon });

      const popupContent = buildPopupHtml(incident);
      marker.bindPopup(popupContent, {
        maxWidth: 330,
        className: 'google-style-popup',
        closeButton: true,
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-dispatch-${incident.id}`);
        if (btn) {
          btn.onclick = () => {
            if (incident.rawRequest) {
              onSelectRequest(incident.rawRequest);
            } else {
              // Construct EmergencyRequest from CallSession
              const synthReq: EmergencyRequest = {
                id: incident.id,
                request_id: incident.request_id,
                caller_name: incident.caller_name,
                caller_phone: incident.caller_phone,
                caller_language: 'English',
                emergency_category: incident.emergency_category,
                description: incident.description,
                location: incident.location,
                latitude: incident.latitude,
                longitude: incident.longitude,
                affected_people_count: incident.affected_people_count,
                resources_needed: incident.resources_needed.map(r => ({ item: r })),
                urgency: incident.urgency,
                immediate_danger: incident.urgency === 'CRITICAL',
                source: 'AI VOICE',
                status: 'NEW',
                created_at: incident.created_at,
                updated_at: incident.created_at,
              };
              onSelectRequest(synthReq);
            }
          };
        }
      });

      markersGroup.addLayer(marker);
    });

    fitAllIncidents();
  }, [filteredIncidents, showUrgencyZones, onSelectRequest, fitAllIncidents]);

  /* ─────────────────────────────────────────────
   * Mini Preview Mode (Dashboard Widget)
   * ───────────────────────────────────────────── */
  if (!fullView) {
    return (
      <div className="relative w-full h-full min-h-[220px] rounded-2xl overflow-hidden border border-slate-200 glass-panel-3d shadow-sm">
        <div ref={mapContainerRef} className="w-full h-full min-h-[220px]" />

        {/* Compact Legend & Stats */}
        <div className="absolute top-3 right-3 z-[1000] p-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-[10px] shadow-lg space-y-1.5 pointer-events-auto">
          <div className="flex items-center justify-between gap-3">
            <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[9px]">Caller Urgency Plot</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold border border-blue-300">
              {filteredIncidents.length} plotted
            </span>
          </div>
          <div className="flex items-center gap-3 pt-1 border-t border-slate-200">
            {Object.entries(URGENCY_CONFIG).map(([level, conf]) => (
              <div key={level} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: conf.color }} />
                <span className="text-slate-800 font-bold capitalize">{level[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recenter Button */}
        {filteredIncidents.length > 0 && (
          <button
            onClick={fitAllIncidents}
            className="absolute bottom-3 left-3 z-[1000] px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-slate-50 backdrop-blur-md border border-slate-200 text-slate-800 text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            title="Recenter Map"
          >
            <span>🎯</span> Recenter Map
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
        <StatsCard label="Total Caller Plot" value={stats.total} color="#2563eb" icon="📋" />
        <StatsCard label="Active Incidents" value={stats.active} color="#0891b2" icon="⚡" />
        <StatsCard label="Critical Urgency" value={stats.critical} color="#dc2626" icon="🚨" />
        <StatsCard label="High Urgency" value={stats.high} color="#ea580c" icon="🔥" />
        <StatsCard label="Medium / Low" value={stats.medium + stats.low} color="#059669" icon="📍" subtitle={`${stats.medium} Med • ${stats.low} Low`} />
      </div>

      {/* ── Toolbar: Filters, Search, Urgency Zone Toggle, Layer Switcher ── */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        {/* Urgency Filter Pills */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(['all', 'active', 'critical', 'high', 'medium', 'low'] as FilterMode[]).map((mode) => {
            const isActive = filterMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold capitalize transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
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
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-800 border border-slate-300 focus:outline-none focus:border-blue-500"
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
            placeholder="Search location, phone, query..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 pl-8 rounded-xl text-xs font-bold bg-slate-50 text-slate-800 border border-slate-300 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
        </div>

        {/* Urgency Zone Circles Toggle */}
        <button
          onClick={() => setShowUrgencyZones(!showUrgencyZones)}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 ${
            showUrgencyZones
              ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-2xs'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title="Toggle Urgency Area Heatmap Circles"
        >
          <span>🎯</span> {showUrgencyZones ? 'Urgency Zones ON' : 'Urgency Zones OFF'}
        </button>

        {/* Layer Style Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto">
          <button
            onClick={() => setActiveLayer('google_road')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeLayer === 'google_road'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Google Maps Standard Road View"
          >
            <span>🗺️</span> Road
          </button>
          <button
            onClick={() => setActiveLayer('dark_ops')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeLayer === 'dark_ops'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Dark Operations Mode"
          >
            <span>🌙</span> Dark
          </button>
          <button
            onClick={() => setActiveLayer('satellite')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeLayer === 'satellite'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Real Satellite Imagery"
          >
            <span>🛰️</span> Satellite
          </button>
        </div>

        {/* Fit All Button */}
        <button
          onClick={fitAllIncidents}
          className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5"
          title="Fit map to all caller incidents"
        >
          <span>🎯</span> Fit All
        </button>
      </div>

      {/* ── Main Map Canvas ── */}
      <div className="flex-1 relative min-h-[520px] rounded-2xl overflow-hidden border border-slate-200 glass-panel-3d shadow-lg">
        <div ref={mapContainerRef} className="w-full h-full min-h-[520px]" />

        {/* Floating Urgency Legend on Map */}
        <div className="absolute top-4 right-4 z-[1000] p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 text-xs shadow-xl space-y-2 pointer-events-auto">
          <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] flex items-center justify-between gap-4">
            <span>Caller Urgency Areas</span>
            <span className="text-[9px] text-blue-700 font-mono font-bold">LIVE PLOT</span>
          </div>
          {Object.entries(URGENCY_CONFIG).map(([level, conf]) => (
            <div key={level} className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded-full shadow-2xs" style={{ backgroundColor: conf.color }} />
              <span className="text-slate-800 font-bold">
                {conf.label} ({filteredIncidents.filter(r => r.urgency === level).length})
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
            <span className="font-bold">Total Callers Plotted:</span>
            <span className="font-black text-blue-700">{filteredIncidents.length}</span>
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
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border bg-white shadow-2xs transition-all hover:scale-[1.02]"
      style={{
        borderColor: `${color}40`,
      }}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <div className="text-xl font-black text-slate-900 leading-none">{value}</div>
          {subtitle && <span className="text-[10px] text-slate-500 font-semibold">{subtitle}</span>}
        </div>
        <div className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}
