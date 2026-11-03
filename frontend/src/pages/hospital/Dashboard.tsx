import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, Stack, Typography } from '@mui/material';
import { CheckCircle2, ClipboardCheck, HeartHandshake, Stethoscope, Timer, Activity } from 'lucide-react';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useLiveRefresh } from '@/context/RealtimeContext';
import type { RequestView } from '@/types';
import { fmtDateTime } from '@/utils/format';
import { BloodChip, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Responsive, StatCard, UrgencyChip } from '@/components/common';
import { REQUEST_EVENTS } from '../shared/RequestsList';

export default function HospitalDashboard() {
  const nav = useNavigate();
  const { data, loading, error, reload, silent } = useApi(() => api.get<{ requests: RequestView[] }>('/requests'), []);
  const report = useApi(() => api.get<{ report: string }>('/ai/report').catch(() => ({ report: '' })), []);
  useLiveRefresh(REQUEST_EVENTS, () => void silent());
  const all = data?.requests ?? [];
  const n = (s: string) => all.filter((r) => r.status === s).length;
  const pending = all.filter((r) => r.status === 'PENDING_VERIFICATION');
  return (
    <>
      <PageHeader title="Hospital dashboard" subtitle="Verify requests, track donor responses and coordinate screening." />
      {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : (
        <Stack gap={3}>
          <Responsive cols={{ xs: 2, md: 3, xl: 6 }}>
            <StatCard label="Pending verification" value={n('PENDING_VERIFICATION')} icon={<Timer size={22} />} tone="warning" />
            <StatCard label="Verified" value={n('VERIFIED')} icon={<ClipboardCheck size={22} />} tone="info" />
            <StatCard label="Donor accepted" value={n('DONOR_ACCEPTED')} icon={<HeartHandshake size={22} />} />
            <StatCard label="Medical coordination" value={n('MEDICAL_COORDINATION')} icon={<Stethoscope size={22} />} tone="info" />
            <StatCard label="Active cases" value={n('VERIFIED') + n('DONOR_ACCEPTED') + n('MEDICAL_COORDINATION')} icon={<Activity size={22} />} />
            <StatCard label="Fulfilled" value={n('FULFILLED')} icon={<CheckCircle2 size={22} />} tone="success" />
          </Responsive>
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}><Typography variant="h6">Waiting for your verification</Typography><Button onClick={() => nav('/hospital/requests')}>All requests</Button></Stack>
            {pending.length === 0 ? <Card><EmptyState title="Nothing waiting" text="New requests appear here instantly." /></Card> : (
              <Responsive cols={{ xs: 1, md: 2 }}>
                {pending.map((r) => (
                  <Card key={r.id} sx={{ p: 2.5, cursor: 'pointer' }} onClick={() => nav(`/hospital/requests/${r.id}`)}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}><Typography fontWeight={700}>{r.code}</Typography><UrgencyChip urgency={r.urgency} /></Stack>
                    <Stack direction="row" gap={1} alignItems="center"><BloodChip group={r.bloodGroup} /><span>{r.units} unit(s)</span></Stack>
                    <Typography variant="body2" sx={{ mt: 1 }}>Patient: <b>{r.patient?.name}</b> · Requester: <b>{r.requester?.name}</b></Typography>
                    <Typography variant="body2" color="text.secondary">Needed by {fmtDateTime(r.requiredBy)}</Typography>
                    {r.flagged && <Alert severity="warning" sx={{ mt: 1 }}>{r.flagReason}</Alert>}
                  </Card>
                ))}
              </Responsive>
            )}
          </Box>
          {report.data?.report && <Card sx={{ p: 3 }}><Typography variant="h6" sx={{ mb: 1 }}>Weekly operational report</Typography><Typography sx={{ whiteSpace: 'pre-line' }} color="text.secondary">{report.data.report}</Typography></Card>}
        </Stack>
      )}
    </>
  );
}
