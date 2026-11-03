import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth, requireRole } from '../middleware/auth';
import { approxDistanceKm, haversineKm, isValidCoord } from '../utils/geo';
import { bloodLabel, canDonate, recipientsFor, type BG } from '../utils/bloodGroups';
import { OPEN_FOR_DONORS, canTransition } from '../utils/transitions';
import { requestInclude, serializeRequest, moveStatus, getRequestOr404, type FullRequest } from '../services/requestService';
import { audit, hospitalStaffIds, notifyUsers } from '../services/notify';
import { emitToHospital, emitToUser } from '../sockets';
import type { BloodGroup } from '@prisma/client';

export const donorRouter = Router();
donorRouter.use(requireAuth, requireRole('DONOR'));

async function myProfile(userId: string) {
  const p = await prisma.donorProfile.findUnique({ where: { userId } });
  if (!p) throw new HttpError(404, 'Donor profile missing');
  return p;
}
const publicProfile = (p: Awaited<ReturnType<typeof myProfile>>) => ({
  bloodGroup: p.bloodGroup, city: p.city, available: p.available, shareLocation: p.shareLocation,
  hasLocation: p.lat != null, locationUpdatedAt: p.locationUpdatedAt, lastDonationDate: p.lastDonationDate
});

donorRouter.get('/profile', asyncHandler(async (req, res) => {
  const [p, u] = await Promise.all([myProfile(req.user!.id), prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } })]);
  res.json({ profile: { ...publicProfile(p), name: u.name, phone: u.phone, email: u.email } });
}));

donorRouter.put('/profile', asyncHandler(async (req, res) => {
  const b = z.object({
    phone: z.string().trim().min(7).max(20).optional(), city: z.string().trim().min(2).optional(),
    available: z.boolean().optional(), shareLocation: z.boolean().optional(), lastDonationDate: z.string().nullable().optional()
  }).parse(req.body);
  if (b.phone) await prisma.user.update({ where: { id: req.user!.id }, data: { phone: b.phone } });
  const data: Record<string, unknown> = {};
  if (b.city) data.city = b.city;
  if (b.available !== undefined) data.available = b.available;
  if (b.shareLocation !== undefined) { data.shareLocation = b.shareLocation; if (!b.shareLocation) Object.assign(data, { lat: null, lng: null, locationAccuracy: null, locationUpdatedAt: null }); }
  if (b.lastDonationDate !== undefined) data.lastDonationDate = b.lastDonationDate ? new Date(b.lastDonationDate) : null;
  const p = await prisma.donorProfile.update({ where: { userId: req.user!.id }, data: data as never });
  res.json({ profile: publicProfile(p) });
}));

/** Stores the donor's position privately (used only for server-side distance). The response never echoes coordinates. */
donorRouter.put('/location', asyncHandler(async (req, res) => {
  const b = z.object({ lat: z.number(), lng: z.number(), accuracy: z.number().min(0).max(100000).optional() }).parse(req.body);
  if (!isValidCoord(b.lat, b.lng)) throw new HttpError(400, 'Invalid coordinates');
  const p = await prisma.donorProfile.update({ where: { userId: req.user!.id }, data: { lat: b.lat, lng: b.lng, locationAccuracy: b.accuracy, locationUpdatedAt: new Date(), shareLocation: true } });
  emitToUser(req.user!.id, 'donor.location.updated', { updatedAt: p.locationUpdatedAt }); // only to the donor's own sessions
  res.json({ ok: true, updatedAt: p.locationUpdatedAt });
}));

donorRouter.delete('/location', asyncHandler(async (req, res) => {
  const p = await prisma.donorProfile.update({ where: { userId: req.user!.id }, data: { lat: null, lng: null, locationAccuracy: null, locationUpdatedAt: null, shareLocation: false } });
  res.json({ profile: publicProfile(p) });
}));

function donorView(r: FullRequest, me: string, profile: Awaited<ReturnType<typeof myProfile>>) {
  const h = r.hospital;
  const km = profile.shareLocation && profile.lat != null && profile.lng != null && h.lat != null && h.lng != null ? haversineKm(profile.lat, profile.lng, h.lat, h.lng) : null;
  const mine = r.responses.find((x) => x.donorId === me);
  return { ...serializeRequest(r, 'DONOR', me), approxDistanceKm: km == null ? null : approxDistanceKm(km), myResponse: mine ? { decision: mine.decision, at: mine.createdAt } : null };
}

donorRouter.get('/requests', asyncHandler(async (req, res) => {
  const me = req.user!.id;
  const profile = await myProfile(me);
  const radius = Number(req.query.radiusKm) > 0 ? Number(req.query.radiusKm) : env.DEFAULT_RADIUS_KM;
  const rows = await prisma.bloodRequest.findMany({
    where: { status: { in: OPEN_FOR_DONORS }, requiredBy: { gt: new Date() }, requesterId: { not: me }, bloodGroup: { in: recipientsFor(profile.bloodGroup as BG) as BloodGroup[] } },
    include: requestInclude, orderBy: { createdAt: 'desc' }, take: 200
  });
  const rank = { CRITICAL: 0, URGENT: 1, NORMAL: 2 } as const;
  const list = rows.map((r) => donorView(r, me, profile)).filter((r) => {
    const rowCity = rows.find((x) => x.id === r.id)!.hospital.city.trim().toLowerCase();
    return r.approxDistanceKm != null ? r.approxDistanceKm <= radius : rowCity === profile.city.trim().toLowerCase();
  }).sort((a, b) => rank[a.urgency] - rank[b.urgency] || (a.approxDistanceKm ?? 1e9) - (b.approxDistanceKm ?? 1e9));
  res.json({ requests: list, mode: profile.shareLocation && profile.lat != null ? 'GPS' : 'CITY', radiusKm: radius });
}));

donorRouter.get('/requests/:id', asyncHandler(async (req, res) => {
  const profile = await myProfile(req.user!.id);
  const r = await getRequestOr404(String(req.params.id));
  const mine = r.responses.some((x) => x.donorId === req.user!.id);
  if (!mine && !OPEN_FOR_DONORS.includes(r.status as never)) throw new HttpError(404, 'Request not available');
  if (!canDonate(profile.bloodGroup as BG, r.bloodGroup as BG)) throw new HttpError(403, 'Your blood group does not match this request');
  res.json({ request: donorView(r, req.user!.id, profile) });
}));

donorRouter.post('/requests/:id/respond', asyncHandler(async (req, res) => {
  const b = z.object({ response: z.enum(['ACCEPTED', 'DECLINED']), note: z.string().trim().max(300).optional() }).parse(req.body);
  const me = req.user!;
  const profile = await myProfile(me.id);
  const r = await getRequestOr404(String(req.params.id));
  if (r.requesterId === me.id) throw new HttpError(400, 'You cannot respond to your own request');
  if (!OPEN_FOR_DONORS.includes(r.status as never)) throw new HttpError(409, 'This request is no longer accepting donors');
  if (!canDonate(profile.bloodGroup as BG, r.bloodGroup as BG)) throw new HttpError(403, 'Your blood group does not match this request');
  const prev = r.responses.find((x) => x.donorId === me.id);
  if (prev?.decision === 'ACCEPTED' && b.response === 'DECLINED') throw new HttpError(409, 'You already said yes. Please contact the hospital to withdraw.');
  await prisma.donorResponse.upsert({
    where: { requestId_donorId: { requestId: r.id, donorId: me.id } },
    create: { requestId: r.id, donorId: me.id, decision: b.response, note: b.note },
    update: { decision: b.response, note: b.note }
  });
  await audit(me.id, 'DONOR_RESPONDED', 'BloodRequest', r.id, { decision: b.response });
  if (b.response === 'ACCEPTED' && r.status === 'VERIFIED' && canTransition('VERIFIED', 'DONOR_ACCEPTED')) await moveStatus(r, 'DONOR_ACCEPTED', me.id);
  if (b.response === 'ACCEPTED') {
    const first = me.name.split(' ')[0];
    await notifyUsers(await hospitalStaffIds(r.hospitalId), { type: 'DONOR_ACCEPTED', title: 'A donor said yes', body: `${me.name} (${bloodLabel(profile.bloodGroup as BG)}) can help with ${r.code}. Please coordinate medical screening.`, requestId: r.id });
    await notifyUsers([r.requesterId], { type: 'DONOR_ACCEPTED', title: 'A donor is willing to help', body: `${first} (${bloodLabel(profile.bloodGroup as BG)}) responded to ${r.code}. The hospital will coordinate screening; this is not medical approval.`, requestId: r.id });
  }
  const payload = { id: r.id, code: r.code, decision: b.response };
  emitToHospital(r.hospitalId, 'donor.responded', payload);
  emitToUser(r.requesterId, 'donor.responded', { id: r.id, code: r.code });
  res.json({ ok: true, decision: b.response, note: 'Your response is saved. Acceptance is not medical approval; the hospital will screen you first.' });
}));

donorRouter.get('/responses', asyncHandler(async (req, res) => {
  const rows = await prisma.donorResponse.findMany({
    where: { donorId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 200,
    include: { request: { include: { hospital: { select: { name: true, city: true } } } } }
  });
  res.json({ responses: rows.map((x) => ({ id: x.id, decision: x.decision, at: x.createdAt, request: { id: x.request.id, code: x.request.code, status: x.request.status, bloodGroup: x.request.bloodGroup, units: x.request.units, urgency: x.request.urgency, hospital: x.request.hospital } })) });
}));
