import { useNavigate } from 'react-router-dom';
import { Button, Card, Stack, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { Building2, Flag, Hospital, Users } from 'lucide-react';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useLiveRefresh } from '@/context/RealtimeContext';
import { ErrorBlock, LoadingBlock, PageHeader, Responsive, StatCard } from '@/components/common';

interface Stats { users: Record<string, number>; hospitalsPending: number; banksPending: number; flaggedRequests: number; staffPending: number; requestsByStatus: Record<string, number>; unitsSuppliedByBanks: number }

export default function AdminDashboard() {
  const nav = useNavigate();
  const { data, loading, error, reload, silent } = useApi(() => api.get<Stats>('/admin/stats'), []);
  useLiveRefresh(['notification.created', 'request.created', 'request.verified', 'request.fulfilled'], () => void silent());
  if (error) return <ErrorBlock message={error} onRetry={() => void reload()} />;
  if (loading || !data) return <LoadingBlock />;
  const statuses = Object.entries(data.requestsByStatus);
  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Verification queues and platform health" />
      <Stack gap={3}>
        <Responsive cols={{ xs: 2, md: 4 }}>
          <StatCard label="Hospitals to verify" value={data.hospitalsPending} icon={<Hospital size={22} />} tone="warning" />
          <StatCard label="Blood banks to verify" value={data.banksPending} icon={<Building2 size={22} />} tone="warning" />
          <StatCard label="Staff awaiting approval" value={data.staffPending} icon={<Users size={22} />} tone="info" />
          <StatCard label="Flagged requests" value={data.flaggedRequests} icon={<Flag size={22} />} />
        </Responsive>
        <Stack direction="row" gap={1.5} flexWrap="wrap">
          <Button variant="contained" onClick={() => nav('/admin/hospitals')}>Review hospitals</Button>
          <Button variant="outlined" onClick={() => nav('/admin/bloodbanks')}>Review blood banks</Button>
          <Button variant="outlined" onClick={() => nav('/admin/requests')}>Monitor requests</Button>
        </Stack>
        <Responsive cols={{ xs: 1, lg: 2 }} gap={3}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Requests by status</Typography>
            {statuses.length === 0 ? <Typography color="text.secondary">No requests yet.</Typography> : <BarChart height={280} xAxis={[{ scaleType: 'band', data: statuses.map(([s]) => s.replace(/_/g, ' ').toLowerCase()) }]} series={[{ data: statuses.map(([, n]) => n), color: '#E63950' }]} />}
          </Card>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Accounts</Typography>
            <Stack gap={1.25}>{Object.entries(data.users).map(([r, n]) => <Stack key={r} direction="row" justifyContent="space-between"><span>{r.charAt(0) + r.slice(1).toLowerCase()}</span><b>{n}</b></Stack>)}</Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Units supplied by blood banks: <b>{data.unitsSuppliedByBanks}</b></Typography>
          </Card>
        </Responsive>
      </Stack>
    </>
  );
}
