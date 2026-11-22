import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { type BloodGroup } from '@prisma/client';

const GROUPS: BloodGroup[] = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'];

export async function ensureDemoSeedRecords() {
  try {
    const existingReqCount = await prisma.bloodRequest.count();
    if (existingReqCount >= 10) {
      console.log(`[RaktSaathi Seed] Already has ${existingReqCount} blood requests. Skipping seed.`);
      return;
    }

    console.log(`[RaktSaathi Seed] Populating complete realistic demo data (12 requests, donor donations, fulfillments)...`);

    const pw = await bcrypt.hash('Demo@12345', 12);

    // 1. Ensure Hospitals
    const hospitalsData = [
      { name: 'Demo City Hospital', city: 'Kolhapur', address: '1 Demo Road, Kolhapur', phone: '0231000001', lat: 16.705, lng: 74.2433 },
      { name: 'Demo Riverside Medical Centre', city: 'Kolhapur', address: '22 Demo Lane, Kolhapur', phone: '0231000002', lat: 16.7219, lng: 74.2255 },
      { name: 'Demo Metro Hospital', city: 'Pune', address: '5 Demo Street, Pune', phone: '0201000003', lat: 18.5204, lng: 73.8567 }
    ];

    const hospitals = [];
    for (const h of hospitalsData) {
      let hosp = await prisma.hospital.findFirst({ where: { name: h.name } });
      if (!hosp) {
        hosp = await prisma.hospital.create({ data: { ...h, status: 'VERIFIED', verifiedAt: new Date() } });
      }
      hospitals.push(hosp);
    }

    const hCity = hospitals[0];
    const hRiver = hospitals[1];
    const hMetro = hospitals[2];

    // 2. Ensure Users
    const mkUser = async (email: string, name: string, role: 'REQUESTER' | 'DONOR' | 'HOSPITAL' | 'BLOODBANK', extra: object = {}) => {
      let u = await prisma.user.findUnique({ where: { email } });
      if (!u) {
        u = await prisma.user.create({ data: { email, name, role, passwordHash: pw, phone: '9800000000', status: 'ACTIVE', ...extra } });
      }
      return u;
    };

    // Requesters
    const reqAmit = await mkUser('requester@demo.local', 'Amit Sharma', 'REQUESTER');
    await prisma.requesterProfile.upsert({ where: { userId: reqAmit.id }, update: {}, create: { userId: reqAmit.id, city: 'Kolhapur' } });

    const reqVikram = await mkUser('vikram@demo.local', 'Vikram Deshmukh', 'REQUESTER');
    await prisma.requesterProfile.upsert({ where: { userId: reqVikram.id }, update: {}, create: { userId: reqVikram.id, city: 'Pune' } });

    const reqNeha = await mkUser('neha@demo.local', 'Neha Joshi', 'REQUESTER');
    await prisma.requesterProfile.upsert({ where: { userId: reqNeha.id }, update: {}, create: { userId: reqNeha.id, city: 'Kolhapur' } });

    // Hospital Staff
    const hospStaff = await mkUser('hospital@demo.local', 'Demo Hospital Staff', 'HOSPITAL', { hospitalId: hCity.id });

    // Donors
    const donorArjun = await mkUser('arjun@demo.local', 'Arjun Patil', 'DONOR');
    await prisma.donorProfile.upsert({
      where: { userId: donorArjun.id },
      update: { lastDonationDate: new Date(Date.now() - 2 * 864e5) },
      create: { userId: donorArjun.id, bloodGroup: 'O_POS', city: 'Kolhapur', dateOfBirth: new Date('1998-05-12'), shareLocation: true, lat: 16.7123, lng: 74.2501, lastDonationDate: new Date(Date.now() - 2 * 864e5) }
    });

    const donorPriya = await mkUser('priya@demo.local', 'Priya Kulkarni', 'DONOR');
    await prisma.donorProfile.upsert({
      where: { userId: donorPriya.id },
      update: { lastDonationDate: new Date(Date.now() - 4 * 864e5) },
      create: { userId: donorPriya.id, bloodGroup: 'A_POS', city: 'Kolhapur', dateOfBirth: new Date('1996-08-22'), shareLocation: true, lat: 16.69, lng: 74.25, lastDonationDate: new Date(Date.now() - 4 * 864e5) }
    });

    const donorSneha = await mkUser('sneha@demo.local', 'Sneha Jadhav', 'DONOR');
    await prisma.donorProfile.upsert({
      where: { userId: donorSneha.id },
      update: { lastDonationDate: new Date(Date.now() - 7 * 864e5) },
      create: { userId: donorSneha.id, bloodGroup: 'O_NEG', city: 'Kolhapur', dateOfBirth: new Date('1999-01-15'), shareLocation: true, lat: 16.73, lng: 74.22, lastDonationDate: new Date(Date.now() - 7 * 864e5) }
    });

    const donorRahul = await mkUser('rahul@demo.local', 'Rahul Shinde', 'DONOR');
    await prisma.donorProfile.upsert({
      where: { userId: donorRahul.id },
      update: { lastDonationDate: new Date(Date.now() - 10 * 864e5) },
      create: { userId: donorRahul.id, bloodGroup: 'B_POS', city: 'Pune', dateOfBirth: new Date('1997-11-04'), shareLocation: true, lat: 18.52, lng: 73.85, lastDonationDate: new Date(Date.now() - 10 * 864e5) }
    });

    // Admin user also as a potential requester
    let admin = await prisma.user.findUnique({ where: { email: 'patilvarad369@gmail.com' } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: 'patilvarad369@gmail.com',
          name: 'Varadraj Patil (Admin)',
          role: 'ADMIN',
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash('Varad123123123@', 12)
        }
      });
    }

    // Blood Bank
    const bankUser = await mkUser('bank@demo.local', 'Demo Blood Bank Manager', 'BLOODBANK');
    const bank = await prisma.bloodBank.upsert({
      where: { userId: bankUser.id },
      update: {},
      create: { userId: bankUser.id, name: 'Demo Community Blood Bank', city: 'Kolhapur', address: '3 Demo Park, Kolhapur', phone: '0231000010', lat: 16.71, lng: 74.235, status: 'VERIFIED', verifiedAt: new Date() }
    });

    // Stock for all groups
    for (const g of GROUPS) {
      await prisma.bloodInventory.upsert({
        where: { bloodBankId_bloodGroup: { bloodBankId: bank.id, bloodGroup: g } },
        update: {},
        create: { bloodBankId: bank.id, bloodGroup: g, units: 12 }
      });
      const hasBatch = await prisma.bloodBatch.findFirst({ where: { bloodBankId: bank.id, bloodGroup: g } });
      if (!hasBatch) {
        await prisma.bloodBatch.create({
          data: { bloodBankId: bank.id, bloodGroup: g, unitsReceived: 12, unitsRemaining: 12, expiresAt: new Date(Date.now() + 35 * 864e5) }
        });
      }
    }

    // 3. Create 12 Realistic Blood Requests with Full Lifecycle Records
    const requestsData = [
      // --- 6 FULFILLED RECORDS (Requester received blood, donor donated blood) ---
      {
        code: 'RS-2026-FL001',
        requesterId: reqAmit.id,
        hospitalId: hCity.id,
        patientName: 'Amit Sharma',
        patientAge: 28,
        relationship: 'Self',
        bloodGroup: 'O_POS' as BloodGroup,
        units: 2,
        urgency: 'CRITICAL' as const,
        status: 'FULFILLED' as const,
        notes: 'Post-accident emergency orthopedic surgery. 2 units whole blood required urgently.',
        createdAt: new Date(Date.now() - 3 * 864e5),
        verifiedAt: new Date(Date.now() - 2.8 * 864e5),
        fulfilledAt: new Date(Date.now() - 2 * 864e5),
        donorResponse: {
          donorId: donorArjun.id,
          decision: 'ACCEPTED' as const,
          note: 'Reached hospital, completed screening and donated 1 unit whole blood.',
          respondedAt: new Date(Date.now() - 2.5 * 864e5)
        }
      },
      {
        code: 'RS-2026-FL002',
        requesterId: reqAmit.id,
        hospitalId: hRiver.id,
        patientName: 'Sunita Sharma',
        patientAge: 54,
        relationship: 'Mother',
        bloodGroup: 'A_POS' as BloodGroup,
        units: 1,
        urgency: 'URGENT' as const,
        status: 'FULFILLED' as const,
        notes: 'Cardiac bypass surgery elective transfusion support.',
        createdAt: new Date(Date.now() - 5 * 864e5),
        verifiedAt: new Date(Date.now() - 4.8 * 864e5),
        fulfilledAt: new Date(Date.now() - 4 * 864e5),
        donorResponse: {
          donorId: donorPriya.id,
          decision: 'ACCEPTED' as const,
          note: 'Donated 1 unit packed red blood cells. Glad to help!',
          respondedAt: new Date(Date.now() - 4.5 * 864e5)
        }
      },
      {
        code: 'RS-2026-FL003',
        requesterId: admin.id,
        hospitalId: hCity.id,
        patientName: 'Ramesh Patil',
        patientAge: 61,
        relationship: 'Father',
        bloodGroup: 'O_NEG' as BloodGroup,
        units: 2,
        urgency: 'CRITICAL' as const,
        status: 'FULFILLED' as const,
        notes: 'Gastrointestinal bleeding emergency. Rare universal donor units required.',
        createdAt: new Date(Date.now() - 8 * 864e5),
        verifiedAt: new Date(Date.now() - 7.8 * 864e5),
        fulfilledAt: new Date(Date.now() - 7 * 864e5),
        donorResponse: {
          donorId: donorSneha.id,
          decision: 'ACCEPTED' as const,
          note: 'Voluntary donation completed at blood bank center.',
          respondedAt: new Date(Date.now() - 7.5 * 864e5)
        },
        allocation: {
          bloodBankId: bank.id,
          bloodGroup: 'O_NEG' as BloodGroup,
          units: 1
        }
      },
      {
        code: 'RS-2026-FL004',
        requesterId: reqVikram.id,
        hospitalId: hMetro.id,
        patientName: 'Ananya Deshmukh',
        patientAge: 8,
        relationship: 'Daughter',
        bloodGroup: 'B_POS' as BloodGroup,
        units: 1,
        urgency: 'NORMAL' as const,
        status: 'FULFILLED' as const,
        notes: 'Thalassemia regular monthly blood transfusion protocol.',
        createdAt: new Date(Date.now() - 11 * 864e5),
        verifiedAt: new Date(Date.now() - 10.8 * 864e5),
        fulfilledAt: new Date(Date.now() - 10 * 864e5),
        donorResponse: {
          donorId: donorRahul.id,
          decision: 'ACCEPTED' as const,
          note: 'Completed voluntary donation for pediatric patient.',
          respondedAt: new Date(Date.now() - 10.5 * 864e5)
        }
      },
      {
        code: 'RS-2026-FL005',
        requesterId: donorArjun.id, // Donor requesting for family
        hospitalId: hCity.id,
        patientName: 'Meena Patil',
        patientAge: 22,
        relationship: 'Sister',
        bloodGroup: 'O_POS' as BloodGroup,
        units: 2,
        urgency: 'URGENT' as const,
        status: 'FULFILLED' as const,
        notes: 'Dengue with severe thrombocytopenia. Platelet and PRBC support.',
        createdAt: new Date(Date.now() - 15 * 864e5),
        verifiedAt: new Date(Date.now() - 14.8 * 864e5),
        fulfilledAt: new Date(Date.now() - 14 * 864e5),
        allocation: {
          bloodBankId: bank.id,
          bloodGroup: 'O_POS' as BloodGroup,
          units: 2
        }
      },
      {
        code: 'RS-2026-FL006',
        requesterId: reqNeha.id,
        hospitalId: hRiver.id,
        patientName: 'Rajesh Joshi',
        patientAge: 35,
        relationship: 'Husband',
        bloodGroup: 'AB_POS' as BloodGroup,
        units: 1,
        urgency: 'NORMAL' as const,
        status: 'FULFILLED' as const,
        notes: 'Elective laparoscopic hernia repair pre-operative buffer unit.',
        createdAt: new Date(Date.now() - 21 * 864e5),
        verifiedAt: new Date(Date.now() - 20.8 * 864e5),
        fulfilledAt: new Date(Date.now() - 20 * 864e5),
        allocation: {
          bloodBankId: bank.id,
          bloodGroup: 'AB_POS' as BloodGroup,
          units: 1
        }
      },

      // --- 2 DONOR_ACCEPTED RECORDS (Active live coordination in progress) ---
      {
        code: 'RS-2026-AC007',
        requesterId: reqAmit.id,
        hospitalId: hCity.id,
        patientName: 'Kavita Sharma',
        patientAge: 27,
        relationship: 'Wife',
        bloodGroup: 'A_POS' as BloodGroup,
        units: 1,
        urgency: 'CRITICAL' as const,
        status: 'DONOR_ACCEPTED' as const,
        notes: 'Emergency C-section delivery hemorrhage. Attending surgeon on standby.',
        createdAt: new Date(Date.now() - 2 * 36e5),
        verifiedAt: new Date(Date.now() - 1.5 * 36e5),
        requiredBy: new Date(Date.now() + 24 * 36e5),
        donorResponse: {
          donorId: donorPriya.id,
          decision: 'ACCEPTED' as const,
          note: 'Confirmed. On the way to hospital, reaching in 20 minutes.',
          respondedAt: new Date(Date.now() - 1 * 36e5)
        }
      },
      {
        code: 'RS-2026-AC008',
        requesterId: admin.id,
        hospitalId: hRiver.id,
        patientName: 'Deepa Shinde',
        patientAge: 31,
        relationship: 'Cousin',
        bloodGroup: 'O_POS' as BloodGroup,
        units: 2,
        urgency: 'URGENT' as const,
        status: 'DONOR_ACCEPTED' as const,
        notes: 'Severe anemia pre-operative stabilization before abdominal surgery.',
        createdAt: new Date(Date.now() - 4 * 36e5),
        verifiedAt: new Date(Date.now() - 3.5 * 36e5),
        requiredBy: new Date(Date.now() + 36 * 36e5),
        donorResponse: {
          donorId: donorArjun.id,
          decision: 'ACCEPTED' as const,
          note: 'Available and fit. Traveling to hospital now.',
          respondedAt: new Date(Date.now() - 2.5 * 36e5)
        }
      },

      // --- 2 VERIFIED RECORDS (Hospital verified, seeking matching donors nearby) ---
      {
        code: 'RS-2026-VR009',
        requesterId: reqVikram.id,
        hospitalId: hCity.id,
        patientName: 'Tanmay Deshmukh',
        patientAge: 42,
        relationship: 'Brother',
        bloodGroup: 'O_NEG' as BloodGroup,
        units: 2,
        urgency: 'CRITICAL' as const,
        status: 'VERIFIED' as const,
        notes: 'Highway accident polytrauma patient in ICU. Awaiting matching O- donors.',
        createdAt: new Date(Date.now() - 1 * 36e5),
        verifiedAt: new Date(Date.now() - 0.5 * 36e5),
        requiredBy: new Date(Date.now() + 48 * 36e5)
      },
      {
        code: 'RS-2026-VR010',
        requesterId: reqNeha.id,
        hospitalId: hMetro.id,
        patientName: 'Snehal Pawar',
        patientAge: 29,
        relationship: 'Friend',
        bloodGroup: 'B_NEG' as BloodGroup,
        units: 1,
        urgency: 'URGENT' as const,
        status: 'VERIFIED' as const,
        notes: 'Chronic kidney disease patient requiring immediate blood component.',
        createdAt: new Date(Date.now() - 3 * 36e5),
        verifiedAt: new Date(Date.now() - 2 * 36e5),
        requiredBy: new Date(Date.now() + 72 * 36e5)
      },

      // --- 2 PENDING_VERIFICATION RECORDS (Awaiting doctor review) ---
      {
        code: 'RS-2026-PV011',
        requesterId: reqAmit.id,
        hospitalId: hCity.id,
        patientName: 'Nilesh Gaikwad',
        patientAge: 48,
        relationship: 'Neighbor',
        bloodGroup: 'AB_NEG' as BloodGroup,
        units: 1,
        urgency: 'NORMAL' as const,
        status: 'PENDING_VERIFICATION' as const,
        notes: 'Spinal fusion surgery scheduled for early next week.',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        requiredBy: new Date(Date.now() + 96 * 36e5)
      },
      {
        code: 'RS-2026-PV012',
        requesterId: admin.id,
        hospitalId: hRiver.id,
        patientName: 'Ajay Chougule',
        patientAge: 34,
        relationship: 'Colleague',
        bloodGroup: 'B_POS' as BloodGroup,
        units: 2,
        urgency: 'URGENT' as const,
        status: 'PENDING_VERIFICATION' as const,
        notes: 'Burn unit ICU patient requiring whole blood support.',
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
        requiredBy: new Date(Date.now() + 48 * 36e5)
      }
    ];

    for (const rd of requestsData) {
      const existing = await prisma.bloodRequest.findUnique({ where: { code: rd.code } });
      if (existing) continue;

      const patient = await prisma.patient.create({
        data: {
          name: rd.patientName,
          age: rd.patientAge,
          bloodGroup: rd.bloodGroup,
          relationship: rd.relationship,
          isRequester: rd.relationship === 'Self'
        }
      });

      const req = await prisma.bloodRequest.create({
        data: {
          code: rd.code,
          requesterId: rd.requesterId,
          patientId: patient.id,
          hospitalId: rd.hospitalId,
          bloodGroup: rd.bloodGroup,
          units: rd.units,
          urgency: rd.urgency,
          requiredBy: rd.requiredBy || new Date(Date.now() + 48 * 36e5),
          notes: rd.notes,
          status: rd.status,
          verifiedAt: rd.verifiedAt || null,
          verifiedById: rd.verifiedAt ? hospStaff.id : null,
          fulfilledAt: rd.fulfilledAt || null,
          createdAt: rd.createdAt
        }
      });

      if (rd.donorResponse) {
        await prisma.donorResponse.create({
          data: {
            requestId: req.id,
            donorId: rd.donorResponse.donorId,
            decision: rd.donorResponse.decision,
            note: rd.donorResponse.note,
            createdAt: rd.donorResponse.respondedAt
          }
        });
      }

      if (rd.allocation) {
        await prisma.bankAllocation.create({
          data: {
            requestId: req.id,
            bloodBankId: rd.allocation.bloodBankId,
            bloodGroup: rd.allocation.bloodGroup,
            units: rd.allocation.units,
            createdAt: rd.fulfilledAt || new Date()
          }
        });
      }
    }

    console.log(`[RaktSaathi Seed] Complete! Successfully seeded 12 realistic blood donation & fulfillment records.`);
  } catch (err) {
    console.error(`[RaktSaathi Seed] Error populating demo seed records:`, err);
  }
}
