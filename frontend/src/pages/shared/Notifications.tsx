import { Card } from '@mui/material';
import { PageHeader } from '@/components/common';
import { NotificationList } from '@/components/NotificationList';

export default function Notifications() {
  return (<><PageHeader title="Notifications" subtitle="Live updates about your requests and account" /><Card><NotificationList /></Card></>);
}
