/**
 * AI-assisted operational helpers.
 * These are transparent statistical / rule-based functions (no external model call, no API key needed).
 * They NEVER decide medical compatibility, clinical donor eligibility, transfusion approval or treatment.
 * Compatibility comes from bloodGroups.ts; clinical eligibility is decided by hospital screening.
 */

export interface DonorSignal {
  distanceKm: number | null;
  daysSinceLastDonation: number | null;
  acceptedBefore: number;
  declinedBefore: number;
}

/** Outreach priority score 0-100 (higher = contact sooner). Ordering aid only. */
export function scoreDonor(s: DonorSignal): number {
  let score = 40;
  if (s.distanceKm != null) score += Math.max(0, 35 - s.distanceKm * 1.5); // nearer is better
  if (s.daysSinceLastDonation == null) score += 8; // no history on file
  else if (s.daysSinceLastDonation >= 90) score += Math.min(12, (s.daysSinceLastDonation - 90) / 30 + 6);
  const total = s.acceptedBefore + s.declinedBefore;
  if (total > 0) score += 15 * (s.acceptedBefore / total); // responsiveness
  return Math.round(Math.max(0, Math.min(100, score)));
}

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(norm(a).split(' ').filter(Boolean));
  const tb = new Set(norm(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => { if (tb.has(t)) inter++; });
  return inter / (ta.size + tb.size - inter);
}

export interface DupCandidate { patientName: string; bloodGroup: string; hospitalId: string; createdAt: Date }

/** Flags likely duplicate requests: same hospital + blood group + very similar patient name within 48h. */
export function isLikelyDuplicate(a: DupCandidate, b: DupCandidate): boolean {
  if (a.hospitalId !== b.hospitalId || a.bloodGroup !== b.bloodGroup) return false;
  const hours = Math.abs(a.createdAt.getTime() - b.createdAt.getTime()) / 36e5;
  return hours <= 48 && nameSimilarity(a.patientName, b.patientName) >= 0.8;
}

export type ShortageLevel = 'OK' | 'WATCH' | 'LOW' | 'CRITICAL';

/** Days-of-cover forecast from the average daily allocation over the lookback window. */
export function forecastShortage(stock: number, allocatedInWindow: number, windowDays = 14) {
  const dailyRate = allocatedInWindow / windowDays;
  const daysOfCover = dailyRate > 0 ? stock / dailyRate : null;
  let level: ShortageLevel = 'OK';
  if (stock === 0 && dailyRate > 0) level = 'CRITICAL';
  else if (daysOfCover != null && daysOfCover < 3) level = 'CRITICAL';
  else if (daysOfCover != null && daysOfCover < 7) level = 'LOW';
  else if (daysOfCover != null && daysOfCover < 14) level = 'WATCH';
  return { dailyRate: Math.round(dailyRate * 100) / 100, daysOfCover: daysOfCover == null ? null : Math.round(daysOfCover * 10) / 10, level };
}

export function emergencySummary(r: {
  code: string; bloodGroupLabel: string; units: number; urgency: string; hospital: string; city: string;
  requiredBy: Date; status: string; acceptedDonors: number; unitsFromBank: number; patientAge?: number;
}): string {
  const remaining = Math.max(0, r.units - r.unitsFromBank);
  return [
    `[${r.urgency}] Request ${r.code}: ${r.units} unit(s) of ${r.bloodGroupLabel} needed at ${r.hospital}, ${r.city}`,
    `by ${r.requiredBy.toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
    r.patientAge != null ? `Patient age: ${r.patientAge}.` : '',
    `Status: ${r.status.replace(/_/g, ' ')}. Donors who said yes: ${r.acceptedDonors}. Supplied by blood banks: ${r.unitsFromBank}/${r.units} (remaining ${remaining}).`,
    'Donor willingness is not medical approval; hospital screening decides eligibility and compatibility.'
  ].filter(Boolean).join(' ');
}
