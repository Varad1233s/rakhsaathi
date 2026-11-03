import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { CheckCircle2, Clock, HeartHandshake, Plus, Siren } from 'lucide-react';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { useLiveRefresh, useRealtime } from '@/context/RealtimeContext';
import type { RequestView } from '@/types';
import { fmtDateTime, isActive, timeAgo } from '@/utils/format';
import { BloodChip, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Responsive, StatCard, StatusChip } from '@/components/common';
import { REQUEST_EVENTS } from '../shared/RequestsList';
import NearbyBanks from '../shared/NearbyBanks';

const PROGRESS: Record<string, number> = { PENDING_VERIFICATION: 15, VERIFIED: 40, DONOR_ACCEPTED: 60, MEDICAL_COORDINATION: 80, FULFILLED: 100 };

export default function RequesterDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { notifications } = useRealtime();
  const { data, loading, error, reload, silent } = useApi(() => api.get<{ requests: RequestView[] }>('/requests'), []);
  useLiveRefresh(REQUEST_EVENTS, () => void silent());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const all = data?.requests ?? [];
  const active = all.filter((r) => isActive(r.status));

  return (
    <>
      <PageHeader title={`${greeting}, ${user!.name.split(' ')[0]}`} subtitle="Track your requests and donor responses in real time."
        actions={<Button variant="contained" startIcon={<Plus size={18} />} onClick={() => nav('/requester/request-blood')}>Request blood</Button>} />
      {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock rows={3} /> : (
        <Stack gap={3}>
          <Responsive cols={{ xs: 2, md: 4 }}>
            <StatCard label="Active requests" value={active.length} icon={<Siren size={22} />} />
            <StatCard label="Awaiting verification" value={active.filter((r) => r.status === 'PENDING_VERIFICATION').length} icon={<Clock size={22} />} tone="warning" />
            <StatCard label="Donors said yes" value={active.reduce((s, r) => s + r.acceptedCount, 0)} icon={<HeartHandshake size={22} />} tone="info" />
            <StatCard label="Fulfilled" value={all.filter((r) => r.status === 'FULFILLED').length} icon={<CheckCircle2 size={22} />} tone="success" />
          </Responsive>

          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Active requests</Typography>
            {active.length === 0 ? <Card><EmptyState title="No active requests" text="When you request blood, you can follow every step here." action={<Button variant="contained" onClick={() => nav('/requester/request-blood')}>Request blood</Button>} /></Card> : (
              <Responsive cols={{ xs: 1, md: 2 }}>
                {active.map((r) => (
                  <Card key={r.id} sx={{ p: 2.5, cursor: 'pointer' }} onClick={() => nav(`/requester/requests/${r.id}`)}>
                    <Stack direction="row" justifyContent="space-between" gap={1} sx={{ mb: 1.5 }}><Typography fontWeight={700}>{r.code}</Typography><StatusChip status={r.status} /></Stack>
                    <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 0.5 }}><BloodChip group={r.bloodGroup} /><Typography>{r.units} unit(s) for {r.patient?.name}</Typography></Stack>
                    <Typography variant="body2" color="text.secondary">{r.hospital.name} · needed by {fmtDateTime(r.requiredBy)}</Typography>
                    <LinearProgress variant="determinate" value={PROGRESS[r.status] ?? 10} sx={{ my: 1.5, height: 8, borderRadius: 4 }} />
                    <Stack direction="row" gap={1} flexWrap="wrap"><Chip size="small" variant="outlined" label={`${r.acceptedCount} donor(s) yes`} />{r.unitsFromBank > 0 && <Chip size="small" variant="outlined" color="success" label={`${r.unitsFromBank}/${r.units} from blood banks`} />}</Stack>
                  </Card>
                ))}
              </Responsive>
            )}
          </Box>

          <Responsive cols={{ xs: 1, lg: 2 }} gap={3}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Recent notifications</Typography>
              {notifications.length === 0 ? <Typography color="text.secondary">Nothing yet.</Typography> : (
                <Stack gap={1.5}>{notifications.slice(0, 5).map((n) => <Box key={n.id}><Typography fontWeight={n.readAt ? 500 : 700} variant="body2">{n.title}</Typography><Typography variant="body2" color="text.secondary">{n.body}</Typography><Typography variant="caption" color="text.disabled">{timeAgo(n.createdAt)}</Typography></Box>)}</Stack>
              )}
            </Card>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Blood bank availability</Typography>
              {active[0] ? <NearbyBanks bloodGroup={active[0].bloodGroup} /> : <Typography color="text.secondary">Create a request to see compatible stock at verified blood banks.</Typography>}
            </Card>
          </Responsive>
        </Stack>
      )}
    </>
  );
}
