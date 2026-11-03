import { useNavigate } from 'react-router-dom';
import { Chip } from '@mui/material';
import { api } from '@/services/api';
import { useApi } from '@/hooks/useApi';
import { bloodLabel, fmtDateTime, isActive } from '@/utils/format';
import type { BloodGroup, RequestStatus, Urgency } from '@/types';
import { BloodChip, ErrorBlock, LoadingBlock, PageHeader, StatusChip, UrgencyChip } from '@/components/common';
import { ResponsiveTable, type Column } from '@/components/ResponsiveTable';

interface Row { id: string; decision: 'ACCEPTED' | 'DECLINED'; at: string; request: { id: string; code: string; status: RequestStatus; bloodGroup: BloodGroup; units: number; urgency: Urgency; hospital: { name: string; city: string } } }

export default function DonorResponses({ history = false }: { history?: boolean }) {
  const nav = useNavigate();
  const { data, loading, error, reload } = useApi(() => api.get<{ responses: Row[] }>('/donor/responses'), []);
  const rows = (data?.responses ?? []).filter((x) => (history ? !isActive(x.request.status) && x.decision === 'ACCEPTED' : true));
  const cols: Column<Row>[] = [
    { key: 'c', label: 'Request', primary: true, render: (r) => r.request.code },
    { key: 'b', label: 'Blood', render: (r) => <span><BloodChip group={r.request.bloodGroup} /> × {r.request.units}</span> },
    { key: 'h', label: 'Hospital', render: (r) => `${r.request.hospital.name}, ${r.request.hospital.city}` },
    { key: 'u', label: 'Urgency', render: (r) => <UrgencyChip urgency={r.request.urgency} /> },
    { key: 'd', label: 'Your response', render: (r) => <Chip size="small" color={r.decision === 'ACCEPTED' ? 'success' : 'default'} label={r.decision === 'ACCEPTED' ? 'Yes' : 'Not now'} /> },
    { key: 's', label: 'Status', render: (r) => <StatusChip status={r.request.status} /> },
    { key: 't', label: 'When', render: (r) => fmtDateTime(r.at) }
  ];
  void bloodLabel;
  return (
    <>
      <PageHeader title={history ? 'Donation history' : 'My responses'} subtitle={history ? 'Requests you helped with that are now closed' : 'Every request you replied to'} />
      {error ? <ErrorBlock message={error} onRetry={() => void reload()} /> : loading ? <LoadingBlock /> : <ResponsiveTable columns={cols} rows={rows} onRowClick={(r) => nav(`/donor/requests/${r.request.id}`)} emptyTitle="Nothing yet" />}
    </>
  );
}
