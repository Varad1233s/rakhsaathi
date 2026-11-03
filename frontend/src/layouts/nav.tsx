import { Bell, Building2, ClipboardList, Droplets, HeartHandshake, History, LayoutDashboard, ListChecks, PackageCheck, Settings, ShieldCheck, User, Users, BarChart3, ScrollText, Hospital, PlusCircle, Boxes } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Role } from '@/types';

export interface NavItem { label: string; to: string; icon: ReactNode; bottom?: boolean }
const i = 20;
export const NAV: Record<Role, NavItem[]> = {
  REQUESTER: [
    { label: 'Dashboard', to: '/requester/dashboard', icon: <LayoutDashboard size={i} />, bottom: true },
    { label: 'Request blood', to: '/requester/request-blood', icon: <PlusCircle size={i} />, bottom: true },
    { label: 'My requests', to: '/requester/requests', icon: <ClipboardList size={i} />, bottom: true },
    { label: 'History', to: '/requester/history', icon: <History size={i} /> },
    { label: 'Notifications', to: '/requester/notifications', icon: <Bell size={i} />, bottom: true },
    { label: 'Profile', to: '/requester/profile', icon: <User size={i} /> }
  ],
  DONOR: [
    { label: 'Dashboard', to: '/donor/dashboard', icon: <LayoutDashboard size={i} />, bottom: true },
    { label: 'Nearby requests', to: '/donor/requests', icon: <Droplets size={i} />, bottom: true },
    { label: 'My responses', to: '/donor/responses', icon: <HeartHandshake size={i} />, bottom: true },
    { label: 'History', to: '/donor/history', icon: <History size={i} />, bottom: true },
    { label: 'Profile', to: '/donor/profile', icon: <User size={i} />, bottom: true }
  ],
  HOSPITAL: [
    { label: 'Dashboard', to: '/hospital/dashboard', icon: <LayoutDashboard size={i} />, bottom: true },
    { label: 'Requests', to: '/hospital/requests', icon: <ClipboardList size={i} />, bottom: true },
    { label: 'Donor responses', to: '/hospital/donor-responses', icon: <HeartHandshake size={i} />, bottom: true },
    { label: 'Notifications', to: '/hospital/notifications', icon: <Bell size={i} />, bottom: true },
    { label: 'Profile', to: '/hospital/profile', icon: <Hospital size={i} />, bottom: true }
  ],
  BLOODBANK: [
    { label: 'Dashboard', to: '/bloodbank/dashboard', icon: <LayoutDashboard size={i} />, bottom: true },
    { label: 'Inventory', to: '/bloodbank/inventory', icon: <Boxes size={i} />, bottom: true },
    { label: 'Requests', to: '/bloodbank/requests', icon: <ClipboardList size={i} />, bottom: true },
    { label: 'Fulfillment', to: '/bloodbank/fulfillment', icon: <PackageCheck size={i} />, bottom: true },
    { label: 'History', to: '/bloodbank/history', icon: <History size={i} /> },
    { label: 'Notifications', to: '/bloodbank/notifications', icon: <Bell size={i} /> },
    { label: 'Profile', to: '/bloodbank/profile', icon: <Building2 size={i} />, bottom: true }
  ],
  ADMIN: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard size={i} />, bottom: true },
    { label: 'Users', to: '/admin/users', icon: <Users size={i} />, bottom: true },
    { label: 'Hospitals', to: '/admin/hospitals', icon: <Hospital size={i} />, bottom: true },
    { label: 'Blood banks', to: '/admin/bloodbanks', icon: <Building2 size={i} />, bottom: true },
    { label: 'Requests', to: '/admin/requests', icon: <ListChecks size={i} />, bottom: true },
    { label: 'Analytics', to: '/admin/analytics', icon: <BarChart3 size={i} /> },
    { label: 'Audit logs', to: '/admin/audit-logs', icon: <ScrollText size={i} /> },
    { label: 'Settings', to: '/admin/settings', icon: <Settings size={i} /> }
  ]
};
export const ROLE_LABEL: Record<Role, string> = { REQUESTER: 'Requester', DONOR: 'Donor', HOSPITAL: 'Hospital', BLOODBANK: 'Blood bank', ADMIN: 'Admin' };
export { ShieldCheck };
