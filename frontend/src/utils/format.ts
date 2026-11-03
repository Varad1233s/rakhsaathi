import type { BloodGroup, RequestStatus, Role, Urgency, VerificationStatus } from '@/types';

export const bloodLabel = (g?: string | null) => (g ? g.replace('_POS', '+').replace('_NEG', '-') : '—');
export const fmtDate = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d?: string | Date | null) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export function timeAgo(d: string | Date): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
export const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

type Tone = 'default' | 'warning' | 'info' | 'success' | 'error' | 'primary';
export const STATUS_META: Record<RequestStatus, { label: string; tone: Tone }> = {
  PENDING_VERIFICATION: { label: 'Pending verification', tone: 'warning' },
  VERIFIED: { label: 'Verified', tone: 'info' },
  DONOR_ACCEPTED: { label: 'Donor accepted', tone: 'primary' },
  MEDICAL_COORDINATION: { label: 'Medical coordination', tone: 'info' },
  FULFILLED: { label: 'Fulfilled', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'error' },
  CANCELLED: { label: 'Cancelled', tone: 'default' },
  EXPIRED: { label: 'Expired', tone: 'default' }
};
export const VERIFICATION_META: Record<VerificationStatus, { label: string; tone: Tone }> = {
  PENDING_VERIFICATION: { label: 'Pending verification', tone: 'warning' }, VERIFIED: { label: 'Verified', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'error' }, SUSPENDED: { label: 'Suspended', tone: 'default' }
};
export const URGENCY_TONE: Record<Urgency, Tone> = { NORMAL: 'default', URGENT: 'warning', CRITICAL: 'error' };
export const ACTIVE: RequestStatus[] = ['PENDING_VERIFICATION', 'VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION'];
export const isActive = (s: RequestStatus) => ACTIVE.includes(s);

export const ROLE_HOME: Record<Role, string> = { REQUESTER: '/requester/dashboard', DONOR: '/donor/dashboard', HOSPITAL: '/hospital/dashboard', BLOODBANK: '/bloodbank/dashboard', ADMIN: '/admin/dashboard' };
export const requestPath = (role: Role, id: string) =>
  role === 'REQUESTER' ? `/requester/requests/${id}` : role === 'DONOR' ? `/donor/requests/${id}` : role === 'HOSPITAL' ? `/hospital/requests/${id}` : role === 'BLOODBANK' ? '/bloodbank/requests' : '/admin/requests';

export const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371.0088, r = (d: number) => (d * Math.PI) / 180;
  const x = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
};
export type { BloodGroup };
