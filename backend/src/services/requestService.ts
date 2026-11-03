import { Prisma, type BloodGroup, type RequestStatus, type Role, type Urgency } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { HttpError } from '../utils/http';
import { canTransition, type RStatus } from '../utils/transitions';
import { donorGroupsFor, bloodLabel, type BG } from '../utils/bloodGroups';
import { approxDistanceKm, haversineKm } from '../utils/geo';
import { isLikelyDuplicate, scoreDonor } from '../utils/ai';
import { audit, hospitalStaffIds, notifyUsers } from './notify';
import { emitToHospital, emitToRole, emitToUser } from '../sockets';

export const requestInclude = {
  patient: true,
  hospital: true,
  requester: { select: { id: true, name: true, phone: true } },
  responses: { include: { donor: { select: { id: true, name: true, phone: true, donorProfile: true } } }, orderBy: { createdAt: 'asc' as const } },
  allocations: { include: { bloodBank: { select: { id: true, name: true, city: true } } } }
} satisfies Prisma.BloodRequestInclude;
export type FullRequest = Prisma.BloodRequestGetPayload<{ include: typeof requestInclude }>;

const genCode = () => `RS-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

function donorDistance(d: { donorProfile: { lat: number | null; lng: number | null; shareLocation: boolean } | null }, h: { lat: number | null; lng: number | null }) {
  const p = d.donorProfile;
  if (!p || !p.shareLocation || p.lat == null || p.lng == null || h.lat == null || h.lng == null) return null;
  return approxDistanceKm(haversineKm(p.lat, p.lng, h.lat, h.lng)); // approximate only; raw coordinates are never serialized
}

/** Role-aware serialization. Donor coordinates and requester contact details are never leaked to the wrong role. */
export function serializeRequest(r: FullRequest, role: Role, viewerId: string) {
  const unitsFromBank = r.allocations.reduce((s, a) => s + a.units, 0);
  const accepted = r.responses.filter((x) => x.decision === 'ACCEPTED');
  const base = {
    id: r.id, code: r.code, status: r.status, bloodGroup: r.bloodGroup, units: r.units, urgency: r.urgency,
    requiredBy: r.requiredBy, notes: r.notes, rejectionReason: r.rejectionReason,
    createdAt: r.createdAt, verifiedAt: r.verifiedAt, fulfilledAt: r.fulfilledAt,
    unitsFromBank, acceptedCount: accepted.length,
    hospital: { id: r.hospital.id, name: r.hospital.name, city: r.hospital.city, address: r.hospital.address, phone: r.hospital.phone, lat: r.hospital.lat, lng: r.hospital.lng }
  };
  if (role === 'DONOR') return { ...base, notes: null };
  const patient = { name: r.patient.name, age: r.patient.age, bloodGroup: r.patient.bloodGroup, relationship: r.patient.relationship, isRequester: r.patient.isRequester };
  const allocations = r.allocations.map((a) => ({ id: a.id, bloodBank: a.bloodBank.name, city: a.bloodBank.city, bloodGroup: a.bloodGroup, units: a.units, createdAt: a.createdAt }));
  if (role === 'BLOODBANK') {
    return { ...base, patient: { age: r.patient.age }, allocations };
  }
  if (role === 'REQUESTER') {
    if (r.requesterId !== viewerId) throw new HttpError(403, 'Not your request');
    return {
      ...base, patient, allocations, requester: { name: r.requester.name },
      donorResponses: accepted.map((x) => ({
        id: x.id, donorFirstName: x.donor.name.split(' ')[0], bloodGroup: x.donor.donorProfile?.bloodGroup ?? null,
        approxDistanceKm: donorDistance(x.donor, r.hospital), respondedAt: x.createdAt
      }))
    };
  }
  // HOSPITAL / ADMIN
  return {
    ...base, patient, allocations, flagged: r.flagged, flagReason: r.flagReason,
    requester: { name: r.requester.name, phone: r.requester.phone },
    donorResponses: r.responses.map((x) => ({
      id: x.id, decision: x.decision, donorName: x.donor.name, bloodGroup: x.donor.donorProfile?.bloodGroup ?? null,
      phone: x.decision === 'ACCEPTED' ? x.donor.phone : null,
      approxDistanceKm: donorDistance(x.donor, r.hospital), respondedAt: x.createdAt, note: x.note
    }))
  };
}

export async function getRequestOr404(id: string): Promise<FullRequest> {
  const r = await prisma.bloodRequest.findUnique({ where: { id }, include: requestInclude });
  if (!r) throw new HttpError(404, 'Request not found');
  return r;
}

/** Central, backend-enforced status change. */
export async function moveStatus(r: { id: string; status: RequestStatus }, to: RStatus, actorId: string | null, data: Prisma.BloodRequestUpdateInput = {}) {
  if (!canTransition(r.status as RStatus, to)) throw new HttpError(409, `Cannot change request from ${r.status} to ${to}`);
  const updated = await prisma.bloodRequest.update({ where: { id: r.id }, data: { ...data, status: to } });
  await audit(actorId, `REQUEST_${to}`, 'BloodRequest', r.id, { from: r.status, to });
  return updated;
}

export interface CreateRequestInput {
  forSelf: boolean;
  patient: { name?: string; age: number; bloodGroup: BG; relationship?: string };
  hospitalId: string; units: number; urgency: Urgency; requiredBy: Date; notes?: string;
}

export async function createRequest(user: { id: string; name: string }, input: CreateRequestInput) {
  const hospital = await prisma.hospital.findUnique({ where: { id: input.hospitalId } });
  if (!hospital) throw new HttpError(404, 'Hospital not found');
  if (hospital.status !== 'VERIFIED') throw new HttpError(409, 'This hospital is not verified yet. Choose a verified hospital or wait for verification.');
  if (input.requiredBy.getTime() < Date.now()) throw new HttpError(400, 'Required-by date must be in the future');

  const patientName = input.forSelf ? user.name : (input.patient.name ?? '').trim();
  if (patientName.length < 2) throw new HttpError(400, 'Patient name is required');
  const relationship = input.forSelf ? 'Self' : (input.patient.relationship ?? '').trim();
  if (!relationship) throw new HttpError(400, 'Relationship to patient is required');

  // Duplicate detection (never blocks; flags for hospital/admin review)
  const recent = await prisma.bloodRequest.findMany({
    where: { hospitalId: hospital.id, bloodGroup: input.patient.bloodGroup, createdAt: { gte: new Date(Date.now() - 48 * 36e5) }, status: { in: ['PENDING_VERIFICATION', 'VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION'] } },
    include: { patient: true }
  });
  const now = new Date();
  const dup = recent.find((x) => isLikelyDuplicate(
    { patientName, bloodGroup: input.patient.bloodGroup, hospitalId: hospital.id, createdAt: now },
    { patientName: x.patient.name, bloodGroup: x.bloodGroup, hospitalId: x.hospitalId, createdAt: x.createdAt }));

  const created = await prisma.$transaction(async (tx) => {
    const patient = await tx.patient.create({
      data: { name: patientName, age: input.patient.age, bloodGroup: input.patient.bloodGroup, relationship, isRequester: input.forSelf }
    });
    return tx.bloodRequest.create({
      data: {
        code: genCode(), requesterId: user.id, patientId: patient.id, hospitalId: hospital.id,
        bloodGroup: input.patient.bloodGroup, units: input.units, urgency: input.urgency, requiredBy: input.requiredBy,
        notes: input.notes, flagged: !!dup, flagReason: dup ? `Possible duplicate of ${dup.code}` : null
      },
      include: requestInclude
    });
  });
  await audit(user.id, 'REQUEST_CREATED', 'BloodRequest', created.id, { forSelf: input.forSelf });
  const staff = await hospitalStaffIds(hospital.id);
  await notifyUsers(staff, { type: 'REQUEST_CREATED', title: `New ${input.urgency.toLowerCase()} blood request`, body: `${input.units} unit(s) of ${bloodLabel(input.patient.bloodGroup)} for ${patientName} needs verification.`, requestId: created.id });
  emitToHospital(hospital.id, 'request.created', { id: created.id, code: created.code });
  emitToRole('ADMIN', 'request.created', { id: created.id, code: created.code });
  return { request: created, duplicateOf: dup?.code ?? null };
}

/** Ranked, compatible, available donors for a request (ordering aid only; hospital screening decides eligibility). */
export async function rankCandidates(r: FullRequest) {
  const groups = donorGroupsFor(r.bloodGroup as BG) as BloodGroup[];
  const cutoff = new Date(Date.now() - env.MIN_DONATION_INTERVAL_DAYS * 864e5);
  const candidates = await prisma.donorProfile.findMany({
    where: {
      bloodGroup: { in: groups }, available: true,
      user: { status: 'ACTIVE', id: { not: r.requesterId } },
      OR: [{ lastDonationDate: null }, { lastDonationDate: { lte: cutoff } }]
    },
    include: { user: { select: { id: true, name: true } } }
  });
  const history = await prisma.donorResponse.groupBy({ by: ['donorId', 'decision'], _count: true, where: { donorId: { in: candidates.map((c) => c.userId) } } });
  const h = r.hospital;
  return candidates.map((c) => {
    const km = c.shareLocation && c.lat != null && c.lng != null && h.lat != null && h.lng != null ? haversineKm(c.lat, c.lng, h.lat, h.lng) : null;
    const inRange = km != null ? km <= env.DEFAULT_RADIUS_KM : c.city.trim().toLowerCase() === h.city.trim().toLowerCase();
    const acc = history.find((x) => x.donorId === c.userId && x.decision === 'ACCEPTED')?._count ?? 0;
    const dec = history.find((x) => x.donorId === c.userId && x.decision === 'DECLINED')?._count ?? 0;
    const days = c.lastDonationDate ? Math.floor((Date.now() - c.lastDonationDate.getTime()) / 864e5) : null;
    return {
      userId: c.userId, name: c.user.name, bloodGroup: c.bloodGroup, inRange,
      approxDistanceKm: km == null ? null : approxDistanceKm(km),
      score: scoreDonor({ distanceKm: km, daysSinceLastDonation: days, acceptedBefore: acc, declinedBefore: dec })
    };
  }).filter((x) => x.inRange).sort((a, b) => b.score - a.score);
}

/** After hospital verification: notify the best-ranked compatible donors near the hospital. */
export async function matchAndNotifyDonors(r: FullRequest): Promise<number> {
  const picked = (await rankCandidates(r)).slice(0, 50);
  const h = r.hospital;
  await notifyUsers(picked.map((p) => p.userId), {
    type: 'DONOR_REQUEST', requestId: r.id,
    title: r.urgency === 'CRITICAL' ? 'Critical: verified blood request nearby' : 'Verified blood request nearby',
    body: `${r.units} unit(s) of ${bloodLabel(r.bloodGroup as BG)} needed at ${h.name}, ${h.city}. Open RaktSaathi to respond.`
  });
  return picked.length;
}

export async function verifyRequest(r: FullRequest, actorId: string) {
  await moveStatus(r, 'VERIFIED', actorId, { verifiedAt: new Date(), verifiedById: actorId });
  const fresh = await getRequestOr404(r.id);
  const notified = await matchAndNotifyDonors(fresh);
  await notifyUsers([r.requesterId], { type: 'REQUEST_VERIFIED', title: 'Your request was verified', body: `${r.hospital.name} verified request ${r.code}. ${notified} nearby donor(s) were notified.`, requestId: r.id });
  const payload = { id: r.id, code: r.code, status: 'VERIFIED', donorsNotified: notified };
  emitToUser(r.requesterId, 'request.verified', payload);
  emitToHospital(r.hospitalId, 'request.verified', payload);
  emitToRole('DONOR', 'request.verified', { id: r.id }); // donors refetch their list; no patient data in payload
  emitToRole('BLOODBANK', 'request.verified', { id: r.id });
  return { notified };
}

export async function rejectRequest(r: FullRequest, actorId: string, reason: string) {
  await moveStatus(r, 'REJECTED', actorId, { rejectionReason: reason });
  await notifyUsers([r.requesterId], { type: 'REQUEST_REJECTED', title: 'Your request was not verified', body: `${r.hospital.name}: ${reason}`, requestId: r.id });
  const payload = { id: r.id, code: r.code, status: 'REJECTED' };
  emitToUser(r.requesterId, 'request.rejected', payload);
  emitToHospital(r.hospitalId, 'request.rejected', payload);
}

export async function expireOverdueRequests() {
  const overdue = await prisma.bloodRequest.findMany({
    where: { status: { in: ['PENDING_VERIFICATION', 'VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION'] }, requiredBy: { lt: new Date() } }
  });
  for (const r of overdue) {
    await moveStatus(r, 'EXPIRED', null);
    await notifyUsers([r.requesterId], { type: 'REQUEST_EXPIRED', title: 'Request expired', body: `Request ${r.code} passed its required-by time.`, requestId: r.id });
    emitToUser(r.requesterId, 'request.expired', { id: r.id });
  }
  return overdue.length;
}
