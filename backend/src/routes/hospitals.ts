import { Router } from 'express';
import { prisma } from '../config/db';
import { asyncHandler, HttpError } from '../utils/http';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { hospitalInput } from './auth';
import { audit } from '../services/notify';
import { emitToRole } from '../sockets';

export const hospitalsRouter = Router();

/** Public search straight from PostgreSQL. Verified hospitals are selectable; pending ones are shown with their status. */
hospitalsRouter.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const city = String(req.query.city ?? '').trim();
  const rows = await prisma.hospital.findMany({
    where: {
      status: { in: ['VERIFIED', 'PENDING_VERIFICATION'] },
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {})
    },
    orderBy: [{ status: 'desc' }, { name: 'asc' }],
    take: 30,
    select: { id: true, name: true, city: true, address: true, phone: true, status: true, lat: true, lng: true }
  });
  res.json({ hospitals: rows });
}));

/** Add a hospital that is not listed. Always starts as PENDING_VERIFICATION. */
hospitalsRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
  const body = hospitalInput.parse(req.body);
  const dup = await prisma.hospital.findFirst({ where: { name: { equals: body.name, mode: 'insensitive' }, city: { equals: body.city, mode: 'insensitive' } } });
  if (dup) throw new HttpError(409, `${dup.name} (${dup.city}) already exists with status ${dup.status.replace(/_/g, ' ').toLowerCase()}`);
  const h = await prisma.hospital.create({ data: { ...body, status: 'PENDING_VERIFICATION', createdById: req.user!.id } });
  await prisma.hospitalSubmission.create({ data: { hospitalId: h.id, submittedById: req.user!.id, notes: body.additionalInfo } });
  await audit(req.user!.id, 'HOSPITAL_SUBMITTED', 'Hospital', h.id, { name: h.name });
  emitToRole('ADMIN', 'notification.created', { id: `tmp-${h.id}`, type: 'HOSPITAL_SUBMITTED', title: 'Hospital awaiting verification', body: `${h.name}, ${h.city}`, createdAt: new Date() });
  res.status(201).json({ hospital: { id: h.id, name: h.name, city: h.city, status: h.status } });
}));
void optionalAuth;
