import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth, requireRole } from '../middleware/auth';
import { BLOOD_GROUPS, bloodLabel, type BG } from '../utils/bloodGroups';
import { createRequest, getRequestOr404, moveStatus, rejectRequest, requestInclude, serializeRequest, verifyRequest, type FullRequest } from '../services/requestService';
import { notifyUsers, hospitalStaffIds } from '../services/notify';
import { emitToHospital, emitToUser } from '../sockets';

export const requestsRouter = Router();
requestsRouter.use(requireAuth);

const createSchema = z.object({
  forSelf: z.boolean(),
  patient: z.object({ name: z.string().trim().max(100).optional(), age: z.number().int().min(0).max(120), bloodGroup: z.enum(BLOOD_GROUPS), relationship: z.string().trim().max(50).optional() }),
  hospitalId: z.string().min(1),
  units: z.number().int().min(1).max(20),
  urgency: z.enum(['NORMAL', 'URGENT', 'CRITICAL']),
  requiredBy: z.coerce.date(),
  notes: z.string().trim().max(500).optional()
});

requestsRouter.post('/', requireRole('REQUESTER'), asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  const { request, duplicateOf } = await createRequest(req.user!, input as never);
  res.status(201).json({ request: serializeRequest(request, 'REQUESTER', req.user!.id), duplicateWarning: duplicateOf ? `This looks similar to ${duplicateOf}. The hospital may review it as a possible duplicate.` : null });
}));

requestsRouter.get('/', requireRole('REQUESTER', 'HOSPITAL', 'BLOODBANK', 'ADMIN'), asyncHandler(async (req, res) => {
  const u = req.user!;
  const status = req.query.status ? String(req.query.status).split(',') : undefined;
  let where: Prisma.BloodRequestWhereInput = {};
  if (u.role === 'REQUESTER') where = { requesterId: u.id };
  else if (u.role === 'HOSPITAL') where = { hospitalId: u.hospitalId ?? '__none__' };
  else if (u.role === 'BLOODBANK') where = { status: { in: ['VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION'] } };
  if (status && u.role !== 'BLOODBANK') where = { ...where, status: { in: status as never[] } };
  if (u.role === 'ADMIN' && req.query.flagged === '1') where = { ...where, flagged: true };
  const rows = await prisma.bloodRequest.findMany({ where, include: requestInclude, orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ requests: rows.map((r) => serializeRequest(r, u.role, u.id)) });
}));

async function loadScoped(req: { user?: { id: string; role: string; hospitalId: string | null } }, id: string): Promise<FullRequest> {
  const r = await getRequestOr404(id);
  const u = req.user!;
  if (u.role === 'REQUESTER' && r.requesterId !== u.id) throw new HttpError(403, 'Not your request');
  if (u.role === 'HOSPITAL' && r.hospitalId !== u.hospitalId) throw new HttpError(403, 'This request belongs to another hospital');
  if (u.role === 'DONOR') throw new HttpError(403, 'Use the donor endpoints');
  return r;
}

requestsRouter.get('/:id', requireRole('REQUESTER', 'HOSPITAL', 'BLOODBANK', 'ADMIN'), asyncHandler(async (req, res) => {
  const r = await loadScoped(req, String(req.params.id));
  if (req.user!.role === 'BLOODBANK' && !['VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION', 'FULFILLED'].includes(r.status)) throw new HttpError(403, 'Request not open for blood banks');
  res.json({ request: serializeRequest(r, req.user!.role, req.user!.id) });
}));

/** Status timeline from the audit log (no donor identities). */
requestsRouter.get('/:id/timeline', requireRole('REQUESTER', 'HOSPITAL', 'ADMIN'), asyncHandler(async (req, res) => {
  const r = await loadScoped(req, String(req.params.id));
  const logs = await prisma.auditLog.findMany({ where: { entity: 'BloodRequest', entityId: r.id }, orderBy: { createdAt: 'asc' } });
  res.json({ events: logs.map((l) => ({ id: l.id, action: l.action, at: l.createdAt, meta: l.action === 'DONOR_RESPONDED' ? { decision: (l.meta as { decision?: string } | null)?.decision } : (l.meta && typeof l.meta === 'object' && 'to' in l.meta ? { to: (l.meta as { to: string }).to } : null) })) });
}));

async function hospitalGate(req: { user?: { id: string; hospitalId: string | null } }, r: FullRequest) {
  if (r.hospitalId !== req.user!.hospitalId) throw new HttpError(403, 'This request belongs to another hospital');
  if (r.hospital.status !== 'VERIFIED') throw new HttpError(403, 'Your hospital must be verified by an admin before handling requests');
}

requestsRouter.post('/:id/verify', requireRole('HOSPITAL'), asyncHandler(async (req, res) => {
  const r = await getRequestOr404(String(req.params.id));
  await hospitalGate(req, r);
  const out = await verifyRequest(r, req.user!.id);
  res.json({ ok: true, donorsNotified: out.notified });
}));

requestsRouter.post('/:id/reject', requireRole('HOSPITAL'), asyncHandler(async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(5).max(300) }).parse(req.body);
  const r = await getRequestOr404(String(req.params.id));
  await hospitalGate(req, r);
  await rejectRequest(r, req.user!.id, reason);
  res.json({ ok: true });
}));

requestsRouter.post('/:id/coordinate', requireRole('HOSPITAL'), asyncHandler(async (req, res) => {
  const r = await getRequestOr404(String(req.params.id));
  await hospitalGate(req, r);
  await moveStatus(r, 'MEDICAL_COORDINATION', req.user!.id);
  await notifyUsers([r.requesterId], { type: 'MEDICAL_COORDINATION', title: 'Hospital is coordinating screening', body: `${r.hospital.name} has started medical screening and coordination for ${r.code}.`, requestId: r.id });
  emitToUser(r.requesterId, 'request.updated', { id: r.id, status: 'MEDICAL_COORDINATION' });
  emitToHospital(r.hospitalId, 'request.updated', { id: r.id, status: 'MEDICAL_COORDINATION' });
  res.json({ ok: true });
}));

requestsRouter.post('/:id/fulfill', requireRole('HOSPITAL'), asyncHandler(async (req, res) => {
  const r = await getRequestOr404(String(req.params.id));
  await hospitalGate(req, r);
  await moveStatus(r, 'FULFILLED', req.user!.id, { fulfilledAt: new Date() });
  await notifyUsers([r.requesterId, ...r.responses.filter((x) => x.decision === 'ACCEPTED').map((x) => x.donorId)], { type: 'REQUEST_FULFILLED', title: 'Request fulfilled', body: `Request ${r.code} (${bloodLabel(r.bloodGroup as BG)}) has been fulfilled. Thank you!`, requestId: r.id });
  const payload = { id: r.id, code: r.code, status: 'FULFILLED' };
  emitToUser(r.requesterId, 'request.fulfilled', payload);
  emitToHospital(r.hospitalId, 'request.fulfilled', payload);
  res.json({ ok: true });
}));

requestsRouter.post('/:id/cancel', requireRole('REQUESTER'), asyncHandler(async (req, res) => {
  const r = await getRequestOr404(String(req.params.id));
  if (r.requesterId !== req.user!.id) throw new HttpError(403, 'Not your request');
  await moveStatus(r, 'CANCELLED', req.user!.id);
  await notifyUsers(await hospitalStaffIds(r.hospitalId), { type: 'REQUEST_CANCELLED', title: 'Request cancelled', body: `${r.code} was cancelled by the requester.`, requestId: r.id });
  emitToHospital(r.hospitalId, 'request.updated', { id: r.id, status: 'CANCELLED' });
  res.json({ ok: true });
}));
