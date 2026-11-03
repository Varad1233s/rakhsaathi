import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth, requireRole } from '../middleware/auth';
import { audit, notifyUsers } from '../services/notify';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/stats', asyncHandler(async (_req, res) => {
  const [users, hospitalsPending, banksPending, flagged, byStatus, units, staffPending] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.hospital.count({ where: { status: 'PENDING_VERIFICATION' } }),
    prisma.bloodBank.count({ where: { status: 'PENDING_VERIFICATION' } }),
    prisma.bloodRequest.count({ where: { flagged: true, status: { in: ['PENDING_VERIFICATION', 'VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION'] } } }),
    prisma.bloodRequest.groupBy({ by: ['status'], _count: true }),
    prisma.bankAllocation.aggregate({ _sum: { units: true } }),
    prisma.user.count({ where: { status: 'PENDING_APPROVAL' } })
  ]);
  res.json({
    users: Object.fromEntries(users.map((u) => [u.role, u._count])),
    hospitalsPending, banksPending, flaggedRequests: flagged, staffPending,
    requestsByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    unitsSuppliedByBanks: units._sum.units ?? 0
  });
}));

adminRouter.get('/users', asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const role = req.query.role ? String(req.query.role) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;
  const where: Prisma.UserWhereInput = {
    ...(role ? { role: role as never } : {}), ...(status ? { status: status as never } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {})
  };
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true, hospital: { select: { name: true, status: true } } } });
  res.json({ users });
}));

adminRouter.patch('/users/:id/status', asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) }).parse(req.body);
  const id = String(req.params.id);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, 'User not found');
  if (target.role === 'ADMIN' || target.id === req.user!.id) throw new HttpError(403, 'Admin accounts cannot be changed here');
  await prisma.user.update({ where: { id }, data: { status } });
  await audit(req.user!.id, status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED', 'User', id, { previous: target.status });
  res.json({ ok: true });
}));

adminRouter.get('/hospitals', asyncHandler(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const rows = await prisma.hospital.findMany({
    where: status ? { status: status as never } : {}, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200,
    include: { submissions: { orderBy: { createdAt: 'desc' }, take: 1, include: { submittedBy: { select: { name: true, email: true } } } }, _count: { select: { staff: true, requests: true } } }
  });
  res.json({ hospitals: rows });
}));

const reviewBody = z.object({ lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional(), note: z.string().trim().max(300).optional() });
adminRouter.post('/hospitals/:id/verify', asyncHandler(async (req, res) => {
  const b = reviewBody.parse(req.body ?? {});
  const id = String(req.params.id);
  const h = await prisma.hospital.update({ where: { id }, data: { status: 'VERIFIED', verifiedAt: new Date(), verifiedById: req.user!.id, rejectionReason: null, ...(b.lat != null && b.lng != null ? { lat: b.lat, lng: b.lng } : {}) } });
  await prisma.hospitalSubmission.updateMany({ where: { hospitalId: id, reviewStatus: 'PENDING_VERIFICATION' }, data: { reviewStatus: 'VERIFIED', reviewedById: req.user!.id, reviewedAt: new Date(), reviewNote: b.note } });
  await audit(req.user!.id, 'HOSPITAL_VERIFIED', 'Hospital', id);
  const staff = await prisma.user.findMany({ where: { hospitalId: id }, select: { id: true } });
  await notifyUsers(staff.map((s) => s.id), { type: 'HOSPITAL_VERIFIED', title: 'Hospital verified', body: `${h.name} is now verified. You can verify blood requests.` });
  res.json({ hospital: h });
}));
adminRouter.post('/hospitals/:id/reject', asyncHandler(async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(5).max(300) }).parse(req.body);
  const id = String(req.params.id);
  const h = await prisma.hospital.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
  await prisma.hospitalSubmission.updateMany({ where: { hospitalId: id, reviewStatus: 'PENDING_VERIFICATION' }, data: { reviewStatus: 'REJECTED', reviewedById: req.user!.id, reviewedAt: new Date(), reviewNote: reason } });
  await audit(req.user!.id, 'HOSPITAL_REJECTED', 'Hospital', id, { reason });
  const staff = await prisma.user.findMany({ where: { hospitalId: id }, select: { id: true } });
  await notifyUsers(staff.map((s) => s.id), { type: 'HOSPITAL_REJECTED', title: 'Hospital not verified', body: `${h.name}: ${reason}` });
  res.json({ hospital: h });
}));
adminRouter.post('/hospitals/:id/suspend', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  await prisma.hospital.update({ where: { id }, data: { status: 'SUSPENDED' } });
  await audit(req.user!.id, 'HOSPITAL_SUSPENDED', 'Hospital', id);
  res.json({ ok: true });
}));

adminRouter.get('/bloodbanks', asyncHandler(async (_req, res) => {
  const banks = await prisma.bloodBank.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200, include: { user: { select: { name: true, email: true } } } });
  res.json({ bloodBanks: banks });
}));
adminRouter.post('/bloodbanks/:id/verify', asyncHandler(async (req, res) => {
  const b = reviewBody.parse(req.body ?? {});
  const id = String(req.params.id);
  const bank = await prisma.bloodBank.update({ where: { id }, data: { status: 'VERIFIED', verifiedAt: new Date(), rejectionReason: null, ...(b.lat != null && b.lng != null ? { lat: b.lat, lng: b.lng } : {}) } });
  await audit(req.user!.id, 'BLOODBANK_VERIFIED', 'BloodBank', id);
  await notifyUsers([bank.userId], { type: 'BLOODBANK_VERIFIED', title: 'Blood bank verified', body: `${bank.name} can now fulfil requests.` });
  res.json({ bloodBank: bank });
}));
adminRouter.post('/bloodbanks/:id/reject', asyncHandler(async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(5).max(300) }).parse(req.body);
  const id = String(req.params.id);
  const bank = await prisma.bloodBank.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
  await audit(req.user!.id, 'BLOODBANK_REJECTED', 'BloodBank', id, { reason });
  await notifyUsers([bank.userId], { type: 'BLOODBANK_REJECTED', title: 'Blood bank not verified', body: reason });
  res.json({ bloodBank: bank });
}));

adminRouter.get('/audit-logs', asyncHandler(async (req, res) => {
  const entity = req.query.entity ? String(req.query.entity) : undefined;
  const logs = await prisma.auditLog.findMany({ where: entity ? { entity } : {}, orderBy: { createdAt: 'desc' }, take: 300, include: { actor: { select: { name: true, role: true } } } });
  res.json({ logs });
}));

adminRouter.get('/analytics', asyncHandler(async (_req, res) => {
  const since = new Date(Date.now() - 30 * 864e5);
  const [recent, donors, inventory] = await Promise.all([
    prisma.bloodRequest.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, status: true, bloodGroup: true, verifiedAt: true, units: true } }),
    prisma.donorProfile.groupBy({ by: ['bloodGroup'], _count: true }),
    prisma.bloodInventory.groupBy({ by: ['bloodGroup'], _sum: { units: true } })
  ]);
  const perDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) perDay[new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)] = 0;
  recent.forEach((r) => { const k = r.createdAt.toISOString().slice(0, 10); if (k in perDay) perDay[k]++; });
  const demand: Record<string, number> = {};
  recent.forEach((r) => { demand[r.bloodGroup] = (demand[r.bloodGroup] ?? 0) + r.units; });
  const verified = recent.filter((r) => r.verifiedAt);
  const avgVerifyHours = verified.length ? verified.reduce((s, r) => s + (r.verifiedAt!.getTime() - r.createdAt.getTime()) / 36e5, 0) / verified.length : null;
  const fulfilled = recent.filter((r) => r.status === 'FULFILLED').length;
  res.json({
    perDay: Object.entries(perDay).map(([date, count]) => ({ date, count })),
    demandByGroup: Object.entries(demand).map(([bloodGroup, units]) => ({ bloodGroup, units })),
    donorsByGroup: donors.map((d) => ({ bloodGroup: d.bloodGroup, count: d._count })),
    stockByGroup: inventory.map((i) => ({ bloodGroup: i.bloodGroup, units: i._sum.units ?? 0 })),
    totals: { requests30d: recent.length, fulfilled30d: fulfilled, fulfilmentRate: recent.length ? Math.round((fulfilled / recent.length) * 100) : null, avgVerifyHours: avgVerifyHours == null ? null : Math.round(avgVerifyHours * 10) / 10 }
  });
}));

/** Read-only view of effective runtime configuration (no secrets). */
adminRouter.get('/settings', asyncHandler(async (_req, res) => {
  res.json({ settings: { defaultRadiusKm: env.DEFAULT_RADIUS_KM, minDonationIntervalDays: env.MIN_DONATION_INTERVAL_DAYS, environment: env.NODE_ENV, note: 'Change these in backend/.env and restart the API.' } });
}));
