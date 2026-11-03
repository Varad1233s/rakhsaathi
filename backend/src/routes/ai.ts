import { Router } from 'express';
import { prisma } from '../config/db';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth, requireRole } from '../middleware/auth';
import { bloodLabel, BLOOD_GROUPS, type BG } from '../utils/bloodGroups';
import { emergencySummary, forecastShortage } from '../utils/ai';
import { getRequestOr404, rankCandidates } from '../services/requestService';

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.get('/requests/:id/outreach', requireRole('HOSPITAL', 'ADMIN'), asyncHandler(async (req, res) => {
  const r = await getRequestOr404(String(req.params.id));
  if (req.user!.role === 'HOSPITAL' && r.hospitalId !== req.user!.hospitalId) throw new HttpError(403, 'Other hospital');
  const ranked = await rankCandidates(r);
  const responded = new Map(r.responses.map((x) => [x.donorId, x.decision]));
  res.json({
    disclaimer: 'Ordering aid only. Clinical eligibility and compatibility are decided by hospital screening.',
    donors: ranked.slice(0, 25).map((d) => ({ name: d.name, bloodGroup: d.bloodGroup, approxDistanceKm: d.approxDistanceKm, priorityScore: d.score, response: responded.get(d.userId) ?? null }))
  });
}));

aiRouter.get('/requests/:id/summary', requireRole('HOSPITAL', 'ADMIN', 'REQUESTER'), asyncHandler(async (req, res) => {
  const r = await getRequestOr404(String(req.params.id));
  const u = req.user!;
  if ((u.role === 'HOSPITAL' && r.hospitalId !== u.hospitalId) || (u.role === 'REQUESTER' && r.requesterId !== u.id)) throw new HttpError(403, 'Not allowed');
  res.json({ summary: emergencySummary({
    code: r.code, bloodGroupLabel: bloodLabel(r.bloodGroup as BG), units: r.units, urgency: r.urgency, hospital: r.hospital.name, city: r.hospital.city,
    requiredBy: r.requiredBy, status: r.status, acceptedDonors: r.responses.filter((x) => x.decision === 'ACCEPTED').length,
    unitsFromBank: r.allocations.reduce((s, a) => s + a.units, 0), patientAge: u.role === 'REQUESTER' ? undefined : r.patient.age
  }) });
}));

aiRouter.get('/forecast', requireRole('BLOODBANK', 'ADMIN'), asyncHandler(async (req, res) => {
  const bank = req.user!.role === 'BLOODBANK' ? await prisma.bloodBank.findUnique({ where: { userId: req.user!.id } }) : null;
  if (req.user!.role === 'BLOODBANK' && !bank) throw new HttpError(404, 'Blood bank missing');
  const since = new Date(Date.now() - 14 * 864e5);
  const [stock, alloc, demand] = await Promise.all([
    prisma.bloodInventory.groupBy({ by: ['bloodGroup'], _sum: { units: true }, where: bank ? { bloodBankId: bank.id } : {} }),
    prisma.bankAllocation.groupBy({ by: ['bloodGroup'], _sum: { units: true }, where: { createdAt: { gte: since }, ...(bank ? { bloodBankId: bank.id } : {}) } }),
    prisma.bloodRequest.groupBy({ by: ['bloodGroup'], _sum: { units: true }, where: { createdAt: { gte: since }, status: { in: ['VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION', 'FULFILLED'] } } })
  ]);
  res.json({
    method: 'Average daily units allocated over the last 14 days vs current stock (days of cover). Statistical estimate, not a guarantee.',
    forecast: BLOOD_GROUPS.map((g) => {
      const s = stock.find((x) => x.bloodGroup === g)?._sum.units ?? 0;
      const a = alloc.find((x) => x.bloodGroup === g)?._sum.units ?? 0;
      const d = demand.find((x) => x.bloodGroup === g)?._sum.units ?? 0;
      return { bloodGroup: g, stock: s, allocated14d: a, verifiedDemand14d: d, ...forecastShortage(s, Math.max(a, 0)) };
    })
  });
}));

aiRouter.get('/report', requireRole('HOSPITAL', 'ADMIN'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.role === 'HOSPITAL' ? req.user!.hospitalId ?? '__none__' : undefined;
  const since = new Date(Date.now() - 7 * 864e5);
  const rows = await prisma.bloodRequest.findMany({ where: { createdAt: { gte: since }, ...(hospitalId ? { hospitalId } : {}) }, select: { status: true, urgency: true, units: true, flagged: true, createdAt: true, verifiedAt: true } });
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const verified = rows.filter((r) => r.verifiedAt);
  const avg = verified.length ? Math.round((verified.reduce((s, r) => s + (r.verifiedAt!.getTime() - r.createdAt.getTime()) / 36e5, 0) / verified.length) * 10) / 10 : null;
  const lines = [
    `Last 7 days: ${rows.length} request(s), ${rows.reduce((s, r) => s + r.units, 0)} unit(s) requested.`,
    `Fulfilled ${count('FULFILLED')}, in progress ${count('VERIFIED') + count('DONOR_ACCEPTED') + count('MEDICAL_COORDINATION')}, waiting for verification ${count('PENDING_VERIFICATION')}, rejected ${count('REJECTED')}, cancelled ${count('CANCELLED')}, expired ${count('EXPIRED')}.`,
    `Critical requests: ${rows.filter((r) => r.urgency === 'CRITICAL').length}. Flagged as possible duplicates: ${rows.filter((r) => r.flagged).length}.`,
    avg != null ? `Average time to verification: ${avg} hour(s).` : 'No verified requests in this window yet.'
  ];
  res.json({ report: lines.join('\n'), generatedAt: new Date() });
}));
