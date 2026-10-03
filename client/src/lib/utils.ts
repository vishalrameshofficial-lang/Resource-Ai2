import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UrgencyLevel, RequestStatus } from '../types/emergency';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskPhone(phone: string, isRevealed = false) {
  if (!phone) return 'N/A';
  if (isRevealed) return phone;
  const clean = phone.trim();
  if (clean.length <= 4) return '****';
  const prefix = clean.slice(0, 3);
  const suffix = clean.slice(-4);
  return `${prefix} ******${suffix}`;
}

export function formatDate(isoString: string) {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return isoString;
  }
}

export function getUrgencyBadgeColor(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'CRITICAL':
      return 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold animate-pulse';
    case 'HIGH':
      return 'bg-amber-100 text-amber-800 border-amber-300 font-extrabold';
    case 'MEDIUM':
      return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
    case 'LOW':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
  }
}

export function getStatusBadgeColor(status: RequestStatus) {
  switch (status) {
    case 'NEW':
      return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
    case 'VERIFIED':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold';
    case 'FORWARDED_TO_GOVERNMENT':
      return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
    case 'ACCEPTED':
      return 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold';
    case 'RESOURCE_ALLOCATED':
      return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    case 'DELIVERY_IN_PROGRESS':
      return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    case 'REJECTED':
      return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    case 'CANCELLED':
      return 'bg-slate-200 text-slate-800 border-slate-300 font-bold';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
  }
}

export function formatStatusLabel(status: RequestStatus) {
  return status.replace(/_/g, ' ');
}
