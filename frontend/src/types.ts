export type Role = 'REQUESTER' | 'DONOR' | 'HOSPITAL' | 'BLOODBANK' | 'ADMIN';
export type RequestStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'DONOR_ACCEPTED' | 'MEDICAL_COORDINATION' | 'FULFILLED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type VerificationStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type Urgency = 'NORMAL' | 'URGENT' | 'CRITICAL';
export const BLOOD_GROUPS = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export interface User { id: string; name: string; email: string; role: Role; phone: string | null; hospitalId: string | null; status: string }
export interface Me {
  user: User;
  hospital: { id: string; name: string; city: string; status: VerificationStatus; rejectionReason: string | null } | null;
  bloodBank: { id: string; name: string; city: string; status: VerificationStatus } | null;
  donor: { bloodGroup: BloodGroup; city: string; available: boolean; shareLocation: boolean; hasLocation: boolean; lastDonationDate: string | null } | null;
}
export interface HospitalLite { id: string; name: string; city: string; address: string; phone: string; status: VerificationStatus; lat: number | null; lng: number | null }
export interface DonorResponseView {
  id: string; decision?: 'ACCEPTED' | 'DECLINED'; donorName?: string; donorFirstName?: string; bloodGroup: BloodGroup | null;
  phone?: string | null; approxDistanceKm: number | null; respondedAt: string; note?: string | null;
}
export interface RequestView {
  id: string; code: string; status: RequestStatus; bloodGroup: BloodGroup; units: number; urgency: Urgency; requiredBy: string;
  notes: string | null; rejectionReason: string | null; createdAt: string; verifiedAt: string | null; fulfilledAt: string | null;
  unitsFromBank: number; acceptedCount: number; flagged?: boolean; flagReason?: string | null;
  hospital: { id: string; name: string; city: string; address: string; phone: string; lat: number | null; lng: number | null };
  patient?: { name?: string; age: number; bloodGroup?: BloodGroup; relationship?: string; isRequester?: boolean };
  requester?: { name: string; phone?: string | null };
  donorResponses?: DonorResponseView[];
  allocations?: { id: string; bloodBank: string; city: string; bloodGroup: BloodGroup; units: number; createdAt: string }[];
  approxDistanceKm?: number | null;
  myResponse?: { decision: 'ACCEPTED' | 'DECLINED'; at: string } | null;
  remaining?: number;
  canSupply?: { bloodGroup: BloodGroup; available: number }[];
}
export interface NotificationItem { id: string; type: string; title: string; body: string; requestId?: string | null; readAt: string | null; createdAt: string }
