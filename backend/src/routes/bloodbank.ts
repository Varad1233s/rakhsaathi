import { Router } from 'express';
import { z } from 'zod';
import type { BloodGroup } from '@prisma/client';
import { prisma } from '../config/db';
import { asyncHandler, HttpError } from '../utils/http';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth';
import { BLOOD_GROUPS, donorGroupsFor, type BG } from '../utils/bloodGroups';
import { approxDistanceKm, haversineKm, isValidCoord } from '../utils/geo';
import { adjustStock, addBatch, allocateToRequest, discardExpired, ensureInventoryRows } from '../services/bankService';
import { requestInclude, serializeRequest } from '../services/requestService';

const group = z.enum(BLOOD_GROUPS);

export const bankRouter = Router();
bankRouter.use(requireAuth, requireRole('BLOODBANK'));

async function myBank(userId: string) {
  const b = await prisma.bloodBank.findUnique({ where: { userId } });
  if (!b) throw new HttpError(404, 'Blood bank profile missing');
  return b;
}

bankRouter.get('/profile', asyncHandler(async (req, res) => {
  const b = await myBank(req.user!.id);
  res.json({ bloodBank: b });
}));

bankRouter.put('/profile', asyncHandler(async (req, res) => {
  const b = z.object({ phone: z.string().trim().min(7).max(20).optional(), address: z.string().trim().min(5).optional(), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() }).parse(req.body);
  const bank = await myBank(req.user!.id);
  res.json({ bloodBank: await prisma.bloodBank.update({ where: { id: bank.id }, data: b }) });
}));

bankRouter.get('/inventory', asyncHandler(async (req, res) => {
  const bank = await myBank(req.user!.id);
  await ensureInventoryRows(bank.id);
  const [rows, batches] = await Promise.all([
    prisma.bloodInventory.findMany({ where: { bloodBankId: bank.id } }),
    prisma.bloodBatch.findMany({ where: { bloodBankId: bank.id, unitsRemaining: { gt: 0 } }, orderBy: { expiresAt: 'asc' } })
  ]);
  const soon = Date.now() + 7 * 864e5;
  const inventory = BLOOD_GROUPS.map((g) => {
    const row = rows.find((r) => r.bloodGroup === g)!;
    const gb = batches.filter((b) => b.bloodGroup === g);
    return {
      bloodGroup: g, units: row.units, lowThreshold: row.lowThreshold, low: row.units <= row.lowThreshold,
      expiringSoon: gb.filter((b) => b.expiresAt.getTime() > Date.now() && b.expiresAt.getTime() <= soon).reduce((s, b) => s + b.unitsRemaining, 0),
      expired: gb.filter((b) => b.expiresAt.getTime() <= Date.now()).reduce((s, b) => s + b.unitsRemaining, 0)
    };
  });
  res.json({ inventory, status: bank.status });
}));

bankRouter.put('/inventory/:group', asyncHandler(async (req, res) => {
  const g = group.parse(req.params.group) as BloodGroup;
  const b = z.object({ mode: z.enum(['adjust', 'set']), units: z.number().int().min(-10000).max(10000), reason: z.string().trim().min(3).max(200) }).parse(req.body);
  const bank = await myBank(req.user!.id);
  await ensureInventoryRows(bank.id);
  let delta = b.units;
  if (b.mode === 'set') {
    if (b.units < 0) throw new HttpError(400, 'Stock cannot be negative');
    const cur = await prisma.bloodInventory.findUniqueOrThrow({ where: { bloodBankId_bloodGroup: { bloodBankId: bank.id, bloodGroup: g } } });
    delta = b.units - cur.units;
  }
  if (delta === 0) return res.json({ ok: true, unchanged: true });
  const row = await adjustStock(bank.id, g, delta, b.reason, req.user!.id);
  res.json({ ok: true, units: row.units });
}));

bankRouter.put('/inventory/:group/threshold', asyncHandler(async (req, res) => {
  const g = group.parse(req.params.group) as BloodGroup;
  const { lowThreshold } = z.object({ lowThreshold: z.number().int().min(0).max(1000) }).parse(req.body);
  const bank = await myBank(req.user!.id);
  await prisma.bloodInventory.update({ where: { bloodBankId_bloodGroup: { bloodBankId: bank.id, bloodGroup: g } }, data: { lowThreshold } });
  res.json({ ok: true });
}));

bankRouter.get('/batches', asyncHandler(async (req, res) => {
  const bank = await myBank(req.user!.id);
  res.json({ batches: await prisma.bloodBatch.findMany({ where: { bloodBankId: bank.id, unitsRemaining: { gt: 0 } }, orderBy: { expiresAt: 'asc' }, take: 200 }) });
}));
bankRouter.post('/batches', asyncHandler(async (req, res) => {
  const b = z.object({ bloodGroup: group, units: z.number().int().min(1).max(1000), expiresAt: z.coerce.date() }).parse(req.body);
  const bank = await myBank(req.user!.id);
  await ensureInventoryRows(bank.id);
  const row = await addBatch(bank.id, b.bloodGroup as BloodGroup, b.units, b.expiresAt, req.user!.id);
  res.status(201).json({ ok: true, units: row.units });
}));
bankRouter.post('/batches/discard-expired', asyncHandler(async (req, res) => {
  const bank = await myBank(req.user!.id);
  res.json({ ok: true, discarded: await discardExpired(bank.id, req.user!.id) });
}));

bankRouter.get('/history', asyncHandler(async (req, res) => {
  const bank = await myBank(req.user!.id);
  res.json({ logs: await prisma.inventoryLog.findMany({ where: { bloodBankId: bank.id }, orderBy: { createdAt: 'desc' }, take: 300 }) });
}));

bankRouter.get('/requests', asyncHandler(async (req, res) => {
  const bank = await myBank(req.user!.id);
  const [rows, inv] = await Promise.all([
    prisma.bloodRequest.findMany({ where: { status: { in: ['VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION'] }, requiredBy: { gt: new Date() } }, include: requestInclude, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.bloodInventory.findMany({ where: { bloodBankId: bank.id } })
  ]);
  const requests = rows.map((r) => {
    const s = serializeRequest(r, 'BLOODBANK', req.user!.id) as ReturnType<typeof serializeRequest> & { unitsFromBank: number };
    const remaining = r.units - s.unitsFromBank;
    const canSupply = donorGroupsFor(r.bloodGroup as BG).map((g) => ({ bloodGroup: g, available: inv.find((i) => i.bloodGroup === g)?.units ?? 0 })).filter((x) => x.available > 0);
    return { ...s, remaining, canSupply };
  }).filter((r) => r.remaining > 0);
  res.json({ requests });
}));

bankRouter.post('/requests/:id/fulfill', asyncHandler(async (req, res) => {
  const b = z.object({ bloodGroup: group, units: z.number().int().min(1).max(50) }).parse(req.body);
  const bank = await myBank(req.user!.id);
  const out = await allocateToRequest(bank, req.user!.id, String(req.params.id), b.bloodGroup as BloodGroup, b.units);
  res.json({ ok: true, ...out });
}));

bankRouter.get('/allocations', asyncHandler(async (req, res) => {
  const bank = await myBank(req.user!.id);
  const rows = await prisma.bankAllocation.findMany({ where: { bloodBankId: bank.id }, orderBy: { createdAt: 'desc' }, take: 200, include: { request: { select: { code: true, status: true, units: true, hospital: { select: { name: true, city: true } } } } } });
  res.json({ allocations: rows });
}));

/** Any signed-in user: nearby verified blood banks with compatible availability. Caller's own location is optional and not stored. */
export const bloodBanksPublicRouter = Router();
bloodBanksPublicRouter.get('/nearby', requireAuth, asyncHandler(async (req, res) => {
  const bg = req.query.bloodGroup ? group.parse(req.query.bloodGroup) : null;
  const lat = req.query.lat != null ? Number(req.query.lat) : null;
  const lng = req.query.lng != null ? Number(req.query.lng) : null;
  const here = lat != null && lng != null && isValidCoord(lat, lng);
  const banks = await prisma.bloodBank.findMany({ where: { status: 'VERIFIED' }, include: { inventory: true }, take: 100 });
  const wanted = bg ? donorGroupsFor(bg as BG) : null;
  const out = banks.map((b) => {
    const available = wanted ? b.inventory.filter((i) => (wanted as string[]).includes(i.bloodGroup)).reduce((s, i) => s + i.units, 0) : b.inventory.reduce((s, i) => s + i.units, 0);
    return {
      id: b.id, name: b.name, city: b.city, address: b.address, phone: b.phone, lat: b.lat, lng: b.lng, compatibleUnits: available,
      approxDistanceKm: here && b.lat != null && b.lng != null ? approxDistanceKm(haversineKm(lat!, lng!, b.lat, b.lng)) : null
    };
  }).sort((a, b) => (a.approxDistanceKm ?? 1e9) - (b.approxDistanceKm ?? 1e9));
  res.json({ bloodBanks: out });
}));
void optionalAuth;
