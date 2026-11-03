import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db';
import { asyncHandler, HttpError } from '../utils/http';
import { requireAuth, signToken } from '../middleware/auth';
import { BLOOD_GROUPS } from '../utils/bloodGroups';
import { audit } from '../services/notify';
import { ensureInventoryRows } from '../services/bankService';
import { emitToRole } from '../sockets';

export const hospitalInput = z.object({
  name: z.string().trim().min(3).max(150),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  additionalInfo: z.string().trim().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional()
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  phone: z.string().trim().min(7).max(20).optional(),
  role: z.enum(['REQUESTER', 'DONOR', 'HOSPITAL', 'BLOODBANK']),
  donor: z.object({ bloodGroup: z.enum(BLOOD_GROUPS), city: z.string().trim().min(2), dateOfBirth: z.string(), lastDonationDate: z.string().optional() }).optional(),
  hospitalId: z.string().optional(),
  newHospital: hospitalInput.optional(),
  bloodBank: hospitalInput.omit({ additionalInfo: true }).optional()
});

export function publicUser(u: { id: string; name: string; email: string; role: string; phone: string | null; hospitalId: string | null; status: string }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, hospitalId: u.hospitalId, status: u.status };
}

export const authRouter = Router();

authRouter.post('/register', asyncHandler(async (req, res) => {
  const b = registerSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { email: b.email } })) throw new HttpError(409, 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(b.password, 12);
  let status: 'ACTIVE' | 'PENDING_APPROVAL' = 'ACTIVE';

  if (b.role === 'DONOR') {
    if (!b.donor) throw new HttpError(400, 'Donor details are required');
    const dob = new Date(b.donor.dateOfBirth);
    if (Number.isNaN(dob.getTime())) throw new HttpError(400, 'Invalid date of birth');
    const age = (Date.now() - dob.getTime()) / (365.25 * 864e5);
    if (age < 18) throw new HttpError(400, 'Donors must be at least 18 years old');
  }
  if (b.role === 'HOSPITAL') {
    if (!b.hospitalId && !b.newHospital) throw new HttpError(400, 'Select a hospital or add a new one');
    if (b.hospitalId) {
      if (!(await prisma.hospital.findUnique({ where: { id: b.hospitalId } }))) throw new HttpError(404, 'Hospital not found');
      status = 'PENDING_APPROVAL'; // staff joining an existing hospital need admin approval
    }
  }
  if (b.role === 'BLOODBANK' && !b.bloodBank) throw new HttpError(400, 'Blood bank details are required');

  const user = await prisma.$transaction(async (tx) => {
    let hospitalId: string | null = null;
    if (b.role === 'HOSPITAL') {
      if (b.newHospital) {
        const h = await tx.hospital.create({ data: { ...b.newHospital, status: 'PENDING_VERIFICATION' } }); // never auto-verified
        await tx.hospitalSubmission.create({ data: { hospitalId: h.id, notes: b.newHospital.additionalInfo } });
        hospitalId = h.id;
      } else hospitalId = b.hospitalId!;
    }
    const u = await tx.user.create({ data: { name: b.name, email: b.email, passwordHash, phone: b.phone, role: b.role, status, hospitalId } });
    if (b.role === 'REQUESTER') await tx.requesterProfile.create({ data: { userId: u.id } });
    if (b.role === 'DONOR') {
      await tx.donorProfile.create({ data: { userId: u.id, bloodGroup: b.donor!.bloodGroup, city: b.donor!.city, dateOfBirth: new Date(b.donor!.dateOfBirth), lastDonationDate: b.donor!.lastDonationDate ? new Date(b.donor!.lastDonationDate) : null } });
    }
    if (b.role === 'BLOODBANK') await tx.bloodBank.create({ data: { userId: u.id, ...b.bloodBank!, status: 'PENDING_VERIFICATION' } });
    if (b.role === 'HOSPITAL' && b.newHospital) await tx.hospitalSubmission.updateMany({ where: { hospitalId: hospitalId! }, data: { submittedById: u.id } });
    return u;
  });
  if (b.role === 'BLOODBANK') {
    const bank = await prisma.bloodBank.findUnique({ where: { userId: user.id } });
    if (bank) await ensureInventoryRows(bank.id);
  }
  await audit(user.id, 'USER_REGISTERED', 'User', user.id, { role: b.role });
  if (b.role === 'HOSPITAL' || b.role === 'BLOODBANK') emitToRole('ADMIN', 'notification.created', { type: 'VERIFICATION_NEEDED', title: 'New verification pending', body: `${b.role} registration awaits review`, id: `tmp-${user.id}`, createdAt: new Date() });

  if (status === 'PENDING_APPROVAL') return res.status(202).json({ pendingApproval: true, message: 'Account created. An admin must approve your access to this hospital before you can sign in.' });
  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) throw new HttpError(401, 'Invalid email or password');
  if (user.status === 'PENDING_APPROVAL') throw new HttpError(403, 'Your account is awaiting admin approval');
  if (user.status === 'SUSPENDED') throw new HttpError(403, 'This account has been suspended');
  await audit(user.id, 'USER_LOGIN', 'User', user.id);
  res.json({ token: signToken(user.id), user: publicUser(user) });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, include: { hospital: true, bloodBank: true, donorProfile: true } });
  const { donorProfile, hospital, bloodBank } = user;
  res.json({
    user: publicUser(user),
    hospital: hospital ? { id: hospital.id, name: hospital.name, city: hospital.city, status: hospital.status, rejectionReason: hospital.rejectionReason } : null,
    bloodBank: bloodBank ? { id: bloodBank.id, name: bloodBank.name, city: bloodBank.city, status: bloodBank.status } : null,
    donor: donorProfile ? { bloodGroup: donorProfile.bloodGroup, city: donorProfile.city, available: donorProfile.available, shareLocation: donorProfile.shareLocation, hasLocation: donorProfile.lat != null, lastDonationDate: donorProfile.lastDonationDate } : null
  });
}));
