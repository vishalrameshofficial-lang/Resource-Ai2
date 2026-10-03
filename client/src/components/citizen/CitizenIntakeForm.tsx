import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Send,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  RefreshCw,
  Clock,
  Phone,
  Languages,
  Users
} from 'lucide-react';
import { emergencyQueue, QueuedEmergencyRequest } from '../../lib/emergencyQueue';

export function CitizenIntakeForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    language: 'Tamil',
    category: 'flood',
    location: '',
    landmark: '',
    affectedPeople: 1,
    description: '',
    urgency: 'HIGH',
    immediateDanger: false,
    selectedResources: ['Food & Meals', 'Drinking Water']
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queue, setQueue] = useState<QueuedEmergencyRequest[]>([]);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const unsubscribe = emergencyQueue.subscribe((updatedQueue) => {
      setQueue(updatedQueue);
    });
    return unsubscribe;
  }, []);

  const resourceOptions = [
    'Food & Meals',
    'Drinking Water',
    'Rescue Boat',
    'Medical First Aid',
    'Tarpaulin & Shelter',
    'Emergency Evacuation',
    'Blankets / Clothing'
  ];

  const toggleResource = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedResources: prev.selectedResources.includes(item)
        ? prev.selectedResources.filter((r) => r !== item)
        : [...prev.selectedResources, item]
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!formData.location) {
          setFormData((prev) => ({
            ...prev,
            location: `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
          }));
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.location) {
      alert('Please fill in your phone number and location.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: formData.name || 'Citizen User',
      phone: formData.phone,
      language: formData.language,
      category: formData.category,
      location: formData.location,
      landmark: formData.landmark || null,
      latitude: gpsCoords?.lat || null,
      longitude: gpsCoords?.lng || null,
      affectedPeople: Number(formData.affectedPeople) || 1,
      description: formData.description || `Emergency assistance needed in ${formData.location}`,
      urgency: formData.urgency,
      immediateDanger: formData.immediateDanger,
      requirements: formData.selectedResources.map((r) => ({
        item: r,
        quantity: formData.affectedPeople,
        unit: 'units'
      })),
      source: 'WEB'
    };

    try {
      const queuedItem = await emergencyQueue.enqueue(payload);
      setLastSubmittedId(queuedItem.tempId);
      // Reset form
      setFormData({
        name: '',
        phone: '',
        language: 'Tamil',
        category: 'flood',
        location: '',
        landmark: '',
        affectedPeople: 1,
        description: '',
        urgency: 'HIGH',
        immediateDanger: false,
        selectedResources: ['Food & Meals', 'Drinking Water']
      });
      setGpsCoords(null);
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-white to-cyan-50 border border-blue-200 text-center space-y-4 shadow-md glass-panel-3d">
        <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 mx-auto flex items-center justify-center text-blue-600">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Citizen Emergency Assistance Intake
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-lg mx-auto mt-1">
            Need immediate disaster assistance? Fill out this emergency form or call our 24/7 AI helpline directly.
            Web submissions work <strong className="text-emerald-600">even if offline</strong>.
          </p>
        </div>

        {/* Prominent Direct Phone Helpline Callout */}
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-white border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
              <Phone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">Prefer to speak by phone?</span>
              <span className="text-[11px] text-slate-500 font-semibold block">Multilingual AI voice assistance in 8 Indian languages</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <span className="font-mono text-sm sm:text-base font-black text-emerald-700 tracking-wide">
              +91 44 4761 5477
            </span>
            <a
              href="tel:+914447615477"
              aria-label="Call Emergency Support at +91 44 4761 5477"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Emergency Support</span>
            </a>
          </div>
        </div>
      </div>

      {/* Offline Queue Status Tray */}
      {queue.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-amber-900 flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-amber-600" />
              <span>Offline & In-Flight Dispatch Queue ({queue.length} items)</span>
            </h4>
            <button
              onClick={() => emergencyQueue.processQueue()}
              className="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-[11px] font-bold flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Sync</span>
            </button>
          </div>

          <div className="space-y-2">
            {queue.map((item) => (
              <div
                key={item.tempId}
                className="p-3 rounded-xl bg-white border border-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {item.payload.location} ({item.payload.category})
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Queued: {new Date(item.queuedAt).toLocaleTimeString()} · Attempts: {item.attempts}
                  </div>
                </div>

                <div>
                  {item.deliveryStatus === 'CONFIRMED' ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmed: {item.confirmedRequestId}</span>
                    </span>
                  ) : item.deliveryStatus === 'SYNCING' ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 font-bold text-[11px]">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing with ResourceAI...</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Saved locally — waiting for network</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="glass-panel-3d p-6 rounded-2xl border border-slate-200 bg-white space-y-5 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Caller Name */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Your Name (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Caller Phone */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Contact Phone Number <span className="text-rose-600">*</span>:
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. +91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Language Preference */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Preferred Language:
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              {['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Odia'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Emergency Category:
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 capitalize focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="flood">Flood</option>
              <option value="landslide">Landslide</option>
              <option value="cyclone">Cyclone / Storm</option>
              <option value="medical">Medical Emergency</option>
              <option value="building_collapse">Building Collapse</option>
              <option value="fire">Fire Incident</option>
              <option value="other">Other Crisis</option>
            </select>
          </div>
        </div>

        {/* Location & Landmark with GPS Auto-locate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-extrabold text-slate-700">
                Current Location / Area <span className="text-rose-600">*</span>:
              </label>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="text-[11px] text-blue-700 hover:text-blue-800 font-bold flex items-center space-x-1"
              >
                <MapPin className="w-3 h-3 text-rose-500" />
                <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Kurukkuthoorai, Tirunelveli"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Nearby Landmark:
            </label>
            <input
              type="text"
              placeholder="e.g. Near Murugan Temple Ghat"
              value={formData.landmark}
              onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Affected People & Urgency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Number of Affected People:
            </label>
            <input
              type="number"
              min={1}
              value={formData.affectedPeople}
              onChange={(e) => setFormData({ ...formData, affectedPeople: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Urgency Level:
            </label>
            <select
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="CRITICAL">Critical (Life Threatening)</option>
              <option value="HIGH">High Urgency</option>
              <option value="MEDIUM">Medium Urgency</option>
              <option value="LOW">Low Urgency</option>
            </select>
          </div>
        </div>

        {/* Requirements Selection Checklist */}
        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-2">
            Select Needed Relief Supplies & Services:
          </label>
          <div className="flex flex-wrap gap-2">
            {resourceOptions.map((res) => {
              const isSelected = formData.selectedResources.includes(res);
              return (
                <button
                  key={res}
                  type="button"
                  onClick={() => toggleResource(res)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {res}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description Textarea */}
        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1">
            Describe Your Emergency & Situation:
          </label>
          <textarea
            rows={3}
            placeholder="Explain the water level, road blockage, medical emergency, or immediate assistance needed..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        {/* Immediate Danger Checkbox */}
        <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
          <input
            type="checkbox"
            id="immediateDanger"
            checked={formData.immediateDanger}
            onChange={(e) => setFormData({ ...formData, immediateDanger: e.target.checked })}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
          />
          <label htmlFor="immediateDanger" className="text-xs font-extrabold text-rose-900 cursor-pointer">
            Immediate Risk to Life / Stranded in High Water Level (Flag High Priority Triage)
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:opacity-95 text-white font-extrabold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Submitting Petition...' : 'Submit Emergency Relief Petition'}</span>
        </button>
      </form>
    </div>
  );
}
