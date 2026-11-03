export const REQUEST_STATUSES = [
  'PENDING_VERIFICATION', 'VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION',
  'FULFILLED', 'REJECTED', 'CANCELLED', 'EXPIRED'
] as const;
export type RStatus = (typeof REQUEST_STATUSES)[number];

/** Backend-enforced state machine for blood requests. */
export const TRANSITIONS: Record<RStatus, RStatus[]> = {
  PENDING_VERIFICATION: ['VERIFIED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  VERIFIED: ['DONOR_ACCEPTED', 'MEDICAL_COORDINATION', 'CANCELLED', 'EXPIRED'],
  DONOR_ACCEPTED: ['MEDICAL_COORDINATION', 'CANCELLED', 'EXPIRED'],
  MEDICAL_COORDINATION: ['FULFILLED', 'CANCELLED', 'EXPIRED'],
  FULFILLED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: []
};

export const ACTIVE_STATUSES: RStatus[] = ['PENDING_VERIFICATION', 'VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION'];
export const OPEN_FOR_DONORS: RStatus[] = ['VERIFIED', 'DONOR_ACCEPTED'];

export function canTransition(from: RStatus, to: RStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
