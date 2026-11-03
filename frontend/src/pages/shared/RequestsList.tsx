import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Chip, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { Search } from 'lucide-react';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { useLiveRefresh } from '@/context/RealtimeContext';
import { useAuth } from '@/context/AuthContext';
import type { RequestStatus, RequestView } from '@/types';
import { ACTIVE, bloodLabel, fmtDateTime, isActive } from '@/utils/format';
import { BloodChip, ErrorBlock, LoadingBlock, PageHeader, StatusChip, UrgencyChip } from '@/components/common';
import { ResponsiveTable, type Column } from '@/components/ResponsiveTable';

export const REQUEST_EVENTS = ['request.created', 'request.verified', 'request.rejected', 'request.updated', 'request.fulfilled', 'request.expired', 'donor.responded', 'bloodbank.updated'];
type Scope = 'all' | 'active' | 'history';

export default function RequestsList({ title, subtitle, basePath, scope = 'all', actions, statusTabs }: { title: string; subtitle?: string; basePath: string; scope?: Scope; actions?: ReactNode; statusTabs?: boolean }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, reload, silent } = useApi(() => api.get<{ requests: RequestView[] }>('/requests'), []);
  useLiveRefresh(REQUEST_EVENTS, () => void silent());
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'ALL' | RequestStatus>('ALL');

  const rows = useMemo(() => {
    let list = data?.requests ?? [];
    if (scope === 'active') list = list.filter((r) => isActive(r.status));
    if (scope === 'history') list = list.filter((r) => !isActive(r.status));
    if (tab !== 'ALL') list = list.filter((r) => r.status === tab);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((r) => [r.code, r.patient?.name, r.hospital.name, bloodLabel(r.bloodGroup)].some((x) => x?.toLowerCase().includes(s)));
    return list;
  }, [data, scope, tab, q]);

  const showRequester = user?.role === 'HOSPITAL' || user?.role === 'ADMIN';
  const cols: Column<RequestView>[] = [
    { key: 'code', label: 'Request', primary: true, render: (r) => <Box><Typography fontWeight={700}>{r.code}</Typography>{r.flagged && <Chip size="small" color="warning" label="Possible duplicate" sx={{ mt: 0.5 }} />}</Box> },
    { key: 'patient', label: 'Patient', render: (r) => r.patient?.name ?? '—' },
    ...(showRequester ? [{ key: 'req', label: 'Requester', render: (r: RequestView) => r.requester?.name ?? '—' }] : []),
    { key: 'bg', label: 'Blood', render: (r) => <Stack direction="row" gap={0.75} alignItems="center"><BloodChip group={r.bloodGroup} /><span>× {r.units}</span></Stack> },
    { key: 'hospital', label: 'Hospital', hideOnMobile: true, render: (r) => r.hospital.name },
    { key: 'urgency', label: 'Urgency', render: (r) => <UrgencyChip urgency={r.urgency} /> },
    { key: 'by', label: 'Needed by', render: (r) => fmtDateTime(r.requiredBy) },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> }
  ];
  const tabs: ('ALL' | RequestStatus)[] = scope === 'history' ? ['ALL', 'FULFILLED', 'REJECTED', 'CANCELLED', 'EXPIRED'] : ['ALL', ...ACTIVE, 'FULFILLED'];
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
        <TextField placeholder="Search code, patient, hospital…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ maxWidth: { md: 360 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> } }} />
        {statusTabs !== false && (
          <Stack direction="row" gap={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
            {tabs.map((t) => <Chip key={t} label={t === 'ALL' ? 'All' : t.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())} onClick={() => setTab(t)} color={tab === t ? 'primary' : 'default'} variant={tab === t ? 'filled' : 'outlined'} />)}
          </Stack>
        )}
      </Stack>
      {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock rows={4} /> : (
        <ResponsiveTable columns={cols} rows={rows} onRowClick={(r) => nav(`${basePath}/${r.id}`)} emptyTitle="No requests found" emptyText="Requests appear here as soon as they are created." />
      )}
      <Card sx={{ display: 'none' }} />
    </>
  );
}
