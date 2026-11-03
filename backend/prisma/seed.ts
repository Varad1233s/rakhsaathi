/* Development seed. Demo hospitals/banks are clearly labelled "Demo" and are NOT real institutions. */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type BloodGroup } from '@prisma/client';

const prisma = new PrismaClient();
const GROUPS: BloodGroup[] = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'];

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@raktsaathi.local').toLowerCase();
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe@12345';
  await prisma.user.upsert({
    where: { email: adminEmail }, update: {},
    create: { email: adminEmail, name: 'RaktSaathi Admin', role: 'ADMIN', passwordHash: await bcrypt.hash(adminPass, 12) }
  });
  console.log(`Admin ready: ${adminEmail}`);
  if (process.env.SEED_DEMO_DATA !== 'true') return;

  const pw = await bcrypt.hash('Demo@12345', 12);
  const hospitals = [
    { name: 'Demo City Hospital', city: 'Kolhapur', address: '1 Demo Road, Kolhapur', phone: '0231000001', lat: 16.705, lng: 74.2433 },
    { name: 'Demo Riverside Medical Centre', city: 'Kolhapur', address: '22 Demo Lane, Kolhapur', phone: '0231000002', lat: 16.7219, lng: 74.2255 },
    { name: 'Demo Metro Hospital', city: 'Pune', address: '5 Demo Street, Pune', phone: '0201000003', lat: 18.5204, lng: 73.8567 }
  ];
  const created = [];
  for (const h of hospitals) {
    const found = await prisma.hospital.findFirst({ where: { name: h.name } });
    created.push(found ?? await prisma.hospital.create({ data: { ...h, status: 'VERIFIED', verifiedAt: new Date() } }));
  }
  await prisma.hospital.findFirst({ where: { name: 'Demo Pending Clinic' } }) ?? await prisma.hospital.create({ data: { name: 'Demo Pending Clinic', city: 'Kolhapur', address: '9 Demo Chowk', phone: '0231000009' } });

  const mk = async (email: string, name: string, role: 'REQUESTER' | 'DONOR' | 'HOSPITAL' | 'BLOODBANK', extra: object = {}) =>
    prisma.user.upsert({ where: { email }, update: {}, create: { email, name, role, passwordHash: pw, phone: '9800000000', ...extra } });

  const req = await mk('requester@demo.local', 'Amit Sharma', 'REQUESTER');
  await prisma.requesterProfile.upsert({ where: { userId: req.id }, update: {}, create: { userId: req.id, city: 'Kolhapur' } });
  await mk('hospital@demo.local', 'Demo Hospital Staff', 'HOSPITAL', { hospitalId: created[0].id });

  const donors: [string, string, BloodGroup, number, number][] = [
    ['arjun@demo.local', 'Arjun Patil', 'O_POS', 16.7123, 74.2501], ['priya@demo.local', 'Priya Kulkarni', 'A_POS', 16.69, 74.25],
    ['sneha@demo.local', 'Sneha Jadhav', 'O_NEG', 16.73, 74.22]
  ];
  for (const [email, name, bg, lat, lng] of donors) {
    const u = await mk(email, name, 'DONOR');
    await prisma.donorProfile.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id, bloodGroup: bg, city: 'Kolhapur', dateOfBirth: new Date('1998-05-12'), shareLocation: true, lat, lng, locationUpdatedAt: new Date() } });
  }

  const bu = await mk('bank@demo.local', 'Demo Blood Bank Manager', 'BLOODBANK');
  const bank = await prisma.bloodBank.upsert({ where: { userId: bu.id }, update: {}, create: { userId: bu.id, name: 'Demo Community Blood Bank', city: 'Kolhapur', address: '3 Demo Park, Kolhapur', phone: '0231000010', lat: 16.71, lng: 74.235, status: 'VERIFIED', verifiedAt: new Date() } });
  for (const g of GROUPS) {
    const units = 6;
    await prisma.bloodInventory.upsert({ where: { bloodBankId_bloodGroup: { bloodBankId: bank.id, bloodGroup: g } }, update: {}, create: { bloodBankId: bank.id, bloodGroup: g, units } });
    const has = await prisma.bloodBatch.findFirst({ where: { bloodBankId: bank.id, bloodGroup: g } });
    if (!has) await prisma.bloodBatch.create({ data: { bloodBankId: bank.id, bloodGroup: g, unitsReceived: units, unitsRemaining: units, expiresAt: new Date(Date.now() + 35 * 864e5) } });
  }
  console.log('Demo data ready. Demo password for all demo users: Demo@12345');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
