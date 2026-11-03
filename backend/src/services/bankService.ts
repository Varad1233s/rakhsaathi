import type { BloodGroup, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { HttpError } from '../utils/http';
import { BLOOD_GROUPS, bloodLabel, canDonate, type BG } from '../utils/bloodGroups';
import { audit, hospitalStaffIds, notifyUsers } from './notify';
import { canTransition } from '../utils/transitions';
import { emitToBank, emitToHospital, emitToUser } from '../sockets';

export async function ensureInventoryRows(bloodBankId: string) {
  await prisma.bloodInventory.createMany({ data: BLOOD_GROUPS.map((g) => ({ bloodBankId, bloodGroup: g as BloodGroup })), skipDuplicates: true });
}

/** Adjust stock by delta (can be negative). Writes an InventoryLog row. */
export async function adjustStock(bloodBankId: string, group: BloodGroup, delta: number, reason: string, actorId: string | null) {
  return prisma.$transaction(async (tx) => {
    await tx.bloodInventory.upsert({ where: { bloodBankId_bloodGroup: { bloodBankId, bloodGroup: group } }, create: { bloodBankId, bloodGroup: group }, update: {} });
    if (delta < 0) {
      const r = await tx.bloodInventory.updateMany({ where: { bloodBankId, bloodGroup: group, units: { gte: -delta } }, data: { units: { increment: delta } } });
      if (r.count === 0) throw new HttpError(409, 'Not enough stock for this change');
      await consumeBatches(tx, bloodBankId, group, -delta);
    } else {
      await tx.bloodInventory.update({ where: { bloodBankId_bloodGroup: { bloodBankId, bloodGroup: group } }, data: { units: { increment: delta } } });
    }
    const row = await tx.bloodInventory.findUniqueOrThrow({ where: { bloodBankId_bloodGroup: { bloodBankId, bloodGroup: group } } });
    await tx.inventoryLog.create({ data: { bloodBankId, bloodGroup: group, change: delta, balanceAfter: row.units, reason, actorId } });
    return row;
  });
}

type Tx = Prisma.TransactionClient;
/** First-expiring-first-out over unexpired batches (best effort; inventory.units stays authoritative). */
async function consumeBatches(tx: Tx, bloodBankId: string, group: BloodGroup, units: number) {
  let left = units;
  const batches = await tx.bloodBatch.findMany({ where: { bloodBankId, bloodGroup: group, unitsRemaining: { gt: 0 }, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: 'asc' } });
  for (const b of batches) {
    if (left <= 0) break;
    const take = Math.min(left, b.unitsRemaining);
    await tx.bloodBatch.update({ where: { id: b.id }, data: { unitsRemaining: { decrement: take } } });
    left -= take;
  }
}

export async function addBatch(bloodBankId: string, group: BloodGroup, units: number, expiresAt: Date, actorId: string) {
  if (expiresAt.getTime() <= Date.now()) throw new HttpError(400, 'Expiry date must be in the future');
  await prisma.bloodBatch.create({ data: { bloodBankId, bloodGroup: group, unitsReceived: units, unitsRemaining: units, expiresAt } });
  return adjustStock(bloodBankId, group, units, `Batch received (expires ${expiresAt.toISOString().slice(0, 10)})`, actorId);
}

/** Remove units from expired batches and from stock. */
export async function discardExpired(bloodBankId: string, actorId: string) {
  const expired = await prisma.bloodBatch.findMany({ where: { bloodBankId, unitsRemaining: { gt: 0 }, expiresAt: { lte: new Date() } } });
  let total = 0;
  for (const b of expired) {
    const inv = await prisma.bloodInventory.findUnique({ where: { bloodBankId_bloodGroup: { bloodBankId, bloodGroup: b.bloodGroup } } });
    const n = Math.min(b.unitsRemaining, inv?.units ?? 0);
    await prisma.bloodBatch.update({ where: { id: b.id }, data: { unitsRemaining: 0 } });
    if (n > 0) { await adjustStockNoBatch(bloodBankId, b.bloodGroup, -n, 'Expired units discarded', actorId); total += n; }
  }
  return total;
}
async function adjustStockNoBatch(bloodBankId: string, group: BloodGroup, delta: number, reason: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.bloodInventory.update({ where: { bloodBankId_bloodGroup: { bloodBankId, bloodGroup: group } }, data: { units: { increment: delta } } });
    await tx.inventoryLog.create({ data: { bloodBankId, bloodGroup: group, change: delta, balanceAfter: r.units, reason, actorId } });
  });
}

/** Partial or full fulfilment of a verified request from a bank's stock. */
export async function allocateToRequest(bank: { id: string; name: string; status: string }, actorId: string, requestId: string, group: BloodGroup, units: number) {
  if (bank.status !== 'VERIFIED') throw new HttpError(403, 'Your blood bank must be verified by an admin before fulfilling requests');
  const request = await prisma.bloodRequest.findUnique({ where: { id: requestId }, include: { allocations: true, hospital: true } });
  if (!request) throw new HttpError(404, 'Request not found');
  if (!['VERIFIED', 'DONOR_ACCEPTED', 'MEDICAL_COORDINATION'].includes(request.status)) throw new HttpError(409, `Request is ${request.status}; it cannot receive units`);
  if (!canDonate(group as BG, request.bloodGroup as BG)) throw new HttpError(400, `${bloodLabel(group as BG)} units are not compatible with a ${bloodLabel(request.bloodGroup as BG)} request`);
  const already = request.allocations.reduce((s, a) => s + a.units, 0);
  const remaining = request.units - already;
  if (remaining <= 0) throw new HttpError(409, 'This request is already fully supplied');
  if (units > remaining) throw new HttpError(400, `Only ${remaining} unit(s) still needed`);

  await adjustStock(bank.id, group, -units, `Allocated to ${request.code}`, actorId);
  await prisma.bankAllocation.create({ data: { requestId, bloodBankId: bank.id, bloodGroup: group, units } });
  await audit(actorId, 'BANK_ALLOCATION', 'BloodRequest', requestId, { bank: bank.name, group, units });

  const fully = already + units >= request.units;
  if (fully && request.status !== 'MEDICAL_COORDINATION' && canTransition(request.status as never, 'MEDICAL_COORDINATION')) {
    await prisma.bloodRequest.update({ where: { id: requestId }, data: { status: 'MEDICAL_COORDINATION' } });
    await audit(actorId, 'REQUEST_MEDICAL_COORDINATION', 'BloodRequest', requestId, { reason: 'Fully supplied by blood bank' });
  }
  const msg = `${bank.name} allocated ${units} unit(s) of ${bloodLabel(group as BG)} to ${request.code} (${already + units}/${request.units}).`;
  await notifyUsers([request.requesterId, ...(await hospitalStaffIds(request.hospitalId))], { type: 'BANK_ALLOCATION', title: fully ? 'Blood bank can supply all units' : 'Blood bank supplied some units', body: msg, requestId });
  const payload = { id: requestId, code: request.code, supplied: already + units, needed: request.units };
  emitToUser(request.requesterId, 'bloodbank.updated', payload);
  emitToHospital(request.hospitalId, 'bloodbank.updated', payload);
  emitToBank(bank.id, 'bloodbank.updated', payload);
  return { supplied: already + units, needed: request.units, fully };
}
