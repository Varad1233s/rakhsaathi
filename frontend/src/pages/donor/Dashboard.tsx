import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { HeartHandshake, MapPin, Siren, Droplets } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { useLiveRefresh } from '@/context/RealtimeContext';
import type { RequestView } from '@/types';
import { bloodLabel } from '@/utils/format';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, Responsive, StatCard } from '@/components/common';
import { LocationCard } from '@/components/LocationCard';
import DonorRequestCard from './DonorRequestCard';

export default function DonorDashboard() {
  const nav = useNavigate();
  const { me, user, refresh } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { data, loading, error, reload, silent } = useApi(() => Promise.all([
    api.get<{ requests: RequestView[]; mode: 'GPS' | 'CITY' }>('/donor/requests'),
    api.get<{ responses: { decision: string }[] }>('/donor/responses')
  ]), []);
  useLiveRefresh(['request.verified', 'request.updated', 'request.fulfilled', 'request.expired', 'notification.created'], () => void silent());
  const donor = me?.donor;
  const [reqs, resp] = data ?? [null, null];
  const setAvail = async (available: boolean) => { try { await api.put('/donor/profile', { available }); await refresh(); enqueueSnackbar(available ? 'You are available for requests.' : 'You will not be notified.', { variant: 'info' }); } catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } };

  return (
    <>
      <PageHeader title={`Hello, ${user!.name.split(' ')[0]}`} subtitle={donor ? `Blood group ${bloodLabel(donor.bloodGroup)} · ${donor.city}` : undefined}
        actions={<FormControlLabel control={<Switch checked={donor?.available ?? true} onChange={(_, v) => void setAvail(v)} />} label="Available to donate" />} />
      <Stack gap={3}>
        <LocationCard sharing={!!donor?.shareLocation} onChanged={() => { void refresh(); void silent(); }} />
        {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading || !reqs ? <LoadingBlock /> : (<>
          <Responsive cols={{ xs: 1, sm: 3 }}>
            <StatCard label="Verified requests near you" value={reqs.requests.length} icon={<Siren size={22} />} hint={reqs.mode === 'GPS' ? 'Using your location' : 'Matched by city'} />
            <StatCard label="Times you said yes" value={resp!.responses.filter((x) => x.decision === 'ACCEPTED').length} icon={<HeartHandshake size={22} />} tone="success" />
            <StatCard label="Location sharing" value={donor?.shareLocation ? 'On' : 'Off'} icon={<MapPin size={22} />} tone="info" />
          </Responsive>
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}><Typography variant="h6">Nearby verified requests</Typography><Button onClick={() => nav('/donor/requests')}>View all</Button></Stack>
            {reqs.requests.length === 0 ? <Card><EmptyState title="No open requests near you" text="You will be notified the moment a hospital verifies a matching request." /></Card> : (
              <Responsive cols={{ xs: 1, md: 2 }}>{reqs.requests.slice(0, 4).map((r) => <DonorRequestCard key={r.id} r={r} />)}</Responsive>
            )}
          </Box>
        </>)}
        <Card sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}><Droplets size={22} /><Typography variant="body2" color="text.secondary">Saying yes is not medical approval. The hospital will screen you and confirm eligibility before any donation.</Typography></Card>
      </Stack>
    </>
  );
}
